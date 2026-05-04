// ============================================================
// RENEWAL-CADENCE-RUNNER (scheduled, daily)
// ============================================================
// For every signed contract where expiration_date is exactly 90, 60,
// or 30 days from today, enroll the deal's primary contact in the
// property's "Renewal cadence" sequence. The sequence itself fires
// the right step at each touch (its day_offset is internal).
//
// Idempotent because prospect_sequence_enrollments has a unique
// constraint on (sequence_id, contact_id) — re-running re-no-ops.
//
// Triggered by Supabase scheduled functions with x-cron-secret.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const RENEWAL_TRIGGER_DAYS = [90, 60, 30];

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Not Found", { status: 404 });
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await sb
    .from("feature_flags").select("enabled").eq("module", "auto_renewal_cadence").maybeSingle();
  if (!flag?.enabled) return jsonResponse({ skipped: true, reason: "flag off" });

  const summary: any[] = [];

  for (const days of RENEWAL_TRIGGER_DAYS) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const targetIso = target.toISOString().slice(0, 10);

    // Find every signed contract expiring on the target date.
    const { data: contracts } = await sb
      .from("contracts")
      .select("id, deal_id, property_id, brand_name")
      .eq("expiration_date", targetIso)
      .eq("signed", true)
      .is("archived_at", null);

    for (const c of contracts || []) {
      // Get property's renewal sequence (creates if absent).
      const { data: seqId } = await sb.rpc("ensure_renewal_sequence", {
        p_property_id: c.property_id,
      });
      if (!seqId) continue;

      // Pick the deal's primary contact.
      const { data: contact } = await sb
        .from("contacts")
        .select("id")
        .eq("deal_id", c.deal_id)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!contact?.id) continue;

      // Account lead is the enroller; falls back to admin.
      const { data: deal } = await sb
        .from("deals")
        .select("account_lead_id, assigned_to_user_id")
        .eq("id", c.deal_id)
        .maybeSingle();
      let enrollerId = deal?.account_lead_id || deal?.assigned_to_user_id;
      if (!enrollerId) {
        const { data: admin } = await sb
          .from("profiles")
          .select("id")
          .eq("property_id", c.property_id)
          .in("role", ["developer", "businessops", "admin"])
          .limit(1)
          .maybeSingle();
        enrollerId = admin?.id;
      }
      if (!enrollerId) continue;

      const { error } = await sb.from("prospect_sequence_enrollments").insert({
        sequence_id: seqId,
        property_id: c.property_id,
        contact_id: contact.id,
        deal_id: c.deal_id,
        enrolled_by: enrollerId,
        current_step: 0,
        next_send_at: new Date().toISOString(),
      });
      // 23505 = already enrolled (idempotent skip)
      if (!error || (error as any).code === "23505") {
        summary.push({ deal_id: c.deal_id, days, brand: c.brand_name });
      }
    }
  }

  return jsonResponse({ enrolled: summary.length, summary });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}
