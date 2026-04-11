// ============================================================
// OUTLOOK-GRAPH EDGE FUNCTION (developer-only)
// ============================================================
// Single entry point for every Microsoft Graph call the frontend
// needs. All access tokens live here; the browser never sees them.
//
// Actions:
//   - get_profile      : fetch Outlook profile
//   - list_messages    : paginated list from a folder
//   - get_message      : full message body
//   - delta_sync       : new/changed emails since last delta link
//   - full_sync        : 90-day initial backfill
//
// Every call routes through requireDeveloper → 404 on failure.
// Auto-refreshes tokens that expire within 5 minutes.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireDeveloper, corsHeaders, jsonResponse } from "../_shared/devGuard.ts";
import { decryptToken, encryptToken } from "../_shared/cryptoTokens.ts";

const CLIENT_ID = Deno.env.get("OUTLOOK_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("OUTLOOK_CLIENT_SECRET") ?? "";
const TENANT_ID = Deno.env.get("OUTLOOK_TENANT_ID") ?? "common";
const SCOPES = Deno.env.get("OUTLOOK_SCOPES") ??
  "offline_access Mail.Read Mail.ReadWrite Mail.Send Contacts.Read Contacts.ReadWrite Calendars.Read User.Read";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireDeveloper(req);
  if (!guard.ok) return guard.response;
  const { userId, sb } = guard;

  try {
    const body = await req.json();
    const action = body.action;

    const token = await getAccessToken(sb, userId);
    if (!token) return jsonResponse({ success: false, error: "not connected" }, 200);

    if (action === "get_profile") return await handleProfile(token);
    if (action === "list_messages") return await handleList(token, body);
    if (action === "get_message") return await handleGetMessage(token, body.messageId);
    if (action === "delta_sync") return await handleDeltaSync(sb, userId, token);
    if (action === "full_sync") return await handleFullSync(sb, userId, token, body.days ?? 90);

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 200);
  }
});

