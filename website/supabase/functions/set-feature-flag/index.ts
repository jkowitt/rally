// ============================================================
// SET-FEATURE-FLAG
// ============================================================
// Developer-only feature flag write path using the service role
// key to bypass RLS and CHECK constraints.
//
// Contract:
//   POST body: { module: string, enabled: boolean }
//          OR: { action: 'ping' }  — health check, minimal auth
//   Response: ALWAYS 200 status. Body shape:
//     { success: true, module, enabled, row, diagnostics }
//     { success: false, error, details?, hint?, diagnostics }
//
// Note on the 200-always response: a previous version returned
// bare 404 on any auth failure. That caused every auth failure
// to look identical to the client — "Edge Function returned a
// non-2xx status code" with no way to tell why. Since this
// function is developer-only and authentication is enforced in
// the response body, using 200+JSON makes debugging possible
// without weakening security in any meaningful way.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Per-request diagnostics — returned in every response so failing
  // calls can be traced end-to-end without dashboard access.
  const diagnostics: { steps: string[]; errors: string[] } = {
    steps: ["start"],
    errors: [],
  };

  try {
    // ─── Environment sanity check ─────────────────────────
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({
        success: false,
        error: "env_not_configured",
        details: `SUPABASE_URL=${SUPABASE_URL ? "set" : "missing"}, SERVICE_KEY=${SERVICE_KEY ? "set" : "missing"}`,
        diagnostics,
      });
    }
    diagnostics.steps.push("env_ok");

    // ─── Authenticate caller ──────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return json({
        success: false,
        error: "missing_auth_header",
        diagnostics,
      });
    }
    diagnostics.steps.push("has_jwt");

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userRes?.user) {
      return json({
        success: false,
        error: "invalid_jwt",
        details: userErr?.message,
        diagnostics,
      });
    }
    const userId = userRes.user.id;
    diagnostics.steps.push("jwt_valid");

    // ─── Parse body early so we can branch on action ──────
    let body: any = {};
    try {
      body = await req.json();
    } catch (err) {
      diagnostics.errors.push(`body_parse: ${err?.message || err}`);
      body = {};
    }
    diagnostics.steps.push("body_parsed");

    // ─── Ping action — auth + reach check only ────────────
    // No profile check, no write. Used by the AutoQA engine
    // health probe to verify the function responds.
    if (body.action === "ping") {
      return json({
        success: true,
        ping: true,
        user_id: userId,
        diagnostics,
      });
    }

    // ─── Verify developer role ────────────────────────────
    const { data: profile, error: profErr } = await sb
      .from("profiles")
      .select("role, email")
      .eq("id", userId)
      .maybeSingle();

    if (profErr) {
      return json({
        success: false,
        error: "profile_query_failed",
        details: profErr.message,
        code: profErr.code,
        diagnostics,
      });
    }
    if (!profile) {
      return json({
        success: false,
        error: "profile_not_found",
        details: `No row in profiles for id=${userId}`,
        diagnostics,
      });
    }
    diagnostics.steps.push(`role_${profile.role}`);

    if (profile.role !== "developer") {
      return json({
        success: false,
        error: "not_developer",
        details: `role=${profile.role}`,
        diagnostics,
      });
    }

    // ─── Validate body for write operation ────────────────
    const mod = body.module;
    const enabled = Boolean(body.enabled);
    if (typeof mod !== "string" || mod.length === 0) {
      return json({
        success: false,
        error: "missing_or_invalid_module",
        diagnostics,
      });
    }
    if (mod.length > 64) {
      return json({ success: false, error: "module_name_too_long", diagnostics });
    }
    // Whitelist: alphanumeric + underscore
    if (!/^[a-z0-9_]+$/i.test(mod)) {
      return json({
        success: false,
        error: "invalid_module_chars",
        details: "module name must be alphanumeric + underscore",
        diagnostics,
      });
    }
    diagnostics.steps.push("validated");

    // ─── Upsert with service role (bypasses RLS) ──────────
    // last_flipped_by is populated for audit trail. The DB
    // trigger (migration 064) sets last_flipped_at automatically
    // when the enabled column changes.
    const { data, error } = await sb
      .from("feature_flags")
      .upsert(
        {
          module: mod,
          enabled,
          updated_at: new Date().toISOString(),
          last_flipped_by: userId,
        },
        { onConflict: "module" }
      )
      .select()
      .single();

    if (error) {
      diagnostics.steps.push("upsert_failed");
      diagnostics.errors.push(`upsert: ${error.message}`);
      const hint = error.code === "23514"
        ? "CHECK constraint blocks this module name. Run migration 058 to drop feature_flags_module_check."
        : error.code === "42501"
        ? "RLS blocked even the service role — check that SUPABASE_SERVICE_ROLE_KEY is correctly set."
        : null;
      return json({
        success: false,
        error: error.message,
        code: error.code,
        hint,
        diagnostics,
      });
    }

    diagnostics.steps.push("upsert_success");
    return json({
      success: true,
      module: mod,
      enabled,
      row: data,
      diagnostics,
    });
  } catch (err) {
    diagnostics.errors.push(`exception: ${err?.message || err}`);
    return json({
      success: false,
      error: "uncaught_exception",
      details: String(err?.message || err),
      diagnostics,
    });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
