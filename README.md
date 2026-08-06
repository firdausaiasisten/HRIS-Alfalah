# HRIS Al-Falah

Sistem Informasi Kepegawaian (HRIS) untuk **Pesantren Modern Al-Falah Abu Lam U** —
mengelola data induk pegawai, riwayat mutasi, dan penilaian kinerja, dengan
dashboard ringkas untuk pimpinan.

Frontend lama (satu file `app/index.html`, vanilla JS) sudah **digantikan
sepenuhnya** oleh frontend React di repo ini. Backend/skema database
Supabase **tidak berubah** — semua endpoint, RLS, dan business logic yang
sudah berjalan di produksi tetap dipakai apa adanya.

## Struktur Repo

```
src/            Frontend (React + Tailwind + Vite) -- lihat detail di bawah
public/         Aset statis (ikon PWA, favicon)
index.html      Entry point Vite
database/       Skema Postgres/Supabase + urutan migrasi (lihat MIGRATION_NOTES.md)
supabase/       Edge Function notify-dispatch (opsional, notifikasi email/push)
```

Root repo **adalah** proyek Vite (bukan monorepo dengan sub-folder frontend) —
supaya Vercel bisa deploy langsung tanpa konfigurasi "Root Directory" khusus.
`database/` dan `supabase/` tidak ikut proses build frontend; keduanya
murni referensi untuk setup Supabase.

## Stack

- **Frontend**: React 19 + TailwindCSS 4 + Vite, routing dengan
  `react-router-dom`, PWA lewat `vite-plugin-pwa`. Struktur Atomic Design
  (`components/atoms|molecules|organisms`, `layouts/`, `pages/`, `lib/`
  untuk logika murni yang testable, `context/` untuk auth).
