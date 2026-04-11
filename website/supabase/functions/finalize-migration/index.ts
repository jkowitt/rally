// ============================================================
// FINALIZE-MIGRATION
// ============================================================
// Called when the user clicks "Complete Migration" in the review UI.
// Takes every approved migration_benefit and sponsor row and creates
// the final records in the main CRM tables:
//
//   contract_migration_sponsors → contacts (with duplicate merge)
//   contract_migration_files    → deals + contracts
//   contract_migration_benefits → contract_benefits + assets +
//                                 fulfillment_records
//
// All creations happen inside a per-file transaction-ish loop so a
// single bad contract doesn't block the rest. Counts are tracked on
// the session row and returned to the caller.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ success: false, error: "unauthorized" }, 200);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await sb.auth.getUser(jwt);
    if (!userRes?.user) return json({ success: false, error: "unauthorized" }, 200);

    const body = await req.json();
    const sessionId = body.session_id;
    if (!sessionId) return json({ success: false, error: "missing session_id" }, 200);

    const { data: session } = await sb
      .from("contract_migration_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userRes.user.id) {
      return json({ success: false, error: "not found" }, 404);
    }

    const propertyId = session.property_id;

    // ─── 1. Create contacts from sponsors (merging duplicates) ──
    const { data: sponsors } = await sb
      .from("contract_migration_sponsors")
      .select("*")
      .eq("session_id", sessionId)
      .neq("review_status", "rejected");

    let sponsorsCreated = 0, sponsorsMerged = 0;
    const sponsorToContactId: Record<string, string> = {};

    for (const s of sponsors || []) {
      let contactId: string;

      if (s.duplicate_of_contact_id && s.merge_status === "merged") {
        // Reuse existing contact
        contactId = s.duplicate_of_contact_id;
        sponsorsMerged++;
      } else {
        // Create new contact row
        const [firstName, ...rest] = (s.extracted_contact_person || s.extracted_name || "").split(" ");
        const { data: created } = await sb
          .from("contacts")
          .insert({
            property_id: propertyId,
            first_name: firstName || null,
            last_name: rest.join(" ") || null,
            email: s.extracted_email || null,
            phone: s.extracted_phone || null,
            company: s.extracted_company || s.extracted_name || null,
            is_primary: true,
          })
          .select()
          .single();
        contactId = created?.id;
        if (contactId) sponsorsCreated++;
      }

      if (contactId) {
        await sb
          .from("contract_migration_sponsors")
          .update({ final_contact_id: contactId })
          .eq("id", s.id);

        // Map every file this sponsor was on → this contact
        for (const fileId of s.contract_file_ids || []) {
          sponsorToContactId[fileId] = contactId;
        }
      }
    }

    // ─── 2. Create deals + contracts per file ───────────────────
    const { data: files } = await sb
      .from("contract_migration_files")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "complete");

    let dealsCreated = 0, contractsCreated = 0, fulfillmentCreated = 0;
    let assetsPrevented = 0, assetsCreated = 0;

    for (const f of files || []) {
      const extracted = f.extracted_data || {};
      const sponsor = extracted.sponsor || {};
      const brandName = sponsor.company || sponsor.name || f.original_filename.replace(/\.(pdf|docx)$/i, "");

      // Find matching sponsor row to link contact
      const sponsorRow = (sponsors || []).find((s: any) =>
        (s.contract_file_ids || []).includes(f.id)
      );
      const contactId = sponsorRow?.final_contact_id || null;

      // Create deal
      const { data: deal } = await sb
        .from("deals")
        .insert({
          property_id: propertyId,
          brand_name: brandName,
          contact_name: sponsor.contact_person || sponsor.name || null,
          contact_email: sponsor.email || null,
          value: extracted.total_value || null,
          start_date: extracted.start_date || null,
          end_date: extracted.end_date || null,
          stage: "In Fulfillment", // migrated contracts are already active
        })
        .select()
        .single();

      if (!deal) continue;
      dealsCreated++;

      // Create contract row
      const { data: contract } = await sb
        .from("contracts")
        .insert({
          deal_id: deal.id,
          property_id: propertyId,
          brand_name: brandName,
          effective_date: extracted.start_date || null,
          expiration_date: extracted.end_date || null,
          total_value: extracted.total_value || null,
          signed: true,
        })
        .select()
        .single();
      if (contract) contractsCreated++;

      // ─── 3. Benefits for this file → assets + fulfillment ────
      const { data: benefits } = await sb
        .from("contract_migration_benefits")
        .select("*")
        .eq("file_id", f.id)
        .eq("review_status", "approved");

      for (const b of benefits || []) {
        let assetId = b.asset_match_id;

        // If no match, create a new asset
        if (!assetId) {
          const { data: newAsset } = await sb
            .from("assets")
            .insert({
              property_id: propertyId,
              name: b.final_benefit_name || b.benefit_name,
              category: b.final_category || b.benefit_category || "Signage",
              description: `Auto-created during contract migration from ${f.original_filename}`,
              base_price: b.unit_value || b.annual_value || null,
              quantity: b.quantity || 1,
              from_contract: true,
              source_contract_id: contract?.id || null,
            })
            .select()
            .single();
          if (newAsset) {
            assetId = newAsset.id;
            assetsCreated++;
          }
        } else {
          assetsPrevented++;
        }

        // Create fulfillment record
        if (assetId && contract?.id) {
          await sb.from("fulfillment_records").insert({
            deal_id: deal.id,
            contract_id: contract.id,
            asset_id: assetId,
            scheduled_date: extracted.start_date || null,
            delivered: false,
            auto_generated: true,
          });
          fulfillmentCreated++;
        }

        // Bump contact.last_contacted_at for the linked contact
        if (contactId) {
          await sb
            .from("contacts")
            .update({ last_contacted_at: new Date().toISOString() })
            .eq("id", contactId);
        }
      }
    }

    // ─── 4. Update session with final counts ────────────────────
    const { data: approvedBenefits } = await sb
      .from("contract_migration_benefits")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("review_status", "approved");

    await sb
      .from("contract_migration_sessions")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        sponsors_created: sponsorsCreated,
        duplicate_sponsors_merged: sponsorsMerged,
        deals_created: dealsCreated,
        fulfillment_records_created: fulfillmentCreated,
        benefits_approved: approvedBenefits?.length || 0,
        duplicate_assets_prevented: assetsPrevented,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return json({
      success: true,
      summary: {
        sponsorsCreated,
        sponsorsMerged,
        dealsCreated,
        contractsCreated,
        fulfillmentCreated,
        assetsCreated,
        assetsPrevented,
      },
    });
  } catch (err) {
    return json({ success: false, error: String(err) }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
