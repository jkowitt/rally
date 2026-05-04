// ============================================================
// SLA-RUNNER (scheduled, hourly)
// ============================================================
// For each property's sla_policies, finds deals in the policy's
// stage that have been there longer than max_days_in_stage. Logs
// a row in sla_breaches and fires the configured escalation:
//   • nudge      — adds a coaching nudge (already in coaching_nudges
//                  view — this just logs the breach so it shows up)
//   • task       — inserts a task assigned to the deal's owner
//   • reassign   — sets account_lead_id to policy.reassign_to
//
// Triggered by Supabase scheduled functions with x-cron-secret.
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

  const { data: flag } = await sb
    .from("feature_flags").select("enabled").eq("module", "sla_policies").maybeSingle();
  if (!flag?.enabled) return jsonResponse({ skipped: true, reason: "flag off" });

  const { data: policies } = await sb
    .from("sla_policies")
    .select("*")
    .eq("is_active", true);

  const summary: any[] = [];
  for (const policy of policies || []) {
    const cutoff = new Date(Date.now() - policy.max_days_in_stage * 86400_000).toISOString();
    const { data: stuck } = await sb
      .from("deals")
      .select("id, brand_name, account_lead_id, assigned_to_user_id, stage_entered_at")
      .eq("property_id", policy.property_id)
      .eq("stage", policy.stage)
      .lte("stage_entered_at", cutoff);

    for (const d of stuck || []) {
      const days = Math.floor((Date.now() - new Date(d.stage_entered_at).getTime()) / 86400_000);

      // Already flagged + unresolved? skip.
      const { data: existing } = await sb
        .from("sla_breaches")
        .select("id")
        .eq("deal_id", d.id)
        .eq("policy_id", policy.id)
        .is("resolved_at", null)
        .maybeSingle();
      if (existing) continue;

      await sb.from("sla_breaches").insert({
        property_id: policy.property_id,
        deal_id: d.id,
        policy_id: policy.id,
        stage_when_breached: policy.stage,
        days_in_stage: days,
      });

      // Fire escalation.
      if (policy.escalation_action === "task") {
        const ownerId = d.account_lead_id || d.assigned_to_user_id;
        if (ownerId) {
          await sb.from("tasks").insert({
            property_id: policy.property_id,
            assigned_to: ownerId,
            related_deal_id: d.id,
            title: `SLA breach: ${d.brand_name} stuck in ${policy.stage} ${days}d`,
            description: `Policy "${policy.stage} → ${policy.max_days_in_stage}d" exceeded. Move it forward or update the stage.`,
            priority: "High",
            due_at: new Date().toISOString(),
            status: "open",
          });
        }
      } else if (policy.escalation_action === "reassign" && policy.reassign_to) {
        await sb.from("deals").update({ account_lead_id: policy.reassign_to }).eq("id", d.id);
      }
      // 'nudge' has no action — coaching_nudges view computes from
      // last_contacted, which is independent. The breach row alone
      // makes it visible in the SLA breach UI.

      summary.push({ deal_id: d.id, stage: policy.stage, days });
    }
  }
  return jsonResponse({ flagged: summary.length, summary });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}
