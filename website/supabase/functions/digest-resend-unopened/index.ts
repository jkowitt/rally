// ============================================================
// DIGEST-RESEND-UNOPENED
// ============================================================
// Re-sends a Digest issue to subscribers who never opened the
// original campaign. Creates a new email_campaigns row (so the
// resend is tracked separately) with a fresh subject line, and
// scopes the recipient list to the previously-unopened subs.
//
// Input body: { issue_id: uuid, new_subject?: string, min_age_hours?: number }
//   - issue_id: required — the digest_issues row to resend
//   - new_subject: optional — defaults to "Did you see this? " + issue.title
//   - min_age_hours: optional — only resend if original was sent >= N hours ago
//                    default 72 (3 days)
//
// Returns: { success, campaign_id, recipients_count, unopened_emails[] }
//
// Auth: developer-only. Triggered from the DigestEditor UI.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ success: false, error: "env_not_configured" });
    }

    // ─── Developer auth ─────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ success: false, error: "missing_auth" }, 401);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userRes?.user) return json({ success: false, error: "invalid_jwt" }, 401);

    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", userRes.user.id)
      .maybeSingle();
    if (!profile || !["developer", "admin", "businessops"].includes(profile.role)) {
      return json({ success: false, error: "not_authorized" }, 403);
    }

    // ─── Parse body ─────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const issueId = body.issue_id;
    const newSubject = (body.new_subject || "").trim();
    const minAgeHours = Number.isFinite(body.min_age_hours) ? body.min_age_hours : 72;

    if (!issueId) return json({ success: false, error: "missing_issue_id" }, 400);

    // ─── Fetch the issue ────────────────────────────────
    const { data: issue, error: issueErr } = await sb
      .from("digest_issues")
      .select("*")
      .eq("id", issueId)
      .maybeSingle();
    if (issueErr || !issue) {
      return json({ success: false, error: "issue_not_found", details: issueErr?.message }, 404);
    }
    if (!issue.email_campaign_id) {
      return json({ success: false, error: "issue_never_sent" }, 400);
    }

    // ─── Fetch the original campaign (template + timing) ───
    const { data: originalCampaign, error: campErr } = await sb
      .from("email_campaigns")
      .select("*")
      .eq("id", issue.email_campaign_id)
      .maybeSingle();
    if (campErr || !originalCampaign) {
      return json({ success: false, error: "campaign_not_found", details: campErr?.message }, 404);
    }

    // Age guard — don't resend if the original is too fresh
    const sentAt = originalCampaign.sent_at || issue.email_sent_at;
    if (sentAt) {
      const ageMs = Date.now() - new Date(sentAt).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours < minAgeHours) {
        return json({
          success: false,
          error: "too_soon",
          details: `Original was sent ${ageHours.toFixed(1)}h ago; min_age_hours=${minAgeHours}`,
        }, 400);
      }
    }

    // ─── Find unopened recipients ───────────────────────
    // "Unopened" = rows in email_campaign_sends for this campaign
    // where status='sent' (or 'delivered') AND opened_at is null.
    // We exclude bounced/complained/unsubscribed — resending to
    // those is both wasteful and a reputation hit.
    const { data: unopenedSends, error: unopErr } = await sb
      .from("email_campaign_sends")
      .select("id, email, subscriber_id")
      .eq("campaign_id", originalCampaign.id)
      .in("status", ["sent", "delivered"])
      .is("opened_at", null)
      .is("bounced_at", null)
      .is("unsubscribed_at", null);

    if (unopErr) {
      return json({ success: false, error: "fetch_unopened_failed", details: unopErr.message });
    }
    if (!unopenedSends || unopenedSends.length === 0) {
      return json({ success: true, recipients_count: 0, message: "no_unopened" });
    }

    // ─── Create the resend campaign ─────────────────────
    const defaultSubject = `Did you see this? ${issue.title}`;
    const subject = newSubject || defaultSubject;

    const { data: resendCampaign, error: createErr } = await sb
      .from("email_campaigns")
      .insert({
        name: `Digest RESEND: ${issue.title}`,
        subject_line: subject,
        preview_text: originalCampaign.preview_text,
        from_name: originalCampaign.from_name,
        from_email: originalCampaign.from_email,
        reply_to_email: originalCampaign.reply_to_email,
        html_content: originalCampaign.html_content,
        plain_text_content: originalCampaign.plain_text_content,
        list_ids: [],  // targeting specific recipients instead of a list
        status: "draft",
        campaign_type: "resend",
        tags: ["digest", "resend", issue.industry].filter(Boolean),
        parent_campaign_id: originalCampaign.id,
        created_by: userRes.user.id,
      })
      .select()
      .single();

    if (createErr) {
      return json({ success: false, error: "campaign_create_failed", details: createErr.message });
    }

    // ─── Pre-create the sends rows for the unopened subset ──
    // email-marketing-send picks these up when status='pending'
    // for a given campaign_id. By pre-creating them we bypass
    // the list-based expansion and target exactly the unopened
    // subs.
    const sendRows = unopenedSends.map((s: any) => ({
      campaign_id: resendCampaign.id,
      subscriber_id: s.subscriber_id,
      email: s.email,
      status: "pending",
    }));

    const { error: sendsErr } = await sb.from("email_campaign_sends").insert(sendRows);
    if (sendsErr) {
      // Roll back the campaign row so we don't leave an orphan
      await sb.from("email_campaigns").delete().eq("id", resendCampaign.id);
      return json({ success: false, error: "sends_insert_failed", details: sendsErr.message });
    }

    // ─── Trigger email-marketing-send ───────────────────
    // email-marketing-send drains email_campaign_sends rows where
    // status='pending' for the given campaign_id. Since we pre-
    // inserted exactly the unopened subset above, it will target
    // only those recipients without doing any list expansion.
    const { error: invokeErr } = await sb.functions.invoke("email-marketing-send", {
      body: { campaign_id: resendCampaign.id },
    });

    if (invokeErr) {
      return json({
        success: true,
        campaign_id: resendCampaign.id,
        recipients_count: sendRows.length,
        warning: "invoke_send_failed",
        details: invokeErr.message,
      });
    }

    return json({
      success: true,
      campaign_id: resendCampaign.id,
      recipients_count: sendRows.length,
      subject,
    });
  } catch (err) {
    return json({
      success: false,
      error: "uncaught",
      details: String((err as Error)?.message || err),
    }, 500);
  }
});
