// ============================================================
// AI-RESEARCH-DEAL EDGE FUNCTION (Ring 1 — background research agent)
// ============================================================
// Picks up a single deal and produces an agent_brief: a multi-step
// research pass that gives the rep what they need to walk into the
// next conversation without spending 20 minutes Googling.
//
// What the agent looks at:
//   • The deal row itself (brand, industry, value, stage, contacts).
//   • Recent activities on the deal (calls, emails, notes, meetings).
//   • Recent recordings — transcript summaries + extracted action
//     items + competitor mentions.
//   • Any prospect_signals attached to the deal or its brand.
//   • Comparable closed-won deals in the same industry / value band.
//
// Output → deal_research row of kind='agent_brief', payload:
//   { headline, summary, talking_points: string[],
//     red_flags: string[], comparable_wins: [{ id, brand_name }],
//     confidence: 0-100 }
//
// Callable two ways:
//   • Direct: POST { deal_id }  — runs immediately, auth via user JWT.
//   • Cron:   POST { deal_id, user_id } with service-role auth.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, corsHeaders, jsonResponse } from "../_shared/devGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("CLAUDE_RESEARCH_MODEL") ?? "claude-sonnet-4-6";

// Per-user daily cap. Research agent runs cheap models on a small
// data envelope, but we still don't want a misconfigured cron
// thrashing on the same deal 50 times.
const DAILY_RESEARCH_CAP = 100;

const SYSTEM = `You are a research agent for a sponsorship sales rep. Given everything the CRM knows about one deal, you produce a structured brief that lets the rep walk into the next conversation prepared. You are NOT writing outreach — you are giving the human the context to do that themselves.

You receive:
  • DEAL — current row (brand, industry, value, stage, contacts).
  • ACTIVITIES — last 15 logged interactions (calls, emails, meetings, notes).
  • RECORDINGS — recent call / meeting transcript summaries.
  • SIGNALS — buying signals attached to this account.
  • COMPARABLE_WINS — closed-won deals in the same industry / size band.

Output JSON ONLY (no prose, no fences):
{
  "headline": "<one-sentence hook the rep can lead with>",
  "summary": "<2-3 sentence situation summary>",
  "talking_points": [ "<concrete thing to bring up>", ... up to 5 ],
  "red_flags": [ "<concrete risk visible in the data>", ... up to 3 ],
  "comparable_wins": [ { "id": "<deal_id from COMPARABLE_WINS>", "why_similar": "<one sentence>" }, ... up to 3 ],
  "confidence": <0-100, how grounded the brief is>
}

Hard rules:
  - talking_points MUST cite a specific data point — a signal, a quote from a recording summary, a comparable win. No generic "you should learn about their business."
  - red_flags MUST be visible in the input. If nothing concerning is in the data, return [].
  - comparable_wins.id must be an id that actually appears in COMPARABLE_WINS — don't invent.
  - confidence should be LOW when ACTIVITIES + RECORDINGS + SIGNALS are all empty.
  - Never fabricate stats, news, or quotes that aren't in the input.`;

interface Body {
  deal_id: string;
  // Optional — only used when called from cron via service role
  user_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const { userId } = guard;

  if (!ANTHROPIC_API_KEY) return jsonResponse({ success: false, error: "ANTHROPIC_API_KEY not configured" }, 500);

