# HRIS Al-Falah

Sistem Informasi Kepegawaian (HRIS) untuk **Pesantren Modern Al-Falah Abu Lam U** —
mengelola data induk pegawai, riwayat mutasi, dan penilaian kinerja, dengan
dashboard ringkas untuk pimpinan.

## Struktur Repo

```
app/
  index.html        # Aplikasi utama (single-file HTML/JS, terhubung ke Supabase)
  manifest.json      # PWA manifest
  sw.js              # Service worker (PWA offline shell)
database/
  schema.sql                              # Skema inti + auth_user_id + notifications + leave_requests
  rls_policies.sql                        # Row Level Security policies (role-based access)
  batch1_family_education_documents.sql   # employee_family / employee_education / employee_documents
  batch2_remaining_modules.sql            # contact, bank, payroll, cert, competency, training, language,
                                           # leave balance, attendance, position/salary/transfer history,
                                           # rewards, punishment
  batch3_selfservice_notifications.sql    # self-service profile update + notifications triggers
  batch4_institutional_calendar.sql       # institutional_events (kalender lembaga)
  seed_dummy_data.sql                     # 10 pegawai contoh untuk uji coba
  MIGRATION_NOTES.md                      # urutan eksekusi + catatan migrasi penting
supabase/
  functions/notify-dispatch/index.ts      # Edge Function: fan-out notifikasi ke email/push (opsional)
```

> **Status saat ini**: seluruh file `database/*.sql` sudah dieksekusi dan
> diverifikasi terhadap project Supabase produksi (`Data HRD Al-Falah`), termasuk
> RLS, trigger, dan data contoh (13 pegawai total). Edge Function `notify-dispatch`
> sudah ter-deploy tapi masih dorman (butuh secrets email/push milik Anda sendiri —
> lihat `database/MIGRATION_NOTES.md`).
>
> `app/index.html` memakai versi lengkap (kalender custom bulanan + integrasi
> hari libur nasional + notifikasi realtime + self-service profile + PWA +
> role-based UI + export iCal/Google Calendar). Realtime untuk tabel
> `notifications` sudah diaktifkan di level database (`supabase_realtime`
> publication) — sebelumnya tabel ini belum terdaftar sehingga listener
> notifikasi live tidak akan pernah menerima event meski kodenya benar.
>
> Catatan cakupan: UI saat ini fokus pada Dashboard, Biodata, Kalender, dan
> Notifikasi. Modul-modul baru dari batch2 (`employee_contacts`,
> `employee_bank_accounts`, `employee_payroll_components`,
> `employee_trainings`, `employee_languages`, `employee_leave_balances`,
> `employee_attendance_settings`, riwayat jabatan/gaji/mutasi, rewards,
> punishment) **sudah ada dan berfungsi di database**, tapi belum punya
> tampilan/form khusus di `app/index.html` — masih perlu dibangun form
> UI-nya kalau ingin dikelola langsung dari aplikasi, bukan lewat Supabase
> Table Editor.

## Stack

- **Frontend**: HTML + vanilla JavaScript (tanpa framework/build step) — cukup buka
  `app/index.html` di browser, atau host sebagai static site (Vercel/Netlify/GitHub Pages).
