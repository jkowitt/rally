import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY") ?? "";
const HUNTER_BASE = "https://api.hunter.io/v2";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!HUNTER_API_KEY) throw new Error("HUNTER_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { action, email, domain, first_name, last_name, property_id } = body;

    let result: any;

    if (action === "verify_email") {
      // Check cache
      const cached = await getCachedEmail(supabase, email);
      if (cached) return json({ data: cached, cached: true });

      const resp = await fetch(`${HUNTER_BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_API_KEY}`);
      const raw = await resp.json();
      const d = raw.data || {};

      result = {
        email: d.email,
        status: d.status, // valid, invalid, accept_all, disposable, webmail, unknown
        result: d.result, // deliverable, undeliverable, risky, unknown
        score: d.score, // 0-100
        regexp: d.regexp,
        gibberish: d.gibberish,
        disposable: d.disposable,
        webmail: d.webmail,
        mx_records: d.mx_records,
        smtp_server: d.smtp_server,
        smtp_check: d.smtp_check,
        accept_all: d.accept_all,
        block: d.block,
      };

      await cacheEmail(supabase, email, result, property_id);
      await logUsage(supabase, property_id, "hunter", "verify_email");
    } else if (action === "find_email") {
      // Find email for a person at a domain
      const resp = await fetch(
        `${HUNTER_BASE}/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}&api_key=${HUNTER_API_KEY}`
      );
      const raw = await resp.json();
      const d = raw.data || {};

      result = {
        email: d.email,
        score: d.score,
        sources: d.sources,
        first_name: d.first_name,
        last_name: d.last_name,
        position: d.position,
        verification: d.verification,
      };

      await logUsage(supabase, property_id, "hunter", "find_email");
    } else if (action === "domain_search") {
      // Get all emails at a domain
      const resp = await fetch(`${HUNTER_BASE}/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${HUNTER_API_KEY}`);
      const raw = await resp.json();
      const d = raw.data || {};

      result = {
        domain: d.domain,
        organization: d.organization,
        pattern: d.pattern, // e.g. "{first}.{last}" - the email format they use
        emails: (d.emails || []).map((e: any) => ({
          value: e.value,
          type: e.type,
          confidence: e.confidence,
          first_name: e.first_name,
          last_name: e.last_name,
          position: e.position,
          linkedin: e.linkedin,
        })),
      };

      await logUsage(supabase, property_id, "hunter", "domain_search");
    } else {
      throw new Error("Unknown action: " + action);
    }

    return json({ data: result, cached: false });
  } catch (err: any) {
    return json({ error: err.message || "Unknown error" }, 200);
  }
});

async function getCachedEmail(supabase: any, email: string) {
  const { data } = await supabase
    .from("contact_research")
    .select("data")
    .eq("source", "hunter")
    .eq("person_name", email)
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  return data?.[0]?.data || null;
}

async function cacheEmail(supabase: any, email: string, data: any, property_id: string) {
  await supabase.from("contact_research").insert({
    company_name: email.split("@")[1] || "",
    person_name: email,
    source: "hunter",
    data,
    property_id,
  });
}

async function logUsage(supabase: any, property_id: string, service: string, endpoint: string) {
  if (!property_id) return;
  await supabase.from("api_usage").insert({
    property_id,
    service,
    endpoint,
    credits_used: 1,
  });
}

function json(body: any, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
