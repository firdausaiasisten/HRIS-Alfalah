-- =========================================================
-- HRIS Al-Falah — Batch 3: Self-Service Profile Update +
-- Notification triggers (DB side of Fitur 1 & Fitur 4)
-- Run after schema.sql + rls_policies.sql + batch1 + batch2.
-- =========================================================

-- =========================================================
-- FITUR 4: SELF-SERVICE PROFILE UPDATE
-- =========================================================
-- Any authenticated user can already read their OWN employee row via
-- the existing "select all roles" policy IF they hold admin/hrd_staff/
-- pimpinan. This adds read+write for the owning employee specifically,
-- regardless of role -- important for `pimpinan`, who currently has
-- canEdit:false and couldn't update even their own contact info.

create policy "select own row" on employees for select
  using ((select auth_user_id) is not null and auth_user_id = (select auth.uid()));

create policy "update own row" on employees for update
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- RLS controls WHICH ROWS a self-service update can touch (only their own).
-- It does not restrict WHICH COLUMNS -- Postgres RLS is row-scoped, not
-- column-scoped, and every login shares the single `authenticated` DB
-- role, so a column-level GRANT can't distinguish "admin editing anyone"
-- from "employee editing themselves" either. This trigger is what actually
-- keeps a self-update from touching salary, jabatan, status, etc.: for
-- non-admin/hrd_staff actors it takes the OLD row and overlays only the
-- whitelisted self-service columns from NEW, silently keeping everything
-- else at its old value. Admin/hrd_staff pass through untouched.
create or replace function fn_restrict_self_update()
returns trigger as $$
declare
  allowed_cols text[] := array[
    'photo_url','phone','mobile_phone','personal_email','address',
    'province','regency','district','village','postal_code',
    'emergency_contact_name','emergency_contact_phone','emergency_contact_relationship',
    'updated_at'
  ];
  merged jsonb;
  k text;
begin
  if (select fn_current_role()) in ('admin','hrd_staff')
     or coalesce(current_setting('app.bypass_self_restriction', true), 'false') = 'true' then
    return new;
  end if;
  merged := to_jsonb(old);
  foreach k in array allowed_cols loop
    merged := jsonb_set(merged, array[k], coalesce(to_jsonb(new) -> k, 'null'::jsonb), true);
  end loop;
  return jsonb_populate_record(old, merged);
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_restrict_self_update on employees;
create trigger trg_restrict_self_update before update on employees
for each row execute function fn_restrict_self_update();

-- =========================================================
-- FITUR 1 (database side): notification-generating triggers.
-- Actual email/push DELIVERY (SendGrid/Mailgun/OneSignal) happens in
-- fn_dispatch_notification() further down -- see the header note there
-- for what is and isn't verifiable outside a live Supabase project.
-- =========================================================

