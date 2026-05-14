# Context Handoff — qa-skills / qa-explorer

> Copy-paste dokumen ini ke sesi Claude/Cowork baru untuk melanjutkan pengembangan skill.

---

## Apa yang Sudah Dibangun

Kami sudah membangun **qa-skills** — sebuah custom AI skill repository yang compatible dengan Claude Code, Cowork, OpenCode, VSCode, dan Cursor.

Skill utamanya bernama **`qa-explorer`** — skill QA testing dengan tiga mode:

| Mode | Input | Output |
|---|---|---|
| Mode 1 — Pre-Dev | PRD / dokumen / user story | Test case `@unverified` (Gherkin) + `qa-spec-*.json` |
| Mode 2 — Post-Dev | URL produk | Test case `@verified` dari eksplorasi browser + gap report otomatis |
| Mode 3 — Gap Only | 2 file test case | `gap-report-*.md` dengan status FOUND/MISSING/DIFFERENT/NEW |

---

## Lokasi File

Semua file ada di folder yang sudah dipilih user: `C:\FIKY\qa\qa-agent\qa-skills\`

```
qa-skills/
├── BLUEPRINT.md              ← arsitektur lengkap skill ini
├── CONTEXT-HANDOFF.md        ← file ini
├── README.md                 ← panduan penggunaan & instalasi
├── install.ps1               ← installer Windows (PowerShell)
│
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
│
└── skills/
    └── qa-explorer/
        ├── SKILL.md                    ← orchestrator (dimuat Claude pertama kali)
        ├── references/
        │   ├── mode-predev.md          ← instruksi Mode 1 (6 langkah)
        │   ├── mode-postdev.md         ← instruksi Mode 2 (7 fase + SPA handling)
        │   └── output-format.md        ← template semua format output
        └── scripts/                    ← fallback bila MCP Playwright tidak ada
            ├── package.json
            ├── inventory.js            ← scan elemen & halaman
            ├── happy-path.js           ← simulasi happy path + negative test
            ├── reporter.js             ← generate semua format (Gherkin, Table, Excel)
            └── xlsx-generator.js       ← ExcelJS-based, 5-section output
```

---

## Keputusan Desain Penting

**Format output berbeda per tipe file:**

**Format Excel (--format xlsx)** — 3 sections dalam 1 sheet:
1. TEST CASE INFORMATION — metadata (Feature Name, Created By, Date, dll)
2. TEST CASE STATUS — COUNTIF otomatis per status
3. TEST CASE TABLE — kolom: `TC ID | Scenario | Summary | Priority | Pre-Conditions | Test Step | Test Data | Expected Result | Actual Result | Test Case Status | Automation Status | Notes`

**Format Word (.docx) dan Markdown (.md)** — 5 sections dengan numbered list:
1. TEST CASE INFORMATION — metadata
2. SOURCE — asal test case (PRD / URL / dll)
3. APPLICATION OVERVIEW — deskripsi singkat aplikasi
4. TEST CASE STATUS — hitungan manual per status
5. TEST CASE LIST — daftar test case bernomor (1, 2, 3, ...)

**TC ID format:** TC0001, TC0002 (4 digit zero-padded)

**Priority:** P1 - High / P2 - Medium / P3 - Low  
**TC Status:** untested / passed / onprogress / blocked / failed / retest  
**Automation Status:** manual only / to be automated / in progress / automated

**State management:** File `qa-spec-[nama].json` menjadi jembatan antar sesi. Mode 1 menyimpannya, Mode 2 mendeteksinya otomatis dan menjalankan gap analysis.

**Browser automation hybrid:**
- Primary: MCP Playwright (`mcp__playwright__*` atau `mcp__executeautomation-playwright-mcp-server__*`)
- Fallback: bundled scripts via `node scripts/inventory.js --url <URL>`

**Progressive disclosure:** `SKILL.md` ringkas (dimuat selalu), detail ada di `references/*.md` (dimuat hanya ketika mode aktif).

---

## Status Saat Ini

✅ Sudah selesai:
- `SKILL.md` — mode detection, format selection prompt, browser automation section (v1.1.0)
- `references/mode-predev.md` — 6-langkah workflow Mode 1 (sudah include format selection)
- `references/mode-postdev.md` — 7-fase workflow Mode 2 (termasuk auth, SPA handling)
- `references/output-format.md` — template semua format: Excel 3-section, Word/MD 5-section, Gap Report
- `scripts/inventory.js` — scan elemen interaktif & crawl halaman
- `scripts/happy-path.js` — simulasi flow + negative testing
- `scripts/reporter.js` — generate Gherkin, Markdown 5-section numbered list, gap report (v1.1.0)
- `scripts/xlsx-generator.js` — ExcelJS 3-section (Info + Status + Table), COUNTIF, dropdown, color coding (v1.1.0)
- `scripts/package.json` — dependency config
- `README.md` — dokumentasi penggunaan & instalasi
- `install.ps1` — PowerShell installer (auto-detect skills dir, cek MCP Playwright)
- `BLUEPRINT.md` — arsitektur & design decisions lengkap

⚠️ Catatan instalasi:
- Skill BELUM terinstall secara otomatis ke Claude/Cowork karena direktori `.claude/skills` bersifat read-only di sandbox
- User perlu menjalankan `install.ps1` secara manual dari Windows PowerShell terminal
- Setelah install, restart Claude Code / Cowork agar skill aktif

---

## Cara Melanjutkan

Untuk update atau extend skill ini, buka folder `C:\FIKY\qa\qa-agent\qa-skills\` dan sebutkan apa yang ingin diubah. Contoh:

```
"Saya ingin update qa-explorer skill di folder C:\FIKY\qa\qa-agent\qa-skills\.
Baca BLUEPRINT.md dan SKILL.md dulu, lalu [permintaan spesifik kamu]."
```

### Contoh permintaan lanjutan yang sudah direncanakan:

- Tambahkan format `--format playwright` (generate TypeScript .spec.ts yang langsung runnable)
- Tambahkan API testing mode (test REST endpoint, bukan hanya UI)
- Integrasi dengan Jira/Linear untuk push test case
- Tambahkan video recording di Mode 2
- Multi-page crawl lebih dalam (saat ini max 10 halaman shallow)

---

## File yang Paling Sering Perlu Diupdate

| File | Update ketika... |
|---|---|
| `SKILL.md` | Tambah mode baru, format baru, atau kata kunci trigger |
| `references/output-format.md` | Ubah struktur Excel, tambah kolom, ubah template |
| `references/mode-postdev.md` | Ubah alur eksplorasi browser, tambah fase baru |
| `references/mode-predev.md` | Ubah analisis dokumen, tambah jenis tag |
| `scripts/xlsx-generator.js` | Ubah styling Excel, tambah sheet, formula baru |
| `scripts/reporter.js` | Ubah logika priority/automation status, tambah format output |
| `install.ps1` | Tambah skill baru, ubah target directory detection |

---

## Perintah Berguna

```bash
# Cek syntax semua scripts
node --check scripts/inventory.js
node --check scripts/happy-path.js
node --check scripts/reporter.js
node --check scripts/xlsx-generator.js

# Test reporter langsung
node scripts/reporter.js --help
node scripts/reporter.js --format xlsx --name login

# Install dependencies scripts
cd skills/qa-explorer/scripts && npm install
```

---

*Last updated: 2026-05-14 | Skill version: 1.1.0*
