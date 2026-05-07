// ============================================================
// SEQUENCE-GENERATOR EDGE FUNCTION
// ============================================================
// Claude-only. Generates a sequence of personalized first
// outreach drafts (cold email, LinkedIn DM, voicemail/phone
// script) for every selected prospect × every step in the
// cadence. Each (prospect, step) gets its own unique copy —
// not the same template substituted by name. The rep then
// reviews + approves drafts; approved drafts spawn tasks.
//
// Inputs (POST JSON):
//   {
//     sequence_id: uuid,        // existing prospect_sequences row
//     deal_ids:    uuid[],      // deals to enroll
//     touchpoints: number,      // 1-12
//     duration_days: number,    // 1-90
//     methods_order: string[],  // ['email','linkedin','phone',...]
//     time_of_day:  'morning'|'midday'|'afternoon'|'evening'
//                                (default per step)
//     notify_user: boolean      // push reminder when each step fires
//   }
//
// Side effects:
//   - Replaces prospect_sequences.{total_touchpoints,duration_days,
//     methods_order,drafts_generated_at}
//   - Replaces prospect_sequence_steps for the sequence
//   - Inserts prospect_sequence_enrollments per deal_id (if missing)
//   - Inserts prospect_sequence_drafts per (enrollment × step)
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, corsHeaders, jsonResponse } from "../_shared/devGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("SEQUENCE_GENERATOR_MODEL") ?? "claude-sonnet-4-6";

// Default hour-of-day for each window. UTC offset is applied by
// reading the rep's local timezone from their profile when we
// schedule the spawned tasks; for now we anchor in UTC since the
// task list is rendered in user-local time client-side anyway.
const HOUR_BY_WINDOW: Record<string, number> = {
  morning: 9,
  midday: 12,
  afternoon: 14,
  evening: 17,
};

interface GenerateBody {
  sequence_id: string;
  deal_ids: string[];
  touchpoints: number;
  duration_days: number;
  methods_order: string[];
  time_of_day?: string;
  notify_user?: boolean;
  // New in migration 098 — let Claude write to a goal instead
  // of generic "introduce yourself" outreach.
  goal_summary?: string;
  initiatives?: string;
  final_ask?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const { userId } = guard;

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ success: false, error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const {
    sequence_id, deal_ids, touchpoints, duration_days, methods_order,
    time_of_day = "morning", notify_user = true,
    goal_summary, initiatives, final_ask,
  } = body;

  // ─── Validate inputs ─────────────────────────────────────
  if (!sequence_id) return jsonResponse({ success: false, error: "sequence_id required" }, 400);
  if (!Array.isArray(deal_ids) || deal_ids.length === 0)
    return jsonResponse({ success: false, error: "deal_ids must be non-empty" }, 400);
  if (!Number.isFinite(touchpoints) || touchpoints < 1 || touchpoints > 12)
    return jsonResponse({ success: false, error: "touchpoints must be 1-12" }, 400);
  if (!Number.isFinite(duration_days) || duration_days < 1 || duration_days > 90)
    return jsonResponse({ success: false, error: "duration_days must be 1-90" }, 400);
  if (!Array.isArray(methods_order) || methods_order.length === 0)
    return jsonResponse({ success: false, error: "methods_order must be non-empty" }, 400);
  for (const m of methods_order) {
    if (!["email", "linkedin", "phone", "task"].includes(m))
      return jsonResponse({ success: false, error: `unknown method: ${m}` }, 400);
  }

  // ─── Property + sequence guard ───────────────────────────
  const { data: profile } = await sb
    .from("profiles").select("property_id, full_name")
    .eq("id", userId).maybeSingle();
  const propertyId = profile?.property_id;
  if (!propertyId) return jsonResponse({ success: false, error: "user has no property" }, 400);

  // Pull the rep's company-pitch + property name so Claude can
  // tailor outreach to what THIS company actually sells.
  const { data: property } = await sb
    .from("properties").select("name, company_context, type")
    .eq("id", propertyId).maybeSingle();

