import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APOLLO_API_KEY = Deno.env.get("APOLLO_API_KEY") ?? "";
const APOLLO_BASE = "https://api.apollo.io/v1";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!APOLLO_API_KEY) throw new Error("APOLLO_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { action, company_name, person_name, domain, property_id } = body;

    let result: any;

    if (action === "enrich_company") {
      // Check cache first
      const cached = await getCached(supabase, company_name, null, "apollo");
      if (cached) return json({ data: cached, cached: true });

      // Call Apollo Organization Enrichment
      const apolloResp = await fetch(`${APOLLO_BASE}/organizations/enrich?api_key=${APOLLO_API_KEY}&domain=${encodeURIComponent(domain || company_name)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const apolloData = await apolloResp.json();
      const org = apolloData.organization || {};

      result = {
        name: org.name,
        website: org.website_url,
        linkedin_url: org.linkedin_url,
        phone: org.phone,
        city: org.city,
        state: org.state,
        country: org.country,
        estimated_num_employees: org.estimated_num_employees,
        annual_revenue: org.annual_revenue,
        industry: org.industry,
        keywords: org.keywords,
        technologies: org.technology_names || [],
        short_description: org.short_description,
      };

      await cache(supabase, company_name, null, "apollo", result, property_id);
      await logUsage(supabase, property_id, "apollo", "enrich_company");
    } else if (action === "find_people") {
      const cacheKey = `${company_name}-people`;
      const cached = await getCached(supabase, cacheKey, null, "apollo");
      if (cached) return json({ data: cached, cached: true });

      // Apollo People Search — find top 3 decision-makers
      const searchBody = {
        q_organization_name: company_name,
        person_titles: [
          "Chief Marketing Officer", "VP Marketing", "VP of Marketing",
          "Head of Partnerships", "Director of Partnerships", "VP of Partnerships",
          "Head of Sponsorships", "Director of Sponsorships",
          "Director of Brand", "Brand Director",
          "Head of Business Development", "VP Business Development",
        ],
        page: 1,
        per_page: 10,
      };
      const searchResp = await fetch(`${APOLLO_BASE}/mixed_people/search?api_key=${APOLLO_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchBody),
      });
      const searchData = await searchResp.json();
      const people = (searchData.people || []).slice(0, 3);

      result = people.map((p: any) => ({
        first_name: p.first_name,
        last_name: p.last_name,
        name: p.name,
        title: p.title,
        linkedin_url: p.linkedin_url,
        email: p.email,
        email_status: p.email_status, // 'verified' | 'guessed' | 'unavailable'
        phone: p.phone_numbers?.[0]?.sanitized_number,
        city: p.city,
        state: p.state,
        photo_url: p.photo_url,
        headline: p.headline,
        seniority: p.seniority,
        departments: p.departments,
      }));

      await cache(supabase, cacheKey, null, "apollo", result, property_id);
      await logUsage(supabase, property_id, "apollo", "find_people", people.length);
    } else if (action === "enrich_person") {
      const cached = await getCached(supabase, company_name, person_name, "apollo");
      if (cached) return json({ data: cached, cached: true });

      const [first_name, ...rest] = (person_name || "").split(" ");
      const last_name = rest.join(" ");

      const enrichResp = await fetch(`${APOLLO_BASE}/people/match?api_key=${APOLLO_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name,
          last_name,
          organization_name: company_name,
          reveal_personal_emails: false,
        }),
      });
      const enrichData = await enrichResp.json();
      const p = enrichData.person || {};

      result = {
        first_name: p.first_name,
        last_name: p.last_name,
        title: p.title,
        linkedin_url: p.linkedin_url,
        email: p.email,
        email_status: p.email_status,
        phone: p.phone_numbers?.[0]?.sanitized_number,
        photo_url: p.photo_url,
      };

      await cache(supabase, company_name, person_name, "apollo", result, property_id);
      await logUsage(supabase, property_id, "apollo", "enrich_person");
    } else {
      throw new Error("Unknown action: " + action);
    }

    return json({ data: result, cached: false });
  } catch (err: any) {
    return json({ error: err.message || "Unknown error" }, 200);
  }
});

async function getCached(supabase: any, company: string, person: string | null, source: string) {
  const query = supabase
    .from("contact_research")
    .select("data")
    .eq("source", source)
    .ilike("company_name", company)
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  if (person) query.ilike("person_name", person);
  else query.is("person_name", null);
  const { data } = await query;
  return data?.[0]?.data || null;
}

async function cache(supabase: any, company: string, person: string | null, source: string, data: any, property_id: string) {
  await supabase.from("contact_research").insert({
    company_name: company,
    person_name: person,
    source,
    data,
    property_id,
  });
}

async function logUsage(supabase: any, property_id: string, service: string, endpoint: string, credits: number = 1) {
  if (!property_id) return;
  await supabase.from("api_usage").insert({
    property_id,
    service,
    endpoint,
    credits_used: credits,
  });
}

function json(body: any, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
