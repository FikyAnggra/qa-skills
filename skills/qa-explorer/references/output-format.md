# Output Format Reference

Dokumen ini mendefinisikan semua template output yang digunakan oleh qa-explorer.

**Format yang tersedia:**

| Format | Output File | Sections | Kegunaan |
|--------|-------------|----------|----------|
| **Excel** | `*.xlsx` | 3 sections | Manajemen TC tim, tracking status eksekusi |
| **Word** | `*.docx` | 5 sections | Dokumentasi formal, review stakeholder |
| **Markdown** | `*.md` | 5 sections | Developer docs, GitHub, dokumentasi teknis |

---

## Format Excel (`*.xlsx`) {#excel-format}

Format **manajemen test case** dengan struktur ringkas dan tabel terstruktur.
Terdiri dari **3 sections** berurutan dalam 1 sheet.

### Struktur Output

```
┌─────────────────────────────────┐
│  1. TEST CASE INFORMATION       │
├─────────────────────────────────┤
│  2. TEST CASE STATUS            │
├─────────────────────────────────┤
│  3. TEST CASE TABLE             │
└─────────────────────────────────┘
```

---

### Section 1 — Test Case Information

Metadata dokumen test case. Diisi otomatis dari context yang tersedia.

| Field | Value | Keterangan |
|-------|-------|------------|
| **Feature Name** | `[nama fitur]` | Nama fitur yang ditest |
| **User Facing** | `Yes / No` | Apakah fitur ini terlihat langsung oleh end user |
| **Created By** | `[nama user / default: QA Explorer]` | Pembuat test case |
| **Created Date** | `[tanggal generate]` | Tanggal dibuat |
| **Approve By** | *(kosong — diisi manual)* | Reviewer/approver |
| **Updated By** | *(kosong — diisi saat update)* | Pengupdate terakhir |
| **Updated Date** | *(kosong — diisi saat update)* | Tanggal update terakhir |

> **Cara mengisi "Created By":** Jika user menyebutkan namanya, gunakan nama tersebut. Jika tidak, isi dengan "QA Explorer" sebagai default.

---

### Section 2 — Test Case Status

Ringkasan status eksekusi test case. Di file Excel menggunakan **formula COUNTIF** agar update otomatis saat status di Section 3 berubah.

| Status | Jumlah |
|--------|--------|
| **Test Case Passed** | `[COUNTIF formula]` |
| **Test Case On Progress** | `[COUNTIF formula]` |
| **Test Case Untested** | `[COUNTIF formula]` |
| **Test Case Blocked** | `[COUNTIF formula]` |
| **Test Case Failed** | `[COUNTIF formula]` |
| **Test Case Retest** | `[COUNTIF formula]` |
| **Total Test Case** | `[SUM / total semua]` |

> Nilai awal semua status adalah `untested` sejumlah total test case yang di-generate.

---

### Section 3 — Test Case Table

Tabel utama berisi semua test case. Setiap baris adalah 1 test case.

#### Definisi Kolom

| Kolom | Format | Wajib | Keterangan |
|-------|--------|-------|------------|
| **TC ID** | `TC0001`, `TC0002`, ... | ✓ | Nomor unik 4 digit, auto-increment |
| **Scenario** | Teks singkat | ✓ | Nama skenario / group (misal: "Login", "Checkout") |
| **Summary** | Teks deskriptif | ✓ | Deskripsi lengkap apa yang diverifikasi |
| **Priority** | Lihat tabel priority | ✓ | Level prioritas test case |
| **Pre-Conditions** | Numbered list | ✓ | Kondisi yang harus terpenuhi sebelum test |
| **Test Step** | Numbered list | ✓ | Langkah-langkah menjalankan test |
| **Test Data** | Key-value / deskripsi | | Data yang digunakan dalam test |
| **Expected Result** | Numbered list | ✓ | Hasil yang diharapkan |
| **Actual Result** | Teks | | Diisi saat eksekusi testing (bukan saat generate) |
| **Test Case Status** | Lihat tabel status | ✓ | Status eksekusi test case |
| **Automation Status** | Lihat tabel automation | ✓ | Status otomasi test case ini |
| **Notes** | Teks bebas | | Catatan tambahan yang perlu diketahui |

#### Priority Levels

| Kode | Label | Kapan digunakan |
|------|-------|-----------------|
| `P1` | P1 - High | Flow kritis yang mempengaruhi bisnis secara langsung, core functionality |
| `P2` | P2 - Medium | Fitur penting tapi bukan jalur kritis, flow alternatif |
| `P3` | P3 - Low | Edge case, nice-to-have, estetika, atau fitur jarang digunakan |

