-- =========================================================
-- HRIS Al-Falah — Batch 2: remaining roadmap modules
-- (employee_contact, employee_bank, employee_payroll,
--  employee_certifications/employee_competencies refined,
--  employee_training, employee_language, employee_leave [balances],
--  employee_attendance_setting, employee_position_history,
--  employee_salary_history, employee_transfer_history,
--  employee_rewards, employee_punishment)
-- Run after schema.sql + rls_policies.sql + batch1. Reuses
-- fn_hris_audit() / fn_set_updated_at() defined in batch1.
-- =========================================================

-- =========================================================
-- MODULE: employee_contacts
-- =========================================================

create table if not exists employee_contacts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  contact_type text not null check (contact_type in ('home','work','emergency','other')),
  label text,
  full_name text,
  relationship text,
  phone text,
  email text,
  address text,
  is_primary boolean not null default false,
  notes text,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz
);
create unique index if not exists ux_contacts_primary_per_type
  on employee_contacts(employee_id, contact_type) where is_primary and deleted_at is null;
create index if not exists idx_contacts_employee on employee_contacts(employee_id);

create trigger trg_updated_at_employee_contacts before update on employee_contacts
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_contacts after insert or update or delete on employee_contacts
for each row execute function fn_hris_audit();

alter table employee_contacts enable row level security;
create policy "select all roles" on employee_contacts for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_contacts for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_contacts for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_contacts for delete using ((select fn_current_role()) = 'admin');

-- =========================================================
-- MODULE: employee_bank_accounts
-- =========================================================

create table if not exists employee_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  bank_id uuid not null references m_bank(id),
  account_number text not null,
  account_holder_name text not null,
  branch text,
  is_primary boolean not null default false,
  notes text,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz
);
create unique index if not exists ux_bank_accounts_primary
  on employee_bank_accounts(employee_id) where is_primary and deleted_at is null;
create unique index if not exists ux_bank_accounts_unique
  on employee_bank_accounts(employee_id, bank_id, account_number) where deleted_at is null;
create index if not exists idx_bank_accounts_employee on employee_bank_accounts(employee_id);

create trigger trg_updated_at_employee_bank_accounts before update on employee_bank_accounts
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_bank_accounts after insert or update or delete on employee_bank_accounts
for each row execute function fn_hris_audit();

alter table employee_bank_accounts enable row level security;
create policy "select all roles" on employee_bank_accounts for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_bank_accounts for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_bank_accounts for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_bank_accounts for delete using ((select fn_current_role()) = 'admin');

-- =========================================================
-- MODULE: employee_payroll (component-based)
-- =========================================================

create table if not exists payroll_component_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('earning','deduction')),
  is_taxable boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists employee_payroll_components (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  component_type_id uuid not null references payroll_component_types(id),
  amount numeric(14,2) not null,
  is_percentage boolean not null default false,
  effective_from date not null,
  effective_to date,
  notes text,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz,
  constraint chk_payroll_dates check (effective_to is null or effective_from <= effective_to)
);
create index if not exists idx_payroll_employee on employee_payroll_components(employee_id);
create index if not exists idx_payroll_type on employee_payroll_components(component_type_id);

create trigger trg_updated_at_employee_payroll before update on employee_payroll_components
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_payroll after insert or update or delete on employee_payroll_components
for each row execute function fn_hris_audit();

alter table payroll_component_types enable row level security;
alter table employee_payroll_components enable row level security;

create policy "master select" on payroll_component_types for select using ((select auth.role()) = 'authenticated');
create policy "master insert" on payroll_component_types for insert with check ((select fn_current_role()) = 'admin');
create policy "master update" on payroll_component_types for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "master delete" on payroll_component_types for delete using ((select fn_current_role()) = 'admin');

create policy "select admin only" on employee_payroll_components for select using ((select fn_current_role()) = 'admin');
create policy "insert admin only" on employee_payroll_components for insert with check ((select fn_current_role()) = 'admin');
create policy "update admin only" on employee_payroll_components for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "delete admin only" on employee_payroll_components for delete using ((select fn_current_role()) = 'admin');

