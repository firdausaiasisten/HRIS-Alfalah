-- =========================================================
-- HRIS Al-Falah — Database Schema (Supabase / PostgreSQL)
-- Project: Data HRD Al-Falah
-- Generated as documentation of the live schema applied via
-- Supabase migrations. Re-running this file on a fresh Supabase
-- project will reproduce the same structure.
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- MASTER / LOOKUP TABLES
-- =========================================================

create table if not exists m_unit_kerja (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama text not null,
  keterangan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists m_departemen (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama text not null,
  unit_kerja_id uuid references m_unit_kerja(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists m_jabatan (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama text not null,
  jenis text check (jenis in ('struktural','fungsional')) default 'struktural',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists m_status_kepegawaian (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama text not null
);

create table if not exists m_jenis_kepegawaian (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama text not null
);

create table if not exists m_bank (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama text not null
);

create table if not exists m_agama (
  id uuid primary key default gen_random_uuid(),
  nama text unique not null
);

create table if not exists m_status_perkawinan (
  id uuid primary key default gen_random_uuid(),
  nama text unique not null
);

-- =========================================================
-- EMPLOYEE MASTER (core)
-- =========================================================

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_number text unique not null,
  nik text unique,
  nuptk text,
  full_name text not null,
  nickname text,
  front_title text,
  back_title text,
  gender text check (gender in ('L','P')),
  birth_place text,
  birth_date date,
  agama_id uuid references m_agama(id),
  blood_type text,
  status_perkawinan_id uuid references m_status_perkawinan(id),
  nationality text default 'Indonesia',
  photo_url text,

  phone text,
  mobile_phone text,
  personal_email text,
  institution_email text,
  address text,
  province text,
  regency text,
  district text,
  village text,
  postal_code text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,

  status_kepegawaian_id uuid references m_status_kepegawaian(id),
  jenis_kepegawaian_id uuid references m_jenis_kepegawaian(id),
  unit_kerja_id uuid references m_unit_kerja(id),
  departemen_id uuid references m_departemen(id),
  jabatan_id uuid references m_jabatan(id),
  grade text,
  rank text,
  join_date date,
  appointment_date date,
  contract_start date,
  contract_end date,
  retirement_date date,
  active_status boolean default true,

  highest_education text,
  major text,
  university text,
  graduation_year int,
  gpa numeric(3,2),

  bank_id uuid references m_bank(id),
  bank_account_number text,
  bank_account_holder text,
  tax_number text,
  tax_status text,
  bpjs_health_number text,
  bpjs_employment_number text,
  basic_salary numeric(14,2),
  allowances numeric(14,2) default 0,
  incentives numeric(14,2) default 0,

  shift text,
  work_schedule text,
  fingerprint_id text,
  rfid text,
  face_recognition_id text,

  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,

  -- Links this employee record to their login account, once they have one.
  -- Nullable: not every employee has (or needs) app access. This is the
  -- reliable way to answer "which employee is the current logged-in user",
  -- instead of matching institution_email against the session email on
  -- every request client-side.
  auth_user_id uuid references auth.users(id)
);

create unique index if not exists ux_employees_auth_user on employees(auth_user_id) where auth_user_id is not null;

create index if not exists idx_employees_unit on employees(unit_kerja_id);
create index if not exists idx_employees_status on employees(status_kepegawaian_id);
create index if not exists idx_employees_active on employees(active_status) where deleted_at is null;
create index if not exists idx_employees_agama on employees(agama_id);
create index if not exists idx_employees_bank on employees(bank_id);
create index if not exists idx_employees_departemen on employees(departemen_id);
create index if not exists idx_employees_jabatan on employees(jabatan_id);
create index if not exists idx_employees_jenis_kepegawaian on employees(jenis_kepegawaian_id);
create index if not exists idx_employees_status_perkawinan on employees(status_perkawinan_id);

-- =========================================================
-- EMPLOYEE CHILD TABLES (1-to-many)
-- =========================================================

create table if not exists employee_certifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  certificate_name text not null,
  certificate_number text,
  issuer text,
  issue_date date,
  expiry_date date,
  created_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);
create index if not exists idx_certs_employee on employee_certifications(employee_id);

create table if not exists employee_competencies (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  skill_name text not null,
  level text,
  years_experience numeric(4,1),
  created_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);
create index if not exists idx_comp_employee on employee_competencies(employee_id);

create table if not exists employee_family (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  name text not null,
  relationship text,
  birth_place text,
  birth_date date,
  is_dependent boolean default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);
create index if not exists idx_family_employee on employee_family(employee_id);

-- NOTE: the legacy `employee_documents` table used to be defined here. It has
-- been removed because `batch1_family_education_documents.sql` defines a
-- superseding, richer version of this table (per the README's own
-- modularization roadmap, this module is already "done"). Keeping both
-- definitions caused `create table if not exists` to silently keep this old,
-- flatter version active and skip the new one -- confirmed by actually
-- running both files in order against Postgres. If you're setting this
-- project up fresh, run schema.sql, then rls_policies.sql, then
-- batch1_family_education_documents.sql, and `employee_documents` will be
-- created there instead, in its intended form.

create table if not exists employee_teaching_assignment (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  subject text,
  grade_level text,
  is_homeroom_teacher boolean default false,
  extracurricular text,
  is_tahfizh_teacher boolean default false,
  is_dormitory_supervisor boolean default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);
create index if not exists idx_teach_employee on employee_teaching_assignment(employee_id);

-- =========================================================
-- PERFORMANCE REVIEWS (historical, many per employee)
-- =========================================================

create table if not exists performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,

  review_period text not null,
  review_type text check (review_type in ('Triwulan','Semester','Tahunan','Probation')) default 'Semester',

  reviewer_name text,
  reviewer_position text,
  review_date date not null default current_date,

  score_discipline numeric(4,1),
  score_quality numeric(4,1),
  score_productivity numeric(4,1),
  score_teamwork numeric(4,1),
  score_initiative numeric(4,1),
  score_adab numeric(4,1),

  -- score_total & predikat are auto-calculated by fn_calc_performance_review() trigger
  score_total numeric(5,2),
  predikat text,

  target_kinerja text,
  realisasi text,
  pencapaian_persen numeric(5,2),

  catatan_kekuatan text,
  catatan_perbaikan text,
  rencana_pengembangan text,

  rekomendasi text check (rekomendasi in ('Promosi','Kenaikan Gaji','Pembinaan','Perpanjangan Kontrak','Tidak Diperpanjang','Dipertahankan')),
  status_approval text check (status_approval in ('Draft','Menunggu Persetujuan','Disetujui')) default 'Draft',

  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz
);
create index if not exists idx_perf_employee on performance_reviews(employee_id);

create or replace function fn_calc_performance_review()
returns trigger as $$
declare
  total numeric(5,2);
  cnt int;
begin
  cnt := (case when new.score_discipline is null then 0 else 1 end)
       + (case when new.score_quality is null then 0 else 1 end)
       + (case when new.score_productivity is null then 0 else 1 end)
       + (case when new.score_teamwork is null then 0 else 1 end)
       + (case when new.score_initiative is null then 0 else 1 end)
       + (case when new.score_adab is null then 0 else 1 end);

  if cnt = 0 then
    total := null;
  else
    total := round(
      (coalesce(new.score_discipline,0) + coalesce(new.score_quality,0) + coalesce(new.score_productivity,0)
       + coalesce(new.score_teamwork,0) + coalesce(new.score_initiative,0) + coalesce(new.score_adab,0)) / cnt
    , 2);
  end if;

  new.score_total := total;
  new.predikat := case
    when total is null then null
    when total >= 90 then 'Sangat Baik'
    when total >= 75 then 'Baik'
    when total >= 60 then 'Cukup'
    else 'Kurang'
  end;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

drop trigger if exists trg_calc_performance_review on performance_reviews;
create trigger trg_calc_performance_review
before insert or update on performance_reviews
for each row execute function fn_calc_performance_review();

-- =========================================================
-- EMPLOYMENT HISTORY (mutasi/promosi, never overwritten)
-- =========================================================

create table if not exists employment_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  change_type text check (change_type in ('Rekrutmen','Penempatan','Promosi','Mutasi','Perpanjangan Kontrak','Pensiun','Resign')) not null,
  effective_date date not null,
  jabatan_lama_id uuid references m_jabatan(id),
  jabatan_baru_id uuid references m_jabatan(id),
  unit_kerja_lama_id uuid references m_unit_kerja(id),
  unit_kerja_baru_id uuid references m_unit_kerja(id),
  gaji_lama numeric(14,2),
  gaji_baru numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists idx_history_employee on employment_history(employee_id);
create index if not exists idx_history_jabatan_baru on employment_history(jabatan_baru_id);
create index if not exists idx_history_jabatan_lama on employment_history(jabatan_lama_id);
create index if not exists idx_history_unit_baru on employment_history(unit_kerja_baru_id);
create index if not exists idx_history_unit_lama on employment_history(unit_kerja_lama_id);

-- =========================================================
-- AUTH / ROLES
-- =========================================================

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  role text not null check (role in ('admin','hrd_staff','pimpinan','pending')),
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function fn_current_role()
returns text as $$
  select role from user_roles where user_id = auth.uid();
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function fn_current_role() from public;
grant execute on function fn_current_role() to authenticated;


-- =========================================================
-- NOTIFICATIONS TABLE
-- =========================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  message text not null,
  created_at timestamptz not null default now(),
  is_read boolean default false
);

