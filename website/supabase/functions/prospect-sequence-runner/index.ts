// ============================================================
// PROSPECT-SEQUENCE-RUNNER (scheduled, every 15 minutes)
// ============================================================
// Picks up prospect_sequence_enrollments where next_send_at is
// due and sends the next step via the enroller's connected
// mailbox. Auto-pause on bounce; auto-complete after final step.
//
// Triggered by Supabase scheduled functions with header
// x-cron-secret matching the CRON_SECRET env.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/cryptoTokens.ts";
import { logOutreach, generateTrackingToken, injectTrackingPixel, rewriteLinksForTracking } from "../_shared/outreachLog.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const OUTLOOK_CLIENT_ID = Deno.env.get("OUTLOOK_CLIENT_ID") ?? "";
const OUTLOOK_CLIENT_SECRET = Deno.env.get("OUTLOOK_CLIENT_SECRET") ?? "";
const OUTLOOK_TENANT_ID = Deno.env.get("OUTLOOK_TENANT_ID") ?? "common";
const OUTLOOK_SCOPES = Deno.env.get("OUTLOOK_SCOPES") ??
  "offline_access Mail.Read Mail.ReadWrite Mail.Send Contacts.Read Contacts.ReadWrite Calendars.Read User.Read";

const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";

const MAX_PER_RUN = 50;

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Not Found", { status: 404 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "prospect_sequences")
    .maybeSingle();
  if (!flag?.enabled) {
    return jsonResponse({ skipped: true, reason: "flag off" });
  }

  const nowIso = new Date().toISOString();
  const { data: due } = await sb
    .from("prospect_sequence_enrollments")
    .select("*")
    .lte("next_send_at", nowIso)
    .eq("completed", false)
    .eq("paused", false)
    .order("next_send_at", { ascending: true })
    .limit(MAX_PER_RUN);

  const results: any[] = [];
  for (const enrollment of due || []) {
    try {
      const r = await processEnrollment(sb, enrollment);
      results.push({ id: enrollment.id, ...r });
    } catch (e) {
      results.push({ id: enrollment.id, error: String(e) });
    }
  }

  return jsonResponse({ processed: results.length, results });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface Enrollment {
  id: string;
  sequence_id: string;
  property_id: string;
  contact_id: string;
  deal_id: string | null;
  enrolled_by: string | null;
  current_step: number;
}

async function processEnrollment(sb: any, e: Enrollment) {
  // 1. Find the step at current_step
  const { data: step } = await sb
    .from("prospect_sequence_steps")
    .select("*")
    .eq("sequence_id", e.sequence_id)
    .eq("step_index", e.current_step)
    .maybeSingle();
  if (!step) {
    // No more steps — mark complete
    await sb.from("prospect_sequence_enrollments")
      .update({ completed: true })
      .eq("id", e.id);
    return { completed: true, reason: "no more steps" };
  }

  // 2. Find contact + enroller
  const { data: contact } = await sb.from("contacts")
    .select("id, email, first_name, last_name, company, position")
    .eq("id", e.contact_id).maybeSingle();

  const enrollerId = e.enrolled_by;
  if (!enrollerId) {
    return { error: "no enroller" };
  }

  const channel = step.channel || "email";

  // ── Non-email channels: create a task instead of sending mail ──
  if (channel !== "email") {
    const taskText = renderTemplate(step.task_template || step.body_template || "", contact || {});
    await sb.from("prospect_sequence_tasks").insert({
      property_id: e.property_id,
      enrollment_id: e.id,
      step_index: e.current_step,
      channel,
      contact_id: e.contact_id,
      deal_id: e.deal_id,
      assigned_to: enrollerId,
      due_at: new Date().toISOString(),
      task_text: taskText || `Action on ${channel} for this contact`,
    });
    // Advance enrollment.
    return await advance(sb, e);
  }

  // ── Email channel ──
  if (!contact?.email) {
    await sb.from("prospect_sequence_enrollments")
      .update({ paused: true, paused_at: new Date().toISOString(), paused_reason: "no email" })
      .eq("id", e.id);
    return { paused: true, reason: "contact has no email" };
  }

  // 3. Render template with simple substitutions.
  const subject = renderTemplate(step.subject_template || "", contact);
  const body = renderTemplate(step.body_template || "", contact);

  // 4. Pick provider based on enroller's connections.
  // Prefer Outlook if connected, fall back to Gmail.
  const { data: outlook } = await sb.from("outlook_auth")
    .select("access_token, refresh_token, token_expires_at, is_connected")
    .eq("user_id", enrollerId).maybeSingle();
  const { data: gmail } = await sb.from("gmail_auth")
    .select("access_token, refresh_token, token_expires_at, is_connected")
    .eq("user_id", enrollerId).maybeSingle();

  let provider: "outlook" | "gmail" | null = null;
  if (outlook?.is_connected) provider = "outlook";
  else if (gmail?.is_connected) provider = "gmail";
  if (!provider) {
    return { error: "enroller has no connected mailbox" };
  }

  // 5. Send + log
  const trackingToken = generateTrackingToken();
  const isHtml = /<\/?(html|body|p|div|br|table|span|a)\b/i.test(body);
  let finalBody = body;
  if (isHtml && SUPABASE_URL) {
    finalBody = rewriteLinksForTracking(finalBody, SUPABASE_URL, trackingToken);
    finalBody = injectTrackingPixel(finalBody, SUPABASE_URL, trackingToken);
  }

  let messageId: string | null = null;
  if (provider === "outlook") {
    messageId = await sendViaOutlook(sb, enrollerId, outlook!, contact.email, subject, finalBody, isHtml);
  } else {
    messageId = await sendViaGmail(sb, enrollerId, gmail!, contact.email, subject, finalBody, isHtml);
  }

  // 6. Log outreach (this also bumps contact counters via the trigger)
  await logOutreach({
    sb,
    propertyId: e.property_id,
    userId: enrollerId,
    provider,
    direction: "outbound",
    messageId,
    contactId: e.contact_id,
    dealId: e.deal_id,
    toEmail: contact.email,
    toName: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || null,
    subject,
    bodyPreview: body.slice(0, 500),
    trackingToken,
    sequenceEnrollmentId: e.id,
    sequenceStepIndex: e.current_step,
  });

  // 7. Advance enrollment.
  await advance(sb, e);
  return { sent: true, provider, messageId };
}

