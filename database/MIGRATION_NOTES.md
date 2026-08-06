# Catatan Migrasi

## Perbaikan terbaru: `schema.sql` benar-benar tidak lagi mendefinisikan `employee_certifications`/`employee_competencies`

Catatan di bawah ini ("Untuk instalasi baru") **sudah lama menyatakan**
bahwa `schema.sql` tidak lagi mendefinisikan kedua tabel itu — tapi
sebelumnya klaim itu **tidak sesuai dengan isi file yang sebenarnya**:
`schema.sql` masih memuat definisi lama (flat, tanpa `document_id`/
`competency_level_id`), jadi menjalankan urutan resmi (`schema.sql` →
`rls_policies.sql` → `batch1` → `batch2`) pada database yang benar-benar
kosong tetap kena bug collision "diam-diam" yang dijelaskan di bagian
"⚠️ Untuk database yang dibuat dari schema.sql versi SEBELUMNYA" — padahal
seharusnya bug itu hanya menimpa database lama, bukan instalasi fresh.
Ini dikonfirmasi dengan menjalankan seluruh rantai migrasi dari database
kosong: `batch2` gagal persis di `CREATE INDEX ... (document_id)` karena
tabel lama dari `schema.sql` yang menang. `schema.sql` dan
`rls_policies.sql` sudah diperbaiki (definisi lama dihapus dari
`schema.sql`, referensi ke kedua tabel itu dihapus dari loop RLS awal di
`rls_policies.sql`) — sudah diverifikasi ulang: rantai migrasi lengkap dari
database kosong sekarang berjalan tanpa error sampai `seed_dummy_data.sql`.

Catatan untuk project Supabase produksi (`Data HRD Al-Falah`) yang sudah
ada: karena `batch2_remaining_modules.sql` sebelumnya sudah berhasil
dijalankan di sana (per catatan status di README.md), kemungkinan besar
tabel produksi **sudah** dalam bentuk yang benar (dari batch2, bukan dari
definisi lama `schema.sql`) — jalankan query verifikasi di bawah ini kalau
ingin memastikan, tidak perlu mengulang migrasi kalau kolomnya sudah ada:

```sql
select column_name from information_schema.columns
where table_name = 'employee_certifications' and column_name = 'document_id';
select column_name from information_schema.columns
where table_name = 'employee_competencies' and column_name = 'competency_level_id';
```

Kalau kedua query itu mengembalikan baris, database produksi sudah aman
dan perbaikan `schema.sql`/`rls_policies.sql` ini hanya relevan untuk
instalasi fresh berikutnya (bukan untuk dijalankan ulang di produksi).

## Untuk instalasi baru (fresh database)

Jalankan berurutan: `schema.sql` → `rls_policies.sql` → `batch1_family_education_documents.sql`
→ `batch2_remaining_modules.sql` → `batch3_selfservice_notifications.sql` →
`batch4_institutional_calendar.sql` → `batch5_notification_dedup_fix.sql` →
(opsional) `seed_dummy_data.sql`.

`batch5_notification_dedup_fix.sql` memperbaiki bug pada
`fn_check_expiring_contracts()`: guard anti-duplikat notifikasi tim
sebelumnya mencocokkan `message like '%'||full_name||'%'`, yang bisa salah
match kalau ada dua pegawai dengan nama yang satu adalah substring dari
yang lain (mis. "Budi" dan "Budi Santoso") — notifikasi pegawai kedua bisa
gagal terkirim karena dianggap sudah pernah dikirim. Batch ini menambah
kolom `notifications.employee_id` dan mengganti guard-nya memakai kolom
itu (dikonfirmasi lewat pengujian nyata: dua pegawai bernama tumpang
tindih substring, keduanya sekarang benar-benar dapat notifikasi
terpisah, dan menjalankan fungsi dua kali di hari yang sama tidak
menduplikasi).

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
