// ============================================================
// OUTLOOK-DELTA-SYNC (scheduled, every 5 minutes)
// ============================================================
// Cron-driven runner. Walks every connected outlook_auth row and
// invokes outlook-graph 'delta_sync' as that user via a service-role
// internal POST (outlook-graph's requireUser short-circuits the JWT
// check when called with the service role key + user_id in body).
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
  // Auth — accept service-role bearer OR cron secret. 404 (not 401)
  // on failure so the endpoint isn't probe-friendly.
  const auth = req.headers.get("Authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const cronHeader = req.headers.get("x-cron-secret") || "";
  if (bearer !== SERVICE_KEY && (!CRON_SECRET || cronHeader !== CRON_SECRET)) {
    return new Response("Not Found", { status: 404 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Skip if the customer-facing inbox_outlook flag is off.
  const { data: flag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "inbox_outlook")
    .maybeSingle();
  if (!flag?.enabled) {
    return json({ skipped: true, reason: "inbox_outlook flag off" });
  }

  const { data: rows } = await sb
    .from("outlook_auth")
    .select("user_id")
    .eq("is_connected", true);

  let total = 0, succeeded = 0, failed = 0;
  const errors: any[] = [];

  for (const row of rows || []) {
    total++;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/outlook-graph`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "delta_sync", user_id: row.user_id }),
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
