import { supabase } from '@/lib/supabase'
import { renderMarkdown, renderCitations, slugify, excerpt, readingTime } from '@/lib/digestMarkdown'

/**
 * "The Digest by Loud Legacy Ventures" — editorial newsletter
 * management. Separate from the internal daily-digest admin
 * reports (src/services/digestService.js) which is an unrelated
 * feature with the same "digest" word.
 *
 * Reuses existing infrastructure:
 *   - email_subscribers (migration 054) — subscriber list tagged 'digest'
 *   - email_campaigns (migration 054) — dispatch record on publish
 *   - email-marketing-send edge function — delivery
 *   - email-marketing-unsubscribe — token-based unsub
 *   - email-marketing-track — open/click pixels
 *   - media storage bucket (migration 061) — image uploads
 *
 * Only digest_issues / digest_issue_images / digest_signup_events
 * are Digest-specific tables.
 */

export const INDUSTRIES = [
  { key: 'general',     label: 'General Business' },
  { key: 'real_estate', label: 'Real Estate' },
  { key: 'sports',      label: 'Sports' },
  { key: 'marketing',   label: 'Marketing' },
]

export const STATUSES = ['draft', 'scheduled', 'published', 'archived']

// ─── Issues CRUD ────────────────────────────────────────────

export async function listIssues({ status, industry, limit = 100 } = {}) {
  let q = supabase
    .from('digest_issues')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status && status !== 'all') q = q.eq('status', status)
  if (industry && industry !== 'all') q = q.eq('industry', industry)
  const { data, error } = await q
  return error ? { issues: [], error: error.message } : { issues: data || [] }
}

export async function listPublishedIssues({ industry, limit = 50 } = {}) {
  let q = supabase
    .from('digest_issues')
    .select('id, slug, title, subtitle, author, featured_image_url, featured_image_alt, industry, tags, published_at, view_count')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)
  if (industry && industry !== 'all') q = q.eq('industry', industry)
  const { data } = await q
  return data || []
}

export async function getIssue(id) {
  const { data, error } = await supabase
    .from('digest_issues')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return error ? { issue: null, error: error.message } : { issue: data }
}

export async function getIssueBySlug(slug) {
  const { data, error } = await supabase
    .from('digest_issues')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return error ? { issue: null, error: error.message } : { issue: data }
}

export async function createIssue(fields, userId) {
  const slug = fields.slug || slugify(fields.title || 'untitled-' + Date.now())
  const payload = { ...fields, slug, created_by: userId, updated_by: userId }
  const { data, error } = await supabase
    .from('digest_issues')
    .insert(payload)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, issue: data }
}

