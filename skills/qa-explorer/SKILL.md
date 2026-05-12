---
name: qa-explorer
version: 1.0.0
description: |
  QA Testing skill dengan tiga mode: (1) Pre-dev — analisis PRD/dokumen dan generate test case @unverified TANPA melihat produk nyata; (2) Post-dev — buka browser, navigasi URL, eksplorasi klik elemen, lalu generate test case @verified berdasarkan perilaku produk nyata; (3) Gap only — bandingkan dua file test case dan buat gap report. Gunakan skill ini ketika user menyebut: test case, test plan, QA, testing, buat skenario test, exploratory testing, regression test, smoke test, happy path, negative test, edge case, generate test, analisis PRD untuk testing, verifikasi fitur, cek UI, coba login, buka url dan test, browser testing, playwright, cek flow, alur user, user journey, acceptance criteria, BDD, gherkin, given when then, qa-explorer, explore app, jelajahi aplikasi, gap test, test coverage, missing test, bandingkan test case.
author: tim-kamu
compatibility:
  - claude-code
  - cowork
  - opencode
  - vscode
  - cursor
allowed-tools:
  - Bash
  - Read
  - Write
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_click
  - mcp__playwright__browser_fill
  - mcp__playwright__browser_screenshot
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_wait_for
  - mcp__playwright__browser_evaluate
  - mcp__playwright__browser_select_option
  - mcp__playwright__browser_hover
  - mcp__playwright__browser_scroll
  - mcp__playwright__browser_network_requests
  - mcp__playwright__browser_console_messages
  - mcp__playwright__browser_close
  - mcp__executeautomation-playwright-mcp-server__playwright_navigate
  - mcp__executeautomation-playwright-mcp-server__playwright_click
  - mcp__executeautomation-playwright-mcp-server__playwright_fill
  - mcp__executeautomation-playwright-mcp-server__playwright_screenshot
  - mcp__executeautomation-playwright-mcp-server__playwright_get_visible_text
  - mcp__executeautomation-playwright-mcp-server__playwright_get_visible_html
  - mcp__executeautomation-playwright-mcp-server__playwright_evaluate
  - mcp__executeautomation-playwright-mcp-server__playwright_hover
  - mcp__executeautomation-playwright-mcp-server__playwright_press_key
  - mcp__executeautomation-playwright-mcp-server__playwright_select
  - mcp__executeautomation-playwright-mcp-server__playwright_console_logs
  - mcp__executeautomation-playwright-mcp-server__playwright_close
metadata:
  tags:
    - qa
    - testing
    - browser-automation
    - test-case-generator
    - exploratory-testing
    - gherkin
    - bdd
  output-files:
    - "*.feature"
    - "qa-spec-*.json"
    - "gap-report-*.md"
---

# QA Explorer

Skill untuk generate test case secara cerdas — baik dari dokumen (pre-dev) maupun dari eksplorasi browser langsung (post-dev).

## Deteksi Mode

Tentukan mode berdasarkan input user:

| Skenario Input | Mode |
|---|---|
| User memberikan PRD / user story / dokumen / teks spesifikasi TANPA URL | **Mode 1 — Pre-Dev** |
| User memberikan URL (dengan atau tanpa dokumen) | **Mode 2 — Post-Dev** |
| User memberikan 2 file test case / minta "gap report" / "bandingkan" | **Mode 3 — Gap Only** |
| User memberikan URL DAN sudah ada `qa-spec-*.json` di folder | **Mode 2 + auto Gap Report** |
| User tidak memberikan apa-apa / ambigu | Tanya: "Apakah kamu punya dokumen PRD, URL aplikasi, atau keduanya?" |

> **Catatan penting:** Jika user hanya menyebut fitur/alur tanpa dokumen dan tanpa URL (misal: "buat test case untuk login"), tanyakan dulu apakah ada dokumen atau URL. Jangan berasumsi.

---

## Mode 1 — Pre-Dev (Dokumen → Test Case @unverified)

Aktifkan ketika input berupa dokumen/teks spesifikasi tanpa URL.

Baca instruksi lengkap dari:
```
@references/mode-predev.md
```

**Output:** File `.feature` dengan tag `@unverified` + file `qa-spec-[nama].json`.

---

## Mode 2 — Post-Dev (URL → Eksplorasi Browser → Test Case @verified)

Aktifkan ketika input mengandung URL yang bisa dibuka browser.

Baca instruksi lengkap dari:
```
@references/mode-postdev.md
```

**Output:** File `.feature` dengan tag `@verified` + update/buat `qa-spec-[nama].json`.  
**Bonus otomatis:** Jika ada `qa-spec-*.json` dari Mode 1, otomatis tambahkan gap report.

---

## Mode 3 — Gap Only (Bandingkan 2 Test Case)

Aktifkan ketika:
- User minta "gap report", "bandingkan test case", atau "test mana yang hilang"
- User attach/sebutkan 2 file test case yang berbeda

