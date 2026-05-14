#!/usr/bin/env node
/**
 * qa-explorer Excel Generator
 * Generates a fully formatted .xlsx test case document with 3 sections:
 *   1. Test Case Information
 *   2. Test Case Status (auto-count via COUNTIF)
 *   3. Test Case Table (with dropdown validation for status fields)
 *
 * Usage:
 *   node xlsx-generator.js --inventory <path> --results <path> --qa-spec <path> --name <name> [options]
 *
 * Options:
 *   --inventory <path>    inventory-output.json
 *   --results <path>      results.json from happy-path.js
 *   --qa-spec <path>      qa-spec-[name].json
 *   --name <name>         Feature name
 *   --out-dir <dir>       Output directory (default: .)
 *   --created-by <name>   Creator name (default: QA Explorer)
 *   --user-facing <v>     Yes|No
 */

const fs = require('fs');
const path = require('path');

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const config = {
  inventoryPath: getArg('--inventory') || 'inventory-output.json',
  resultsPath: getArg('--results') || 'results.json',
  qaSpecPath: getArg('--qa-spec'),
  name: getArg('--name') || 'unnamed-feature',
  outDir: getArg('--out-dir') || '.',
  createdBy: getArg('--created-by') || 'QA Explorer',
  userFacing: getArg('--user-facing') || 'Yes',
};

const TODAY = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

// ─── Dependency Check ────────────────────────────────────────────────────────

function ensureExcelJS() {
  try {
    require.resolve('exceljs');
    return true;
  } catch (e) {
    console.log('  📦 Installing exceljs...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install exceljs --save', { cwd: __dirname, stdio: 'pipe' });
      console.log('  ✓ exceljs installed');
      return true;
    } catch (err) {
      console.error('  ❌ Failed to install exceljs. Run manually:');
      console.error('     cd skills/qa-explorer/scripts && npm install exceljs');
      return false;
    }
  }
}

// ─── Priority & Automation Analyzers (copied from reporter.js for standalone use) ──

function analyzePriority(scenario) {
  if (!scenario) return 'P2 - Medium';
  const tags = scenario.tags || [];
  const title = (scenario.title || '').toLowerCase();
  if (tags.includes('high')) return 'P1 - High';
  if (title.includes('login') || title.includes('auth') || title.includes('checkout') ||
      title.includes('payment') || title.includes('register') || title.includes('daftar') ||
      (tags.includes('happy-path') && tags.includes('verified'))) return 'P1 - High';
  if (tags.includes('low') || tags.includes('edge-case') || tags.includes('assumption')) return 'P3 - Low';
  return 'P2 - Medium';
}

function analyzeAutomationStatus(scenario) {
  if (!scenario) return 'manual only';
  const tags = scenario.tags || [];
  const title = (scenario.title || '').toLowerCase();
  const type = scenario.type || '';
  if (tags.includes('manual only') || tags.includes('ui-only') || tags.includes('needs-manual') || tags.includes('flaky')) return 'manual only';
  const isRepetitive = title.includes('login') || title.includes('register') || title.includes('form') ||
      title.includes('validasi') || title.includes('navigation') || title.includes('navigasi');
  const isHappyPath = tags.includes('happy-path') || type === 'navigation';
  const isNegative = tags.includes('negative') || type === 'negative-empty-submit' || type === 'negative-invalid-format';
  if ((isHappyPath || isNegative) && isRepetitive) return 'to be automated';
  if (isHappyPath && tags.includes('verified')) return 'to be automated';
  if (isNegative && tags.includes('verified')) return 'to be automated';
  if (title.includes('email') || title.includes('sms') || title.includes('payment') ||
      title.includes('otp') || title.includes('captcha')) return 'manual only';
  if (tags.includes('edge-case')) return 'manual only';
  return 'manual only';
}

