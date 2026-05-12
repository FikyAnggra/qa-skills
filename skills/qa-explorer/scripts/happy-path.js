#!/usr/bin/env node
/**
 * qa-explorer Phase 2 & 3: Happy Path + Negative Tests
 * Runs interactive flows based on inventory and tests error states.
 *
 * Usage:
 *   node happy-path.js --url <URL> --inventory <path> [options]
 *
 * Options:
 *   --url <URL>             Target URL (required)
 *   --inventory <path>      Path to inventory-output.json (required)
 *   --auth-cookie <str>     Cookie string for authenticated sessions
 *   --auth-token <str>      Bearer token
 *   --output <path>         Output JSON path (default: results.json)
 *   --timeout <ms>          Action timeout in ms (default: 10000)
 *   --headless              Run headless (default: false)
 *   --screenshot            Screenshot after each major step
 *   --feature-name <name>   Feature name for output labeling
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const config = {
  url: getArg('--url'),
  inventoryPath: getArg('--inventory') || 'inventory-output.json',
  authCookie: getArg('--auth-cookie'),
  authToken: getArg('--auth-token'),
  output: getArg('--output') || 'results.json',
  timeout: parseInt(getArg('--timeout') || '10000'),
  headless: hasFlag('--headless'),
  screenshot: hasFlag('--screenshot'),
  featureName: getArg('--feature-name') || 'unnamed-feature',
};

if (!config.url) {
  console.error('❌ Error: --url is required');
  process.exit(1);
}

const results = {
  feature: config.featureName,
  url: config.url,
  run_timestamp: new Date().toISOString(),
  happy_paths: [],
  negative_tests: [],
  edge_cases: [],
  screenshots: [],
  errors: [],
};

/**
 * Wait for page to be fully loaded (SPA-aware)
 */
async function waitForReady(page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) { /* OK */ }

  const spinners = ['[class*="spinner"]', '[class*="loading"]', '.skeleton', '[aria-busy="true"]'];
  for (const sel of spinners) {
    try {
      await page.waitForSelector(sel, { state: 'hidden', timeout: 2000 });
    } catch (e) { /* OK */ }
  }
  await page.waitForTimeout(300);
}

/**
 * Safe screenshot helper
 */
async function screenshot(page, label) {
  if (!config.screenshot) return null;
  const filename = `screenshot-${label.replace(/\s+/g, '-')}-${Date.now()}.png`;
  try {
    await page.screenshot({ path: filename, fullPage: false });
    results.screenshots.push({ label, filename });
    return filename;
  } catch (e) {
    return null;
  }
}

/**
 * Safe fill — tries multiple selector strategies
 */
async function safeFill(page, field, value) {
  const selectors = [
    field.testid ? `[data-testid="${field.testid}"]` : null,
    field.id ? `#${field.id}` : null,
    field.name ? `[name="${field.name}"]` : null,
    field.placeholder ? `[placeholder="${field.placeholder}"]` : null,
    `${field.tag}[type="${field.type}"]`,
  ].filter(Boolean);

  for (const sel of selectors) {
    try {
      await page.fill(sel, value, { timeout: 3000 });
      return true;
    } catch (e) { /* try next */ }
  }
  return false;
}

/**
 * Safe click — tries multiple selector strategies
 */
async function safeClick(page, element) {
  const selectors = [
    element.testid ? `[data-testid="${element.testid}"]` : null,
    element.id ? `#${element.id}` : null,
    element.text ? `button:has-text("${element.text}")` : null,
    element.text ? `[role="button"]:has-text("${element.text}")` : null,
    element.selector,
  ].filter(Boolean);

  for (const sel of selectors) {
    try {
      await page.click(sel, { timeout: 3000 });
      return true;
    } catch (e) { /* try next */ }
  }
  return false;
}

/**
 * Test a form's happy path (fill with valid data & submit)
 */
async function testFormHappyPath(page, form, pageUrl) {
  const scenario = {
    id: `HP-${String(results.happy_paths.length + 1).padStart(3, '0')}`,
    type: 'happy-path',
    form_id: form.id || form.selector,
    page: pageUrl,
    steps: [],
    result: null,
    url_after: null,
    error: null,
  };

  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: config.timeout });
    await waitForReady(page, 5000);

    const urlBefore = page.url();

    // Fill each field with valid test data
    for (const field of form.fields) {
      if (field.type === 'submit' || field.type === 'button' || field.type === 'hidden') continue;

      const testValue = generateValidValue(field);
      if (!testValue) continue;

      const filled = await safeFill(page, field, testValue);
      scenario.steps.push({
        action: 'fill',
        field: field.name || field.id || field.placeholder,
        value: testValue,
        success: filled,
      });
    }

    // Submit
    if (form.submitText) {
      const clicked = await safeClick(page, { text: form.submitText });
      scenario.steps.push({ action: 'click', target: form.submitText, success: clicked });
    }

    await waitForReady(page, 5000);
    await screenshot(page, `happy-path-${scenario.id}`);

    scenario.url_after = page.url();
    scenario.result = scenario.url_after !== urlBefore ? 'redirected' : 'same-page';

    // Check for success indicators
    const successIndicators = await page.evaluate(() => {
      const toastSel = '[class*="toast"], [class*="success"], [role="alert"]';
      const toast = document.querySelector(toastSel);
      return toast ? toast.textContent.trim() : null;
    });
    if (successIndicators) {
      scenario.success_message = successIndicators;
    }

    results.happy_paths.push(scenario);
    console.log(`  ✓ Happy path [${scenario.id}]: form submit → ${scenario.result}`);

  } catch (err) {
    scenario.error = err.message;
    scenario.result = 'error';
    results.happy_paths.push(scenario);
    results.errors.push({ context: `happy-path-form`, error: err.message });
    console.log(`  ✗ Happy path [${scenario.id}]: ${err.message}`);
  }
}

