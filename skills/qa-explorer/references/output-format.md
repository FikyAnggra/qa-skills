# Output Format Reference

Dokumen ini mendefinisikan semua template output yang digunakan oleh qa-explorer.

**Format yang tersedia:**
| Flag | Format | Output File |
|------|--------|-------------|
| *(default)* | Gherkin / BDD | `*.feature` |
| `--format table` | Tabel Markdown | `*.md` |
| `--format steps` | Plain Steps | `*.md` |
| `--format playwright` | Playwright TypeScript | `*.spec.ts` |
| `--format xlsx` | **Excel (5 sections)** | `*.xlsx` ← **Direkomendasikan untuk manajemen TC** |

---

## Format 5 — Excel / Table (`--format xlsx` atau `--format table`) {#table-format}

Format ini adalah format **manajemen test case profesional** dengan 5 bagian terurut.
Digunakan untuk mendokumentasikan, tracking status, dan referensi pembuatan automation script.

### Struktur Output (urutan dari atas ke bawah)

```
┌─────────────────────────────────┐
│  1. TEST CASE INFORMATION       │
├─────────────────────────────────┤
│  2. SOURCE                      │
├─────────────────────────────────┤
│  3. APPLICATION OVERVIEW        │
├─────────────────────────────────┤
│  4. TEST CASE STATUS (Summary)  │
├─────────────────────────────────┤
│  5. TEST CASE TABLE             │
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

### Section 2 — Source

Asal-usul test case ini dibuat. Format:

| Field | Value |
|-------|-------|
| **Source Type** | `PRD` / `URL Exploration` / `Manual Input` / `Gap Analysis` |
| **Source Detail** | Nama file dokumen / URL yang dieksplor / deskripsi singkat |
| **Mode** | `pre-dev (@unverified)` / `post-dev (@verified)` / `gap-only` |
| **Exploration Date** | Tanggal eksplorasi (Mode 2) atau tanggal analisis dokumen (Mode 1) |

---

### Section 3 — Application Overview

Deskripsi singkat aplikasi yang sedang ditest. Ekstrak dari dokumen (Mode 1) atau dari hasil eksplorasi (Mode 2).

| Field | Value |
|-------|-------|
| **Application Name** | Nama aplikasi |
| **Application URL** | URL (jika ada) |
| **Description** | 1–3 kalimat deskripsi singkat |
| **Platform** | `Web` / `Mobile Web` / `iOS` / `Android` / `Desktop` |
| **Environment** | `Staging` / `Production` / `Development` |

---

### Section 4 — Test Case Status Summary

Hitungan otomatis berdasarkan kolom **Test Case Status** di tabel test case.

| Status | Jumlah |
|--------|--------|
| **Test Case Passed** | `[hitung otomatis]` |
| **Test Case On Progress** | `[hitung otomatis]` |
| **Test Case Untested** | `[hitung otomatis]` |
| **Test Case Blocked** | `[hitung otomatis]` |
| **Test Case Failed** | `[hitung otomatis]` |
| **Test Case Retest** | `[hitung otomatis]` |
| **Total Test Case** | `[total semua]` |

> Pada file Excel (`.xlsx`), kolom ini menggunakan **formula COUNTIF** sehingga update otomatis saat status di tabel berubah.

---

### Section 5 — Test Case Table

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

---

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

---

#### Test Case Status Values

| Status | Keterangan |
|--------|------------|
| `untested` | **Default.** Belum pernah dieksekusi |
| `passed` | Test dijalankan dan hasilnya sesuai expected result |
| `onprogress` | Sedang dalam proses eksekusi |
| `blocked` | Tidak bisa dieksekusi karena dependency belum siap / bug blocker |
| `failed` | Test dijalankan dan hasilnya TIDAK sesuai expected result |
| `retest` | Perlu diulangi (setelah bug fix, atau hasil tidak konsisten) |

---

#### Automation Status Values

| Status | Keterangan |
|--------|------------|
| `manual only` | TC ini tidak akan dibuat script automation (tidak worth it / terlalu kompleks) |
| `to be automated` | Sudah dianalisis dan akan dibuat script automation di masa depan |
| `in progress` | Script automation sedang dibuat |
| `automated` | Script automation sudah ada dan berjalan |

**Panduan penentuan Automation Status (analisis otomatis):**

Rekomendasikan `automated` / `to be automated` untuk:
- Happy path yang dijalankan berulang (regression)
- Flow yang sama dipakai di banyak feature (login, auth)
- Validasi form yang punya banyak variasi data
- API-level test yang tidak memerlukan visual check

Rekomendasikan `manual only` untuk:
- Visual/UI comparison (pixel-level, layout check)
- Flow yang melibatkan sistem eksternal (SMS, email, payment gateway)
- Exploratory testing yang membutuhkan judgement manusia
- TC yang sangat jarang dijalankan (sekali per release)
- Flow yang sering berubah (tidak stable untuk automation)

---

### Contoh Baris Test Case Table (Markdown)

```markdown
| TC ID  | Scenario | Summary | Priority | Pre-Conditions | Test Step | Test Data | Expected Result | Actual Result | Test Case Status | Automation Status | Notes |
|--------|----------|---------|----------|----------------|-----------|-----------|-----------------|---------------|-----------------|-------------------|-------|
| TC0001 | Login | Verifikasi berhasil redirect ke halaman login dari landing page | P1 - High | 1. Sudah berada di halaman Landing Page | 1. Klik button "Login" | url = https://login.com | 1. Redirect ke halaman Login | | untested | to be automated | |
| TC0002 | Login | Verifikasi login berhasil dengan email dan password valid | P1 - High | 1. Sudah di halaman Login<br>2. Memiliki akun terdaftar | 1. Isi field Email dengan email valid<br>2. Isi field Password dengan password benar<br>3. Klik button "Login" | email = qa-test@example.com<br>password = TestP@ss123 | 1. Redirect ke halaman Dashboard<br>2. Muncul pesan selamat datang<br>3. Nama user tampil di navbar | | untested | automated | Login flow sudah ada script di cypress/e2e/login.cy.js |
| TC0003 | Login | Verifikasi error saat submit form login kosong | P1 - High | 1. Sudah di halaman Login | 1. Klik button "Login" tanpa mengisi apapun | - | 1. Muncul pesan validasi di field Email<br>2. Muncul pesan validasi di field Password<br>3. User tetap di halaman Login | | untested | to be automated | |
| TC0004 | Login | Verifikasi error saat password salah | P1 - High | 1. Sudah di halaman Login<br>2. Memiliki akun terdaftar | 1. Isi field Email dengan email valid<br>2. Isi field Password dengan password SALAH<br>3. Klik button "Login" | email = qa-test@example.com<br>password = WrongPass | 1. Muncul pesan "Email atau password salah"<br>2. User tetap di halaman Login<br>3. Password field dikosongkan | | untested | automated | |
```

---

### Template Lengkap (Markdown Output — `--format table`)

```markdown
# Test Case Document: [Feature Name]