insert into payroll_component_types (code, name, category, is_taxable) values
  ('BASIC','Gaji Pokok','earning', true),
  ('TUNJ_JABATAN','Tunjangan Jabatan','earning', true),
  ('TUNJ_ANAK','Tunjangan Anak','earning', false),
  ('TUNJ_MAKAN','Tunjangan Makan','earning', false),
  ('INSENTIF','Insentif Kinerja','earning', true),
  ('BPJS_KES','Potongan BPJS Kesehatan','deduction', false),
  ('BPJS_TK','Potongan BPJS Ketenagakerjaan','deduction', false),
  ('PPH21','Potongan PPh 21','deduction', false)
on conflict (code) do nothing;

-- =========================================================
-- MODULE: employee_certifications (redefined: FK + audit trail)
-- =========================================================

create table if not exists employee_certifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  certificate_name text not null,
  certificate_number text,
  issuer text,
  issue_date date,
  expiry_date date,
  document_id uuid references employee_documents(id),
  notes text,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz,
  constraint chk_cert_dates check (issue_date is null or expiry_date is null or issue_date <= expiry_date)
);
create index if not exists idx_certs_employee on employee_certifications(employee_id);
create index if not exists idx_certs_document on employee_certifications(document_id);

create trigger trg_updated_at_employee_certifications before update on employee_certifications
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_certifications after insert or update or delete on employee_certifications
for each row execute function fn_hris_audit();

alter table employee_certifications enable row level security;
create policy "select all roles" on employee_certifications for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_certifications for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_certifications for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_certifications for delete using ((select fn_current_role()) = 'admin');

-- =========================================================
-- MODULE: employee_competencies (redefined: FK + audit trail)
-- =========================================================

create table if not exists competency_levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  rank integer not null,
  created_at timestamptz not null default now()
);

create table if not exists employee_competencies (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  skill_name text not null,
  competency_level_id uuid references competency_levels(id),
  years_experience numeric(4,1),
  notes text,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz
);
create index if not exists idx_comp_employee on employee_competencies(employee_id);
create index if not exists idx_comp_level on employee_competencies(competency_level_id);

create trigger trg_updated_at_employee_competencies before update on employee_competencies
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_competencies after insert or update or delete on employee_competencies
for each row execute function fn_hris_audit();

alter table competency_levels enable row level security;
alter table employee_competencies enable row level security;

create policy "master select" on competency_levels for select using ((select auth.role()) = 'authenticated');
create policy "master insert" on competency_levels for insert with check ((select fn_current_role()) = 'admin');
create policy "master update" on competency_levels for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "master delete" on competency_levels for delete using ((select fn_current_role()) = 'admin');

create policy "select all roles" on employee_competencies for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_competencies for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_competencies for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_competencies for delete using ((select fn_current_role()) = 'admin');

insert into competency_levels (code, name, rank) values
  ('BEGINNER','Pemula',1), ('INTERMEDIATE','Menengah',2), ('ADVANCED','Mahir',3), ('EXPERT','Ahli',4)
on conflict (code) do nothing;

-- =========================================================
-- MODULE: employee_trainings
-- =========================================================

create table if not exists employee_trainings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  training_name text not null,
  provider text,
  training_type text check (training_type in ('Internal','Eksternal','Daring','Sertifikasi')),
  start_date date,
  end_date date,
  duration_hours numeric(6,1),
  result text,
  certificate_document_id uuid references employee_documents(id),
  notes text,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz,
  constraint chk_training_dates check (start_date is null or end_date is null or start_date <= end_date)
);
create index if not exists idx_trainings_employee on employee_trainings(employee_id);

create trigger trg_updated_at_employee_trainings before update on employee_trainings
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_trainings after insert or update or delete on employee_trainings
for each row execute function fn_hris_audit();

alter table employee_trainings enable row level security;
create policy "select all roles" on employee_trainings for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_trainings for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_trainings for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_trainings for delete using ((select fn_current_role()) = 'admin');

-- =========================================================
-- MODULE: employee_languages
-- =========================================================

create table if not exists languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table if not exists employee_languages (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  language_id uuid not null references languages(id),
  proficiency_level_id uuid references competency_levels(id),
  can_speak boolean not null default true,
  can_read boolean not null default true,
  can_write boolean not null default true,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz
);
create unique index if not exists ux_employee_language on employee_languages(employee_id, language_id) where deleted_at is null;
create index if not exists idx_languages_employee on employee_languages(employee_id);

create trigger trg_updated_at_employee_languages before update on employee_languages
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_languages after insert or update or delete on employee_languages
for each row execute function fn_hris_audit();

alter table languages enable row level security;
alter table employee_languages enable row level security;