/**
 * Test form negative cases (empty submit, invalid inputs)
 */
async function testFormNegative(page, form, pageUrl) {
  // Test 1: Submit empty form
  const emptyScenario = {
    id: `NEG-${String(results.negative_tests.length + 1).padStart(3, '0')}`,
    type: 'negative-empty-submit',
    form_id: form.id || form.selector,
    page: pageUrl,
    steps: [],
    validation_messages: [],
    result: null,
    error: null,
  };

  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: config.timeout });
    await waitForReady(page, 5000);

    // Submit without filling anything
    if (form.submitText) {
      await safeClick(page, { text: form.submitText });
      emptyScenario.steps.push({ action: 'click', target: form.submitText });
    }

    await page.waitForTimeout(1000);

    // Collect validation messages
    const validations = await page.evaluate(() => {
      const msgs = [];
      // HTML5 validation
      document.querySelectorAll(':invalid').forEach(el => {
        msgs.push({
          field: el.name || el.id,
          message: el.validationMessage,
          type: 'html5-validation',
        });
      });
      // Custom error messages
      document.querySelectorAll('[class*="error"], [class*="invalid"], [role="alert"]').forEach(el => {
        const text = el.textContent.trim();
        if (text) msgs.push({ message: text, type: 'custom-error' });
      });
      return msgs;
    });

    emptyScenario.validation_messages = validations;
    emptyScenario.result = validations.length > 0 ? 'validation-shown' : 'no-validation';
    await screenshot(page, `neg-empty-${emptyScenario.id}`);

    results.negative_tests.push(emptyScenario);
    console.log(`  ✓ Negative [${emptyScenario.id}]: empty submit → ${validations.length} validation(s)`);

  } catch (err) {
    emptyScenario.error = err.message;
    emptyScenario.result = 'error';
    results.negative_tests.push(emptyScenario);
    console.log(`  ✗ Negative [${emptyScenario.id}]: ${err.message}`);
  }

  // Test 2: Invalid format inputs (email fields, number fields, etc.)
  const emailFields = form.fields.filter(f => f.type === 'email' || (f.name || '').includes('email'));
  for (const field of emailFields) {
    const invalidScenario = {
      id: `NEG-${String(results.negative_tests.length + 1).padStart(3, '0')}`,
      type: 'negative-invalid-format',
      form_id: form.id || form.selector,
      field: field.name || field.id,
      test_value: 'not-an-email',
      page: pageUrl,
      result: null,
      error_shown: null,
    };

    try {
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: config.timeout });
      await waitForReady(page);

      await safeFill(page, field, 'not-an-email');
      if (form.submitText) {
        await safeClick(page, { text: form.submitText });
      }
      await page.waitForTimeout(800);

      const errorMsg = await page.evaluate(() => {
        const el = document.querySelector('[class*="error"], :invalid, [role="alert"]');
        return el ? el.textContent.trim() : null;
      });

      invalidScenario.error_shown = errorMsg;
      invalidScenario.result = errorMsg ? 'validation-shown' : 'no-validation';
      results.negative_tests.push(invalidScenario);
      console.log(`  ✓ Negative [${invalidScenario.id}]: invalid email → "${errorMsg || 'no error'}"`);

    } catch (err) {
      invalidScenario.error = err.message;
      results.negative_tests.push(invalidScenario);
    }
  }
}

/**
 * Test navigation flows (click each nav item, record result)
 */
