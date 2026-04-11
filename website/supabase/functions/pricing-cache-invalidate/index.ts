// ============================================================
// PRICING-CACHE-INVALIDATE
// ============================================================
// HTTP-callable endpoint that forces all connected clients to
// refresh their pricing cache. Called automatically by /dev/pricing
// when a developer saves a change (via Supabase Realtime broadcast).
//
// This function's job is to write a new row to `pricing_cache_events`
// which clients subscribe to. The client-side hook in planLimits.js
// listens for these and calls invalidateCache().
//
// Developer role required.
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

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return new Response("Not Found", { status: 404 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userRes } = await sb.auth.getUser(jwt);
  if (!userRes?.user) return new Response("Not Found", { status: 404 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", userRes.user.id).maybeSingle();
  if (profile?.role !== "developer") return new Response("Not Found", { status: 404 });

  // Bump updated_at on a single sentinel row so realtime subscribers
  // get an event. Uses pricing_page_config — always present.
  await sb
    .from("pricing_page_config")
    .update({ updated_at: new Date().toISOString() })
    .eq("config_key", "hero_headline");

  return new Response(JSON.stringify({ success: true, invalidated_at: new Date().toISOString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
