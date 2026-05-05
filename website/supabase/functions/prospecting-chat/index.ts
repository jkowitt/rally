// ============================================================
// PROSPECTING-CHAT
// ============================================================
// A scoped chat assistant for sales reps working through prospecting,
// outreach, and target-list strategy. Hard-locked to that domain — if
// the rep asks about anything else, the model is instructed to refuse
// politely and steer back to prospecting work.
//
// Provider: OpenAI gpt-4.1-mini by default (fresh knowledge, still
// cheap for chat — gpt-4o-mini has an Oct-2023 cutoff so it kept
// telling reps "my data is only up to October 2023" when they
// asked about real prospects).
// Falls back to Anthropic Claude Haiku when OPENAI_API_KEY is unset
// so the feature still works in environments configured for Claude.
//
// Authentication: JWT required.
// Rate limit: 60 messages / hour per user.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, logRateLimitCall } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const CHAT_MODEL_OPENAI    = Deno.env.get("PROSPECTING_CHAT_MODEL_OPENAI")    ?? "gpt-4.1-mini";
const CHAT_MODEL_ANTHROPIC = Deno.env.get("PROSPECTING_CHAT_MODEL_ANTHROPIC") ?? "claude-haiku-4-5-20251001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Loud Legacy's prospecting + outreach copilot — a sales-development assistant for B2B revenue reps. You help with FOUR things ONLY:

1. PROSPECTING — finding good-fit companies, building target lists, refining ICP criteria, evaluating whether a specific company is worth pursuing.
2. OUTREACH STRATEGIES — first-touch messaging, multi-step sequences, channel mix (email / LinkedIn / phone), reply handling, objection responses, follow-up cadence.
3. POSSIBLE TARGETS — given a property type (sports team, media outlet, conference, etc.) or an existing pipeline, suggesting realistic mid-market or local companies that fit and explaining why.
4. EMAIL ANALYSIS + REWRITES — when the rep shares a draft (or you see one in the [DRAFT EMAIL] context block), give specific feedback on subject line, opener, value prop, ask, and length. When asked, propose a rewrite. Tie suggestions to the recipient when their info is available.

