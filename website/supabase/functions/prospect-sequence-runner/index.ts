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
    .select("id, email, first_name, last_name, company, position, do_not_contact_until, unsubscribed_at, best_send_hour, timezone")
    .eq("id", e.contact_id).maybeSingle();

  const enrollerId = e.enrolled_by;
  if (!enrollerId) {
    return { error: "no enroller" };
  }

  // 2a-pre. Hard-stop if the contact unsubscribed.
  if (contact?.unsubscribed_at) {
    await sb.from("prospect_sequence_enrollments")
      .update({ paused: true, paused_at: new Date().toISOString(), paused_reason: "unsubscribed" })
      .eq("id", e.id);
    return { paused: true, reason: "unsubscribed" };
  }

  // 2a-pre2. Hard-stop if recipient domain is on the property's DNC list.
  if (contact?.email) {
    const domain = contact.email.split("@")[1]?.toLowerCase();
    if (domain) {
      const { data: dnc } = await sb
        .from("dnc_domains")
        .select("id")
        .eq("property_id", e.property_id)
        .eq("domain", domain)
        .maybeSingle();
      if (dnc) {
        await sb.from("prospect_sequence_enrollments")
          .update({ paused: true, paused_at: new Date().toISOString(), paused_reason: "dnc_domain" })
          .eq("id", e.id);
        return { paused: true, reason: "dnc_domain" };
      }
    }
  }

  // 2a. Mute / DNC check
  if (contact?.do_not_contact_until) {
    const dncUntil = new Date(contact.do_not_contact_until).getTime();
    if (dncUntil > Date.now()) {
      await sb.from("prospect_sequence_enrollments")
        .update({ next_send_at: contact.do_not_contact_until })
        .eq("id", e.id);
      return { deferred: true, reason: "do_not_contact" };
    }
  }

  // 2b. Holiday window check (property-level)
  const { data: holiday } = await sb
    .from("property_holiday_windows")
    .select("ends_at")
    .eq("property_id", e.property_id)
    .lte("starts_at", new Date().toISOString())
    .gte("ends_at", new Date().toISOString())
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (holiday?.ends_at) {
    await sb.from("prospect_sequence_enrollments")
      .update({ next_send_at: holiday.ends_at })
      .eq("id", e.id);
    return { deferred: true, reason: "holiday_window" };
  }

  // 2c. Send-time optimization with recipient-timezone awareness.
  // Pull inferred IANA tz; default "America/New_York" if unknown.
  // best_send_hour is interpreted as a local hour in the recipient's
  // tz, not UTC. If now (in their tz) isn't within ±1h of that hour,
  // defer to today's best (or tomorrow's if past).
  if (typeof contact?.best_send_hour === "number") {
    const { data: tzRow } = await sb
      .from("contact_inferred_timezone")
      .select("timezone")
      .eq("contact_id", e.contact_id)
      .maybeSingle();
    const tz = tzRow?.timezone || "America/New_York";
    const target = nextLocalHourUtc(contact.best_send_hour, tz);
    if (target.getTime() - Date.now() > 60 * 60_000) {
      await sb.from("prospect_sequence_enrollments")
        .update({ next_send_at: target.toISOString() })
        .eq("id", e.id);
      return { deferred: true, reason: "send_time_optimization", target: target.toISOString(), tz };
    }
  }

  // 2d. Business-day cadence — if the step is flagged use_business_days
  // and we're on a weekend or US holiday, defer to the next business
  // day at the recipient's local best_send_hour (or 10am default).
  if (step.use_business_days) {
    const { data: today } = await sb
      .from("us_holidays")
      .select("name")
      .eq("observed_date", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    const dow = new Date().getUTCDay(); // 0=Sun, 6=Sat
    const isHolidayOrWeekend = !!today || dow === 0 || dow === 6;
    if (isHolidayOrWeekend) {
      // Defer 1 business day forward
      const { data: nextBd } = await sb.rpc("add_business_days", {
        from_ts: new Date().toISOString(),
        n_days: 1,
      });
      if (nextBd) {
        await sb.from("prospect_sequence_enrollments")
          .update({ next_send_at: nextBd })
          .eq("id", e.id);
        return { deferred: true, reason: "business_day_skip", target: nextBd };
      }
    }
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

  // 3. Pick a variant if any exist for this step. Falls back to
  // the step's own subject/body templates if no variants configured.
  const variant = await pickVariant(sb, step.id);
  const subjectTpl = variant.subject ?? step.subject_template ?? "";
  const bodyTpl = variant.body ?? step.body_template ?? "";
  const subject = renderTemplate(subjectTpl, contact);
  const body = renderTemplate(bodyTpl, contact);

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
    variantId: variant.variantId,
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

// Compute the next UTC instant when `hour` lands in the given IANA
// timezone. Uses Intl.DateTimeFormat to derive the offset for that
// tz at the candidate moment, accounting for DST.
function nextLocalHourUtc(hour: number, tz: string): Date {
  const now = new Date();
  // First try today; if that's already > 1h past, jump to tomorrow.
  const candidate = candidateLocalHour(now, hour, tz);
  if (candidate.getTime() < now.getTime() - 60 * 60_000) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60_000);
    return candidateLocalHour(tomorrow, hour, tz);
  }
  return candidate;
}

