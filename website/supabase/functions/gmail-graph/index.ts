// ============================================================
// GMAIL-GRAPH EDGE FUNCTION
// ============================================================
// Mirror of outlook-graph for Gmail.
//
// Actions:
//   - sync         : history.list when last_history_id present
//                    (incremental); else messages.list initial
//                    backfill of 50 most-recent inbox messages.
//   - send         : send a new message via gmail.users.messages.send.
//
// Implementation notes:
//   - Token refresh: any call that needs an access token first
//     consults the row's expiry; if within 60s of expiry (or
//     already expired) it refreshes inline before proceeding.
//   - MIME parsing: proper recursive walker that handles nested
//     multipart bodies. Prefers text/plain for body_text and
//     text/html for body_html; falls back to nearest non-empty
//     leaf if neither found.
//   - Auto-link to existing contacts mirrors outlook-graph; on
//     no-match for inbound mail, calls the
//     autocreate_contact_from_email RPC from migration 072.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, decryptToken } from "../_shared/cryptoTokens.ts";
import { logOutreach, generateTrackingToken, injectTrackingPixel, rewriteLinksForTracking, plainTextToHtml } from "../_shared/outreachLog.ts";

const TRACKING_BASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";

async function requireUser(req: Request) {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return { ok: false as const, response: jsonResponse({ error: "Missing auth" }, 401) };
  const { data } = await sb.auth.getUser(jwt);
  if (!data.user) return { ok: false as const, response: jsonResponse({ error: "Unauthorized" }, 401) };
  return { ok: true as const, userId: data.user.id, sb };
}

// Refresh the access token inline if it's expired or expires
// within 60 seconds. Returns the (now-fresh) decrypted access
// token, or null if refresh failed / no refresh token on file.
async function getFreshAccessToken(sb: any, userId: string): Promise<string | null> {
  const { data: row } = await sb
    .from("gmail_auth")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row?.access_token) return null;

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  const expiringSoon = expiresAt - Date.now() < 60_000;
  if (!expiringSoon) {
    return await decryptToken(row.access_token);
  }
  if (!row.refresh_token) return null;

  // Inline refresh
  const refreshToken = await decryptToken(row.refresh_token);
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const { userId, sb } = guard;

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "sync") return await handleSync(sb, userId);
    if (action === "send") return await handleSend(sb, userId, body);
    if (action === "save_draft") return await handleSaveDraft(sb, userId, body);
    if (action === "fetch_signatures") return await handleFetchSignatures(sb, userId);

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 200);
  }
});

// ---- Sync ----

async function handleSync(sb: any, userId: string) {
  const accessToken = await getFreshAccessToken(sb, userId);
  if (!accessToken) return jsonResponse({ success: false, error: "Not connected or token refresh failed" }, 200);

  const { data: authRow } = await sb
    .from("gmail_auth")
    .select("last_history_id, property_id")
    .eq("user_id", userId)
    .maybeSingle();
  const lastHistoryId = authRow?.last_history_id;

  const logId = (await sb.from("gmail_sync_log").insert({
    user_id: userId,
    sync_type: lastHistoryId ? "history" : "full",
    status: "running",
  }).select("id").single()).data?.id;

  let synced = 0;
  let errorMessage: string | null = null;
  let newHistoryId: string | null = null;

  try {
    if (lastHistoryId) {
      // Incremental: list new history events since last cursor
      const result = await pullHistory(sb, userId, accessToken, lastHistoryId);
      synced = result.synced;
      newHistoryId = result.newHistoryId;
    } else {
      // Initial: pull the 50 most-recent inbox messages
      const result = await pullInitialBackfill(sb, userId, accessToken);
      synced = result.synced;
      newHistoryId = result.newHistoryId;
    }
  } catch (err) {
    errorMessage = String(err);
  }

  await sb.from("gmail_sync_log").update({
    ended_at: new Date().toISOString(),
    status: errorMessage ? "error" : "success",
    messages_synced: synced,
    error_message: errorMessage,
  }).eq("id", logId);

  await sb.from("gmail_auth").update({
    last_synced_at: new Date().toISOString(),
    ...(newHistoryId ? { last_history_id: newHistoryId } : {}),
  }).eq("user_id", userId);

  return jsonResponse({ success: !errorMessage, synced, error: errorMessage });
}