create policy "master select" on languages for select using ((select auth.role()) = 'authenticated');
create policy "master insert" on languages for insert with check ((select fn_current_role()) = 'admin');
create policy "master update" on languages for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "master delete" on languages for delete using ((select fn_current_role()) = 'admin');

create policy "select all roles" on employee_languages for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_languages for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_languages for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_languages for delete using ((select fn_current_role()) = 'admin');

insert into languages (code, name) values
  ('ID','Indonesia'),('EN','Inggris'),('AR','Arab'),('ZH','Mandarin')
on conflict (code) do nothing;

-- =========================================================
-- MODULE: employee_leave (leave BALANCE/quota configuration --
-- distinct from the transactional leave_requests table. used_days
-- is derived live via the view below, never stored, so it can't drift.
-- =========================================================

create table if not exists employee_leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('Cuti Tahunan','Cuti Sakit','Cuti Melahirkan','Izin Khusus','Cuti Lainnya')),
  year integer not null,
  entitled_days numeric(5,1) not null default 12,
  carried_over_days numeric(5,1) not null default 0,
  notes text,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz
);
create unique index if not exists ux_leave_balance_per_year
  on employee_leave_balances(employee_id, leave_type, year) where deleted_at is null;
create index if not exists idx_leave_balances_employee on employee_leave_balances(employee_id);

create trigger trg_updated_at_employee_leave_balances before update on employee_leave_balances
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_leave_balances after insert or update or delete on employee_leave_balances
for each row execute function fn_hris_audit();

alter table employee_leave_balances enable row level security;
create policy "select all roles" on employee_leave_balances for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_leave_balances for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_leave_balances for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_leave_balances for delete using ((select fn_current_role()) = 'admin');

create or replace view v_employee_leave_usage
with (security_invoker = true) as
select
  b.id as balance_id, b.employee_id, b.leave_type, b.year, b.entitled_days, b.carried_over_days,
  coalesce(sum(
    (least(lr.end_date, make_date(b.year,12,31)) - greatest(lr.start_date, make_date(b.year,1,1)) + 1)
  ) filter (
    where lr.status = 'Approved' and lr.type = b.leave_type
    and lr.start_date <= make_date(b.year,12,31) and lr.end_date >= make_date(b.year,1,1)
  ), 0) as used_days,
  b.entitled_days + b.carried_over_days - coalesce(sum(
    (least(lr.end_date, make_date(b.year,12,31)) - greatest(lr.start_date, make_date(b.year,1,1)) + 1)
  ) filter (
    where lr.status = 'Approved' and lr.type = b.leave_type
    and lr.start_date <= make_date(b.year,12,31) and lr.end_date >= make_date(b.year,1,1)
  ), 0) as remaining_days
from employee_leave_balances b
left join leave_requests lr on lr.employee_id = b.employee_id
where b.deleted_at is null
group by b.id, b.employee_id, b.leave_type, b.year, b.entitled_days, b.carried_over_days;

-- =========================================================
-- MODULE: employee_attendance_settings
-- =========================================================

create table if not exists shift_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  start_time time,
  end_time time,
  created_at timestamptz not null default now()
);

create table if not exists employee_attendance_settings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  shift_type_id uuid references shift_types(id),
  work_days integer[] not null default '{1,2,3,4,5}',
  effective_from date not null,
  effective_to date,
  notes text,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz,
  constraint chk_attendance_dates check (effective_to is null or effective_from <= effective_to),
  constraint chk_work_days_range check (work_days <@ array[1,2,3,4,5,6,7])
);
create index if not exists idx_attendance_employee on employee_attendance_settings(employee_id);

create trigger trg_updated_at_employee_attendance before update on employee_attendance_settings
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_attendance after insert or update or delete on employee_attendance_settings
for each row execute function fn_hris_audit();

alter table shift_types enable row level security;
alter table employee_attendance_settings enable row level security;

create policy "master select" on shift_types for select using ((select auth.role()) = 'authenticated');
create policy "master insert" on shift_types for insert with check ((select fn_current_role()) = 'admin');
create policy "master update" on shift_types for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "master delete" on shift_types for delete using ((select fn_current_role()) = 'admin');

create policy "select all roles" on employee_attendance_settings for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_attendance_settings for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_attendance_settings for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_attendance_settings for delete using ((select fn_current_role()) = 'admin');

