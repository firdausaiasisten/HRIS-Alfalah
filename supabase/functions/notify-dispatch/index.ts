// supabase/functions/notify-dispatch/index.ts
//
// Deploy with:  supabase functions deploy notify-dispatch --no-verify-jwt
// (--no-verify-jwt because this is called from pg_net inside Postgres,
// not from a logged-in browser session -- see below for how it's secured
// instead.)
//
// Called by fn_dispatch_notification() (batch3_selfservice_notifications.sql)
// whenever a row is inserted into `notifications`. Fans it out to:
//   - Email via SendGrid (default) or Mailgun (set EMAIL_PROVIDER=mailgun)
//   - Push via OneSignal
// Both are best-effort: a delivery failure on one channel does not fail
// the request or roll back the notification (it already exists in-app
// either way; email/push are an enhancement, not the source of truth).
//
// NOTE ON TESTING: this file has not been deployed or run against a real
// SendGrid/Mailgun/OneSignal account -- doing so needs API keys and a
// live Supabase project, neither of which exist in the sandbox this was
// written in. What WAS verified: fn_dispatch_notification's trigger logic
// (does it fire, does it build this exact request body) against a local
// stub of pg_net -- see database/testdb/00b_stub_pgnet.sql and
// database/testdb/03_batch3_tests.sql in the project repo.
//
// Required secrets (set via `supabase secrets set KEY=value`):
//   SENDGRID_API_KEY or MAILGUN_API_KEY + MAILGUN_DOMAIN
//   ONESIGNAL_APP_ID + ONESIGNAL_REST_API_KEY
//   FROM_EMAIL (e.g. "hris@alfalahabulamu.com")
//   DISPATCH_SHARED_SECRET -- set the SAME value as
//     app.notify_webhook_secret in Postgres (see batch3 SQL) so this
//     function can verify the request genuinely came from your own
//     database and not an arbitrary caller who found the URL.

// deno-lint-ignore-file no-explicit-any
// @ts-ignore -- Deno-native import, resolved at deploy time on Supabase's
// Edge Runtime; not resolvable by a local Node/TS toolchain, which is
// expected and fine -- this file only runs on Deno Deploy.
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const EMAIL_PROVIDER = Deno.env.get("EMAIL_PROVIDER") || "sendgrid"; // 'sendgrid' | 'mailgun'
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "hris@alfalahabulamu.com";
const DISPATCH_SHARED_SECRET = Deno.env.get("DISPATCH_SHARED_SECRET") || "";

interface NotificationPayload {
  notification_id: string;
  user_id: string;
  type: string;
  message: string;
  created_at: string;
}

async function getUserContact(userId: string): Promise<{ email?: string; onesignalPlayerId?: string }> {
  // Looks up the recipient's email via Supabase's admin Auth API (needs the
  // service_role key -- never the anon key -- since this reads auth.users).
  const projectUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${projectUrl}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return {};
  const user = await res.json();
  return {
    email: user?.email,
    // OneSignal player id, if the frontend registered one for this user
    // (see the OneSignal Web SDK setup note at the bottom of this file) --
    // stored in user_metadata by that registration step.
    onesignalPlayerId: user?.user_metadata?.onesignal_player_id,
  };
}

async function sendEmailSendGrid(to: string, subject: string, body: string) {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!apiKey) return { skipped: "SENDGRID_API_KEY not set" };
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });
  return { ok: res.ok, status: res.status };
}

async function sendEmailMailgun(to: string, subject: string, body: string) {
  const apiKey = Deno.env.get("MAILGUN_API_KEY");
  const domain = Deno.env.get("MAILGUN_DOMAIN");
  if (!apiKey || !domain) return { skipped: "MAILGUN_API_KEY/MAILGUN_DOMAIN not set" };
  const form = new URLSearchParams({ from: FROM_EMAIL, to, subject, text: body });
  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`api:${apiKey}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  return { ok: res.ok, status: res.status };
}

async function sendPushOneSignal(playerId: string, title: string, message: string) {
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const restKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!appId || !restKey) return { skipped: "ONESIGNAL_APP_ID/ONESIGNAL_REST_API_KEY not set" };
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: { Authorization: `Basic ${restKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: appId,
      include_player_ids: [playerId],
      headings: { en: title },
      contents: { en: message },
    }),
  });
  return { ok: res.ok, status: res.status };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Cheap but effective: only a caller who knows this secret (i.e. your
  // own Postgres, via app.notify_webhook_secret) gets past this check.
  // Anyone else hitting this public URL gets rejected before any email/push
  // provider is even contacted.
  const providedSecret = req.headers.get("x-dispatch-secret") || "";
  if (!DISPATCH_SHARED_SECRET || providedSecret !== DISPATCH_SHARED_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: NotificationPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  if (!payload.user_id || !payload.type || !payload.message) {
    return new Response("Missing required fields", { status: 400 });
  }

  const contact = await getUserContact(payload.user_id);
  const results: Record<string, any> = {};

  if (contact.email) {
    results.email = EMAIL_PROVIDER === "mailgun"
      ? await sendEmailMailgun(contact.email, `[HRIS Al-Falah] ${payload.type}`, payload.message)
      : await sendEmailSendGrid(contact.email, `[HRIS Al-Falah] ${payload.type}`, payload.message);
  } else {
    results.email = { skipped: "no email on file for this user" };
  }

  if (contact.onesignalPlayerId) {
    results.push = await sendPushOneSignal(contact.onesignalPlayerId, payload.type, payload.message);
  } else {
    results.push = { skipped: "no OneSignal player id registered for this user" };
  }

  return new Response(JSON.stringify({ notification_id: payload.notification_id, results }), {
    headers: { "Content-Type": "application/json" },
  });
});

// --- Setup checklist (do this on your live Supabase project) ---
// 1. supabase functions deploy notify-dispatch --no-verify-jwt
// 2. supabase secrets set SENDGRID_API_KEY=... FROM_EMAIL=hris@alfalahabulamu.com
//    (or MAILGUN_API_KEY=... MAILGUN_DOMAIN=... EMAIL_PROVIDER=mailgun)
// 3. supabase secrets set ONESIGNAL_APP_ID=... ONESIGNAL_REST_API_KEY=...
// 4. supabase secrets set DISPATCH_SHARED_SECRET=<a random string you make up>
// 5. In SQL Editor:
//    alter database postgres set app.notify_webhook_url =
//      'https://<project-ref>.supabase.co/functions/v1/notify-dispatch';
//    alter database postgres set app.notify_webhook_secret = '<the same random string from step 4>';
//    (fn_dispatch_notification in batch3_selfservice_notifications.sql
//    already reads app.notify_webhook_secret and sends it as the
//    x-dispatch-secret header on every call -- no code changes needed
//    here, just set both database settings above to matching values.)
// 6. For push notifications: add the OneSignal Web SDK to index.html and,
//    on successful subscription, PATCH the user's auth metadata with the
//    player id so getUserContact() above can find it -- that wiring isn't
//    included here since it needs a real OneSignal app to test against.
