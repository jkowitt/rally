// ============================================================
// OUTLOOK-TOKEN-REFRESH (scheduled, every 30 minutes)
// ============================================================
// Iterates all connected outlook_auth rows and refreshes any
// token expiring within 5 minutes. Runs with SERVICE_ROLE_KEY
// so it bypasses RLS. Not user-callable — the developer guard
// is not applied; instead we require a cron secret header.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/cryptoTokens.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const CLIENT_ID = Deno.env.get("OUTLOOK_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("OUTLOOK_CLIENT_SECRET") ?? "";
const TENANT_ID = Deno.env.get("OUTLOOK_TENANT_ID") ?? "common";
const SCOPES = Deno.env.get("OUTLOOK_SCOPES") ??
  "offline_access Mail.Read Mail.ReadWrite Mail.Send Contacts.Read Contacts.ReadWrite Calendars.Read User.Read";

const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

Deno.serve(async (req: Request) => {
  // Cron-only auth via secret header. Unauthorized → 404.
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Not Found", { status: 404 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: rows } = await sb
    .from("outlook_auth")
    .select("*")
    .eq("is_connected", true);

  let refreshed = 0, failed = 0;
  for (const row of rows || []) {
    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
    const minutes = (expiresAt - Date.now()) / 60000;
    if (minutes > 5 || !row.refresh_token) continue;

    try {
      const refreshToken = await decryptToken(row.refresh_token);
      const body = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: SCOPES,
      });
      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const tok = await res.json();
      if (!res.ok || !tok.access_token) {
        await sb.from("outlook_auth").update({ is_connected: false }).eq("user_id", row.user_id);
        failed++;
        continue;
      }
      const newExpires = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
      await sb.from("outlook_auth").update({
        access_token: await encryptToken(tok.access_token),
        refresh_token: tok.refresh_token ? await encryptToken(tok.refresh_token) : row.refresh_token,
        token_expires_at: newExpires,
        updated_at: new Date().toISOString(),
      }).eq("user_id", row.user_id);
      refreshed++;
    } catch {
      failed++;
    }
  }

  return new Response(JSON.stringify({ refreshed, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
