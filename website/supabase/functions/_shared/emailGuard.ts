// Email marketing access guard for edge functions.
// Reuses the same 404-on-failure pattern as _shared/devGuard.ts.
//
// Pass `requirePublicFlag: true` to allow admin+ roles when
// email_marketing_public is on. Default requires developer + dev flag.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const notFound = () =>
  new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain" } });

export async function requireEmailMarketing(req: Request, { allowPublic = false } = {}) {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return { ok: false, response: notFound() };

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userRes?.user) return { ok: false, response: notFound() };
    const userId = userRes.user.id;

    const { data: profile } = await sb
      .from("profiles")
      .select("role, property_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return { ok: false, response: notFound() };

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

    // Developer path
    if (profile.role === "developer" && devFlag?.enabled) {
      return { ok: true, userId, sb, profile };
    }

    // Public path
    if (allowPublic && pubFlag?.enabled) {
      const okRole = ["developer", "businessops", "admin"].includes(profile.role);
      if (okRole) return { ok: true, userId, sb, profile };
    }

    return { ok: false, response: notFound() };
  } catch {
    return { ok: false, response: notFound() };
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
