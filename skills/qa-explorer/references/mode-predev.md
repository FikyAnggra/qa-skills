# Mode 1 — Pre-Dev: Dokumen → Test Case @unverified

Mode ini digunakan ketika user memberikan dokumen (PRD, User Story, BRD, FSD, SRS, atau deskripsi fitur) **tanpa URL produk**. Kamu generate test case berdasarkan analisis dokumen saja — TANPA melihat atau membuka produk nyata.

Semua output diberi tag `@unverified` untuk menandai bahwa test case ini belum divalidasi terhadap implementasi nyata.

---

## Langkah-Langkah

### Langkah 1 — Konfirmasi Nama Fitur

Sebelum memulai, tanyakan (atau ekstrak dari dokumen):
- **Nama fitur** yang akan dijadikan basis nama file (misal: `login`, `checkout`, `user-registration`)
- **Format output** yang diinginkan (default: Gherkin; alternatif: table, steps, playwright)

Jika nama fitur bisa diinfer dari dokumen, konfirmasi dulu ke user:
> "Saya akan buat test case untuk fitur **[nama]**. Benar?"

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

### Langkah 4 — Tulis Gherkin (Format Default)

Gunakan template dari `output-format.md`. Penting:

```gherkin
@unverified @pre-dev
Feature: [Nama Fitur dari Dokumen]
  Sebagai [aktor]
  Saya ingin [tujuan]
  Sehingga [nilai bisnis]

  Background:
    Given [pre-kondisi yang berlaku untuk semua scenario]

  @happy-path
  Scenario: [Deskripsi singkat alur sukses]
    Given [kondisi awal]
    When [aksi user]
    Then [hasil yang diharapkan]
    And [hasil tambahan jika ada]

  @negative
  Scenario: [Deskripsi kondisi gagal]
    Given [kondisi awal]
    When [aksi user dengan input tidak valid]
    Then [pesan error atau behavior yang diharapkan]

  @edge-case @assumption
  Scenario: [Deskripsi edge case — ditandai assumption jika tidak eksplisit di dok]
    Given [kondisi awal]
    When [kondisi batas]
    Then [hasil yang diasumsikan]
```

**Tag yang digunakan:**
| Tag | Makna |
|---|---|
| `@unverified` | Belum divalidasi ke produk nyata |
| `@pre-dev` | Dibuat dari dokumen (Mode 1) |
| `@happy-path` | Alur sukses utama |
| `@negative` | Test kondisi gagal/error |
| `@edge-case` | Kondisi batas atau tidak umum |
| `@assumption` | Asumsi karena tidak ada di dokumen |
| `@high` `@medium` `@low` | Priority test case |

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
  "scenarios": [
    {
      "id": "TC-001",
      "title": "[judul scenario]",
      "tags": ["happy-path"],
      "priority": "high",
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
🔢 Total scenarios: [N]
   • Happy path: [N]
   • Negative: [N]  
   • Edge case: [N]
   • Asumsi: [N]

📁 File yang dibuat:
   • [nama]-unverified.feature
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
3. **Gunakan bahasa dokumen** — jika dokumen dalam Bahasa Indonesia, tulis Gherkin dalam BI. Jika Inggris, pakai Inggris.
4. **ID test case harus unik** — format `TC-[nomor 3 digit]` (TC-001, TC-002, dst).
5. **Simpan qa-spec JSON** — ini kunci gap analysis di sesi berikutnya.