async function pullInitialBackfill(sb: any, userId: string, accessToken: string) {
  const listRes = await fetch(`${GMAIL_API}/messages?q=in:inbox&maxResults=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) throw new Error(`List failed: ${listRes.status} ${await listRes.text()}`);
  const list = await listRes.json();

  let synced = 0;
  let maxHistoryId = 0n;
  for (const ref of list.messages || []) {
    const msg = await fetchMessage(accessToken, ref.id);
    if (msg) {
      const ok = await upsertGmailMessage(sb, userId, msg);
      if (ok) synced++;
      if (msg.historyId) {
        try {
          const h = BigInt(msg.historyId);
          if (h > maxHistoryId) maxHistoryId = h;
        } catch { /* ignore non-numeric */ }
      }
    }
  }
  return { synced, newHistoryId: maxHistoryId > 0n ? maxHistoryId.toString() : null };
}

async function pullHistory(sb: any, userId: string, accessToken: string, startHistoryId: string) {
  const url = new URL(`${GMAIL_API}/history`);
  url.searchParams.set("startHistoryId", startHistoryId);
  url.searchParams.set("historyTypes", "messageAdded");
  // labelId=INBOX limits to inbox events
  url.searchParams.set("labelId", "INBOX");

  const histRes = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!histRes.ok) {
    // 404 means startHistoryId is too old (Gmail keeps history for ~7 days);
    // fall back to a fresh full backfill.
    if (histRes.status === 404) {
      return await pullInitialBackfill(sb, userId, accessToken);
    }
    throw new Error(`History failed: ${histRes.status} ${await histRes.text()}`);
  }
  const hist = await histRes.json();

  const seen = new Set<string>();
  let synced = 0;
  let newHistoryId: string | null = hist.historyId || null;

  for (const h of hist.history || []) {
    for (const evt of h.messagesAdded || []) {
      const id = evt.message?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const msg = await fetchMessage(accessToken, id);
      if (msg) {
        const ok = await upsertGmailMessage(sb, userId, msg);
        if (ok) synced++;
      }
    }
  }
  return { synced, newHistoryId };
}

async function fetchMessage(accessToken: string, messageId: string) {
  const res = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

// ---- MIME parsing ----

function headerValue(headers: any[], name: string): string | null {
  if (!headers) return null;
  const h = headers.find((x: any) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

// Recursive MIME walker. Walks the message payload tree, returning
// the first text/html part found AND the first text/plain part.
// Supports arbitrarily nested multipart/* containers.
function walkMimeParts(payload: any, out = { html: null as string | null, text: null as string | null, attachments: [] as Array<{ filename: string; mimeType: string; size: number }> }) {
  if (!payload) return out

  const mime = (payload.mimeType || "").toLowerCase()

  // Attachment branch — anything with filename
  if (payload.filename) {
    out.attachments.push({
      filename: payload.filename,
      mimeType: payload.mimeType || "application/octet-stream",
      size: payload.body?.size || 0,
    })
  }

  // Body branch
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data)
    if (mime === "text/html" && !out.html) out.html = decoded
    else if (mime === "text/plain" && !out.text) out.text = decoded
  }

  // Recurse into parts
  if (Array.isArray(payload.parts)) {
    for (const p of payload.parts) walkMimeParts(p, out)
  }

  return out
}

function decodeBase64Url(s: string): string {
  try {
    const padded = s.replace(/-/g, "+").replace(/_/g, "/")
    const decoded = atob(padded)
    // Decode UTF-8
    const bytes = new Uint8Array([...decoded].map(c => c.charCodeAt(0)))
    return new TextDecoder("utf-8").decode(bytes)
  } catch {
    return ""
  }
}

function parseAddress(raw: string | null): { email: string; name: string | null } {
  if (!raw) return { email: "", name: null };
  const m = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].replace(/^"|"$/g, "").trim() || null, email: m[2].trim().toLowerCase() };
  return { email: raw.trim().toLowerCase(), name: null };
}

async function upsertGmailMessage(sb: any, userId: string, msg: any) {
  const headers = msg.payload?.headers || [];
  const fromRaw = headerValue(headers, "From");
  const toRaw = headerValue(headers, "To");
  const ccRaw = headerValue(headers, "Cc");
  const subject = headerValue(headers, "Subject");
  const dateRaw = headerValue(headers, "Date");
  const { email: fromEmail, name: fromName } = parseAddress(fromRaw);
  const toEmails = (toRaw || "").split(",").map(s => parseAddress(s).email).filter(Boolean);
  const ccEmails = (ccRaw || "").split(",").map(s => parseAddress(s).email).filter(Boolean);

  const labels: string[] = msg.labelIds || [];
  const isSent = labels.includes("SENT");
  const isRead = !labels.includes("UNREAD");
  const isStarred = labels.includes("STARRED");

  const parts = walkMimeParts(msg.payload);
  const hasAttachments = parts.attachments.length > 0;

  // Auto-link
  let linkedContactId: string | null = null;
  let linkedDealId: string | null = null;
  let autoLinked = false;
  const candidates = isSent ? toEmails : [fromEmail];
  for (const e of candidates) {
    if (!e) continue;
    const { data: contact } = await sb
      .from("contacts")
      .select("id, deal_id")
      .ilike("email", e)
      .maybeSingle();
    if (contact) {
      linkedContactId = contact.id;
      linkedDealId = contact.deal_id || null;
      autoLinked = true;
      break;
    }
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("property_id")
    .eq("id", userId)
    .maybeSingle();
  const propertyId = profile?.property_id || null;

  if (!autoLinked && !isSent && fromEmail && propertyId) {
    const { data: newId } = await sb.rpc("autocreate_contact_from_email", {
      p_property_id: propertyId,
      p_from_email: fromEmail,
      p_from_name: fromName,
      p_subject: subject,
    });
    if (newId) {
      linkedContactId = newId as string;
      autoLinked = true;
    }
  }

  await sb.from("gmail_emails").upsert({
    gmail_message_id: msg.id,
    gmail_thread_id: msg.threadId,
    user_id: userId,
    property_id: propertyId,
    subject,
    snippet: msg.snippet || null,
    body_html: parts.html,
    body_text: parts.text,
    from_email: fromEmail,
    from_name: fromName,
    to_emails: toEmails,
    cc_emails: ccEmails,
    received_at: dateRaw ? new Date(dateRaw).toISOString() : null,
    sent_at: isSent && dateRaw ? new Date(dateRaw).toISOString() : null,
    is_sent: isSent,
    is_read: isRead,
    is_starred: isStarred,
    has_attachments: hasAttachments,
    labels,
    linked_contact_id: linkedContactId,
    linked_deal_id: linkedDealId,
    auto_linked: autoLinked,
    sync_source: "auto",
  }, { onConflict: "gmail_message_id" });

  if (autoLinked && linkedDealId) {
    await sb.from("activities").insert({
      deal_id: linkedDealId,
      activity_type: isSent ? "Email Sent" : "Email",
      subject: subject || "(no subject)",
      description: msg.snippet || null,
      occurred_at: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
    });
    await sb.from("gmail_emails").update({
      crm_logged: true,
      crm_logged_at: new Date().toISOString(),
    }).eq("gmail_message_id", msg.id);
  }

  if (linkedContactId) {
    await sb.from("contacts")
      .update({ last_contacted_at: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString() })
      .eq("id", linkedContactId);
  }

  // Record into outreach_log so the response_count + sequence
  // auto-pause triggers fire. Dedup on (provider, message_id).
  if (linkedContactId) {
    await logOutreach({
      sb,
      propertyId,
      userId,
      provider: "gmail",
      direction: isSent ? "outbound" : "inbound",
      messageId: msg.id,
      threadId: msg.threadId,
      contactId: linkedContactId,
      dealId: linkedDealId,
      toEmail: isSent ? (toEmails[0] || null) : fromEmail,
      toName: isSent ? null : fromName,
      subject,
      bodyPreview: msg.snippet || null,
      sentAt: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
    });
  }

  return true;
}

// ---- Send ----

async function handleSend(sb: any, userId: string, body: any) {
  const accessToken = await getFreshAccessToken(sb, userId);
  if (!accessToken) return jsonResponse({ success: false, error: "Not connected" }, 200);

  const toArr = Array.isArray(body.to) ? body.to : (body.to ? [body.to] : []);
  const ccArr = Array.isArray(body.cc) ? body.cc : (body.cc ? [body.cc] : []);
  const to = toArr.join(", ");
  const cc = ccArr.join(", ");
  const subject = body.subject || "";
  let messageBody = body.body || "";
  const attachments: Array<{ filename: string; mimeType: string; data: string }> = body.attachments || [];
  const dealId: string | null = body.deal_id || null;
  const sequenceEnrollmentId: string | null = body.sequence_enrollment_id || null;
  const sequenceStepIndex: number | null = (typeof body.sequence_step_index === "number") ? body.sequence_step_index : null;

  // Tracking: convert plain text to minimal HTML so the pixel + link
  // rewriter always fire when tracking is enabled. Bare URLs become
  // <a> tags so click tracking captures them too. Set body.tracking
  // = false to opt out.
  const trackingEnabled = body.tracking !== false;
  const trackingToken = trackingEnabled ? generateTrackingToken() : null;
  if (trackingEnabled && trackingToken && TRACKING_BASE_URL) {
    messageBody = plainTextToHtml(messageBody);
    messageBody = rewriteLinksForTracking(messageBody, TRACKING_BASE_URL, trackingToken);
    messageBody = injectTrackingPixel(messageBody, TRACKING_BASE_URL, trackingToken);
  }
  const isHtml = /<\/?(html|body|p|div|br|table|span|a)\b/i.test(messageBody);
  const bodyMimeType = isHtml ? "text/html" : "text/plain";

  // Threading: when caller passes in_reply_to_message_id, we look up
  // the original Gmail message to grab its Message-Id header + thread,
  // then add In-Reply-To/References on the new MIME and pass threadId
  // to /messages/send so Gmail keeps the conversation grouped.
  const inReplyTo: string | null = body.in_reply_to_message_id || null;
  const threadId: string | null = body.thread_id || null;
  let inReplyToHeader: string | null = null;
  let referencesHeader: string | null = null;
  let resolvedThreadId: string | null = threadId;

  if (inReplyTo) {
    const orig = await fetch(`${GMAIL_API}/messages/${inReplyTo}?format=metadata&metadataHeaders=Message-Id&metadataHeaders=References`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (orig.ok) {
      const m = await orig.json();
      const hdrs = m?.payload?.headers || [];
      const msgId = hdrs.find((h: any) => h.name?.toLowerCase() === "message-id")?.value;
      const refs = hdrs.find((h: any) => h.name?.toLowerCase() === "references")?.value;
      if (msgId) inReplyToHeader = msgId;
      referencesHeader = [refs, msgId].filter(Boolean).join(" ");
      if (m.threadId) resolvedThreadId = m.threadId;
    }
  }

  let raw: string;
  if (attachments.length === 0) {
    raw = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : "",
      `Subject: ${subject}`,
      inReplyToHeader ? `In-Reply-To: ${inReplyToHeader}` : "",
      referencesHeader ? `References: ${referencesHeader}` : "",
      `Content-Type: ${bodyMimeType}; charset="UTF-8"`,
      "MIME-Version: 1.0",
      "",
      messageBody,
    ].filter(Boolean).join("\r\n");
  } else {
    const boundary = "ll_mime_" + Math.random().toString(36).slice(2);
    const lines = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : "",
      `Subject: ${subject}`,
      inReplyToHeader ? `In-Reply-To: ${inReplyToHeader}` : "",
      referencesHeader ? `References: ${referencesHeader}` : "",
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      `Content-Type: ${bodyMimeType}; charset="UTF-8"`,
      "Content-Transfer-Encoding: 7bit",
      "",
      messageBody,
      "",
    ].filter(Boolean);
    for (const a of attachments) {
      lines.push(
        `--${boundary}`,
        `Content-Type: ${a.mimeType}; name="${a.filename.replace(/"/g, "\\\"")}"`,
        `Content-Disposition: attachment; filename="${a.filename.replace(/"/g, "\\\"")}"`,
        "Content-Transfer-Encoding: base64",
        "",
        a.data,
        "",
      );
    }
    lines.push(`--${boundary}--`);
    raw = lines.join("\r\n");
  }

  const encoded = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sendPayload: any = { raw: encoded };
  if (resolvedThreadId) sendPayload.threadId = resolvedThreadId;

  const sendRes = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sendPayload),
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    return jsonResponse({ success: false, error: `Gmail send failed: ${errText}` }, 200);
  }
  const sendJson = await sendRes.json().catch(() => ({}));

  try {
    const { data: prof } = await sb
      .from("profiles")
      .select("property_id")
      .eq("id", userId)
      .maybeSingle();
    const propertyId = prof?.property_id ?? null;

    let contactId: string | null = null;
    let resolvedDealId: string | null = dealId;
    if (toArr.length && propertyId) {
      const { data: contact } = await sb
        .from("contacts")
        .select("id, deal_id")
        .eq("property_id", propertyId)
        .ilike("email", toArr[0])
        .maybeSingle();
      if (contact) {
        contactId = contact.id;
        if (!resolvedDealId) resolvedDealId = contact.deal_id || null;
      }
    }

    await logOutreach({
      sb,
      propertyId,
      userId,
      provider: "gmail",
      direction: "outbound",
      messageId: sendJson?.id || null,
      threadId: sendJson?.threadId || null,
      contactId,
      dealId: resolvedDealId,
      toEmail: toArr[0] || null,
      subject,
      bodyPreview: (body.body || "").slice(0, 500),
      trackingToken,
      sequenceEnrollmentId,
      sequenceStepIndex,
    });

    // Mirror sent message into gmail_emails so the unified inbox
    // shows it instantly. Delta sync will catch the canonical Gmail
    // copy on the next 5-minute tick and overwrite this row (matched
    // by gmail_message_id), so we just stub fields the rep cares
    // about for the inbox preview.
    if (propertyId && sendJson?.id) {
      await sb.from("gmail_emails").upsert({
        gmail_message_id: sendJson.id,
        user_id: userId,
        property_id: propertyId,
        subject: subject || null,
        snippet: (body.body || "").slice(0, 500),
        body_html: messageBody.startsWith("<") ? messageBody : null,
        body_text: messageBody.startsWith("<") ? null : messageBody,
        from_email: null,
        from_name: null,
        to_emails: toArr,
        cc_emails: ccArr.length ? ccArr : null,
        sent_at: new Date().toISOString(),
        is_sent: true,
        is_read: true,
        has_attachments: attachments.length > 0,
        labels: ["SENT"],
        gmail_thread_id: sendJson.threadId || null,
        linked_contact_id: contactId,
        linked_deal_id: resolvedDealId,
        auto_linked: !!resolvedDealId,
        manually_linked: false,
        ignored: false,
        crm_logged: true,
        crm_logged_at: new Date().toISOString(),
      }, { onConflict: "gmail_message_id" });

      await sb.from("activities").insert({
        property_id: propertyId,
        deal_id: resolvedDealId,
        contact_email: toArr[0] || null,
        activity_type: "Email",
        subject: subject || null,
        description: (body.body || "").slice(0, 1000),
        created_by: userId,
      });
    }
  } catch { /* best-effort */ }

  return jsonResponse({ success: true, tracking_token: trackingToken, message_id: sendJson?.id || null });
}