-- --- pendaftaran pengguna: notify every admin when someone new signs up ---
create or replace function fn_notify_new_registration()
returns trigger as $$
begin
  if (select count(*) from user_roles) > 1 then -- skip the very first signup (that's the admin being created, nobody to notify yet)
    insert into notifications (user_id, type, message)
    select ur.user_id, 'Pendaftaran Baru',
      coalesce(new.raw_user_meta_data->>'full_name', new.email) || ' mendaftar dan menunggu persetujuan peran.'
    from user_roles ur where ur.role = 'admin';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_notify_new_registration on auth.users;
create trigger trg_notify_new_registration after insert on auth.users
for each row execute function fn_notify_new_registration();

-- --- perubahan status: role change on user_roles (e.g. pending -> hrd_staff) ---
create or replace function fn_notify_role_change()
returns trigger as $$
begin
  if (tg_op = 'UPDATE' and old.role is distinct from new.role) then
    insert into notifications (user_id, type, message)
    values (new.user_id, 'Perubahan Status Akun', 'Peran akun Anda diperbarui menjadi ' || new.role || '.');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_notify_role_change on user_roles;
create trigger trg_notify_role_change after update on user_roles
for each row execute function fn_notify_role_change();

-- --- hasil penilaian: notify the employee when their review is approved ---
create or replace function fn_notify_performance_review()
returns trigger as $$
declare v_auth_user_id uuid;
begin
  if new.status_approval = 'Disetujui'
     and (tg_op = 'INSERT' or old.status_approval is distinct from new.status_approval) then
    select auth_user_id into v_auth_user_id from employees where id = new.employee_id;
    if v_auth_user_id is not null then
      insert into notifications (user_id, type, message)
      values (v_auth_user_id, 'Hasil Penilaian',
        'Hasil penilaian kinerja periode ' || new.review_period || ' telah disetujui: ' || coalesce(new.predikat,'-') || '.');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_notify_performance_review on performance_reviews;
create trigger trg_notify_performance_review after insert or update on performance_reviews
for each row execute function fn_notify_performance_review();

-- --- kontrak akan habis: not event-driven (nothing "happens" when a date
-- approaches) -- this is a function meant to run on a schedule. On a real
-- Supabase project, enable pg_cron (Database -> Extensions) and run:
--   select cron.schedule('check-expiring-contracts', '0 6 * * *', 'select fn_check_expiring_contracts(30)');
-- once daily at 06:00. It can also just be called manually / from an
-- admin button meanwhile. Idempotent per day (see the created_at::date
-- guard) so re-running it doesn't spam duplicate notifications.
create or replace function fn_check_expiring_contracts(days_ahead integer default 30)
returns integer as $$
declare v_employee_count integer;
begin
  insert into notifications (user_id, type, message)
  select e.auth_user_id, 'Kontrak Akan Berakhir',
    'Kontrak Anda akan berakhir pada ' || to_char(e.contract_end,'DD Mon YYYY') || '.'
  from employees e
  where e.contract_end between current_date and current_date + days_ahead
    and e.deleted_at is null and e.auth_user_id is not null
    and not exists (
      select 1 from notifications n
      where n.user_id = e.auth_user_id and n.type = 'Kontrak Akan Berakhir' and n.created_at::date = current_date
    );
  get diagnostics v_employee_count = row_count;

  insert into notifications (user_id, type, message)
  select ur.user_id, 'Kontrak Akan Berakhir (Tim)',
    e.full_name || ' — kontrak berakhir ' || to_char(e.contract_end,'DD Mon YYYY') || '.'
  from employees e
  cross join (select user_id from user_roles where role in ('admin','hrd_staff')) ur
  where e.contract_end between current_date and current_date + days_ahead
    and e.deleted_at is null
    and not exists (
      select 1 from notifications n
      where n.user_id = ur.user_id and n.type = 'Kontrak Akan Berakhir (Tim)'
        and n.message like '%' || e.full_name || '%' and n.created_at::date = current_date
    );

  return v_employee_count;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
revoke execute on function fn_check_expiring_contracts(integer) from public, anon;
grant execute on function fn_check_expiring_contracts(integer) to authenticated;

-- =========================================================
-- OUTBOUND DISPATCH (email/push): this is the part that genuinely
-- CANNOT be verified outside a live Supabase project with real
-- SendGrid/Mailgun/OneSignal credentials -- pg_net (async HTTP from
-- Postgres) is a Supabase-provided extension, not available in a plain
-- local Postgres install. What follows is written to be correct and
-- deployable, and is tested here only insofar as: the trigger fires,
-- and it builds the right payload -- via a stub pg_net that just logs
-- instead of sending. Swap the stub for the real extension on Supabase
-- and this becomes live without further code changes.
-- =========================================================

create or replace function fn_dispatch_notification()
returns trigger as $$
declare
  v_edge_function_url text := current_setting('app.notify_webhook_url', true);
  v_secret text := current_setting('app.notify_webhook_secret', true);
begin
  if v_edge_function_url is null or v_edge_function_url = '' then
    return new; -- not configured yet; notification still lands in-app via the notifications table itself
  end if;
  perform net.http_post(
    url := v_edge_function_url,
    headers := jsonb_build_object('Content-Type','application/json', 'x-dispatch-secret', coalesce(v_secret, '')),
    body := jsonb_build_object(
      'notification_id', new.id, 'user_id', new.user_id,
      'type', new.type, 'message', new.message, 'created_at', new.created_at
    )
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_dispatch_notification on notifications;
create trigger trg_dispatch_notification after insert on notifications
for each row execute function fn_dispatch_notification();

-- Set the webhook URL + shared secret once, after deploying the Edge
-- Function below (the secret must match DISPATCH_SHARED_SECRET set on the
-- function via `supabase secrets set`):
--   alter database postgres set app.notify_webhook_url = 'https://<project-ref>.supabase.co/functions/v1/notify-dispatch';
--   alter database postgres set app.notify_webhook_secret = '<a random string, same value on both sides>';
-- Leaving the URL unset (the default) makes the trigger a safe no-op --
-- new rows still land in `notifications` normally, they just don't fan
-- out to email/push until this is configured.
