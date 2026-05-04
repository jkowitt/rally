// ============================================================
// UNSUBSCRIBE — public endpoint for one-click unsubscribe
// ============================================================
// URL: /functions/v1/unsubscribe?t={tracking_token}
//
// Reuses outreach_log.tracking_token (already issued at send time)
// so a one-click link in every email can mark the contact's
// unsubscribed_at timestamp without auth.
//
// Returns a small HTML page confirming the action. Side effects:
//   - contact.unsubscribed_at = now
//   - outreach_log.unsubscribed_via_id = the log row's id
//   - all that contact's active sequence_enrollments paused with
//     reason='unsubscribed' (handled by the runner on next pass)
//
// CAN-SPAM-compliant: action is idempotent and one-click.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (!token) return htmlResponse(renderPage("Invalid link", "This unsubscribe link is missing its token."));

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: log } = await sb
    .from("outreach_log")
    .select("id, contact_id, property_id, to_email")
    .eq("tracking_token", token)
    .maybeSingle();

  if (!log?.contact_id) {
    return htmlResponse(renderPage("Already done", "You've been removed. No further messages will be sent."));
  }

  // Mark contact unsubscribed (idempotent).
  await sb.from("contacts")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", log.contact_id);

  // Stamp the source row.
  await sb.from("outreach_log")
    .update({ unsubscribed_via_id: log.id })
    .eq("id", log.id);

  return htmlResponse(renderPage(
    "Unsubscribed",
    `${log.to_email || "You"} won't receive any more outreach from this property. If this was a mistake, reply to the last email and we'll re-add you manually.`,
  ));
});

function htmlResponse(html: string) {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function renderPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 6rem auto; padding: 0 1.5rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 0.75rem; }
    p { line-height: 1.6; color: #555; }
    .ok { color: #1f7a4d; font-weight: 600; }
  </style>
</head>
<body>
  <h1 class="ok">${escapeHtml(title)}</h1>
  <p>${escapeHtml(body)}</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}
