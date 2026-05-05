// ============================================================
// USAGE-HEARTBEAT
// ============================================================
// Front-end pings this endpoint once per minute while the tab is
// focused. Each ping inserts a row into `usage_events` with
// event_type='heartbeat', the user_id from the JWT, the user's
// property_id (for the per-property roll-up), and the current path.
// "Average usage time" surfaced in the UI is rows-per-period × 1
// minute, sliced by user / property as needed.
//
// Authentication: JWT required.
// Rate limit: 10 heartbeats / minute / user (sane upper bound; the
// front-end fires one per minute, so a hostile client can't
// inflate the number without burning tokens).
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ success: false, error: "unauthorized" }, 200);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ success: false, error: "unauthorized" }, 200);

    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;

    const { data: prof } = await sb
      .from("profiles")
      .select("property_id")
      .eq("id", u.user.id)
      .maybeSingle();

    // Soft cap to discourage hostile clients from flooding the table.
    // Reject if more than 10 heartbeats from this user in the last 60s.
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count: recent } = await sb
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.user.id)
      .gte("occurred_at", since);
    if (typeof recent === "number" && recent >= 10) {
      return json({ success: false, error: "rate_limited" }, 200);
    }

    await sb.from("usage_events").insert({
      user_id: u.user.id,
      property_id: prof?.property_id || null,
      event_type: "heartbeat",
      path,
    });

    return json({ success: true });
  } catch (err) {
    return json({ success: false, error: String(err) }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
