// ============================================================
// AI-RESEARCH-RUNNER EDGE FUNCTION (Ring 1 — scheduler)
// ============================================================
// Cron-triggered. Picks the N deals across the system that most
// need a fresh research brief and invokes ai-research-deal once
// per deal. "Most need" = active, recently-touched, no
// agent_brief in the last 14 days.
//
// Why a separate runner: keeps ai-research-deal a clean single-
// deal function (callable manually from the UI), and isolates the
// scheduling logic so we can tune the picker without touching the
// agent itself.
//
// Auth: service-role only.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/devGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// Total deals we'll research per cron run. Tuned to keep
// Anthropic spend predictable — each pass costs ~$0.02-0.05.
const BATCH_PER_RUN = 20;
const CONCURRENCY = 3;
// "Recent research" window — skip deals that already have a
// brief from the last N days.
const RESEARCH_TTL_DAYS = 14;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (auth !== SERVICE_KEY) return jsonResponse({ error: "Unauthorized" }, 401);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const fourteenDaysAgo = new Date(Date.now() - RESEARCH_TTL_DAYS * 86400_000).toISOString();

  // Pull recently-researched deal_ids so we can exclude them from
  // the picker without writing a left-join in PostgREST.
  const { data: recent } = await sb.from("deal_research")
    .select("deal_id")
    .eq("kind", "agent_brief")
    .gte("generated_at", fourteenDaysAgo);
  const recentSet = new Set((recent || []).map(r => r.deal_id));

  // Pick candidates: active (not Declined / Renewed), have at
  // least one activity OR signal so the agent has SOMETHING to
  // research, ordered by deal_score desc + recently-touched
  // first. Pull more than needed; filter the cached ones; trim
  // to BATCH_PER_RUN.
  const { data: deals } = await sb.from("deals")
    .select("id, property_id, brand_name, deal_score, last_contacted, stage, created_by")
    .not("stage", "in", "(Declined,Renewed)")
    .order("deal_score", { ascending: false })
    .order("last_contacted", { ascending: false, nullsFirst: false })
    .limit(BATCH_PER_RUN * 3);

  const candidates = (deals || []).filter(d => !recentSet.has(d.id)).slice(0, BATCH_PER_RUN);

  if (candidates.length === 0) {
    return jsonResponse({ success: true, message: "Nothing to research", picked: 0 });
  }

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(async (d) => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-research-deal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          deal_id: d.id,
          user_id: d.created_by,  // required by requireUser when called via service role
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`deal=${d.id.slice(0, 8)} ${r.status}: ${t.slice(0, 100)}`);
      }
    }));
    for (const res of results) {
      if (res.status === "fulfilled") succeeded++;
      else { failed++; errors.push(String(res.reason).slice(0, 200)); }
    }
  }

  return jsonResponse({
    success: true,
    picked: candidates.length,
    succeeded,
    failed,
    errors: errors.slice(0, 5),
  });
});
