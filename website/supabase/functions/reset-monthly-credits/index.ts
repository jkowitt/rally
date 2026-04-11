// ============================================================
// RESET-MONTHLY-CREDITS
// ============================================================
// Scheduled monthly (1st of month). Resets plan_credits_remaining
// for every organization back to their plan's allocation.
// Purchased credits are never touched.
//
// Authentication: x-cron-secret header.
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

  // Get every organization and their plan allocation
  const { data: billings } = await sb
    .from("organization_billing")
    .select("property_id, plan_key");

  if (!billings) return json({ reset: 0 });

  // Get plan allocations once
  const { data: planLimits } = await sb
    .from("plan_limits")
    .select("*, pricing_plans!inner(plan_key)")
    .eq("limit_key", "ai_credits_per_month");

  const allocationByPlan: Record<string, number> = {};
  (planLimits || []).forEach((l: any) => {
    allocationByPlan[l.pricing_plans.plan_key] = l.limit_value === -1 ? 999999 : l.limit_value;
  });

  let reset = 0;
  for (const b of billings) {
    const allocation = allocationByPlan[b.plan_key] ?? 100;

    const { data: existing } = await sb
      .from("organization_ai_credits")
      .select("*")
      .eq("property_id", b.property_id)
      .maybeSingle();

    if (existing) {
      const before = (existing.plan_credits_remaining || 0) + (existing.purchased_credits_remaining || 0);
      const after = allocation + (existing.purchased_credits_remaining || 0);

      await sb
        .from("organization_ai_credits")
        .update({
          plan_credits_remaining: allocation,
          total_credits_used_this_period: 0,
          period_start: new Date().toISOString(),
          period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          last_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      await sb.from("ai_credit_transactions").insert({
        property_id: b.property_id,
        transaction_type: "plan_allocation",
        credits_delta: allocation - (existing.plan_credits_remaining || 0),
        credits_before: before,
        credits_after: after,
        description: `Monthly plan allocation reset (${b.plan_key})`,
      });
    } else {
      await sb.from("organization_ai_credits").insert({
        property_id: b.property_id,
        plan_credits_remaining: allocation,
        purchased_credits_remaining: 0,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        last_reset_at: new Date().toISOString(),
      });
    }
    reset++;
  }

  return json({ reset });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}
