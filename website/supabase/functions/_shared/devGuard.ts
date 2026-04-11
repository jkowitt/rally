// Shared developer-role + feature-flag guard for all /dev edge functions.
//
// Behavior:
//  - Extracts the caller's auth JWT from the Authorization header.
//  - Looks up profiles.role using a service-role Supabase client (bypassing RLS).
//  - Verifies role = 'developer'.
//  - Verifies feature_flags.outlook_integration is ON.
//  - On ANY failure, returns 404 (not 403) so the endpoint appears
//    not to exist to non-developer callers.
//
// Usage:
//   const guard = await requireDeveloper(req);
//   if (!guard.ok) return guard.response;  // 404 response object
//   const { userId, sb } = guard;          // developer user id + service client

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const notFound = () =>
  new Response("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });

export async function requireDeveloper(req: Request, { requireFlag = true } = {}) {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return { ok: false, response: notFound() };

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify JWT and get user
    const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userRes?.user) return { ok: false, response: notFound() };
    const userId = userRes.user.id;

    // Verify role
    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || profile.role !== "developer") {
      return { ok: false, response: notFound() };
    }

    // Verify feature flag (unless caller opts out — used by /dev/feature-flags)
    if (requireFlag) {
      const { data: flag } = await sb
        .from("feature_flags")
        .select("enabled")
        .eq("module", "outlook_integration")
        .maybeSingle();
      if (!flag?.enabled) return { ok: false, response: notFound() };
    }

    return { ok: true, userId, sb };
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
