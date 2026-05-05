// ============================================================
// BULK-ENRICHMENT-RUNNER
// ============================================================
// Two invocation paths:
//   • Cron (x-cron-secret): drains pending rows in batches of 25
//     across all properties.
//   • Authenticated POST (user-triggered): runs immediately for
//     a single property's pending queue. Used by the "Enrich now"
//     button in the bulk-import UI.
//
// Per row, three enrichment modes:
//   • 'apollo'   → /people/match  + /organizations/enrich  (uses
//                  the existing apollo-enrichment helper paths;
//                  costs Apollo credits)
//   • 'claude'   → contract-ai/enrich_contact action (uses Claude
//                  general knowledge; free, less accurate)
//   • 'hybrid'   → tries apollo, falls back to claude on failure
//   • 'none'     → never enrich; row stays pending until user picks
//                  a different mode (used to park rows while the
//                  user reviews them)
//
// Rate-limited per property: max 50 rows / 5 min per property to
// keep Apollo + Claude bills bounded under bulk-paste abuse.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const APOLLO_API_KEY = Deno.env.get("APOLLO_API_KEY") ?? "";

const BATCH_SIZE = 25;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const isCron = req.headers.get("x-cron-secret") === CRON_SECRET && !!CRON_SECRET;
  let propertyId: string | null = null;
  let userId: string | null = null;

  if (!isCron) {
    // Auth path — user triggers from the UI
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return jsonResponse({ error: "missing auth" }, 401);
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return jsonResponse({ error: "unauthorized" }, 401);
    userId = u.user.id;
    const body = await req.json().catch(() => ({}));
    propertyId = body.property_id || null;
    if (!propertyId) return jsonResponse({ error: "property_id required" }, 400);

    // Rate limit per property — max 50 rows / 5 min.
    const { data: allowed } = await sb.rpc("check_rate_limit", {
      p_scope: "bulk_enrichment",
      p_identifier: propertyId,
      p_window_seconds: 300,
      p_max_hits: 50,
    });
    if (allowed === false) {
      return jsonResponse({ error: "rate limit exceeded — try again in a few minutes" }, 429);
    }
  }

  let q = sb.from("enrichment_queue")
    .select("*")
    .eq("status", "pending")
    .neq("enrichment_mode", "none")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (propertyId) q = q.eq("property_id", propertyId);
  const { data: rows } = await q;

  const results: any[] = [];
  for (const row of rows || []) {
    try {
      // Move to 'enriching' immediately so concurrent runners skip.
      await sb.from("enrichment_queue").update({
        status: "enriching",
        attempt_count: (row.attempt_count || 0) + 1,
      }).eq("id", row.id).eq("status", "pending"); // optimistic lock

      const enriched = await enrichRow(sb, row);
      await sb.from("enrichment_queue").update({
        status: "enriched",
        enriched_data: enriched,
        enriched_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", row.id);
      results.push({ id: row.id, ok: true });
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 500);
      await sb.from("enrichment_queue").update({
        status: row.attempt_count >= 2 ? "failed" : "pending",
        last_error: msg,
      }).eq("id", row.id);
      results.push({ id: row.id, ok: false, error: msg });
    }
  }

  return jsonResponse({ processed: results.length, results });
});

async function enrichRow(sb: any, row: any): Promise<any> {
  const mode = row.enrichment_mode;
  if (mode === "apollo" || mode === "hybrid") {
    if (!APOLLO_API_KEY) {
      if (mode === "hybrid") return await enrichWithClaude(row);
      throw new Error("Apollo not configured — switch to Claude or hybrid mode.");
    }
    try {
      return await enrichWithApollo(row);
    } catch (e) {
      if (mode === "hybrid") return await enrichWithClaude(row);
      throw e;
    }
  }
  return await enrichWithClaude(row);
}

async function enrichWithApollo(row: any): Promise<any> {
  const out: any = { source: "apollo" };

  // Company enrichment
  if (row.brand_name || row.website) {
    const orgRes = await fetch(
      `https://api.apollo.io/v1/organizations/enrich?api_key=${APOLLO_API_KEY}&domain=${encodeURIComponent(row.website || row.brand_name)}`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    if (orgRes.ok) {
      const data = await orgRes.json();
      const org = data.organization || {};
      out.company = {
        name: org.name,
        website: org.website_url,
        linkedin_url: org.linkedin_url,
        phone: org.phone,
        city: org.city,
        state: org.state,
        country: org.country,
        employees: org.estimated_num_employees,
        annual_revenue: org.annual_revenue,
        industry: org.industry,
        keywords: org.keywords,
        short_description: org.short_description,
      };
    }
  }

  // Contact enrichment if email is provided
  if (row.contact_email) {
    const personRes = await fetch(`https://api.apollo.io/v1/people/match?api_key=${APOLLO_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: row.contact_email, reveal_personal_emails: false }),
    });
    if (personRes.ok) {
      const data = await personRes.json();
      const p = data.person;
      if (p) {
        out.contact = {
          first_name: p.first_name,
          last_name: p.last_name,
          title: p.title,
          linkedin_url: p.linkedin_url,
          email: p.email,
          phone: p.phone_numbers?.[0]?.sanitized_number,
          city: p.city,
          state: p.state,
          seniority: p.seniority,
        };
      }
    }
  }

  return out;
}

async function enrichWithClaude(row: any): Promise<any> {
  // Calls contract-ai's enrich_contact action which uses Claude to
  // generate firmographics + contact context from general knowledge.
  // No external paid API — works without keys other than ANTHROPIC.
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/contract-ai`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "enrich_contact",
      name: row.contact_name || "",
      company: row.brand_name || "",
      position: "",
    }),
  });
  if (!resp.ok) {
    throw new Error(`claude enrichment failed: ${resp.status} ${await resp.text().catch(() => "")}`);
  }
  const data = await resp.json();
  return {
    source: "claude",
    company: { name: row.brand_name },
    enrichment: data?.enrichment || {},
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
