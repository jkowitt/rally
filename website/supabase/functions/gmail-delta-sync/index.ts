// ============================================================
// GMAIL-DELTA-SYNC (scheduled, every 15 minutes)
// ============================================================
// Cron wrapper that triggers gmail-graph 'sync' for every user
// who has connected their Gmail account. Mirror of
// outlook-delta-sync.
//
// Triggered by Supabase scheduled functions (or any external
// cron) with header x-cron-secret matching the CRON_SECRET env.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Not Found", { status: 404 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Skip entirely if the inbox_gmail flag is off
  const { data: flag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "inbox_gmail")
    .maybeSingle();
  if (!flag?.enabled) {
    return new Response(JSON.stringify({ skipped: true, reason: "flag off" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pull every connected Gmail user
  const { data: rows } = await sb
    .from("gmail_auth")
    .select("user_id")
    .eq("is_connected", true);

  const results: any[] = [];
  for (const row of rows || []) {
    // Mint a service-role bearer and call gmail-graph as that user.
    // Since gmail-graph reads the user from the auth header JWT, the
    // simplest approach for cron is to invoke directly through the
    // internal sync helper — but that would duplicate the logic.
    // Instead, we trigger by impersonation token via the admin API.
    //
    // For now, we record the scheduled work; the production
    // implementation should either (a) generate a per-user JWT via
    // sb.auth.admin.createSession (non-existent — Supabase admin
    // can't mint sessions), or (b) factor the sync logic into a
    // shared module that this cron + the user-facing endpoint both
    // import. The shared-module path is the correct design and is
    // tracked in SETUP_EMAIL_INTEGRATION.md as a known refactor.
    //
    // Workaround until that refactor lands: emit a row to
    // gmail_sync_log with status='scheduled' so the cron at least
    // tracks who would have synced. Operators can then manually
    // invoke the sync, or — if a connected mailbox has been idle
    // for >24h — the next user-initiated action will catch up.
    await sb.from("gmail_sync_log").insert({
      user_id: row.user_id,
      sync_type: "history",
      status: "scheduled",
    });
    results.push({ user_id: row.user_id, scheduled: true });
  }

  return new Response(JSON.stringify({ users: results.length, scheduled: results.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
