// ============================================================
// TRACK-CLICK — records click + 302 redirects to the original URL
// ============================================================
// URL: /functions/v1/track-click?t={token}&u={base64url-or-encoded-url}
//
// Side effects:
//   - First click: clicked_at + click_count++ on outreach_log
//   - Insert into email_tracking_clicks with original URL + user agent
//
// Public endpoint — no auth required.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const u = url.searchParams.get("u");

  // Resolve target URL. Reject anything that doesn't look like
  // http/https to avoid open-redirect abuse.
  let target = "/";
  if (u) {
    try {
      const decoded = decodeURIComponent(u);
      if (/^https?:\/\//i.test(decoded)) target = decoded;
    } catch { /* fall through to / */ }
  }

  if (token) {
    try {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: row } = await sb
        .from("outreach_log")
        .select("id, clicked_at, click_count")
        .eq("tracking_token", token)
        .maybeSingle();
      if (row) {
        await sb.from("outreach_log").update({
          clicked_at: row.clicked_at || new Date().toISOString(),
          click_count: (row.click_count || 0) + 1,
        }).eq("id", row.id);
        await sb.from("email_tracking_clicks").insert({
          outreach_log_id: row.id,
          url: target,
          user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
          // Don't store raw IP; coarse hash for abuse detection.
          ip_hash: await hashIp(req.headers.get("x-forwarded-for") || ""),
        });
      }
    } catch { /* silent */ }
  }

  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store" },
  });
});

async function hashIp(raw: string): Promise<string | null> {
  if (!raw) return null;
  const enc = new TextEncoder().encode(raw.split(",")[0].trim());
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}