function buildTableRows(results, qaSpec) {
  const rows = [];
  let counter = 1;
  const pad = (n) => String(n).padStart(4, '0');

  for (const s of (results.happy_paths || [])) {
    const priority = analyzePriority({ tags: ['happy-path'], title: s.label || s.form_id || '' });
    const automation = analyzeAutomationStatus({ tags: ['happy-path', 'verified'], title: s.label || '', type: s.type });
    let summary, testStep, preConditions, expectedResult, testData, scenario;

    if (s.type === 'navigation') {
      scenario = 'Navigation';
      summary = `Verifikasi navigasi ke halaman "${s.label}" berhasil dimuat`;
      preConditions = '1. User sudah berada di halaman utama';
      testStep = `1. Klik menu "${s.label}"`;
      expectedResult = `1. Halaman "${s.title || s.label}" berhasil dimuat\n2. Status HTTP: ${s.status || 200}`;
      testData = `URL: ${s.href || ''}`;
    } else {
      scenario = s.form_id || 'Form Submit';
      summary = `Verifikasi submit form "${s.form_id || 'form'}" dengan data valid berhasil`;
      preConditions = `1. User sudah berada di halaman ${s.page || ''}`;
      testStep = '1. Isi semua field wajib dengan data yang valid\n2. Klik tombol submit';
      expectedResult = s.result === 'redirected'
        ? `1. User diredirect ke ${s.url_after}\n2. Proses berhasil`
        : '1. Halaman menampilkan konfirmasi atau pesan sukses';
      testData = `URL: ${s.page || ''}`;
    }
    rows.push({ tcId: `TC${pad(counter++)}`, scenario, summary, priority, preConditions, testStep, testData, expectedResult, actualResult: '', testCaseStatus: 'untested', automationStatus: automation, notes: '' });
  }

  for (const s of (results.negative_tests || [])) {
    const automation = analyzeAutomationStatus({ tags: ['negative', 'verified'], title: s.type, type: s.type });
    let summary, testStep, preConditions, expectedResult, testData, scenario;
    scenario = s.form_id || 'Form Validation';

    if (s.type === 'negative-empty-submit') {
      summary = `Verifikasi validasi muncul saat form "${s.form_id || 'form'}" di-submit kosong`;
      preConditions = `1. User sudah berada di halaman ${s.page || ''}`;
      testStep = `1. Buka halaman ${s.page || ''}\n2. Klik tombol submit tanpa mengisi apapun`;
      testData = 'Semua field dikosongkan';
      const msgs = (s.validation_messages || []).filter(m => m.message).slice(0, 3);
      expectedResult = msgs.length > 0
        ? msgs.map((m, i) => `${i + 1}. ${m.message}`).join('\n')
        : '1. Pesan validasi muncul di field yang wajib diisi\n2. Form tidak ter-submit';
    } else {
      summary = `Verifikasi error validasi format pada field "${s.field || 'email'}"`;
      preConditions = `1. User sudah berada di halaman ${s.page || ''}`;
      testStep = `1. Isi field "${s.field || 'email'}" dengan nilai tidak valid\n2. Klik tombol submit`;
      testData = `${s.field || 'email'} = ${s.test_value || 'not-an-email'}`;
      expectedResult = s.error_shown
        ? `1. Muncul pesan error: "${s.error_shown}"\n2. Form tidak ter-submit`
        : '1. Pesan error format tidak valid muncul\n2. Form tidak ter-submit';
    }
    rows.push({ tcId: `TC${pad(counter++)}`, scenario, summary, priority: 'P1 - High', preConditions, testStep, testData, expectedResult, actualResult: '', testCaseStatus: 'untested', automationStatus: automation, notes: '' });
  }

  const existingTitles = new Set(rows.map(r => r.summary.toLowerCase().substring(0, 30)));
  for (const sc of (qaSpec?.scenarios || [])) {
    const titleKey = (sc.title || '').toLowerCase().substring(0, 30);
    if (existingTitles.has(titleKey)) continue;
    rows.push({
      tcId: `TC${pad(counter++)}`,
      scenario: sc.title?.split(' ').slice(0, 3).join(' ') || 'Scenario',
      summary: sc.title || '',
      priority: analyzePriority(sc),
      preConditions: sc.steps?.given || '',
      testStep: sc.steps?.when || '',
      testData: '',
      expectedResult: sc.steps?.then || '',
      actualResult: '',
      testCaseStatus: 'untested',
      automationStatus: analyzeAutomationStatus(sc),
      notes: (sc.tags || []).includes('assumption') ? 'Asumsi — perlu dikonfirmasi' : '',
    });
    existingTitles.add(titleKey);
  }
  return rows;
}

// ─── Excel Builder ───────────────────────────────────────────────────────────

