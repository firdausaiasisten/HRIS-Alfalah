-- =========================================================
-- HRIS Al-Falah — Batch 4: Institutional Calendar (admin-editable
-- schedule of institutional activities, shown alongside leave requests
-- and national holidays in the existing calendar module).
-- Run after schema.sql + rls_policies.sql + batch1 + batch2 + batch3.
-- =========================================================

create table if not exists institutional_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'Umum' check (category in ('Akademik','Keagamaan','Administrasi','Umum')),
  start_date date not null,
  end_date date not null,

  created_by uuid, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint chk_event_dates check (start_date <= end_date)
);
create index if not exists idx_events_dates on institutional_events(start_date, end_date);
create index if not exists idx_events_deleted_at on institutional_events(deleted_at);

create trigger trg_updated_at_institutional_events before update on institutional_events
for each row execute function fn_set_updated_at();
create trigger trg_audit_institutional_events after insert or update or delete on institutional_events
for each row execute function fn_hris_audit();

alter table institutional_events enable row level security;

-- Anyone who can see the calendar at all (admin/hrd_staff/pimpinan) can
-- read the institutional schedule -- it's informational, not sensitive,
-- same reasoning as the calendar tab itself. Writing is admin-only, per
-- the feature request ("dapat diedit oleh admin") -- hrd_staff can see
-- the institutional schedule but not change it, unlike leave requests
-- where hrd_staff has full write access.
create policy "select all roles" on institutional_events for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin only" on institutional_events for insert with check ((select fn_current_role()) = 'admin');
create policy "update admin only" on institutional_events for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "delete admin only" on institutional_events for delete using ((select fn_current_role()) = 'admin');
