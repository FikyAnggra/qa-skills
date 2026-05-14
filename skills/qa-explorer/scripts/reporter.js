#!/usr/bin/env node
/**
 * qa-explorer Phase 4: Report Generator
 * Generates test case documents from inventory + happy-path results.
 * Supports formats: gherkin (default), table (markdown), xlsx, steps
 *
 * Usage:
 *   node reporter.js [options]
 *
 * Options:
 *   --inventory <path>    Path to inventory-output.json (required)
 *   --results <path>      Path to results.json from happy-path.js (required)
 *   --name <name>         Feature name (required)
 *   --predev-spec <path>  Path to pre-dev qa-spec JSON for gap analysis
 *   --format <fmt>        gherkin|table|xlsx|steps (default: gherkin)
 *   --out-dir <dir>       Output directory (default: current dir)
 *   --created-by <name>   Creator name (default: QA Explorer)
 *   --app-name <name>     Application name override
 *   --app-desc <text>     Application description
 *   --env <env>           Staging|Production|Development
 *   --platform <p>        Web|Mobile Web|iOS|Android
 *   --user-facing <v>     Yes|No
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const config = {
  inventoryPath: getArg('--inventory') || 'inventory-output.json',
  resultsPath: getArg('--results') || 'results.json',
  name: getArg('--name') || 'unnamed-feature',
  predevSpec: getArg('--predev-spec'),
  format: getArg('--format') || 'gherkin',
  outDir: getArg('--out-dir') || '.',
  createdBy: getArg('--created-by') || 'QA Explorer',
  appName: getArg('--app-name') || '',
  appDesc: getArg('--app-desc') || '',
  env: getArg('--env') || 'Staging',
  platform: getArg('--platform') || 'Web',
  userFacing: getArg('--user-facing') || 'Yes',
};

const TODAY = new Date().toISOString().split('T')[0];
const NOW_ISO = new Date().toISOString();

// ─── Priority Analyzer ──────────────────────────────────────────────────────

function analyzePriority(scenario) {
  if (!scenario) return 'P2 - Medium';
  const tags = scenario.tags || [];
  const title = (scenario.title || '').toLowerCase();
  if (tags.includes('high')) return 'P1 - High';
  if (
    title.includes('login') || title.includes('auth') ||
    title.includes('checkout') || title.includes('payment') ||
    title.includes('register') || title.includes('daftar') ||
    (tags.includes('happy-path') && tags.includes('verified'))
  ) return 'P1 - High';
  if (tags.includes('low') || tags.includes('edge-case') || tags.includes('assumption')) return 'P3 - Low';
  return 'P2 - Medium';
}

// ─── Automation Status Analyzer ─────────────────────────────────────────────

function analyzeAutomationStatus(scenario) {
  if (!scenario) return 'manual only';
  const tags = scenario.tags || [];
  const title = (scenario.title || '').toLowerCase();
  const type = scenario.type || '';
  if (
    tags.includes('manual only') || tags.includes('ui-only') ||
    tags.includes('needs-manual') || tags.includes('flaky')
  ) return 'manual only';
  const isRepetitive =
    title.includes('login') || title.includes('register') ||
    title.includes('form') || title.includes('validasi') ||
    title.includes('navigation') || title.includes('navigasi');
  const isHappyPath = tags.includes('happy-path') || type === 'navigation';
  const isNegative =
    tags.includes('negative') ||
    type === 'negative-empty-submit' ||
    type === 'negative-invalid-format';
  if ((isHappyPath || isNegative) && isRepetitive) return 'to be automated';
  if (isHappyPath && tags.includes('verified')) return 'to be automated';
  if (isNegative && tags.includes('verified')) return 'to be automated';
  if (
    title.includes('email') || title.includes('sms') ||
    title.includes('payment') || title.includes('otp') ||
    title.includes('captcha') || title.includes('upload')
  ) return 'manual only';
  if (tags.includes('edge-case')) return 'manual only';
  return 'manual only';
}

// ─── Build Table Rows ────────────────────────────────────────────────────────

function buildTableRows(results, qaSpec) {
  const rows = [];
  let counter = 1;
  const pad = (n) => String(n).padStart(4, '0');

  // From happy paths
  for (const s of (results.happy_paths || [])) {
    const priority = analyzePriority({ tags: ['happy-path'], title: s.label || s.form_id || '' });
    const automation = analyzeAutomationStatus({
      tags: ['happy-path', 'verified'], title: s.label || '', type: s.type,
    });

    let summary, testStep, preConditions, expectedResult, testData, scenario;

    if (s.type === 'navigation') {
      scenario = 'Navigation';
      summary = 'Verifikasi navigasi ke halaman "' + (s.label || '') + '" berhasil dimuat';
      preConditions = '1. User sudah berada di halaman utama';
      testStep = '1. Klik menu "' + (s.label || '') + '"';
      expectedResult = '1. Halaman "' + (s.title || s.label || '') + '" berhasil dimuat\n2. Status HTTP: ' + (s.status || 200);
      testData = 'URL: ' + (s.href || '');
    } else {
      scenario = s.form_id || 'Form Submit';
      summary = 'Verifikasi submit form "' + (s.form_id || 'form') + '" dengan data valid berhasil';
      preConditions = '1. User sudah berada di halaman ' + (s.page || '');
      testStep = '1. Isi semua field wajib dengan data yang valid\n2. Klik tombol submit';
      if (s.result === 'redirected') {
        expectedResult = '1. User diredirect ke ' + (s.url_after || '') + '\n2. Proses berhasil';
      } else {
        expectedResult = '1. Halaman menampilkan konfirmasi atau pesan sukses';
      }
      testData = 'URL: ' + (s.page || '');
      if (s.success_message) {
        expectedResult += '\n3. Pesan: "' + s.success_message + '"';
      }
    }

    rows.push({
      tcId: 'TC' + pad(counter++),
      scenario, summary, priority, preConditions, testStep, testData,
      expectedResult, actualResult: '', testCaseStatus: 'untested',
      automationStatus: automation, notes: '',
    });
  }

  // From negative tests
  for (const s of (results.negative_tests || [])) {
    const automation = analyzeAutomationStatus({
      tags: ['negative', 'verified'], title: s.type, type: s.type,
    });

    let summary, testStep, preConditions, expectedResult, testData;
    const scenario = s.form_id || 'Form Validation';

    if (s.type === 'negative-empty-submit') {
      summary = 'Verifikasi validasi muncul saat form "' + (s.form_id || 'form') + '" di-submit kosong';
      preConditions = '1. User sudah berada di halaman ' + (s.page || '');
      testStep = '1. Buka halaman ' + (s.page || '') + '\n2. Klik tombol submit tanpa mengisi apapun';
      testData = 'Semua field dikosongkan';
      const msgs = (s.validation_messages || []).filter((m) => m.message).slice(0, 3);
      if (msgs.length > 0) {
        expectedResult = msgs.map((m, i) => (i + 1) + '. ' + m.message).join('\n');
      } else {
        expectedResult = '1. Pesan validasi muncul di field yang wajib diisi\n2. Form tidak ter-submit';
      }
    } else {
      summary = 'Verifikasi error validasi format pada field "' + (s.field || 'email') + '"';
      preConditions = '1. User sudah berada di halaman ' + (s.page || '');
      testStep = '1. Isi field "' + (s.field || 'email') + '" dengan nilai tidak valid\n2. Klik tombol submit';
      testData = (s.field || 'email') + ' = ' + (s.test_value || 'not-an-email');
      if (s.error_shown) {
        expectedResult = '1. Muncul pesan error: "' + s.error_shown + '"\n2. Form tidak ter-submit';
      } else {
        expectedResult = '1. Pesan error format tidak valid muncul\n2. Form tidak ter-submit';
      }
    }

    rows.push({
      tcId: 'TC' + pad(counter++),
      scenario, summary, priority: 'P1 - High', preConditions, testStep, testData,
      expectedResult, actualResult: '', testCaseStatus: 'untested',
      automationStatus: automation, notes: '',
    });
  }

  // Additional scenarios from qaSpec
  const existingTitles = new Set(rows.map((r) => r.summary.toLowerCase().substring(0, 30)));
  for (const sc of (qaSpec && qaSpec.scenarios ? qaSpec.scenarios : [])) {
    const titleKey = (sc.title || '').toLowerCase().substring(0, 30);
    if (existingTitles.has(titleKey)) continue;
    const words = (sc.title || '').split(' ').slice(0, 3).join(' ');
    rows.push({
      tcId: 'TC' + pad(counter++),
      scenario: words || 'Scenario',
      summary: sc.title || '',
      priority: analyzePriority(sc),
      preConditions: (sc.steps && sc.steps.given) ? sc.steps.given : '',
      testStep: (sc.steps && sc.steps.when) ? sc.steps.when : '',
      testData: '',
      expectedResult: (sc.steps && sc.steps.then) ? sc.steps.then : '',
      actualResult: '',
      testCaseStatus: 'untested',
      automationStatus: analyzeAutomationStatus(sc),
      notes: (sc.tags || []).includes('assumption') ? 'Asumsi - perlu dikonfirmasi' : '',
    });
    existingTitles.add(titleKey);
  }

  return rows;
}

// ─── Markdown Generator (5-section numbered list format) ────────────────────

function generateTableMarkdown(inventory, results, qaSpec, featureName) {
  const detectedAppName = config.appName || (inventory.pages && inventory.pages[0] ? inventory.pages[0].title : featureName);
  const detectedUrl = inventory.base_url || '';
  const sourceType = detectedUrl ? 'URL Exploration' : (qaSpec && qaSpec.document_source ? 'PRD' : 'Manual Input');
  const sourceDetail = detectedUrl || (qaSpec && qaSpec.document_source ? qaSpec.document_source : featureName);
  const mode = detectedUrl ? 'post-dev (@verified)' : 'pre-dev (@unverified)';

  const rows = buildTableRows(results, qaSpec);

  // Status counts
  const counts = { passed: 0, onprogress: 0, untested: 0, blocked: 0, failed: 0, retest: 0 };
  rows.forEach((r) => {
    const s = (r.testCaseStatus || 'untested').toLowerCase();
    if (counts[s] !== undefined) counts[s]++;
    else counts.untested++;
  });
  const total = rows.length;

  const lines = [];

  lines.push('# Test Case Document: ' + featureName);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Section 1: Test Case Information ────────────────────────────────────
  lines.push('## 1. Test Case Information');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push('| Feature Name | ' + featureName + ' |');
  lines.push('| User Facing | ' + config.userFacing + ' |');
  lines.push('| Created By | ' + config.createdBy + ' |');
  lines.push('| Created Date | ' + TODAY + ' |');
  lines.push('| Approve By | |');
  lines.push('| Updated By | |');
  lines.push('| Updated Date | |');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Section 2: Source ────────────────────────────────────────────────────
  lines.push('## 2. Source');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push('| Source Type | ' + sourceType + ' |');
  lines.push('| Source Detail | ' + sourceDetail + ' |');
  lines.push('| Mode | ' + mode + ' |');
  lines.push('| Exploration / Analysis Date | ' + TODAY + ' |');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Section 3: Application Overview ─────────────────────────────────────
  lines.push('## 3. Application Overview');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push('| Application Name | ' + detectedAppName + ' |');
  lines.push('| Application URL | ' + (detectedUrl || 'N/A') + ' |');
  lines.push('| Description | ' + (config.appDesc || '') + ' |');
  lines.push('| Platform | ' + (config.platform || 'Web') + ' |');
  lines.push('| Environment | ' + (config.env || 'Staging') + ' |');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Section 4: Test Case Status ──────────────────────────────────────────
  lines.push('## 4. Test Case Status');
  lines.push('');
  lines.push('| Status | Jumlah |');
  lines.push('|--------|--------|');
  lines.push('| Test Case Passed | ' + counts.passed + ' |');
  lines.push('| Test Case On Progress | ' + counts.onprogress + ' |');
  lines.push('| Test Case Untested | ' + counts.untested + ' |');
  lines.push('| Test Case Blocked | ' + counts.blocked + ' |');
  lines.push('| Test Case Failed | ' + counts.failed + ' |');
  lines.push('| Test Case Retest | ' + counts.retest + ' |');
  lines.push('| **Total Test Case** | **' + total + '** |');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Section 5: Test Case List (numbered) ─────────────────────────────────
  lines.push('## 5. Test Case List');
  lines.push('');

  rows.forEach((row, idx) => {
    const num = idx + 1;
    // Split multi-line fields into indented sub-lists
    const formatSteps = (text) => {
      if (!text) return '     -';
      return String(text).split('\n').map((l) => '     ' + l.trim()).join('\n');
    };

    lines.push(num + '. **' + row.tcId + ' — ' + row.summary + '**');
    lines.push('');
    lines.push('   - **Scenario**       : ' + (row.scenario || ''));
    lines.push('   - **Priority**       : ' + (row.priority || 'P2 - Medium'));
    lines.push('   - **Pre-Conditions** :');
    lines.push(formatSteps(row.preConditions));
    lines.push('   - **Test Step** :');
    lines.push(formatSteps(row.testStep));
    lines.push('   - **Test Data**       : ' + (row.testData || '-'));
    lines.push('   - **Expected Result** :');
    lines.push(formatSteps(row.expectedResult));
    lines.push('   - **Actual Result**   : *(diisi saat eksekusi)*');
    lines.push('   - **Status**          : ' + (row.testCaseStatus || 'untested'));
    lines.push('   - **Automation**      : ' + (row.automationStatus || 'manual only'));
    lines.push('   - **Notes**           : ' + (row.notes || '-'));
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  lines.push('*Generated by qa-explorer v1.1.0 — ' + NOW_ISO + '*');

  return lines.join('\n');
}

// ─── Gherkin Generator ──────────────────────────────────────────────────────

function toGherkinFeature(inventory, results, featureName) {
  const baseUrl = inventory.base_url;
  const lines = [];
  const pad = (n) => String(n).padStart(3, '0');
  let tcCounter = 1;

  lines.push('# ============================================================');
  lines.push('# Feature: ' + featureName);
  lines.push('# Mode: post-dev (verified)');
  lines.push('# Generated: ' + NOW_ISO);
  lines.push('# Source URL: ' + (baseUrl || 'N/A'));
  lines.push('# ============================================================');
  lines.push('');
  lines.push('@verified @post-dev');
  lines.push('Feature: ' + featureName);
  lines.push('  Berdasarkan eksplorasi langsung pada aplikasi');
  lines.push('  Tanggal eksplorasi: ' + TODAY);
  if (baseUrl) lines.push('  URL: ' + baseUrl);
  lines.push('');

  // Navigation scenarios
  const navScenarios = results.happy_paths.filter((s) => s.type === 'navigation' && s.loaded);
  if (navScenarios.length > 0) {
    lines.push('  # --- Navigation Flows ---');
    lines.push('');
    for (const s of navScenarios) {
      lines.push('  @happy-path @verified @high');
      lines.push('  Scenario: TC-' + pad(tcCounter++) + ' - Navigasi ke halaman "' + s.label + '" berhasil');
      lines.push('    Given user berada di halaman utama');
      lines.push('    When user mengklik menu "' + s.label + '"');
      lines.push('    Then halaman "' + (s.title || s.label) + '" berhasil dimuat');
      lines.push('    And status HTTP adalah ' + (s.status || 200));
      lines.push('');
    }
  }

  // Form happy paths
  const formHappy = results.happy_paths.filter((s) => s.type === 'happy-path');
  if (formHappy.length > 0) {
    lines.push('  # --- Form Happy Paths ---');
    lines.push('');
    for (const s of formHappy) {
      const formLabel = s.form_id || 'form';
      lines.push('  @happy-path @verified @high');
      lines.push('  Scenario: TC-' + pad(tcCounter++) + ' - Submit ' + formLabel + ' dengan data valid berhasil');
      lines.push('    Given user berada di halaman ' + (s.page || ''));
      lines.push('    When user mengisi semua field wajib dengan data yang valid');
      lines.push('    And user mengklik tombol submit');
      if (s.result === 'redirected') {
        lines.push('    Then user diredirect ke halaman ' + (s.url_after || ''));
      } else {
        lines.push('    Then halaman menampilkan konfirmasi atau pesan sukses');
      }
      if (s.success_message) {
        lines.push('    # Pesan sukses: "' + s.success_message + '"');
      }
      lines.push('');
    }
  }

  // Negative tests — empty submit
  const emptyForms = results.negative_tests.filter((s) => s.type === 'negative-empty-submit');
  if (emptyForms.length > 0) {
    lines.push('  # --- Negative Tests: Empty Submit ---');
    lines.push('');
    for (const s of emptyForms) {
      const hasValidation = s.validation_messages && s.validation_messages.length > 0;
      lines.push('  @negative @verified @high');
      lines.push('  Scenario: TC-' + pad(tcCounter++) + ' - Submit ' + (s.form_id || 'form') + ' kosong menampilkan validasi');
      lines.push('    Given user berada di halaman ' + (s.page || ''));
      lines.push('    When user langsung mengklik tombol submit tanpa mengisi form');
      if (hasValidation) {
        lines.push('    Then sistem menampilkan pesan validasi pada field yang wajib diisi');
        const htmlVals = s.validation_messages.filter((m) => m.type === 'html5-validation').slice(0, 2);
        for (const v of htmlVals) {
          lines.push('    # Field "' + v.field + '": "' + v.message + '"');
        }
      } else {
        lines.push('    Then sistem mencegah submission');
        lines.push('    # @needs-manual - validasi tidak terdeteksi otomatis');
      }
      lines.push('');
    }
  }

  // Negative tests — invalid format
  const invalidFormats = results.negative_tests.filter((s) => s.type === 'negative-invalid-format');
  if (invalidFormats.length > 0) {
    lines.push('  # --- Negative Tests: Invalid Format ---');
    lines.push('');
    for (const s of invalidFormats) {
      lines.push('  @negative @verified @high');
      lines.push('  Scenario: TC-' + pad(tcCounter++) + ' - Input format tidak valid pada field ' + (s.field || 'email'));
      lines.push('    Given user berada di halaman ' + (s.page || ''));
      lines.push('    When user mengisi field "' + (s.field || 'email') + '" dengan nilai "' + (s.test_value || '') + '"');
      lines.push('    And user mengklik tombol submit');
      if (s.error_shown) {
        lines.push('    Then sistem menampilkan pesan error "' + s.error_shown + '"');
      } else {
        lines.push('    Then sistem menampilkan pesan error validasi format');
      }
      lines.push('');
    }
  }

  // Failed navigations
  const failedNavs = results.happy_paths.filter((s) => s.type === 'navigation' && !s.loaded);
  if (failedNavs.length > 0) {
    lines.push('  # --- Edge Cases: Failed Navigation ---');
    lines.push('');
    for (const s of failedNavs) {
      lines.push('  @edge-case @verified @medium');
      lines.push('  Scenario: TC-' + pad(tcCounter++) + ' - Navigasi ke "' + s.label + '" perlu ditangani');
      lines.push('    Given user berada di halaman utama');
      lines.push('    When user mengklik menu "' + s.label + '"');
      lines.push('    Then sistem menangani navigasi dengan benar');
      lines.push('    # @needs-manual - Gagal saat automation: ' + (s.error || ''));
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── qa-spec Generator ──────────────────────────────────────────────────────

function generateQaSpec(inventory, results, featureName) {
  const scenarios = [];
  let counter = 1;
  const pad = (n) => String(n).padStart(3, '0');

  for (const s of results.happy_paths) {
    if (s.type === 'navigation') {
      scenarios.push({
        id: 'TC-' + pad(counter++),
        title: 'Navigasi ke "' + s.label + '" berhasil',
        tags: ['happy-path', 'verified'],
        priority: 'high',
        source: 'post-dev',
        steps: {
          given: 'User di halaman utama',
          when: 'Klik menu "' + s.label + '"',
          then: 'Halaman "' + (s.title || s.label) + '" dimuat',
        },
      });
    } else {
      scenarios.push({
        id: 'TC-' + pad(counter++),
        title: 'Submit ' + (s.form_id || 'form') + ' dengan data valid',
        tags: ['happy-path', 'verified'],
        priority: 'high',
        source: 'post-dev',
        steps: {
          given: 'User di ' + (s.page || ''),
          when: 'Isi form dan submit',
          then: s.result === 'redirected' ? 'Redirect ke ' + s.url_after : 'Sukses',
        },
      });
    }
  }

  for (const s of results.negative_tests) {
    const title = s.type === 'negative-empty-submit'
      ? 'Submit ' + (s.form_id || 'form') + ' kosong menampilkan validasi'
      : 'Input tidak valid di field ' + (s.field || 'email');
    scenarios.push({
      id: 'TC-' + pad(counter++),
      title,
      tags: ['negative', 'verified'],
      priority: 'high',
      source: 'post-dev',
      steps: {
        given: 'User di ' + (s.page || ''),
        when: s.type === 'negative-empty-submit'
          ? 'Klik submit tanpa mengisi form'
          : 'Isi field dengan "' + (s.test_value || '') + '"',
        then: (s.validation_messages && s.validation_messages.length > 0) ? 'Validasi muncul' : 'Error ditampilkan',
      },
    });
  }

  return {
    feature: featureName,
    source: 'post-dev',
    created_at: NOW_ISO,
    url: inventory.base_url,
    pages_explored: inventory.pages_scanned,
    scenarios,
    findings: {
      total_forms: inventory.summary.total_forms,
      total_navigation: inventory.summary.total_navigation,
      happy_paths_tested: results.happy_paths.length,
      negative_tests_run: results.negative_tests.length,
      errors_encountered: (results.errors || []).length,
    },
  };
}

// ─── Gap Report Generator ────────────────────────────────────────────────────

function generateGapReport(predevSpec, postdevSpec, featureName) {
  const lines = [];
  lines.push('# Gap Report: ' + featureName);
  lines.push('**Tanggal:** ' + TODAY);
  lines.push('**Pre-dev source:** ' + predevSpec.feature + ' (' + (predevSpec.created_at ? predevSpec.created_at.split('T')[0] : 'unknown') + ')');
  lines.push('**Post-dev source:** ' + (postdevSpec.url || 'browser exploration'));
  lines.push('**Generated by:** qa-explorer v1.0.0');
  lines.push('');
  lines.push('---');
  lines.push('');

  const preScenarios = predevSpec.scenarios || [];
  const postScenarios = postdevSpec.scenarios || [];
  const verified = [];
  const missing = [];
  const different = [];
  const newFindings = [];

  for (const preSc of preScenarios) {
    const preTitle = preSc.title.toLowerCase();
    const match = postScenarios.find((postSc) => {
      const postTitle = postSc.title.toLowerCase();
      const preWords = preTitle.split(/\s+/).filter((w) => w.length > 3);
      const matchCount = preWords.filter((w) => postTitle.includes(w)).length;
      return matchCount >= Math.ceil(preWords.length * 0.5);
    });
    if (match) {
      verified.push({ pre: preSc, post: match, confidence: 'Confirmed' });
    } else {
      const isComplex = (preSc.tags || []).some((t) =>
        ['needs-manual', 'auth', 'email', 'payment'].includes(t)
      );
      missing.push({ pre: preSc, confidence: isComplex ? 'Needs manual confirmation' : 'Likely missing' });
    }
  }

  for (const postSc of postScenarios) {
    const alreadyMatched = verified.some((v) => v.post.id === postSc.id);
    if (!alreadyMatched) newFindings.push({ post: postSc });
  }

  const totalPre = preScenarios.length;
  const coverage = totalPre > 0 ? Math.round((verified.length / totalPre) * 100) : 0;
  const riskLevel = missing.length > totalPre * 0.3 ? 'High' : missing.length > 0 ? 'Medium' : 'Low';

  lines.push('## Ringkasan Eksekutif');
  lines.push('');
  lines.push('| Status | Jumlah | Keterangan |');
  lines.push('|--------|--------|------------|');
  lines.push('| Terverifikasi | ' + verified.length + ' | Scenario ada di dokumen DAN di produk |');
  lines.push('| Missing di produk | ' + missing.length + ' | Ada di dokumen, tidak ditemukan di produk |');
  lines.push('| Berbeda dari dokumen | ' + different.length + ' | Behavior berbeda dari spec |');
  lines.push('| Temuan baru | ' + newFindings.length + ' | Ada di produk, tidak ada di dokumen |');
  lines.push('');
  lines.push('**Coverage:** ' + coverage + '% dari test case pre-dev terverifikasi');
  lines.push('**Risk Level:** ' + riskLevel);
  lines.push('');
  lines.push('---');
  lines.push('');

  if (verified.length > 0) {
    lines.push('## Terverifikasi (' + verified.length + ' scenario)');
    lines.push('');
    lines.push('| ID | Scenario | Confidence |');
    lines.push('|----|----------|-----------|');
    for (const v of verified) {
      lines.push('| ' + v.pre.id + ' | ' + v.pre.title + ' | ' + v.confidence + ' |');
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  if (missing.length > 0) {
    lines.push('## Missing di Produk (' + missing.length + ' scenario)');
    lines.push('');
    for (const m of missing) {
      lines.push('### ' + m.pre.id + ': ' + m.pre.title);
      lines.push('**Confidence:** ' + m.confidence);
      lines.push('**Dokumen bilang:** ' + ((m.pre.steps && m.pre.steps.then) ? m.pre.steps.then : 'Lihat pre-dev spec'));
      lines.push('**Yang ditemukan:** Tidak ditemukan saat eksplorasi browser');
      lines.push('**Rekomendasi:** Konfirmasi ke developer apakah fitur ini sudah diimplementasi');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  if (newFindings.length > 0) {
    lines.push('## Temuan Baru (' + newFindings.length + ' scenario)');
    lines.push('');
    for (const nf of newFindings) {
      lines.push('### NEW: ' + nf.post.title);
      lines.push('**Confidence:** Confirmed');
      lines.push('**Ditemukan di:** Eksplorasi browser');
      lines.push('**Rekomendasi:** Tambahkan ke dokumen dan buat test case');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  lines.push('## Rekomendasi Tindakan');
  lines.push('');
  const highPrioMissing = missing.filter((m) => m.confidence === 'Likely missing').slice(0, 5);
  if (highPrioMissing.length > 0) {
    lines.push('### Prioritas Tinggi');
    for (const m of highPrioMissing) {
      lines.push('- **[' + m.pre.id + ']** ' + m.pre.title + ' — Konfirmasi implementasi ke tim dev');
    }
    lines.push('');
  }
  if (newFindings.length > 0) {
    lines.push('### Prioritas Sedang');
    for (const nf of newFindings.slice(0, 3)) {
      lines.push('- **[NEW]** ' + nf.post.title + ' — Dokumentasikan di spec');
    }
    lines.push('');
  }

  lines.push('## Next Steps');
  lines.push('');
  lines.push('- [ ] Review gap report ini bersama tim');
  lines.push('- [ ] Update qa-spec-' + featureName + '.json dengan temuan baru');
  lines.push('- [ ] Jadwalkan test manual untuk item yang perlu konfirmasi');
  lines.push('- [ ] Update dokumen PRD jika ada perbedaan yang disengaja');

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('\n📋 QA Explorer — Phase 4: Report Generator');
  console.log('='.repeat(50));
  console.log('   Format: ' + config.format);

  if (!fs.existsSync(config.inventoryPath)) {
    console.error('Inventory not found: ' + config.inventoryPath);
    process.exit(1);
  }
  if (!fs.existsSync(config.resultsPath)) {
    console.error('Results not found: ' + config.resultsPath);
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(config.inventoryPath, 'utf8'));
  const results = JSON.parse(fs.readFileSync(config.resultsPath, 'utf8'));
  const featureName = config.name;
  const outDir = config.outDir;

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Always generate qa-spec JSON
  const qaSpec = generateQaSpec(inventory, results, featureName);
  const specPath = path.join(outDir, 'qa-spec-' + featureName + '.json');
  fs.writeFileSync(specPath, JSON.stringify(qaSpec, null, 2));
  console.log('  qa-spec: ' + specPath);

  if (config.format === 'table' || config.format === 'md' || config.format === 'markdown') {
    const doc = generateTableMarkdown(inventory, results, qaSpec, featureName);
    const outPath = path.join(outDir, featureName + '-tc.md');
    fs.writeFileSync(outPath, doc);
    console.log('  Markdown (5-section numbered list): ' + outPath);

  } else if (config.format === 'xlsx') {
    const xlsxGen = path.join(__dirname, 'xlsx-generator.js');
    if (!fs.existsSync(xlsxGen)) {
      console.error('xlsx-generator.js not found');
      process.exit(1);
    }
    const { execSync } = require('child_process');
    const outFlag = '--out-dir "' + outDir + '"';
    const nameFlag = '--name "' + featureName + '"';
    const invFlag = '--inventory "' + config.inventoryPath + '"';
    const resFlag = '--results "' + config.resultsPath + '"';
    const specFlag = '--qa-spec "' + specPath + '"';
    const byFlag = config.createdBy ? '--created-by "' + config.createdBy + '"' : '';
    const envFlag = config.env ? '--env "' + config.env + '"' : '';
    execSync(
      'node "' + xlsxGen + '" ' + [invFlag, resFlag, specFlag, nameFlag, outFlag, byFlag, envFlag].filter(Boolean).join(' '),
      { stdio: 'inherit' }
    );

  } else if (config.format === 'steps') {
    const rows = buildTableRows(results, qaSpec);
    const lines = ['# Test Cases: ' + featureName, '', 'Generated: ' + TODAY, '---', ''];
    rows.forEach((row) => {
      lines.push('## ' + row.tcId + ': ' + row.summary);
      lines.push('');
      lines.push('**Priority:** ' + row.priority);
      lines.push('**Scenario:** ' + row.scenario);
      lines.push('**Automation Status:** ' + row.automationStatus);
      lines.push('');
      lines.push('**Pre-Conditions:**');
      String(row.preConditions || '').split('\n').forEach((l) => lines.push(l));
      lines.push('');
      lines.push('**Steps:**');
      String(row.testStep || '').split('\n').forEach((l) => lines.push(l));
      if (row.testData) { lines.push(''); lines.push('**Test Data:** ' + row.testData); }
      lines.push('');
      lines.push('**Expected Result:**');
      String(row.expectedResult || '').split('\n').forEach((l) => lines.push(l));
      lines.push('');
      lines.push('**Test Case Status:** ' + row.testCaseStatus);
      if (row.notes) { lines.push(''); lines.push('**Notes:** ' + row.notes); }
      lines.push('');
      lines.push('---');
      lines.push('');
    });
    const stepsPath = path.join(outDir, featureName + '-steps.md');
    fs.writeFileSync(stepsPath, lines.join('\n'));
    console.log('  Plain Steps: ' + stepsPath);

  } else {
    // Default: Gherkin
    const gherkin = toGherkinFeature(inventory, results, featureName);
    const featurePath = path.join(outDir, featureName + '-verified.feature');
    fs.writeFileSync(featurePath, gherkin);
    console.log('  Feature file: ' + featurePath);
  }

  // Gap report (all formats)
  if (config.predevSpec) {
    if (!fs.existsSync(config.predevSpec)) {
      console.warn('  Pre-dev spec not found: ' + config.predevSpec + ' — skipping gap report');
    } else {
      const predevSpec = JSON.parse(fs.readFileSync(config.predevSpec, 'utf8'));
      const gapReport = generateGapReport(predevSpec, qaSpec, featureName);
      const gapPath = path.join(outDir, 'gap-report-' + featureName + '-' + TODAY + '.md');
      fs.writeFileSync(gapPath, gapReport);
      console.log('  Gap Report: ' + gapPath);
    }
  }

  const rows = buildTableRows(results, qaSpec);
  const autoCandidates = rows.filter((r) => r.automationStatus !== 'manual only').length;
  console.log('\n  Summary: ' + rows.length + ' TC total, ' + autoCandidates + ' automation candidates');
  console.log('  Done!');
}

main();
