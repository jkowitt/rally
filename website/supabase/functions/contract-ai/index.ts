import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, logRateLimitCall } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ─── Rate limiting ──────────────────────────────────
    // Extract the caller's JWT (if present) to enforce a per-user
    // cap on how often contract-ai can be hit. We don't REQUIRE
    // auth here — some actions are invoked by internal jobs — but
    // if a JWT is present, we use it to track usage. Without a JWT,
    // we skip rate limiting (trust the internal caller).
    let rateLimitUserId: string | null = null;
    let callerRole: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (jwt && jwt !== (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")) {
        const { data: userRes } = await supabaseClient.auth.getUser(jwt);
        if (userRes?.user) {
          rateLimitUserId = userRes.user.id;
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", rateLimitUserId)
            .maybeSingle();
          callerRole = profile?.role ?? null;
        }
      }
    } catch {
      // auth inspection is best-effort; fall through without rate limiting
    }

    if (rateLimitUserId) {
      const gate = await enforceRateLimit(supabaseClient, {
        userId: rateLimitUserId,
        functionName: "contract-ai",
        limit: 120,              // 120 calls/hour per user
        windowMinutes: 60,
        developerBypass: true,   // dev console can hammer it
        developerRole: callerRole,
      });
      if (!gate.ok) return gate.response!;
    }

    const body = await req.json();
    const action = body.action;

    let result: any;
    if (action === "generate_contract") {
      result = await generateContract(supabaseClient, body);
    } else if (action === "edit_contract") {
      result = await editContract(body);
    } else if (action === "parse_pdf_text") {
      result = await parsePdfText(body);
    } else if (action === "summarize_contract") {
      result = await summarizeContract(body);
    } else if (action === "extract_benefits") {
      result = await extractBenefits(supabaseClient, body);
    } else if (action === "generate_fulfillment") {
      result = await generateFulfillment(supabaseClient, body);
    } else if (action === "deal_insights") {
      result = await dealInsights(body);
    } else if (action === "pipeline_forecast") {
      result = await pipelineForecast(body);
    } else if (action === "draft_email") {
      result = await draftEmailFn(body);
    } else if (action === "classify_reply") {
      result = await classifyReply(body);
    } else if (action === "account_brief") {
      result = await accountBrief(body);
    } else if (action === "find_lookalikes") {
      result = await findLookalikes(body);
    } else if (action === "icp_cluster") {
      result = await icpCluster(body);
    } else if (action === "personality_profile") {
      result = await personalityProfile(body);
    } else if (action === "funding_radar") {
      result = await fundingRadar(body);
    } else if (action === "postmortem_questions") {
      result = await postmortemQuestions(body);
    } else if (action === "transcribe_call") {
      result = await transcribeCall(supabaseClient, body);
    } else if (action === "analyze_lost_deal") {
      result = await analyzeLostDeal(body);
    } else if (action === "enrich_contact") {
      result = await enrichContact(body);
    } else if (action === "meeting_notes") {
      result = await meetingNotes(body);
    } else if (action === "search_prospects") {
      result = await searchProspects(supabaseClient, body);
    } else if (action === "suggest_prospects") {
      result = await suggestProspects(supabaseClient, body);
    } else if (action === "research_contacts") {
      result = await researchContacts(body);
    } else if (action === "code_assistant") {
      result = await codeAssistant(body);
    } else if (action === "smart_match_assets") {
      result = await smartMatchAssets(supabaseClient, body);
    } else if (action === "generate_weekly_newsletter") {
      result = await generateWeeklyNewsletter(supabaseClient, body);
    } else if (action === "generate_afternoon_update") {
      result = await generateAfternoonUpdate(supabaseClient, body);
    } else {
      throw new Error("Unknown action: " + action);
    }

    // Log the call post-success for rate limiting
    if (rateLimitUserId) {
      await logRateLimitCall(supabaseClient, {
        userId: rateLimitUserId,
        functionName: "contract-ai",
        creditsCharged: 5,
        metadata: { action },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in Edge Function Secrets");
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error("Claude API error " + resp.status + ": " + errText);
  }

  const data = await resp.json();
  return data.content?.[0]?.text || "";
}

function extractJSON(text: string): any {
  // Try direct parse first
  try { return JSON.parse(text); } catch {}

  // Strip markdown code fences
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try parsing cleaned text
  try { return JSON.parse(cleaned); } catch {}

  // Find the outermost JSON object
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try { return JSON.parse(cleaned.slice(objStart, objEnd + 1)); } catch {}
  }

  // Find the outermost JSON array
  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    try { return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)); } catch {}
  }

  // Last resort: try to fix common issues
  if (objStart !== -1 && objEnd > objStart) {
    let attempt = cleaned.slice(objStart, objEnd + 1);
    // Fix trailing commas
    attempt = attempt.replace(/,\s*([}\]])/g, '$1');
    // Fix single quotes
    attempt = attempt.replace(/'/g, '"');
    try { return JSON.parse(attempt); } catch {}
  }

  throw new Error("Could not extract JSON from AI response");
}

// Advanced Claude call with system prompt and multi-turn conversation
async function callClaudeAdvanced(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error("Claude API error " + resp.status + ": " + errText);
  }

  const data = await resp.json();
  return data.content?.[0]?.text || "";
}

const CODE_SYSTEM_PROMPT = `You are a senior full-stack developer and AI coding assistant for the Loud Legacy CRM platform. You have deep expertise in the entire codebase and tech stack.

## Tech Stack
- React 18 with lazy loading (React.lazy + Suspense)
- Vite build system
- Tailwind CSS v4 with custom design tokens
- Supabase (PostgreSQL + Auth + Edge Functions + Row Level Security)
- TanStack Query (@tanstack/react-query) for server state
- Recharts for data visualization
- pdfjs-dist v3.11.174 (bundled) for PDF extraction
- Tesseract.js for OCR
- mammoth.js for Word docs
- @hello-pangea/dnd for drag-and-drop
- pptxgenjs for PowerPoint generation
- DOMPurify for XSS sanitization

## Design System
- Dark theme: bg-bg-primary (#0a0e14), bg-bg-surface (#111827), bg-bg-card (#1a2332)
- Gold accent: text-accent (#E8B84B)
- Text: text-text-primary (#e5e7eb), text-text-secondary (#9ca3af), text-text-muted (#6b7280)
- Border: border-border (#1f2937)
- Status colors: text-success (#22c55e), text-warning (#eab308), text-danger (#ef4444)
- Font: system fonts, mono for code/terminal

## Code Conventions
- Functional components with hooks
- Named exports: export default function ComponentName()
- Supabase client from @/lib/supabase
- Auth from @/hooks/useAuth (provides profile with role, property_id)
- Feature flags from @/hooks/useFeatureFlags
- Industry config from @/hooks/useIndustryConfig
- Toast notifications from @/components/Toast
- Use .maybeSingle() instead of .single() for queries that may return 0 rows
- Use (array || []) pattern before .filter/.map/.length to prevent crashes
- All files under website/src/

## File Structure
- website/src/modules/ — Feature modules (crm/, businessops/, developer/)
- website/src/components/ — Shared components (layout/, ErrorBoundary, Toast, etc.)
- website/src/hooks/ — Custom hooks (useAuth, useCMS, useFeatureFlags, etc.)
- website/src/lib/ — Utilities (supabase.js, claude.js, automations.js, industryConfig.js)
- website/src/pages/ — Route pages
- website/supabase/functions/ — Edge functions
- website/supabase/migrations/ — Database migrations

## Role Hierarchy
developer > businessops > admin > rep > disabled

## Instructions
When asked to write or modify code:
1. Show the file path ONLY if you are certain it exists. If you are uncertain, describe the location by module category (e.g. "the contract management surface") rather than guessing a filename. Never invent paths.
2. Show the exact code to find (old) and replace with (new) ONLY if you have been given the file content as context. If you have not seen the file, propose a direction rather than fabricating code.
3. If creating a new file, show the complete file content
4. For database changes, provide SQL migrations — and only reference columns you have been told exist in the prompt. Never invent column names. The profiles table key is 'id' (matching auth.users.id), NOT 'auth_user_id'.
5. Explain your reasoning briefly
6. Consider error handling, null safety, and mobile responsiveness
7. Follow existing patterns in the codebase
8. Never truncate code — show complete implementations
9. Never invent hook names, edge function names, table columns, or imports. If you need a hook/function/table that you have not been explicitly told exists, ask the user instead of guessing. The toast hook is at @/components/Toast (useToast returns { toast }), NOT @/hooks/useToast.
10. EMPTY TABLES ARE NOT BUGS. Zero rows usually means no data has been entered, not that the schema is broken. Diagnose accordingly.

When asked questions:
- Be precise and reference specific files/functions
- Provide actionable answers with code examples
- Consider the full context of the platform`;

