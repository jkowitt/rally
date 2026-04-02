import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // Route to the right handler
    let result;
    switch (action) {
      case "generate_contract":
        result = await generateContract(supabaseClient, body);
        break;
      case "edit_contract":
        result = await editContract(body);
        break;
      case "parse_pdf_text":
        result = await parsePdfText(body);
        break;
      case "summarize_contract":
        result = await summarizeContract(body);
        break;
      case "extract_benefits":
        result = await extractBenefits(supabaseClient, body);
        break;
      case "generate_fulfillment":
        result = await generateFulfillment(supabaseClient, body);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callClaude(prompt: string, maxTokens = 2048) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "";
}

function parseJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) return JSON.parse(arrMatch[0]);
  return JSON.parse(text);
}

// Generate a new contract from deal + asset info
async function generateContract(supabaseClient: any, body: any) {
  const { deal_id, property_id, assets, terms } = body;

  const { data: deal } = await supabaseClient
    .from("deals")
    .select("*")
    .eq("id", deal_id)
    .single();

  const { data: propertyAssets } = await supabaseClient
    .from("assets")
    .select("*")
    .eq("property_id", property_id)
    .in("id", assets || []);

  const prompt = `You are a professional sports sponsorship contract writer. Generate a formal sponsorship contract based on the following information.

Deal Information:
- Brand: ${deal?.brand_name || "TBD"}
- Contact: ${deal?.contact_first_name || ""} ${deal?.contact_last_name || ""}, ${deal?.contact_position || ""} at ${deal?.contact_company || deal?.brand_name || ""}
- Email: ${deal?.contact_email || ""}
- Value: $${Number(deal?.value || 0).toLocaleString()}
- Start: ${deal?.start_date || "TBD"}
- End: ${deal?.end_date || "TBD"}

Included Assets:
${(propertyAssets || []).map((a: any) => `- ${a.name} (${a.category}): Qty ${a.quantity}, Base $${Number(a.base_price || 0).toLocaleString()}`).join("\n")}

Additional Terms: ${terms || "Standard terms"}

Generate a complete sponsorship contract with:
1. Parties and recitals
2. Term and territory
3. Sponsorship benefits (list each asset as a deliverable)
4. Financial terms and payment schedule
5. Intellectual property rights
6. Termination and renewal clauses
7. General provisions

Format as clean professional contract text. Do NOT include JSON, only the contract text.`;

  const contractText = await callClaude(prompt, 4096);

  return { contract_text: contractText };
}

// Edit existing contract text with instructions
async function editContract(body: any) {
  const { contract_text, instructions } = body;

  const prompt = `You are a professional sports sponsorship contract editor. Here is the current contract text:

---
${contract_text}
---

The user wants you to make the following changes:
${instructions}

Return the FULL updated contract text with those changes applied. Only return the contract text, no commentary.`;

  const updatedText = await callClaude(prompt, 4096);
  return { contract_text: updatedText };
}

// Parse raw text extracted from a PDF and structure it
async function parsePdfText(body: any) {
  const { pdf_text } = body;

  const prompt = `You are an expert at reading sports sponsorship contracts. Parse the following contract text and extract structured data.

Contract Text:
---
${pdf_text}
---

Return a JSON object with these fields:
{
  "brand_name": "string",
  "contact_name": "string",
  "contact_email": "string or null",
  "contact_phone": "string or null",
  "contact_position": "string or null",
  "contact_company": "string or null",
  "contract_number": "string or null",
  "effective_date": "YYYY-MM-DD or null",
  "expiration_date": "YYYY-MM-DD or null",
  "total_value": number or null,
  "benefits": [
    {
      "description": "string",
      "category": "one of: LED Board, Jersey Patch, Radio Read, Social Post, Naming Right, Signage, Activation Space, Digital, Other",
      "quantity": number,
      "frequency": "Per Game or Per Month or Per Season or One Time",
      "value": number or null
    }
  ],
  "summary": "2-3 sentence summary of the contract"
}

Return ONLY valid JSON.`;

  const responseText = await callClaude(prompt, 2048);
  const parsed = parseJSON(responseText);
  return { parsed };
}