async function buildExcel(inventory, results, qaSpec, featureName) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = config.createdBy;
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Test Cases', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  // ── Colors & Styles ──────────────────────────────────────────────────────
  const C = {
    headerBg: '1E3A5F',      // dark navy — section headers
    headerFg: 'FFFFFF',
    subHeaderBg: '2E75B6',   // blue — column headers
    subHeaderFg: 'FFFFFF',
    labelBg: 'D6E4F0',       // light blue — left-col labels
    labelFg: '1E3A5F',
    valueBg: 'FFFFFF',
    sectionGap: 'F0F4F8',    // very light blue — empty spacer rows
    priorityP1: 'FFE0E0',    // light red
    priorityP2: 'FFF3CD',    // light yellow
    priorityP3: 'E8F5E9',    // light green
    statusPassed: 'C8E6C9',
    statusFailed: 'FFCDD2',
    statusUntested: 'F5F5F5',
    statusBlocked: 'FFE0B2',
    statusOnprogress: 'E3F2FD',
    statusRetest: 'F3E5F5',
    autoAutomated: 'C8E6C9',
    autoToBeAuto: 'E3F2FD',
    autoInProgress: 'FFF9C4',
    autoManual: 'FAFAFA',
    border: 'BDBDBD',
  };

  const bold = (size = 10) => ({ font: { bold: true, size }, alignment: { wrapText: true, vertical: 'middle' } });
  const normal = (size = 10) => ({ font: { size }, alignment: { wrapText: true, vertical: 'top' } });

  function fillCell(row, col, value, bgColor, fgColor, isBold = false, size = 10) {
    const cell = ws.getCell(row, col);
    cell.value = value;
    cell.font = { bold: isBold, color: { argb: 'FF' + (fgColor || '000000') }, size };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (bgColor || 'FFFFFF') } };
    cell.alignment = { wrapText: true, vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF' + C.border } },
      left: { style: 'thin', color: { argb: 'FF' + C.border } },
      bottom: { style: 'thin', color: { argb: 'FF' + C.border } },
      right: { style: 'thin', color: { argb: 'FF' + C.border } },
    };
    return cell;
  }

  function sectionHeader(row, title, colSpan = 8) {
    ws.mergeCells(row, 1, row, colSpan);
    const cell = ws.getCell(row, 1);
    cell.value = title;
    cell.font = { bold: true, color: { argb: 'FF' + C.headerFg }, size: 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.headerBg } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(row).height = 24;
  }

  function spacer(row) {
    ws.mergeCells(row, 1, row, 12);
    const cell = ws.getCell(row, 1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.sectionGap } };
    ws.getRow(row).height = 8;
  }

  function labelRow(row, label, value, colSpan = 7) {
    ws.getRow(row).height = 20;
    fillCell(row, 1, label, C.labelBg, C.labelFg, true, 10);
    ws.mergeCells(row, 2, row, colSpan);
    fillCell(row, 2, value, C.valueBg, '333333', false, 10);
  }

  // ── Set column widths ────────────────────────────────────────────────────
  ws.columns = [
    { width: 22 },  // col 1: labels / TC ID
    { width: 18 },  // col 2: values / Scenario
    { width: 40 },  // col 3: Summary
    { width: 14 },  // col 4: Priority
    { width: 30 },  // col 5: Pre-Conditions
    { width: 35 },  // col 6: Test Step
    { width: 25 },  // col 7: Test Data
    { width: 35 },  // col 8: Expected Result
    { width: 30 },  // col 9: Actual Result
    { width: 16 },  // col 10: TC Status
    { width: 18 },  // col 11: Automation Status
    { width: 25 },  // col 12: Notes
  ];

  let r = 1; // current row pointer

  // ═══════════════════════════════════════════════════════════
  // SECTION 1 — TEST CASE INFORMATION
  // ═══════════════════════════════════════════════════════════
  sectionHeader(r, '  TEST CASE INFORMATION', 12); r++;
  labelRow(r, 'Feature Name', featureName); r++;
  labelRow(r, 'User Facing', config.userFacing); r++;
  labelRow(r, 'Created By', config.createdBy); r++;
  labelRow(r, 'Created Date', TODAY); r++;
  labelRow(r, 'Approve By', ''); r++;
  labelRow(r, 'Updated By', ''); r++;
  labelRow(r, 'Updated Date', ''); r++;
  spacer(r); r++;

  // ═══════════════════════════════════════════════════════════
  // SECTION 2 — TEST CASE STATUS SUMMARY
  // ═══════════════════════════════════════════════════════════
  sectionHeader(r, '  TEST CASE STATUS', 12); r++;

  // We'll write COUNTIF formulas pointing to column J (Test Case Status)
  // We need to know where the TC table starts — calculate it
  const tcTableHeaderRow = r + 8; // section4 header + 7 status rows + spacer + tc header
  // We'll use a named range or absolute column ref. Since ExcelJS doesn't support dynamic range easily,
  // we'll use a direct column reference after building rows first, then update the formulas.

  const statusRows = {
    passed: r,
    onprogress: r + 1,
    untested: r + 2,
    blocked: r + 3,
    failed: r + 4,
    retest: r + 5,
  };

  const statusColors = {
    passed: C.statusPassed,
    onprogress: C.statusOnprogress,
    untested: C.statusUntested,
    blocked: C.statusBlocked,
    failed: C.statusFailed,
    retest: C.statusRetest,
  };

  const statusLabels = [
    ['Test Case Passed', 'passed'],
    ['Test Case On Progress', 'onprogress'],
    ['Test Case Untested', 'untested'],
    ['Test Case Blocked', 'blocked'],
    ['Test Case Failed', 'failed'],
    ['Test Case Retest', 'retest'],
  ];

  for (const [label, key] of statusLabels) {
    ws.getRow(r).height = 20;
    fillCell(r, 1, label, statusColors[key], '333333', true);
    // We'll fill with formula after we know the data range
    fillCell(r, 2, 0, statusColors[key], '333333', false);
    r++;
  }

  // Total row
  ws.getRow(r).height = 22;
  fillCell(r, 1, 'Total Test Case', C.subHeaderBg, C.subHeaderFg, true, 11);
  fillCell(r, 2, { formula: `=B${statusRows.passed}+B${statusRows.onprogress}+B${statusRows.untested}+B${statusRows.blocked}+B${statusRows.failed}+B${statusRows.retest}` }, C.subHeaderBg, C.subHeaderFg, true, 11);
  r++;
  spacer(r); r++;

  // ═══════════════════════════════════════════════════════════
  // SECTION 3 — TEST CASE TABLE
  // ═══════════════════════════════════════════════════════════
  sectionHeader(r, '  TEST CASE TABLE', 12); r++;

  // Column headers
  const headers = [
    'TC ID', 'Scenario', 'Summary', 'Priority',
    'Pre-Conditions', 'Test Step', 'Test Data',
    'Expected Result', 'Actual Result',
    'Test Case Status', 'Automation Status', 'Notes',
  ];
  ws.getRow(r).height = 28;
  headers.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FF' + C.subHeaderFg }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.subHeaderBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF' + C.headerBg } },
      left: { style: 'thin', color: { argb: 'FF' + C.border } },
      bottom: { style: 'medium', color: { argb: 'FF' + C.headerBg } },
      right: { style: 'thin', color: { argb: 'FF' + C.border } },
    };
  });

  const tcHeaderRow = r;
  r++;

  // TC data rows
  const rows = buildTableRows(results, qaSpec);
  const tcDataStartRow = r;

  for (const row of rows) {
    ws.getRow(r).height = 60;

    // Priority color
    const priorityBg = row.priority === 'P1 - High' ? C.priorityP1 : row.priority === 'P3 - Low' ? C.priorityP3 : C.priorityP2;

    // Status color
    const statusBg = {
      passed: C.statusPassed, failed: C.statusFailed, blocked: C.statusBlocked,
      onprogress: C.statusOnprogress, retest: C.statusRetest, untested: C.statusUntested,
    }[row.testCaseStatus] || C.statusUntested;

    // Automation color
    const autoBg = {
      'automated': C.autoAutomated, 'to be automated': C.autoToBeAuto,
      'in progress': C.autoInProgress, 'manual only': C.autoManual,
    }[row.automationStatus] || C.autoManual;

    fillCell(r, 1, row.tcId, 'F8F9FA', '1E3A5F', true);
    fillCell(r, 2, row.scenario, C.valueBg, '333333');
    fillCell(r, 3, row.summary, C.valueBg, '333333');
    fillCell(r, 4, row.priority, priorityBg, '333333', true);
    fillCell(r, 5, row.preConditions, C.valueBg, '333333');
    fillCell(r, 6, row.testStep, C.valueBg, '333333');
    fillCell(r, 7, row.testData, C.valueBg, '555555');
    fillCell(r, 8, row.expectedResult, C.valueBg, '333333');
    fillCell(r, 9, row.actualResult || '', 'FFFDE7', '333333');
    fillCell(r, 10, row.testCaseStatus, statusBg, '333333', true);
    fillCell(r, 11, row.automationStatus, autoBg, '333333');
    fillCell(r, 12, row.notes || '', C.valueBg, '666666');

    r++;
  }

  const tcDataEndRow = r - 1;

  // ── Update COUNTIF formulas in Section 4 ──────────────────────────────
  for (const [label, key] of statusLabels) {
    const statusRow = statusRows[key];
    ws.getCell(statusRow, 2).value = {
      formula: `=COUNTIF(J${tcDataStartRow}:J${tcDataEndRow},"${key}")`,
    };
  }

  // ── Add Data Validation (dropdowns) for TC Status and Automation Status ──
  const tcStatusValues = '"untested,passed,onprogress,blocked,failed,retest"';
  const autoStatusValues = '"manual only,to be automated,in progress,automated"';
  const priorityValues = '"P1 - High,P2 - Medium,P3 - Low"';

  for (let dataRow = tcDataStartRow; dataRow <= tcDataEndRow; dataRow++) {
    // TC Status dropdown (col J = 10)
    ws.getCell(dataRow, 10).dataValidation = {
      type: 'list', allowBlank: false,
      formulae: [tcStatusValues],
      showErrorMessage: true,
      errorTitle: 'Invalid Status',
      error: 'Pilih salah satu: untested, passed, onprogress, blocked, failed, retest',
    };
    // Automation Status dropdown (col K = 11)
    ws.getCell(dataRow, 11).dataValidation = {
      type: 'list', allowBlank: false,
      formulae: [autoStatusValues],
      showErrorMessage: true,
      errorTitle: 'Invalid Automation Status',
      error: 'Pilih salah satu: manual only, to be automated, in progress, automated',
    };
    // Priority dropdown (col D = 4)
    ws.getCell(dataRow, 4).dataValidation = {
      type: 'list', allowBlank: false,
      formulae: [priorityValues],
    };
  }

  // ── Freeze panes at TC table header ──────────────────────────────────
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: tcHeaderRow, activeCell: `A${tcDataStartRow}` }];

  // ── Auto-filter on TC table ───────────────────────────────────────────
  ws.autoFilter = { from: { row: tcHeaderRow, column: 1 }, to: { row: tcDataEndRow, column: 12 } };

  return workbook;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📊 QA Explorer — Excel Generator');
  console.log('='.repeat(45));

  // Check dependencies
  if (!ensureExcelJS()) process.exit(1);

  // Load input files
  if (!fs.existsSync(config.inventoryPath)) {
    console.error(`❌ Inventory not found: ${config.inventoryPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(config.resultsPath)) {
    console.error(`❌ Results not found: ${config.resultsPath}`);
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(config.inventoryPath, 'utf8'));
  const results = JSON.parse(fs.readFileSync(config.resultsPath, 'utf8'));
  const qaSpec = config.qaSpecPath && fs.existsSync(config.qaSpecPath)
    ? JSON.parse(fs.readFileSync(config.qaSpecPath, 'utf8'))
    : null;

  const featureName = config.name;
  const outDir = config.outDir;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n  Feature : ${featureName}`);
  console.log(`  Source  : ${inventory.base_url || 'document'}`);
  console.log(`  Output  : ${outDir}/`);
  console.log('\n  Building Excel...');

  const workbook = await buildExcel(inventory, results, qaSpec, featureName);

  const outPath = path.join(outDir, `${featureName}-testcase.xlsx`);
  await workbook.xlsx.writeFile(outPath);

  const stat = fs.statSync(outPath);
  const sizeKb = (stat.size / 1024).toFixed(1);

  console.log(`\n✅ Excel file: ${outPath} (${sizeKb} KB)`);
  console.log('\n📋 What\'s in the file:');
  console.log('   Section 1 — Test Case Information');
  console.log('   Section 2 — Test Case Status (auto-COUNTIF)');
  console.log('   Section 3 — Test Case Table (with dropdowns + auto-filter)');
  console.log('\n🎉 Done!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