  const { data: seq } = await sb
    .from("prospect_sequences").select("*")
    .eq("id", sequence_id).eq("property_id", propertyId).maybeSingle();
  if (!seq) return jsonResponse({ success: false, error: "sequence not found" }, 404);

  // ─── Compute step plan ───────────────────────────────────
  // Spread touchpoints evenly across duration_days. First step
  // fires on day 0, last on duration_days - 1. Method cycles
  // through methods_order.
  const dayInterval = touchpoints === 1 ? 0 : (duration_days - 1) / (touchpoints - 1);
  const steps = Array.from({ length: touchpoints }, (_, i) => ({
    step_index: i,
    day_offset: Math.round(i * dayInterval),
    method: methods_order[i % methods_order.length],
    time_of_day_window: time_of_day,
  }));

  // ─── Reset sequence steps ────────────────────────────────
  await sb.from("prospect_sequence_steps").delete().eq("sequence_id", sequence_id);
  const stepRows = steps.map(s => ({
    sequence_id,
    step_index: s.step_index,
    day_offset: s.day_offset,
    method: s.method,
    time_of_day_window: s.time_of_day_window,
    subject_template: "",
    body_template: "",
  }));
  const { data: insertedSteps, error: stepErr } = await sb
    .from("prospect_sequence_steps").insert(stepRows).select();
  if (stepErr) return jsonResponse({ success: false, error: `steps insert: ${stepErr.message}` }, 500);

  await sb.from("prospect_sequences").update({
    total_touchpoints: touchpoints,
    duration_days,
    methods_order,
    drafts_generated_at: new Date().toISOString(),
    goal_summary: goal_summary || null,
    initiatives: initiatives || null,
    final_ask: final_ask || null,
  }).eq("id", sequence_id);

  // ─── Resolve deals + primary contacts ───────────────────
  const { data: deals } = await sb
    .from("deals")
    .select("id, brand_name, sub_industry, website, value, contact_first_name, contact_last_name, contact_email, contact_position, notes")
    .eq("property_id", propertyId)
    .in("id", deal_ids);
  if (!deals || deals.length === 0)
    return jsonResponse({ success: false, error: "no deals matched" }, 404);

  const { data: contacts } = await sb
    .from("contacts")
    .select("id, deal_id, first_name, last_name, email, position, linkedin_url")
    .in("deal_id", deal_ids)
    .order("is_primary", { ascending: false });
  const primaryContactByDeal = new Map<string, any>();
  for (const c of contacts || []) {
    if (!primaryContactByDeal.has(c.deal_id)) primaryContactByDeal.set(c.deal_id, c);
  }

  // Pull cached company research (industry, leadership, summary)
  // for any of the selected companies. Helps Claude reference
  // real public-web facts instead of guessing.
  const dealCompanyNames = deals.map(d => d.brand_name).filter(Boolean);
  const { data: research } = dealCompanyNames.length
    ? await sb
        .from("company_research")
        .select("company_name, industry, website, description, leadership")
        .eq("property_id", propertyId)
        .in("company_name", dealCompanyNames)
    : { data: [] };
  const researchByName = new Map<string, any>();
  for (const r of research || []) researchByName.set((r.company_name || "").toLowerCase(), r);