---

## Test Case Information

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

## Source

| Field | Value |
|-------|-------|
| Source Type | [PRD / URL Exploration / Manual Input] |
| Source Detail | [nama file / URL] |
| Mode | [pre-dev (@unverified) / post-dev (@verified)] |
| Exploration/Analysis Date | [tanggal] |

---

## Application Overview

| Field | Value |
|-------|-------|
| Application Name | [nama app] |
| Application URL | [URL atau N/A] |
| Description | [deskripsi singkat] |
| Platform | [Web / Mobile Web / dll] |
| Environment | [Staging / Production / Development] |

---

## Test Case Status

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

## Test Case Table

| TC ID | Scenario | Summary | Priority | Pre-Conditions | Test Step | Test Data | Expected Result | Actual Result | Test Case Status | Automation Status | Notes |
|-------|----------|---------|----------|----------------|-----------|-----------|-----------------|---------------|-----------------|-------------------|-------|
| TC0001 | ... | ... | P1 - High | 1. ... | 1. ... | ... | 1. ... | | untested | [status] | |
```

---

## Format 1 — Gherkin / BDD (Default)

Template standar untuk semua mode.

### File Header

```gherkin
# ============================================================
# Feature: [Nama Fitur]
# Mode: [pre-dev | post-dev]
# Generated: [ISO timestamp]
# Source: [nama dokumen / URL]
# ============================================================

@[unverified|verified] @[pre-dev|post-dev]
Feature: [Nama Fitur]
  Sebagai [persona/aktor]
  Saya ingin [tujuan/kebutuhan]
  Sehingga [nilai bisnis yang didapat]
```

### Background (Opsional)

```gherkin
  Background:
    Given user sudah terdaftar sebagai [role]
    And user berada di halaman [halaman]
