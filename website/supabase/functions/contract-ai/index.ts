import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    } else if (action === "generate_weekly_newsletter") {
      result = await generateWeeklyNewsletter(supabaseClient, body);
    } else if (action === "generate_afternoon_update") {
      result = await generateAfternoonUpdate(supabaseClient, body);
    } else {
      throw new Error("Unknown action: " + action);
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
      model: "claude-3-haiku-20240307",
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
      model: "claude-opus-4-20250514",
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
1. Show the EXACT file path
2. Show the exact code to find (old) and replace with (new)
3. If creating a new file, show the complete file content
4. For database changes, provide SQL migrations
5. Explain your reasoning briefly
6. Consider error handling, null safety, and mobile responsiveness
7. Follow existing patterns in the codebase
8. Never truncate code — show complete implementations

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

  const prompt = "You are a professional sports sponsorship contract writer. Generate a formal sponsorship contract.\n\nDeal:\n- Brand: " + (deal?.brand_name || "TBD") + "\n- Contact: " + (deal?.contact_first_name || "") + " " + (deal?.contact_last_name || "") + ", " + (deal?.contact_position || "") + " at " + (deal?.contact_company || "") + "\n- Email: " + (deal?.contact_email || "") + "\n- Value: $" + Number(deal?.value || 0).toLocaleString() + "\n- Start: " + (deal?.start_date || "TBD") + "\n- End: " + (deal?.end_date || "TBD") + "\n\nAssets:\n" + assetLines + "\n\nAdditional Terms: " + (body.terms || "Standard terms") + "\n\nGenerate a complete contract with: parties, term, sponsorship benefits, financial terms, IP rights, termination, general provisions. Return only the contract text.";

  const text = await callClaude(prompt, 4096);
  return { contract_text: text };
}

async function editContract(body: any): Promise<any> {
  const prompt = "You are a contract editor. Here is the contract:\n\n---\n" + body.contract_text + "\n---\n\nMake these changes: " + body.instructions + "\n\nReturn the FULL updated contract text only.";
  const text = await callClaude(prompt, 4096);
  return { contract_text: text };
}

async function parsePdfText(body: any): Promise<any> {
  const prompt = 'Parse this contract and return a JSON object with these fields:\n- brand_name: company/brand name\n- contact_name: primary contact full name\n- contact_email\n- contact_phone\n- contact_position: title/role\n- contact_company\n- contract_number\n- effective_date (YYYY-MM-DD)\n- expiration_date (YYYY-MM-DD)\n- total_value: total contract value as number\n- annual_values: object with year keys and annual value, e.g. {"2025": 50000, "2026": 55000}. Calculate from total_value divided across years, or use per-year values if specified in the contract.\n- benefits: array of {description, category, quantity, frequency, value}\n- summary: 2-3 sentence summary\n\nReturn ONLY valid JSON.\n\nContract:\n---\n' + body.pdf_text + '\n---';
  const text = await callClaude(prompt, 2048);
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
  const prompt = "You are an elite sports sponsorship sales advisor. Analyze this deal and provide actionable insights.\n\nDeal: " + d.brand_name + ", Value: $" + (d.value || 0) + ", Stage: " + d.stage + ", Priority: " + (d.priority || "Medium") + ", Win Prob: " + (d.win_probability || 0) + "%, Contact: " + (d.contact_name || "Unknown") + " (" + (d.contact_position || "") + " at " + (d.contact_company || "") + "), Source: " + (d.source || "Unknown") + ", Added: " + (d.date_added || "Unknown") + ", Last Contacted: " + (d.last_contacted || "Never") + ", Notes: " + (d.notes || "None") + "\n\nRecent Activities: " + JSON.stringify(acts.map((a: any) => a.activity_type + ": " + (a.subject || "") + " (" + a.occurred_at + ")")) + "\n\nOpen Tasks: " + JSON.stringify(tasks.map((t: any) => t.title + " (due: " + t.due_date + ", " + t.priority + ")")) + "\n\nContracts: " + contracts.length + " total\n\nReturn a JSON object with:\n{\"health_score\": 1-10,\n\"next_best_actions\": [\"action1\", \"action2\", \"action3\"],\n\"risk_factors\": [\"risk1\"],\n\"opportunities\": [\"opp1\"],\n\"recommended_talking_points\": [\"point1\", \"point2\"],\n\"suggested_email_subject\": \"string\",\n\"days_to_close_estimate\": number,\n\"coaching_tip\": \"string\"}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { insights: extractJSON(text) };
}

