# Mode 2 — Post-Dev: Browser Exploration → Test Case @verified

Mode ini digunakan ketika user memberikan URL. Kamu **membuka browser, menjelajahi aplikasi secara nyata**, lalu generate test case berdasarkan apa yang benar-benar ada di produk.

Output diberi tag `@verified` karena didasarkan pada perilaku produk aktual.

---

## Deteksi MCP Playwright

Sebelum memulai, periksa tool mana yang tersedia:

```
Cek ketersediaan tool:
✓ mcp__playwright__* → gunakan MCP Playwright (prioritas)
✓ mcp__executeautomation-playwright-mcp-server__* → gunakan EA Playwright MCP
✗ Tidak ada MCP → gunakan bundled scripts (fallback)
```

Jika keduanya tidak tersedia, jalankan bundled scripts:
```bash
cd skills/qa-explorer/scripts && npm install
node inventory.js --url <URL>
```

---

## Fase 0 — Persiapan

### Konfirmasi dari User

Tanyakan (atau inferkan dari context):
1. **URL** aplikasi yang akan ditest
2. **Nama fitur** yang difokuskan (atau "semua halaman" jika tidak spesifik)
3. **Apakah butuh login?** → jika ya, minta kredensial test atau cookie
4. **Format output** *(WAJIB — jika belum disebutkan user)*

Untuk format output, tanyakan:

```
Test case-nya mau dalam format apa? Pilihan yang tersedia:

1. 📊 Excel (.xlsx)
   Format tabel profesional — Test Case Information, Test Case Status,
   dan Test Case Table. Cocok untuk tracking & kolaborasi tim QA.

2. 📝 Word (.docx)
   Dokumen formal — Test Case Information, Source, Application Overview,
   Test Case Status, dan Test Case List bernomor. Cocok untuk review stakeholder.

3. 📄 Markdown (.md)
   Format teks ringan — struktur sama seperti Word, cocok untuk developer
   atau dokumentasi di GitHub/Notion.

Ketik angka (1/2/3) atau nama formatnya.
```

> **Exception:** Jika user sudah menyebut format secara eksplisit, langsung gunakan tanpa bertanya.

**Jangan mulai eksplorasi browser sebelum format dipilih.**

### Cek qa-spec Existing

Setelah format dipilih, cek apakah ada file `qa-spec-*.json` di direktori kerja:

```
Ada qa-spec-[nama].json?
├── YA → Muat file, mode ini akan otomatis generate gap report setelah eksplorasi
└── TIDAK → Eksplorasi dan simpan sebagai qa-spec baru
```

Informasikan ke user:
> "Saya menemukan `qa-spec-[nama].json` dari sesi pre-dev. Setelah eksplorasi, saya akan otomatis generate gap report."

---

## Fase 1 — Auth (Jika Diperlukan)

Jika aplikasi memerlukan login, lakukan ini SEBELUM eksplorasi utama:

### Option A: Login dengan Kredensial
```
1. Navigate ke halaman login
2. Fill username/email field
3. Fill password field
4. Click submit/login button
5. Tunggu redirect/dashboard muncul
6. Screenshot untuk konfirmasi berhasil login
```

### Option B: Inject Session Cookie
Jika user memberikan cookie string:
```javascript
// Via MCP Playwright evaluate
document.cookie = "[cookie string dari user]";
```

### Option C: Token di Header
Jika API-based dengan Bearer token, catat untuk digunakan di request headers.

**Penting:** Gunakan akun test, BUKAN akun produksi. Jika tidak ada akun test, informasikan ke user dan lanjutkan eksplorasi bagian publik saja.

---

## Fase 2 — Inventarisasi Elemen (Phase 1 Exploration)

Tujuan: Memetakan semua elemen interaktif dan halaman yang ada.

### 2.1 Screenshot & Initial Scan

```
1. Navigate ke URL target
2. Tunggu halaman fully loaded
3. Screenshot halaman awal
4. Get visible text untuk context
```

### 2.2 Inventarisasi Elemen Interaktif

Scan halaman untuk:
```
□ Form fields (input, select, textarea, checkbox, radio)
□ Buttons (submit, CTA, navigation, icon buttons)
□ Links (navigation, anchor, tab)
□ Modals / dialogs / drawers
□ Dropdown menus
□ Date pickers / file uploads
□ Infinite scroll / pagination
□ Search fields
□ Filter/sort controls
```

### 2.3 Peta Navigasi

Catat semua halaman/view yang bisa diakses:
```json
{
  "pages": [
    { "path": "/", "title": "...", "main_actions": [...] },
    { "path": "/login", "title": "...", "main_actions": [...] }
  ]
}
```

### 2.4 SPA Wait Strategy

Untuk Single Page Application (React, Vue, Angular):
```
Setelah setiap klik navigasi:
1. Tunggu URL berubah ATAU
2. Tunggu loading indicator hilang (spinner, skeleton) ATAU
3. Tunggu elemen baru muncul di DOM (min 1 detik)
4. Jika ragu: tunggu 2 detik setelah network idle
```

---

## Fase 3 — Happy Path Exploration (Phase 2)

Jalankan alur utama yang paling umum dilakukan user:

### Untuk Setiap Flow Utama:

1. **Identifikasi entry point** (halaman/aksi awal)
2. **Ikuti alur sampai completion** (sukses / konfirmasi / hasil)
3. **Screenshot setiap langkah penting**
4. **Catat:**
   - URL di setiap step
   - Elemen yang diklik / diisi
   - Response / feedback dari sistem (toast, modal, redirect)
   - Data yang diperlukan (format field, validasi client-side)

