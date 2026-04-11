// ============================================================
// EMAIL-MARKETING-PIPELINE-SYNC
// ============================================================
// Scheduled (every 5 min) cron that drains the pipeline_sync_queue
// table. Also clears expired is_recent_add flags based on each
// property's recent_add_display_hours setting.
//
// Reuses the same sync rules the frontend pipelineSyncService uses.
// Authentication: x-cron-secret header.
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

  // Only run if the developer flag is on (public flag also OK)
  const { data: devFlag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "email_marketing_developer")
    .maybeSingle();
  const { data: pubFlag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "email_marketing_public")
    .maybeSingle();
  if (!devFlag?.enabled && !pubFlag?.enabled) {
    return json({ skipped: true, reason: "flags off" });
  }

  // ─── Drain sync queue ──────────────────────────────────────
  const { data: queued } = await sb
    .from("pipeline_sync_queue")
    .select("*")
    .is("processed_at", null)
    .order("enqueued_at", { ascending: true })
    .limit(100);

  let processed = 0, skipped = 0;
  for (const q of queued || []) {
    try {
      const result = await syncContact(sb, q.contact_id);
      await sb.from("pipeline_sync_queue")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", q.id);
      if (result.action === "skipped") skipped++;
      else processed++;
    } catch {
      skipped++;
    }
  }

  // ─── Clear expired recent_add flags ────────────────────────
  const { data: settingsRows } = await sb
    .from("pipeline_sync_settings")
    .select("property_id, recent_add_display_hours");

  let cleared = 0;
  for (const s of settingsRows || []) {
    const hours = s.recent_add_display_hours || 72;
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data, error } = await sb
      .from("email_subscribers")
      .update({
        is_recent_add: false,
        recent_add_cleared_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("is_recent_add", true)
      .eq("property_id", s.property_id)
      .lt("recent_add_flagged_at", cutoff)
      .select("id");
    if (!error) cleared += data?.length || 0;
  }

  return json({ processed, skipped, cleared });
});

async function syncContact(sb: any, contactId: string) {
  const { data: contact } = await sb
    .from("contacts")
    .select("*, deals(id, stage, value, brand_name)")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact?.email) return log(sb, contactId, null, "skipped", "no_email");

  const { data: sup } = await sb
    .from("email_suppression_list")
    .select("email")
    .ilike("email", contact.email)
    .maybeSingle();
  if (sup) return log(sb, contactId, null, "skipped", "suppressed");

  // Check settings filters
  const { data: settings } = await sb
    .from("pipeline_sync_settings")
    .select("*")
    .eq("property_id", contact.property_id)
    .maybeSingle();

  if (settings && !settings.auto_sync_enabled) {
    return log(sb, contactId, null, "skipped", "auto_sync_disabled");
  }
  if (settings && !settings.sync_all_contacts) {
    if (settings.sync_by_deal_stage?.length > 0 && !settings.sync_by_deal_stage.includes(contact.deals?.stage)) {
      return log(sb, contactId, null, "skipped", "deal_stage_excluded");
    }
  }

  const { data: existing } = await sb
    .from("email_subscribers")
    .select("id, status, global_unsubscribe")
    .ilike("email", contact.email)
    .maybeSingle();
  if (existing?.global_unsubscribe) {
    return log(sb, contactId, existing.id, "skipped", "subscriber_unsubscribed");
  }

  const patch = {
    first_name: contact.first_name,
    last_name: contact.last_name,
    organization: contact.company,
    title: contact.position,
    phone: contact.phone,
    linkedin_url: contact.linkedin,
    crm_contact_id: contact.id,
    crm_synced: true,
    crm_synced_at: new Date().toISOString(),
    crm_sync_source: "auto",
    deal_stage: contact.deals?.stage || null,
    deal_value: contact.deals?.value || null,
    property_id: contact.property_id,
    is_recent_add: true,
    recent_add_flagged_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let subscriberId;
  let action;
  if (existing) {
    await sb.from("email_subscribers").update(patch).eq("id", existing.id);
    subscriberId = existing.id;
    action = "updated";
  } else {
    const { data: created } = await sb.from("email_subscribers").insert({
      ...patch,
      email: contact.email.toLowerCase(),
      source: "pipeline_sync",
      status: "active",
    }).select().single();
    subscriberId = created?.id;
    action = "created";
  }

  // Auto-add to target lists
  if (settings?.auto_sync_target_list_ids?.length > 0 && subscriberId) {
    for (const lid of settings.auto_sync_target_list_ids) {
      await sb.from("email_list_subscribers").upsert({
        list_id: lid,
        subscriber_id: subscriberId,
        source: "pipeline_sync",
        status: "active",
      }, { onConflict: "list_id,subscriber_id", ignoreDuplicates: true });
    }
  }

  await sb.from("email_subscriber_events").insert({
    subscriber_id: subscriberId,
    event_type: "pipeline_synced",
    metadata: { contactId },
  });

  return log(sb, contactId, subscriberId, action, null);
}

async function log(sb: any, contactId: string, subscriberId: string | null, action: string, skipReason: string | null) {
  await sb.from("pipeline_sync_log").insert({
    contact_id: contactId,
    subscriber_id: subscriberId,
    action,
    skip_reason: skipReason,
    sync_type: "auto",
  });
  return { action, skipReason };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
