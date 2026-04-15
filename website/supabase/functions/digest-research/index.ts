// ============================================================
// DIGEST-RESEARCH
// ============================================================
// AI-powered article research for "The Digest" newsletter.
//
// Flow:
//   1. Admin enters topic, industry, optional keywords
//   2. This edge function calls Claude Opus 4.6 with the
//      web_search_20250305 tool enabled
//   3. Claude researches the topic via real web searches and
//      writes a draft article (800-1200 words) with inline
//      citations
//   4. We parse Claude's response, extract citations from the
//      tool_use blocks, and return structured JSON:
//        { headline, subheadline, markdown, citations[] }
//   5. Frontend loads result into the rich text editor for
//      review + editing before publish (never auto-publishes)
//
// Auth: developer-only. Verifies profile.role='developer'
// via the service role client before accepting the request.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, logRateLimitCall } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the senior editor of "The Digest by Loud Legacy Ventures" — a sharp, authoritative monthly newsletter for operators in real estate, sports, marketing, and general business. Your writing is:

- Direct and economical. No filler, no clichés, no "in today's fast-paced world."
- Fact-driven. Every claim is sourced. You cite real publications, reports, and studies.
- Opinionated where warranted. Readers come to The Digest for your take, not a press release rewrite.
- 800-1200 words. Long enough to be substantive, short enough to be read in full.

Research the topic using web_search before writing. Run multiple targeted searches to find primary sources, recent data (2024-2025), named experts, and concrete examples. When you cite a source in the article, number it inline like [1], [2], [3] and keep a running list for the citations array.

Structure the article:
1. A headline that promises something specific and delivers it. Not clickbait, not academic.
2. A one-sentence subheadline that adds a sharp angle.
3. An opening paragraph that gives the reader the "so what" in two or three sentences.
4. 3-5 body sections with ## subheadings. Each section makes one argument, backed by evidence.
5. A closing paragraph that tells the reader what to do with this information.

Return your response as a JSON object (and ONLY a JSON object — no prose before or after) with this exact shape:

{
  "headline": "The headline",
  "subheadline": "One-sentence angle",
  "markdown": "## Opening\\n\\nFirst paragraph...\\n\\n## Section 1\\n\\nBody...\\n\\n...",
  "citations": [
    { "num": 1, "title": "Source title", "url": "https://example.com/article" },
    { "num": 2, "title": "Another source", "url": "https://example.com/study" }
  ]
}

