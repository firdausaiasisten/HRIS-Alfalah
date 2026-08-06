-- =========================================================
-- HRIS Al-Falah — Batch 5: fix false-positive dedup in
-- fn_check_expiring_contracts() for the team-facing notification.
-- Run after schema.sql + rls_policies.sql + batch1 + batch2 + batch3 +
-- batch4.
-- =========================================================

-- BUG (found by re-running the migration chain and reading the dedup logic
-- closely): the "already notified today" guard for the team-facing
-- "Kontrak Akan Berakhir (Tim)" notification matched on
--   n.message like '%' || e.full_name || '%'
-- Indonesian names commonly have one name as a literal substring of
-- another (e.g. an employee named "Budi" and another named "Budi
-- Santoso"). If both had contracts expiring the same day, the guard could
-- match "Budi"'s check against a row that was actually about "Budi
-- Santoso" (or vice versa), skipping a notification that should have been
-- sent. Fix: give notifications a real employee_id column and dedupe on
-- that instead of parsing it back out of free text.

alter table notifications add column if not exists employee_id uuid references employees(id);
create index if not exists idx_notifications_employee on notifications(employee_id);

create or replace function fn_check_expiring_contracts(days_ahead integer default 30)
returns integer as $$
declare v_employee_count integer;
begin
  insert into notifications (user_id, type, message, employee_id)
  select e.auth_user_id, 'Kontrak Akan Berakhir',
    'Kontrak Anda akan berakhir pada ' || to_char(e.contract_end,'DD Mon YYYY') || '.',
    e.id
  from employees e
  where e.contract_end between current_date and current_date + days_ahead
    and e.deleted_at is null and e.auth_user_id is not null
    and not exists (
      select 1 from notifications n
      where n.user_id = e.auth_user_id and n.type = 'Kontrak Akan Berakhir'
        and n.employee_id = e.id and n.created_at::date = current_date
    );
  get diagnostics v_employee_count = row_count;

  insert into notifications (user_id, type, message, employee_id)
  select ur.user_id, 'Kontrak Akan Berakhir (Tim)',
    e.full_name || ' — kontrak berakhir ' || to_char(e.contract_end,'DD Mon YYYY') || '.',
    e.id
  from employees e
  cross join (select user_id from user_roles where role in ('admin','hrd_staff')) ur
  where e.contract_end between current_date and current_date + days_ahead
    and e.deleted_at is null
    and not exists (
      select 1 from notifications n
      where n.user_id = ur.user_id and n.type = 'Kontrak Akan Berakhir (Tim)'
        and n.employee_id = e.id and n.created_at::date = current_date
    );

  return v_employee_count;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
revoke execute on function fn_check_expiring_contracts(integer) from public, anon;
grant execute on function fn_check_expiring_contracts(integer) to authenticated;