```

### Scenario Happy Path

```gherkin
  @happy-path @high
  Scenario: [Deskripsi singkat alur sukses]
    Given [kondisi awal yang spesifik]
    When user [aksi pertama]
    And user [aksi kedua jika ada]
    Then [hasil yang terlihat/terukur]
    And [hasil tambahan]
    And [side effect jika ada]
```

### Scenario dengan Data Table

```gherkin
  @happy-path @medium
  Scenario Outline: [Deskripsi dengan variasi data]
    Given user berada di form [nama form]
    When user mengisi "<field>" dengan "<nilai>"
    And user submit form
    Then sistem menampilkan "<hasil>"

    Examples:
      | field    | nilai              | hasil              |
      | email    | user@example.com   | berhasil daftar    |
      | email    | invalid-email      | error format email |
      | password | 123                | error terlalu pendek|
```

### Scenario Negative

```gherkin
  @negative @high
  Scenario: [Deskripsi kondisi gagal]
    Given [kondisi yang mengarah ke error]
    When user [aksi yang memicu error]
    Then sistem menampilkan pesan "[teks error yang diharapkan]"
    And user tetap berada di halaman [nama halaman]
    And [field/elemen] ditandai sebagai error
```

### Scenario Edge Case

```gherkin
  @edge-case @low
  # @assumption - behavior ini diasumsikan, belum dikonfirmasi
  Scenario: [Deskripsi kondisi batas]
    Given [kondisi batas yang spesifik]
    When user [aksi di kondisi batas]
    Then [hasil yang diharapkan di kondisi batas]
```

---

## Format 2 — Tabel Markdown (`--format table`)

Gunakan ketika user minta output lebih ringkas atau untuk dokumentasi.

```markdown
## Test Cases: [Nama Fitur]

| ID | Scenario | Precondition | Steps | Expected Result | Priority | Tag |
|----|----------|--------------|-------|-----------------|----------|-----|
| TC-001 | Login berhasil dengan email valid | User sudah terdaftar | 1. Buka /login<br>2. Isi email valid<br>3. Isi password benar<br>4. Klik Login | Redirect ke /dashboard, welcome message muncul | High | happy-path |
| TC-002 | Login gagal dengan password salah | User sudah terdaftar | 1. Buka /login<br>2. Isi email valid<br>3. Isi password salah<br>4. Klik Login | Pesan "Password salah" muncul, user tetap di /login | High | negative |
| TC-003 | Form kosong tidak bisa di-submit | Berada di halaman login | 1. Buka /login<br>2. Klik Login tanpa isi apa-apa | Validasi muncul di semua field wajib | Medium | negative |
```

---

## Format 3 — Plain Steps (`--format steps`)

Untuk tim yang lebih suka numbered steps tanpa Gherkin syntax.

```markdown
## Test Case [TC-001]: Login berhasil

**Prioritas:** High  
**Tags:** happy-path, @verified  
**URL:** /login  

**Precondition:**
- User sudah terdaftar di sistem
- User berada di halaman login

**Steps:**
1. Buka browser dan navigate ke [URL]/login
2. Isi field "Email" dengan email yang terdaftar
3. Isi field "Password" dengan password yang benar
4. Klik button "Login" / "Masuk"
5. Tunggu halaman redirect

**Expected Result:**
- User diredirect ke halaman dashboard (/dashboard)
- Muncul pesan selamat datang dengan nama user
- Navbar menampilkan nama/avatar user
- Session/cookie tersimpan di browser

**Postcondition:**
- User dalam keadaan logged-in
- Token autentikasi tersimpan

---

## Test Case [TC-002]: Login gagal - password salah

**Prioritas:** High  
**Tags:** negative, @verified  

...
```

---

## Format 4 — Playwright TypeScript (`--format playwright`)

Generate kode test Playwright siap pakai.

```typescript
// [nama-fitur].spec.ts
// Generated by qa-explorer | Mode: post-dev | Date: [tanggal]
// Source URL: [URL]

import { test, expect } from '@playwright/test';

