// ============================================================
// COMPANY-RESEARCH EDGE FUNCTION
// ============================================================
// Web research wrapper around Claude's web_search server tool.
// Given a company name (and optional domain), returns a
// structured payload with industry, official website, and the
// leadership team — pulled from public sources, cached in
// company_research keyed on (property_id, company_name).
//
// Pricing: Claude Sonnet 4.6 with web_search (max_uses=6) costs
// roughly $0.05–0.20 per call depending on result density. The
// 90-day cache prevents most repeat hits.
//
// Inputs:
//   { company_name: string, domain?: string, deal_id?: string,
//     refresh?: boolean }
//
// Outputs:
//   { success, cached, research: { industry, website, description,
//                                  leadership[], sources[] } }
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, corsHeaders, jsonResponse } from "../_shared/devGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("COMPANY_RESEARCH_MODEL") ?? "claude-sonnet-4-6";
const MAX_SEARCHES = parseInt(Deno.env.get("COMPANY_RESEARCH_MAX_SEARCHES") ?? "6", 10);

const SYSTEM_PROMPT = `You are a B2B company research assistant. Given a company name, use the web_search tool to find:

1. **Industry** — concise 1-3 word category (e.g. "SaaS", "Commercial Real Estate", "Sports Marketing Agency"). Avoid jargon.
2. **Official website** — the company's primary corporate site (not a Wikipedia page, not LinkedIn).
3. **Leadership team** — current C-suite + senior VPs. Aim for 3–8 people. For each, capture full name, current title, and a LinkedIn URL when one shows up in search results.
4. **Description** — 1-2 sentence plain-English summary of what the company actually does.

Run multiple targeted searches before answering: company website, "Company Name leadership", "Company Name CEO", "Company Name about". Reach for primary sources (their own About / Team / Leadership page, then press releases, Crunchbase, Bloomberg).

Output JSON ONLY in exactly this shape — no prose, no markdown fences:

{
  "industry": "Sports Marketing",
  "website": "https://example.com",
  "description": "Boutique sports sponsorship agency that connects brands with mid-market college athletic programs.",
  "leadership": [
    { "name": "Jane Smith", "title": "CEO", "linkedin_url": "https://linkedin.com/in/jsmith", "source_url": "https://example.com/about" }
  ],
  "sources": [
    { "url": "https://example.com/about", "title": "About — Example Co", "snippet": "Founded in 2018…" }
  ]
}

If a field can't be confirmed from search results, use null (industry/website/description) or [] (leadership/sources). Never invent. linkedin_url is optional — omit when not found rather than fabricating.`;

interface ResearchResult {
  industry: string | null;
  website: string | null;
  description: string | null;
  leadership: Array<{ name: string; title: string; linkedin_url?: string; source_url?: string }>;
  sources: Array<{ url: string; title?: string; snippet?: string }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const { userId } = guard;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ success: false, error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  let body: { company_name?: string; domain?: string; deal_id?: string; refresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const companyName = (body.company_name || "").trim();
  if (!companyName) {
    return jsonResponse({ success: false, error: "company_name required" }, 400);
  }
  const domain = body.domain?.trim() || null;
  const dealId = body.deal_id || null;
  const forceRefresh = body.refresh === true;

  // Resolve property_id from profile so we can scope the cache row.
  const { data: profile } = await sb
    .from("profiles")
    .select("property_id")
    .eq("id", userId)
    .maybeSingle();
  const propertyId = profile?.property_id;
  if (!propertyId) {
    return jsonResponse({ success: false, error: "user has no property" }, 400);
  }

  // ─── Cache check ─────────────────────────────────────────
  if (!forceRefresh) {
    const { data: cached } = await sb
      .from("company_research")
      .select("*")
      .eq("property_id", propertyId)
      .ilike("company_name", companyName)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cached) {
      return jsonResponse({
        success: true,
        cached: true,
        research: {
          industry: cached.industry,
          website: cached.website,
          description: cached.description,
          leadership: cached.leadership || [],
          sources: cached.sources || [],
        },
        cached_at: cached.researched_at,
      });
    }
  }

  // ─── Call Claude with web_search ─────────────────────────
  const userPrompt = `Company: ${companyName}${domain ? `\nDomain hint: ${domain}` : ""}\n\nResearch this company and return the JSON described in the system prompt.`;

  let claudeRes: Response;
  try {
    claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES }],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch (err) {
    return jsonResponse({ success: false, error: `claude_request_failed: ${String(err)}` }, 502);
  }

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    return jsonResponse({
      success: false,
      error: `claude_http_${claudeRes.status}`,
      details: errText.slice(0, 500),
    }, 502);
  }

  const claudeData = await claudeRes.json();
  const content = claudeData.content || [];

  // Pull the final assistant text + record any search queries for diagnostics.
  const textBlocks = content.filter((b: { type: string }) => b.type === "text");
  const rawText = textBlocks.map((b: { text: string }) => b.text).join("\n").trim();
  const searchQueries: string[] = content
    .filter((b: { type: string; name?: string }) => b.type === "server_tool_use" && b.name === "web_search")
    .map((b: { input?: { query?: string } }) => b.input?.query || "")
    .filter(Boolean);

  // ─── Parse JSON ─────────────────────────────────────────
  let parsed: ResearchResult;
  try {
    // Strip code-fence if Claude added one despite instructions.
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "claude_returned_non_json",
      raw: rawText.slice(0, 1000),
      details: String(err),
    }, 502);
  }

  // ─── Persist cache row ──────────────────────────────────
  const upsertRow = {
    property_id: propertyId,
    deal_id: dealId,
    company_name: companyName,
    domain,
    industry: parsed.industry ?? null,
    website: parsed.website ?? null,
    description: parsed.description ?? null,
    leadership: Array.isArray(parsed.leadership) ? parsed.leadership : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    raw_response: rawText.slice(0, 8000),
    search_queries: searchQueries,
    researched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
    researched_by: userId,
  };

  await sb
    .from("company_research")
    .upsert(upsertRow, { onConflict: "property_id,company_name" });

  // ─── Optional: write back to the deal record ────────────
  // Only update fields that are currently empty so we don't
  // clobber a rep's manual overrides.
  if (dealId) {
    const { data: deal } = await sb
      .from("deals")
      .select("id, sub_industry, website")
      .eq("id", dealId)
      .maybeSingle();
    if (deal) {
      const update: Record<string, unknown> = {};
      if (parsed.industry && !deal.sub_industry) update.sub_industry = parsed.industry;
      if (parsed.website && !deal.website) update.website = parsed.website;
      if (Object.keys(update).length > 0) {
        await sb.from("deals").update(update).eq("id", dealId);
      }
    }
  }

  return jsonResponse({
    success: true,
    cached: false,
    research: {
      industry: parsed.industry,
      website: parsed.website,
      description: parsed.description,
      leadership: parsed.leadership || [],
      sources: parsed.sources || [],
    },
    search_queries: searchQueries,
  });
});
