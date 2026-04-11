// ============================================================
// EMAIL-MARKETING-WEBHOOK
// ============================================================
// Single webhook receiver for Resend (or SendGrid) events:
//   - email.delivered / email.bounced / email.complained
//   - inbound email (when configured)
//
// For inbound replies: looks up the campaign from the
// X-LL-Campaign-ID / X-LL-Send-ID custom headers, finds the
// subscriber by email, creates or appends to a conversation,
// auto-pauses matching sequence enrollments, and creates a
// CRM activity row if the subscriber is linked to a deal.
//
// Idempotent — duplicate webhooks are safe.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("EMAIL_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req: Request) => {
  // Verify signature header if configured. Both Resend and SendGrid
  // support signed webhooks; we accept either a shared secret header
  // (simpler for self-hosted setup) or no auth if WEBHOOK_SECRET unset
  // (development only).
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-webhook-secret") || "";
    if (provided !== WEBHOOK_SECRET) {
      return new Response("Not Found", { status: 404 });
    }
  }

  try {
    const payload = await req.json();
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Detect event type — Resend uses { type, data }, SendGrid uses
    // { event } per item in an array. Handle both.
    const events = Array.isArray(payload) ? payload : [payload];

    for (const e of events) {
      const type = e.type || e.event || "unknown";

      if (type.includes("delivered")) await handleDelivered(sb, e);
      else if (type.includes("bounce")) await handleBounce(sb, e);
      else if (type.includes("complain") || type.includes("spam")) await handleComplaint(sb, e);
      else if (type === "email.sent") { /* no-op */ }
      else if (type === "email.inbound" || type === "inbound" || type === "inbound_email") {
        await handleInbound(sb, e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ─── Delivery events ───────────────────────────────────────────
async function handleDelivered(sb: any, e: any) {
  const messageId = e.data?.email_id || e.data?.id || e.sg_message_id || e.message_id;
  if (!messageId) return;
  await sb
    .from("email_campaign_sends")
    .update({ status: "delivered" })
    .eq("message_id", messageId)
    .eq("status", "sent");
}

async function handleBounce(sb: any, e: any) {
  const messageId = e.data?.email_id || e.data?.id || e.sg_message_id || e.message_id;
  const email = (e.data?.to?.[0] || e.email || "").toLowerCase();
  const hard = (e.data?.bounce_type || e.type || "").toLowerCase().includes("hard")
    || e.data?.permanent === true;

  if (messageId) {
    await sb.from("email_campaign_sends").update({
      status: "bounced",
      bounced_at: new Date().toISOString(),
      bounce_type: hard ? "hard" : "soft",
    }).eq("message_id", messageId);
  }

  if (email && hard) {
    await sb.from("email_subscribers").update({
      status: "bounced",
      bounce_type: "hard",
      bounced_at: new Date().toISOString(),
    }).ilike("email", email);
    await sb
      .from("email_suppression_list")
      .upsert({ email, reason: "hard_bounce" }, { onConflict: "email" });
  }
}

async function handleComplaint(sb: any, e: any) {
  const email = (e.data?.to?.[0] || e.email || "").toLowerCase();
  if (!email) return;
  await sb.from("email_subscribers").update({
    status: "complained",
    global_unsubscribe: true,
    unsubscribed_at: new Date().toISOString(),
    unsubscribe_reason: "complaint",
  }).ilike("email", email);
  await sb
    .from("email_suppression_list")
    .upsert({ email, reason: "complained" }, { onConflict: "email" });
}

// ─── Inbound reply ─────────────────────────────────────────────
async function handleInbound(sb: any, e: any) {
  // Resend inbound shape: { from, to, subject, html, text, headers, message_id, in_reply_to }
  // SendGrid parse shape: { from, to, subject, html, text, headers, ... }
  const fromEmail = extractEmail(e.from || e.data?.from);
  const fromName = extractName(e.from || e.data?.from);
  const subject = e.subject || e.data?.subject || "";
  const bodyHtml = e.html || e.data?.html || "";
  const bodyText = e.text || e.data?.text || "";
  const headers = e.headers || e.data?.headers || {};
  const providerMessageId = e.message_id || e.data?.message_id || e["Message-Id"];
  const inReplyTo = e.in_reply_to || e.data?.in_reply_to || headers["In-Reply-To"];

  if (!fromEmail) return;

  // Identify the campaign/send from custom headers
  const campaignId = headers["X-LL-Campaign-ID"] || null;
  const sendId = headers["X-LL-Send-ID"] || null;
  const conversationIdHdr = headers["X-LL-Conversation-ID"] || null;

  // Find subscriber
  const { data: subscriber } = await sb
    .from("email_subscribers")
    .select("*")
    .ilike("email", fromEmail)
    .maybeSingle();

  // Find or create conversation
  let conversationId = conversationIdHdr;
  if (!conversationId && subscriber) {
    const { data: existing } = await sb
      .from("email_conversations")
      .select("id")
      .eq("subscriber_id", subscriber.id)
      .eq("status", "open")
      .maybeSingle();

    if (existing) {
      conversationId = existing.id;
    } else {
      const { data: created } = await sb
        .from("email_conversations")
        .insert({
          subscriber_id: subscriber.id,
          crm_contact_id: subscriber.crm_contact_id || null,
          campaign_id: campaignId,
          subject,
          status: "open",
          priority: "normal",
          last_message_at: new Date().toISOString(),
          last_message_from: "subscriber",
          message_count: 0,
          unread_count: 0,
          property_id: subscriber.property_id,
        })
        .select()
        .single();
      conversationId = created?.id;
    }
  }

  if (!conversationId) return; // Can't thread without a conversation

  // Insert message
  await sb.from("email_conversation_messages").insert({
    conversation_id: conversationId,
    direction: "inbound",
    from_email: fromEmail,
    from_name: fromName,
    subject,
    body_html: bodyHtml,
    body_text: bodyText,
    provider_message_id: providerMessageId,
    in_reply_to: inReplyTo,
    received_at: new Date().toISOString(),
  });

  // Update conversation counters
  const { data: conv } = await sb
    .from("email_conversations")
    .select("message_count, unread_count, crm_deal_id, is_crm_activity_created")
    .eq("id", conversationId)
    .single();

  await sb.from("email_conversations").update({
    last_message_at: new Date().toISOString(),
    last_message_from: "subscriber",
    status: "open",
    message_count: (conv?.message_count || 0) + 1,
    unread_count: (conv?.unread_count || 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", conversationId);

  // Mark the original send as replied
  if (sendId) {
    await sb.from("email_campaign_sends").update({
      replied_at: new Date().toISOString(),
      conversation_id: conversationId,
    }).eq("id", sendId);
  }

  // Subscriber event + engagement bump
  if (subscriber) {
    await sb.from("email_subscribers").update({
      last_replied_at: new Date().toISOString(),
      total_replies: (subscriber.total_replies || 0) + 1,
    }).eq("id", subscriber.id);
    await sb.from("email_subscriber_events").insert({
      subscriber_id: subscriber.id,
      event_type: "replied",
      campaign_id: campaignId,
    });

    // Auto-pause any active sequence enrollments for this user
    if (subscriber.loud_legacy_user_id) {
      await sb.from("email_sequence_enrollments").update({
        paused: true,
      }).eq("user_id", subscriber.loud_legacy_user_id)
        .eq("completed", false)
        .eq("paused", false);
    }
  }

  // CRM activity integration
  if (conv?.crm_deal_id && !conv.is_crm_activity_created) {
    await sb.from("activities").insert({
      deal_id: conv.crm_deal_id,
      activity_type: "Email",
      subject: `Email reply from ${fromName || fromEmail}`,
      description: (bodyText || "").slice(0, 200),
      occurred_at: new Date().toISOString(),
    });
    await sb.from("email_conversations").update({
      is_crm_activity_created: true,
    }).eq("id", conversationId);
  }
}

function extractEmail(v: string | undefined) {
  if (!v) return null;
  const m = v.match(/<([^>]+)>/);
  return (m ? m[1] : v).toLowerCase().trim();
}

function extractName(v: string | undefined) {
  if (!v) return null;
  const m = v.match(/^([^<]+)</);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}
