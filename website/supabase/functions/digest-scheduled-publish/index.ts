// ============================================================
// DIGEST-SCHEDULED-PUBLISH
// ============================================================
// Cron-invoked edge function. Picks up any digest_issues rows
// where status='scheduled' AND scheduled_for <= now(), flips
// them to 'published', and triggers email-marketing-send to
// dispatch the branded HTML email to the 'digest' subscriber list.
//
// Triggered by pg_cron every 5 minutes (see migration 063). Can
// also be invoked manually from the developer console for one-off
// dry runs.
//
// Auth: accepts EITHER
//   1. Internal pg_cron call with the service role JWT (bearer)
//   2. Developer-only call (profile.role='developer') for manual runs
//
// Returns: { success, processed: [{id, slug, title, status}], errors }
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

// Minimal markdown → plain excerpt (mirrors digestMarkdown.excerpt)
function excerpt(md: string, maxChars = 300): string {
  if (!md) return "";
  const plain = md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
  return plain.length > maxChars ? plain.slice(0, maxChars - 1) + "…" : plain;
}

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Minimal version of generateDigestEmailHtml (kept in sync with
// src/services/digestIssueService.js — if you change the template
// there, update here too). Server-side copy avoids pulling the
// whole client service into Deno.
function buildHtml(issue: any, siteUrl: string): string {
  const articleUrl = `${siteUrl}/digest/${issue.slug}`;
  const preview = excerpt(issue.body_markdown, 300);
  const publishDate = issue.published_at
    ? new Date(issue.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(issue.title)}</title></head>
<body style="margin:0;padding:0;background:#F1EFE8;font-family:Georgia,'Times New Roman',serif;color:#1a1a18;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1EFE8;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#F1EFE8;">
      <tr><td style="padding:0 0 24px;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#1a1a18;">The Digest</div>
        <div style="font-family:Georgia,serif;font-size:11px;color:#7a7a75;margin-top:4px;">by Loud CRM Ventures</div>
      </td></tr>
      ${issue.featured_image_url ? `<tr><td style="padding:0 0 24px;"><img src="${issue.featured_image_url}" alt="${esc(issue.featured_image_alt || issue.title)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></td></tr>` : ""}
      <tr><td style="padding:0 0 8px;"><h1 style="font-family:Georgia,serif;font-size:32px;line-height:1.2;font-weight:700;color:#1a1a18;margin:0;">${esc(issue.title)}</h1></td></tr>
      ${issue.subtitle ? `<tr><td style="padding:0 0 16px;"><p style="font-family:Georgia,serif;font-size:18px;line-height:1.5;color:#5a5a55;margin:0;font-style:italic;">${esc(issue.subtitle)}</p></td></tr>` : ""}
      <tr><td style="padding:0 0 24px;"><div style="font-family:Georgia,serif;font-size:12px;color:#7a7a75;">${esc(issue.author || "Loud CRM Ventures")}${publishDate ? " · " + publishDate : ""}</div></td></tr>
      <tr><td style="padding:0 0 24px;"><p style="font-family:Georgia,serif;font-size:17px;line-height:1.7;color:#1a1a18;margin:0;">${esc(preview)}</p></td></tr>
      <tr><td style="padding:8px 0 40px;" align="center">
        <a href="${articleUrl}?utm_source=digest&utm_medium=email&utm_campaign=${encodeURIComponent(issue.slug)}" style="display:inline-block;background:#D85A30;color:#F1EFE8;text-decoration:none;font-family:Georgia,serif;font-size:16px;font-weight:600;padding:14px 32px;border-radius:2px;">Read Full Article →</a>
      </td></tr>
      <tr><td style="padding:0 0 32px;border-top:1px solid #d4d0c3;"></td></tr>
      <tr><td style="padding:0;font-family:Georgia,serif;font-size:12px;line-height:1.6;color:#7a7a75;text-align:center;">
        <p style="margin:0 0 8px;">You're receiving this because you subscribed to The Digest by Loud CRM Ventures.</p>
        <p style="margin:0 0 8px;">
          <a href="{{unsubscribe_url}}" style="color:#7a7a75;text-decoration:underline;">Unsubscribe</a>
          &nbsp;·&nbsp;
          <a href="${siteUrl}/digest" style="color:#7a7a75;text-decoration:underline;">The Digest Archive</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const processed: any[] = [];
  const errors: any[] = [];

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ success: false, error: "env_not_configured" });
    }

    // Auth check — either internal service-role call (pg_cron) or developer.
    // pg_cron calls this with the service role bearer, which .auth.getUser
    // will reject (no user) but we detect by comparing the token. Simpler:
    // allow the call if the Authorization header matches the service key.
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    const isServiceRole = jwt && jwt === SERVICE_KEY;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!isServiceRole) {
      if (!jwt) return json({ success: false, error: "missing_auth" }, 401);
      const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
      if (userErr || !userRes?.user) {
        return json({ success: false, error: "invalid_jwt" }, 401);
      }
      const { data: profile } = await sb
        .from("profiles")
        .select("role")
        .eq("id", userRes.user.id)
        .maybeSingle();
      if (profile?.role !== "developer") {
        return json({ success: false, error: "not_developer" }, 403);
      }
    }

    // ─── Fetch due issues ────────────────────────────────
    const nowIso = new Date().toISOString();
    const { data: due, error: dueErr } = await sb
      .from("digest_issues")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", nowIso)
      .limit(20); // safety cap per run

    if (dueErr) {
      return json({ success: false, error: "fetch_failed", details: dueErr.message });
    }

    if (!due || due.length === 0) {
      return json({ success: true, processed: [], message: "nothing_due" });
    }

    // ─── Find/create 'digest' list ───────────────────────
    let { data: lists } = await sb
      .from("email_lists")
      .select("id")
      .eq("list_type", "newsletter")
      .contains("tags", ["digest"])
      .limit(1);
    let listId = lists?.[0]?.id;
    if (!listId) {
      const { data: created } = await sb
        .from("email_lists")
        .insert({
          name: "The Digest Subscribers",
          description: "Subscribers to The Digest by Loud CRM Ventures",
          list_type: "newsletter",
          tags: ["digest"],
        })
        .select()
        .single();
      listId = created?.id;
    }

    // ─── Process each due issue ──────────────────────────
    const siteUrl = Deno.env.get("SITE_URL") || "https://loud-legacy.com";

    for (const issue of due) {
      try {
        const publishedAt = issue.published_at || nowIso;

        // Flip to published first — even if email dispatch fails, the article
        // should be live on the public archive. Email failures are logged but
        // don't block the state transition.
        const { error: updErr } = await sb
          .from("digest_issues")
          .update({
            status: "published",
            published_at: publishedAt,
            scheduled_for: null,
            updated_at: nowIso,
          })
          .eq("id", issue.id);
        if (updErr) {
          errors.push({ id: issue.id, stage: "publish", error: updErr.message });
          continue;
        }

        // Skip email if the author opted out
        if (issue.send_email_on_publish === false) {
          processed.push({ id: issue.id, slug: issue.slug, title: issue.title, emailed: false });
          continue;
        }

        // Create the campaign record
        const html = buildHtml({ ...issue, published_at: publishedAt }, siteUrl);
        const { data: campaign, error: campErr } = await sb
          .from("email_campaigns")
          .insert({
            name: `Digest: ${issue.title}`,
            subject_line: issue.title,
            preview_text: excerpt(issue.body_markdown, 120),
            from_name: "The Digest by Loud CRM",
            from_email: "digest@loud-legacy.com",
            reply_to_email: "digest@loud-legacy.com",
            html_content: html,
            plain_text_content: excerpt(issue.body_markdown, 2000),
            list_ids: listId ? [listId] : [],
            status: "draft",
            campaign_type: "regular",
            tags: ["digest", issue.industry].filter(Boolean),
          })
          .select()
          .single();

        if (campErr) {
          errors.push({ id: issue.id, stage: "campaign_create", error: campErr.message });
          continue;
        }

        // Link the campaign to the issue
        await sb
          .from("digest_issues")
          .update({
            email_campaign_id: campaign.id,
            email_sent_at: nowIso,
          })
          .eq("id", issue.id);

        // Hand off to email-marketing-send
        const { error: sendErr } = await sb.functions.invoke("email-marketing-send", {
          body: { campaign_id: campaign.id },
        });

        if (sendErr) {
          errors.push({ id: issue.id, stage: "email_send", error: sendErr.message });
          processed.push({ id: issue.id, slug: issue.slug, title: issue.title, emailed: false, campaign_id: campaign.id });
          continue;
        }

        processed.push({
          id: issue.id,
          slug: issue.slug,
          title: issue.title,
          emailed: true,
          campaign_id: campaign.id,
        });
      } catch (err) {
        errors.push({ id: issue.id, stage: "exception", error: String((err as Error)?.message || err) });
      }
    }

    return json({ success: true, processed, errors, count: processed.length });
  } catch (err) {
    return json({
      success: false,
      error: "uncaught",
      details: String((err as Error)?.message || err),
    }, 500);
  }
});