test.describe('[Nama Fitur]', () => {

  test.beforeEach(async ({ page }) => {
    // Setup: navigate ke halaman awal
    await page.goto('[BASE_URL]/[path]');
    await page.waitForLoadState('networkidle');
  });

  // TC-001: Happy Path
  test('login berhasil dengan email dan password valid', async ({ page }) => {
    // Given
    await page.goto('[BASE_URL]/login');
    
    // When
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Then
    await expect(page).toHaveURL('[BASE_URL]/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
  });

  // TC-002: Negative - password salah
  test('menampilkan error ketika password salah', async ({ page }) => {
    // Given
    await page.goto('[BASE_URL]/login');
    
    // When
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'WrongPassword');
    await page.click('[data-testid="login-button"]');
    
    // Then
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Password salah');
    await expect(page).toHaveURL('[BASE_URL]/login');
  });

});
```

> **Note:** Selector `[data-testid="..."]` adalah placeholder. Di Mode 2 (post-dev), ganti dengan selector aktual yang ditemukan saat eksplorasi.

---

## Gap Report Format {#gap-report}

Digunakan di Mode 3 (Gap Only) atau otomatis setelah Mode 2 jika ada qa-spec dari Mode 1.

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
| TC-001 | Login berhasil dengan email valid | Confirmed |
| TC-003 | Redirect ke dashboard setelah login | Confirmed |

---

### ⚠️ Missing di Produk ([N] scenario)

Scenario ini ada di dokumen/spec tapi **tidak ditemukan** di produk saat eksplorasi.

#### TC-004: Remember Me functionality
**Confidence:** Likely missing  
**Dokumen bilang:** User bisa centang "Remember Me" untuk memperpanjang session 30 hari  
**Yang ditemukan:** Tidak ada checkbox "Remember Me" di halaman login  
**Rekomendasi:** Konfirmasi ke developer apakah fitur ini sudah diimplementasi atau di-scope out  

---

#### TC-007: Password strength indicator
**Confidence:** Possibly different name  
**Dokumen bilang:** Muncul indikator kekuatan password saat user mengetik di field password  
**Yang ditemukan:** Ada indikator tapi hanya menampilkan "Weak/Strong", bukan bar visual seperti di spec  
**Rekomendasi:** Update spec atau update implementasi sesuai kesepakatan  

---

### ℹ️ Berbeda dari Dokumen ([N] scenario)

Fitur ada tapi behavior-nya berbeda dari yang dispesifikasikan.

#### TC-010: Error message saat login gagal
**Confidence:** Confirmed  
**Dokumen bilang:** Tampilkan "Email atau password salah"  
**Yang ditemukan di produk:** "Kredensial tidak valid. Silakan coba lagi."  
**Tipe perbedaan:** Teks pesan berbeda (minor)  
**Rekomendasi:** Update test case di spec untuk merefleksikan teks aktual  

---

### ✨ Temuan Baru ([N] scenario)

Fungsionalitas yang ada di produk tapi **tidak ada di dokumen**.

#### NEW-001: Social login (Google)
**Confidence:** Confirmed  
**Ditemukan di:** Halaman login, button "Login dengan Google"  
**Behavior:** Membuka OAuth flow Google  
**Rekomendasi:** Tambahkan ke dokumen dan buat test case untuk social login flow  

---

### ❓ Perlu Konfirmasi Manual ([N] scenario)

Tidak bisa diverifikasi otomatis karena melibatkan sistem eksternal atau flow yang kompleks.

#### TC-015: Email verifikasi setelah registrasi
**Kenapa perlu manual:** Memerlukan akses ke email inbox untuk mengklik link verifikasi  
**Yang sudah diverifikasi:** Halaman konfirmasi muncul setelah submit registrasi  
**Yang belum diverifikasi:** Apakah email benar-benar dikirim dan link berfungsi  
**Cara test manual:** Gunakan akun email test + klik link di inbox  

---

## Rekomendasi Tindakan

### Prioritas Tinggi 🔴
1. **[TC-004] Remember Me** — Konfirmasi status implementasi ke tim dev
2. **[NEW-001] Social Login** — Dokumentasikan dan buat test case

### Prioritas Sedang 🟡  
3. **[TC-010] Error message** — Update teks di spec/test case
4. **[TC-015] Email verifikasi** — Jadwalkan test manual

### Prioritas Rendah 🟢
5. **[TC-007] Password indicator** — Klarifikasi visual requirement

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

## Tag Reference

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
| `@ui-only` | 2 | Hanya bisa ditest via UI |
| `@flaky` | 2 | Behavior tidak konsisten |
| `@requires-elevated-permission` | 2 | Butuh role khusus |
| `@needs-manual` | 2,3 | Perlu konfirmasi manual |
