#!/usr/bin/env node
/**
 * qa-explorer Phase 1: Element Inventory
 * Scans all interactive elements on a page and maps navigation structure.
 *
 * Usage:
 *   node inventory.js --url <URL> [options]
 *
 * Options:
 *   --url <URL>           Target URL to scan (required)
 *   --auth-cookie <str>   Cookie string for authenticated sessions
 *   --auth-token <str>    Bearer token for API auth
 *   --output <path>       Output JSON path (default: inventory-output.json)
 *   --timeout <ms>        Page load timeout in ms (default: 30000)
 *   --headless            Run in headless mode (default: false)
 *   --screenshot          Save screenshots during scan
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const config = {
  url: getArg('--url'),
  authCookie: getArg('--auth-cookie'),
  authToken: getArg('--auth-token'),
  output: getArg('--output') || 'inventory-output.json',
  timeout: parseInt(getArg('--timeout') || '30000'),
  headless: hasFlag('--headless'),
  screenshot: hasFlag('--screenshot'),
};

if (!config.url) {
  console.error('❌ Error: --url is required');
  console.error('Usage: node inventory.js --url https://example.com');
  process.exit(1);
}

/**
 * Wait for page to be truly loaded (handles SPAs)
 */
async function waitForPageReady(page, timeout = 10000) {
  try {
    // Wait for network to be idle
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    // Timeout on networkidle is OK, continue
  }

  // Wait for loading spinners/skeletons to disappear
  const loadingSelectors = [
    '[data-testid*="loading"]',
    '[class*="spinner"]',
    '[class*="skeleton"]',
    '[class*="loading"]',
    '.loading',
    '#loading',
  ];

  for (const sel of loadingSelectors) {
    try {
      await page.waitForSelector(sel, { state: 'hidden', timeout: 3000 });
    } catch (e) {
      // Not found or already hidden, continue
    }
  }

  // Small buffer for React/Vue/Angular hydration
  await page.waitForTimeout(500);
}

/**
 * Extract all interactive elements from current page
 */
async function extractElements(page, pageUrl) {
  return await page.evaluate((url) => {
    const results = {
      url,
      title: document.title,
      forms: [],
      buttons: [],
      links: [],
      inputs: [],
      navigation: [],
      modals: [],
    };

    // --- Forms ---
    document.querySelectorAll('form').forEach((form, i) => {
      const fields = [];
      form.querySelectorAll('input, select, textarea').forEach(el => {
        fields.push({
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          name: el.name || null,
          id: el.id || null,
          placeholder: el.placeholder || null,
          required: el.required,
          'aria-label': el.getAttribute('aria-label'),
          testid: el.getAttribute('data-testid'),
        });
      });

      const submitBtn = form.querySelector('[type="submit"], button:not([type="button"])');
      results.forms.push({
        index: i,
        id: form.id || null,
        action: form.action || null,
        method: form.method || 'GET',
        fields,
        submitText: submitBtn ? submitBtn.textContent.trim() : null,
        selector: form.id ? `#${form.id}` : `form:nth-of-type(${i + 1})`,
      });
    });

    // --- Buttons (not in forms) ---
    document.querySelectorAll('button, [role="button"], [type="submit"]').forEach(btn => {
      const text = btn.textContent.trim();
      if (!text && !btn.getAttribute('aria-label')) return; // skip empty
      results.buttons.push({
        text,
        type: btn.type || null,
        id: btn.id || null,
        testid: btn.getAttribute('data-testid'),
        'aria-label': btn.getAttribute('aria-label'),
        disabled: btn.disabled,
        selector: btn.id ? `#${btn.id}` : (btn.getAttribute('data-testid') ? `[data-testid="${btn.getAttribute('data-testid')}"]` : null),
      });
    });

    // --- Navigation links ---
    document.querySelectorAll('nav a, [role="navigation"] a, header a').forEach(link => {
      const text = link.textContent.trim();
      if (!text) return;
      results.navigation.push({
        text,
        href: link.href,
        'aria-label': link.getAttribute('aria-label'),
        active: link.classList.contains('active') || link.getAttribute('aria-current') === 'page',
      });
    });

    // --- All links ---
    document.querySelectorAll('a[href]').forEach(link => {
      const text = link.textContent.trim();
      const href = link.href;
      if (!href || href.startsWith('javascript:') || href === '#') return;
      results.links.push({
        text,
        href,
        internal: href.startsWith(window.location.origin),
      });
    });

    // --- Inputs outside forms ---
    document.querySelectorAll('input:not(form input), select:not(form select), textarea:not(form textarea)').forEach(el => {
      results.inputs.push({
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        name: el.name || null,
        id: el.id || null,
        placeholder: el.placeholder || null,
        testid: el.getAttribute('data-testid'),
      });
    });

    return results;
  }, pageUrl);
}

