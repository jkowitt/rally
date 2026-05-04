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
}

export async function logOutreach(args: LogArgs): Promise<string | null> {
  const {
    sb, propertyId, userId, provider, direction, messageId, threadId,
    contactId, dealId, toEmail, toName, subject, bodyPreview, sentAt,
    trackingToken, sequenceEnrollmentId, sequenceStepIndex,
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

// Inject a 1x1 tracking pixel at the end of an HTML body. Safe to
// call with non-HTML bodies (returns the body unchanged when no
// closing </body> is found and the body looks like plain text).
export function injectTrackingPixel(
  body: string,
  trackingBaseUrl: string,
  token: string,
): string {
  const pixelUrl = `${trackingBaseUrl}/functions/v1/track-open?t=${encodeURIComponent(token)}`
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`
  const looksHtml = /<\/?(html|body|p|div|br|table|span)\b/i.test(body)
  if (!looksHtml) return body
  if (body.includes('</body>')) return body.replace('</body>', `${pixel}</body>`)
  return body + pixel
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
