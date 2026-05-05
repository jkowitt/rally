// ============================================================
// PROCESS-CONTRACT-BATCH
// ============================================================
// Kicked off by the /contracts/migrate UI when the user clicks
// "Extract All Contracts". Processes every queued file in a session:
//   1. Downloads the file from storage
//   2. Extracts text (PDF for now — docx support deferred)
//   3. Calls Claude (via contract-ai edge function) with a
//      migration-specific prompt asking for high-precision extraction
//   4. Writes contract_migration_benefits rows per extracted benefit
//   5. Auto-matches benefits against existing assets
//   6. Extracts sponsor info and writes contract_migration_sponsors row
//   7. Updates session progress counters
//
// Processes up to 5 files in parallel. Handles individual failures
// without killing the batch. Retries failed extractions up to 3 times
// with exponential backoff.
//
// Authentication: JWT required; only the session owner can invoke.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, logRateLimitCall } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Concurrency = 1 by default. Anthropic's tier-1 limit on Opus is
// 30,000 input tokens/min, and a single contract PDF easily lands at
// 5-15K input tokens via the document content block — running 5 in
// parallel blew past the cap and 429'd. Override to a higher number
// when the project is on a higher Anthropic tier.
const BATCH_SIZE = parseInt(Deno.env.get("PROCESS_CONTRACT_BATCH_CONCURRENCY") || "1", 10);
// Inter-call delay (ms) between contracts inside a batch loop, to
// stay under tokens-per-minute caps even when BATCH_SIZE = 1.
const PER_CONTRACT_DELAY_MS = parseInt(Deno.env.get("PROCESS_CONTRACT_BATCH_DELAY_MS") || "2000", 10);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ success: false, error: "unauthorized" }, 200);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await sb.auth.getUser(jwt);
    if (!userRes?.user) return json({ success: false, error: "unauthorized" }, 200);

    // Rate limit: 10 batches/hour per user. Each batch may process
    // dozens of contracts so this is a hard cap on cost.
    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", userRes.user.id)
      .maybeSingle();
    const gate = await enforceRateLimit(sb, {
      userId: userRes.user.id,
      functionName: "process-contract-batch",
      limit: 10,
      windowMinutes: 60,
      developerBypass: true,
      developerRole: profile?.role,
    });
    if (!gate.ok) return gate.response!;

    const body = await req.json();
    const sessionId = body.session_id;
    if (!sessionId) return json({ success: false, error: "missing session_id" }, 200);

    // Verify the caller owns this session
    const { data: session } = await sb
      .from("contract_migration_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userRes.user.id) {
      return json({ success: false, error: "not found" }, 404);
    }

    // Fetch queued files
    const { data: files } = await sb
      .from("contract_migration_files")
      .select("*")
      .eq("session_id", sessionId)
      .in("status", ["queued", "failed"]);

    if (!files || files.length === 0) {
      await sb
        .from("contract_migration_sessions")
        .update({
          status: "review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
      return json({ success: true, processed: 0, message: "nothing to process" });
    }

    // Process in batches of BATCH_SIZE
    let processed = 0, succeeded = 0, failed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(f => processOneFile(sb, f, session))
      );
      for (const r of results) {
        processed++;
        if (r.status === "fulfilled" && r.value?.success) succeeded++;
        else failed++;
      }

      // Update progress after each batch
      await sb
        .from("contract_migration_sessions")
        .update({
          contracts_processed: processed,
          contracts_complete: succeeded,
          contracts_failed: failed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      // Respect rate limits — pause between batches so the tokens-per-
      // minute window has time to refill. Default 2s; override via env.
      if (i + BATCH_SIZE < files.length) {
        await new Promise(resolve => setTimeout(resolve, PER_CONTRACT_DELAY_MS));
      }
    }

    // Recalculate aggregate benefit counts
    const { data: benefits } = await sb
      .from("contract_migration_benefits")
      .select("asset_match_status, review_status")
      .eq("session_id", sessionId);

    const total = benefits?.length || 0;
    const autoMatched = benefits?.filter((b: any) => b.asset_match_status === "auto_matched").length || 0;
    const needsReview = total - autoMatched;

    // Mark session as ready for review
    await sb
      .from("contract_migration_sessions")
      .update({
        status: "review",
        total_benefits_extracted: total,
        benefits_auto_matched: autoMatched,
        benefits_needs_review: needsReview,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Log for rate limiting — 1 batch call regardless of how many
    // contracts were in it. creditsCharged scales with file count.
    await logRateLimitCall(sb, {
      userId: userRes.user.id,
      functionName: "process-contract-batch",
      creditsCharged: 5 * processed,
      metadata: { session_id: sessionId, processed, succeeded, failed },
    });

    return json({ success: true, processed, succeeded, failed });
  } catch (err) {
    return json({ success: false, error: String(err) }, 200);
  }
});

// ─── Per-file processing ─────────────────────────────────────
async function processOneFile(sb: any, file: any, session: any) {
  // Mark as processing
  await sb
    .from("contract_migration_files")
    .update({
      status: "processing",
      processing_started_at: new Date().toISOString(),
    })
    .eq("id", file.id);

  // Retry loop with exponential backoff
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const extracted = await extractContractWithClaude(sb, file);
      if (!extracted) throw new Error("empty extraction");

      // Write benefits. The new prompt returns `description` + `value`
      // rather than `name` + `unit_value`/`annual_value`/`total_value`,
      // so we derive the per-row dollar fields from the single value.
      const benefitRows = (extracted.benefits || []).map((b: any) => {
        const v = typeof b.value === "number" ? b.value : Number(String(b.value || "").replace(/[$,]/g, "")) || null;
        const qty = b.quantity || 1;
        return {
          session_id: session.id,
          file_id: file.id,
          property_id: file.property_id,
          benefit_name: b.description || b.name || "Unknown benefit",
          benefit_category: normalizeCategory(b.category),
          frequency: b.frequency || null,
          quantity: qty,
          unit_value: v,
          annual_value: v && qty ? v * qty : v,
          total_value: v && qty ? v * qty : v,
          extracted_confidence: b.confidence || 75,
          review_status: "pending",
        };
      });

      if (benefitRows.length > 0) {
        const { data: insertedBenefits } = await sb
          .from("contract_migration_benefits")
          .insert(benefitRows)
          .select();

        // Auto-match each benefit to existing assets
        if (insertedBenefits) {
          for (const b of insertedBenefits) {
            const match = await findAssetMatch(sb, b, file.property_id);
            if (match.asset) {
              await sb
                .from("contract_migration_benefits")
                .update({
                  asset_match_id: match.asset.id,
                  asset_match_confidence: Math.round(match.confidence * 100),
                  asset_match_status: match.confidence >= 0.8 ? "auto_matched" : null,
                })
                .eq("id", b.id);
            }
          }
        }
      }

      // Write sponsor row. New schema is flat (brand_name + contact_*)
      // rather than nested under .sponsor — fall back to old shape so
      // env overrides that still return the legacy structure also work.
      const brand = extracted.brand_name || extracted.sponsor?.name || null;
      if (brand) {
        await sb.from("contract_migration_sponsors").insert({
          session_id: session.id,
          property_id: file.property_id,
          extracted_name: brand,
          extracted_email: extracted.contact_email || extracted.sponsor?.email || null,
          extracted_phone: extracted.contact_phone || extracted.sponsor?.phone || null,
          extracted_company: extracted.contact_company || extracted.sponsor?.company || brand,
          extracted_contact_person: extracted.contact_name || extracted.sponsor?.contact_person || null,
          contract_file_ids: [file.id],
          merge_status: "new",
          review_status: "pending",
        });
      }

      // Mark complete
      await sb
        .from("contract_migration_files")
        .update({
          status: "complete",
          extracted_data: extracted,
          processing_completed_at: new Date().toISOString(),
        })
        .eq("id", file.id);

      return { success: true };
    } catch (err) {
      lastError = String(err);
      await sb
        .from("contract_migration_files")
        .update({
          status: "retrying",
          retry_count: attempt + 1,
          error_message: lastError,
        })
        .eq("id", file.id);
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  // All retries failed
  await sb
    .from("contract_migration_files")
    .update({
      status: "failed",
      error_message: lastError,
      processing_completed_at: new Date().toISOString(),
    })
    .eq("id", file.id);
  return { success: false, error: lastError };
}

// ─── Claude extraction ───────────────────────────────────────
// Defaults to Sonnet 4.6 — comparable quality on structured contract
// extraction, ~5× higher tokens-per-minute on the default Anthropic
// tier, and ~5× cheaper per token. Override to Opus
// (claude-opus-4-7) when on a higher Anthropic tier and willing to
// trade $$$ for marginal accuracy.
const EXTRACT_MODEL = Deno.env.get("PROCESS_CONTRACT_BATCH_MODEL") ?? "claude-sonnet-4-6";
const STORAGE_BUCKET = "contract-migrations";

async function extractContractWithClaude(sb: any, file: any) {
  if (!ANTHROPIC_API_KEY) {
    return {
      brand_name: file.original_filename.replace(/\.(pdf|docx)$/i, ""),
      contact_name: null, contact_email: null, contact_phone: null,
      effective_date: null, expiration_date: null,
      total_value: 0, annual_values: {},
      benefits: [],
      summary: "ANTHROPIC_API_KEY not configured — extraction skipped.",
      warnings: ["claude_disabled"],
    };
  }

  // Download the file from storage so we can pass the actual bytes
  // to Claude as a document content block. The previous version sent
  // the file URL as a string — Claude can't fetch URLs, so it was
  // essentially extracting from the filename only, which is why mass
  // uploads "didn't analyze well" while individual uploads did.
  const { data: blob, error: dlErr } = await sb.storage
    .from(STORAGE_BUCKET)
    .download(file.storage_path);
  if (dlErr || !blob) {
    throw new Error(`storage_download_failed bucket=${STORAGE_BUCKET} path=${file.storage_path}: ${dlErr?.message || "no blob"}`);
  }

  const sizeMB = blob.size / (1024 * 1024);
  if (sizeMB > 32) {
    throw new Error(`pdf_too_large: ${sizeMB.toFixed(1)} MB (Anthropic PDF document API limit is 32 MB). Split the PDF or use individual upload.`);
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Build base64 in chunks to avoid call stack overflow on large PDFs.
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);

  // Same rigorous extraction schema used by contract-ai parse_pdf_text
  // so individual + bulk uploads produce identical structure + quality.
  const prompt = `You are a contract-parsing expert. Read the contract and extract structured data.

Return ONLY a JSON object with exactly these fields:

{
  "brand_name": "string — the sponsor / counterparty / customer (NOT our property). Look in title, recitals, signature block. Legal name preferred.",
  "contact_name": "string|null — primary point of contact at the sponsor",
  "contact_email": "string|null",
  "contact_phone": "string|null",
  "contact_position": "string|null",
  "contact_company": "string|null — defaults to brand_name",
  "contract_number": "string|null",
  "effective_date": "YYYY-MM-DD or null — when the contract starts",
  "expiration_date": "YYYY-MM-DD or null — when the contract ends. CALCULATE from term length if not stated explicitly.",
  "total_value": "number — total dollar value over the entire term. Sum line items if needed. NEVER null — use 0 if truly unknown.",
  "annual_values": "object — { 'YYYY': number } per year of the term. Resolution rules: explicit per-year values > escalator clause > divide total evenly.",
  "benefits": "array — every deliverable. Each item: {description, category, frequency, quantity, value, confidence}. category: 'Signage'|'Digital'|'Hospitality'|'Media'|'Naming'|'Activations'|'Promotional'|'LED Board'|'Jersey Patch'|'Radio Read'|'Social Post'|'Naming Right'|'Activation Space'|'Other'. frequency: 'Per Season'|'Per Game'|'Per Match'|'Monthly'|'Quarterly'|'Weekly'|'One-Time'. confidence: 0-100.",
  "summary": "string — 2-3 sentence executive summary",
  "warnings": "array of strings — flag inferred vs explicit values (e.g. 'expiration_date calculated from 3-year term')"
}

CRITICAL RULES:
- Money values are PLAIN NUMBERS (50000, not "$50,000.00").
- Date format MUST be YYYY-MM-DD.
- annual_values keys MUST be 4-digit strings.
- If genuinely missing, return null (or 0 for total_value, [] for arrays). Do NOT invent.
- Do not include any prose before or after the JSON.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: EXTRACT_MODEL,
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      // Honor Anthropic's rate-limit hint when present so the
      // per-file retry loop sleeps long enough for the token bucket
      // to refill instead of immediately retrying and 429ing again.
      if (res.status === 429) {
        const retryAfterSec = parseInt(res.headers.get("retry-after") || "30", 10);
        const sleepMs = Math.min(retryAfterSec * 1000, 60_000);
        await new Promise(r => setTimeout(r, sleepMs));
      }
      throw new Error(`claude_http_${res.status}: ${errText.slice(0, 500)}`);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text || "{}";
    const cleaned = text.replace(/```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`claude_extraction_failed: ${err}`);
  }
}

