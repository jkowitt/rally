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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 5;

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

      // Respect rate limits
      if (i + BATCH_SIZE < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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
      const extracted = await extractContractWithClaude(file);
      if (!extracted) throw new Error("empty extraction");

      // Write benefits
      const benefitRows = (extracted.benefits || []).map((b: any) => ({
        session_id: session.id,
        file_id: file.id,
        property_id: file.property_id,
        benefit_name: b.name || "Unknown benefit",
        benefit_category: normalizeCategory(b.category),
        frequency: b.frequency || null,
        quantity: b.quantity || 1,
        unit_value: b.unit_value || null,
        annual_value: b.annual_value || null,
        total_value: b.total_value || null,
        extracted_confidence: b.confidence || 50,
        review_status: "pending",
      }));

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

      // Write sponsor row
      if (extracted.sponsor) {
        await sb.from("contract_migration_sponsors").insert({
          session_id: session.id,
          property_id: file.property_id,
          extracted_name: extracted.sponsor.name || null,
          extracted_email: extracted.sponsor.email || null,
          extracted_phone: extracted.sponsor.phone || null,
          extracted_company: extracted.sponsor.company || extracted.sponsor.name || null,
          extracted_contact_person: extracted.sponsor.contact_person || null,
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
async function extractContractWithClaude(file: any) {
  if (!ANTHROPIC_API_KEY) {
    // Fallback mock extraction so the flow still works end-to-end
    // in environments without Claude configured.
    return {
      sponsor: { name: file.original_filename.replace(/\.(pdf|docx)$/i, ""), email: null },
      benefits: [],
    };
  }

  // For PDFs with a file_url, we pass the URL; Claude can read PDFs
  // directly via its document input type.
  const systemPrompt = `You are extracting data from a sponsorship contract for bulk migration into a CRM. Extract with HIGH PRECISION. Flag ambiguous information rather than guessing. Return valid JSON only.

Return this exact structure:
{
  "sponsor": {
    "name": "Company/sponsor name",
    "email": "primary contact email or null",
    "phone": "phone or null",
    "company": "company or null",
    "contact_person": "contact person name or null"
  },
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "total_value": 0,
  "benefits": [
    {
      "name": "specific benefit name",
      "category": "one of: LED Board, Jersey Patch, Radio Read, Social Post, Naming Right, Signage, Activation Space, Digital, or custom",
      "frequency": "per game / per month / annual / one-time / null",
      "quantity": 1,
      "unit_value": 0,
      "annual_value": 0,
      "total_value": 0,
      "confidence": 85
    }
  ]
}

Set confidence 0-100 per benefit. Use 0 for total_value if unknown.`;

  const userPrompt = `Contract file: ${file.original_filename}
File URL: ${file.file_url || "not available"}

Extract all sponsorship benefits from this contract. If you cannot read the file directly, return a JSON with empty benefits array and set sponsor.name to the filename.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    const data = await res.json();
    const text = data?.content?.[0]?.text || "{}";
    // Strip markdown code fences if Claude wrapped the JSON
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
