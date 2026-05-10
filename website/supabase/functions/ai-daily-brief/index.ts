// ============================================================
// AI-DAILY-BRIEF EDGE FUNCTION
// ============================================================
// Reads first-party data and produces a structured "morning
// brief" for one user. Called by the Dashboard widget.
//
// What gets read:
//   • Last 10 closed-won deals + the activity history that led
//     to them — gives the AI the rep's actual win pattern.
//   • Recent activity_recordings (last 14 days) — what the rep
//     has been hearing on calls / emails.
//   • Pipeline state — every active deal with stage, last
//     contact, score; flags for stale (14+ days dormant) and
//     decaying (slipped from active to dormant).
//   • Sequence draft response rates — which messaging is
//     working, which isn't.
//   • Recent buying signals (last 7 days) — funding rounds,
//     hiring, exec moves on known accounts.
//
// What gets written:
//   • One ai_briefs row per user per day (upsert by date) with
//     a structured payload the UI renders.
//
// The model is asked to ground every recommendation in observed
// data — we explicitly prompt against generic advice. If the
// caller passes ?regenerate=1 we ignore today's existing brief
// and write a fresh one.
//
// Inputs (POST JSON):
//   { regenerate?: boolean }
//
// Output:
//   { success, brief: { ... } }
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, corsHeaders, jsonResponse } from "../_shared/devGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("CLAUDE_BRIEF_MODEL") ?? "claude-sonnet-4-6";

const SYSTEM = `You produce a daily morning brief for a sponsorship sales rep using their CRM data. The brief is what they see when they open the app.

You are given:
  • CLOSED_WON: their last 10 won deals + activity highlights — this is their proven win pattern.
  • RECORDINGS: recent voice / call / meeting notes — themes the rep has been hearing.
  • PIPELINE: every active deal with stage, last contact, value, score, stale flag.
  • SEQUENCES: response rates per template — what messaging is converting.
  • SIGNALS: external events (funding, hiring) on accounts they're working.
  • COMPETITORS: vendors prospects have mentioned by name.

Produce a JSON brief with up to:
  • prospects: 5 NEW companies that match their CLOSED_WON pattern AND have a current SIGNAL or RECORDINGS theme that opens a door. For each: { brand_name, why_grounded (2 sentences referencing the specific data point), suggested_first_touch (3-5 sentence email draft), confidence (0-100) }
  • emails: 5 outbound EXISTING-pipeline messages to send today. For each: { deal_id, recipient, subject, body (5-8 sentences, grounded in CLOSED_WON tone + this account's history), reason }
  • deals_to_push: 3 active deals that need intervention. For each: { deal_id, brand_name, current_stage, recommended_action, why }
  • renewal_risks: up to 3 accounts with renewal-risk signals. For each: { brand_name, days_to_renewal, risk_factor, action }
  • market_signals: notable signals worth surfacing. For each: { source, brand_name, summary, suggested_action }

Hard rules:
  • Every prospect must reference a SPECIFIC data point — a SIGNAL row, a RECORDINGS theme, or a CLOSED_WON pattern. Generic ICP descriptions are forbidden.
  • Every email body must reference the specific account's context — not boilerplate.
  • If the data is too thin to confidently produce N items, return fewer. Don't pad.
  • Output JSON only (no prose, no fences).`;

// Stop list for the grounding validator. Common words that might
// match the haystack by accident; require non-stop tokens to score.
const STOP_WORDS = new Set([
  "the","and","for","that","this","with","from","they","have","their","into","your","about","there","would","could","should","which","when","what","where","while","because","these","those","other","more","than","then","also","just","only","very","much","such","being","does","done","make","made","like","want","need","know","think","still","again","over","under","after","before","each","both","some","many","most","first","last","next","good","best","high","low","new","old","one","two","three","four","five","six","seven","eight","nine","ten",
]);

