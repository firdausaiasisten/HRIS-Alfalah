-- =========================================================
-- HRIS Al-Falah — Row Level Security Policies
-- Run after schema.sql. Enables RLS + creates one policy per
-- action (select/insert/update/delete) per table — avoids the
-- "multiple permissive policies" performance pitfall.
-- =========================================================

alter table employees enable row level security;
alter table employee_certifications enable row level security;
alter table employee_competencies enable row level security;
alter table employee_family enable row level security;
alter table employee_teaching_assignment enable row level security;
alter table performance_reviews enable row level security;
alter table employment_history enable row level security;
alter table user_roles enable row level security;
alter table notifications enable row level security;
alter table leave_requests enable row level security;
alter table m_unit_kerja enable row level security;
alter table m_departemen enable row level security;
alter table m_jabatan enable row level security;
alter table m_status_kepegawaian enable row level security;
alter table m_jenis_kepegawaian enable row level security;
alter table m_bank enable row level security;
alter table m_agama enable row level security;
alter table m_status_perkawinan enable row level security;

-- ===== master tables: read = any authenticated user, write = admin only =====
do $$
declare t text;
begin
  foreach t in array array['m_unit_kerja','m_departemen','m_jabatan','m_status_kepegawaian','m_jenis_kepegawaian','m_bank','m_agama','m_status_perkawinan']
  loop
    execute format('create policy "master select" on %I for select using ((select auth.role()) = ''authenticated'')', t);
    execute format('create policy "master insert" on %I for insert with check ((select fn_current_role()) = ''admin'')', t);
    execute format('create policy "master update" on %I for update using ((select fn_current_role()) = ''admin'') with check ((select fn_current_role()) = ''admin'')', t);
    execute format('create policy "master delete" on %I for delete using ((select fn_current_role()) = ''admin'')', t);
  end loop;
end $$;

-- ===== employee child tables + performance_reviews + employment_history =====
-- select = admin/hrd_staff/pimpinan, insert/update = admin/hrd_staff, delete = admin
do $$
declare t text;
begin
  foreach t in array array['employee_certifications','employee_competencies','employee_family','employee_teaching_assignment','performance_reviews','employment_history']
  loop
    execute format('create policy "select all roles" on %I for select using ((select fn_current_role()) in (''admin'',''hrd_staff'',''pimpinan''))', t);
    execute format('create policy "insert admin+hrd" on %I for insert with check ((select fn_current_role()) in (''admin'',''hrd_staff''))', t);
    execute format('create policy "update admin+hrd" on %I for update using ((select fn_current_role()) in (''admin'',''hrd_staff'')) with check ((select fn_current_role()) in (''admin'',''hrd_staff''))', t);
    execute format('create policy "delete admin only" on %I for delete using ((select fn_current_role()) = ''admin'')', t);
  end loop;
end $$;

-- ===== notifications: HR activity feed, not per-user personal notifications
-- (the client shows the same list to every admin/hrd_staff/pimpinan user with
-- no user_id filter) -- select matches that usage; writes are trigger-only
-- via fn_notify_leave (security definer), but admin/hrd_staff can also
-- manage entries manually (e.g. from Table Editor) for consistency with
-- every other table's write pattern in this schema. =====
create policy "select all roles" on notifications for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on notifications for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on notifications for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on notifications for delete using ((select fn_current_role()) = 'admin');

-- ===== leave_requests: same access pattern as the employee child tables
-- above (this is where "select all roles"/"insert admin+hrd" was missing
-- entirely, leaving the table with RLS enabled but zero policies -- i.e.
-- fully locked for anon/authenticated until this was added). =====
create policy "select all roles" on leave_requests for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on leave_requests for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on leave_requests for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on leave_requests for delete using ((select fn_current_role()) = 'admin');

-- ===== employees (core) =====
create policy "select all roles" on employees for select using ((select fn_current_role()) in ('admin','hrd_staff','pimpinan'));
create policy "insert admin+hrd" on employees for insert with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "update admin+hrd" on employees for update using ((select fn_current_role()) in ('admin','hrd_staff')) with check ((select fn_current_role()) in ('admin','hrd_staff'));
create policy "delete admin only" on employees for delete using ((select fn_current_role()) = 'admin');

-- ===== user_roles =====
create policy "select own or admin" on user_roles for select using ((select auth.uid()) = user_id or (select fn_current_role()) = 'admin');
create policy "insert admin only" on user_roles for insert with check ((select fn_current_role()) = 'admin');
create policy "update admin only" on user_roles for update using ((select fn_current_role()) = 'admin') with check ((select fn_current_role()) = 'admin');
create policy "delete admin only" on user_roles for delete using ((select fn_current_role()) = 'admin');
