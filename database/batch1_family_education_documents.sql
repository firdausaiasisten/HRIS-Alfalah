-- =========================================================
-- HRIS Al-Falah — Batch 1: employee_family, employee_education,
-- employee_documents (normalized, enterprise-grade)
-- Run after schema.sql + rls_policies.sql.
-- =========================================================

-- =========================================================
-- GENERIC INFRASTRUCTURE (shared by all modules below and future ones)
-- =========================================================

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index if not exists idx_audit_log_table_record on audit_log(table_name, record_id);
create index if not exists idx_audit_log_changed_at on audit_log(changed_at);

alter table audit_log enable row level security;
create policy "audit select admin" on audit_log for select using ((select fn_current_role()) = 'admin');

-- Writes every insert/update/delete on tracked tables into audit_log.
-- SECURITY DEFINER so it can write regardless of the caller's own RLS grants,
-- but EXECUTE is revoked from all client roles — only triggers can invoke it.
create or replace function fn_hris_audit()
returns trigger as $$
begin
  insert into audit_log (table_name, record_id, action, old_data, new_data, changed_by)
  values (
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    TG_OP,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
revoke execute on function fn_hris_audit() from public, anon, authenticated;

-- BEFORE UPDATE trigger to keep updated_at accurate. AFTER triggers cannot
-- modify the row being written, so this must be separate from fn_hris_audit.
create or replace function fn_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;
revoke execute on function fn_set_updated_at() from public;

-- =========================================================
-- MODULE: employee_family  (replaces the earlier flat employee_family table)
-- =========================================================

create table if not exists family_relation_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists employee_family_members (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  relation_type_id uuid not null references family_relation_types(id),

  first_name text not null,
  middle_name text,
  last_name text,
  -- concat_ws() is STABLE (not IMMUTABLE) so it cannot be used in a generated
  -- column; regexp_replace()/coalesce() achieve the same result and ARE immutable.
  full_name text generated always as (
    trim(regexp_replace(coalesce(first_name,'') || ' ' || coalesce(middle_name,'') || ' ' || coalesce(last_name,''), '\s+', ' ', 'g'))
  ) stored,

  gender text check (gender in ('male','female','other')),
  birth_date date,
  national_id text,
  nationality text default 'Indonesia',

  is_dependent boolean not null default true,
  is_primary boolean not null default false,
  lives_with_employee boolean,
  occupation text,
  employer text,
  notes text,

  valid_from timestamptz,
  valid_to timestamptz,

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  deleted_by uuid,
  deleted_at timestamptz,

  constraint chk_dates_family check (valid_from is null or valid_to is null or valid_from <= valid_to),
  constraint chk_birth_past check (birth_date is null or birth_date <= current_date)
);

create unique index if not exists ux_employee_family_primary
  on employee_family_members (employee_id) where is_primary and deleted_at is null;
create unique index if not exists ux_employee_family_nationalid_per_employee
  on employee_family_members (employee_id, national_id) where national_id is not null and deleted_at is null;
create unique index if not exists ux_employee_family_unique_person
  on employee_family_members (employee_id, relation_type_id, lower(first_name), lower(coalesce(last_name,'')), birth_date)
  where deleted_at is null;
create index if not exists idx_employee_family_employee on employee_family_members(employee_id);
create index if not exists idx_employee_family_relation on employee_family_members(relation_type_id);
create index if not exists idx_employee_family_deleted_at on employee_family_members(deleted_at);

create trigger trg_updated_at_employee_family before update on employee_family_members
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_family after insert or update or delete on employee_family_members
for each row execute function fn_hris_audit();

alter table family_relation_types enable row level security;
alter table employee_family_members enable row level security;

create policy "master select" on family_relation_types for select using ((select auth.role()) = 'authenticated');
create policy "master insert" on family_relation_types for insert with check ((select fn_current_role()) = 'admin');
create policy "master update" on family_relation_types for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "master delete" on family_relation_types for delete using ((select fn_current_role()) = 'admin');

create policy "select all roles" on employee_family_members for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_family_members for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_family_members for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_family_members for delete using ((select fn_current_role()) = 'admin');

insert into family_relation_types (code, name) values
  ('PASANGAN','Pasangan (Suami/Istri)'), ('ANAK','Anak'),
  ('ORANGTUA','Orang Tua'), ('SAUDARA','Saudara Kandung'), ('LAINNYA','Lainnya')
on conflict (code) do nothing;

-- =========================================================
-- MODULE: employee_education  (replaces flat fields on employees)
-- =========================================================

create table if not exists education_levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  rank integer not null,
  created_at timestamptz not null default now()
);

create table if not exists education_institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  country text default 'Indonesia',
  created_at timestamptz not null default now()
);