- **Backend**: [Supabase](https://supabase.com) — Postgres database, Auth, dan
  auto-generated REST API (PostgREST). Semua akses data lewat `fetch()` langsung
  ke REST API Supabase, diamankan dengan Row Level Security.

## Setup Database (Supabase)

1. Buat project baru di [supabase.com](https://supabase.com) (Free tier cukup untuk mulai).
2. Buka **SQL Editor**, jalankan `database/schema.sql`, lalu `database/rls_policies.sql`.
3. Salin **Project URL** dan **anon/public API key** dari **Settings → API**.
4. Buka `app/index.html`, ganti nilai `SUPABASE_URL` dan `ANON_KEY` di bagian atas `<script>`
   sesuai project Anda.

## Peran Pengguna (Role)

| Role | Akses |
|---|---|
| `admin` | Akses penuh — kelola data pegawai, master data, dan peran pengguna lain |
| `hrd_staff` | Tambah/edit data pegawai & penilaian kinerja, tidak bisa hapus atau kelola peran |
| `pimpinan` | Hanya melihat dashboard & biodata (read-only) |
| `pending` | Akun baru mendaftar tapi belum diberi peran — tidak ada akses data |

**Catatan penting**: pengguna **pertama** yang mendaftar (sign up) melalui aplikasi
otomatis menjadi `admin` (lihat trigger `fn_handle_new_user` di `schema.sql`).
Pengguna berikutnya berstatus `pending` sampai di-upgrade manual oleh admin lewat
tabel `user_roles` (via Supabase Table Editor, atau menu admin jika sudah dibangun).

### Konfirmasi Email

Secara default, Supabase Auth mewajibkan konfirmasi email saat mendaftar.
Untuk kemudahan testing internal, ini bisa dinonaktifkan di
**Authentication → Providers → Email → Confirm email** (matikan togglenya).
Untuk produksi, disarankan tetap diaktifkan.

## Menjalankan Secara Lokal

Karena aplikasi ini murni HTML/JS statis, cukup buka `app/index.html` langsung di
browser, atau jalankan static server sederhana:

```bash
cd app
python3 -m http.server 8080
# buka http://localhost:8080
```

## Deploy ke Production (Domain Sendiri)

Untuk deploy ke domain publik (mis. `hris.alfalahabulamu.com`), unggah folder `app/`
sebagai static site ke:

- **Vercel** — `vercel deploy app/` atau hubungkan repo ini lewat dashboard Vercel
- **Netlify** — drag-and-drop folder `app/`, atau hubungkan repo via Netlify dashboard
- **GitHub Pages** — aktifkan Pages pada repo ini, arahkan ke folder `app/`

Tidak perlu proses build — file `index.html` sudah siap pakai apa adanya.

## Keamanan

- Semua tabel dilindungi Row Level Security (RLS) di level database — bukan hanya
  di frontend — sehingga aturan akses tetap berlaku meski API key diketahui pihak lain.
- Password di-hash otomatis oleh Supabase Auth (GoTrue), tidak pernah disimpan
  sebagai teks biasa.
- Data sensitif (gaji, NIK, BPJS) hanya bisa diakses oleh role yang berwenang
  sesuai kebijakan RLS di `rls_policies.sql`.

## Roadmap Modularisasi `employees`

Tabel inti `employees` sudah dipecah menjadi modul-modul anak yang
ternormalisasi (3NF). **Seluruh 19 modul di roadmap awal sudah selesai
dieksekusi ke database produksi.**

| # | Modul | Status |
|---|---|---|
| 1 | `employee_family` (→ `employee_family_members`) | ✅ Selesai — batch1 |
| 2 | `employee_education` | ✅ Selesai — batch1 |
| 3 | `employee_documents` | ✅ Selesai (dirombak total) — batch1 |
| 4 | `employee_contact` (→ `employee_contacts`) | ✅ Selesai — batch2 |
| 5 | `employee_bank` (→ `employee_bank_accounts`) | ✅ Selesai — batch2 |
| 6 | `employee_payroll` (→ `employee_payroll_components`) | ✅ Selesai (admin-only) — batch2 |
| 7 | `employee_certifications` | ✅ Disempurnakan (FK + audit trail) — batch2 |
| 8 | `employee_competencies` | ✅ Disempurnakan (FK + audit trail) — batch2 |
| 9 | `employee_training` (→ `employee_trainings`) | ✅ Selesai — batch2 |
| 10 | `employee_language` (→ `employee_languages`) | ✅ Selesai — batch2 |
| 11 | `employee_leave` (→ `employee_leave_balances` + `leave_requests`) | ✅ Selesai — batch2/schema |
| 12 | `employee_attendance_setting` | ✅ Selesai — batch2 |
| 13 | `employee_position_history` | ✅ Selesai — batch2 |
| 14 | `employee_salary_history` | ✅ Selesai (admin-only) — batch2 |
| 15 | `employee_transfer_history` | ✅ Selesai — batch2 |
| 16 | `employee_performance` | ✅ Sudah ada sebagai `performance_reviews` |
| 17 | `employee_rewards` | ✅ Selesai — batch2 |
| 18 | `employee_punishment` | ✅ Selesai (admin-only) — batch2 |
| 19 | `employee_system_account` | ✅ Sudah ada sebagai `user_roles` + `employees.auth_user_id` |

**Fitur tambahan di luar 19 modul awal** (batch3 & batch4):
- Self-service: pegawai bisa mengedit sebagian data kontaknya sendiri (`fn_restrict_self_update` membatasi kolom apa saja yang boleh diubah)
- Notifikasi in-app (`notifications`) + hook ke email/push lewat Edge Function (opsional, perlu API key sendiri)
- Pengecekan kontrak akan berakhir otomatis via `pg_cron` (harian, jam 06:00)
- Kalender kegiatan lembaga (`institutional_events`)

Setiap modul menggunakan infrastruktur generik dari `batch1_family_education_documents.sql`:
- `fn_set_updated_at()` — trigger `BEFORE UPDATE` agar `updated_at` selalu akurat
- `fn_hris_audit()` — trigger `AFTER INSERT/UPDATE/DELETE` yang mencatat setiap perubahan ke tabel `audit_log`

Lihat `database/MIGRATION_NOTES.md` untuk urutan eksekusi dan catatan migrasi penting.

## Struktur Data Utama

- `employees` — data induk pegawai (single source of truth)
- `employee_certifications`, `employee_competencies`, `employee_family`,
  `employee_documents`, `employee_teaching_assignment` — data pendukung 1-ke-banyak
- `performance_reviews` — riwayat penilaian kinerja per periode (skor & predikat
  dihitung otomatis lewat trigger database)
- `employment_history` — riwayat mutasi/promosi/perubahan gaji (tidak pernah ditimpa)
- `m_*` — tabel master/lookup (unit kerja, jabatan, bank, dll.)
