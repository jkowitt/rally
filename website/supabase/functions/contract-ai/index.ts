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
      model: "claude-sonnet-4-20250514",
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
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return JSON.parse(objMatch[0]);
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) return JSON.parse(arrMatch[0]);
  return JSON.parse(text);
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
  const prompt = 'Parse this contract and return a JSON object with: brand_name, contact_name, contact_email, contact_phone, contact_position, contact_company, contract_number, effective_date (YYYY-MM-DD), expiration_date (YYYY-MM-DD), total_value (number), benefits (array of {description, category, quantity, frequency, value}), summary. Return ONLY valid JSON.\n\nContract:\n---\n' + body.pdf_text + '\n---';
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

  const prompt = `You are a sports sponsorship sales intelligence expert. A sales rep is searching for potential sponsor prospects.

Search Query: "${query}"
${category ? `Category Filter: ${category}` : ""}

Generate 10-15 real, well-known companies that match this search and would be strong candidates for sports sponsorship deals. Focus on companies that are known to invest in sports marketing, local community partnerships, or brand activations.

${existingBrands.length > 0 ? `IMPORTANT: Exclude these companies that are already in their pipeline: ${existingBrands.slice(0, 50).join(", ")}` : ""}

For each prospect, provide:
- company_name: Official company name
- category: One of [Automotive, Banking & Financial Services, Beverage & Alcohol, Consumer Packaged Goods, Education, Energy & Utilities, Entertainment & Media, Fashion & Apparel, Food & Quick Serve Restaurants, Gaming & Esports, Healthcare, Hospitality & Travel, Insurance, Real Estate & Construction, Retail, Sports & Fitness, Technology & Software, Telecommunications, Transportation & Logistics, Misc]
- sub_industry: More specific industry
- estimated_sponsorship_budget: Rough annual sports sponsorship budget range (e.g. "$50K-$200K")
- sponsorship_track_record: Brief note on their sports sponsorship history
- why_good_fit: 1 sentence on why they'd be a good sponsorship prospect
- headquarters_city: City name
- headquarters_state: State abbreviation
- website: Company website URL
- linkedin_url: Company LinkedIn page URL (use format https://linkedin.com/company/company-name)
- estimated_revenue: Revenue range
- estimated_employees: Employee count range

Return JSON array. Return ONLY valid JSON.`;

  const text = await callClaude(prompt, 4096);
  return { prospects: extractJSON(text) };
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

  const prompt = `You are a B2B sales research assistant specializing in sports sponsorship. Research the top 3 decision-makers at this company who would be involved in sponsorship decisions.

Company: ${companyName}
Industry: ${category}
${website ? `Website: ${website}` : ""}

Find the 3 most relevant contacts for a sports sponsorship sales outreach. Prioritize:
1. VP/Director of Marketing, Brand Marketing, or Sponsorships
2. CMO or Head of Marketing
3. VP of Partnerships, Community Relations, or Corporate Affairs

For each contact provide:
- first_name: First name
- last_name: Last name
- position: Their title/role
- email_pattern: Most likely email format (e.g. "first.last@company.com" or "flast@company.com")
- linkedin_url: Their LinkedIn profile URL (use format https://linkedin.com/in/firstname-lastname)
- why_target: 1 sentence on why they're the right person to contact
- outreach_tip: 1 sentence suggestion for how to approach them

Also provide:
- company_linkedin: Company LinkedIn URL
- company_phone: Main company phone (general number)
- company_address: Headquarters address

Return JSON:
{
  "contacts": [{ first_name, last_name, position, email_pattern, linkedin_url, why_target, outreach_tip }],
  "company_linkedin": "string",
  "company_phone": "string",
  "company_address": "string"
}

Return ONLY valid JSON.`;

  const text = await callClaude(prompt, 2048);
  return { research: extractJSON(text) };
}