**Panduan penentuan priority:**
- P1 → Happy path utama, login/auth, transaksi, data integrity
- P2 → Validasi form, error handling, navigasi, flow alternatif
- P3 → Empty state, loading state, UI edge case, boundary value yang tidak kritis

#### Test Case Status Values

| Status | Keterangan |
|--------|------------|
| `untested` | **Default.** Belum pernah dieksekusi |
| `passed` | Test dijalankan dan hasilnya sesuai expected result |
| `onprogress` | Sedang dalam proses eksekusi |
| `blocked` | Tidak bisa dieksekusi karena dependency belum siap / bug blocker |
| `failed` | Test dijalankan dan hasilnya TIDAK sesuai expected result |
| `retest` | Perlu diulangi (setelah bug fix, atau hasil tidak konsisten) |

#### Automation Status Values

| Status | Keterangan |
|--------|------------|
| `manual only` | TC ini tidak akan dibuat script automation |
| `to be automated` | Sudah dianalisis dan akan dibuat script automation di masa depan |
| `in progress` | Script automation sedang dibuat |
| `automated` | Script automation sudah ada dan berjalan |

**Panduan penentuan Automation Status:**

Rekomendasikan `to be automated` / `automated` untuk:
- Happy path yang dijalankan berulang (regression)
- Flow yang sama dipakai di banyak feature (login, auth)
- Validasi form yang punya banyak variasi data

Rekomendasikan `manual only` untuk:
- Visual/UI comparison (pixel-level, layout check)
- Flow yang melibatkan sistem eksternal (SMS, email, payment gateway)
- TC yang sangat jarang dijalankan atau sering berubah

---

### Contoh Baris Test Case Table (Excel)

```
TC0001 | Login | Verifikasi berhasil redirect ke halaman login dari landing page | P1 - High | 1. Sudah berada di halaman Landing Page | 1. Klik button "Login" | url = https://login.com | 1. Redirect ke halaman Login | | untested | to be automated |
TC0002 | Login | Verifikasi login berhasil dengan email dan password valid | P1 - High | 1. Sudah di halaman Login; 2. Memiliki akun terdaftar | 1. Isi field Email; 2. Isi field Password; 3. Klik button Login | email = qa-test@example.com; password = TestP@ss123 | 1. Redirect ke Dashboard; 2. Muncul pesan selamat datang | | untested | automated |
```

---

## Format Word (`.docx`) dan Markdown (`.md`) {#md-word-format}

Format **dokumentasi formal** dengan narasi lengkap dan daftar test case bernomor.
Terdiri dari **5 sections** berurutan. Word dan Markdown menggunakan **struktur yang sama**.

### Struktur Output

```
┌─────────────────────────────────┐
│  1. TEST CASE INFORMATION       │
├─────────────────────────────────┤
│  2. SOURCE                      │
├─────────────────────────────────┤
│  3. APPLICATION OVERVIEW        │
├─────────────────────────────────┤
│  4. TEST CASE STATUS            │
├─────────────────────────────────┤
│  5. TEST CASE LIST              │
└─────────────────────────────────┘
```

---

### Section 1 — Test Case Information

| Field | Value |
|-------|-------|
| **Feature Name** | `[nama fitur]` |
| **User Facing** | `Yes / No` |
| **Created By** | `[nama user / default: QA Explorer]` |
| **Created Date** | `[tanggal generate]` |
| **Approve By** | *(diisi manual)* |
| **Updated By** | *(diisi saat update)* |
| **Updated Date** | *(diisi saat update)* |

---

### Section 2 — Source

Asal-usul test case ini dibuat.

| Field | Value |
|-------|-------|
| **Source Type** | `PRD` / `URL Exploration` / `Manual Input` / `Gap Analysis` |
| **Source Detail** | Nama file dokumen / URL yang dieksplor / deskripsi singkat |
| **Mode** | `pre-dev (@unverified)` / `post-dev (@verified)` / `gap-only` |
| **Exploration Date** | Tanggal eksplorasi (Mode 2) atau tanggal analisis dokumen (Mode 1) |

---

### Section 3 — Application Overview

Deskripsi singkat aplikasi yang sedang ditest.

| Field | Value |
|-------|-------|
| **Application Name** | Nama aplikasi |
| **Application URL** | URL (jika ada, atau N/A) |
| **Description** | 1–3 kalimat deskripsi singkat |
| **Platform** | `Web` / `Mobile Web` / `iOS` / `Android` / `Desktop` |
| **Environment** | `Staging` / `Production` / `Development` |

---

