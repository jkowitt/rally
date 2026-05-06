// ============================================================
// GMAIL-AUTH EDGE FUNCTION
// ============================================================
// Mirrors outlook-auth structure but for Google OAuth.
//
// Actions:
//   - authorize       : returns Google consent URL → frontend redirects user
//   - exchange_code   : OAuth code → tokens → store encrypted
//   - refresh_token   : refresh access token if expiring
//   - disconnect      : clear stored tokens
//
// SETUP REQUIRED (see SETUP_EMAIL_INTEGRATION.md):
//   1. Create OAuth 2.0 Client in Google Cloud Console
//      → APIs & Services → Credentials → Create Credentials → OAuth client ID
//      → Application type: Web application
//      → Authorized redirect URI: https://yourapp.com/auth/gmail/callback
//   2. Enable Gmail API in Google Cloud Console
//   3. Set scopes: https://www.googleapis.com/auth/gmail.modify +
//      https://www.googleapis.com/auth/gmail.send + openid email profile
//   4. Add OAuth consent screen (testing → publish when ready)
//   5. Set Supabase secrets:
//        GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI
//   6. Reuse OUTLOOK_TOKEN_SECRET (same encryption key) — no new env var.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, decryptToken } from "../_shared/cryptoTokens.ts";
import { assertPlan } from "../_shared/devGuard.ts";

const CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";
const REDIRECT_URI = Deno.env.get("GMAIL_REDIRECT_URI") ?? "";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "openid",
  "email",
  "profile",
].join(" ");

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const { userId, sb } = guard;

  // Email integration is Enterprise-only. Block the OAuth begin
  // (and every subsequent action) for any other plan.
  const planFail = await assertPlan(sb, userId, ["enterprise"]);
  if (planFail) return planFail;

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return jsonResponse({
      success: false,
      error: "Gmail OAuth not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI in Supabase secrets.",
    }, 200);
  }

  try {
    const { action, code } = await req.json();

    if (action === "authorize") {
      const url = new URL(AUTH_ENDPOINT);
      url.searchParams.set("client_id", CLIENT_ID);
      url.searchParams.set("redirect_uri", REDIRECT_URI);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", SCOPES);
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent");
      url.searchParams.set("state", userId);
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
        .from("gmail_auth")
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

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 200);
  }
});

async function handleExchange(sb: any, userId: string, code: string) {
  if (!code) return jsonResponse({ success: false, error: "Missing code" }, 200);
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    return jsonResponse({ success: false, error: `Token exchange failed: ${errText}` }, 200);
  }
  const tokens = await tokenRes.json();

  // Fetch user info to know which Gmail address connected
  const userInfoRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoRes.json();

  // Look up the user's property so the row is multi-tenant scoped
  const { data: profile } = await sb
    .from("profiles")
    .select("property_id")
    .eq("id", userId)
    .maybeSingle();

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

  await sb.from("gmail_auth").upsert({
    user_id: userId,
    property_id: profile?.property_id || null,
    access_token: await encryptToken(tokens.access_token),
    refresh_token: tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null,
    token_expires_at: expiresAt,
    gmail_email: userInfo.email,
    gmail_display_name: userInfo.name,
    is_connected: true,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return jsonResponse({ success: true, email: userInfo.email });
}

async function handleRefresh(sb: any, userId: string) {
  const { data: row } = await sb
    .from("gmail_auth")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row?.refresh_token) {
    return jsonResponse({ success: false, error: "No refresh token on file" }, 200);
  }
  const refreshToken = await decryptToken(row.refresh_token);
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) return jsonResponse({ success: false, error: "Refresh failed" }, 200);
  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
  await sb.from("gmail_auth").update({
    access_token: await encryptToken(tokens.access_token),
    token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return jsonResponse({ success: true });
}
