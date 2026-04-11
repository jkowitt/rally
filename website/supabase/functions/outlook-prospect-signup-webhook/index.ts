// ============================================================
// OUTLOOK-PROSPECT-SIGNUP-WEBHOOK
// ============================================================
// Fires when a new Supabase auth user is created. If the email
// matches a row in outlook_prospects, updates that prospect's
// status to 'trial_started'.
//
// Wire this via a Supabase Auth webhook in the dashboard, or
// invoke manually from a database trigger. Requires x-hook-secret
// header for authentication.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const HOOK_SECRET = Deno.env.get("HOOK_SECRET") ?? "";

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-hook-secret");
  if (!HOOK_SECRET || secret !== HOOK_SECRET) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const payload = await req.json();
    const email = payload?.record?.email || payload?.email;
    if (!email) return new Response(JSON.stringify({ matched: false }), { headers: { "Content-Type": "application/json" } });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Feature flag guard — if off, do nothing
    const { data: flag } = await sb
      .from("feature_flags")
      .select("enabled")
      .eq("module", "outlook_integration")
      .maybeSingle();
    if (!flag?.enabled) {
      return new Response(JSON.stringify({ skipped: true }), { headers: { "Content-Type": "application/json" } });
    }

    // Find matching prospect
    const { data: prospect } = await sb
      .from("outlook_prospects")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    if (!prospect) {
      return new Response(JSON.stringify({ matched: false }), { headers: { "Content-Type": "application/json" } });
    }

    // Update to trial_started
    await sb.from("outlook_prospects").update({
      outreach_status: "trial_started",
      signed_up: true,
      signed_up_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", prospect.id);

    return new Response(JSON.stringify({ matched: true, prospect_id: prospect.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