---

## Fase 4 — Negative Testing (Phase 3)

Uji kondisi error dan validasi:

### 4.1 Form Validation
```
□ Submit form kosong → pesan error muncul?
□ Format tidak valid → validasi?
□ Input terlalu panjang → cut off atau error?
□ Required vs optional fields → behavior benar?
```

### 4.2 Authentication/Authorization
```
□ Akses halaman protected tanpa login → redirect ke login?
□ Session expired → behavior?
□ Wrong credentials → pesan error yang tepat?
```

### 4.3 Boundary Testing
```
□ Upload file terlalu besar → error message?
□ Empty state (list kosong) → tampilan?
□ Maximum character limit → pesan atau soft limit?
```

---

## Fase 5 — Generate Output Sesuai Format yang Dipilih

Berdasarkan semua yang ditemukan di Fase 2-4, buat test case sesuai format pilihan user:

#### Jika Excel (`.xlsx`):
Generate test case dalam format **3 sections**:
1. **TEST CASE INFORMATION** — metadata (Feature Name, URL yang dieksplor, Created By, Created Date)
2. **TEST CASE STATUS** — ringkasan status (semua `untested` di awal)
3. **TEST CASE TABLE** — tabel dengan kolom: TC ID | Scenario | Summary | Priority | Pre-Conditions | Test Step | Test Data | Expected Result | Actual Result | Test Case Status | Automation Status | Notes

Lihat template lengkap di `output-format.md#excel-format`.

#### Jika Word (`.docx`) atau Markdown (`.md`):
Generate test case dalam format **5 sections**:
1. **TEST CASE INFORMATION** — metadata (Feature Name, URL, Created By, Created Date)
2. **SOURCE** — Source Type: "URL Exploration", Source Detail: URL yang dieksplor, Mode: "post-dev (@verified)"
3. **APPLICATION OVERVIEW** — nama app, URL, deskripsi dari hasil eksplorasi, platform, environment
4. **TEST CASE STATUS** — ringkasan status (semua `untested` di awal)
5. **TEST CASE LIST** — daftar test case bernomor (1, 2, 3, ...)

Lihat template lengkap di `output-format.md#md-word-format`.

> Untuk Word (`.docx`), gunakan skill `docx` untuk membuat file Word yang proper.

**TC ID format:** `TC0001`, `TC0002`, ... (4 digit, auto-increment)

---

## Fase 6 — Gap Analysis (Jika Ada qa-spec)

Jika di Fase 0 ditemukan `qa-spec-[nama].json` dari Mode 1:

### Bandingkan:
```
qa-spec dari Mode 1 (dokumen)  vs  hasil eksplorasi Mode 2 (nyata)
```

### Untuk Setiap Scenario di qa-spec:
```
FOUND     → Scenario terverifikasi, ada di produk nyata
MISSING   → Scenario ada di dokumen, tidak ada di produk
DIFFERENT → Behavior berbeda dari yang di dokumen
NEW       → Ada di produk, tidak ada di dokumen
```

Lihat format gap report di `output-format.md#gap-report`.

---

## Fase 7 — Update qa-spec & Summary

### Update / Buat qa-spec JSON:

```json
{
  "feature": "[nama]",
  "source": "post-dev",
  "pre_dev_ref": "qa-spec-[nama]-predev.json",
  "explored_at": "[ISO timestamp]",
  "url": "[URL yang dieksplor]",
  "output_format": "[xlsx / docx / md]",
  "scenarios": [...],
  "gap_summary": {
    "total_predev": 12,
    "verified": 8,
    "missing": 2,
    "different": 1,
    "new_findings": 3
  }
}
```

### Summary ke User:

```
✅ Mode 2 (Post-Dev) selesai

🌐 URL yang dieksplor: [URL]
📊 Format output: [Excel / Word / Markdown]
🔐 Auth: [berhasil login / tanpa auth / skip]

📊 Temuan:
   • Halaman/view ditemukan: [N]
   • Elemen interaktif: [N]
   • Happy path flows: [N]
   • Error states diuji: [N]

🔢 Test cases generated: [N]
   • Happy path: [N]
   • Negative: [N]
   • Edge case: [N]

📁 File yang dibuat/diupdate:
   • [nama]-tc.[xlsx/docx/md]
   • qa-spec-[nama].json

[Jika ada gap analysis:]
📋 Gap Report: gap-report-[nama]-[tanggal].md
   • Terverifikasi: [N]
   • Missing dari produk: [N]  ⚠️
   • Berbeda dari dokumen: [N]  ℹ️
   • Temuan baru: [N]  ✨

🔍 Hal yang perlu dicek manual:
   1. [hal yang tidak bisa ditest otomatis]
```

---

## Tips & Troubleshooting

### Halaman Loading Lambat
```
Jika timeout: gunakan explicit wait 5-10 detik setelah navigate
Jika skeleton/spinner: tunggu elemen target visible sebelum screenshot
```

### Login Gagal
```
1. Screenshot state saat ini
2. Informasikan ke user
3. Lanjutkan eksplorasi halaman publik
4. Tandai test yang butuh auth sebagai @needs-auth
```

### Dynamic Content (Data berbeda tiap run)
```
Gunakan placeholder dalam test case:
  - "<nama_produk>" bukan "iPhone 15"
  - "<email_valid>" bukan "test@example.com"
Catat di notes bahwa data bersifat dinamis
```

### Protected/Admin-Only Features
```
Eksplorasi sejauh permission akun test mengizinkan.
Tandai fitur yang tidak bisa diakses sebagai @requires-elevated-permission
```
