# qa-skills

> Kumpulan QA Testing skills untuk Claude Code, Cowork, dan AI coding tools lainnya.

---

## Skills Available

| Skill | Versi | Deskripsi |
|-------|-------|-----------|
| **qa-explorer** | 1.0.0 | Generate test case dari PRD (pre-dev) atau eksplorasi browser langsung (post-dev). Support gap analysis otomatis antar sesi. |

---

## Quick Install

```bash
# Clone repository
git clone https://github.com/tim-kamu/qa-skills.git
cd qa-skills

# Install skill ke Claude Code / Cowork
node bin/install.js --skill qa-explorer

# Atau dengan npm (setelah publish)
npx qa-skills install qa-explorer
```

Installer akan otomatis:
1. Menyalin file skill ke `~/.claude/skills/qa-explorer/`
2. Mendeteksi apakah MCP Playwright sudah terpasang
3. Menawarkan untuk install MCP jika belum ada

---

## qa-explorer

Skill testing yang bisa bekerja dalam **3 mode** berbeda.

### Mode 1 — Pre-Dev (Dokumen → Test Case @unverified)

Berikan dokumen PRD / user story / spesifikasi. Skill akan menganalisis dokumen dan generate test case **tanpa membuka browser**.

**Kapan digunakan:** Sebelum produk selesai dibangun, saat tahap requirement / design review.

**Trigger di Claude:**
```
Buat test case dari PRD ini:
[paste isi PRD atau attach file]
```

**Output:**
- `[fitur]-unverified.feature` — Gherkin test cases dengan tag @unverified
- `qa-spec-[fitur].json` — State file untuk gap analysis di sesi berikutnya

---

### Mode 2 — Post-Dev (URL → Eksplorasi Browser → Test Case @verified)

Berikan URL aplikasi. Skill akan **membuka browser, klik elemen, jelajahi flow**, lalu generate test case berdasarkan apa yang benar-benar ada di produk.

**Kapan digunakan:** Setelah produk selesai di-develop, untuk validasi dan regression testing.

**Trigger di Claude:**
```
Explore dan buat test case untuk https://app.example.com
```

**Dengan login:**
```
Explore https://app.example.com, login dengan:
- email: qa@example.com
- password: TestPass123
```

**Output:**
- `[fitur]-verified.feature` — Gherkin test cases dengan tag @verified
- `qa-spec-[fitur].json` — State file (update atau buat baru)
- `gap-report-[fitur]-[tanggal].md` — Otomatis jika ada qa-spec dari Mode 1

---

### Mode 3 — Gap Only (Bandingkan 2 Test Case)

Berikan 2 file test case. Skill akan membandingkan dan membuat gap report dengan confidence level.

**Trigger di Claude:**
```
Bandingkan gap antara file test case ini:
[attach/paste file 1]
[attach/paste file 2]
```

**Output:**
- `gap-report-[fitur]-[tanggal].md` — Laporan gap dengan confidence level

---

### Gap Analysis Otomatis

Jika kamu jalankan Mode 1 dulu kemudian Mode 2 di sesi berbeda, gap report dibuat **otomatis**:

```
Sesi 1 (pre-dev):
  Input: PRD login
  Output: login-unverified.feature + qa-spec-login.json

Sesi 2 (post-dev):
  Input: https://app.example.com/login
  Skill deteksi: qa-spec-login.json ada di folder
  Output: login-verified.feature + gap-report-login-2026-05-12.md  ← otomatis!
```

---

## Format Output

| Flag | Format | File | Keterangan |
|------|--------|------|------------|
| *(default)* | Gherkin / BDD | `*.feature` | Untuk Cucumber, CI/CD |
| `--format table` | Tabel Markdown | `*.md` | Review di chat |
| `--format xlsx` | **Excel (5 sections)** | `*.xlsx` | Dokumen QA resmi |
| `--format steps` | Plain Steps | `*.md` | Tim non-technical |
| `--format playwright` | Playwright TypeScript | `*.spec.ts` | Script automation |

### Struktur Output Excel (`--format xlsx`)

File `.xlsx` mengandung 5 sections berurutan dalam 1 sheet:

```
┌──────────────────────────────────────────┐
│  1. TEST CASE INFORMATION                │
│     Feature Name, Created By, dll        │
├──────────────────────────────────────────┤
│  2. SOURCE                               │
│     Asal TC: PRD / URL / Manual Input    │
├──────────────────────────────────────────┤
│  3. APPLICATION OVERVIEW                 │
│     Nama app, URL, platform, environment │
├──────────────────────────────────────────┤
│  4. TEST CASE STATUS                     │
│     Passed / Untested / Failed / dll     │
│     (auto-update via COUNTIF formula)    │
├──────────────────────────────────────────┤
│  5. TEST CASE TABLE                      │
│     TC ID | Scenario | Summary |         │
│     Priority | Steps | Expected |        │
│     Status | Automation Status | Notes   │
└──────────────────────────────────────────┘
```

**Fitur Excel:**
- Dropdown validasi di kolom Test Case Status dan Automation Status
- Formula COUNTIF di Section 4 (angka update otomatis)
- Auto-filter di header tabel
- Color coding per priority dan status
- Freeze panes di header Test Case Table

### Kolom Test Case Table

