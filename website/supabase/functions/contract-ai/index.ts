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
