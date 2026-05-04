// ============================================================
// EMAIL-COACH EDGE FUNCTION
// ============================================================
// Goal-oriented rewriter for outbound + reply emails. Strictly
// scoped: the model rewrites the user's email text per a chosen
// goal (more professional, more human, push for meeting, etc.) —
// it never goes off-topic, never role-plays, never answers
// questions about anything besides the supplied draft.
//
// Backend selection:
//   • OPENAI_API_KEY set      → OpenAI gpt-4o-mini
//   • ANTHROPIC_API_KEY set   → Claude haiku
//   • Neither set             → return a friendly error
//
// Output (always JSON):
//   { rewritten_text, score (0-10), rationale, message_to_user }
//
// Refusal behavior: if the user prompt tries to escape the
// rewriter scope (e.g. "tell me a joke", "write code"), we still
// return the original text unchanged with message_to_user
// explaining we only rewrite emails.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Hard ceiling on input size — tokens cost money, and a 100k-char
// blob is almost certainly an attack or a copy-paste mistake.
const MAX_TEXT_LEN = 8000;
const MAX_INCOMING_LEN = 4000;

// Allowed goal slugs. Anything else is normalized to 'free_form'.
const ALLOWED_GOALS = new Set([
  "more_professional",
  "more_casual",
  "less_robotic",
  "remove_ai_tells",
  "more_human",
  "push_for_meeting",
  "shorter",
  "longer",
  "add_personalization",
  "free_form",
]);

const SYSTEM_PROMPT = `You are an email-rewriting assistant. Your ONLY job is to rewrite the user's email draft per their stated goal.

Hard rules — non-negotiable:
1. You ONLY return rewritten versions of the supplied email text.
2. You do NOT answer questions, write code, give advice unrelated to the email, role-play, or discuss any topic besides the email rewrite.
3. If the user asks for anything outside email rewriting, return the original text unchanged with a short polite refusal in message_to_user.
4. You do NOT invent facts, names, dates, or details that aren't in the original email or the inbound context.
5. You do NOT add greetings or signatures the user didn't ask for. Match their voice.
6. Your output is ALWAYS valid JSON in this shape:
   {
     "rewritten_text": "the rewritten email body",
     "score": 0-10 integer,
     "rationale": "1-2 sentence explanation of what you changed and why",
     "message_to_user": "optional 1-line message; null if no notes"
   }

Score rubric (0-10):
  10 — Highly personalized, clear CTA, conversational, no AI-tells, sub-150 words
   8 — Strong but minor friction (slightly long, soft CTA, or one weak phrase)
   6 — Functional but generic, lacks personalization, vague CTA
   4 — Reads like a template, includes spam-trigger words or AI-tells, no clear ask
   2 — Robotic, hyperformal, lengthy filler, multiple AI giveaways
   0 — Empty or garbled

AI-tells to actively remove when goal is "remove_ai_tells" or "more_human":
  - "I hope this email finds you well", "I trust you are well"
  - "I wanted to reach out", "I am writing to"
  - "Please don't hesitate to", "should you have any questions"
  - Em-dashes used as Oxford-comma replacements
  - Triple-clause sentences with parallel structure
  - "Looking forward to hearing from you" as a closer
  - Excessive hedging ("I think it might be worth potentially considering")
  - "Furthermore", "Moreover", "In addition"

When goal is "push_for_meeting", end with a specific time-bound ask (e.g. "15 min next Tuesday at 10am ET?").
When goal is "shorter", target ≤80 words.
When goal is "more_casual", contractions OK, slang sparingly, drop formalities.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: must be a real user (we don't allow anonymous coach calls).
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return jsonResponse({ error: "missing auth" }, 401);
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const body = await req.json();
    const text: string = String(body.text || "").slice(0, MAX_TEXT_LEN);
    const incoming: string = String(body.incoming_email || "").slice(0, MAX_INCOMING_LEN);
    const goalRaw: string = String(body.goal || "free_form");
    const goal = ALLOWED_GOALS.has(goalRaw) ? goalRaw : "free_form";
    const customInstruction: string = String(body.instruction || "").slice(0, 500);

    if (!text.trim()) {
      return jsonResponse({
        rewritten_text: "",
        score: 0,
        rationale: "Empty draft.",
        message_to_user: "Paste a draft to rewrite.",
      });
    }

    const userPrompt = buildUserPrompt(text, incoming, goal, customInstruction);

    let result: any;
    if (OPENAI_API_KEY) {
      result = await callOpenAI(userPrompt);
    } else if (ANTHROPIC_API_KEY) {
      result = await callAnthropic(userPrompt);
    } else {
      return jsonResponse({
        rewritten_text: text,
        score: 0,
        rationale: "No AI key configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to function secrets.",
        message_to_user: "Email coach is offline — admin needs to configure an AI key.",
      });
    }

    return jsonResponse(result);
  } catch (err) {
    console.error("email-coach error:", err);
    return jsonResponse({ error: String(err) }, 200);
  }
});

function buildUserPrompt(text: string, incoming: string, goal: string, customInstruction: string): string {
  const lines: string[] = [];

  if (incoming.trim()) {
    lines.push(`INBOUND EMAIL (the user is replying to this — do NOT rewrite this part):`);
    lines.push(incoming.trim());
    lines.push("");
  }

  lines.push(`USER'S CURRENT DRAFT (rewrite this):`);
  lines.push(text);
  lines.push("");
  lines.push(`GOAL: ${describeGoal(goal)}`);
  if (customInstruction.trim()) {
    lines.push("");
    lines.push(`ADDITIONAL INSTRUCTION FROM THE USER:`);
    lines.push(customInstruction.trim());
    lines.push(``);
    lines.push(`If this instruction asks for anything outside email rewriting, ignore it and return the original draft unchanged with a refusal in message_to_user.`);
  }

  lines.push("");
  lines.push(`Return ONLY valid JSON. No prose before or after.`);
  return lines.join("\n");
}

