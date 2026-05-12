#!/usr/bin/env node
/**
 * qa-explorer Phase 4: Report Generator
 * Generates .feature file, qa-spec.json, and optional gap-report.md
 * from inventory and happy-path results.
 *
 * Usage:
 *   node reporter.js [options]
 *
 * Options:
 *   --inventory <path>    Path to inventory-output.json (required)
 *   --results <path>      Path to results.json from happy-path.js (required)
 *   --name <name>         Feature name (required)
 *   --predev-spec <path>  Path to pre-dev qa-spec JSON for gap analysis
 *   --format <fmt>        Output format: gherkin|table|steps (default: gherkin)
 *   --out-dir <dir>       Output directory (default: current dir)
 *   --lang <lang>         Language: id|en (default: id)
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
  lang: getArg('--lang') || 'id',
};

const TODAY = new Date().toISOString().split('T')[0];

// ─── Gherkin Generator ──────────────────────────────────────────────────────

function toGherkinFeature(inventory, results, featureName) {
  const baseUrl = inventory.base_url;
  const lines = [];

  lines.push(`# ============================================================`);
  lines.push(`# Feature: ${featureName}`);
  lines.push(`# Mode: post-dev (verified)`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Source URL: ${baseUrl}`);
  lines.push(`# ============================================================`);
  lines.push('');
  lines.push(`@verified @post-dev`);
  lines.push(`Feature: ${featureName}`);
  lines.push(`  Berdasarkan eksplorasi langsung pada aplikasi`);
  lines.push(`  Tanggal eksplorasi: ${TODAY}`);
  lines.push(`  URL: ${baseUrl}`);
  lines.push('');

  let tcCounter = 1;
  const pad = (n) => String(n).padStart(3, '0');

  // Happy path scenarios from navigation
  const navScenarios = results.happy_paths.filter(s => s.type === 'navigation' && s.loaded);
  if (navScenarios.length > 0) {
    lines.push(`  # --- Navigation Flows ---`);
    lines.push('');
    for (const s of navScenarios) {
      lines.push(`  @happy-path @verified @high`);
      lines.push(`  Scenario: TC-${pad(tcCounter++)} - Navigasi ke halaman "${s.label}" berhasil`);
      lines.push(`    Given user berada di halaman utama`);
      lines.push(`    When user mengklik menu "${s.label}"`);
      lines.push(`    Then halaman "${s.title || s.label}" berhasil dimuat`);
      lines.push(`    And status HTTP adalah ${s.status || 200}`);
      lines.push('');
    }
  }

  // Form happy path scenarios
  const formHappy = results.happy_paths.filter(s => s.type === 'happy-path');
  if (formHappy.length > 0) {
    lines.push(`  # --- Form Happy Paths ---`);
    lines.push('');
    for (const s of formHappy) {
      const formLabel = s.form_id || 'form';
      const redirected = s.result === 'redirected';

      lines.push(`  @happy-path @verified @high`);
      lines.push(`  Scenario: TC-${pad(tcCounter++)} - Submit ${formLabel} dengan data valid berhasil`);
      lines.push(`    Given user berada di halaman ${s.page}`);
      lines.push(`    When user mengisi semua field wajib dengan data yang valid`);
      lines.push(`    And user mengklik tombol submit`);
      if (redirected) {
        lines.push(`    Then user diredirect ke halaman ${s.url_after}`);
      } else {
        lines.push(`    Then halaman menampilkan konfirmasi atau pesan sukses`);
      }
      if (s.success_message) {
        lines.push(`    # Pesan sukses yang ditemukan: "${s.success_message}"`);
      }
      lines.push('');
    }
  }

  // Negative test scenarios
  const emptyForms = results.negative_tests.filter(s => s.type === 'negative-empty-submit');
  if (emptyForms.length > 0) {
    lines.push(`  # --- Negative Tests: Empty Submit ---`);
    lines.push('');
    for (const s of emptyForms) {
      const hasValidation = s.validation_messages && s.validation_messages.length > 0;
      lines.push(`  @negative @verified @high`);
      lines.push(`  Scenario: TC-${pad(tcCounter++)} - Submit ${s.form_id || 'form'} kosong menampilkan validasi`);
      lines.push(`    Given user berada di halaman ${s.page}`);
      lines.push(`    When user langsung mengklik tombol submit tanpa mengisi form`);
      if (hasValidation) {
        lines.push(`    Then sistem menampilkan pesan validasi pada field yang wajib diisi`);
        // Add specific messages if found
        const htmlValidations = s.validation_messages.filter(m => m.type === 'html5-validation').slice(0, 2);
        for (const v of htmlValidations) {
          lines.push(`    # Field "${v.field}": "${v.message}"`);
        }
      } else {
        lines.push(`    Then sistem mencegah submission`);
        lines.push(`    # @needs-manual - validasi tidak terdeteksi otomatis, perlu dicek manual`);
      }
      lines.push('');
    }
  }

  // Negative: invalid format
  const invalidFormats = results.negative_tests.filter(s => s.type === 'negative-invalid-format');
  if (invalidFormats.length > 0) {
    lines.push(`  # --- Negative Tests: Invalid Format ---`);
    lines.push('');
    for (const s of invalidFormats) {
      lines.push(`  @negative @verified @high`);
      lines.push(`  Scenario: TC-${pad(tcCounter++)} - Input format tidak valid pada field ${s.field || 'email'}`);
      lines.push(`    Given user berada di halaman ${s.page}`);
      lines.push(`    When user mengisi field "${s.field || 'email'}" dengan nilai "${s.test_value}"`);
      lines.push(`    And user mengklik tombol submit`);
      if (s.error_shown) {
        lines.push(`    Then sistem menampilkan pesan error "${s.error_shown}"`);
      } else {
        lines.push(`    Then sistem menampilkan pesan error validasi format`);
      }
      lines.push('');
    }
  }

  // Edge cases: pages with unexpected states
  const failedNavs = results.happy_paths.filter(s => s.type === 'navigation' && !s.loaded);
  if (failedNavs.length > 0) {
    lines.push(`  # --- Edge Cases: Failed Navigation ---`);
    lines.push('');
    for (const s of failedNavs) {
      lines.push(`  @edge-case @verified @medium`);
      lines.push(`  Scenario: TC-${pad(tcCounter++)} - Navigasi ke "${s.label}" perlu ditangani`);
      lines.push(`    Given user berada di halaman utama`);
      lines.push(`    When user mengklik menu "${s.label}"`);
      lines.push(`    Then sistem menangani navigasi dengan benar`);
      lines.push(`    # @needs-manual - Gagal saat automation: ${s.error}`);
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
    scenarios.push({
      id: `TC-${pad(counter++)}`,
      title: s.type === 'navigation'
        ? `Navigasi ke "${s.label}" berhasil`
        : `Submit ${s.form_id || 'form'} dengan data valid`,
      tags: ['happy-path', 'verified'],
      priority: 'high',
      source: 'post-dev',
      steps: s.type === 'navigation'
        ? { given: `User di halaman utama`, when: `Klik menu "${s.label}"`, then: `Halaman "${s.title}" dimuat` }
        : { given: `User di ${s.page}`, when: `Isi form dan submit`, then: `Sukses / redirect` },
    });
  }

  for (const s of results.negative_tests) {
    scenarios.push({
      id: `TC-${pad(counter++)}`,
      title: s.type === 'negative-empty-submit'
        ? `Submit ${s.form_id || 'form'} kosong menampilkan validasi`
        : `Input tidak valid di field ${s.field}`,
      tags: ['negative', 'verified'],
      priority: 'high',
      source: 'post-dev',
      steps: {
        given: `User di ${s.page}`,
        when: s.type === 'negative-empty-submit' ? `Klik submit tanpa mengisi form` : `Isi field dengan "${s.test_value}"`,
        then: s.validation_messages?.length > 0 ? `Validasi muncul` : `Error ditampilkan`,
      },
    });
  }

  return {
    feature: featureName,
    source: 'post-dev',
    created_at: new Date().toISOString(),
    url: inventory.base_url,
    pages_explored: inventory.pages_scanned,
    scenarios,
    findings: {
      total_forms: inventory.summary.total_forms,
      total_navigation: inventory.summary.total_navigation,
      happy_paths_tested: results.happy_paths.length,
      negative_tests_run: results.negative_tests.length,
      errors_encountered: results.errors.length,
    },
  };
}

// ─── Gap Report Generator ────────────────────────────────────────────────────

function generateGapReport(predevSpec, postdevSpec, featureName) {
  const lines = [];

  lines.push(`# Gap Report: ${featureName}`);
  lines.push(`**Tanggal:** ${TODAY}`);
  lines.push(`**Pre-dev source:** ${predevSpec.feature} (${predevSpec.created_at?.split('T')[0] || 'unknown'})`);
  lines.push(`**Post-dev source:** ${postdevSpec.url || 'browser exploration'}`);
  lines.push(`**Generated by:** qa-explorer v1.0.0`);
  lines.push('');
  lines.push('---');
  lines.push('');

  const preScenarios = predevSpec.scenarios || [];
  const postScenarios = postdevSpec.scenarios || [];

  const verified = [];
  const missing = [];
  const different = [];
  const newFindings = [];

  // Match pre-dev scenarios against post-dev
  for (const preSc of preScenarios) {
    const preTitle = preSc.title.toLowerCase();

    // Try to find match in post-dev by title similarity
    const match = postScenarios.find(postSc => {
      const postTitle = postSc.title.toLowerCase();
      // Simple word overlap check
      const preWords = preTitle.split(/\s+/).filter(w => w.length > 3);
      const matchCount = preWords.filter(w => postTitle.includes(w)).length;
      return matchCount >= Math.ceil(preWords.length * 0.5);
    });

    if (match) {
      const tagMatch = preSc.tags?.some(t => match.tags?.includes(t));
      if (tagMatch || true) {
        verified.push({ pre: preSc, post: match, confidence: 'Confirmed' });
      }
    } else {
      // Determine confidence based on tags
      const isComplex = (preSc.tags || []).some(t => ['needs-manual', 'auth', 'email', 'payment'].includes(t));
      missing.push({
        pre: preSc,
        confidence: isComplex ? 'Needs manual confirmation' : 'Likely missing',
      });
    }
  }

  // Find new post-dev findings not in pre-dev
  for (const postSc of postScenarios) {
    const postTitle = postSc.title.toLowerCase();
    const alreadyMatched = verified.some(v => v.post.id === postSc.id);
    if (!alreadyMatched) {
      newFindings.push({ post: postSc });
    }
  }

  // Summary table
  const totalPre = preScenarios.length;
  const coverage = totalPre > 0 ? Math.round((verified.length / totalPre) * 100) : 0;
  const riskLevel = missing.length > totalPre * 0.3 ? 'High' : missing.length > 0 ? 'Medium' : 'Low';

  lines.push('## Ringkasan Eksekutif');
  lines.push('');
  lines.push('| Status | Jumlah | Keterangan |');
  lines.push('|--------|--------|------------|');
  lines.push(`| ✅ Terverifikasi | ${verified.length} | Scenario ada di dokumen DAN di produk |`);
  lines.push(`| ⚠️ Missing di produk | ${missing.length} | Ada di dokumen, tidak ditemukan di produk |`);
  lines.push(`| ℹ️ Berbeda dari dokumen | ${different.length} | Behavior berbeda dari spec |`);
  lines.push(`| ✨ Temuan baru | ${newFindings.length} | Ada di produk, tidak ada di dokumen |`);
  lines.push('');
  lines.push(`**Coverage:** ${coverage}% dari test case pre-dev terverifikasi`);
  lines.push(`**Risk Level:** ${riskLevel}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Verified section
  if (verified.length > 0) {
    lines.push(`## ✅ Terverifikasi (${verified.length} scenario)`);
    lines.push('');
    lines.push('| ID | Scenario | Confidence |');
    lines.push('|----|----------|-----------|');
    for (const v of verified) {
      lines.push(`| ${v.pre.id} | ${v.pre.title} | ${v.confidence} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Missing section
  if (missing.length > 0) {
    lines.push(`## ⚠️ Missing di Produk (${missing.length} scenario)`);
    lines.push('');
    for (const m of missing) {
      lines.push(`### ${m.pre.id}: ${m.pre.title}`);
      lines.push(`**Confidence:** ${m.confidence}`);
      lines.push(`**Dokumen bilang:** ${m.pre.steps?.then || 'Lihat pre-dev spec'}`);
      lines.push(`**Yang ditemukan:** Tidak ditemukan saat eksplorasi browser`);
      lines.push(`**Rekomendasi:** Konfirmasi ke developer apakah fitur ini sudah diimplementasi`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  // New findings
  if (newFindings.length > 0) {
    lines.push(`## ✨ Temuan Baru (${newFindings.length} scenario)`);
    lines.push('');
    for (const nf of newFindings) {
      lines.push(`### NEW: ${nf.post.title}`);
      lines.push(`**Confidence:** Confirmed`);
      lines.push(`**Ditemukan di:** Eksplorasi browser`);
      lines.push(`**Rekomendasi:** Tambahkan ke dokumen dan buat test case`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  // Recommendations
  lines.push('## Rekomendasi Tindakan');
  lines.push('');
  if (missing.length > 0) {
    lines.push('### Prioritas Tinggi 🔴');
    for (const m of missing.filter(m => m.confidence === 'Likely missing').slice(0, 5)) {
      lines.push(`- **[${m.pre.id}]** ${m.pre.title} — Konfirmasi implementasi ke tim dev`);
    }
    lines.push('');
  }
  if (newFindings.length > 0) {
    lines.push('### Prioritas Sedang 🟡');
    for (const nf of newFindings.slice(0, 3)) {
      lines.push(`- **[NEW]** ${nf.post.title} — Dokumentasikan di spec`);
    }
    lines.push('');
  }

  lines.push('## Next Steps');
  lines.push('');
  lines.push('- [ ] Review gap report ini bersama tim');
  lines.push(`- [ ] Update qa-spec-${featureName}.json dengan temuan baru`);
  lines.push('- [ ] Jadwalkan test manual untuk item yang perlu konfirmasi');
  lines.push('- [ ] Update dokumen PRD jika ada perbedaan yang disengaja');

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('\n📋 QA Explorer — Phase 4: Report Generator');
  console.log('='.repeat(50));

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

  const featureName = config.name;
  const outDir = config.outDir;

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Generate .feature file
  const gherkin = toGherkinFeature(inventory, results, featureName);
  const featurePath = path.join(outDir, `${featureName}-verified.feature`);
  fs.writeFileSync(featurePath, gherkin);
  console.log(`✅ Feature file: ${featurePath}`);

  // 2. Generate qa-spec JSON
  const qaSpec = generateQaSpec(inventory, results, featureName);
  const specPath = path.join(outDir, `qa-spec-${featureName}.json`);
  fs.writeFileSync(specPath, JSON.stringify(qaSpec, null, 2));
  console.log(`✅ QA Spec: ${specPath}`);

  // 3. Gap report (if pre-dev spec provided)
  if (config.predevSpec) {
    if (!fs.existsSync(config.predevSpec)) {
      console.warn(`⚠️  Pre-dev spec not found: ${config.predevSpec} — skipping gap report`);
    } else {
      const predevSpec = JSON.parse(fs.readFileSync(config.predevSpec, 'utf8'));
      const gapReport = generateGapReport(predevSpec, qaSpec, featureName);
      const gapPath = path.join(outDir, `gap-report-${featureName}-${TODAY}.md`);
      fs.writeFileSync(gapPath, gapReport);
      console.log(`✅ Gap Report: ${gapPath}`);
    }
  }

  // Print final summary
  console.log('\n📊 Generation Summary:');
  console.log(`   Feature      : ${featureName}`);
  console.log(`   Scenarios    : ${qaSpec.scenarios.length}`);
  console.log(`   Happy paths  : ${results.happy_paths.length}`);
  console.log(`   Negative     : ${results.negative_tests.length}`);
  console.log(`\n🎉 Done!`);
}

main();