  let body: Body;
  try { body = await req.json(); }
  catch { return jsonResponse({ success: false, error: "Invalid JSON body" }, 400); }
  if (!body.deal_id) return jsonResponse({ success: false, error: "deal_id required" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // ─── Rate limit ─────────────────────────────────────────────
  try {
    const { data: allowed } = await sb.rpc("check_rate_limit", {
      p_scope: "ai_research_deal",
      p_identifier: userId,
      p_window_seconds: 24 * 60 * 60,
      p_max_hits: DAILY_RESEARCH_CAP,
    });
    if (allowed === false) {
      return jsonResponse({
        success: false,
        error: "rate_limited",
        message: `Daily research cap of ${DAILY_RESEARCH_CAP} hit. Resets in 24h.`,
      }, 429);
    }
  } catch { /* RPC missing in dev; fail-open */ }

  // ─── Pull the deal + gating ─────────────────────────────────
  const { data: deal, error: dealErr } = await sb.from("deals")
    .select("id, property_id, brand_name, sub_industry, value, stage, win_probability, deal_score, contact_name, contact_first_name, contact_last_name, contact_email, contact_company, source, start_date, end_date, last_contacted, notes, created_at")
    .eq("id", body.deal_id)
    .maybeSingle();
  if (dealErr || !deal) return jsonResponse({ success: false, error: "Deal not found" }, 404);

  // ─── Gather grounding ───────────────────────────────────────
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400_000).toISOString();

  const [activities, recordings, signals, similarWins] = await Promise.all([
    sb.from("activities")
      .select("activity_type, subject, description, occurred_at, source")
      .eq("deal_id", deal.id)
      .order("occurred_at", { ascending: false })
      .limit(15),
    sb.from("activity_recordings")
      .select("summary, sentiment, commitment_score, competitor_mentions, created_at")
      .eq("deal_id", deal.id)
      .eq("status", "promoted")
      .order("created_at", { ascending: false })
      .limit(10),
    sb.from("prospect_signals")
      .select("signal_type, severity, title, description, source, surfaced_at")
      .eq("deal_id", deal.id)
      .is("dismissed_at", null)
      .order("surfaced_at", { ascending: false })
      .limit(15)
      .then(r => r)
      .catch(() => ({ data: [] as any[] })),
    sb.from("deals")
      .select("id, brand_name, sub_industry, value, stage, end_date")
      .eq("property_id", deal.property_id)
      .in("stage", ["Contracted", "In Fulfillment", "Renewed"])
      .neq("id", deal.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Score similar wins by industry + value band so the agent's
  // "comparable_wins" picks have a sensible candidate set.
  const allWins = similarWins.data || [];
  const sameIndustry = allWins.filter(w => w.sub_industry === deal.sub_industry).slice(0, 5);
  const dealValue = Number(deal.value) || 0;
  const closeValue = dealValue ? allWins
    .filter(w => Math.abs((Number(w.value) || 0) - dealValue) < dealValue * 0.5)
    .slice(0, 5) : [];
  const comparablePool = [
    ...sameIndustry,
    ...closeValue.filter(w => !sameIndustry.find(s => s.id === w.id)),
  ].slice(0, 8);

  const grounding = {
    DEAL: {
      id: deal.id,
      brand_name: deal.brand_name,
      sub_industry: deal.sub_industry,
      value: deal.value,
      stage: deal.stage,
      win_probability: deal.win_probability,
      deal_score: deal.deal_score,
      contact: [deal.contact_first_name, deal.contact_last_name].filter(Boolean).join(" ") || deal.contact_name,
      contact_email: deal.contact_email,
      contact_company: deal.contact_company,
      source: deal.source,
      start_date: deal.start_date,
      end_date: deal.end_date,
      last_contacted: deal.last_contacted,
      notes: (deal.notes || "").slice(0, 1500),
    },
    ACTIVITIES: activities.data || [],
    RECORDINGS: recordings.data || [],
    SIGNALS: (signals as any).data || [],
    COMPARABLE_WINS: comparablePool,
  };

  // ─── Claude call ───────────────────────────────────────────
  let claudeJson: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(grounding) }],
      }),
    });
    if (res.ok) { claudeJson = await res.json(); break; }
    const t = await res.text();
    if (res.status >= 500 && attempt === 0) {
      await new Promise(r => setTimeout(r, 700));
      continue;
    }
    return jsonResponse({ success: false, error: `Claude error ${res.status}: ${t.slice(0, 200)}` }, 500);
  }

  const raw = claudeJson?.content?.[0]?.text || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    const clean = raw.replace(/^```(json)?\s*/i, "").replace(/\s*```$/i, "");
    try { parsed = JSON.parse(clean); } catch { parsed = {}; }
  }

  // ─── Validation — drop comparable_wins ids the model invented ─
  const winIds = new Set(comparablePool.map(w => w.id));
  const validatedComparables = (Array.isArray(parsed.comparable_wins) ? parsed.comparable_wins : [])
    .filter((c: any) => c && winIds.has(c.id))
    .slice(0, 3);

  const payload = {
    headline: typeof parsed.headline === "string" ? parsed.headline : "",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    talking_points: Array.isArray(parsed.talking_points) ? parsed.talking_points.slice(0, 5) : [],
    red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.slice(0, 3) : [],
    comparable_wins: validatedComparables,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50,
    data_volume: {
      activities: grounding.ACTIVITIES.length,
      recordings: grounding.RECORDINGS.length,
      signals: grounding.SIGNALS.length,
      comparable_pool: comparablePool.length,
    },
  };

  // ─── Store ──────────────────────────────────────────────────
  const { data: row, error: insErr } = await sb.from("deal_research").insert({
    property_id: deal.property_id,
    deal_id: deal.id,
    kind: "agent_brief",
    payload,
    model: MODEL,
    generated_by: body.user_id ? "cron" : "manual",
  }).select("id, generated_at").single();
  if (insErr) return jsonResponse({ success: false, error: insErr.message }, 500);

  return jsonResponse({
    success: true,
    research_id: row.id,
    generated_at: row.generated_at,
    payload,
  });
});
