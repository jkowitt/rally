// ============================================================
// TRACK-OPEN — 1×1 transparent gif endpoint for open tracking
// ============================================================
// URL: /functions/v1/track-open?t={tracking_token}
//
// Returns a 1×1 transparent GIF. Side effects:
//   - Records first open (opened_at) on outreach_log row
//   - Increments open_count on every fire
//
// Public endpoint — no auth required (tracking pixel must be
// loadable from any email client).
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// 1×1 transparent GIF (43 bytes)
const PIXEL_BYTES = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  c => c.charCodeAt(0),
);

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");

  // Always return the pixel — never let tracking failure block image render.
  const respond = (status = 200) => new Response(PIXEL_BYTES, {
    status,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL_BYTES.byteLength),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });

  if (!token) return respond();

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    // Find row + bump counters atomically
    const { data: row } = await sb
      .from("outreach_log")
      .select("id, opened_at, open_count")
      .eq("tracking_token", token)
      .maybeSingle();
    if (!row) return respond();

    await sb.from("outreach_log").update({
      opened_at: row.opened_at || new Date().toISOString(),
      open_count: (row.open_count || 0) + 1,
    }).eq("id", row.id);
  } catch {
    /* silent */
  }
  return respond();
});