  // ─── Enroll deals (idempotent) ──────────────────────────
  // Migration 098 dropped the NOT NULL on contact_id, so deals
  // without a contacts row still enroll — they just target the
  // company generically (or the inline deal.contact_first_name
  // if populated).
  const enrollmentByDeal = new Map<string, string>();
  for (const deal of deals) {
    const contact = primaryContactByDeal.get(deal.id);
    const contactId = contact?.id ?? null;

    // Look up an existing enrollment matching either the contact
    // (when present) or the deal (when not).
    let existingId: string | null = null;
    if (contactId) {
      const { data: existing } = await sb
        .from("prospect_sequence_enrollments")
        .select("id")
        .eq("sequence_id", sequence_id)
        .eq("contact_id", contactId)
        .maybeSingle();
      existingId = existing?.id || null;
    } else {
      const { data: existing } = await sb
        .from("prospect_sequence_enrollments")
        .select("id")
        .eq("sequence_id", sequence_id)
        .is("contact_id", null)
        .eq("deal_id", deal.id)
        .maybeSingle();
      existingId = existing?.id || null;
    }

    let enrollmentId = existingId;
    if (!enrollmentId) {
      const { data: newEnr, error: enrErr } = await sb.from("prospect_sequence_enrollments").insert({
        sequence_id,
        property_id: propertyId,
        contact_id: contactId,
        deal_id: deal.id,
        enrolled_by: userId,
        current_step: 0,
        next_send_at: new Date().toISOString(),
        notify_user,
        generation_status: "generating",
      }).select("id").single();
      if (enrErr) {
        // Skip-and-log rather than crashing the whole batch.
        continue;
      }
      enrollmentId = newEnr?.id;
    } else {
      await sb.from("prospect_sequence_enrollments")
        .update({ notify_user, generation_status: "generating" })
        .eq("id", enrollmentId);
    }
    if (enrollmentId) enrollmentByDeal.set(deal.id, enrollmentId);
  }

  // ─── Generate drafts ────────────────────────────────────
  // One Claude call per deal (returns the full step array). This
  // keeps us within reasonable token budgets and lets the model
  // see all touchpoints at once for narrative continuity.
  const senderName = profile?.full_name || "the team";
  let totalDrafts = 0;
  const errors: string[] = [];

