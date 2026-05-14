# Mode 1 — Pre-Dev: Dokumen → Test Case @unverified

Mode ini digunakan ketika user memberikan dokumen (PRD, User Story, BRD, FSD, SRS, atau deskripsi fitur) **tanpa URL produk**. Kamu generate test case berdasarkan analisis dokumen saja — TANPA melihat atau membuka produk nyata.

Semua output diberi tag `@unverified` untuk menandai bahwa test case ini belum divalidasi terhadap implementasi nyata.

---

## Langkah-Langkah

### Langkah 1 — Konfirmasi Nama Fitur dan Format Output

Sebelum memulai, tanyakan (atau ekstrak dari dokumen):

**A. Nama Fitur**  
Jika nama fitur bisa diinfer dari dokumen, konfirmasi dulu ke user:
> "Saya akan buat test case untuk fitur **[nama]**. Benar?"

**B. Format Output** *(WAJIB — jika belum disebutkan user)*  
Tanyakan format output yang diinginkan:

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

**Jangan lanjut ke Langkah 2 sebelum format dipilih.**

---

### Langkah 2 — Analisis Dokumen

Baca seluruh dokumen yang diberikan dan ekstrak:

#### A. Fitur & Sub-Fitur
Identifikasi semua fungsionalitas yang disebutkan. Untuk setiap fitur, catat:
- Nama fitur
- Aktor/user yang terlibat
- Pre-kondisi
- Flow utama (happy path)
- Flow alternatif
- Kondisi error yang disebutkan

#### B. Business Rules
Kumpulkan semua aturan bisnis yang eksplisit maupun implisit:
- Validasi input (format, panjang, wajib/opsional)
- Batasan (limit, quota, permission)
- Kalkulasi atau transformasi data
- Kondisi yang memicu behavior tertentu

#### C. Acceptance Criteria
Jika dokumen punya AC, ekstrak langsung. Jika tidak ada, derive dari deskripsi fitur.

#### D. Edge Cases & Ambiguitas
Tandai hal-hal yang:
- Tidak dijelaskan secara eksplisit di dokumen → tandai sebagai `@assumption`
- Berpotensi menjadi edge case meski tidak disebutkan
- Ambigu atau bisa diinterpretasikan berbeda

---

### Langkah 3 — Susun Test Scenarios

Untuk setiap fitur, buat scenario yang mencakup:

#### Priority 1 — Happy Path
Alur sukses utama yang paling sering dilakukan user.

#### Priority 2 — Negative Tests
- Input tidak valid (format salah, kosong, terlalu panjang/pendek)
- Permission denied / unauthorized
- Resource tidak ada / not found
- Batas/limit tercapai

#### Priority 3 — Edge Cases
- Boundary values (nilai tepat di batas)
- Concurrent actions (jika relevan dari dokumen)
- State transitions (status A → B → C)

#### Priority 4 — Business Rule Validation
Setiap business rule yang ditemukan di Langkah 2B harus punya minimal 1 test scenario.

---

### Langkah 4 — Generate Output Sesuai Format yang Dipilih

Gunakan format yang dipilih user di Langkah 1:

#### Jika Excel (`.xlsx`):
Generate test case dalam format **3 sections**:
1. **TEST CASE INFORMATION** — metadata dokumen
2. **TEST CASE STATUS** — ringkasan status (semua `untested` di awal)
3. **TEST CASE TABLE** — tabel dengan kolom: TC ID | Scenario | Summary | Priority | Pre-Conditions | Test Step | Test Data | Expected Result | Actual Result | Test Case Status | Automation Status | Notes

Lihat template lengkap di `output-format.md#excel-format`.

#### Jika Word (`.docx`) atau Markdown (`.md`):
Generate test case dalam format **5 sections**:
1. **TEST CASE INFORMATION** — metadata dokumen
2. **SOURCE** — asal test case (nama dokumen PRD, mode pre-dev @unverified)
3. **APPLICATION OVERVIEW** — deskripsi aplikasi yang ditest (dari dokumen)
4. **TEST CASE STATUS** — ringkasan status (semua `untested` di awal)
5. **TEST CASE LIST** — daftar test case bernomor (1, 2, 3, ...)

Lihat template lengkap di `output-format.md#md-word-format`.

> Untuk Word (`.docx`), gunakan skill `docx` untuk membuat file Word yang proper.

#### Format TC ID:
`TC0001`, `TC0002`, ... (4 digit, auto-increment)

#### Tag untuk qa-spec JSON (internal):
```
@unverified @pre-dev @happy-path / @negative / @edge-case / @assumption
```

---

### Langkah 5 — Simpan qa-spec JSON

Setelah generate test case, **wajib simpan** file `qa-spec-[nama].json` untuk keperluan gap analysis di sesi berikutnya (Mode 2).

Format file:

```json
{
  "feature": "[nama-fitur]",
  "source": "pre-dev",
  "created_at": "[ISO timestamp]",
  "document_source": "[nama file atau deskripsi singkat dokumen]",
  "output_format": "[xlsx / docx / md]",
  "scenarios": [
    {
      "id": "TC0001",
      "title": "[judul scenario]",
      "tags": ["happy-path"],
      "priority": "P1 - High",
      "steps": {
        "given": "[kondisi awal]",
        "when": "[aksi]",
        "then": "[hasil]"
      },
      "business_rule": "[aturan bisnis yang diuji, jika ada]",
      "assumption": false,
      "notes": ""
    }
  ],
  "assumptions": [
    "[daftar asumsi yang dibuat karena tidak ada di dokumen]"
  ],
  "open_questions": [
    "[hal-hal yang ambigu atau perlu dikonfirmasi ke tim]"
  ]
}
```

Naming: `qa-spec-[nama-fitur].json` di direktori kerja saat ini.

---

### Langkah 6 — Summary Output

Setelah semua selesai, tampilkan summary kepada user:

```
✅ Mode 1 (Pre-Dev) selesai

📄 Dokumen dianalisis: [nama/deskripsi dokumen]
📊 Format output: [Excel / Word / Markdown]
🔢 Total scenarios: [N]
   • Happy path: [N]
   • Negative: [N]  
   • Edge case: [N]
   • Asumsi: [N]

📁 File yang dibuat:
   • [nama]-tc.[xlsx/docx/md]
   • qa-spec-[nama].json

⚠️  Asumsi yang dibuat (perlu konfirmasi):
   1. [asumsi 1]
   2. [asumsi 2]

❓ Open questions untuk tim:
   1. [pertanyaan 1]

💡 Selanjutnya: Jalankan Mode 2 dengan URL produk untuk validasi dan gap report otomatis.
```

---

## Catatan Penting

1. **Jangan buka browser atau akses URL apapun** di Mode 1. Test case murni dari analisis dokumen.
2. **Tandai semua asumsi** — jangan diam-diam mengasumsikan behavior yang tidak ada di dokumen.
3. **Gunakan bahasa dokumen** — jika dokumen dalam Bahasa Indonesia, tulis test case dalam BI. Jika Inggris, pakai Inggris.
4. **ID test case harus unik** — format `TC0001`, `TC0002`, dst (4 digit).
5. **Simpan qa-spec JSON** — ini kunci gap analysis di sesi berikutnya.
6. **Format output menentukan struktur file** — Excel: 3 sections, Word/MD: 5 sections dengan numbered list.