// Pull every Gmail "send-as" identity for the connected account and
// return their HTML signatures. Reps almost always already have a
// signature configured in Gmail web — this lets the CRM auto-import
// it on demand instead of forcing them to paste it again.
async function handleFetchSignatures(sb: any, userId: string) {
  const accessToken = await getFreshAccessToken(sb, userId);
  if (!accessToken) {
    return jsonResponse({ success: false, error: "Gmail is not connected for this user" }, 200);
  }

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    return jsonResponse({ success: false, error: `Gmail API ${res.status}: ${(await res.text()).slice(0, 300)}` }, 200);
  }
  const json = await res.json();
  const identities = (json.sendAs || []).map((s: any) => ({
    email: s.sendAsEmail || "",
    display_name: s.displayName || "",
    signature: s.signature || "",
    is_primary: !!s.isPrimary,
    is_default: !!s.isDefault,
  }));

  // Auto-save the primary identity's signature to gmail_auth so the
  // compose flow has it available without a second click.
  const primary = identities.find((i: any) => i.is_primary) || identities[0];
  if (primary?.signature) {
    await sb.from("gmail_auth")
      .update({ signature_html: primary.signature, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  return jsonResponse({ success: true, identities, primary_signature: primary?.signature || "" });
}


// Save a draft in the user's Gmail. Posts to /users/me/drafts with
// a base64-url-encoded RFC 2822 message. The signature is appended
// inside the function so callers do not need to handle it. Tracking
// pixel + link rewrite are intentionally NOT applied — drafts are
// edited in Gmail web before send and we cannot guarantee the user
// will keep our injected pixel.
async function handleSaveDraft(sb: any, userId: string, body: any) {
  const accessToken = await getFreshAccessToken(sb, userId);
  if (!accessToken) {
    return jsonResponse({ success: false, error: "Gmail is not connected" }, 200);
  }

  const toArr: string[] = Array.isArray(body.to) ? body.to.filter(Boolean) : [];
  const ccArr: string[] = Array.isArray(body.cc) ? body.cc.filter(Boolean) : [];
  const subject: string = body.subject || "";
  let messageBody: string = body.body || "";

  // Append the user's signature if one is configured.
  const { data: gauth } = await sb.from("gmail_auth")
    .select("signature_html, gmail_email").eq("user_id", userId).maybeSingle();
  const { data: prof } = await sb.from("profiles")
    .select("email_signature_html, email_signature").eq("id", userId).maybeSingle();
  const sigHtml = gauth?.signature_html || prof?.email_signature_html || "";
  const sigPlain = prof?.email_signature || "";
  if (sigHtml) {
    const isHtml = /<\/?(html|body|p|div|br|table|span|a)\b/i.test(messageBody);
    messageBody = isHtml
      ? `${messageBody}<br/><br/>${sigHtml}`
      : `<div>${(messageBody || "").replace(/\n/g, "<br/>")}</div><br/><br/>${sigHtml}`;
  } else if (sigPlain) {
    messageBody = `${messageBody}\n\n${sigPlain}`;
  }

  const isHtml = /<\/?(html|body|p|div|br|table|span|a)\b/i.test(messageBody);
  const bodyMime = isHtml ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";

  const fromEmail = gauth?.gmail_email || "";
  const headers = [
    `From: ${fromEmail}`,
    `To: ${toArr.join(", ")}`,
    ccArr.length ? `Cc: ${ccArr.join(", ")}` : null,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: ${bodyMime}`,
  ].filter(Boolean).join("\r\n");
  const raw = `${headers}\r\n\r\n${messageBody}`;

  // base64url encode
  const utf8 = new TextEncoder().encode(raw);
  let binary = "";
  for (let i = 0; i < utf8.length; i += 0x8000) binary += String.fromCharCode(...utf8.subarray(i, i + 0x8000));
  const b64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw: b64 } }),
  });
  if (!res.ok) {
    return jsonResponse({ success: false, error: `Gmail draft failed: ${(await res.text()).slice(0, 300)}` }, 200);
  }
  const out = await res.json();
  return jsonResponse({ success: true, draft_id: out?.id || null, message_id: out?.message?.id || null });
}
