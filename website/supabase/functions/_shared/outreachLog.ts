// ============================================================
// Shared helper for writing outreach_log rows from sync + send
// edge functions (outlook-graph, gmail-graph). Keeps the
// dedup/upsert logic + tracking token generation in one place.
// ============================================================

interface LogArgs {
  sb: any
  propertyId: string | null
  userId: string
  provider: 'outlook' | 'gmail' | 'manual'
  direction: 'outbound' | 'inbound'
  messageId?: string | null
  threadId?: string | null
  contactId?: string | null
  dealId?: string | null
  toEmail?: string | null
  toName?: string | null
  subject?: string | null
  bodyPreview?: string | null
  sentAt?: string | null
  trackingToken?: string | null
  sequenceEnrollmentId?: string | null
  sequenceStepIndex?: number | null
  variantId?: string | null
}

export async function logOutreach(args: LogArgs): Promise<string | null> {
  const {
    sb, propertyId, userId, provider, direction, messageId, threadId,
    contactId, dealId, toEmail, toName, subject, bodyPreview, sentAt,
    trackingToken, sequenceEnrollmentId, sequenceStepIndex, variantId,
  } = args
  if (!propertyId) return null
  const row: any = {
    property_id: propertyId,
    user_id: userId,
    contact_id: contactId ?? null,
    deal_id: dealId ?? null,
    provider,
    direction,
    message_id: messageId ?? null,
    thread_id: threadId ?? null,
    to_email: toEmail ?? null,
    to_name: toName ?? null,
    subject: subject ?? null,
    body_preview: (bodyPreview || '').slice(0, 500) || null,
    sent_at: sentAt ?? new Date().toISOString(),
    tracking_token: trackingToken ?? null,
    sequence_enrollment_id: sequenceEnrollmentId ?? null,
    sequence_step_index: sequenceStepIndex ?? null,
    variant_id: variantId ?? null,
  }
  // Dedup on (provider, message_id) when present, else plain insert.
  if (messageId) {
    const { data, error } = await sb
      .from('outreach_log')
      .upsert(row, { onConflict: 'provider,message_id', ignoreDuplicates: true })
      .select('id')
      .maybeSingle()
    if (error) return null
    return data?.id ?? null
  }
  const { data } = await sb.from('outreach_log').insert(row).select('id').maybeSingle()
  return data?.id ?? null
}

// Generate a unique tracking token suitable for embedding in a
// tracking pixel URL. Lowercase hex, 32 chars.
export function generateTrackingToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Inject a 1x1 tracking pixel + a CAN-SPAM-compliant unsubscribe
// footer at the end of an HTML body. Safe to call with non-HTML
// bodies (returns unchanged for plain text).
export function injectTrackingPixel(
  body: string,
  trackingBaseUrl: string,
  token: string,
): string {
  const pixelUrl = `${trackingBaseUrl}/functions/v1/track-open?t=${encodeURIComponent(token)}`
  const unsubUrl = `${trackingBaseUrl}/functions/v1/unsubscribe?t=${encodeURIComponent(token)}`
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`
  const footer =
    `<div style="font-size:11px;color:#777;margin-top:24px;padding-top:12px;border-top:1px solid #eee;">` +
    `Don't want to hear from us? <a href="${unsubUrl}" style="color:#777;">Unsubscribe</a>.` +
    `</div>`
  const looksHtml = /<\/?(html|body|p|div|br|table|span)\b/i.test(body)
  if (!looksHtml) return body
  if (body.includes('</body>')) return body.replace('</body>', `${footer}${pixel}</body>`)
  return body + footer + pixel
}

// Convert a plain-text body to minimal HTML so the tracking pixel +
// link rewriter can fire. Without this, every plain-text email goes
// out unmeasured. Treats blank-line breaks as paragraphs and single
// newlines as <br>; auto-detects bare URLs and wraps them in <a>
// tags so click tracking captures them too. Idempotent — if the
// body already contains common HTML tags, returns it unchanged.
const HTML_TAG_RE = /<\/?(html|body|p|div|br|table|span|a|h[1-6]|ul|ol|li)\b/i
export function plainTextToHtml(body: string): string {
  if (!body) return body
  if (HTML_TAG_RE.test(body)) return body

  // Escape HTML-special chars first so user content doesn't break markup.
  const escape = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Auto-link bare URLs (http://, https://, www.) so they become
  // anchor tags and rewriteLinksForTracking can wrap them.
  const linkify = (s: string) => s.replace(
    /((?:https?:\/\/|www\.)[^\s<]+)/g,
    (match) => {
      const href = match.startsWith('www.') ? `https://${match}` : match
      return `<a href="${href}">${match}</a>`
    },
  )

  const paragraphs = body
    .split(/\n{2,}/)
    .map(p => `<p>${linkify(escape(p)).replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
  return `<div>${paragraphs}</div>`
}

// Rewrite all <a href="..."> URLs to route through track-click so
// we can record clicks. URLs already pointed at our domain are
// left alone. Only rewrites in HTML bodies.
export function rewriteLinksForTracking(
  body: string,
  trackingBaseUrl: string,
  token: string,
): string {
  if (!/<a\s/i.test(body)) return body
  return body.replace(
    /(<a\b[^>]*\bhref=["'])([^"']+)(["'])/gi,
    (_match, pre, url, post) => {
      // Skip mailto:/tel: + anchor links + already-tracked links
      if (/^(mailto:|tel:|#|javascript:)/i.test(url)) return `${pre}${url}${post}`
      if (url.startsWith(trackingBaseUrl)) return `${pre}${url}${post}`
      const wrapped = `${trackingBaseUrl}/functions/v1/track-click?t=${encodeURIComponent(token)}&u=${encodeURIComponent(url)}`
      return `${pre}${wrapped}${post}`
    },
  )
}