async function codeAssistant(body: any): Promise<any> {
  const messages: Array<{ role: string; content: string }> = [];

  // Add conversation history if provided
  if (body.conversation && Array.isArray(body.conversation)) {
    for (const msg of body.conversation.slice(-10)) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content.slice(0, 4000) });
      }
    }
  }

  // Build the user message with any file context
  let userContent = body.prompt || body.instructions || "";
  if (body.file_context) {
    userContent = `File: ${body.file_path || "unknown"}\n\`\`\`\n${body.file_context.slice(0, 12000)}\n\`\`\`\n\n${userContent}`;
  }
  if (body.page_context) {
    userContent = `${body.page_context}\n\n${userContent}`;
  }

  messages.push({ role: "user", content: userContent });

  const text = await callClaudeAdvanced(CODE_SYSTEM_PROMPT, messages, 8192);
  return { response: text };
}

async function generateContract(sb: any, body: any): Promise<any> {
  const { data: deal } = await sb.from("deals").select("*").eq("id", body.deal_id).single();

  let assetLines = "None specified";
  if (body.assets && body.assets.length > 0) {
    const { data: pa } = await sb.from("assets").select("*").eq("property_id", body.property_id).in("id", body.assets);
    if (pa && pa.length > 0) {
      assetLines = pa.map((a: any) => "- " + a.name + " (" + a.category + "): Qty " + a.quantity + ", Base $" + Number(a.base_price || 0).toLocaleString()).join("\n");
    }
  }

  const prompt = "You are a professional B2B partnership contract writer. Generate a formal sponsorship contract.\n\nDeal:\n- Brand: " + (deal?.brand_name || "TBD") + "\n- Contact: " + (deal?.contact_first_name || "") + " " + (deal?.contact_last_name || "") + ", " + (deal?.contact_position || "") + " at " + (deal?.contact_company || "") + "\n- Email: " + (deal?.contact_email || "") + "\n- Value: $" + Number(deal?.value || 0).toLocaleString() + "\n- Start: " + (deal?.start_date || "TBD") + "\n- End: " + (deal?.end_date || "TBD") + "\n\nAssets:\n" + assetLines + "\n\nAdditional Terms: " + (body.terms || "Standard terms") + "\n\nGenerate a complete contract with: parties, term, sponsorship benefits, financial terms, IP rights, termination, general provisions. Return only the contract text.";

  const text = await callClaude(prompt, 4096);
  return { contract_text: text };
}

async function editContract(body: any): Promise<any> {
  const prompt = "You are a contract editor. Here is the contract:\n\n---\n" + body.contract_text + "\n---\n\nMake these changes: " + body.instructions + "\n\nReturn the FULL updated contract text only.";
  const text = await callClaude(prompt, 4096);
  return { contract_text: text };
}

async function parsePdfText(body: any): Promise<any> {
  // Explicit, rigorous extraction prompt. The five fields that
  // matter most for downstream surfaces (CRM deal record, renewal
  // pipeline, recap reports, account health) are:
  //   1. brand_name           — the sponsor / company / counterparty
  //   2. expiration_date      — drives renewal cadence + AM dashboards
  //   3. total_value          — drives pipeline dollars
  //   4. annual_values        — drives multi-year revenue rollups
  //   5. benefits             — drives auto-fulfillment record spawning
  //
  // The prompt below is deliberately verbose because contracts vary
  // wildly (event sponsorships, naming rights, ad insertion orders,
  // SaaS resells, etc.). Treating extraction casually leads to nulls
  // that then break renewal and fulfillment downstream.
  const prompt = `You are a contract-parsing expert. Read the contract below and extract structured data.

Return ONLY a JSON object with exactly these fields:

{
  "brand_name": "string — the sponsor / counterparty / customer (NOT our property). E.g. 'Acme Beverages, Inc.' Look in title, recitals, signature block. Use the legal name if available; else the trading name.",
  "contact_name": "string|null — primary point of contact at the sponsor. Look in 'Notice' clauses or signature block.",
  "contact_email": "string|null",
  "contact_phone": "string|null",
  "contact_position": "string|null — title/role under the contact's signature",
  "contact_company": "string|null — defaults to brand_name if not separately stated",
  "contract_number": "string|null — any contract / order / SOW number printed on the doc",
  "effective_date": "YYYY-MM-DD or null — when the contract starts. Common labels: 'Effective Date', 'Commencement Date', 'Term Start'.",
  "expiration_date": "YYYY-MM-DD or null — when the contract ends. Common labels: 'Expiration Date', 'Termination Date', 'End of Term', 'Through'. If a term length is stated (e.g. '3-year term starting Jan 1, 2025'), CALCULATE the end date.",
  "total_value": "number — total dollar value over the entire term. Strip currency symbols + commas. If multiple line items, SUM them. If only annual values are listed, SUM all years. NEVER return null — use 0 if truly unknown.",
  "annual_values": "object — { 'YYYY': number } per year of the term. Three resolution rules in priority order:\\n    a) Per-year values explicitly stated (e.g. 'Year 1: $50,000; Year 2: $55,000; Year 3: $60,500') → use those.\\n    b) A single annual fee with an escalator clause ('5% annual increase') → compute each year.\\n    c) Total value with no per-year breakdown → divide evenly across the term years.\\n    Year keys are 4-digit calendar years. Use the year of the start date for Year 1.",
  "benefits": "array — every deliverable the sponsor receives. Look in: 'Schedule A', 'Exhibit B', 'Inventory', 'Compensation', 'Sponsor Benefits', 'Activation Rights', body paragraphs. Each item: {description, category, quantity, frequency, value}. category guesses (best fit): 'Signage', 'Digital', 'Hospitality', 'Media', 'Naming', 'Activations', 'Promotional', 'Other'. frequency: 'Per Season' | 'Per Game' | 'Per Match' | 'Monthly' | 'Quarterly' | 'Weekly' | 'One-Time'. value: dollar value for the line item or null. quantity: integer count of occurrences (e.g. 12 for 'one social post per month for a year').",
  "summary": "string — 2-3 sentence executive summary covering parties, term length, total value, and key benefit highlights.",
  "warnings": "array of strings — flag anything inferred vs. explicit. E.g. 'expiration_date calculated from 3-year term', 'annual_values divided evenly because per-year amounts were not stated', 'no contact email found'."
}

CRITICAL RULES:
- If a field genuinely isn't in the contract, return null (or 0 for total_value, [] for arrays). Do NOT invent.
- Date format MUST be YYYY-MM-DD. Convert 'January 1, 2025' → '2025-01-01'.
- Money values are PLAIN NUMBERS (50000, not "$50,000.00").
- annual_values keys MUST be 4-digit strings: "2025", not "Year 1".
- If the contract is missing or unreadable, return all nulls + warnings explaining what couldn't be extracted.
- Do not include any prose before or after the JSON.

Contract:
---
${body.pdf_text}
---`;
  // Bumped max_tokens from 2048 to 4096 — long contracts with many
  // benefits in a Schedule A frequently truncated.
  const text = await callClaude(prompt, 4096);
  const parsed = extractJSON(text);
  return { parsed: parsed };
}

async function summarizeContract(body: any): Promise<any> {
  const prompt = "Summarize this contract in 3-5 bullet points:\n\n" + body.contract_text;
  const text = await callClaude(prompt, 512);
  return { summary: text };
}

async function extractBenefits(sb: any, body: any): Promise<any> {
  const { data: assets } = await sb.from("assets").select("id, name, category").eq("property_id", body.property_id);
  const assetList = (assets || []).map((a: any) => "- ID: " + a.id + ", Name: " + a.name + ", Category: " + a.category).join("\n");

  const prompt = 'Extract benefits from this contract and match to assets.\n\nContract:\n---\n' + body.contract_text + '\n---\n\nAvailable Assets:\n' + assetList + '\n\nReturn a JSON array: [{benefit_description, asset_id (uuid or null), quantity, frequency (Per Game/Per Month/Per Season/One Time), value}]. Return ONLY valid JSON array.';
  const text = await callClaude(prompt, 2048);
  const benefits = extractJSON(text);

  if (Array.isArray(benefits) && benefits.length > 0) {
    const rows = benefits.map((b: any) => ({
      contract_id: body.contract_id,
      asset_id: b.asset_id || null,
      benefit_description: b.benefit_description || "Benefit",
      quantity: b.quantity || 1,
      frequency: b.frequency || "Per Season",
      value: b.value || null,
      fulfillment_auto_generated: false,
    }));

    const { data, error } = await sb.from("contract_benefits").insert(rows).select();
    if (error) throw error;
    return { benefits: data };
  }

  return { benefits: [] };
}

