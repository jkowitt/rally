// ============================================================
// GMAIL-DELTA-SYNC (scheduled, every 5 minutes)
// ============================================================
// Mirror of outlook-delta-sync. Cron-driven runner that invokes
// gmail-graph 'sync' as each connected user via a service-role
// internal POST. gmail-graph's requireUser short-circuits the JWT
// check when called with the service role key + body.user_id.
//
// Auth: accepts EITHER
//   • Authorization: Bearer <service-role-key>  (used by pg_cron)
//   • x-cron-secret: <CRON_SECRET>              (legacy)
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

Deno.serve(async (req: Request) => {
  const auth = req.headers.get("Authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const cronHeader = req.headers.get("x-cron-secret") || "";
  if (bearer !== SERVICE_KEY && (!CRON_SECRET || cronHeader !== CRON_SECRET)) {
    return new Response("Not Found", { status: 404 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "inbox_gmail")
    .maybeSingle();
  if (!flag?.enabled) {
    return json({ skipped: true, reason: "inbox_gmail flag off" });
  }

  const { data: rows } = await sb
    .from("gmail_auth")
    .select("user_id")
    .eq("is_connected", true);

  let total = 0, succeeded = 0, failed = 0;
  const errors: any[] = [];

  for (const row of rows || []) {
    total++;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/gmail-graph`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "sync", user_id: row.user_id }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data?.success !== false) {
        succeeded++;
      } else {
        failed++;
        errors.push({ user_id: row.user_id, status: r.status, error: data?.error || data });
      }
    } catch (err) {
      failed++;
      errors.push({ user_id: row.user_id, error: String(err) });
    }
  }

  return json({ total, succeeded, failed, errors });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