insert into shift_types (code, name, start_time, end_time) values
  ('REGULER','Reguler', '07:30', '15:30'),
  ('PAGI','Shift Pagi', '06:00', '12:00'),
  ('SIANG','Shift Siang', '12:00', '18:00')
on conflict (code) do nothing;

-- =========================================================
-- MODULES: employee_position_history / employee_salary_history /
-- employee_transfer_history -- append-only, additive companions to
-- the existing employment_history (left untouched, still used by
-- loadAll() client-side).
-- =========================================================

create table if not exists employee_position_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  jabatan_id uuid references m_jabatan(id),
  grade text,
  rank text,
  effective_date date not null,
  decree_number text,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_pos_history_employee on employee_position_history(employee_id);
create trigger trg_audit_employee_position_history after insert or update or delete on employee_position_history
for each row execute function fn_hris_audit();

create table if not exists employee_salary_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  basic_salary_before numeric(14,2),
  basic_salary_after numeric(14,2) not null,
  allowances_before numeric(14,2),
  allowances_after numeric(14,2),
  effective_date date not null,
  decree_number text,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_salary_history_employee on employee_salary_history(employee_id);
create trigger trg_audit_employee_salary_history after insert or update or delete on employee_salary_history
for each row execute function fn_hris_audit();

create table if not exists employee_transfer_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  unit_kerja_lama_id uuid references m_unit_kerja(id),
  unit_kerja_baru_id uuid references m_unit_kerja(id),
  departemen_lama_id uuid references m_departemen(id),
  departemen_baru_id uuid references m_departemen(id),
  effective_date date not null,
  decree_number text,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_transfer_history_employee on employee_transfer_history(employee_id);
create trigger trg_audit_employee_transfer_history after insert or update or delete on employee_transfer_history
for each row execute function fn_hris_audit();

alter table employee_position_history enable row level security;
alter table employee_salary_history enable row level security;
alter table employee_transfer_history enable row level security;

do $$
declare t text;
begin
  foreach t in array array['employee_position_history','employee_transfer_history']
  loop
    execute format('create policy "select all roles" on %I for select using ((select fn_current_role()) in (''admin'',''hrd_staff'',''pimpinan''))', t);
    execute format('create policy "insert admin+hrd" on %I for insert with check ((select fn_current_role()) in (''admin'',''hrd_staff''))', t);
  end loop;
end $$;

create policy "select admin only" on employee_salary_history for select using ((select fn_current_role()) = 'admin');
create policy "insert admin only" on employee_salary_history for insert with check ((select fn_current_role()) = 'admin');

-- =========================================================
-- MODULE: employee_rewards
-- =========================================================

create table if not exists employee_rewards (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  reward_name text not null,
  category text check (category in ('Penghargaan','Insentif','Promosi Prestasi','Lainnya')),
  reward_date date not null,
  description text,
  given_by text,
  decree_number text,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz
);
create index if not exists idx_rewards_employee on employee_rewards(employee_id);

create trigger trg_updated_at_employee_rewards before update on employee_rewards
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_rewards after insert or update or delete on employee_rewards
for each row execute function fn_hris_audit();

alter table employee_rewards enable row level security;
create policy "select all roles" on employee_rewards for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_rewards for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_rewards for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_rewards for delete using ((select fn_current_role()) = 'admin');

-- =========================================================
-- MODULE: employee_punishment
-- =========================================================

create table if not exists employee_punishment (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  violation_type text not null,
  severity text not null check (severity in ('Ringan','Sedang','Berat')),
  violation_date date not null,
  description text,
  action_taken text,
  decree_number text,
  is_resolved boolean not null default false,
  resolved_date date,
  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_by uuid, deleted_at timestamptz,
  constraint chk_punishment_resolved_date check (resolved_date is null or resolved_date >= violation_date)
);
create index if not exists idx_punishment_employee on employee_punishment(employee_id);

create trigger trg_updated_at_employee_punishment before update on employee_punishment
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_punishment after insert or update or delete on employee_punishment
for each row execute function fn_hris_audit();

alter table employee_punishment enable row level security;
create policy "select admin only" on employee_punishment for select using ((select fn_current_role()) = 'admin');
create policy "insert admin only" on employee_punishment for insert with check ((select fn_current_role()) = 'admin');
create policy "update admin only" on employee_punishment for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "delete admin only" on employee_punishment for delete using ((select fn_current_role()) = 'admin');