create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_notifications_unread on notifications(is_read) where is_read = false;

-- =========================================================
-- LEAVE REQUESTS TABLE
-- =========================================================
create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null,
  start_date date not null,
  end_date date not null,
  notes text,
  status text default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  approver_id uuid references auth.users(id)
);

create index if not exists idx_leave_requests_employee on leave_requests(employee_id);
create index if not exists idx_leave_requests_status on leave_requests(status);

-- Trigger to create notification on insert or status change
create or replace function fn_notify_leave() returns trigger as $$
declare
  v_auth_user_id uuid;
begin
  -- employee_id is an employees.id, not an auth.users.id -- resolve the
  -- actual linked login account before inserting into notifications, which
  -- has a real FK to auth.users. If this employee has no linked account yet
  -- (auth_user_id is null), there's no one to notify; skip quietly rather
  -- than inserting a row that fails the foreign key or points nowhere.
  select auth_user_id into v_auth_user_id from employees where id = new.employee_id;
  if v_auth_user_id is null then
    return new;
  end if;

  if (tg_op = 'INSERT') then
    insert into notifications(user_id, type, message) values (v_auth_user_id, 'Leave Request', 'Permintaan cuti baru telah diajukan.');
  elsif (tg_op = 'UPDATE') then
    if (old.status <> new.status) then
      insert into notifications(user_id, type, message) values (v_auth_user_id, 'Leave Update', 'Status cuti Anda berubah menjadi ' || new.status);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_notify_leave after insert or update on leave_requests for each row execute function fn_notify_leave();

