// ============================================================
// FUNDING-RADAR (scheduled, weekly)
// ============================================================
// For each property with the funding_radar flag enabled, sweeps
// the list of tracked brand names (open deals) through Claude's
// general knowledge looking for funding rounds, M&A, IPOs,
// pivots. High-confidence hits land in prospect_signals.
//
// Triggered by Supabase scheduled functions with x-cron-secret.
// Best-effort and budget-bounded: 50 brands per property per run.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Not Found", { status: 404 });
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "funding_radar")
    .maybeSingle();
  if (!flag?.enabled) {
    return jsonResponse({ skipped: true, reason: "flag off" });
  }

  const { data: props } = await sb.from("properties").select("id");
  const summary: any[] = [];
  for (const prop of props || []) {
    const r = await scan(sb, prop.id);
    summary.push({ property_id: prop.id, ...r });
  }
  return jsonResponse({ scanned: summary.length, summary });
});

async function scan(sb: any, propertyId: string) {
  // Pull up to 50 open-deal brand names for this property.
  const { data: deals } = await sb
    .from("deals")
    .select("id, brand_name")
    .eq("property_id", propertyId)
    .not("stage", "in", "(Renewed,Declined)")
    .order("created_at", { ascending: false })
    .limit(50);

  const brands = (deals || []).map((d: any) => d.brand_name).filter(Boolean);
  if (brands.length === 0) return { brands_checked: 0, signals: 0 };

  // Call contract-ai/funding_radar via Supabase function-to-function invoke.
  // We use the service role JWT because contract-ai is gated behind
  // requireUser → in this environment, service role is treated as a
  // valid backend caller because the function-internal invoke goes
  // through the platform.
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/contract-ai`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "funding_radar", brands }),
  });
  if (!resp.ok) return { brands_checked: brands.length, signals: 0, error: `contract-ai ${resp.status}` };
  const data = await resp.json();
  const signals = data?.result?.signals || data?.signals || [];

  let inserted = 0;
  for (const s of signals) {
    if (!s.brand || (s.confidence ?? 0) < 0.5) continue;
    // Find the deal id this signal maps to (case-insensitive brand match)
    const deal = (deals || []).find((d: any) =>
      d.brand_name && d.brand_name.toLowerCase() === s.brand.toLowerCase()
    );
    if (!deal) continue;

    const signalType = mapEventType(s.event_type);
    const payload = {
      brand: s.brand,
      event_type: s.event_type,
      approx_when: s.approx_when,
      confidence: s.confidence,
    };
    const { data: dedupKey } = await sb.rpc("build_signal_dedup_key", {
      p_signal_type: signalType,
      p_contact_id: null,
      p_payload: payload,
    });
    const { error: insErr } = await sb.from("prospect_signals").insert({
      property_id: propertyId,
      deal_id: deal.id,
      signal_type: signalType,
      severity: s.severity || "medium",
      title: s.title || `${s.event_type} at ${s.brand}`,
      description: s.description || null,
      source: "claude",
      payload,
      dedup_key: dedupKey,
    });
    if (!insErr) inserted++;
    else if ((insErr as any).code !== "23505") throw insErr;
  }
  return { brands_checked: brands.length, signals: inserted };
}

function mapEventType(t: string): string {
  switch ((t || "").toLowerCase()) {
    case "funding":     return "funding_round";
    case "acquisition": return "ma_event";
    case "merger":      return "ma_event";
    case "ipo":         return "ma_event";
    case "hire":        return "hiring_post";
    case "pivot":       return "earnings_mention";
    default:            return "earnings_mention";
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
