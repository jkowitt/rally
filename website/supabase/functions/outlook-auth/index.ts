// ============================================================
// OUTLOOK-AUTH EDGE FUNCTION (multi-tenant customer)
// ============================================================
// Actions:
//   - authorize       : returns Microsoft consent URL → frontend redirects
//   - exchange_code   : OAuth code → tokens → store encrypted
//   - refresh_token   : refresh access token if expiring
//   - disconnect      : clear stored tokens
//
// Was developer-only (migration 053); now multi-tenant per
// migration 072. Any authenticated user can connect their own
// Outlook mailbox; RLS scopes data to their property.
// Tokens are stored in outlook_auth as base64-wrapped AES-GCM
// ciphertext keyed on OUTLOOK_TOKEN_SECRET (Supabase env).
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser, corsHeaders, jsonResponse } from "../_shared/devGuard.ts";
import { encryptToken, decryptToken } from "../_shared/cryptoTokens.ts";

const CLIENT_ID = Deno.env.get("OUTLOOK_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("OUTLOOK_CLIENT_SECRET") ?? "";
const TENANT_ID = Deno.env.get("OUTLOOK_TENANT_ID") ?? "common";
const REDIRECT_URI = Deno.env.get("OUTLOOK_REDIRECT_URI") ?? "";
const SCOPES = Deno.env.get("OUTLOOK_SCOPES") ??
  "offline_access Mail.Read Mail.ReadWrite Mail.Send Contacts.Read Contacts.ReadWrite Calendars.Read User.Read";

const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
const GRAPH_ME = "https://graph.microsoft.com/v1.0/me";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Email integration is Enterprise-only. Block the OAuth begin
  // (and every action under outlook-auth) for any other plan so
  // a non-Enterprise user can't even kick off the connect flow.
  const guard = await requireUser(req, { plan: ["enterprise"] });
  if (!guard.ok) return guard.response;
  const { userId, sb } = guard;

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return jsonResponse({
      success: false,
      error: "Outlook OAuth not configured. Set OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_REDIRECT_URI in Supabase secrets.",
    }, 200);
  }

  try {
    const { action, code } = await req.json();

    if (action === "authorize") {
      const url = new URL(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`);
      url.searchParams.set("client_id", CLIENT_ID);
      url.searchParams.set("redirect_uri", REDIRECT_URI);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("response_mode", "query");
      url.searchParams.set("scope", SCOPES);
      url.searchParams.set("state", userId);
      url.searchParams.set("prompt", "consent");
      return jsonResponse({ url: url.toString() });
    }
    if (action === "exchange_code") {
      return await handleExchange(sb, userId, code);
    }
    if (action === "refresh_token") {
      return await handleRefresh(sb, userId);
    }
    if (action === "disconnect") {
      const { error } = await sb
        .from("outlook_auth")
        .update({
          access_token: null,
          refresh_token: null,
          is_connected: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (error) return jsonResponse({ success: false, error: error.message }, 200);
      return jsonResponse({ success: true });
    }

    // Unknown action — 404 so we don't leak which actions exist
    return new Response("Not Found", { status: 404 });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 200);
  }
});

async function handleExchange(sb: any, userId: string, code: string) {
  if (!code) return jsonResponse({ success: false, error: "missing code" }, 200);
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return jsonResponse({ success: false, error: "Outlook env vars not configured" }, 200);
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
    scope: SCOPES,
  });

  const tokRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tok = await tokRes.json();
  if (!tokRes.ok || !tok.access_token) {
    return jsonResponse({ success: false, error: tok.error_description || "token exchange failed" }, 200);
  }

  // Get profile info
  const profileRes = await fetch(GRAPH_ME, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  const profile = await profileRes.json();

  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  const encAccess = await encryptToken(tok.access_token);
  const encRefresh = tok.refresh_token ? await encryptToken(tok.refresh_token) : null;

  // Look up the user's property so the row is multi-tenant scoped.
  const { data: prof } = await sb
    .from("profiles")
    .select("property_id")
    .eq("id", userId)
    .maybeSingle();

  // Upsert
  const { error } = await sb.from("outlook_auth").upsert({
    user_id: userId,
    property_id: prof?.property_id || null,
    access_token: encAccess,
    refresh_token: encRefresh,
    token_expires_at: expiresAt,
    outlook_email: profile.mail || profile.userPrincipalName,
    outlook_display_name: profile.displayName,
    is_connected: true,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) return jsonResponse({ success: false, error: error.message }, 200);
  return jsonResponse({ success: true, email: profile.mail || profile.userPrincipalName });
}

async function handleRefresh(sb: any, userId: string) {
  const { data: row } = await sb.from("outlook_auth").select("*").eq("user_id", userId).maybeSingle();
  if (!row?.refresh_token) return jsonResponse({ success: false, error: "no refresh token" }, 200);

  const refreshToken = await decryptToken(row.refresh_token);
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: SCOPES,
  });

  const tokRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tok = await tokRes.json();
  if (!tokRes.ok || !tok.access_token) {
    // Mark disconnected so UI can prompt re-auth
    await sb.from("outlook_auth").update({ is_connected: false }).eq("user_id", userId);
    return jsonResponse({ success: false, error: "refresh failed — re-auth required" }, 200);
  }

  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  const encAccess = await encryptToken(tok.access_token);
  const encRefresh = tok.refresh_token ? await encryptToken(tok.refresh_token) : row.refresh_token;

  await sb.from("outlook_auth").update({
    access_token: encAccess,
    refresh_token: encRefresh,
    token_expires_at: expiresAt,
    is_connected: true,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return jsonResponse({ success: true, expires_at: expiresAt });
}