/**
 * Collect all internal pages via link crawl (shallow, 1 level)
 */
async function collectPages(page, baseUrl, visited = new Set()) {
  const pages = [];
  const elements = await extractElements(page, baseUrl);
  visited.add(baseUrl);
  pages.push(elements);

  // Collect unique internal links
  const internalLinks = elements.links
    .filter(l => l.internal && !visited.has(l.href))
    .map(l => l.href)
    .filter((href, idx, arr) => arr.indexOf(href) === idx)
    .slice(0, 10); // limit to 10 pages for performance

  for (const link of internalLinks) {
    if (visited.has(link)) continue;
    visited.add(link);

    try {
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await waitForPageReady(page, 5000);
      const pageElements = await extractElements(page, link);
      pages.push(pageElements);
    } catch (e) {
      console.warn(`  ⚠️  Could not scan: ${link} (${e.message})`);
    }
  }

  return pages;
}

async function main() {
  console.log('\n🔍 QA Explorer — Phase 1: Element Inventory');
  console.log('='.repeat(50));
  console.log(`📌 Target URL: ${config.url}`);
  console.log(`⚙️  Options: headless=${config.headless}, timeout=${config.timeout}ms`);

  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (QA Explorer Bot/1.0) Chrome/120.0.0.0',
  });

  // Apply auth if provided
  if (config.authCookie) {
    const cookies = config.authCookie.split(';').map(c => {
      const [name, ...rest] = c.trim().split('=');
      return {
        name: name.trim(),
        value: rest.join('=').trim(),
        url: config.url,
      };
    });
    await context.addCookies(cookies);
    console.log(`🔐 Auth cookie applied (${cookies.length} cookie(s))`);
  }

  if (config.authToken) {
    await context.setExtraHTTPHeaders({
      'Authorization': `Bearer ${config.authToken}`,
    });
    console.log('🔐 Auth token applied');
  }

  const page = await context.newPage();

  try {
    console.log('\n📡 Loading page...');
    await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: config.timeout });
    await waitForPageReady(page, 10000);

    if (config.screenshot) {
      const screenshotPath = `inventory-screenshot-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }

    console.log('\n🗺️  Mapping pages and elements...');
    const pages = await collectPages(page, config.url);

    const inventory = {
      scan_timestamp: new Date().toISOString(),
      base_url: config.url,
      pages_scanned: pages.length,
      summary: {
        total_forms: pages.reduce((s, p) => s + p.forms.length, 0),
        total_buttons: pages.reduce((s, p) => s + p.buttons.length, 0),
        total_links: pages.reduce((s, p) => s + p.links.length, 0),
        total_navigation: pages.reduce((s, p) => s + p.navigation.length, 0),
      },
      pages,
    };

    // Print summary
    console.log('\n📊 Inventory Summary:');
    console.log(`   Pages scanned  : ${inventory.pages_scanned}`);
    console.log(`   Forms found    : ${inventory.summary.total_forms}`);
    console.log(`   Buttons found  : ${inventory.summary.total_buttons}`);
    console.log(`   Links found    : ${inventory.summary.total_links}`);

    pages.forEach(p => {
      console.log(`\n   📄 ${p.title || p.url}`);
      console.log(`      URL     : ${p.url}`);
      console.log(`      Forms   : ${p.forms.length}`);
      console.log(`      Buttons : ${p.buttons.length}`);
      if (p.navigation.length > 0) {
        console.log(`      Nav items: ${p.navigation.map(n => n.text).join(', ')}`);
      }
    });

    // Save output
    fs.writeFileSync(config.output, JSON.stringify(inventory, null, 2));
    console.log(`\n✅ Inventory saved to: ${config.output}`);

  } catch (error) {
    console.error(`\n❌ Error during inventory: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