async function generateFulfillment(sb: any, body: any): Promise<any> {
  const { data: benefits } = await sb.from("contract_benefits").select("*").eq("contract_id", body.contract_id);

  if (!benefits || benefits.length === 0) {
    return { records: [], count: 0, message: "No benefits found" };
  }

  const records: any[] = [];
  const startStr = body.start_date || new Date().toISOString().split("T")[0];
  const endStr = body.end_date || new Date(new Date(startStr).getFullYear() + 1, new Date(startStr).getMonth(), new Date(startStr).getDate()).toISOString().split("T")[0];
  const start = new Date(startStr);
  const end = new Date(endStr);

  for (let i = 0; i < benefits.length; i++) {
    const benefit = benefits[i];
    const freq = benefit.frequency || "Per Season";
    const dates: string[] = [];

    if (freq === "One Time" || freq === "Per Season") {
      const mid = new Date((start.getTime() + end.getTime()) / 2);
      dates.push(mid.toISOString().split("T")[0]);
    } else if (freq === "Per Month") {
      const cursor = new Date(start);
      while (cursor <= end) {
        dates.push(cursor.toISOString().split("T")[0]);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else if (freq === "Per Game") {
      const cursor = new Date(start);
      while (cursor <= end) {
        dates.push(cursor.toISOString().split("T")[0]);
        cursor.setDate(cursor.getDate() + 14);
      }
    }

    for (let d = 0; d < dates.length; d++) {
      for (let q = 0; q < (benefit.quantity || 1); q++) {
        records.push({
          deal_id: body.deal_id,
          contract_id: body.contract_id,
          asset_id: benefit.asset_id || null,
          benefit_id: benefit.id,
          scheduled_date: dates[d],
          delivered: false,
          delivery_notes: "Auto: " + (benefit.benefit_description || "Benefit"),
          auto_generated: true,
        });
      }
    }
  }

  if (records.length > 0) {
    const { data, error } = await sb.from("fulfillment_records").insert(records).select();
    if (error) throw error;

    await sb.from("contract_benefits").update({ fulfillment_auto_generated: true }).eq("contract_id", body.contract_id);
    return { records: data, count: data.length };
  }

  return { records: [], count: 0 };
}

async function dealInsights(body: any) {
  const d = body.deal || {};
  const acts = (body.activities || []).slice(0, 10);
  const tasks = (body.tasks || []).slice(0, 5);
  const contracts = (body.contracts || []).slice(0, 3);
  const prompt = "You are an elite B2B partnership sales advisor. Analyze this deal and provide actionable insights.\n\nDeal: " + d.brand_name + ", Value: $" + (d.value || 0) + ", Stage: " + d.stage + ", Priority: " + (d.priority || "Medium") + ", Win Prob: " + (d.win_probability || 0) + "%, Contact: " + (d.contact_name || "Unknown") + " (" + (d.contact_position || "") + " at " + (d.contact_company || "") + "), Source: " + (d.source || "Unknown") + ", Added: " + (d.date_added || "Unknown") + ", Last Contacted: " + (d.last_contacted || "Never") + ", Notes: " + (d.notes || "None") + "\n\nRecent Activities: " + JSON.stringify(acts.map((a: any) => a.activity_type + ": " + (a.subject || "") + " (" + a.occurred_at + ")")) + "\n\nOpen Tasks: " + JSON.stringify(tasks.map((t: any) => t.title + " (due: " + t.due_date + ", " + t.priority + ")")) + "\n\nContracts: " + contracts.length + " total\n\nReturn a JSON object with:\n{\"health_score\": 1-10,\n\"next_best_actions\": [\"action1\", \"action2\", \"action3\"],\n\"risk_factors\": [\"risk1\"],\n\"opportunities\": [\"opp1\"],\n\"recommended_talking_points\": [\"point1\", \"point2\"],\n\"suggested_email_subject\": \"string\",\n\"days_to_close_estimate\": number,\n\"coaching_tip\": \"string\"}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { insights: extractJSON(text) };
}

async function pipelineForecast(body: any) {
  const deals = (body.deals || []).map((d: any) => ({ brand: d.brand_name, value: d.value, stage: d.stage, win_prob: d.win_probability, age: d.date_added }));
  const prompt = "You are a revenue forecasting analyst for B2B partnerships. Analyze this pipeline and forecast.\n\nDeals: " + JSON.stringify(deals) + "\nHistorical Win Rate: " + (body.historical_win_rate || 30) + "%\n\nReturn JSON:\n{\"forecast_30_days\": number,\n\"forecast_60_days\": number,\n\"forecast_90_days\": number,\n\"best_case\": number,\n\"worst_case\": number,\n\"most_likely\": number,\n\"at_risk_deals\": [\"brand names\"],\n\"hot_deals\": [\"brand names\"],\n\"recommendations\": [\"rec1\", \"rec2\", \"rec3\"],\n\"pipeline_health\": \"Healthy\" or \"At Risk\" or \"Critical\",\n\"summary\": \"2 sentence summary\"}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { forecast: extractJSON(text) };
}

async function draftEmailFn(body: any) {
  const d = body.deal || {};
  const ctx = body.context;
  const emailType = body.email_type || "follow-up";

  // Context can be a freeform string (legacy) or an object with fields
  // like sender_name, sender_property, incoming_subject, incoming_body,
  // tone, why_good_fit, outreach_tip. Normalize both.
  let contextLines = "";
  let incomingSection = "";
  if (typeof ctx === "string") {
    contextLines = ctx || "Standard follow-up";
  } else if (ctx && typeof ctx === "object") {
    const parts: string[] = [];
    if (ctx.sender_name) parts.push(`Sender name: ${ctx.sender_name}`);
    if (ctx.sender_property) parts.push(`Sender property: ${ctx.sender_property}`);
    if (ctx.tone) parts.push(`Desired tone: ${ctx.tone}`);
    if (ctx.why_good_fit) parts.push(`Why this prospect is a fit: ${ctx.why_good_fit}`);
    if (ctx.outreach_tip) parts.push(`Outreach hook: ${ctx.outreach_tip}`);
    if (ctx.estimated_budget) parts.push(`Estimated budget: ${ctx.estimated_budget}`);
    contextLines = parts.join("\n") || "Standard follow-up";

    if (emailType === "reply" && (ctx.incoming_subject || ctx.incoming_body)) {
      incomingSection =
        `\n\nINBOUND MESSAGE (you are replying to this):\n` +
        `From: ${ctx.incoming_from || "the prospect"}\n` +
        `Subject: ${ctx.incoming_subject || "(no subject)"}\n\n` +
        `${(ctx.incoming_body || "").slice(0, 1500)}\n\n` +
        `Write a thoughtful reply that addresses their points specifically. Sign off with the sender's name.`;
    }
  } else {
    contextLines = "Standard follow-up";
  }

  const prompt =
    `You are a professional B2B partnership sales executive. Draft a ${emailType} email.\n\n` +
    `Deal: ${d.brand_name || ""}, Stage: ${d.stage || ""}, ` +
    `Contact: ${d.contact_name || ""} (${d.contact_position || ""}), Value: $${d.value || 0}\n` +
    `Context:\n${contextLines}` +
    incomingSection +
    `\n\nReturn JSON:\n{"subject": "email subject", "body": "email body text", "tone": "professional/casual/urgent"}\n\n` +
    `Return ONLY valid JSON.`;
  const text = await callClaude(prompt, 1024);
  return { email: extractJSON(text) };
}

// classifyReply: tag an inbound reply with intent so the UI can
// route correctly. Returns { intent, confidence (0-1), rationale,
// suggested_action }. Intents: interested | objection |
// meeting_request | unsubscribe | out_of_office | wrong_person |
// not_now | closed_lost | unclear.
async function classifyReply(body: any) {
  const subject = (body.subject || "").slice(0, 200);
  const message = (body.body || "").slice(0, 4000);
  const original = (body.original_subject || "").slice(0, 200);
  const prompt =
    `You are a sales-reply classifier. Read the inbound email and classify the sender's intent.\n\n` +
    `Original subject we sent: "${original}"\n` +
    `Reply subject: "${subject}"\n` +
    `Reply body:\n${message}\n\n` +
    `Possible intents:\n` +
    `- interested: positive signal, wants to learn more\n` +
    `- meeting_request: explicitly asking for a call/meeting\n` +
    `- objection: pushback, concerns, "not for us right now"\n` +
    `- not_now: punt to later but not a hard no\n` +
    `- wrong_person: "I'm not the right person", forwarded to colleague\n` +
    `- out_of_office: auto-reply\n` +
    `- unsubscribe: asks to be removed from list\n` +
    `- closed_lost: hard no, won't reconsider\n` +
    `- unclear: can't tell\n\n` +
    `Suggested actions:\n` +
    `- reply_now | route_to_owner | pause_sequence | mark_lost | snooze_30d | remove_from_lists\n\n` +
    `Return JSON:\n{"intent":"...","confidence":0.0-1.0,"rationale":"1-2 sentences","suggested_action":"..."}\n\nReturn ONLY valid JSON.`;
  const text = await callClaude(prompt, 512);
  return { classification: extractJSON(text) };
}

// accountBrief: generate a one-page intelligence brief for a deal.
// Pulls deal + contacts + recent activity + (caller may attach
// recent news / website excerpt) into a structured brief.
async function accountBrief(body: any) {
  const d = body.deal || {};
  const contacts = (body.contacts || []).slice(0, 8);
  const activities = (body.activities || []).slice(0, 10);
  const news = body.news_snippet || "";
  const prompt =
    `You are a senior sales strategist for B2B partnerships. Produce a 1-page brief on this account.\n\n` +
    `Brand: ${d.brand_name}\n` +
    `Industry: ${d.sub_industry || "unknown"}\n` +
    `Location: ${[d.city, d.state].filter(Boolean).join(", ")}\n` +
    `Website: ${d.website || ""}\n` +
    `Stage: ${d.stage || "Prospect"}\n` +
    `Deal value: $${d.value || 0}\n` +
    `Notes: ${(d.notes || "").slice(0, 500)}\n\n` +
    `Key contacts: ${JSON.stringify(contacts.map((c: any) => ({ name: c.first_name + " " + c.last_name, title: c.position, email: c.email })))}\n` +
    `Recent activity: ${JSON.stringify(activities.map((a: any) => ({ type: a.activity_type, subject: a.subject, when: a.occurred_at })))}\n` +
    `External news: ${news.slice(0, 1000)}\n\n` +
    `Return JSON:\n{` +
    `"summary":"2-3 sentence executive summary",` +
    `"why_now":"why this account is timely (3-5 sentences)",` +
    `"key_decision_makers":[{"name":"","why_they_matter":""}],` +
    `"recent_signals":["bullet1","bullet2"],` +
    `"likely_objections":["bullet1","bullet2"],` +
    `"suggested_angle":"recommended approach in 2-3 sentences",` +
    `"talking_points":["point1","point2","point3"],` +
    `"next_best_action":"single most useful next step"` +
    `}\n\nReturn ONLY valid JSON.`;
  const text = await callClaude(prompt, 1500);
  return { brief: extractJSON(text) };
}

// findLookalikes: given a seed deal (the brand), suggest similar
// brands the property should also pursue. Best-effort using Claude's
// general knowledge of brand portfolios + sponsorship history.
async function findLookalikes(body: any) {
  const d = body.deal || {};
  const recentWins = (body.recent_wins || []).slice(0, 10);
  const prompt =
    `You are a B2B prospecting strategist. Given a seed brand, suggest 10 lookalike brands the property should also pursue.\n\n` +
    `Seed brand: ${d.brand_name}\n` +
    `Industry: ${d.sub_industry || "unknown"}\n` +
    `Location: ${[d.city, d.state].filter(Boolean).join(", ")}\n` +
    `Estimated revenue: $${d.revenue_thousands || 0}K\n` +
    `Estimated employees: ${d.employees || 0}\n\n` +
    `Property's recent won deals (avoid suggesting these — focus on net-new):\n` +
    `${recentWins.map((w: any) => "- " + w.brand_name + (w.sub_industry ? " (" + w.sub_industry + ")" : "")).join("\n")}\n\n` +
    `Return JSON:\n{"lookalikes":[{` +
    `"company":"brand name",` +
    `"industry":"category",` +
    `"website":"likely-domain.com",` +
    `"linkedin":"linkedin.com/company/...",` +
    `"city":"hq city","state":"hq state",` +
    `"similarity_score":0.0-1.0,` +
    `"rationale":"why this is a lookalike, 1-2 sentences"` +
    `}]}\n\nReturn ONLY valid JSON. Focus on 10 high-quality matches.`;
  const text = await callClaude(prompt, 2000);
  return { result: extractJSON(text) };
}

// icpCluster: analyze a property's closed-won deals and produce an
// ideal customer profile description + key traits. Used to seed
// reverse-ICP lookalike scans.
async function icpCluster(body: any) {
  const wins = (body.wins || []).slice(0, 50);
  const prompt =
    `You are a sales analytics strategist. Given the closed-won deals below, identify the ideal customer profile (ICP).\n\n` +
    `Won deals:\n${JSON.stringify(wins.map((w: any) => ({
      brand: w.brand_name, industry: w.sub_industry, value: w.value,
      city: w.city, state: w.state, employees: w.employees, revenue: w.revenue_thousands,
    })))}\n\n` +
    `Return JSON:\n{` +
    `"summary":"2-3 sentence ICP description",` +
    `"industries":["top industries that buy"],` +
    `"size_band":"small (<100 employees) / mid (100-1000) / large (1000+) / mixed",` +
    `"geography":["regions overrepresented"],` +
    `"traits":{"avg_deal_value":number,"common_themes":["theme1","theme2"]},` +
    `"recommended_targets":["3-5 brand archetypes that match"]` +
    `}\n\nReturn ONLY valid JSON.`;
  const text = await callClaude(prompt, 1024);
  return { cluster: extractJSON(text) };
}

// personalityProfile: Crystal-style read of a contact's
// communication style. Best-effort; uses public signals we have
// (title, position, company, linkedin) + LinkedIn bio if provided.
async function personalityProfile(body: any) {
  const c = body.contact || {};
  const samples = (body.email_samples || []).slice(0, 3).map((s: string) => s.slice(0, 800)).join("\n---\n");
  const prompt =
    `You are a B2B communication strategist. Read what we know about this contact and return a brief style profile that helps a sales rep tune their tone. Be measured — this is a hint, not a diagnosis.\n\n` +
    `Name: ${c.first_name || ""} ${c.last_name || ""}\n` +
    `Title: ${c.position || "unknown"}\n` +
    `Company: ${c.company || "unknown"}\n` +
    `LinkedIn bio: ${(c.linkedin_bio || "").slice(0, 1000)}\n` +
    `Recent message samples (if any):\n${samples}\n\n` +
    `Return JSON:\n{` +
    `"disc_type":"D|I|S|C|DI|DS|IS|IC|SC|DC",` +
    `"communication_style":"direct|analytical|expressive|amiable",` +
    `"preferred_pace":"fast|measured|slow",` +
    `"decision_drivers":["data","speed","consensus","vision","risk_aversion"],` +
    `"avoid_phrases":["phrases that pattern poorly"],` +
    `"recommended_phrases":["phrases that pattern well"],` +
    `"rationale":"2-3 sentence explanation"` +
    `}\n\nReturn ONLY valid JSON.`;
  const text = await callClaude(prompt, 1024);
  return { profile: extractJSON(text) };
}

// fundingRadar: best-effort sweep of tracked brand names looking
// for funding rounds, M&A activity, or major hires that match the
// AI's training data. Returns a list of plausible signals; the
// caller writes any winners to prospect_signals.
async function fundingRadar(body: any) {
  const brands = (body.brands || []).slice(0, 50);
  const prompt =
    `You are a B2B sales intelligence analyst. From the list below, identify any brands you know have had a meaningful funding round, M&A event, IPO, major hire, or strategic pivot in roughly the last 12 months.\n\n` +
    `Brands: ${JSON.stringify(brands)}\n\n` +
    `If you don't have high-confidence info on a brand, omit it — false positives hurt the customer.\n\n` +
    `Return JSON:\n{"signals":[{` +
    `"brand":"name as appears in input",` +
    `"event_type":"funding|acquisition|merger|ipo|hire|pivot",` +
    `"title":"short headline",` +
    `"description":"2-3 sentence summary",` +
    `"approx_when":"YYYY-MM",` +
    `"severity":"high|medium|low",` +
    `"confidence":0.0-1.0` +
    `}]}\n\nReturn ONLY valid JSON. Empty signals array is fine.`;
  const text = await callClaude(prompt, 2000);
  return { result: extractJSON(text) };
}

// postmortemQuestions: generate 5-7 structured questions for a
// rep + contact debrief based on outcome (won|lost) and deal
// context. The UI presents these and stores answers.
async function postmortemQuestions(body: any) {
  const d = body.deal || {};
  const outcome = body.outcome || "lost";
  const prompt =
    `You are a sales-leadership coach. Generate 5-7 short questions for a deal post-mortem.\n\n` +
    `Outcome: ${outcome}\nBrand: ${d.brand_name}\nStage when concluded: ${d.stage || "unknown"}\n` +
    `Value: $${d.value || 0}\nNotes: ${(d.notes || "").slice(0, 500)}\n\n` +
    `Two audiences:\n` +
    `- "rep_questions": for our internal sales rep (root-cause + lessons)\n` +
    `- "contact_questions": short, polite questions we could send to the prospect (decision factors, what we missed)\n\n` +
    `Return JSON:\n{` +
    `"rep_questions":[{"id":"r1","prompt":"text"}],` +
    `"contact_questions":[{"id":"c1","prompt":"text"}]` +
    `}\n\nReturn ONLY valid JSON.`;
  const text = await callClaude(prompt, 1024);
  return { questions: extractJSON(text) };
}

// transcribeCall: pull a Twilio recording, send to a speech model
// for transcription, then ask Claude for a summary + sentiment +
// action items. Stores everything on the phone_calls row.
//
// Speech model integration depends on which provider you have a
// key for. We use Claude's audio understanding via base64 MP3
// when available; otherwise fall back to OpenAI Whisper if the
// OPENAI_API_KEY is configured. This function tolerates either
// being absent and writes back ai_summary='transcription_unavailable'.
async function transcribeCall(sb: any, body: any) {
  const sid = body.call_sid;
  const recordingUrl = body.recording_url;
  if (!sid || !recordingUrl) return { error: "call_sid + recording_url required" };

  // Fetch recording with Twilio basic auth.
  const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const audioRes = await fetch(recordingUrl, {
    headers: { Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`) },
  });
  if (!audioRes.ok) {
    await sb.from("phone_calls").update({ ai_summary: "recording_fetch_failed" }).eq("twilio_call_sid", sid);
    return { error: "recording fetch failed" };
  }

  // Try OpenAI Whisper if configured (cheap + reliable for audio).
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
  let transcription = "";
  if (OPENAI_API_KEY) {
    const audioBuffer = await audioRes.arrayBuffer();
    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "recording.mp3");
    form.append("model", "whisper-1");
    const w = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });
    if (w.ok) {
      const wd = await w.json();
      transcription = wd.text || "";
    }
  }
  if (!transcription) {
    await sb.from("phone_calls").update({ ai_summary: "transcription_unavailable" }).eq("twilio_call_sid", sid);
    return { error: "no speech provider configured" };
  }

  // Now ask Claude for summary + sentiment + action items.
  const prompt =
    `You are a sales-call analyst. Read the call transcript and return a structured summary.\n\n` +
    `Transcript:\n${transcription.slice(0, 8000)}\n\n` +
    `Return JSON:\n{` +
    `"summary":"2-3 sentence summary",` +
    `"sentiment":"positive|neutral|negative",` +
    `"action_items":["item1","item2"],` +
    `"next_step":"single recommended next step"` +
    `}\n\nReturn ONLY valid JSON.`;
  const text = await callClaude(prompt, 1024);
  const analysis = extractJSON(text) || {};

  await sb.from("phone_calls").update({
    transcription,
    ai_summary: analysis.summary || null,
    ai_sentiment: analysis.sentiment || null,
    ai_action_items: analysis.action_items || [],
  }).eq("twilio_call_sid", sid);

  return { transcribed: true, summary: analysis.summary };
}

async function analyzeLostDeal(body: any) {
  const d = body.deal || {};
  const acts = (body.activities || []).slice(0, 15);
  const prompt = "You are a sales loss analyst for B2B partnerships. Analyze why this deal was lost and how to improve.\n\nDeal: " + d.brand_name + ", Value: $" + (d.value || 0) + ", Source: " + (d.source || "Unknown") + ", Stage when lost: " + d.stage + ", Lost Reason: " + (d.lost_reason || "Not specified") + ", Added: " + (d.date_added || "Unknown") + ", Notes: " + (d.notes || "None") + "\n\nActivities: " + JSON.stringify(acts.map((a: any) => a.activity_type + ": " + (a.subject || ""))) + "\n\nReturn JSON:\n{\"likely_reasons\": [\"reason1\", \"reason2\"],\n\"what_went_well\": [\"item1\"],\n\"what_to_improve\": [\"item1\", \"item2\"],\n\"reengagement_possible\": true/false,\n\"reengagement_strategy\": \"string or null\",\n\"lessons_learned\": \"string\",\n\"similar_deal_tips\": [\"tip1\", \"tip2\"]}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { analysis: extractJSON(text) };
}

async function enrichContact(body: any) {
  const prompt = "You are a B2B sales intelligence researcher. Based on the following contact info, provide enriched data and conversation starters.\n\nName: " + (body.name || "") + "\nCompany: " + (body.company || "") + "\nPosition: " + (body.position || "") + "\n\nReturn JSON:\n{\"industry\": \"string\",\n\"company_type\": \"string\",\n\"likely_budget_range\": \"string\",\n\"sponsorship_interests\": [\"interest1\", \"interest2\"],\n\"conversation_starters\": [\"starter1\", \"starter2\", \"starter3\"],\n\"key_decision_factors\": [\"factor1\", \"factor2\"],\n\"recommended_assets\": [\"LED Board\", \"Social Post\", etc],\n\"engagement_approach\": \"string\"}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { enrichment: extractJSON(text) };
}

async function meetingNotes(body: any) {
  const d = body.deal || {};
  const prompt = "You are a meeting notes assistant for B2B partnership sales. Create structured meeting notes.\n\nDeal: " + (d.brand_name || "Unknown") + "\nAttendees: " + (body.attendees || "Not specified") + "\nAgenda: " + (body.agenda || "General discussion") + "\nRaw Notes: " + (body.raw_notes || "No notes provided") + "\n\nReturn JSON:\n{\"summary\": \"2-3 sentence summary\",\n\"key_decisions\": [\"decision1\"],\n\"action_items\": [{\"task\": \"string\", \"owner\": \"string\", \"due\": \"string\"}],\n\"follow_up_email_draft\": \"string\",\n\"next_meeting_agenda\": [\"item1\", \"item2\"],\n\"deal_stage_recommendation\": \"string or null\",\n\"sentiment\": \"Positive/Neutral/Negative\"}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { notes: extractJSON(text) };
}

// ============ PROSPECT SEARCH & DISCOVERY ============

function buildICPConstraints(icp: any): string {
  if (!icp) return '';
  const lines: string[] = [];

  // Size
  if (icp.company_size && icp.company_size !== 'any') {
    const sizeMap: any = {
      startup: 'early-stage startups (under 50 employees, typically <$10M revenue)',
      small: 'small companies (50-200 employees, $10M-$50M revenue)',
      mid: 'mid-market companies (200-1,000 employees, $50M-$500M revenue)',
      large: 'large companies (1,000-5,000 employees, $500M-$2B revenue)',
      enterprise: 'enterprise companies (5,000+ employees, $2B+ revenue)',
    };
    lines.push(`- Company size: ${sizeMap[icp.company_size] || icp.company_size}`);
  }
  if (icp.employee_min || icp.employee_max) {
    lines.push(`- Employees: ${icp.employee_min || 1}-${icp.employee_max || 'unlimited'}`);
  }
  if (icp.revenue_min || icp.revenue_max) {
    const fmt = (n: number) => n >= 1000000000 ? `$${(n/1000000000).toFixed(1)}B` : n >= 1000000 ? `$${(n/1000000).toFixed(0)}M` : `$${n}`;
    lines.push(`- Annual revenue: ${icp.revenue_min ? fmt(icp.revenue_min) : '$0'} to ${icp.revenue_max ? fmt(icp.revenue_max) : 'unlimited'}`);
  }

  // Location
  if (icp.location_scope && icp.location_scope !== 'any') {
    const locMap: any = {
      local: 'local companies only (within the same city/metro area)',
      regional: 'regional companies (within the same state or adjacent states)',
      national: 'national companies (headquartered anywhere in the country)',
      international: 'international companies (headquartered anywhere in the world)',
    };
    lines.push(`- Geographic scope: ${locMap[icp.location_scope]}`);
  }
  if (icp.cities?.length) lines.push(`- Target cities: ${icp.cities.join(', ')}`);
  if (icp.states?.length) lines.push(`- Target states: ${icp.states.join(', ')}`);

  // Industries
  if (icp.industries?.length) lines.push(`- Target industries: ${icp.industries.join(', ')}`);
  if (icp.sub_industries?.length) lines.push(`- Target sub-industries: ${icp.sub_industries.join(', ')}`);
  if (icp.exclude_industries?.length) lines.push(`- EXCLUDE industries: ${icp.exclude_industries.join(', ')}`);

  // Business type
  if (icp.business_type && icp.business_type !== 'any') {
    const btMap: any = {
      b2b: 'B2B (business-to-business) only',
      b2c: 'B2C (business-to-consumer) only',
      dtc: 'DTC (direct-to-consumer) brands',
      b2b2c: 'B2B2C (platforms serving both)',
    };
    lines.push(`- Business model: ${btMap[icp.business_type]}`);
  }
  if (icp.funding_stage && icp.funding_stage !== 'any') {
    lines.push(`- Funding stage: ${icp.funding_stage.replace('_', ' ')}`);
  }
  if (icp.growth_stage && icp.growth_stage !== 'any') {
    lines.push(`- Growth stage: ${icp.growth_stage}`);
  }

  // Budget
  if (icp.budget_min || icp.budget_max) {
    lines.push(`- Realistic sponsorship/partnership budget: $${icp.budget_min || 0}-$${icp.budget_max || 'unlimited'}`);
  }

  // Attributes
  if (icp.attributes?.length) {
    lines.push(`- Required attributes: ${icp.attributes.map((a: string) => a.replace('_', ' ')).join(', ')}`);
  }

  // Free-form description
  if (icp.ideal_description) {
    lines.push(`- Additional criteria: ${icp.ideal_description}`);
  }

  if (lines.length === 0) return '';
  return `\n\nIDEAL CUSTOMER PROFILE (strict requirements):\n${lines.join('\n')}\n\nCRITICAL: Only suggest companies that fit ALL of the above criteria. Skip massive global brands (Nike, Coca-Cola, Amazon, etc.) unless they specifically match. Prioritize realistic, reachable targets that match the profile. Quality over fame.`;
}

async function searchProspects(supabase: any, body: any) {
  const query = body.query || "";
  const category = body.category || "";
  const propertyId = body.property_id;
  const icp = body.icp_filters;
  const industry = body.industry || 'sports';

  // Fetch existing deals to avoid duplicates
  let existingBrands: string[] = [];
  if (propertyId) {
    const { data: deals } = await supabase
      .from("deals")
      .select("brand_name")
      .eq("property_id", propertyId);
    existingBrands = (deals || []).map((d: any) => (d.brand_name || "").toLowerCase());
  }

  const icpConstraints = buildICPConstraints(icp);

  const prompt = `Find 8-12 real companies for ${industry} sponsorship/partnership outreach.

SEARCH QUERY: "${query}"
${category ? `Category: ${category}` : ''}
${existingBrands.length > 0 ? `Exclude (already in pipeline): ${existingBrands.slice(0, 20).join(", ")}` : ''}${icpConstraints}

Return a JSON array of objects with these fields:
{
  "company_name": "Official company name",
  "category": "Industry category",
  "sub_industry": "Specific sub-industry",
  "estimated_sponsorship_budget": "Realistic budget range (e.g. '$5K-$25K')",
  "estimated_revenue": "Revenue range (e.g. '$10M-$50M')",
  "estimated_employees": "Employee count (e.g. '100-500')",
  "why_good_fit": "1-2 sentences on why they match the ICP",
  "icp_match_score": 1-10 (how closely they match the ICP),
  "headquarters_city": "City",
  "headquarters_state": "State",
  "website": "URL",
  "linkedin_url": "LinkedIn company URL",
  "priority": "High|Medium|Low"
}

CRITICAL: Match the ICP criteria exactly. Prefer realistic mid-market and local targets over massive global brands. Quality matches over famous names.

Return ONLY a valid JSON array.`;

  const text = await callClaude(prompt, 3000);
  try {
    return { prospects: extractJSON(text) };
  } catch {
    return { prospects: [] };
  }
}

async function suggestProspects(supabase: any, body: any) {
  const propertyId = body.property_id;
  const icp = body.icp_filters;
  const industry = body.industry || 'sports';

  // Fetch existing deals to analyze patterns
  let dealContext = "No existing deals.";
  if (propertyId) {
    const { data: deals } = await supabase
      .from("deals")
      .select("brand_name, value, stage, sub_industry, source, contact_company")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (deals && deals.length > 0) {
      const wonDeals = deals.filter((d: any) => ["Contracted", "In Fulfillment", "Renewed"].includes(d.stage));
      const industries = deals.map((d: any) => d.sub_industry).filter(Boolean);
      const avgValue = deals.reduce((s: number, d: any) => s + (Number(d.value) || 0), 0) / (deals.length || 1);

      dealContext = `Existing pipeline (${deals.length} deals):
Won deals: ${wonDeals.map((d: any) => `${d.brand_name} ($${d.value || 0})`).join(", ") || "None yet"}
Industries represented: ${[...new Set(industries)].join(", ") || "Various"}
Average deal value: $${Math.round(avgValue).toLocaleString()}
All brands: ${deals.map((d: any) => d.brand_name).join(", ")}`;
    }
  }

  const icpConstraints = buildICPConstraints(icp);

  const prompt = `You are a ${industry} sponsorship/partnership sales strategist. Analyze this team's existing pipeline and suggest NEW prospect companies they should target.

${dealContext}${icpConstraints}

Based on:
1. Which industries and company types have been successful (won deals)
2. Current market trends in ${industry} partnerships
3. Companies actively increasing ${industry}-related spending
4. Gaps in their current pipeline
5. The IDEAL CUSTOMER PROFILE constraints above

Suggest 12 specific, realistic companies they should pursue. Match the ICP strictly. If the ICP specifies "local companies under 500 employees," do NOT suggest Nike or Coca-Cola. Suggest actual local/regional/mid-market companies that fit.

Mix between:
- "Similar to winners" — companies in same industries as won deals AND matching the ICP
- "Trending" — companies currently ramping up spend AND matching the ICP
- "Untapped" — companies in underrepresented categories AND matching the ICP

For each:
- company_name: Official name
- category: Industry category
- sub_industry: Specific industry
- reason: "Similar to your winners" | "Trending" | "Untapped category"
- rationale: 1-2 sentence explanation
- estimated_sponsorship_budget: Realistic budget range
- estimated_revenue: Revenue range
- estimated_employees: Employee range
- icp_match_score: 1-10 (how closely they match the ICP)
- headquarters_city: City
- headquarters_state: State
- website: URL
- linkedin_url: Company LinkedIn URL
- priority: "High" | "Medium" | "Low"

Return JSON array. Return ONLY valid JSON.`;

  const text = await callClaude(prompt, 4096);
  return { suggestions: extractJSON(text) };
}

async function researchContacts(body: any) {
  const companyName = body.company_name || "";
  const category = body.category || "";
  const website = body.website || "";

  const prompt = `Find the top 3 decision-makers at ${companyName}${category ? ` (${category})` : ""} for sponsorship/partnership outreach.

Return JSON: {"contacts":[{"first_name":"","last_name":"","position":"","email_pattern":"first.last@company.com","linkedin_url":"https://linkedin.com/in/name","why_target":""}],"company_linkedin":""}

Return ONLY valid JSON, no other text.`;

  const text = await callClaude(prompt, 1024);
  try {
    return { research: extractJSON(text) };
  } catch {
    return { research: { contacts: [] } };
  }
}

// ============ NEWSLETTER ============

const INDUSTRY_CONFIG: any = {
  sports: {
    name: "The Sports Business Weekly",
    afternoonName: "Sports Afternoon Access",
    audience: "sports sponsorship and partnership professionals",
    sources: "SportBusiness Journal, Sports Business Daily, Front Office Sports, Forbes Sports Money, ESPN, The Athletic, Sportico, IEG/Sponsorship.com, Nielsen Sports, Ad Age, CNBC Sports",
    focus: "sponsorship deals, media rights, NIL, athlete partnerships, sports marketing, fan engagement, broadcast valuations",
    headlineDesc: "biggest sports business story",
    trendsDesc: "sports sponsorship (shifting budgets, new categories, NIL impact)",
    techDesc: "sports business (AI, streaming, fan engagement, ticketing, measurement)",
    brandDesc: "sports marketing strategy",
    categories: "NFL, NBA, MLB, NHL, NCAA, soccer, esports, Olympics",
  },
  nonprofit: {
    name: "The Nonprofit Impact Weekly",
    afternoonName: "Nonprofit Afternoon Access",
    audience: "nonprofit development officers, fundraisers, and grant managers",
    sources: "Chronicle of Philanthropy, Nonprofit Quarterly, Inside Philanthropy, Philanthropy News Digest, Stanford Social Innovation Review, Candid, GuideStar, NonProfit PRO, Fast Company Impact",
    focus: "grant funding, major donor cultivation, impact measurement, fundraising campaigns, corporate giving, donor retention",
    headlineDesc: "biggest nonprofit/philanthropy story",
    trendsDesc: "nonprofit fundraising (donor behavior, grant trends, giving circles)",
    techDesc: "nonprofits (donor CRM, payment platforms, impact tracking, AI fundraising)",
    brandDesc: "corporate-nonprofit partnership",
    categories: "foundations, community orgs, international NGOs, social enterprises, advocacy groups",
  },
  conference: {
    name: "The Conference Business Weekly",
    afternoonName: "Conference Afternoon Access",
    audience: "conference organizers, event marketers, and sponsorship managers",
    sources: "BizBash, PCMA Convene, Trade Show News Network, Skift Meetings, Event Marketer, MeetingsNet, Northstar Meetings Group, Cvent Blog, EventMB",
    focus: "conference sponsorships, trade show ROI, attendee engagement, hybrid events, sponsor activations, exhibitor experience",
    headlineDesc: "biggest conference/events story",
    trendsDesc: "events industry (attendance, sponsorship spend, format changes)",
    techDesc: "events (event tech, engagement platforms, hybrid delivery, AI networking)",
    brandDesc: "B2B event activation strategy",
    categories: "trade shows, conferences, summits, expos, user conferences, industry conventions",
  },
  media: {
    name: "The Media Business Weekly",
    afternoonName: "Media Afternoon Access",
    audience: "media publishers, broadcasters, and ad sales professionals",
    sources: "Digiday, AdWeek, Ad Age, Variety, The Hollywood Reporter, Nieman Lab, Axios Media Trends, Press Gazette, Media Post, MarketingBrew",
    focus: "advertising, audience measurement, publisher revenue, content monetization, branded content, programmatic ads",
    headlineDesc: "biggest media/publishing story",
    trendsDesc: "media industry (ad spend, audience trends, platform shifts)",
    techDesc: "media (AI content, measurement, attribution, CTV, addressable advertising)",
    brandDesc: "brand media strategy",
    categories: "digital publishers, broadcast, streaming, print, podcasts, newsletters",
  },
  realestate: {
    name: "The Real Estate Partnerships Weekly",
    afternoonName: "Real Estate Afternoon Access",
    audience: "commercial real estate developers, property managers, and brokers",
    sources: "CoStar, Bisnow, Commercial Observer, The Real Deal, GlobeSt, NAIOP, CBRE Insights, JLL Research, Cushman & Wakefield",
    focus: "commercial leasing, tenant partnerships, mixed-use development, retail anchors, office space, multifamily",
    headlineDesc: "biggest commercial real estate story",
    trendsDesc: "real estate partnerships (tenant trends, occupancy, lease structures)",
    techDesc: "real estate (proptech, smart buildings, tenant experience platforms)",
    brandDesc: "retail/restaurant tenant strategy",
    categories: "retail, office, multifamily, industrial, mixed-use, hospitality",
  },
  entertainment: {
    name: "The Entertainment Business Weekly",
    afternoonName: "Entertainment Afternoon Access",
    audience: "venue operators, talent bookers, and entertainment sponsorship managers",
    sources: "Pollstar, Billboard, Variety, The Hollywood Reporter, Venues Now, IQ Magazine, Music Business Worldwide, Amplify",
    focus: "live events, venue sponsorships, talent partnerships, festival activations, brand integrations, ticketing",
    headlineDesc: "biggest live entertainment story",
    trendsDesc: "entertainment industry (touring, venue economics, sponsor spend)",
    techDesc: "entertainment (ticketing tech, fan experience, streaming integrations)",
    brandDesc: "brand-artist partnership",
    categories: "concerts, festivals, venues, touring, theatre, nightlife, theme parks",
  },
}

function getIndustryKey(industryInput: string): string {
  const map: any = {
    sports: 'sports',
    college: 'sports',
    professional: 'sports',
    minor_league: 'sports',
    nonprofit: 'nonprofit',
    foundation: 'nonprofit',
    charity: 'nonprofit',
    conference: 'conference',
    events: 'conference',
    tradeshow: 'conference',
    media: 'media',
    publisher: 'media',
    broadcast: 'media',
    realestate: 'realestate',
    real_estate: 'realestate',
    commercial: 'realestate',
    entertainment: 'entertainment',
    venue: 'entertainment',
    music: 'entertainment',
  }
  return map[industryInput?.toLowerCase()] || 'sports'
}

async function generateWeeklyNewsletter(supabase: any, body: any) {
  const propertyId = body.property_id;
  const industry = getIndustryKey(body.industry || 'sports');
  const cfg = INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG.sports;

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const weekOf = monday.toISOString().split("T")[0];

  // Check if this industry's weekly newsletter already exists for this week
  const { data: existing } = await supabase
    .from("newsletters")
    .select("*")
    .eq("type", "weekly_digest")
    .eq("week_of", weekOf)
    .eq("industry", industry)
    .limit(1);

  if (existing?.length > 0) {
    return { newsletter: existing[0] };
  }

  const prompt = `You are the editor of "${cfg.name}," a premium weekly newsletter for ${cfg.audience}. Write the edition for the week of ${weekOf}.

Summarize the most important stories and developments from THIS WEEK (${weekOf} onward) in the ${industry} industry. Pull from recent real articles and news events from your knowledge. Focus on: ${cfg.focus}.

Cover these sectors: ${cfg.categories}.

Structure the newsletter with these sections:

1. **HEADLINE STORY** — The ${cfg.headlineDesc} of the week. Summarize it in 2-3 paragraphs with specific names, numbers, and quotes if available.
2. **DEALS & PARTNERSHIPS** — 3-4 notable deals, partnerships, or announcements from this week. Include dollar amounts where known.
3. **MARKET TRENDS** — 2-3 emerging trends in ${cfg.trendsDesc}. Data-driven insights.
4. **TECHNOLOGY & INNOVATION** — 1-2 tech developments impacting ${cfg.techDesc}.
5. **SPOTLIGHT** — Deep dive on one organization's ${cfg.brandDesc} and what others can learn.
6. **NUMBERS THAT MATTER** — 3-4 key stats or data points from the ${industry} world this week.
7. **LOOKING AHEAD** — What to watch for next week (upcoming events, earnings, announcements).
8. **ACTIONABLE TAKEAWAY** — One specific thing a ${cfg.audience.split(',')[0]} should do this week.

CRITICAL SOURCING RULES:
- Cite specific, real sources for every factual claim, data point, deal, or stat.
- Inline each citation as a parenthetical, e.g. "(Source: ${cfg.sources.split(',')[0].trim()}, ${today.toLocaleString('en-US', { month: 'short' })} ${today.getFullYear()})"
- Use real publications: ${cfg.sources}
- At the end, include a "Sources" section listing referenced publications
- Label analysis/opinion as "(Analysis)" or "(Industry observation)"
- Focus on RECENT events (this week or last two weeks). Do not reference old news as if it were new.

Format as clean HTML:
- <h2> for section headers
- <p> for paragraphs
- <ul>/<li> for lists
- <strong> for emphasis
- <blockquote> for key quotes or callouts
- End with <h2>Sources</h2> followed by source list
- 1500-2000 words total
- Do NOT include <html>, <head>, <body> tags

Return JSON:
{
  "title": "${cfg.name} — Week of ${weekOf}",
  "content": "<h2>...</h2><p>...</p>...<h2>Sources</h2><ul>...</ul>",
  "summary": "One paragraph summary of this week's key themes",
  "topics": [
    {"title": "topic headline", "category": "Deals|Trends|Technology|Spotlight|Data", "snippet": "one sentence", "source": "publication name"}
  ],
  "sources": [
    {"name": "Publication Name", "description": "Brief description of what was referenced"}
  ]
}

Return ONLY valid JSON.`;

  const text = await callClaude(prompt, 8192);
  const parsed = extractJSON(text);

  // Store with industry tag
  await supabase.from("newsletters").insert({
    property_id: propertyId || null,
    type: "weekly_digest",
    industry,
    title: parsed.title || `${cfg.name} — ${weekOf}`,
    content: parsed.content || "",
    summary: parsed.summary || "",
    topics: parsed.topics || [],
    sources: parsed.sources || [],
    week_of: weekOf,
    published_at: new Date().toISOString(),
  });

  return { newsletter: parsed };
}

async function generateAfternoonUpdate(supabase: any, body: any) {
  const propertyId = body.property_id;
  const industry = getIndustryKey(body.industry || 'sports');
  const cfg = INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG.sports;
  const today = new Date().toISOString().split("T")[0];

  // Check if today's afternoon update exists for this industry
  const { data: existing } = await supabase
    .from("newsletters")
    .select("*")
    .eq("type", "afternoon_update")
    .eq("industry", industry)
    .gte("published_at", today + "T00:00:00Z")
    .limit(1);

  if (existing?.length > 0) {
    return { update: existing[0] };
  }

  const prompt = `You are the editor of "${cfg.afternoonName}," a daily afternoon briefing for ${cfg.audience}. Write today's edition for ${today}.

This is a curated afternoon digest of developments, insights, and things to consider from TODAY or this week. Think "smart context" not "breaking alerts."

Summarize 4-5 concise items covering ${cfg.focus}:

1. **A development worth watching** — Something evolving in the ${industry} industry today
2. **Industry intel** — An insight or data point about ${cfg.audience.split(',')[0]} behavior or market dynamics
3. **Brand move** — An organization making an interesting ${cfg.brandDesc} play
4. **Conversation starter** — Something that would make for good discussion with a prospect or colleague
5. **Quick thought** — A brief observation or contrarian take on a current ${industry} topic

CRITICAL SOURCING RULES:
- Cite a specific source for each item's factual claims inline, e.g. "(via ${cfg.sources.split(',')[0].trim()})"
- Use real publications: ${cfg.sources}
- If it's analysis/opinion, label it as such
- At the end, include a brief "Sources" section
- Focus on CURRENT events (this week). Do not reference stale news.

Tone: Sharp, informed, conversational. Each item 2-4 sentences.

Format as clean HTML:
- <h3> for item headers
- <p> for body text
- <strong> for key terms
- End with <h3>Sources</h3>
- Do NOT include <html>, <head>, <body> tags

Return JSON:
{
  "title": "${cfg.afternoonName} — ${today}",
  "content": "<h3>...</h3><p>...</p>...<h3>Sources</h3><p>...</p>",
  "summary": "One sentence teaser",
  "topics": [
    {"title": "item headline", "category": "Development|Intel|Brand|Conversation|Thought", "snippet": "one sentence", "source": "publication name"}
  ],
  "sources": [
    {"name": "Publication Name", "description": "What was referenced"}
  ]
}

Return ONLY valid JSON.`;

  const text = await callClaude(prompt, 4096);
  const parsed = extractJSON(text);

  // Store with industry tag
  await supabase.from("newsletters").insert({
    property_id: propertyId || null,
    type: "afternoon_update",
    industry,
    title: parsed.title || `${cfg.afternoonName} — ${today}`,
    content: parsed.content || "",
    summary: parsed.summary || "",
    topics: parsed.topics || [],
    sources: parsed.sources || [],
    published_at: new Date().toISOString(),
  });

  return { update: parsed };
}

// ============ SMART ASSET MATCHING ============

async function smartMatchAssets(supabase: any, body: any): Promise<any> {
  const propertyId = body.property_id;
  const contractId = body.contract_id;
  const benefits = body.benefits || [];

  if (!propertyId || benefits.length === 0) {
    return { matches: [], error: "No benefits to match" };
  }

  // Get existing assets for the property
  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, category, description, base_price, quantity")
    .eq("property_id", propertyId)
    .eq("active", true);

  // Get past match history for learning
  const { data: history } = await supabase
    .from("asset_match_history")
    .select("benefit_text, matched_asset_id, matched_asset_name, matched_category, confidence, approved")
    .eq("property_id", propertyId)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(200);

  const assetList = (assets || []).map((a: any) =>
    `ID: ${a.id} | Name: ${a.name} | Category: ${a.category} | Price: $${a.base_price || 0} | Qty: ${a.quantity}`
  ).join("\n");

  const historyList = (history || []).slice(0, 50).map((h: any) =>
    `"${h.benefit_text}" → "${h.matched_asset_name}" (${h.matched_category}) [confidence: ${h.confidence}]`
  ).join("\n");

  const benefitList = benefits.map((b: any, i: number) =>
    `${i + 1}. "${b.benefit_description}" (qty: ${b.quantity}, freq: ${b.frequency}, value: $${b.value || 0})`
  ).join("\n");

  const prompt = `You are an expert at matching sponsorship contract benefits to existing asset inventory. A sports/entertainment property has uploaded a contract and extracted these benefits. Match each benefit to the BEST existing asset, or mark it as "new" if no match exists.

EXISTING ASSETS (match to these by ID):
${assetList || "No existing assets"}

PAST SUCCESSFUL MATCHES (learn from these patterns):
${historyList || "No history yet — this is the first match"}

CONTRACT BENEFITS TO MATCH:
${benefitList}

MATCHING RULES:
1. Match by MEANING, not exact text. "LED board signage" and "Electronic display sponsorship" are the same thing.
2. "PA announcement" and "Public address read" are the same thing.
3. "Social media post" includes Instagram, Facebook, Twitter mentions.
4. If the benefit clearly matches an existing asset, set confidence HIGH (0.85-1.0).
5. If it's a partial match or you're unsure, set confidence MEDIUM (0.5-0.84).
6. If there's no reasonable match, set confidence LOW (0.0-0.49) and suggest creating a new asset.
7. Learn from PAST MATCHES — if a similar benefit was matched before, follow that pattern.
8. Consider category alignment: LED Board benefits match LED Board assets, etc.

Return a JSON array. For EACH benefit (same order):
[
  {
    "benefit_index": 0,
    "matched_asset_id": "uuid-or-null",
    "matched_asset_name": "name-or-null",
    "suggested_category": "category name",
    "confidence": 0.0-1.0,
    "reasoning": "1 sentence why",
    "alternatives": [{"asset_id": "uuid", "name": "name", "confidence": 0.7}],
    "is_new": false
  }
]

Return ONLY valid JSON array.`;

  const text = await callClaudeAdvanced(
    "You are a sponsorship asset matching specialist. Match contract benefits to existing asset inventory with high accuracy. Learn from past matches to improve.",
    [{ role: "user", content: prompt }],
    4096,
  );

  let matches: any[] = [];
  try {
    matches = extractJSON(text);
  } catch {
    matches = benefits.map((_: any, i: number) => ({
      benefit_index: i,
      matched_asset_id: null,
      confidence: 0,
      reasoning: "Could not parse AI response",
      is_new: true,
    }));
  }

  // Process matches: auto-match high confidence, queue low confidence
  const AUTO_THRESHOLD = 0.80;
  const results: any[] = [];

  for (let i = 0; i < benefits.length; i++) {
    const benefit = benefits[i];
    const match = matches[i] || { confidence: 0, is_new: true };
    const conf = match.confidence || 0;

    if (conf >= AUTO_THRESHOLD && match.matched_asset_id) {
      // HIGH confidence: auto-match
      // Update benefit with asset_id
      if (benefit.id) {
        await supabase.from("contract_benefits").update({
          asset_id: match.matched_asset_id,
        }).eq("id", benefit.id);
      }

      // Log to history for learning
      await supabase.from("asset_match_history").insert({
        property_id: propertyId,
        benefit_text: benefit.benefit_description,
        matched_asset_id: match.matched_asset_id,
        matched_asset_name: match.matched_asset_name,
        matched_category: match.suggested_category,
        confidence: conf,
        was_auto: true,
        approved: true,
      });

      results.push({ ...match, status: "auto_matched", benefit_description: benefit.benefit_description });
    } else {
      // LOW/MEDIUM confidence: queue for approval
      await supabase.from("asset_match_queue").insert({
        contract_id: contractId,
        benefit_id: benefit.id || null,
        benefit_text: benefit.benefit_description,
        suggested_asset_id: match.matched_asset_id || null,
        suggested_asset_name: match.matched_asset_name || null,
        suggested_category: match.suggested_category || null,
        confidence: conf,
        alternative_assets: match.alternatives || [],
        status: "pending",
      });

      results.push({ ...match, status: "needs_approval", benefit_description: benefit.benefit_description });
    }
  }

  const autoMatched = results.filter(r => r.status === "auto_matched").length;
  const needsApproval = results.filter(r => r.status === "needs_approval").length;

  return {
    matches: results,
    auto_matched: autoMatched,
    needs_approval: needsApproval,
    total: results.length,
  };
}