| Kolom | Format | Keterangan |
|-------|--------|------------|
| TC ID | `TC0001` | Nomor unik 4 digit |
| Scenario | Teks | Nama kelompok / fitur |
| Summary | Teks | Deskripsi apa yang diverifikasi |
| Priority | `P1-High` / `P2-Medium` / `P3-Low` | Berdasarkan analisis |
| Pre-Conditions | Numbered list | Kondisi sebelum test |
| Test Step | Numbered list | Langkah-langkah test |
| Test Data | Key-value | Data yang digunakan |
| Expected Result | Numbered list | Hasil yang diharapkan |
| Actual Result | Teks | Diisi saat eksekusi |
| Test Case Status | `untested` (default) | Pilihan: passed/onprogress/blocked/failed/retest |
| Automation Status | Berdasarkan analisis | manual only / to be automated / in progress / automated |
| Notes | Teks | Catatan tambahan |

---

## Cara Penggunaan

### Via Claude Code / Cowork (Recommended)

Setelah skill terinstall, cukup ketik permintaan ke Claude secara natural:

```
# Mode 1 — dari dokumen
"Buat test case dari PRD berikut: [paste PRD]"
"Analisis user story ini dan generate test scenarios"
"Generate test case untuk fitur checkout ini"

# Mode 2 — dari URL
"Explore https://staging.myapp.com dan buat test case"
"Buka https://app.example.com/login, cek semua flow login"
"Jelajahi aplikasi ini dan generate @verified test cases: https://..."

# Mode 2 dengan format xlsx
"Explore https://app.example.com dan output sebagai Excel"
"Buat test case dari URL ini dalam format tabel xlsx"

# Mode 3 — gap analysis
"Bandingkan gap antara qa-spec-login.json dan login-verified.feature"
"Test mana yang hilang? Bandingkan dua file ini"
```

### Via Bundled Scripts (tanpa Claude)

Jika ingin menjalankan browser exploration secara mandiri:

```bash
cd skills/qa-explorer/scripts
npm install

# Phase 1: Inventarisasi elemen
node inventory.js --url https://app.example.com

# Phase 2 & 3: Happy path + negative tests
node happy-path.js --url https://app.example.com --inventory inventory-output.json

# Phase 4: Generate output
node reporter.js --name login --format xlsx --created-by "Fiky"
# atau: --format table (markdown) | --format gherkin | --format steps

# Full pipeline dalam satu run (Linux/Mac):
URL=https://app.example.com FEATURE=login npm run full-run:xlsx
```

**Dengan autentikasi:**
```bash
# Login via cookie
node inventory.js --url https://app.example.com --auth-cookie "session=abc123; token=xyz"

# Login via Bearer token
node inventory.js --url https://app.example.com --auth-token "eyJhbGci..."
```

---

## MCP Playwright

Skill ini mendukung dua mekanisme browser:

| Mekanisme | Cara kerja | Kecepatan |
|-----------|-----------|-----------|
| **MCP Playwright** *(prioritas)* | Real-time via MCP tools | Cepat |
| **Bundled Scripts** *(fallback)* | Node.js scripts di `scripts/` | Lebih lambat |

**Install MCP Playwright:**
```bash
claude mcp add playwright npx @playwright/mcp@latest
# Restart Claude Code setelah install
```

Atau jalankan installer yang akan otomatis mendeteksi dan menawarkan:
```bash
node bin/install.js
```

---

## Struktur Repository

```
qa-skills/
├── skills/
│   └── qa-explorer/              # Skill utama
│       ├── SKILL.md              # Orchestrator (dibaca Claude)
│       ├── references/
│       │   ├── mode-predev.md    # Instruksi detail Mode 1
│       │   ├── mode-postdev.md   # Instruksi detail Mode 2
│       │   └── output-format.md  # Template semua format output
│       └── scripts/              # Fallback scripts (tanpa MCP)
│           ├── inventory.js      # Phase 1: scan elemen
│           ├── happy-path.js     # Phase 2-3: test flows
│           ├── reporter.js       # Phase 4: generate output
│           ├── xlsx-generator.js # Excel generator
│           └── package.json
├── bin/
│   └── install.js                # Installer dengan MCP detection
├── .claude-plugin/
│   ├── plugin.json               # Plugin metadata
│   └── marketplace.json          # Skills registry
└── package.json
```

---

## Menambahkan Skill Baru

Repository ini dirancang untuk multi-skill. Untuk menambah skill baru:

```bash
mkdir -p skills/nama-skill-baru/references
touch skills/nama-skill-baru/SKILL.md

# Daftarkan di marketplace
# Edit .claude-plugin/marketplace.json
```

Ikuti format SKILL.md yang sama dengan `qa-explorer/SKILL.md`.

---

## Kompatibilitas

| Platform | Status | Cara Aktifkan |
|----------|--------|---------------|
| Claude Code (CLI) | ✅ Supported | `node bin/install.js` |
| Cowork (Desktop) | ✅ Supported | `node bin/install.js` |
| OpenCode | ⚠️ Manual | Copy ke `~/.opencode/skills/` |
| VS Code (Copilot) | ⚠️ Manual | Copy ke `.claude/skills/` di project |
| Cursor | ⚠️ Manual | Copy ke `.cursor/skills/` |

---

## License

MIT — bebas digunakan dan dimodifikasi untuk keperluan tim internal.

---

*Made with Claude for QA Engineers*
