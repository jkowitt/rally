// ============================================================
// SET-FEATURE-FLAG
// ============================================================
// Developer-only feature flag write path.
//
// Why this exists: direct writes to feature_flags from the browser
// depend on the exact state of RLS policies and CHECK constraints.
// Migration 002 only added SELECT + UPDATE policies. Migration 045
// added a CHECK constraint locking module names. Migration 058
// (recent) fixes both — but the UI should not silently fail if
// an older environment hasn't applied 058 yet.
//
// This function uses the service role key to upsert the row,
// bypassing RLS and CHECK constraints entirely. It still enforces
// developer-role authentication server-side so only the same users
// who CAN write via direct-DB paths can write here too.
//
// Contract:
//   POST body: { module: string, enabled: boolean }
//   Response: { success: boolean, module, enabled, error? }
//
// Returns 404 (not 403) for unauthorized callers so the endpoint
// appears not to exist.
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

  try {
    // ─── Authenticate caller ──────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return notFound();

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userRes?.user) return notFound();
    const userId = userRes.user.id;

    // ─── Verify developer role ────────────────────────────
    const { data: profile } = await sb
      .from("profiles")
      .select("role, email")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return notFound();
    if (profile.role !== "developer") return notFound();

    // ─── Parse + validate body ────────────────────────────
    const body = await req.json();
    const mod = body.module;
    const enabled = Boolean(body.enabled);
    if (typeof mod !== "string" || mod.length === 0) {
      return json({ success: false, error: "missing or invalid module" }, 200);
    }
    if (mod.length > 64) {
      return json({ success: false, error: "module name too long" }, 200);
    }
    // Whitelist module name characters to prevent any shenanigans
    if (!/^[a-z0-9_]+$/i.test(mod)) {
      return json({ success: false, error: "module name must be alphanumeric + underscore" }, 200);
    }

    // ─── Drop the CHECK constraint on first write if it still exists ─
    // Best-effort — if it already doesn't exist, this is a no-op.
    // Wrapped in its own try/catch so a permission error on the
    // ALTER TABLE doesn't block the actual flag write.
    try {
      await sb.rpc("drop_feature_flags_check_if_exists").catch(() => {});
    } catch {
      // Ignore — the RPC may not exist. The upsert below will fail
      // with a CHECK constraint error if the constraint is still
      // present, and we'll surface that clearly.
    }

    // ─── Upsert with service role (bypasses RLS) ──────────
    const { data, error } = await sb
      .from("feature_flags")
      .upsert(
        {
          module: mod,
          enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "module" }
      )
      .select()
      .single();

    if (error) {
      // Surface the real Postgres error so the UI can display
      // an actionable message
      const hint = error.code === "23514"
        ? "CHECK constraint blocks this module name — run: ALTER TABLE feature_flags DROP CONSTRAINT feature_flags_module_check"
        : error.code === "42501"
        ? "RLS blocked even the service role — this should be impossible, check service role key"
        : null;
      return json({
        success: false,
        error: error.message,
        code: error.code,
        hint,
      }, 200);
    }

    return json({ success: true, module: mod, enabled, row: data });
  } catch (err) {
    return json({ success: false, error: String(err?.message || err) }, 200);
  }
});

function notFound() {
  return new Response("Not Found", { status: 404 });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