- **Backend**: [Supabase](https://supabase.com) — Postgres, Auth, dan
  auto-generated REST API (PostgREST), diamankan dengan Row Level Security.
  Frontend memanggil REST API langsung lewat `fetch()` (lihat
  `src/lib/supabaseApi.js`).

## Setup Lokal

```bash
npm install
npm run dev       # server pengembangan, hot-reload di http://localhost:5173
npm run build      # build produksi -> folder dist/
npm run preview    # jalankan hasil build secara lokal untuk dicek
npm test            # jalankan seluruh test (Vitest) -- 59 test, harus lolos semua
npm run lint          # oxlint
```

### Konfigurasi Supabase (`.env.local`, opsional)

Secara default `src/lib/supabaseApi.js` sudah berisi URL + anon key project
Supabase yang berjalan (anon key memang didesain aman untuk terlihat
publik — keamanan sesungguhnya ada di RLS, bukan menyembunyikan key ini).
Untuk memakai project Supabase lain (mis. staging terpisah dari
produksi), salin `.env.example` ke `.env.local` dan isi:

```
VITE_SUPABASE_URL=https://project-anda.supabase.co
VITE_SUPABASE_ANON_KEY=anon-public-key-anda
```

## Setup Database (Supabase) — jika membuat project baru

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan seluruh file di `database/` sesuai urutan
   di `database/MIGRATION_NOTES.md`: `schema.sql` → `rls_policies.sql` →
   `batch1` → `batch2` → `batch3` → `batch4` → `batch5` → opsional
   `seed_dummy_data.sql`.
3. Salin **Project URL** dan **anon/public API key** dari **Settings → API**
   ke `.env.local` (lihat di atas).

> **Catatan untuk project produksi yang sudah berjalan**
> (`Data HRD Al-Falah`): migrasi sampai `batch4` sudah dieksekusi dan
> diverifikasi. `batch5_notification_dedup_fix.sql` adalah perbaikan bug
> dedup-notifikasi yang **masih perlu dijalankan manual** satu kali di SQL
> Editor project produksi Anda — lihat `database/MIGRATION_NOTES.md` untuk
> detail dan query verifikasi.

## Deploy ke Vercel

Repo ini sudah menyertakan `vercel.json` di root — build command, output
directory, dan SPA rewrite (penting untuk `react-router-dom` `BrowserRouter`)
sudah dikonfigurasi otomatis:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Langkah:

1. Push repo ini ke GitHub (lihat bagian **Push ke GitHub** di bawah).
2. Di [vercel.com](https://vercel.com), **Add New → Project**, import repo
   ini. Vercel akan mendeteksi framework Vite secara otomatis dari
   `vercel.json`/`package.json` — tidak perlu mengubah pengaturan build.
3. **(Opsional tapi direkomendasikan)** di tab **Settings → Environment
   Variables**, tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
   kalau Anda ingin memisahkan environment (mis. Preview vs Production
   menunjuk ke project Supabase berbeda). Tanpa ini, build tetap berhasil
   memakai nilai default yang sudah ada di kode.
4. Klik **Deploy**. Setelah selesai, buka domain `*.vercel.app` yang
   diberikan — refresh di route seperti `/biodata/<id>` akan tetap
   berfungsi (bukan 404) berkat baris `rewrites` di `vercel.json`.

## Push ke GitHub

Repo ini sudah diinisialisasi sebagai git repo lokal dengan commit awal.
Untuk mengunggahnya:

```bash
git remote add origin https://github.com/<username-anda>/hris-alfalah.git
git branch -M main
git push -u origin main
```

(Ganti URL di atas dengan repo GitHub kosong yang sudah Anda buat.)

## Peran Pengguna (Role)

| Role | Akses |
|---|---|
| `admin` | Akses penuh — kelola data pegawai, master data, dan peran pengguna lain |
| `hrd_staff` | Tambah/edit data pegawai & penilaian kinerja, tidak bisa hapus atau kelola peran |
| `pimpinan` | Hanya melihat dashboard & biodata (read-only) |
| `pending` | Akun baru mendaftar tapi belum diberi peran — tidak ada akses data |

Pengguna **pertama** yang mendaftar otomatis menjadi `admin` (trigger
`fn_handle_new_user` di `database/schema.sql`). Pengguna berikutnya
berstatus `pending` sampai di-upgrade manual lewat tabel `user_roles`.

## Perbaikan bug pada sesi ini (dari draf `hris-react-fixed` sebelumnya)

Paket `hris-react-fixed` yang diberikan sebelumnya **tidak bisa langsung
di-install/build/push** — beberapa berkas penting hilang atau rusak.
Semua sudah diperbaiki di repo ini:

| # | Masalah | Perbaikan |
|---|---|---|
| 1 | **`package.json` tidak ada sama sekali** di paket asli (hanya `package-lock.json`) — `npm install` akan langsung gagal. | Direkonstruksi dari dependensi persis di `package-lock.json`, dengan script (`dev`/`build`/`preview`/`test`/`lint`) sesuai yang didokumentasikan di README lama. |
| 2 | `vitest.config.js` adalah file **kosong (0 byte)** — test tidak punya environment `jsdom`, `globals`, atau `setupFiles` (`test-setup.js` yang mengaktifkan `jest-dom` matcher tidak pernah dimuat). | Ditulis ulang dengan konfigurasi lengkap; 59 test tetap 100% lolos setelah perbaikan. |
| 3 | Ada folder sampah literal bernama `src/{lib,context,components...}` — bekas `mkdir -p src/{a,b,c}/` yang dijalankan di shell tanpa brace-expansion, jadi membuat satu folder aneh alih-alih beberapa folder. | Dihapus. Tidak mempengaruhi kode (folder itu kosong/tidak direferensikan), tapi akan membingungkan dan mengotori repo di GitHub. |
| 4 | **Sesi login tidak pernah disimpan** — `AuthContext` hanya menyimpan sesi di `useState`, jadi refresh halaman atau membuka tab baru langsung melempar pengguna ke halaman login meski token Supabase mereka sebenarnya masih berlaku (ini bug lama, sama-sama ada di versi vanilla JS maupun draf React sebelumnya, bukan regresi baru). | `AuthContext` sekarang menyimpan `refresh_token` di `localStorage` dan memakainya untuk memulihkan sesi otomatis saat aplikasi dibuka ulang (lewat endpoint resmi Supabase `grant_type=refresh_token`), dengan state `initializing` baru supaya route guard menunggu proses pemulihan alih-alih sempat "berkedip" redirect ke `/login`. |
| 5 | Supabase URL & anon key hardcode langsung di source (`supabaseApi.js`) — bekerja, tapi tidak ideal untuk repo yang akan didorong ke GitHub/Vercel dan mungkin perlu env berbeda (staging vs produksi). | Dipindah untuk membaca `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` dari env Vite terlebih dahulu, dengan fallback ke nilai lama supaya tetap jalan tanpa setup tambahan. Ditambahkan `.env.example`. |
| 6 | 1 warning oxlint (`no-useless-fallback-in-spread` di `supabaseApi.js`). | Diperbaiki (spread langsung tanpa fallback `\|\| {}` yang tidak perlu). |

Setelah semua perbaikan di atas: `npm install`, `npm test` (59/59 lolos),
`npm run lint` (0 warning/error), dan `npm run build` semuanya berjalan
bersih dari kondisi repo apa adanya.

## Keterbatasan yang jujur perlu diketahui (belum berubah dari draf sebelumnya)

Ini bukan "bug" dalam arti kode yang salah/rusak, melainkan cakupan fitur
yang memang belum dibangun — dicatat di sini supaya tidak diklaim selesai:

- Tab **Pendidikan / Dokumen / Kinerja / Cuti** di dalam halaman Profil
  Pegawai masih menampilkan placeholder "Segera hadir di halaman ini".
  Datanya sudah ada dan berfungsi penuh di database (`batch1`-`batch3`,
  termasuk RLS berbasis role), tapi UI React untuk keempat tab itu belum
  dibangun.
- Realtime notifikasi (Supabase WebSocket) dan fetch hari libur dari GitHub
  belum pernah diuji sebagai koneksi jaringan sungguhan dari browser di
  lingkungan ini (hanya logikanya yang diuji lewat Vitest) — coba sekali
  secara manual di browser nyata setelah deploy.
- `xlsx` (SheetJS) di halaman Ekspor/Impor punya 2 celah keamanan lama
  tanpa fix resmi di npm registry (`npm audit`). Rekomendasi: install dari
  `https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz` (versi terpatch
  resmi SheetJS) alih-alih dari npm registry.
- **Notifikasi email/push** (`fn_dispatch_notification`, Edge Function
  `notify-dispatch`) tetap dorman sampai Anda mengatur secrets sendiri
  (`SENDGRID_API_KEY`, `ONESIGNAL_APP_ID`, dll.) — lihat
  `database/MIGRATION_NOTES.md`.

## Keamanan

- Semua tabel dilindungi Row Level Security (RLS) di level database —
  aturan akses tetap berlaku meski anon API key diketahui pihak lain.
- Password di-hash otomatis oleh Supabase Auth (GoTrue).
- Data sensitif (gaji, NIK, BPJS) hanya bisa diakses oleh role yang
  berwenang sesuai kebijakan di `database/rls_policies.sql`.
- Yang disimpan di `localStorage` browser hanyalah *refresh token* (untuk
  memulihkan sesi) — bukan password, dan sama persis dengan yang disimpan
  SDK resmi `@supabase/supabase-js` secara default.
