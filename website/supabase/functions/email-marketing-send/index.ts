// ============================================================
// EMAIL-MARKETING-SEND
// ============================================================
// Dual mode:
//   - campaign mode: { campaign_id } — drains pending sends for
//     that campaign in batches, injects tracking pixel + click
//     tracking links + unsubscribe URL + X-LL headers, sends
//     via Resend (or SendGrid fallback), and updates rows.
//   - direct mode: { mode: 'direct', to, subject, html, text,
//     from_email, from_name, conversation_id? } — sends a single
//     email immediately (used by the Conversations reply composer).
//
// All requests flow through requireEmailMarketing so only the
// developer (or admin+ when public flag is on) can invoke.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireEmailMarketing, corsHeaders, jsonResponse } from "../_shared/emailGuard.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") ?? "";
const FROM_EMAIL_DEFAULT = Deno.env.get("FROM_EMAIL") ?? "noreply@loud-legacy.com";
const FROM_NAME_DEFAULT = Deno.env.get("FROM_NAME") ?? "Loud Legacy";
const APP_URL = Deno.env.get("APP_URL") ?? "https://loud-legacy.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireEmailMarketing(req, { allowPublic: true });
  if (!guard.ok) return guard.response;
  const { sb } = guard;

  try {
    const body = await req.json();

    // ─── Direct send (for conversation replies) ────────────────
    if (body.mode === "direct") {
      return await handleDirectSend(sb, body);
    }

    // ─── Campaign batch send ───────────────────────────────────
    if (body.campaign_id) {
      return await handleCampaignBatch(sb, body.campaign_id);
    }

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 200);
  }
});

async function handleDirectSend(sb: any, body: any) {
  const to = body.to;
  if (!to) return jsonResponse({ success: false, error: "missing to" }, 200);

  // Never send to suppressed emails
  const { data: sup } = await sb
    .from("email_suppression_list")
    .select("email")
    .ilike("email", to)
    .maybeSingle();
  if (sup) return jsonResponse({ success: false, error: "suppressed" }, 200);

  const result = await sendOneEmail({
    from: formatFrom(body.from_name || FROM_NAME_DEFAULT, body.from_email || FROM_EMAIL_DEFAULT),
    to,
    subject: body.subject || "",
    html: body.html || "",
    text: body.text || "",
    replyTo: body.reply_to,
    headers: body.conversation_id
      ? { "X-LL-Conversation-ID": body.conversation_id }
      : {},
  });

  return jsonResponse({ success: result.ok, message_id: result.id, error: result.error });
}

async function handleCampaignBatch(sb: any, campaignId: string) {
  const { data: campaign } = await sb
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return jsonResponse({ success: false, error: "campaign not found" }, 200);

  // Pull pending sends (cap per invocation to stay under edge timeout)
  const BATCH = 100;
  const { data: pending } = await sb
    .from("email_campaign_sends")
    .select("*, email_subscribers(*)")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .limit(BATCH);

  if (!pending || pending.length === 0) {
    // No more pending — mark campaign sent
    await sb.from("email_campaigns").update({
      status: "sent",
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);
    return jsonResponse({ success: true, done: true, sent: 0 });
  }

  // Load global suppression list once
  const { data: sup } = await sb.from("email_suppression_list").select("email");
  const suppressed = new Set((sup || []).map((s: any) => s.email.toLowerCase()));

  let sent = 0, failed = 0, skipped = 0;

  for (const row of pending) {
    try {
      const sub = row.email_subscribers;
      if (!sub || sub.status !== "active" || sub.global_unsubscribe || suppressed.has(row.email.toLowerCase())) {
        await sb.from("email_campaign_sends").update({
          status: "failed",
          bounce_type: "suppressed_pre_send",
        }).eq("id", row.id);
        skipped++;
        continue;
      }

      // Personalize + inject tracking
      const unsubUrl = `${APP_URL}/unsubscribe/${sub.unsubscribe_token}`;
      const pixelUrl = `${APP_URL}/functions/v1/email-marketing-track?pixel=${row.tracking_pixel_id}`;

      const personalized = personalize(campaign.html_content || "", sub, { unsubscribe_url: unsubUrl })
        + `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`;
      const plain = personalize(campaign.plain_text_content || "", sub, { unsubscribe_url: unsubUrl });
      const subject = personalize(campaign.subject_line, sub);

      const result = await sendOneEmail({
        from: formatFrom(campaign.from_name || FROM_NAME_DEFAULT, campaign.from_email || FROM_EMAIL_DEFAULT),
        to: row.email,
        subject,
        html: personalized,
        text: plain,
        replyTo: campaign.reply_to_email || campaign.from_email,
        headers: {
          "X-LL-Campaign-ID": campaignId,
          "X-LL-Send-ID": row.id,
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      if (result.ok) {
        await sb.from("email_campaign_sends").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_id: result.id,
        }).eq("id", row.id);
        sent++;
      } else {
        await sb.from("email_campaign_sends").update({
          status: "failed",
          bounce_type: result.error || "send_failed",
        }).eq("id", row.id);
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }

  // Update rollup counters on the campaign
  await sb.rpc("increment_campaign_counters", {
    p_campaign_id: campaignId,
    p_sent: sent,
  }).then(() => {}).catch(async () => {
    // Fallback if RPC doesn't exist — do it with a read+update
    const { data: c } = await sb.from("email_campaigns").select("emails_sent").eq("id", campaignId).single();
    await sb.from("email_campaigns").update({
      emails_sent: (c?.emails_sent || 0) + sent,
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);
  });

  // If there are more pending, return — caller can re-invoke.
  // For simplicity we mark done when the batch is less than full.
  const done = pending.length < BATCH;
  if (done) {
    await sb.from("email_campaigns").update({
      status: "sent",
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);
  }

  return jsonResponse({ success: true, sent, failed, skipped, done });
}

// ─── Provider send (Resend primary, SendGrid fallback) ────────
async function sendOneEmail({ from, to, subject, html, text, replyTo, headers }: any) {
  if (RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text,
          reply_to: replyTo,
          headers,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.message || "resend_error" };
      return { ok: true, id: data.id };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
  if (SENDGRID_API_KEY) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from.split("<")[1]?.replace(">", "").trim() || from, name: from.split("<")[0]?.trim() },
          subject,
          content: [
            { type: "text/plain", value: text || "" },
            { type: "text/html", value: html },
          ],
          reply_to: replyTo ? { email: replyTo } : undefined,
          headers,
        }),
      });
      if (!res.ok) return { ok: false, error: `sendgrid_${res.status}` };
      return { ok: true, id: res.headers.get("x-message-id") || "" };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
  return { ok: false, error: "no_provider_configured" };
}

function formatFrom(name: string, email: string) {
  return `${name} <${email}>`;
}

function personalize(text: string, sub: any, runtime: any = {}) {
  const vars: any = {
    first_name: sub?.first_name || "",
    last_name: sub?.last_name || "",
    email: sub?.email || "",
    organization: sub?.organization || "",
    ...runtime,
  };
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}