create table if not exists employee_education (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  institution_id uuid references education_institutions(id),
  institution_name text,
  degree text,
  education_level_id uuid references education_levels(id),
  major text,
  gpa numeric(4,2) check (gpa is null or (gpa >= 0 and gpa <= 4)),
  start_date date,
  end_date date,
  certificate_document_id uuid references employee_documents(id),
  is_primary boolean not null default false,
  notes text,

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  deleted_by uuid,
  deleted_at timestamptz,

  constraint chk_edu_dates check (start_date is null or end_date is null or start_date <= end_date),
  constraint chk_edu_institution check (institution_id is not null or institution_name is not null)
);

create unique index if not exists ux_employee_education_primary
  on employee_education(employee_id) where is_primary and deleted_at is null;
create index if not exists idx_employee_education_employee on employee_education(employee_id);
create index if not exists idx_employee_education_institution on employee_education(institution_id);
create index if not exists idx_employee_education_level on employee_education(education_level_id);
create index if not exists idx_employee_education_deleted_at on employee_education(deleted_at);

create trigger trg_updated_at_employee_education before update on employee_education
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_education after insert or update or delete on employee_education
for each row execute function fn_hris_audit();

alter table education_levels enable row level security;
alter table education_institutions enable row level security;
alter table employee_education enable row level security;

create policy "master select" on education_levels for select using ((select auth.role()) = 'authenticated');
create policy "master insert" on education_levels for insert with check ((select fn_current_role()) = 'admin');
create policy "master update" on education_levels for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "master delete" on education_levels for delete using ((select fn_current_role()) = 'admin');

create policy "master select" on education_institutions for select using ((select auth.role()) = 'authenticated');
create policy "master insert" on education_institutions for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "master update" on education_institutions for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "master delete" on education_institutions for delete using ((select fn_current_role()) = 'admin');

create policy "select all roles" on employee_education for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_education for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_education for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_education for delete using ((select fn_current_role()) = 'admin');

insert into education_levels (code, name, rank) values
  ('SD','SD/Sederajat',1), ('SMP','SMP/Sederajat',2), ('SMA','SMA/SMK/Sederajat',3),
  ('D3','Diploma 3',4), ('S1','Sarjana (S1)',5), ('S2','Magister (S2)',6), ('S3','Doktor (S3)',7)
on conflict (code) do nothing;

-- =========================================================
-- MODULE: employee_documents  (replaces the earlier flat-metadata table)
-- =========================================================

create table if not exists document_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  retention_period_days integer,
  created_at timestamptz not null default now()
);

create table if not exists employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  document_type_id uuid not null references document_types(id),

  title text not null,
  file_name text,
  storage_provider text not null default 's3',
  bucket text,
  storage_key text,
  mime_type text,
  size_bytes bigint,
  checksum text,
  checksum_algo text default 'sha256',
  is_encrypted boolean default false,
  is_private boolean default true,

  uploaded_by uuid,
  uploaded_at timestamptz,
  retention_until timestamptz,
  notes text,

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  deleted_by uuid,
  deleted_at timestamptz
);

create unique index if not exists ux_employee_doc_checksum
  on employee_documents(employee_id, checksum) where checksum is not null and deleted_at is null;
create index if not exists idx_employee_documents_employee on employee_documents(employee_id);
create index if not exists idx_employee_documents_type on employee_documents(document_type_id);
create index if not exists idx_employee_documents_deleted_at on employee_documents(deleted_at);

create trigger trg_updated_at_employee_documents before update on employee_documents
for each row execute function fn_set_updated_at();
create trigger trg_audit_employee_documents after insert or update or delete on employee_documents
for each row execute function fn_hris_audit();

alter table document_types enable row level security;
alter table employee_documents enable row level security;

create policy "master select" on document_types for select using ((select auth.role()) = 'authenticated');
create policy "master insert" on document_types for insert with check ((select fn_current_role()) = 'admin');
create policy "master update" on document_types for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "master delete" on document_types for delete using ((select fn_current_role()) = 'admin');

create policy "select all roles" on employee_documents for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employee_documents for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employee_documents for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employee_documents for delete using ((select fn_current_role()) = 'admin');

insert into document_types (code, name, retention_period_days) values
  ('KTP','KTP', null), ('KK','Kartu Keluarga', null), ('IJAZAH','Ijazah', null),
  ('TRANSKRIP','Transkrip Nilai', null), ('KONTRAK','Kontrak Kerja', 2555),
  ('SK','Surat Pengangkatan', null), ('NPWP','Kartu NPWP', null),
  ('BPJS','Kartu Asuransi (BPJS)', null), ('REKENING','Buku Rekening Bank', null),
  ('SERTIFIKAT','Sertifikat Pendukung', null)
on conflict (code) do nothing;

-- Wire the FK from employee_education back to employee_documents now that it exists.
alter table employee_education
  add constraint fk_employee_education_certificate_document
  foreign key (certificate_document_id) references employee_documents(id);