async function testNavigation(page, navItems, baseUrl) {
  for (const navItem of navItems.slice(0, 8)) { // limit to 8 nav items
    if (!navItem.href || !navItem.href.startsWith(new URL(baseUrl).origin)) continue;

    const scenario = {
      id: `NAV-${String(results.happy_paths.length + 1).padStart(3, '0')}`,
      type: 'navigation',
      label: navItem.text,
      href: navItem.href,
      loaded: false,
      status: null,
      title: null,
    };

    try {
      const response = await page.goto(navItem.href, { waitUntil: 'domcontentloaded', timeout: config.timeout });
      await waitForReady(page, 3000);

      scenario.loaded = true;
      scenario.status = response ? response.status() : 200;
      scenario.title = await page.title();

      results.happy_paths.push(scenario);
      console.log(`  ✓ Nav [${scenario.id}]: "${navItem.text}" → ${scenario.status} ${scenario.title}`);

    } catch (err) {
      scenario.error = err.message;
      results.happy_paths.push(scenario);
      console.log(`  ✗ Nav [${scenario.id}]: "${navItem.text}" → ${err.message}`);
    }
  }
}

/**
 * Generate realistic test values for form fields
 */
function generateValidValue(field) {
  const name = (field.name || field.id || field.placeholder || '').toLowerCase();
  const type = (field.type || 'text').toLowerCase();

  if (type === 'email' || name.includes('email')) return 'qa-test@example.com';
  if (type === 'password' || name.includes('password') || name.includes('pass')) return 'TestP@ssw0rd123!';
  if (type === 'tel' || name.includes('phone') || name.includes('tel')) return '+6281234567890';
  if (type === 'number' || name.includes('amount') || name.includes('price')) return '100';
  if (type === 'date') return new Date().toISOString().split('T')[0];
  if (type === 'url') return 'https://example.com';
  if (name.includes('name') && name.includes('first')) return 'Test';
  if (name.includes('name') && name.includes('last')) return 'User';
  if (name.includes('name') || name.includes('username')) return 'TestUser QA';
  if (name.includes('address')) return 'Jl. Test No. 123, Jakarta';
  if (name.includes('city')) return 'Jakarta';
  if (name.includes('zip') || name.includes('postal')) return '12345';
  if (name.includes('message') || name.includes('comment') || name.includes('desc')) {
    return 'Test message from QA Explorer automation';
  }
  if (type === 'checkbox') return null; // skip checkboxes for now
  if (type === 'radio') return null; // skip radios
  if (field.tag === 'select') return null; // handled separately

  return 'Test Input Value';
}

async function main() {
  console.log('\n🚀 QA Explorer — Phase 2 & 3: Happy Path + Negative Tests');
  console.log('='.repeat(55));
  console.log(`📌 URL: ${config.url}`);
  console.log(`📄 Inventory: ${config.inventoryPath}`);

  if (!fs.existsSync(config.inventoryPath)) {
    console.error(`❌ Inventory file not found: ${config.inventoryPath}`);
    console.error('Run Phase 1 first: node inventory.js --url <URL>');
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(config.inventoryPath, 'utf8'));

  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  if (config.authCookie) {
    const cookies = config.authCookie.split(';').map(c => {
      const [name, ...rest] = c.trim().split('=');
      return { name: name.trim(), value: rest.join('=').trim(), url: config.url };
    });
    await context.addCookies(cookies);
    console.log(`🔐 Auth cookie applied`);
  }

  if (config.authToken) {
    await context.setExtraHTTPHeaders({ Authorization: `Bearer ${config.authToken}` });
  }

  const page = await context.newPage();

  try {
    // Phase 2: Happy paths
    console.log('\n--- Phase 2: Happy Paths ---');
    for (const pageData of inventory.pages) {
      if (pageData.forms.length > 0) {
        console.log(`\n📄 ${pageData.title || pageData.url}`);
        for (const form of pageData.forms) {
          await testFormHappyPath(page, form, pageData.url);
        }
      }
    }

    // Navigation flows
    const allNavItems = inventory.pages.flatMap(p => p.navigation || []);
    const uniqueNavItems = allNavItems.filter((item, idx, arr) =>
      arr.findIndex(i => i.href === item.href) === idx
    );

    if (uniqueNavItems.length > 0) {
      console.log('\n📍 Testing navigation flows...');
      await page.goto(config.url, { waitUntil: 'domcontentloaded' });
      await testNavigation(page, uniqueNavItems, config.url);
    }

    // Phase 3: Negative tests
    console.log('\n--- Phase 3: Negative Tests ---');
    for (const pageData of inventory.pages) {
      if (pageData.forms.length > 0) {
        console.log(`\n📄 ${pageData.title || pageData.url}`);
        for (const form of pageData.forms) {
          await testFormNegative(page, form, pageData.url);
        }
      }
    }

    // Summary
    console.log('\n📊 Results Summary:');
    console.log(`   Happy paths tested : ${results.happy_paths.length}`);
    console.log(`   Negative tests     : ${results.negative_tests.length}`);
    console.log(`   Errors encountered : ${results.errors.length}`);

    fs.writeFileSync(config.output, JSON.stringify(results, null, 2));
    console.log(`\n✅ Results saved to: ${config.output}`);

  } catch (err) {
    console.error(`\n❌ Fatal error: ${err.message}`);
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
