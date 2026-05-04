// ============================================================
// SIGNAL-RADAR (scheduled, daily)
// ============================================================
// Detects job changes for tracked contacts by re-enriching via
// Apollo. When a contact's current company differs from the one
// stored in our DB, it surfaces as a 'job_change' prospect signal.
//
// Triggered by Supabase scheduled functions with header
// x-cron-secret matching CRON_SECRET. Manual invocation also
// supported with the same secret for ops debugging.
//
// Daily budget per property: re-enrich up to 200 stalest contacts
// (those with last_enriched_at oldest, or null). This keeps Apollo
// usage bounded.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const APOLLO_API_KEY = Deno.env.get("APOLLO_API_KEY") ?? "";
const APOLLO_BASE = "https://api.apollo.io/v1";

const PER_PROPERTY_BUDGET = 200;

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Not Found", { status: 404 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "signal_radar")
    .maybeSingle();
  if (!flag?.enabled) {
    return jsonResponse({ skipped: true, reason: "flag off" });
  }
  if (!APOLLO_API_KEY) {
    return jsonResponse({ skipped: true, reason: "APOLLO_API_KEY not configured" });
  }

  // Pull every property that has at least one contact with an email.
  const { data: props } = await sb
    .from("properties")
    .select("id, name");

  const summary: any[] = [];
  for (const prop of props || []) {
    const r = await scanProperty(sb, prop.id);
    summary.push({ property_id: prop.id, ...r });
  }
  return jsonResponse({ scanned: summary.length, summary });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function scanProperty(sb: any, propertyId: string) {
  // Need an `last_enriched_at` column. We'll try-and-tolerate
  // (some properties may not have run the migration that adds it).
  // Pull stalest first; include either email-bearing OR linkedin-bearing
  // contacts so people/match has something to key on.
  const { data: contacts, error } = await sb
    .from("contacts")
    .select("id, email, linkedin, first_name, last_name, company, position, last_enriched_at")
    .eq("property_id", propertyId)
    .or("email.not.is.null,linkedin.not.is.null")
    .order("last_enriched_at", { ascending: true, nullsFirst: true })
    .limit(PER_PROPERTY_BUDGET);
  if (error) return { error: String(error.message || error) };

  let scanned = 0, jobChanges = 0, errors = 0;
  for (const c of contacts || []) {
    try {
      const fresh = await apolloPersonMatch(c);
      if (!fresh) { scanned++; continue; }
      // Detect change: company differs
      const prevCompany = (c.company || "").trim().toLowerCase();
      const newCompany = (fresh.company || "").trim().toLowerCase();
      if (newCompany && prevCompany && newCompany !== prevCompany) {
        // Build dedup key — same (contact, new company) won't fire twice.
        const payload = {
          previous: { company: c.company, position: c.position, email: c.email },
          current: { company: fresh.company, position: fresh.title, linkedin_url: fresh.linkedin_url, email: fresh.email },
        };
        const { data: dedupKey } = await sb.rpc("build_signal_dedup_key", {
          p_signal_type: "job_change",
          p_contact_id: c.id,
          p_payload: payload,
        });
        // Upsert with onConflict on dedup_key — silently no-op if we've
        // surfaced this exact event already.
        const { error: insErr } = await sb.from("prospect_signals").insert({
          property_id: propertyId,
          contact_id: c.id,
          signal_type: "job_change",
          severity: "high",
          title: `${[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email} moved to ${fresh.company}`,
          description: `Was at ${c.company || "(unknown)"} as ${c.position || "(no title)"}. Now ${fresh.title || "(role TBD)"} at ${fresh.company}.`,
          source: "apollo",
          payload,
          dedup_key: dedupKey,
        });
        // 23505 = unique violation = expected when dedup hits; treat as no-op.
        if (!insErr || (insErr as any).code === "23505") {
          if (!insErr) jobChanges++;
        } else {
          throw insErr;
        }
      }
      // Update last_enriched_at + write through current title/company
      await sb.from("contacts")
        .update({
          last_enriched_at: new Date().toISOString(),
          ...(fresh.company ? { company: fresh.company } : {}),
          ...(fresh.title ? { position: fresh.title } : {}),
          ...(fresh.linkedin_url ? { linkedin: fresh.linkedin_url } : {}),
        })
        .eq("id", c.id);
      scanned++;
    } catch (e) {
      errors++;
      console.warn("signal-radar contact scan failed:", e);
    }
  }

  return { scanned, jobChanges, errors };
}

async function apolloPersonMatch(c: any): Promise<{ company: string; title: string; linkedin_url: string; email: string } | null> {
  // Prefer email match (most reliable). Fall back to linkedin URL +
  // name + company if no email available.
  const payload: any = { reveal_personal_emails: false };
  if (c.email) {
    payload.email = c.email;
  } else if (c.linkedin) {
    payload.linkedin_url = c.linkedin.startsWith("http") ? c.linkedin : `https://${c.linkedin}`;
    if (c.first_name) payload.first_name = c.first_name;
    if (c.last_name) payload.last_name = c.last_name;
    if (c.company) payload.organization_name = c.company;
  } else {
    return null;
  }
  const res = await fetch(`${APOLLO_BASE}/people/match?api_key=${APOLLO_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const p = data.person;
  if (!p) return null;
  return {
    company: p.organization?.name || "",
    title: p.title || "",
    linkedin_url: p.linkedin_url || "",
    email: p.email || c.email || "",
  };
}