export async function updateIssue(id, patch, userId) {
  // Regenerate slug if title changed AND issue is still draft
  if (patch.title && !patch.slug) {
    const { data: existing } = await supabase
      .from('digest_issues')
      .select('status, title')
      .eq('id', id)
      .single()
    if (existing && existing.status === 'draft' && existing.title !== patch.title) {
      patch.slug = slugify(patch.title)
    }
  }
  const { data, error } = await supabase
    .from('digest_issues')
    .update({ ...patch, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, issue: data }
}

export async function deleteIssue(id) {
  const { error } = await supabase.from('digest_issues').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

// ─── Publish flow ──────────────────────────────────────────

export async function publishIssue(id, userId, { sendEmail = true } = {}) {
  const { issue } = await getIssue(id)
  if (!issue) return { success: false, error: 'Issue not found' }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('digest_issues')
    .update({
      status: 'published',
      published_at: issue.published_at || now,
      scheduled_for: null,
      updated_by: userId,
      updated_at: now,
    })
    .eq('id', id)
  if (updErr) return { success: false, error: updErr.message }

  if (sendEmail && issue.send_email_on_publish !== false) {
    const emailResult = await sendDigestEmail(id, userId)
    return { success: true, issue, emailResult }
  }
  return { success: true, issue }
}

export async function scheduleIssue(id, scheduledFor, userId) {
  const { error } = await supabase
    .from('digest_issues')
    .update({
      status: 'scheduled',
      scheduled_for: scheduledFor,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function archiveIssue(id, userId) {
  return updateIssue(id, { status: 'archived' }, userId)
}

// ─── Email template (branded HTML) ──────────────────────────

function escapeForHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Branded HTML email template. Coral #D85A30 CTA, dark #1a1a18
 * text, off-white #F1EFE8 background, Georgia serif headlines.
 * Table-based layout for Outlook/Gmail compatibility.
 *
 * {{unsubscribe_url}} is substituted per-subscriber by the
 * email-marketing-send edge function.
 */
export function generateDigestEmailHtml(issue, siteUrl = 'https://loud-legacy.com') {
  const articleUrl = `${siteUrl}/digest/${issue.slug}`
  const preview = excerpt(issue.body_markdown, 300)
  const readMins = readingTime(issue.body_markdown)
  const publishDate = issue.published_at
    ? new Date(issue.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeForHtml(issue.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F1EFE8;font-family:Georgia,'Times New Roman',serif;color:#1a1a18;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1EFE8;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#F1EFE8;">
      <tr><td style="padding:0 0 24px;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#1a1a18;">The Digest</div>
        <div style="font-family:Georgia,serif;font-size:11px;color:#7a7a75;margin-top:4px;">by Loud Legacy Ventures</div>
      </td></tr>
      ${issue.featured_image_url ? `
      <tr><td style="padding:0 0 24px;">
        <img src="${issue.featured_image_url}" alt="${escapeForHtml(issue.featured_image_alt || issue.title)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
      </td></tr>` : ''}
      <tr><td style="padding:0 0 8px;">
        <h1 style="font-family:Georgia,serif;font-size:32px;line-height:1.2;font-weight:700;color:#1a1a18;margin:0;">${escapeForHtml(issue.title)}</h1>
      </td></tr>
      ${issue.subtitle ? `
      <tr><td style="padding:0 0 16px;">
        <p style="font-family:Georgia,serif;font-size:18px;line-height:1.5;color:#5a5a55;margin:0;font-style:italic;">${escapeForHtml(issue.subtitle)}</p>
      </td></tr>` : ''}
      <tr><td style="padding:0 0 24px;">
        <div style="font-family:Georgia,serif;font-size:12px;color:#7a7a75;">
          ${escapeForHtml(issue.author || 'Loud Legacy Ventures')}${publishDate ? ' · ' + publishDate : ''}${readMins ? ' · ' + readMins + ' min read' : ''}
        </div>
      </td></tr>
      <tr><td style="padding:0 0 24px;">
        <p style="font-family:Georgia,serif;font-size:17px;line-height:1.7;color:#1a1a18;margin:0;">${escapeForHtml(preview)}</p>
      </td></tr>
      <tr><td style="padding:8px 0 40px;" align="center">
        <a href="${articleUrl}?utm_source=digest&utm_medium=email&utm_campaign=${encodeURIComponent(issue.slug)}"
           style="display:inline-block;background:#D85A30;color:#F1EFE8;text-decoration:none;font-family:Georgia,serif;font-size:16px;font-weight:600;padding:14px 32px;border-radius:2px;">
          Read Full Article →
        </a>
      </td></tr>
      <tr><td style="padding:0 0 32px;border-top:1px solid #d4d0c3;"></td></tr>
      <tr><td style="padding:0;font-family:Georgia,serif;font-size:12px;line-height:1.6;color:#7a7a75;text-align:center;">
        <p style="margin:0 0 8px;">You're receiving this because you subscribed to The Digest by Loud Legacy Ventures.</p>
        <p style="margin:0 0 8px;">
          <a href="{{unsubscribe_url}}" style="color:#7a7a75;text-decoration:underline;">Unsubscribe</a>
          &nbsp;·&nbsp;
          <a href="${siteUrl}/digest" style="color:#7a7a75;text-decoration:underline;">The Digest Archive</a>
        </p>
        <p style="margin:8px 0 0;font-size:11px;color:#a5a198;">
          Loud Legacy Ventures · [Physical address placeholder]
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Email dispatch ────────────────────────────────────────

export async function sendDigestEmail(issueId, userId) {
  const { issue } = await getIssue(issueId)
  if (!issue) return { success: false, error: 'Issue not found' }

  const html = generateDigestEmailHtml(issue)

  // Find or create "The Digest Subscribers" list
  let { data: lists } = await supabase
    .from('email_lists')
    .select('id')
    .eq('list_type', 'newsletter')
    .contains('tags', ['digest'])
    .limit(1)
  let listId = lists?.[0]?.id
  if (!listId) {
    const { data: created } = await supabase
      .from('email_lists')
      .insert({
        name: 'The Digest Subscribers',
        description: 'Subscribers to The Digest by Loud Legacy Ventures',
        list_type: 'newsletter',
        tags: ['digest'],
        created_by: userId,
      })
      .select()
      .single()
    listId = created?.id
  }

  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .insert({
      name: `Digest: ${issue.title}`,
      subject_line: issue.title,
      preview_text: excerpt(issue.body_markdown, 120),
      from_name: 'The Digest by Loud Legacy',
      from_email: 'digest@loud-legacy.com',
      reply_to_email: 'digest@loud-legacy.com',
      html_content: html,
      plain_text_content: excerpt(issue.body_markdown, 2000),
      list_ids: listId ? [listId] : [],
      status: 'draft',
      campaign_type: 'regular',
      tags: ['digest', issue.industry].filter(Boolean),
      created_by: userId,
    })
    .select()
    .single()

  if (campErr) return { success: false, error: campErr.message }

  await supabase
    .from('digest_issues')
    .update({
      email_campaign_id: campaign.id,
      email_sent_at: new Date().toISOString(),
    })
    .eq('id', issueId)

  const { data, error } = await supabase.functions.invoke('email-marketing-send', {
    body: { campaign_id: campaign.id },
  })
  if (error) return { success: false, error: error.message, campaignId: campaign.id }
  return { success: true, campaignId: campaign.id, result: data }
}

export async function sendTestEmail(issueId, testEmail) {
  const { issue } = await getIssue(issueId)
  if (!issue) return { success: false, error: 'Issue not found' }
  if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    return { success: false, error: 'Invalid test email address' }
  }

  const html = generateDigestEmailHtml(issue)
    .replace('{{unsubscribe_url}}', 'https://loud-legacy.com/unsubscribe/test')

  const { data, error } = await supabase.functions.invoke('email-marketing-send', {
    body: {
      mode: 'direct',
      to: testEmail,
      subject: `[TEST] ${issue.title}`,
      html,
      text: excerpt(issue.body_markdown, 2000),
      from_email: 'digest@loud-legacy.com',
      from_name: 'The Digest by Loud Legacy',
    },
  })
  return error ? { success: false, error: error.message } : { success: true }
}

// ─── Image upload ──────────────────────────────────────────

const BUCKET = 'media'

export async function uploadImage(file, userId, issueId = null) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `digest/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type })
  if (upErr) return { success: false, error: upErr.message }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = urlData.publicUrl

  const { data: imgRow, error: dbErr } = await supabase
    .from('digest_issue_images')
    .insert({
      issue_id: issueId,
      uploaded_by: userId,
      storage_path: path,
      public_url: publicUrl,
      original_filename: file.name,
      file_size_bytes: file.size,
    })
    .select()
    .single()

  if (dbErr) return { success: false, error: dbErr.message }
  return { success: true, image: imgRow, url: publicUrl }
}

export async function listReusableImages(limit = 60) {
  const { data } = await supabase
    .from('digest_issue_images')
    .select('*')
    .eq('is_reusable', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function deleteImage(imageId) {
  const { data: img } = await supabase
    .from('digest_issue_images')
    .select('storage_path')
    .eq('id', imageId)
    .maybeSingle()
  if (img?.storage_path) {
    await supabase.storage.from(BUCKET).remove([img.storage_path]).catch(() => {})
  }
  await supabase.from('digest_issue_images').delete().eq('id', imageId)
  return { success: true }
}

// ─── Subscriber signup (landing page) ───────────────────────

export async function signupForDigest({ email, firstName, industryInterest, source = 'landing_page' }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Invalid email address' }
  }
  const normalized = email.toLowerCase().trim()

  // Suppression list check (reuses migration 054's email_suppression_list)
  const { data: suppressed } = await supabase
    .from('email_suppression_list')
    .select('email')
    .ilike('email', normalized)
    .maybeSingle()
  if (suppressed) {
    return { success: false, error: 'This email previously unsubscribed. Contact us to re-subscribe.' }
  }

  // Upsert into existing email_subscribers
  const { data: existing } = await supabase
    .from('email_subscribers')
    .select('id, tags, status')
    .ilike('email', normalized)
    .maybeSingle()

  let subscriberId
  if (existing) {
    const newTags = Array.from(new Set([...(existing.tags || []), 'digest']))
    await supabase
      .from('email_subscribers')
      .update({
        tags: newTags,
        status: 'active',
        first_name: firstName || undefined,
        industry: industryInterest || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    subscriberId = existing.id
  } else {
    const { data: created, error: insErr } = await supabase
      .from('email_subscribers')
      .insert({
        email: normalized,
        first_name: firstName,
        industry: industryInterest,
        source: 'digest_signup',
        status: 'active',
        tags: ['digest'],
      })
      .select()
      .single()
    if (insErr) return { success: false, error: insErr.message }
    subscriberId = created.id
  }

  // Audit log
  await supabase.from('digest_signup_events').insert({
    subscriber_id: subscriberId,
    email: normalized,
    first_name: firstName,
    industry_interest: industryInterest,
    source,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    referrer: typeof document !== 'undefined' ? document.referrer : null,
  })

  // Welcome email (fire and forget)
  sendWelcomeEmail(normalized, firstName).catch(() => {})

  return { success: true, subscriberId }
}

async function sendWelcomeEmail(email, firstName) {
  const greeting = firstName ? `Welcome, ${firstName}` : 'Welcome to The Digest'
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F1EFE8;font-family:Georgia,serif;color:#1a1a18;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1EFE8;">
  <tr><td align="center" style="padding:48px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="text-align:center;padding:0 0 32px;">
        <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#1a1a18;">The Digest</div>
        <div style="font-size:11px;color:#7a7a75;margin-top:4px;">by Loud Legacy Ventures</div>
      </td></tr>
      <tr><td>
        <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;">${greeting}.</h1>
        <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Thanks for subscribing. Each month you'll receive one deeply-researched article on real estate, sports, marketing, or general business — written to be the sharpest thing in your inbox that week.</p>
        <p style="font-size:16px;line-height:1.7;margin:0 0 32px;">Your first issue will land when it's ready. No spam, no daily blasts. Just one good article.</p>
        <p style="text-align:center;margin:32px 0;">
          <a href="https://loud-legacy.com/digest" style="display:inline-block;background:#D85A30;color:#F1EFE8;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:2px;">Browse Past Issues</a>
        </p>
        <p style="font-size:13px;color:#7a7a75;margin:32px 0 0;text-align:center;">
          <a href="{{unsubscribe_url}}" style="color:#7a7a75;">Unsubscribe</a>
          &nbsp;·&nbsp; Loud Legacy Ventures
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

  return supabase.functions.invoke('email-marketing-send', {
    body: {
      mode: 'direct',
      to: email,
      subject: 'Welcome to The Digest',
      html,
      text: `${greeting}.\n\nThanks for subscribing to The Digest by Loud Legacy Ventures. Your first issue will land when it's ready.\n\nBrowse past issues: https://loud-legacy.com/digest`,
      from_email: 'digest@loud-legacy.com',
      from_name: 'The Digest by Loud Legacy',
    },
  })
}

// ─── Subscriber analytics ──────────────────────────────────

export async function getDigestSubscribers({ status = 'active', industry, limit = 1000 } = {}) {
  let q = supabase
    .from('email_subscribers')
    .select('id, email, first_name, industry, status, created_at, total_opens, total_clicks')
    .contains('tags', ['digest'])
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status && status !== 'all') q = q.eq('status', status)
  if (industry && industry !== 'all') q = q.eq('industry', industry)
  const { data } = await q
  return data || []
}

export async function getDigestStats() {
  const [total, active, unsub, thisMonth] = await Promise.all([
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).contains('tags', ['digest']),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).contains('tags', ['digest']).eq('status', 'active'),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).contains('tags', ['digest']).eq('status', 'unsubscribed'),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).contains('tags', ['digest']).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ])
  return {
    total: total.count || 0,
    active: active.count || 0,
    unsubscribed: unsub.count || 0,
    newThisMonth: thisMonth.count || 0,
  }
}