// Constrain to the CHECK constraint values in the assets table
const VALID_CATEGORIES = [
  "LED Board", "Jersey Patch", "Radio Read", "Social Post",
  "Naming Right", "Signage", "Activation Space", "Digital",
];

function normalizeCategory(cat: string | null | undefined) {
  if (!cat) return "Signage";
  // Exact match first
  if (VALID_CATEGORIES.includes(cat)) return cat;
  // Fuzzy — find closest
  const lower = cat.toLowerCase();
  for (const valid of VALID_CATEGORIES) {
    if (lower.includes(valid.toLowerCase()) || valid.toLowerCase().includes(lower)) {
      return valid;
    }
  }
  return "Signage"; // catch-all
}

// ─── Asset matching ──────────────────────────────────────────
async function findAssetMatch(sb: any, benefit: any, propertyId: string) {
  const { data: assets } = await sb
    .from("assets")
    .select("id, name, category")
    .eq("property_id", propertyId);
  if (!assets || assets.length === 0) return { asset: null, confidence: 0 };

  let best: any = { asset: null, confidence: 0 };
  for (const a of assets) {
    const nameSim = nameSimilarity(benefit.benefit_name, a.name);
    const catBonus = benefit.benefit_category === a.category ? 0.15 : 0;
    const conf = Math.min(1, nameSim + catBonus);
    if (conf > best.confidence) best = { asset: a, confidence: conf };
  }
  return best;
}

function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(na);
  const bb = bigrams(nb);
  const inter = [...ba].filter(x => bb.has(x));
  const union = new Set([...ba, ...bb]);
  return union.size === 0 ? 0 : inter.length / union.size;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