async function getAccessToken(sb: any, userId: string): Promise<string | null> {
  const { data: row } = await sb.from("outlook_auth").select("*").eq("user_id", userId).maybeSingle();
  if (!row?.access_token) return null;

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  const minutes = (expiresAt - Date.now()) / 60000;

  if (minutes >= 5) {
    return await decryptToken(row.access_token);
  }

  // Refresh
  if (!row.refresh_token) return null;
  const refreshToken = await decryptToken(row.refresh_token);
  const refBody = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: SCOPES,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: refBody,
  });
  const tok = await res.json();
  if (!res.ok || !tok.access_token) {
    await sb.from("outlook_auth").update({ is_connected: false }).eq("user_id", userId);
    return null;
  }
  const newExpires = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  await sb.from("outlook_auth").update({
    access_token: await encryptToken(tok.access_token),
    refresh_token: tok.refresh_token ? await encryptToken(tok.refresh_token) : row.refresh_token,
    token_expires_at: newExpires,
    is_connected: true,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return tok.access_token;
}

async function graphFetch(token: string, path: string) {
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function handleProfile(token: string) {
  const r = await graphFetch(token, "/me");
  return jsonResponse({ success: r.ok, profile: r.data });
}

async function handleList(token: string, body: any) {
  const folder = body.folder || "inbox";
  const top = body.top || 50;
  const skip = body.skip || 0;
  const r = await graphFetch(token, `/me/mailFolders/${folder}/messages?$top=${top}&$skip=${skip}&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,conversationId`);
  return jsonResponse({ success: r.ok, messages: r.data.value || [] });
}

async function handleGetMessage(token: string, id: string) {
  const r = await graphFetch(token, `/me/messages/${id}`);
  return jsonResponse({ success: r.ok, message: r.data });
}

// ─── Delta sync ────────────────────────────────────────────────
async function handleDeltaSync(sb: any, userId: string, token: string) {
  const { data: authRow } = await sb.from("outlook_auth").select("last_delta_link").eq("user_id", userId).maybeSingle();
  const logId = await startLog(sb, userId, "delta");

  const startUrl = authRow?.last_delta_link || `${GRAPH_BASE}/me/mailFolders/inbox/messages/delta?$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,conversationId&$top=50`;

  let nextUrl = startUrl;
  let totalSynced = 0, totalLinked = 0;
  const errors: any[] = [];
  let deltaLink: string | null = null;

  // Follow nextLink pagination up to a safety cap
  let safety = 20;
  while (nextUrl && safety-- > 0) {
    const r = await graphFetch(token, nextUrl);
    if (!r.ok) { errors.push(r.data); break; }
    const msgs = r.data.value || [];
    for (const m of msgs) {
      try {
        const { linked } = await upsertEmail(sb, userId, m, "inbox", "auto");
        totalSynced++;
        if (linked) totalLinked++;
      } catch (e) { errors.push(String(e)); }
    }
    if (r.data["@odata.nextLink"]) nextUrl = r.data["@odata.nextLink"];
    else { deltaLink = r.data["@odata.deltaLink"] || null; nextUrl = null; }
  }

  if (deltaLink) {
    await sb.from("outlook_auth").update({
      last_delta_link: deltaLink,
      last_synced_at: new Date().toISOString(),
    }).eq("user_id", userId);
  } else {
    await sb.from("outlook_auth").update({
      last_synced_at: new Date().toISOString(),
    }).eq("user_id", userId);
  }

  await completeLog(sb, logId, totalSynced, totalLinked, errors);
  return jsonResponse({ success: true, synced: totalSynced, linked: totalLinked });
}

async function handleFullSync(sb: any, userId: string, token: string, days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const logId = await startLog(sb, userId, "full");
  let totalSynced = 0, totalLinked = 0;
  const errors: any[] = [];

  for (const folder of ["inbox", "sentitems"]) {
    let nextUrl = `${GRAPH_BASE}/me/mailFolders/${folder}/messages?$filter=receivedDateTime ge ${since}&$top=50&$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,conversationId`;
    let safety = 30;
    while (nextUrl && safety-- > 0) {
      const r = await graphFetch(token, nextUrl);
      if (!r.ok) { errors.push(r.data); break; }
      const msgs = r.data.value || [];
      for (const m of msgs) {
        try {
          const { linked } = await upsertEmail(sb, userId, m, folder === "inbox" ? "inbox" : "sent", "auto");
          totalSynced++;
          if (linked) totalLinked++;
        } catch (e) { errors.push(String(e)); }
      }
      nextUrl = r.data["@odata.nextLink"] || null;
    }
  }

  await sb.from("outlook_auth").update({ last_synced_at: new Date().toISOString() }).eq("user_id", userId);
  await completeLog(sb, logId, totalSynced, totalLinked, errors);
  return jsonResponse({ success: true, synced: totalSynced, linked: totalLinked });
}

// ─── Helpers ───────────────────────────────────────────────────
async function startLog(sb: any, userId: string, type: string): Promise<string> {
  const { data } = await sb.from("outlook_sync_log").insert({
    user_id: userId, sync_type: type, status: "running",
  }).select().single();
  return data?.id;
}

async function completeLog(sb: any, id: string, synced: number, linked: number, errors: any[]) {
  if (!id) return;
  await sb.from("outlook_sync_log").update({
    completed_at: new Date().toISOString(),
    emails_synced: synced,
    emails_linked: linked,
    errors,
    status: errors.length ? "complete" : "complete",
  }).eq("id", id);
}

async function upsertEmail(sb: any, userId: string, m: any, folder: string, source: string) {
  // Skip removed tombstones from delta sync
  if (m["@removed"]) return { linked: false };

  const fromEmail = (m.from?.emailAddress?.address || "").toLowerCase();
  const fromName = m.from?.emailAddress?.name || null;
  const toEmails = (m.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
  const ccEmails = (m.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
  const isSent = folder === "sent";

  // Try to auto-link to an existing contact
  let linkedContactId = null, linkedDealId = null, autoLinked = false;
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

  const row = {
    outlook_message_id: m.id,
    user_id: userId,
    subject: m.subject,
    body_preview: (m.bodyPreview || "").slice(0, 500),
    body_html: m.body?.contentType === "html" ? m.body.content : null,
    body_text: m.body?.contentType === "text" ? m.body.content : null,
    from_email: fromEmail,
    from_name: fromName,
    to_emails: toEmails,
    cc_emails: ccEmails,
    received_at: m.receivedDateTime,
    sent_at: m.sentDateTime,
    is_sent: isSent,
    is_read: m.isRead ?? true,
    has_attachments: m.hasAttachments ?? false,
    folder,
    linked_contact_id: linkedContactId,
    linked_deal_id: linkedDealId,
    auto_linked: autoLinked,
    sync_source: source,
    conversation_id: m.conversationId,
  };

  await sb.from("outlook_emails").upsert(row, { onConflict: "outlook_message_id" });

  // If linked and we have a deal, write an activity row so the deal timeline
  // surfaces the email naturally.
  if (autoLinked && linkedDealId) {
    await sb.from("activities").insert({
      deal_id: linkedDealId,
      activity_type: isSent ? "Email Sent" : "Email",
      subject: m.subject || "(no subject)",
      description: row.body_preview,
      occurred_at: row.received_at || row.sent_at || new Date().toISOString(),
    });
    await sb.from("outlook_emails").update({
      crm_logged: true,
      crm_logged_at: new Date().toISOString(),
    }).eq("outlook_message_id", m.id);
  }

  // Bump contact last_contacted_at
  if (linkedContactId) {
    await sb.from("contacts")
      .update({ last_contacted_at: row.received_at || row.sent_at })
      .eq("id", linkedContactId);
  }

  return { linked: autoLinked };
}