### Section 4 — Test Case Status

Hitungan jumlah test case berdasarkan status. Diisi secara manual (bukan formula) karena format teks.

| Status | Jumlah |
|--------|--------|
| **Test Case Passed** | 0 |
| **Test Case On Progress** | 0 |
| **Test Case Untested** | `[total semua TC]` |
| **Test Case Blocked** | 0 |
| **Test Case Failed** | 0 |
| **Test Case Retest** | 0 |
| **Total Test Case** | `[total semua TC]` |

---

### Section 5 — Test Case List

Daftar semua test case dalam format **bernomor (numbered list)**. Setiap test case ditulis sebagai blok terpisah dengan format berikut:

```
[Nomor]. [TC ID] — [Summary]

   Scenario      : [Nama skenario / group]
   Priority      : [P1 - High / P2 - Medium / P3 - Low]
   Pre-Conditions:
      1. [kondisi pertama]
      2. [kondisi kedua]
   Test Step     :
      1. [langkah pertama]
      2. [langkah kedua]
   Test Data     : [data yang digunakan, atau "-" jika tidak ada]
   Expected Result:
      1. [hasil yang diharapkan]
      2. [hasil tambahan]
   Actual Result : [kosong — diisi saat eksekusi]
   Status        : untested
   Automation    : [to be automated / manual only / automated]
   Notes         : [catatan, atau "-"]
```

---

### Template Lengkap — Markdown (`.md`)

```markdown
# Test Case Document: [Feature Name]

---

## 1. Test Case Information

| Field | Value |
|-------|-------|
| Feature Name | [nama fitur] |
| User Facing | [Yes / No] |
| Created By | [nama] |
| Created Date | [tanggal] |
| Approve By | |
| Updated By | |
| Updated Date | |

---

## 2. Source

| Field | Value |
|-------|-------|
| Source Type | [PRD / URL Exploration / Manual Input] |
| Source Detail | [nama file / URL] |
| Mode | [pre-dev (@unverified) / post-dev (@verified)] |
| Exploration/Analysis Date | [tanggal] |

---

## 3. Application Overview

| Field | Value |
|-------|-------|
| Application Name | [nama app] |
| Application URL | [URL atau N/A] |
| Description | [deskripsi singkat] |
| Platform | [Web / Mobile Web / dll] |
| Environment | [Staging / Production / Development] |

---

## 4. Test Case Status

| Status | Jumlah |
|--------|--------|
| Test Case Passed | 0 |
| Test Case On Progress | 0 |
| Test Case Untested | [total] |
| Test Case Blocked | 0 |
| Test Case Failed | 0 |
| Test Case Retest | 0 |
| **Total Test Case** | **[total]** |

---

## 5. Test Case List

1. **TC0001 — [Summary singkat]**

   - **Scenario**       : [nama skenario]
   - **Priority**       : P1 - High
   - **Pre-Conditions** :
     1. [kondisi pertama]
     2. [kondisi kedua]
   - **Test Step** :
     1. [langkah pertama]
     2. [langkah kedua]
   - **Test Data**       : [data atau -]
   - **Expected Result** :
     1. [hasil yang diharapkan]
   - **Actual Result**   : *(diisi saat eksekusi)*
   - **Status**          : untested
   - **Automation**      : to be automated
   - **Notes**           : -

---

2. **TC0002 — [Summary singkat]**

   - **Scenario**       : [nama skenario]
   ...
```

---

### Template Lengkap — Word (`.docx`)

Struktur Word sama persis dengan Markdown di atas, namun ditulis sebagai file `.docx` menggunakan skill `docx`. Gunakan:
- **Heading 1** untuk judul dokumen
- **Heading 2** untuk setiap section (1–5)
- **Table** untuk Test Case Information, Source, Application Overview, Test Case Status
- **Numbered list** untuk Test Case List (setiap TC adalah 1 item bernomor)
- Bold untuk label field di dalam setiap test case

> Gunakan skill `docx` untuk membuat file Word dari template ini.

---

## Gap Report Format {#gap-report}

Digunakan di Mode 3 (Gap Only) atau otomatis setelah Mode 2 jika ada qa-spec dari Mode 1.
Output selalu dalam format **Markdown** (`.md`) untuk kemudahan review.

### File: `gap-report-[nama]-[YYYY-MM-DD].md`