async function advance(sb: any, e: Enrollment) {
  const nextStepIdx = e.current_step + 1;
  const { data: nextStep } = await sb
    .from("prospect_sequence_steps")
    .select("day_offset")
    .eq("sequence_id", e.sequence_id)
    .eq("step_index", nextStepIdx)
    .maybeSingle();
  if (nextStep) {
    const nextSendAt = new Date(Date.now() + (nextStep.day_offset * 86400_000)).toISOString();
    await sb.from("prospect_sequence_enrollments").update({
      current_step: nextStepIdx,
      last_sent_at: new Date().toISOString(),
      next_send_at: nextSendAt,
    }).eq("id", e.id);
  } else {
    await sb.from("prospect_sequence_enrollments").update({
      current_step: nextStepIdx,
      last_sent_at: new Date().toISOString(),
      completed: true,
    }).eq("id", e.id);
  }
  return { advanced: true };
}

// Simple {{first_name}} {{last_name}} {{company}} {{position}} substitution.
function renderTemplate(tpl: string, contact: any): string {
  return tpl
    .replace(/\{\{first_name\}\}/gi, contact.first_name || "there")
    .replace(/\{\{last_name\}\}/gi, contact.last_name || "")
    .replace(/\{\{company\}\}/gi, contact.company || "your team")
    .replace(/\{\{position\}\}/gi, contact.position || "");
}

// ── Outlook ────────────────────────────────────────────────────
async function ensureOutlookToken(sb: any, userId: string, row: any): Promise<string | null> {
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  const minutes = (expiresAt - Date.now()) / 60000;
  if (minutes >= 5) return await decryptToken(row.access_token);
  if (!row.refresh_token) return null;
  const refreshToken = await decryptToken(row.refresh_token);
  const refBody = new URLSearchParams({
    client_id: OUTLOOK_CLIENT_ID,
    client_secret: OUTLOOK_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: OUTLOOK_SCOPES,
  });
  const res = await fetch(`https://login.microsoftonline.com/${OUTLOOK_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: refBody,
  });
  const tok = await res.json();
  if (!res.ok || !tok.access_token) return null;
  const newExpires = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  await sb.from("outlook_auth").update({
    access_token: await encryptToken(tok.access_token),
    refresh_token: tok.refresh_token ? await encryptToken(tok.refresh_token) : row.refresh_token,
    token_expires_at: newExpires,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return tok.access_token;
}

async function sendViaOutlook(sb: any, userId: string, row: any, to: string, subject: string, body: string, isHtml: boolean): Promise<string | null> {
  const token = await ensureOutlookToken(sb, userId, row);
  if (!token) throw new Error("Outlook token unavailable");
  const message = {
    subject,
    body: { contentType: isHtml ? "HTML" : "Text", content: body },
    toRecipients: [{ emailAddress: { address: to } }],
  };
  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  if (!res.ok) throw new Error(`Outlook send: ${await res.text()}`);
  // Graph sendMail returns 202 with no body. Message ID isn't returned.
  return null;
}

// ── Gmail ──────────────────────────────────────────────────────
async function ensureGmailToken(sb: any, userId: string, row: any): Promise<string | null> {
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 60_000) return await decryptToken(row.access_token);
  if (!row.refresh_token) return null;
  const refreshToken = await decryptToken(row.refresh_token);
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: GMAIL_CLIENT_ID,
    client_secret: GMAIL_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const tok = await res.json();
  if (!tok.access_token) return null;
  const newExpiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  await sb.from("gmail_auth").update({
    access_token: await encryptToken(tok.access_token),
    token_expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return tok.access_token;
}

async function sendViaGmail(sb: any, userId: string, row: any, to: string, subject: string, body: string, isHtml: boolean): Promise<string | null> {
  const token = await ensureGmailToken(sb, userId, row);
  if (!token) throw new Error("Gmail token unavailable");
  const mime = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset="UTF-8"`,
    "MIME-Version: 1.0",
    "",
    body,
  ].join("\r\n");
  const encoded = btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) throw new Error(`Gmail send: ${await res.text()}`);
  const j = await res.json().catch(() => ({}));
  return j?.id || null;
}