Use \\n for newlines inside the markdown string. Citations should match the [N] references you put in the markdown. Use real URLs from the web_search tool results only — do not fabricate sources.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const diagnostics: { steps: string[]; errors: string[] } = { steps: ["start"], errors: [] };

  try {
    // ─── Environment check ─────────────────────────────
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ success: false, error: "env_not_configured", diagnostics });
    }
    if (!ANTHROPIC_API_KEY) {
      return json({ success: false, error: "anthropic_key_missing", diagnostics });
    }
    diagnostics.steps.push("env_ok");

    // ─── Auth: developer only ─────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ success: false, error: "missing_auth", diagnostics });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userRes?.user) {
      return json({ success: false, error: "invalid_jwt", details: userErr?.message, diagnostics });
    }
    const userId = userRes.user.id;
    diagnostics.steps.push("jwt_valid");

    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role !== "developer") {
      return json({ success: false, error: "not_developer", diagnostics });
    }
    diagnostics.steps.push("developer_ok");

    // ─── Rate limit: 10 research calls / hour ────────────
    // Developer bypass is DISABLED here even for developers —
    // digest-research is an expensive Opus + web_search call and
    // we want a hard cap even against the developer's own account.
    const gate = await enforceRateLimit(sb, {
      userId,
      functionName: "digest-research",
      limit: 10,
      windowMinutes: 60,
      developerBypass: false,
    });
    if (!gate.ok) {
      diagnostics.errors.push(`rate_limited_at_${gate.currentCount}`);
      return gate.response!;
    }

    // ─── Parse body ────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const topic = (body.topic || "").trim();
    const industry = (body.industry || "general").trim();
    const keywords = (body.keywords || "").trim();

    if (!topic || topic.length < 5) {
      return json({ success: false, error: "topic_too_short", diagnostics });
    }
    diagnostics.steps.push("body_valid");

    // ─── Compose user prompt ──────────────────────────
    const industryLabels: Record<string, string> = {
      real_estate: "real estate",
      sports: "sports business",
      marketing: "marketing and growth",
      general: "general business",
    };
    const industryText = industryLabels[industry] || "general business";

    const userPrompt = `Research and write a Digest article on this topic:

**Topic:** ${topic}
**Target industry:** ${industryText}
${keywords ? `**Keywords to cover:** ${keywords}` : ""}

Use web_search to find recent, credible sources. Return the result as a JSON object only, no other text.`;

    // ─── Call Claude with web_search tool ─────────────
    diagnostics.steps.push("calling_claude");
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 8,
          },
        ],
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      diagnostics.errors.push(`claude_http_${claudeRes.status}: ${errText.slice(0, 500)}`);
      return json({
        success: false,
        error: "claude_request_failed",
        status: claudeRes.status,
        details: errText.slice(0, 500),
        diagnostics,
      });
    }

    const claudeData = await claudeRes.json();
    diagnostics.steps.push("claude_responded");

    // ─── Extract text output ──────────────────────────
    // Claude with tool_use returns content blocks. Final
    // text is in the last text block after any tool uses.
    const content = claudeData.content || [];
    const textBlocks = content.filter((b: any) => b.type === "text");
    const rawText = textBlocks.map((b: any) => b.text).join("\n").trim();

    if (!rawText) {
      diagnostics.errors.push("no_text_in_response");
      return json({ success: false, error: "empty_response", diagnostics });
    }

    // ─── Extract citations from web_search tool uses ──
    // Claude's web_search tool produces search results as
    // separate content blocks. We use those as a source-of-
    // truth URL list to cross-check citations.
    const searchResults: Array<{ title: string; url: string }> = [];
    for (const block of content) {
      if (block.type === "server_tool_use" && block.name === "web_search") {
        continue;
      }
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const result of block.content) {
          if (result.type === "web_search_result") {
            searchResults.push({
              title: result.title || result.url || "Source",
              url: result.url || "",
            });
          }
        }
      }
    }
    diagnostics.steps.push(`search_results_${searchResults.length}`);

    // ─── Parse Claude's JSON output ───────────────────
    // Claude sometimes wraps JSON in ```json fences — strip
    // them. Also handle leading/trailing prose defensively.
    let parsed: any = null;
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      // Find first { and last } to isolate JSON if there's
      // any wrapping text
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      const jsonText = firstBrace >= 0 && lastBrace > firstBrace
        ? cleaned.slice(firstBrace, lastBrace + 1)
        : cleaned;
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      diagnostics.errors.push(`json_parse: ${parseErr.message}`);
      // Fallback: return the raw text as markdown with no structure
      return json({
        success: true,
        headline: topic,
        subheadline: "",
        markdown: rawText,
        citations: searchResults.map((r, i) => ({ num: i + 1, title: r.title, url: r.url })),
        parse_fallback: true,
        diagnostics,
      });
    }

    // ─── Normalize + return ──────────────────────────
    const result = {
      headline: parsed.headline || topic,
      subheadline: parsed.subheadline || "",
      markdown: parsed.markdown || "",
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
    };

    // If Claude didn't include citations but web_search was
    // used, include the search results as fallback citations
    if (result.citations.length === 0 && searchResults.length > 0) {
      result.citations = searchResults.map((r, i) => ({ num: i + 1, title: r.title, url: r.url }));
    }

    diagnostics.steps.push("returned");

    // Log successful call for rate limiting (fire and forget)
    await logRateLimitCall(sb, {
      userId,
      functionName: "digest-research",
      creditsCharged: 20, // Opus + web_search is expensive
      metadata: { topic, industry },
    });

    return json({
      success: true,
      ...result,
      diagnostics,
    });
  } catch (err) {
    diagnostics.errors.push(`exception: ${err?.message || String(err)}`);
    return json({
      success: false,
      error: "uncaught_exception",
      details: String(err?.message || err),
      diagnostics,
    });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