function candidateLocalHour(day: Date, hour: number, tz: string): Date {
  // Build a UTC instant for that day at the desired LOCAL hour.
  // We compute: targetUtc = utcOfMidnightLocalDay + hour*1h, where
  // utcOfMidnightLocalDay = utcMidnight - tzOffsetMinutes(tz, day).
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(day).map(p => [p.type, p.value]));
  const localDay = new Date(Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    hour, 0, 0,
  ));
  // localDay is "the desired wallclock as if it were UTC". Now find
  // the actual offset of that wallclock in tz to convert to true UTC.
  const localOffsetMin = tzOffsetMinutes(tz, localDay);
  return new Date(localDay.getTime() - localOffsetMin * 60_000);
}

function tzOffsetMinutes(tz: string, instant: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, timeZoneName: "shortOffset", hour12: false,
  });
  const parts = fmt.formatToParts(instant);
  const off = parts.find(p => p.type === "timeZoneName")?.value || "GMT";
  const m = off.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number(m[2]);
  const mm = Number(m[3] || 0);
  return sign * (hh * 60 + mm);
}

// Pick a step variant. Round-robin while any variant has < SAMPLE_THRESHOLD
// sends; once threshold is hit, stick with the highest reply-rate variant
// and mark it the winner.
const VARIANT_SAMPLE_THRESHOLD = 30;

async function pickVariant(sb: any, stepId: string): Promise<{ variantId: string | null; subject?: string; body?: string; task?: string }> {
  const { data: variants } = await sb
    .from("prospect_sequence_step_variants")
    .select("*")
    .eq("step_id", stepId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (!variants || variants.length === 0) return { variantId: null };

  // Pull per-variant reply rate from the view (already rolled up).
  const { data: perf } = await sb
    .from("sequence_step_variant_performance")
    .select("variant_id, sends, replies, reply_rate")
    .in("variant_id", variants.map((v: any) => v.id));
  const perfById = new Map((perf || []).map((p: any) => [p.variant_id, p]));

  // If any variant is already crowned the winner, use it.
  const winner = variants.find((v: any) => v.is_winner);
  if (winner) return variantPayload(winner);

  // Round-robin while warming up.
  const undersampled = variants.filter((v: any) => (perfById.get(v.id)?.sends ?? 0) < VARIANT_SAMPLE_THRESHOLD);
  if (undersampled.length > 0) {
    // Pick the variant with the fewest sends so far.
    undersampled.sort((a: any, b: any) =>
      (perfById.get(a.id)?.sends ?? 0) - (perfById.get(b.id)?.sends ?? 0)
    );
    return variantPayload(undersampled[0]);
  }

  // All variants have hit threshold — crown the winner by reply rate.
  const ranked = [...variants].sort((a: any, b: any) =>
    (perfById.get(b.id)?.reply_rate ?? 0) - (perfById.get(a.id)?.reply_rate ?? 0)
  );
  const champ = ranked[0];
  await sb.from("prospect_sequence_step_variants")
    .update({ is_winner: true })
    .eq("id", champ.id);
  return variantPayload(champ);
}

function variantPayload(v: any) {
  return {
    variantId: v.id,
    subject: v.subject_template,
    body: v.body_template,
    task: v.task_template,
  };
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