Baca instruksi lengkap dari:
```
@references/output-format.md#gap-report
```

**Output:** File `gap-report-[nama]-[tanggal].md`.

---

## Format Output Default

Semua test case ditulis dalam format **Gherkin (Given-When-Then)** kecuali user minta format lain.

Format yang didukung:

| Flag | Format | Output | Kapan digunakan |
|------|--------|--------|-----------------|
| *(default)* | Gherkin / BDD | `*.feature` | CI/CD, Cucumber, BDD framework |
| `--format table` | **Tabel Markdown** | `*.md` | Review di chat, dokumentasi ringan |
| `--format xlsx` | **Excel (5 sections)** | `*.xlsx` | **Manajemen TC profesional, tracking status, referensi automation** |
| `--format steps` | Plain Steps | `*.md` | Tim non-technical, manual testing sederhana |
| `--format playwright` | Playwright TypeScript | `*.spec.ts` | Langsung jadi script automation |

> **Rekomendasi:** Gunakan `--format xlsx` untuk output yang paling lengkap — mencakup Test Case Information, Source, Application Overview, Status Summary, dan Test Case Table dalam satu file Excel yang bisa langsung digunakan sebagai dokumen QA resmi.

### Format Excel (`--format xlsx`) — Struktur Lengkap

Output Excel terdiri dari 5 sections berurutan dalam 1 sheet:

```
1. TEST CASE INFORMATION  ← metadata dokumen (Feature Name, Created By, dll)
2. SOURCE                 ← asal test case (PRD / URL / dll)
3. APPLICATION OVERVIEW   ← deskripsi singkat aplikasi
4. TEST CASE STATUS       ← ringkasan status (auto-count via COUNTIF)
5. TEST CASE TABLE        ← tabel utama semua test case
```

**Kolom Test Case Table:**
`TC ID` | `Scenario` | `Summary` | `Priority` | `Pre-Conditions` | `Test Step` | `Test Data` | `Expected Result` | `Actual Result` | `Test Case Status` | `Automation Status` | `Notes`

**TC ID format:** `TC0001`, `TC0002`, ... (4 digit, auto-increment)  
**Priority:** `P1 - High` / `P2 - Medium` / `P3 - Low`  
**Test Case Status:** `untested` (default) / `passed` / `onprogress` / `blocked` / `failed` / `retest`  
**Automation Status:** ditentukan berdasarkan **analisis** — tidak semua TC perlu automation:
- `automated` — sudah ada script
- `to be automated` — kandidat automation (flow repetitif, regression)
- `in progress` — script sedang dibuat
- `manual only` — tidak layak diotomasi (visual, eksternal sistem, jarang dirun)

Lihat template lengkap dan panduan penentuan status di:
```
@references/output-format.md#table-format
```

---

## Browser Automation

Skill ini mendukung dua mekanisme browser secara hybrid:

### MCP Playwright (Prioritas Utama)
Jika MCP Playwright tersedia (terdeteksi dari tool `mcp__playwright__*` atau `mcp__executeautomation-playwright-mcp-server__*`), gunakan MCP untuk:
- Real-time navigation dan interaksi
- Screenshot langsung
- Network request inspection
- Console log monitoring

### Bundled Scripts (Fallback)
Jika MCP tidak tersedia, gunakan scripts di folder `scripts/`:
```bash
# Install dependencies dulu
cd skills/qa-explorer/scripts && npm install

# Phase 1: Inventarisasi elemen
node scripts/inventory.js --url <URL> [--auth-cookie <cookie>]

# Phase 2 & 3: Happy path + negative tests  
node scripts/happy-path.js --url <URL> --inventory inventory-output.json

# Phase 4: Generate laporan
node scripts/reporter.js --inventory inventory-output.json --results results.json --name <feature-name>
```

---

## State Management

Skill ini menggunakan file `qa-spec-[nama].json` untuk menyimpan state antar sesi:

```
qa-spec-login.json        ← dari Mode 1 (pre-dev)
login.feature             ← test case @unverified
gap-report-login-2026.md  ← dari Mode 2 atau Mode 3
```

Deteksi otomatis:
1. Mode 2 dijalankan → cek apakah ada `qa-spec-*.json` di direktori kerja
2. Jika ada → otomatis lakukan gap analysis setelah eksplorasi
3. Jika tidak ada → simpan hasil sebagai `qa-spec-[nama].json` baru

---

## Naming Convention

Gunakan nama fitur sebagai basis nama file:
- `qa-spec-[fitur].json` (misal: `qa-spec-checkout.json`)
- `[fitur]-unverified.feature` (misal: `checkout-unverified.feature`)
- `[fitur]-verified.feature` (misal: `checkout-verified.feature`)
- `gap-report-[fitur]-[YYYY-MM-DD].md`

Tanya user untuk nama fitur jika tidak jelas dari konteks.
