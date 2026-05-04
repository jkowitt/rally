// ============================================================
// SEC-EDGAR-RADAR (scheduled, daily)
// ============================================================
// Real, free data source: SEC EDGAR full-text search. For each
// tracked brand that maps to a public ticker, scans the last 30
// days of 8-K and 10-Q filings for sponsorship/marketing/CMO
// mentions. High-confidence hits become 'earnings_mention' signals.
//
// Free, no API key — just a custom User-Agent (SEC requires it).
// Triggered by Supabase scheduled functions with x-cron-secret.
//
// EDGAR full-text search: efts.sec.gov/LATEST/search-index
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

// SEC requires identifying User-Agent on every request.
const SEC_UA = Deno.env.get("SEC_USER_AGENT") || "Rally Prospecting (contact@example.com)";
const SEC_SEARCH = "https://efts.sec.gov/LATEST/search-index";

// Search terms tuned for sponsorship-relevant filings.
const SEARCH_TERMS = [
  '"sponsorship"', '"naming rights"', '"partnership agreement"',
  '"marketing partnership"', '"brand partnership"',
];

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Not Found", { status: 404 });
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "sec_edgar_radar")
    .maybeSingle();
  if (!flag?.enabled) {
    return jsonResponse({ skipped: true, reason: "flag off" });
  }

  // Pull every property's open-deal brand list. We map brand_name
  // to ticker via SEC's company-tickers JSON (cached in function).
  const tickerMap = await loadTickerMap();
  if (!tickerMap.size) {
    return jsonResponse({ skipped: true, reason: "ticker map empty" });
  }

  const { data: deals } = await sb
    .from("deals")
    .select("id, property_id, brand_name")
    .not("stage", "in", "(Renewed,Declined)")
    .limit(500);

  const summary: any[] = [];
  for (const d of deals || []) {
    const cik = matchTicker(tickerMap, d.brand_name);
    if (!cik) continue;
    try {
      const hits = await searchEdgar(cik);
      for (const hit of hits) {
        const payload = {
          brand: d.brand_name, cik, accession: hit.accession,
          form: hit.form, filed_at: hit.filed_at,
          excerpt: hit.excerpt,
        };
        const { data: dedupKey } = await sb.rpc("build_signal_dedup_key", {
          p_signal_type: "earnings_mention",
          p_contact_id: null,
          p_payload: payload,
        });
        const { error } = await sb.from("prospect_signals").insert({
          property_id: d.property_id,
          deal_id: d.id,
          signal_type: "earnings_mention",
          severity: "medium",
          title: `${d.brand_name} mentioned partnerships in ${hit.form}`,
          description: hit.excerpt || `Filed ${hit.form} on ${hit.filed_at}.`,
          source: "sec_edgar",
          source_url: hit.url,
          payload,
          dedup_key: dedupKey,
        });
        if (!error || (error as any).code === "23505") {
          if (!error) summary.push({ deal_id: d.id, accession: hit.accession });
        }
      }
    } catch (e) {
      console.warn("edgar scan failed for", d.brand_name, e);
    }
  }
  return jsonResponse({ scanned: deals?.length || 0, signals: summary.length });
});

let _tickerCache: Map<string, string> | null = null;
let _tickerCacheAt = 0;
async function loadTickerMap(): Promise<Map<string, string>> {
  // Refresh once a day.
  if (_tickerCache && Date.now() - _tickerCacheAt < 24 * 60 * 60_000) {
    return _tickerCache;
  }
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: { "User-Agent": SEC_UA, Accept: "application/json" },
  });
  if (!res.ok) return _tickerCache || new Map();
  const data = await res.json();
  const map = new Map<string, string>();
  for (const k of Object.keys(data)) {
    const row = data[k];
    if (!row?.title || !row?.cik_str) continue;
    map.set(normalizeBrand(row.title), String(row.cik_str).padStart(10, "0"));
  }
  _tickerCache = map;
  _tickerCacheAt = Date.now();
  return map;
}

function matchTicker(map: Map<string, string>, brandName: string | null | undefined): string | null {
  if (!brandName) return null;
  const norm = normalizeBrand(brandName);
  if (map.has(norm)) return map.get(norm)!;
  // Loose match: try substring
  for (const [k, v] of map) {
    if (k.includes(norm) || norm.includes(k)) return v;
  }
  return null;
}

function normalizeBrand(s: string): string {
  return s.toLowerCase()
    .replace(/[,.&]/g, "")
    .replace(/\s+(inc|llc|corp|corporation|company|co|holdings|group|ltd)\.?$/i, "")
    .trim();
}

interface EdgarHit {
  form: string;
  filed_at: string;
  accession: string;
  url: string;
  excerpt: string;
}

async function searchEdgar(cik: string): Promise<EdgarHit[]> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const out: EdgarHit[] = [];
  for (const term of SEARCH_TERMS) {
    const url = `${SEC_SEARCH}?q=${encodeURIComponent(term)}&dateRange=custom&startdt=${since}&forms=8-K,10-Q,10-K&ciks=${cik}`;
    const res = await fetch(url, { headers: { "User-Agent": SEC_UA, Accept: "application/json" } });
    if (!res.ok) continue;
    const data = await res.json();
    const hits = data?.hits?.hits || [];
    for (const h of hits.slice(0, 3)) {
      const src = h._source || {};
      const accession = (src.adsh || h._id || "").replace(/-/g, "");
      const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${encodeURIComponent(src.form || "")}&dateb=&owner=include&count=10`;
      out.push({
        form: src.form || "?",
        filed_at: src.file_date || "",
        accession,
        url,
        excerpt: (src.display_names?.[0] || "") + " — " + (src.snippet || term),
      });
    }
  }
  return out;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}