// Summarize contract text
async function summarizeContract(body: any) {
  const { contract_text } = body;

  const prompt = `Summarize this sports sponsorship contract in 3-5 bullet points. Focus on: parties involved, total value, key deliverables, term dates, and any notable clauses.

Contract:
---
${contract_text}
---

Return a concise summary as plain text bullet points.`;

  const summary = await callClaude(prompt, 512);
  return { summary };
}

// Extract benefits from contract text and save to DB
async function extractBenefits(supabaseClient: any, body: any) {
  const { contract_id, contract_text, property_id } = body;

  const { data: assets } = await supabaseClient
    .from("assets")
    .select("id, name, category")
    .eq("property_id", property_id);

  const prompt = `Extract all sponsorship benefits/deliverables from this contract and match them to available assets where possible.

Contract Text:
---
${contract_text}
---

Available Assets:
${(assets || []).map((a: any) => `- ID: ${a.id}, Name: ${a.name}, Category: ${a.category}`).join("\n")}

Return a JSON array of benefits:
[
  {
    "benefit_description": "string",
    "asset_id": "uuid of matching asset or null",
    "asset_name": "name of the matched asset or the benefit name",
    "quantity": number,
    "frequency": "Per Game" | "Per Month" | "Per Season" | "One Time",
    "value": number or null
  }
]

Match benefits to existing assets by name/category where possible. Return ONLY valid JSON array.`;

  const responseText = await callClaude(prompt, 2048);
  const benefits = parseJSON(responseText);

  // Insert benefits into contract_benefits table
  if (Array.isArray(benefits) && benefits.length > 0) {
    const rows = benefits.map((b: any) => ({
      contract_id,
      asset_id: b.asset_id || null,
      benefit_description: b.benefit_description,
      quantity: b.quantity || 1,
      frequency: b.frequency || "Per Season",
      value: b.value || null,
      fulfillment_auto_generated: false,
    }));

    const { data, error } = await supabaseClient
      .from("contract_benefits")
      .insert(rows)
      .select();

    if (error) throw error;
    return { benefits: data };
  }

  return { benefits: [] };
}

// Generate fulfillment records from contract benefits
async function generateFulfillment(supabaseClient: any, body: any) {
  const { contract_id, deal_id, start_date, end_date } = body;

  // Get contract benefits
  const { data: benefits } = await supabaseClient
    .from("contract_benefits")
    .select("*")
    .eq("contract_id", contract_id);

  if (!benefits || benefits.length === 0) {
    return { records: [], message: "No benefits found to generate fulfillment from" };
  }

  const records: any[] = [];
  const start = new Date(start_date || new Date().toISOString().split("T")[0]);
  const end = new Date(end_date || new Date(start.getFullYear() + 1, start.getMonth(), start.getDate()).toISOString().split("T")[0]);

  for (const benefit of benefits) {
    const freq = benefit.frequency || "Per Season";
    const dates: string[] = [];

    if (freq === "One Time" || freq === "Per Season") {
      // Single fulfillment at midpoint
      const mid = new Date((start.getTime() + end.getTime()) / 2);
      dates.push(mid.toISOString().split("T")[0]);
    } else if (freq === "Per Month") {
      // Monthly from start to end
      const cursor = new Date(start);
      while (cursor <= end) {
        dates.push(cursor.toISOString().split("T")[0]);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else if (freq === "Per Game") {
      // Bi-weekly approximation for game schedule
      const cursor = new Date(start);
      while (cursor <= end) {
        dates.push(cursor.toISOString().split("T")[0]);
        cursor.setDate(cursor.getDate() + 14);
      }
    }

    for (const date of dates) {
      for (let q = 0; q < (benefit.quantity || 1); q++) {
        records.push({
          deal_id,
          contract_id,
          asset_id: benefit.asset_id || null,
          benefit_id: benefit.id,
          scheduled_date: date,
          delivered: false,
          delivery_notes: `Auto: ${benefit.benefit_description || "Benefit"}`,
          auto_generated: true,
        });
      }
    }
  }

  if (records.length > 0) {
    const { data, error } = await supabaseClient
      .from("fulfillment_records")
      .insert(records)
      .select();

    if (error) throw error;

    // Mark benefits as having fulfillment generated
    await supabaseClient
      .from("contract_benefits")
      .update({ fulfillment_auto_generated: true })
      .eq("contract_id", contract_id);

    return { records: data, count: data.length };
  }

  return { records: [], count: 0 };
});