  for (const deal of deals) {
    const enrollmentId = enrollmentByDeal.get(deal.id);
    if (!enrollmentId) continue;
    const contact = primaryContactByDeal.get(deal.id);
    // Fall back to inline deal contact fields when no contacts row.
    const inlineContact = !contact && (deal.contact_first_name || deal.contact_email)
      ? {
          first_name: deal.contact_first_name,
          last_name: deal.contact_last_name,
          email: deal.contact_email,
          position: deal.contact_position,
        }
      : null;
    const cachedResearch = researchByName.get((deal.brand_name || "").toLowerCase()) || null;

    try {
      const drafts = await generateForDeal({
        deal,
        contact: contact || inlineContact,
        steps,
        senderName,
        sequenceContext: {
          goal: goal_summary,
          initiatives,
          finalAsk: final_ask,
        },
        companyContext: {
          name: property?.name,
          pitch: property?.company_context,
        },
        researchSnapshot: cachedResearch,
      });
      // Replace existing drafts for this enrollment
      await sb.from("prospect_sequence_drafts")
        .delete().eq("enrollment_id", enrollmentId);
      const baseDate = new Date();
      const draftRows = drafts.map((d, i) => {
        const stepCfg = steps[i];
        const dt = new Date(baseDate);
        dt.setDate(dt.getDate() + stepCfg.day_offset);
        dt.setHours(HOUR_BY_WINDOW[stepCfg.time_of_day_window] || 9, 0, 0, 0);
        return {
          property_id: propertyId,
          enrollment_id: enrollmentId,
          step_id: insertedSteps?.[i]?.id || null,
          step_index: i,
          method: stepCfg.method,
          scheduled_at: dt.toISOString(),
          subject: d.subject || null,
          body: d.body || "",
          status: "pending",
        };
      });
      const { error } = await sb
        .from("prospect_sequence_drafts").insert(draftRows);
      if (error) throw error;
      totalDrafts += draftRows.length;
      await sb.from("prospect_sequence_enrollments")
        .update({ generation_status: "ready", last_draft_generated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
    } catch (err) {
      errors.push(`${deal.brand_name}: ${String(err).slice(0, 200)}`);
      await sb.from("prospect_sequence_enrollments")
        .update({ generation_status: "failed" })
        .eq("id", enrollmentId);
    }
  }

  return jsonResponse({
    success: true,
    sequence_id,
    enrolled: enrollmentByDeal.size,
    drafts: totalDrafts,
    errors,
  });
});

// ─── Claude prompt + dispatcher ────────────────────────────
async function generateForDeal(args: {
  deal: any;
  contact: any;
  steps: Array<{ step_index: number; day_offset: number; method: string; time_of_day_window: string }>;
  senderName: string;
  sequenceContext: { goal?: string; initiatives?: string; finalAsk?: string };
  companyContext: { name?: string; pitch?: string };
  researchSnapshot: { industry?: string; description?: string; leadership?: Array<{ name: string; title: string }> } | null;
}): Promise<Array<{ subject: string | null; body: string }>> {
  const { deal, contact, steps, senderName, sequenceContext, companyContext, researchSnapshot } = args;

  const stepDescriptors = steps.map(s =>
    `Step ${s.step_index + 1} (day ${s.day_offset}, channel: ${s.method})`
  ).join("\n");

  const systemPrompt = `You are an expert B2B SDR writing first-touch outreach. Produce ONE draft per step in a multi-touch cadence. Each draft must be specific to the prospect — never generic. Reference what they actually do. Keep it short and human; nothing salesy.

Format your output as JSON ONLY (no prose, no fences):

[
  { "step_index": 0, "subject": "…", "body": "…" },
  { "step_index": 1, "subject": null, "body": "…" },
  …
]

Rules per channel:
  • email     → subject required (max 60 chars). Body 60-120 words. Sign off with "${senderName}".
  • linkedin  → subject = null. Body 30-80 words, conversational, no signature.
  • phone     → subject = null. Body is a 30-second voicemail SCRIPT in second person ("Hey {first_name}, this is ${senderName}…"). 50-90 words.
  • task      → subject = null. Body is a one-line internal note for the rep ("Research recent funding announcement", "Look up event sponsorship lead"). 5-15 words.

Carry a thread across the steps — don't repeat yourself across touches. Step 1 is intro; later steps reference earlier outreach without sounding pushy. Final step should feel like a graceful breakup that names the specific ask.`;

  const contactBlock = contact && (contact.first_name || contact.email) ? `
Primary contact:
  Name: ${[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "(unknown)"}
  Title: ${contact.position || "(unknown)"}
  Email: ${contact.email || "(unknown)"}
` : "Primary contact: (none on file — write to the company generically; reference whoever owns the relevant function in your address line)";

  // Sender-side context: who the rep works for + their pitch.
  // Without this Claude has to guess what we sell, which is why
  // the pre-098 drafts read so generic.
  const senderBlock = `
Sender's company: ${companyContext.name || "(unspecified)"}
What we do: ${companyContext.pitch || "(not provided — keep value-prop generic)"}`;

  // Sequence-level intent. When the rep filled this in, drafts
  // can drive toward a real goal instead of "introduce yourself".
  const intentBlock = `
Sequence goal: ${sequenceContext.goal || "(not specified — default to booking a 15-minute discovery call)"}
Initiatives / talking points: ${sequenceContext.initiatives || "(none provided)"}
Specific ask in the final touch: ${sequenceContext.finalAsk || "Book a meeting"}`;

  // Cached web research from the company-research feature, when
  // the rep has run it before. Adds real public-web facts that
  // Claude can reference in the opener.
  const researchBlock = researchSnapshot ? `
Public-web research:
  Industry: ${researchSnapshot.industry || "(not captured)"}
  About: ${researchSnapshot.description || "(not captured)"}
  Leadership: ${(researchSnapshot.leadership || []).slice(0, 5).map(p => `${p.name} (${p.title})`).join("; ") || "(not captured)"}` : "";

  const userPrompt = `Prospect: ${deal.brand_name}
Industry (from CRM): ${deal.sub_industry || "unknown"}
Website: ${deal.website || "unknown"}
Notes from CRM: ${deal.notes || "(none)"}
${contactBlock}
${researchBlock}
${senderBlock}
${intentBlock}

Sender: ${senderName}

Cadence:
${stepDescriptors}

Return one JSON object per step in array order. Keep step_index values matching the cadence above.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`claude_${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text).join("\n").trim();

  // Strip code fences if present
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`bad_json_from_claude: ${String(err).slice(0, 100)}`);
  }
  if (!Array.isArray(parsed)) throw new Error("claude returned non-array");
  return parsed.map((p: { subject?: string | null; body?: string }) => ({
    subject: p.subject ?? null,
    body: p.body ?? "",
  }));
}