```markdown
# Gap Report: [Nama Fitur]
**Tanggal:** [tanggal]  
**Pre-dev source:** qa-spec-[nama]-predev.json (Mode 1, [tanggal buat])  
**Post-dev source:** [URL] atau [nama file Mode 2]  
**Dibuat oleh:** qa-explorer v[versi]

---

## Ringkasan Eksekutif

| Status | Jumlah | Keterangan |
|--------|--------|------------|
| ✅ Terverifikasi | [N] | Scenario ada di dokumen DAN ada di produk |
| ⚠️ Missing di produk | [N] | Scenario di dokumen tapi tidak ada di produk |
| ℹ️ Berbeda dari dokumen | [N] | Ada di produk tapi behavior berbeda dari spec |
| ✨ Temuan baru | [N] | Ada di produk, tidak ada di dokumen |
| ❓ Perlu konfirmasi manual | [N] | Tidak bisa diverifikasi otomatis |

**Coverage:** [N]% dari test case pre-dev terverifikasi  
**Risk Level:** [Low / Medium / High]

---

## Detail per Scenario

### ✅ Terverifikasi ([N] scenario)

| ID | Scenario | Confidence |
|----|----------|-----------|
| TC0001 | Login berhasil dengan email valid | Confirmed |

---

### ⚠️ Missing di Produk ([N] scenario)

#### TC0004: Remember Me functionality
**Confidence:** Likely missing  
**Dokumen bilang:** User bisa centang "Remember Me" untuk memperpanjang session 30 hari  
**Yang ditemukan:** Tidak ada checkbox "Remember Me" di halaman login  
**Rekomendasi:** Konfirmasi ke developer apakah fitur ini sudah diimplementasi atau di-scope out  

---

### ℹ️ Berbeda dari Dokumen ([N] scenario)

#### TC0010: Error message saat login gagal
**Confidence:** Confirmed  
**Dokumen bilang:** Tampilkan "Email atau password salah"  
**Yang ditemukan di produk:** "Kredensial tidak valid. Silakan coba lagi."  
**Tipe perbedaan:** Teks pesan berbeda (minor)  
**Rekomendasi:** Update test case di spec untuk merefleksikan teks aktual  

---

### ✨ Temuan Baru ([N] scenario)

#### NEW-001: Social login (Google)
**Confidence:** Confirmed  
**Ditemukan di:** Halaman login, button "Login dengan Google"  
**Rekomendasi:** Tambahkan ke dokumen dan buat test case untuk social login flow  

---

### ❓ Perlu Konfirmasi Manual ([N] scenario)

#### TC0015: Email verifikasi setelah registrasi
**Kenapa perlu manual:** Memerlukan akses ke email inbox  
**Yang sudah diverifikasi:** Halaman konfirmasi muncul setelah submit registrasi  
**Cara test manual:** Gunakan akun email test + klik link di inbox  

---

## Rekomendasi Tindakan

### Prioritas Tinggi 🔴
1. **[TC-ID] [Judul]** — [Tindakan]

### Prioritas Sedang 🟡  
2. **[TC-ID] [Judul]** — [Tindakan]

### Prioritas Rendah 🟢
3. **[TC-ID] [Judul]** — [Tindakan]

---

## Next Steps

- [ ] Review gap report ini bersama tim
- [ ] Update qa-spec-[nama].json dengan temuan baru
- [ ] Jadwalkan test manual untuk item yang perlu konfirmasi
- [ ] Update dokumen PRD jika ada perbedaan yang disengaja
```

---

## Confidence Level Definition

| Level | Definisi |
|-------|----------|
| **Confirmed** | Langsung melihat behavior-nya saat eksplorasi |
| **Likely missing** | Sudah dicari di semua halaman relevan, tidak ketemu |
| **Possibly different** | Mirip tapi ada perbedaan (teks, visual, atau minor behavior) |
| **Needs manual confirmation** | Butuh aksi di luar browser (email, SMS, payment, dll) |

---

## Tag Reference (untuk qa-spec JSON)

| Tag | Mode | Makna |
|-----|------|-------|
| `@unverified` | 1 | Dari dokumen, belum divalidasi |
| `@verified` | 2 | Dari eksplorasi nyata |
| `@pre-dev` | 1 | Mode 1 origin |
| `@post-dev` | 2 | Mode 2 origin |
| `@happy-path` | 1,2 | Alur sukses utama |
| `@negative` | 1,2 | Test kondisi gagal/error |
| `@edge-case` | 1,2 | Kondisi batas |
| `@assumption` | 1 | Diasumsikan, bukan dari dokumen |
| `@high` | 1,2 | Prioritas tinggi |
| `@medium` | 1,2 | Prioritas sedang |
| `@low` | 1,2 | Prioritas rendah |
| `@needs-auth` | 2 | Butuh login |
| `@needs-manual` | 2,3 | Perlu konfirmasi manual |
