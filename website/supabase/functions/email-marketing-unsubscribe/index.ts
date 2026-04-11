// ============================================================
// EMAIL-MARKETING-UNSUBSCRIBE
// ============================================================
// Public token-based one-click unsubscribe. No auth required.
// Reachable from the unsubscribe_url in every outgoing email.
//
// GET  /functions/v1/email-marketing-unsubscribe?token=<t>
//   → returns {success, email, first_name} JSON (used by the
//     public /unsubscribe/:token React page)
// POST /functions/v1/email-marketing-unsubscribe
//   { token, reason? } → performs the unsubscribe
//
// Also supports POST from RFC 8058 List-Unsubscribe-Post headers
// (which some mail clients use for one-click unsubscribe).
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ success: false, error: "missing_token" }, 200);

    const { data: sub } = await sb
      .from("email_subscribers")
      .select("id, email, first_name, status")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (!sub) return json({ success: false, error: "invalid_token" }, 200);
    return json({
      success: true,
      email: sub.email,
      first_name: sub.first_name,
      already_unsubscribed: sub.status === "unsubscribed",
    });
  }

  if (req.method === "POST") {
    let body: any = {};
    try { body = await req.json(); } catch {}

    // Also parse form data for mail clients that POST as form-encoded
    if (!body.token) {
      try {
        const form = await req.formData();
        body.token = form.get("token");
        body.reason = form.get("reason");
      } catch {}
    }

    if (!body.token) return json({ success: false, error: "missing_token" }, 200);

    const { data: sub } = await sb
      .from("email_subscribers")
      .select("id, email")
      .eq("unsubscribe_token", body.token)
      .maybeSingle();
    if (!sub) return json({ success: false, error: "invalid_token" }, 200);

    await sb.from("email_subscribers").update({
      status: "unsubscribed",
      global_unsubscribe: true,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: body.reason || "user_request",
      updated_at: new Date().toISOString(),
    }).eq("id", sub.id);

    await sb.from("email_suppression_list").upsert(
      { email: sub.email.toLowerCase(), reason: "unsubscribed" },
      { onConflict: "email" }
    );

    await sb.from("email_subscriber_events").insert({
      subscriber_id: sub.id,
      event_type: "unsubscribed",
      metadata: { reason: body.reason || "user_request" },
    });

    // Also pause any sequence enrollments
    const { data: fullSub } = await sb
      .from("email_subscribers")
      .select("loud_legacy_user_id")
      .eq("id", sub.id)
      .single();
    if (fullSub?.loud_legacy_user_id) {
      await sb.from("email_sequence_enrollments").update({ unsubscribed: true })
        .eq("user_id", fullSub.loud_legacy_user_id);
    }

    return json({ success: true });
  }

  return new Response("Not Found", { status: 404 });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