async function pipelineForecast(body: any) {
  const deals = (body.deals || []).map((d: any) => ({ brand: d.brand_name, value: d.value, stage: d.stage, win_prob: d.win_probability, age: d.date_added }));
  const prompt = "You are a revenue forecasting analyst for sports sponsorships. Analyze this pipeline and forecast.\n\nDeals: " + JSON.stringify(deals) + "\nHistorical Win Rate: " + (body.historical_win_rate || 30) + "%\n\nReturn JSON:\n{\"forecast_30_days\": number,\n\"forecast_60_days\": number,\n\"forecast_90_days\": number,\n\"best_case\": number,\n\"worst_case\": number,\n\"most_likely\": number,\n\"at_risk_deals\": [\"brand names\"],\n\"hot_deals\": [\"brand names\"],\n\"recommendations\": [\"rec1\", \"rec2\", \"rec3\"],\n\"pipeline_health\": \"Healthy\" or \"At Risk\" or \"Critical\",\n\"summary\": \"2 sentence summary\"}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { forecast: extractJSON(text) };
}

async function draftEmailFn(body: any) {
  const d = body.deal || {};
  const prompt = "You are a professional sports sponsorship sales executive. Draft a " + (body.email_type || "follow-up") + " email.\n\nDeal: " + d.brand_name + ", Stage: " + d.stage + ", Contact: " + (d.contact_name || "") + " (" + (d.contact_position || "") + "), Value: $" + (d.value || 0) + "\nContext: " + (body.context || "Standard follow-up") + "\n\nReturn JSON:\n{\"subject\": \"email subject\",\n\"body\": \"email body text\",\n\"tone\": \"professional/casual/urgent\"}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { email: extractJSON(text) };
}

async function analyzeLostDeal(body: any) {
  const d = body.deal || {};
  const acts = (body.activities || []).slice(0, 15);
  const prompt = "You are a sales loss analyst for sports sponsorships. Analyze why this deal was lost and how to improve.\n\nDeal: " + d.brand_name + ", Value: $" + (d.value || 0) + ", Source: " + (d.source || "Unknown") + ", Stage when lost: " + d.stage + ", Lost Reason: " + (d.lost_reason || "Not specified") + ", Added: " + (d.date_added || "Unknown") + ", Notes: " + (d.notes || "None") + "\n\nActivities: " + JSON.stringify(acts.map((a: any) => a.activity_type + ": " + (a.subject || ""))) + "\n\nReturn JSON:\n{\"likely_reasons\": [\"reason1\", \"reason2\"],\n\"what_went_well\": [\"item1\"],\n\"what_to_improve\": [\"item1\", \"item2\"],\n\"reengagement_possible\": true/false,\n\"reengagement_strategy\": \"string or null\",\n\"lessons_learned\": \"string\",\n\"similar_deal_tips\": [\"tip1\", \"tip2\"]}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { analysis: extractJSON(text) };
}

async function enrichContact(body: any) {
  const prompt = "You are a business intelligence researcher for sports sponsorships. Based on the following contact info, provide enriched data and conversation starters.\n\nName: " + (body.name || "") + "\nCompany: " + (body.company || "") + "\nPosition: " + (body.position || "") + "\n\nReturn JSON:\n{\"industry\": \"string\",\n\"company_type\": \"string\",\n\"likely_budget_range\": \"string\",\n\"sponsorship_interests\": [\"interest1\", \"interest2\"],\n\"conversation_starters\": [\"starter1\", \"starter2\", \"starter3\"],\n\"key_decision_factors\": [\"factor1\", \"factor2\"],\n\"recommended_assets\": [\"LED Board\", \"Social Post\", etc],\n\"engagement_approach\": \"string\"}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { enrichment: extractJSON(text) };
}

async function meetingNotes(body: any) {
  const d = body.deal || {};
  const prompt = "You are a meeting notes assistant for sports sponsorship sales. Create structured meeting notes.\n\nDeal: " + (d.brand_name || "Unknown") + "\nAttendees: " + (body.attendees || "Not specified") + "\nAgenda: " + (body.agenda || "General discussion") + "\nRaw Notes: " + (body.raw_notes || "No notes provided") + "\n\nReturn JSON:\n{\"summary\": \"2-3 sentence summary\",\n\"key_decisions\": [\"decision1\"],\n\"action_items\": [{\"task\": \"string\", \"owner\": \"string\", \"due\": \"string\"}],\n\"follow_up_email_draft\": \"string\",\n\"next_meeting_agenda\": [\"item1\", \"item2\"],\n\"deal_stage_recommendation\": \"string or null\",\n\"sentiment\": \"Positive/Neutral/Negative\"}\n\nReturn ONLY valid JSON.";
  const text = await callClaude(prompt, 1024);
  return { notes: extractJSON(text) };
}