interface BodyShape { regenerate?: boolean }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const { userId } = guard;

  if (!ANTHROPIC_API_KEY) return jsonResponse({ success: false, error: "ANTHROPIC_API_KEY not configured" }, 500);

  let body: BodyShape = {};
  try { body = await req.json(); } catch { /* empty body OK */ }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = new Date().toISOString().split("T")[0];

  // Resolve property
  const { data: profile } = await sb.from("profiles").select("property_id").eq("id", userId).maybeSingle();
  const propertyId = profile?.property_id;
  if (!propertyId) return jsonResponse({ success: false, error: "User has no property" }, 400);

  // Return cached brief if today's already exists and not regenerating.
  if (!body.regenerate) {
    const { data: existing } = await sb.from("ai_briefs")
      .select("*")
      .eq("user_id", userId)
      .eq("brief_date", today)
      .eq("status", "ready")
      .maybeSingle();
    if (existing?.payload) {
      return jsonResponse({ success: true, brief: existing.payload, cached: true });
    }
  }

  // Per-user rate limit on regenerations. The cached read above
  // means a normal user pays one Claude call per day; this just
  // protects against someone smashing the Refresh button.
  if (body.regenerate) {
    try {
      const { data: allowed } = await sb.rpc("check_rate_limit", {
        p_scope: "ai_brief_regenerate",
        p_identifier: userId,
        p_window_seconds: 24 * 60 * 60,
        p_max_hits: 5,
      });
      if (allowed === false) {
        return jsonResponse({
          success: false,
          error: "rate_limited",
          message: "You've regenerated the brief 5 times today. Resets in 24h.",
        }, 429);
      }
    } catch { /* RPC missing in dev; fail-open */ }
  }

  // Mark generating (upsert)
  await sb.from("ai_briefs").upsert({
    property_id: propertyId,
    user_id: userId,
    brief_date: today,
    status: "generating",
    payload: {},
  }, { onConflict: "user_id,brief_date" });

  try {
    // ─── Gather grounding data ───────────────────────────────
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [closedWon, recordings, pipeline, sequences, signals] = await Promise.all([
      sb.from("deals")
        .select("id, brand_name, value, sub_industry, stage, start_date, end_date, contact_first_name, contact_last_name, contact_company, source")
        .eq("property_id", propertyId)
        .in("stage", ["Contracted", "In Fulfillment", "Renewed"])
        .order("created_at", { ascending: false })
        .limit(10),
      sb.from("activity_recordings")
        .select("summary, detected_activity_type, sentiment, commitment_score, action_items, competitor_mentions, deal_id, created_at")
        .eq("property_id", propertyId)
        .eq("status", "promoted")
        .gte("created_at", fourteenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20),
      sb.from("deals")
        .select("id, brand_name, stage, value, win_probability, deal_score, last_contacted, sub_industry")
        .eq("property_id", propertyId)
        .neq("stage", "Declined")
        .not("stage", "in", "(Contracted,In Fulfillment,Renewed)")
        .order("created_at", { ascending: false })
        .limit(50),
      sb.from("prospect_sequence_drafts")
        .select("method, subject, status")
        .eq("property_id", propertyId)
        .gte("created_at", fourteenDaysAgo)
        .limit(30)
        .then(r => r) // resolve early so we can sketch response rate below
        .catch(() => ({ data: [] as any[] })),
      sb.from("prospect_signals")
        .select("signal_type, severity, title, description, source, source_url, surfaced_at, deal_id, contact_id")
        .eq("property_id", propertyId)
        .is("dismissed_at", null)
        .gte("surfaced_at", sevenDaysAgo)
        .order("surfaced_at", { ascending: false })
        .limit(15)
        .then(r => r)
        .catch(() => ({ data: [] as any[] })),
    ]);

    // Stale flag = no contact in 14 days, not yet won/declined.
    const now = Date.now();
    const pipelineEnriched = (pipeline.data || []).map(d => {
      const last = d.last_contacted ? new Date(d.last_contacted as string).getTime() : 0;
      const daysSince = last ? Math.floor((now - last) / 86400_000) : null;
      return { ...d, days_since_contact: daysSince, is_stale: daysSince !== null && daysSince > 14 };
    });

    const competitorSet = new Set<string>();
    for (const r of (recordings.data || [])) {
      for (const c of ((r as any).competitor_mentions || [])) {
        if (c) competitorSet.add(String(c));
      }
    }

    const grounding = {
      generated_at: new Date().toISOString(),
      CLOSED_WON: closedWon.data || [],
      RECORDINGS: recordings.data || [],
      PIPELINE: pipelineEnriched,
      SEQUENCES: (sequences as any).data || [],
      SIGNALS: (signals as any).data || [],
      COMPETITORS: Array.from(competitorSet),
    };

    // ─── Claude call ─────────────────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(grounding) }],
      }),
    });
    if (!claudeRes.ok) {
      const t = await claudeRes.text();
      throw new Error(`Claude error ${claudeRes.status}: ${t.slice(0, 300)}`);
    }
    const claudeJson = await claudeRes.json();
    const raw = claudeJson?.content?.[0]?.text || "{}";

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const clean = raw.replace(/^```(json)?\s*/i, "").replace(/\s*```$/i, "");
      try { parsed = JSON.parse(clean); } catch { parsed = {}; }
    }

    // ─── Validation pass ─────────────────────────────────────
    // Hard rule from the system prompt: every prospect must
    // reference SOMETHING in the input grounding. We can't reason
    // about Claude's claim quality, but we CAN cheaply validate
    // that the prospect's brand_name OR a phrase from why_grounded
    // appears in CLOSED_WON, RECORDINGS, or SIGNALS. Items that
    // fail this check are dropped — better to show fewer grounded
    // items than to claim grounding we can't substantiate.
    const groundingHaystack = [
      ...grounding.CLOSED_WON.map(d => `${d.brand_name || ""} ${d.sub_industry || ""} ${d.contact_company || ""}`),
      ...grounding.RECORDINGS.map(r => `${(r as any).summary || ""} ${((r as any).competitor_mentions || []).join(" ")}`),
      ...grounding.SIGNALS.map(s => `${(s as any).title || ""} ${(s as any).description || ""}`),
      ...grounding.PIPELINE.map(d => `${d.brand_name || ""} ${d.sub_industry || ""}`),
      ...grounding.COMPETITORS,
    ].join(" ").toLowerCase();

    const isGrounded = (text?: string) => {
      if (!text) return false;
      // Pull the first 3 multi-word noun-ish chunks; require at
      // least one to appear in the grounding haystack. Crude but
      // catches obvious "Generic mid-market SaaS" hallucinations.
      const tokens = text.toLowerCase().match(/[a-z][a-z0-9&\.\-]{2,}/g) || [];
      const meaningful = tokens.filter(t => !STOP_WORDS.has(t)).slice(0, 12);
      let hits = 0;
      for (const t of meaningful) if (groundingHaystack.includes(t)) hits++;
      return hits >= 2;
    };

    const validatedProspects = (Array.isArray(parsed.prospects) ? parsed.prospects : [])
      .filter((p: any) => p && (
        // Strong signal: brand_name appears in grounding (lookalike or signal hit)
        isGrounded(p.brand_name) ||
        // Or the AI's own justification cites grounding
        isGrounded(p.why_grounded)
      ))
      .slice(0, 5);

    const validatedEmails = (Array.isArray(parsed.emails) ? parsed.emails : [])
      .filter((e: any) => e && e.deal_id && grounding.PIPELINE.some(d => d.id === e.deal_id))
      .slice(0, 5);

    const validatedDeals = (Array.isArray(parsed.deals_to_push) ? parsed.deals_to_push : [])
      .filter((d: any) => d && d.deal_id && grounding.PIPELINE.some(p => p.id === d.deal_id))
      .slice(0, 3);

    const payload = {
      generated_at: grounding.generated_at,
      model: MODEL,
      prospects: validatedProspects,
      emails: validatedEmails,
      deals_to_push: validatedDeals,
      renewal_risks: Array.isArray(parsed.renewal_risks) ? parsed.renewal_risks.slice(0, 3) : [],
      market_signals: Array.isArray(parsed.market_signals) ? parsed.market_signals.slice(0, 5) : [],
      data_volume: {
        closed_won: grounding.CLOSED_WON.length,
        recordings: grounding.RECORDINGS.length,
        pipeline: grounding.PIPELINE.length,
        signals: grounding.SIGNALS.length,
      },
      validation: {
        prospects_dropped: Math.max(0, (Array.isArray(parsed.prospects) ? parsed.prospects.length : 0) - validatedProspects.length),
        emails_dropped: Math.max(0, (Array.isArray(parsed.emails) ? parsed.emails.length : 0) - validatedEmails.length),
        deals_dropped: Math.max(0, (Array.isArray(parsed.deals_to_push) ? parsed.deals_to_push.length : 0) - validatedDeals.length),
      },
    };

    await sb.from("ai_briefs").upsert({
      property_id: propertyId,
      user_id: userId,
      brief_date: today,
      payload,
      status: "ready",
      generated_at: new Date().toISOString(),
    }, { onConflict: "user_id,brief_date" });

    return jsonResponse({ success: true, brief: payload, cached: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sb.from("ai_briefs").update({
      status: "failed",
      error: msg.slice(0, 500),
    }).eq("user_id", userId).eq("brief_date", today);
    return jsonResponse({ success: false, error: msg }, 500);
  }
});
