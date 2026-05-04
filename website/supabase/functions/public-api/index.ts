// ============================================================
// PUBLIC-API — Zapier-friendly REST surface for the CRM
// ============================================================
// Routes (all behind a per-property API key in X-Rally-API-Key):
//   GET  /functions/v1/public-api/deals            — list open deals
//   GET  /functions/v1/public-api/deals/:id        — fetch one
//   POST /functions/v1/public-api/deals            — create a deal
//   GET  /functions/v1/public-api/contacts         — list contacts
//   POST /functions/v1/public-api/contacts         — create a contact
//
// API keys live in the api_keys table (created lazily by Settings).
// Each key scopes requests to a single property_id.
//
// verify_jwt is OFF for this function (config.toml). The api_key
// header is the auth boundary.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-rally-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const apiKey = req.headers.get("x-rally-api-key");
  if (!apiKey) return jsonResponse({ error: "missing X-Rally-API-Key" }, 401);

  // Look up the property by api_key. The api_keys table is created
  // lazily in 077 if absent (see fallback below).
  const { data: keyRow } = await sb
    .from("api_keys")
    .select("property_id, is_active")
    .eq("token", apiKey)
    .maybeSingle();
  if (!keyRow || !keyRow.is_active) return jsonResponse({ error: "invalid api key" }, 401);

  const propertyId = keyRow.property_id;
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/functions\/v1\/public-api\/?/, "").split("/").filter(Boolean);
  const resource = parts[0];
  const id = parts[1];

  if (resource === "deals") {
    if (req.method === "GET" && !id) return await listDeals(sb, propertyId, url.searchParams);
    if (req.method === "GET" && id)  return await getDeal(sb, propertyId, id);
    if (req.method === "POST" && !id) return await createDeal(sb, propertyId, await req.json());
  }
  if (resource === "contacts") {
    if (req.method === "GET" && !id)  return await listContacts(sb, propertyId, url.searchParams);
    if (req.method === "POST" && !id) return await createContact(sb, propertyId, await req.json());
  }

  return jsonResponse({ error: "not found" }, 404);
});

async function listDeals(sb: any, propertyId: string, q: URLSearchParams) {
  const limit = Math.min(Number(q.get("limit") || 50), 200);
  const stage = q.get("stage");
  let query = sb.from("deals").select("*").eq("property_id", propertyId).order("created_at", { ascending: false }).limit(limit);
  if (stage) query = query.eq("stage", stage);
  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data });
}

async function getDeal(sb: any, propertyId: string, id: string) {
  const { data, error } = await sb.from("deals").select("*").eq("property_id", propertyId).eq("id", id).maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 500);
  if (!data) return jsonResponse({ error: "not found" }, 404);
  return jsonResponse({ data });
}

async function createDeal(sb: any, propertyId: string, body: any) {
  if (!body?.brand_name) return jsonResponse({ error: "brand_name required" }, 400);
  const allowed = [
    "brand_name", "value", "stage", "priority", "source", "notes",
    "city", "state", "website", "linkedin", "sub_industry",
    "contact_name", "contact_email", "contact_phone", "contact_position",
    "start_date", "end_date", "renewal_flag", "tags",
    "account_id", "agency_id", "custom_fields",
  ];
  const payload: Record<string, any> = { property_id: propertyId, stage: body.stage || "Prospect" };
  for (const k of allowed) {
    if (body[k] !== undefined) payload[k] = body[k];
  }
  const { data, error } = await sb.from("deals").insert(payload).select().single();
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data }, 201);
}

async function listContacts(sb: any, propertyId: string, q: URLSearchParams) {
  const limit = Math.min(Number(q.get("limit") || 50), 200);
  const dealId = q.get("deal_id");
  let query = sb.from("contacts").select("*").eq("property_id", propertyId).order("created_at", { ascending: false }).limit(limit);
  if (dealId) query = query.eq("deal_id", dealId);
  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data });
}

async function createContact(sb: any, propertyId: string, body: any) {
  const allowed = ["deal_id", "first_name", "last_name", "email", "phone", "position", "company", "linkedin", "is_primary", "notes", "custom_fields"];
  const payload: Record<string, any> = { property_id: propertyId };
  for (const k of allowed) {
    if (body[k] !== undefined) payload[k] = body[k];
  }
  if (!payload.first_name && !payload.email) return jsonResponse({ error: "first_name or email required" }, 400);
  const { data, error } = await sb.from("contacts").insert(payload).select().single();
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data }, 201);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