HARD RULES:
- If the rep asks about anything outside those four areas (CRM admin, billing, contract redlines, personal advice, general world questions, code, math, etc.), politely refuse in one sentence and steer back: "I'm scoped to prospecting, outreach, and email coaching — what are you working on?"
- Do NOT invent specific firmographic numbers (revenue, employee count, exact contact emails) as if they were verified. When you reference a company, qualify with "approximately" or "based on public knowledge". Tell the rep to verify with Apollo / Hunter for hard data.
- Keep responses tight: 2-4 short paragraphs unless the rep specifically asks for a long breakdown. Bullet lists are fine when listing prospects or steps.
- Be direct and useful. Don't pad with disclaimers, apologies, or "great question!" filler.
- When the rep asks "who should I target?", offer 5-10 named companies with a one-liner each on why each fits. Skip Fortune-500 megacorps unless the rep specifically wants those.
- When discussing outreach copy, reference specifics from the company / contact context the rep gave you. Avoid generic templates.
- When you propose an email rewrite, return the full text inside a fenced code block (\`\`\`) so the rep can copy it cleanly.

You are not a contract reviewer, a deal-stage automation, an email-sender, or a research bot. You are a thinking partner that talks through prospecting, outreach, and email drafts.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ success: false, error: "unauthorized" }, 200);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await sb.auth.getUser(jwt);
    if (!userRes?.user) return json({ success: false, error: "unauthorized" }, 200);

    const { data: profile } = await sb
      .from("profiles")
      .select("role, full_name")
      .eq("id", userRes.user.id)
      .maybeSingle();

    // 60 messages per hour per user. Developer bypasses.
    const gate = await enforceRateLimit(sb, {
      userId: userRes.user.id,
      functionName: "prospecting-chat",
      limit: 60,
      windowMinutes: 60,
      developerBypass: true,
      developerRole: profile?.role,
    });
    if (!gate.ok) return gate.response!;

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) return json({ success: false, error: "no messages" }, 200);

    // Trim oversized histories — keep the last 20 turns (40 messages)
    // so context stays under control as the chat grows.
    const trimmed = messages.slice(-40).map((m: any) => ({
      role: m.role === "assistant" || m.role === "system" ? m.role : "user",
      content: String(m.content || "").slice(0, 6000),
    }));

    // Optional pipeline context — when the caller passes property_id
    // we layer in a short summary of their existing deals so the
    // model can refer to "your current pipeline" specifically. Cheap
    // single query, no PII beyond brand names.
    let pipelineSummary = "";
    if (body.property_id) {
      const { data: deals } = await sb
        .from("deals")
        .select("brand_name, stage, sub_industry, value")
        .eq("property_id", body.property_id)
        .order("created_at", { ascending: false })
        .limit(40);
      if (deals && deals.length > 0) {
        const byStage: Record<string, string[]> = {};
        for (const d of deals) {
          const k = d.stage || "Unknown";
          (byStage[k] = byStage[k] || []).push(d.brand_name);
        }
        pipelineSummary = "\n\n[REP'S CURRENT PIPELINE — for context]\n" +
          Object.entries(byStage).map(([s, names]) =>
            `${s}: ${names.slice(0, 12).join(", ")}${names.length > 12 ? `, +${names.length - 12} more` : ""}`
          ).join("\n");
      }
    }

    // Optional email context — when the panel is opened from the
    // composer, the front-end passes the current draft + recipient
    // info so the model can give specific feedback.
    let emailContext = "";
    const ec = body.email_context;
    if (ec && typeof ec === "object") {
      const lines: string[] = ["\n\n[DRAFT EMAIL — the rep is currently composing this]"];
      if (ec.subject) lines.push(`Subject: ${String(ec.subject).slice(0, 300)}`);
      if (ec.recipient_name)    lines.push(`To: ${String(ec.recipient_name).slice(0, 100)}${ec.recipient_email ? ` <${String(ec.recipient_email).slice(0, 200)}>` : ""}`);
      else if (ec.recipient_email) lines.push(`To: ${String(ec.recipient_email).slice(0, 200)}`);
      if (ec.recipient_company) lines.push(`Company: ${String(ec.recipient_company).slice(0, 200)}`);
      if (ec.recipient_title)   lines.push(`Title: ${String(ec.recipient_title).slice(0, 200)}`);
      if (ec.prospect_notes)    lines.push(`Notes: ${String(ec.prospect_notes).slice(0, 800)}`);
      if (ec.draft) {
        lines.push("");
        lines.push("---");
        lines.push(String(ec.draft).slice(0, 6000));
        lines.push("---");
      }
      lines.push("\nWhen the rep refers to \"the email\" / \"my draft\" / \"this\", they mean the text above.");
      emailContext = lines.join("\n");
    }

    const systemFull = SYSTEM_PROMPT
      + (profile?.full_name ? `\n\nThe rep's name is ${profile.full_name}.` : "")
      + pipelineSummary
      + emailContext;

    let reply = "";
    let provider = "none";
    if (OPENAI_API_KEY) {
      reply = await callOpenAI(systemFull, trimmed);
      provider = "openai";
    } else if (ANTHROPIC_API_KEY) {
      reply = await callAnthropic(systemFull, trimmed);
      provider = "anthropic";
    } else {
      return json({ success: false, error: "No AI key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." }, 200);
    }

    await logRateLimitCall(sb, {
      userId: userRes.user.id,
      functionName: "prospecting-chat",
      creditsCharged: 0,
      metadata: { provider, message_count: trimmed.length },
    });

    return json({ success: true, reply, provider });
  } catch (err) {
    console.error("prospecting-chat failed:", err);
    return json({ success: false, error: String((err as Error)?.message || err) }, 200);
  }
});

async function callOpenAI(systemPrompt: string, history: any[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL_OPENAI,
      temperature: 0.5,
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAnthropic(systemPrompt: string, history: any[]): Promise<string> {
  // Anthropic's API doesn't allow a system message in the messages
  // array — pass it via the top-level `system` field instead.
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL_ANTHROPIC,
      max_tokens: 800,
      system: systemPrompt,
      messages: history,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