// ============ PROSPECT SEARCH & DISCOVERY ============

async function searchProspects(supabase: any, body: any) {
  const query = body.query || "";
  const category = body.category || "";
  const propertyId = body.property_id;

  // Fetch existing deals to avoid duplicates
  let existingBrands: string[] = [];
  if (propertyId) {
    const { data: deals } = await supabase
      .from("deals")
      .select("brand_name")
      .eq("property_id", propertyId);
    existingBrands = (deals || []).map((d: any) => (d.brand_name || "").toLowerCase());
  }

  const prompt = `Find 8 real companies matching: "${query}". ${category ? `Industry: ${category}.` : ""} ${existingBrands.length > 0 ? `Exclude: ${existingBrands.slice(0, 20).join(", ")}.` : ""}

Return a JSON array of objects with these fields:
company_name, category, sub_industry, estimated_sponsorship_budget, why_good_fit, headquarters_city, headquarters_state, website, priority (High/Medium/Low)

Return ONLY a JSON array, no other text.`;

  const text = await callClaude(prompt, 2048);
  try {
    return { prospects: extractJSON(text) };
  } catch {
    return { prospects: [] };
  }
}

async function suggestProspects(supabase: any, body: any) {
  const propertyId = body.property_id;

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

  const prompt = `You are a sports sponsorship sales strategist. Analyze this sales team's existing pipeline and suggest NEW prospect companies they should target.

${dealContext}

Based on:
1. Which industries and company types have been successful (won deals)
2. Market trends in sports sponsorship (2024-2025)
3. Companies actively increasing sports marketing spend
4. Gaps in their current pipeline (underrepresented high-value categories)

Suggest 12 specific, real companies they should pursue. Mix between:
- "Similar to winners" — companies in the same industries as their won deals
- "Trending" — companies currently ramping up sports sponsorship spend
- "High potential" — companies in growing categories they haven't tapped yet

For each:
- company_name: Official name
- category: Industry category
- sub_industry: Specific industry
- reason: Why suggested (1 of: "Similar to your winners", "Trending in sports sponsorship", "Untapped high-potential category")
- rationale: 1-2 sentence explanation
- estimated_sponsorship_budget: Budget range
- headquarters_city: City
- headquarters_state: State
- website: URL
- linkedin_url: Company LinkedIn URL (https://linkedin.com/company/slug)
- priority: "High", "Medium", or "Low"
- estimated_revenue: Revenue range
- estimated_employees: Employee range

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

async function generateWeeklyNewsletter(supabase: any, body: any) {
  const propertyId = body.property_id;

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const weekOf = monday.toISOString().split("T")[0];

  // Check if this week's newsletter already exists globally
  const { data: existing } = await supabase
    .from("newsletters")
    .select("*")
    .eq("type", "weekly_digest")
    .eq("week_of", weekOf)
    .limit(1);

  if (existing?.length > 0) {
    return { newsletter: existing[0] };
  }

  const prompt = `You are the editor of "The Sports Business Weekly," a premium newsletter for sports sponsorship and partnership professionals. Write the weekly edition for the week of ${weekOf}.

Write a comprehensive, well-structured newsletter covering:

1. **HEADLINE STORY** — The biggest sports business story this week (major deal, partnership, or market shift)
2. **DEALS & PARTNERSHIPS** — 3-4 notable sponsorship deals or partnership announcements
3. **MARKET TRENDS** — 2-3 emerging trends in sports sponsorship (data-driven insights, shifting budgets, new categories)
4. **TECHNOLOGY & INNOVATION** — 1-2 tech developments impacting sports business (AI, streaming, fan engagement, measurement)
5. **BRAND SPOTLIGHT** — Deep dive on one brand's sports marketing strategy and what others can learn
6. **NUMBERS THAT MATTER** — 3-4 key stats or data points from the sports business world
7. **LOOKING AHEAD** — What to watch for next week (upcoming events, earnings, announcements)
8. **ACTIONABLE TAKEAWAY** — One specific thing a sponsorship sales professional should do this week

CRITICAL SOURCING RULES:
- Cite specific, real sources for every factual claim, data point, deal, or stat.
- Inline each citation as a parenthetical at the end of the sentence, e.g. "(Source: SportBusiness Journal, March 2025)" or "(Source: Forbes Sports Money, Feb 2025)"
- Use real publications: SportBusiness Journal, Sports Business Daily, Front Office Sports, Forbes, Bloomberg, ESPN, The Athletic, Yahoo Sports, CNBC, Marketing Week, Ad Age, Sportico, GlobalData Sport, IEG/Sponsorship.com, Nielsen Sports
- At the end of the newsletter, include a "Sources" section listing all referenced publications with brief descriptions
- If a fact is based on general industry knowledge, say "(Source: Industry analysis)" — do NOT present opinions as sourced facts

Format as clean HTML:
- Use <h2> for section headers
- Use <p> for paragraphs
- Use <ul>/<li> for lists
- Use <strong> for emphasis
- Use <blockquote> for key quotes or callouts
- End with <h2>Sources</h2> followed by source list
- Keep total length around 1500-2000 words
- Do NOT include <html>, <head>, <body> tags

Return JSON:
{
  "title": "The Sports Business Weekly — Week of ${weekOf}",
  "content": "<h2>...</h2><p>...</p>...<h2>Sources</h2><ul>...</ul>",
  "summary": "One paragraph summary of this week's key themes",
  "topics": [
    {"title": "topic headline", "category": "Deals|Trends|Technology|Brands|Data", "snippet": "one sentence", "source": "publication name"}
  ],
  "sources": [
    {"name": "Publication Name", "description": "Brief description of what was referenced"}
  ]
}

Return ONLY valid JSON.`;

  const text = await callClaude(prompt, 8192);
  const parsed = extractJSON(text);

  // Store globally (no property_id filter — same for everyone)
  await supabase.from("newsletters").insert({
    property_id: propertyId || null,
    type: "weekly_digest",
    title: parsed.title || `The Sports Business Weekly — ${weekOf}`,
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
  const today = new Date().toISOString().split("T")[0];

  // Check if today's afternoon update already exists globally
  const { data: existing } = await supabase
    .from("newsletters")
    .select("*")
    .eq("type", "afternoon_update")
    .gte("published_at", today + "T00:00:00Z")
    .limit(1);

  if (existing?.length > 0) {
    return { update: existing[0] };
  }

  const prompt = `You are the editor of "Afternoon Access," a daily afternoon briefing for sports business professionals. Write today's edition for ${today}.

This is NOT breaking news. It's a curated afternoon digest of developments, insights, and things to consider. Think "smart context" not "alerts."

Write 4-5 concise items covering:

1. **A development worth watching** — Something evolving in sports business (not breaking, but a noteworthy update)
2. **Industry intel** — An insight or data point about sponsor behavior, fan engagement, or market dynamics
3. **Brand move** — A brand making an interesting sports marketing play (new activation, renewed deal, category shift)
4. **Conversation starter** — Something that would make for good discussion with a prospect or colleague
5. **Quick thought** — A brief observation or contrarian take on a current sports business topic

CRITICAL SOURCING RULES:
- Cite a specific source for each item's factual claims inline, e.g. "(via SportBusiness Journal)" or "(per Front Office Sports)"
- Use real publications: SportBusiness Journal, Front Office Sports, Forbes, Sportico, The Athletic, ESPN, Ad Age, CNBC, Sports Business Daily, Marketing Week
- If it's your own analysis/opinion, label it as such: "(Analysis)" or "(Industry observation)"
- At the end, include a brief "Sources" section

Tone: Sharp, informed, conversational. Each item should be 2-4 sentences max.

Format as clean HTML:
- Use <h3> for item headers (include an emoji prefix)
- Use <p> for body text
- Use <strong> for key terms
- End with <h3>Sources</h3> and a brief source list
- Do NOT include <html>, <head>, <body> tags

Return JSON:
{
  "title": "Afternoon Access — ${today}",
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

  // Store globally
  await supabase.from("newsletters").insert({
    property_id: propertyId || null,
    type: "afternoon_update",
    title: parsed.title || `Afternoon Access — ${today}`,
    content: parsed.content || "",
    summary: parsed.summary || "",
    topics: parsed.topics || [],
    sources: parsed.sources || [],
    published_at: new Date().toISOString(),
  });

  return { update: parsed };
}
