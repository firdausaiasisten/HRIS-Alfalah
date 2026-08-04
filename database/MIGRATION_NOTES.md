# Catatan Migrasi

## Untuk instalasi baru (fresh database)

Jalankan berurutan: `schema.sql` → `rls_policies.sql` → `batch1_family_education_documents.sql`
→ `batch2_remaining_modules.sql` → `batch3_selfservice_notifications.sql` →
`batch4_institutional_calendar.sql` → (opsional) `seed_dummy_data.sql`.

`schema.sql` versi ini **sudah termasuk** `employees.auth_user_id`, tabel
`notifications`, dan tabel `leave_requests` sejak awal — jadi `batch2` dan
`batch3` bisa langsung diterapkan tanpa langkah tambahan.

`schema.sql` **sengaja tidak lagi mendefinisikan** `employee_certifications`
dan `employee_competencies` di sini — keduanya didefinisikan dengan struktur
yang lebih lengkap (FK ke `employee_documents`, tabel level kompetensi, audit
trail) di `batch2_remaining_modules.sql`.

## ⚠️ Untuk database yang dibuat dari `schema.sql` versi SEBELUMNYA

Kalau project Supabase Anda dibuat sebelum revisi ini — artinya tabel
`employee_certifications` dan `employee_competencies` **masih memakai struktur
lama** (tanpa `updated_at`, tanpa FK ke `employee_documents`/level kompetensi)
— **jangan langsung jalankan `batch2_remaining_modules.sql` apa adanya**.

`CREATE TABLE IF NOT EXISTS` pada tabel yang sudah ada akan **diam-diam tidak
melakukan apa-apa** ke strukturnya (bukan error, bukan warning — betul-betul
senyap). File batch2 kemudian tetap memasang trigger yang mengisi kolom
`updated_at` pada setiap `UPDATE` — kalau kolom itu belum ada di tabel lama
Anda, baris pertama yang di-*update* akan **gagal saat runtime**, bukan saat
migrasi dijalankan.

**Langkah aman**, jalankan dulu (setelah memverifikasi kedua tabel itu boleh
dikosongkan/tidak ada data penting yang hilang):

```sql
-- Cek dulu jumlah barisnya
select 'employee_certifications' t, count(*) from employee_certifications
union all select 'employee_competencies', count(*) from employee_competencies;

-- Kalau amunisi di atas 0 (atau sudah di-backup), baru:
drop table if exists employee_certifications cascade;
drop table if exists employee_competencies cascade;
```

Baru setelah itu jalankan `batch2_remaining_modules.sql` seperti biasa.

Ini persis migrasi yang diterapkan ke project Supabase produksi HRIS Al-Falah
(`Data HRD Al-Falah`) saat batch2 pertama kali dijalankan di sana.

## Fitur yang butuh konfigurasi tambahan (opsional, tidak aktif secara default)

- **Notifikasi email/push** (`fn_dispatch_notification`, Edge Function
  `notify-dispatch`): tetap dorman sampai Anda mengatur
  `app.notify_webhook_url` di Postgres dan secrets (`SENDGRID_API_KEY`,
  `ONESIGNAL_APP_ID`, dll.) di Edge Function. Lihat komentar setup di
  `supabase/functions/notify-dispatch/index.ts`.
- **Pengecekan kontrak akan berakhir otomatis** (`fn_check_expiring_contracts`):
  perlu extension `pg_net` dan `pg_cron` aktif, lalu dijadwalkan lewat:
  ```sql
  select cron.schedule('check-expiring-contracts', '0 6 * * *', 'select fn_check_expiring_contracts(30)');
  ```