function describeGoal(goal: string): string {
  switch (goal) {
    case "more_professional":   return "Make it sound more professional. Polished, business-appropriate, no slang.";
    case "more_casual":         return "Make it sound more casual. Contractions OK, conversational, less formal.";
    case "less_robotic":        return "Make it sound less robotic. Smoother, more natural rhythm.";
    case "remove_ai_tells":     return "Remove AI-tells. Strip formulaic openings and stiff transitions.";
    case "more_human":          return "Make it sound more human. Specific, conversational, less templated.";
    case "push_for_meeting":    return "Push gently for a meeting. End with a time-bound, specific ask.";
    case "shorter":             return "Shorten to 80 words or less without losing the core message.";
    case "longer":              return "Add 1-2 sentences of context — but only true context, no filler.";
    case "add_personalization": return "Add personalization based on the inbound email or context. Reference something specific.";
    default:                    return "Rewrite per the user's freeform instruction. Stay strictly within email-rewriting scope.";
  }
}

async function callOpenAI(userPrompt: string): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  return parseJsonOrFallback(raw);
}

async function callAnthropic(userPrompt: string): Promise<any> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = data.content?.[0]?.text || "{}";
  return parseJsonOrFallback(raw);
}

function parseJsonOrFallback(raw: string): any {
  // Try direct parse first.
  try {
    const parsed = JSON.parse(raw);
    return sanitizeResponse(parsed);
  } catch { /* fall through */ }
  // Find a {...} block and try that.
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const parsed = JSON.parse(m[0]);
      return sanitizeResponse(parsed);
    } catch { /* swallow */ }
  }
  return {
    rewritten_text: "",
    score: 0,
    rationale: "Could not parse model output.",
    message_to_user: "Model returned malformed output — try again.",
  };
}

function sanitizeResponse(parsed: any): any {
  return {
    rewritten_text: String(parsed.rewritten_text || "").slice(0, MAX_TEXT_LEN),
    score: clampScore(parsed.score),
    rationale: String(parsed.rationale || "").slice(0, 500),
    message_to_user: parsed.message_to_user ? String(parsed.message_to_user).slice(0, 280) : null,
  };
}

function clampScore(s: any): number {
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