export async function exportSubscribersCsv() {
  const subscribers = await getDigestSubscribers({ status: 'all', limit: 10000 })
  const header = 'email,first_name,industry,status,created_at\n'
  const rows = subscribers.map(s =>
    [s.email, s.first_name || '', s.industry || '', s.status, s.created_at]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n')
  return header + rows
}

// ─── View tracking ─────────────────────────────────────────

export async function logArticleView(issueId) {
  try {
    await supabase.from('digest_article_views').insert({
      issue_id: issueId,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
    })
    await supabase.rpc('increment', { table_name: 'digest_issues', row_id: issueId, column_name: 'view_count' }).catch(() => {
      // Fallback: read-increment-write
      supabase.from('digest_issues').select('view_count').eq('id', issueId).single().then(({ data }) => {
        if (data) {
          supabase.from('digest_issues').update({ view_count: (data.view_count || 0) + 1 }).eq('id', issueId)
        }
      })
    })
  } catch {}
}

// ─── AI research (delegates to edge function) ──────────────

export async function researchArticle({ topic, industry, keywords }) {
  const { data, error } = await supabase.functions.invoke('digest-research', {
    body: { topic, industry, keywords },
  })
  if (error) return { success: false, error: error.message }
  if (!data?.success) return { success: false, error: data?.error || 'Research failed' }
  return {
    success: true,
    headline: data.headline,
    subheadline: data.subheadline,
    markdown: data.markdown,
    citations: data.citations || [],
  }
}

// ─── Resend to unopened ───────────────────────────────────
//
// Creates a new campaign targeting only subscribers who never
// opened the original send. Delegates to digest-resend-unopened
// edge function which builds the recipient list, pre-inserts
// pending sends, and invokes email-marketing-send.
//
// Options:
//   newSubject:   defaults to "Did you see this? {title}"
//   minAgeHours:  safety guard, default 72h (3 days)
export async function resendUnopened(issueId, { newSubject, minAgeHours = 72 } = {}) {
  const { data, error } = await supabase.functions.invoke('digest-resend-unopened', {
    body: {
      issue_id: issueId,
      new_subject: newSubject,
      min_age_hours: minAgeHours,
    },
  })
  if (error) return { success: false, error: error.message }
  if (!data?.success) return { success: false, error: data?.error || 'Resend failed', details: data?.details }
  return {
    success: true,
    campaignId: data.campaign_id,
    recipientsCount: data.recipients_count,
    subject: data.subject,
    warning: data.warning,
  }
}

// ─── Manual trigger for scheduled-publish (dry-run button) ──
//
// Normally pg_cron calls digest-scheduled-publish every 5 minutes.
// This lets a developer force-run it from the admin UI (useful
// for verifying a scheduled issue will publish correctly without
// waiting for the next cron tick).
export async function runScheduledPublishNow() {
  const { data, error } = await supabase.functions.invoke('digest-scheduled-publish', {
    body: {},
  })
  if (error) return { success: false, error: error.message }
  return data || { success: false, error: 'empty_response' }
}

// ─── Re-exports ───────────────────────────────────────────

export { renderMarkdown, renderCitations, slugify, excerpt, readingTime }
