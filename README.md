# HRIS Al-Falah

Sistem Informasi Kepegawaian (HRIS) untuk **Pesantren ** —
mengelola data induk pegawai, riwayat mutasi, dan penilaian kinerja, dengan
dashboard ringkas untuk pimpinan.

## Struktur Repo

```
app/
  index.html        # Aplikasi utama (single-file HTML/JS, terhubung ke Supabase)
database/
  schema.sql        # Skema tabel + trigger perhitungan skor kinerja
  rls_policies.sql   # Row Level Security policies (role-based access)
```

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

Tabel inti `employees` sedang dipecah bertahap menjadi modul-modul anak yang
ternormalisasi (3NF).

| # | Modul | Status |
|---|---|---|
| 1 | `employee_family` (→ `employee_family_members`) | ✅ Selesai — `batch1_family_education_documents.sql` |
| 2 | `employee_education` | ✅ Selesai — `batch1_family_education_documents.sql` |
| 3 | `employee_documents` | ✅ Selesai (dirombak total) — `batch1_family_education_documents.sql` |
| 4 | `employee_contact` | ⏳ Belum |
| 5 | `employee_bank` | ⏳ Belum |
| 6 | `employee_payroll` | ⏳ Belum |
| 7 | `employee_certifications` | ⏳ Perlu disempurnakan (FK + audit trail) |
| 8 | `employee_competencies` | ⏳ Perlu disempurnakan (FK + audit trail) |
| 9 | `employee_training` | ⏳ Belum |
| 10 | `employee_language` | ⏳ Belum |
| 11 | `employee_leave` | ⏳ Belum |
| 12 | `employee_attendance_setting` | ⏳ Belum |
| 13 | `employee_position_history` | ⏳ Belum |
| 14 | `employee_salary_history` | ⏳ Belum |
| 15 | `employee_transfer_history` | ⏳ Belum |
| 16 | `employee_performance` | ✅ Sudah ada sebagai `performance_reviews` |
| 17 | `employee_rewards` | ⏳ Belum |
| 18 | `employee_punishment` | ⏳ Belum |
| 19 | `employee_system_account` | ✅ Sudah ada sebagai `user_roles` |

Setiap modul menggunakan infrastruktur generik dari `batch1_family_education_documents.sql`:
- `fn_set_updated_at()` — trigger `BEFORE UPDATE` agar `updated_at` selalu akurat
- `fn_hris_audit()` — trigger `AFTER INSERT/UPDATE/DELETE` yang mencatat setiap perubahan ke tabel `audit_log`

## Struktur Data Utama

- `employees` — data induk pegawai (single source of truth)
- `employee_certifications`, `employee_competencies`, `employee_family`,
  `employee_documents`, `employee_teaching_assignment` — data pendukung 1-ke-banyak
- `performance_reviews` — riwayat penilaian kinerja per periode (skor & predikat
  dihitung otomatis lewat trigger database)
- `employment_history` — riwayat mutasi/promosi/perubahan gaji (tidak pernah ditimpa)
- `m_*` — tabel master/lookup (unit kerja, jabatan, bank, dll.)