-- everyone after that gets 'pending' until an admin promotes them. the full policy set.
-- Summary:
--   * Master tables: SELECT for any authenticated user, write = admin only
--   * employees / child tables / performance_reviews / employment_history:
--       SELECT = admin, hrd_staff, pimpinan
--       INSERT/UPDATE = admin, hrd_staff
create or replace function fn_handle_new_user()
returns trigger as $$
declare
  is_first boolean;
begin
  is_first := (select count(*) from user_roles) = 0;
  insert into user_roles (user_id, role, full_name)
  values (
    new.id,
    case when is_first then 'admin' else 'pending' end,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (user_id) do nothing;

  -- Auto-link this login to a matching employee record, if one exists and
  -- isn't already linked to a different account. This is what lets the app
  -- reliably answer "which employee is the current user" (leave requests,
  -- notifications) instead of comparing email strings on every request.
  update employees
  set auth_user_id = new.id
  where new.email is not null
    and lower(institution_email) = lower(new.email)
    and auth_user_id is null;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke execute on function fn_handle_new_user() from public;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
after insert on auth.users
for each row execute function fn_handle_new_user();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
-- See database/rls_policies.sql for the full policy set.
-- Summary:
--   * Master tables: SELECT for any authenticated user, write = admin only
--   * employees / child tables / performance_reviews / employment_history:
--       SELECT = admin, hrd_staff, pimpinan
--       INSERT/UPDATE = admin, hrd_staff
--       DELETE = admin only
--   * user_roles: users can read their own row; only admin can read/write all
