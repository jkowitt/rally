import { supabase } from '@/lib/supabase'

// Read + write helpers for the email signature stack. Order of
// preference at compose time:
//   1. per-provider signature on outlook_auth.signature_html /
//      gmail_auth.signature_html (matches the inbox the rep is
//      sending from)
//   2. profile.email_signature_html (account-wide HTML default)
//   3. profile.email_signature (legacy plain-text fallback)

export async function getEffectiveSignatures(userId) {
  if (!userId) return { html: '', plain: '', perProvider: { outlook: '', gmail: '' } }
  const [{ data: prof }, { data: outlook }, { data: gmail }] = await Promise.all([
    supabase.from('profiles').select('email_signature, email_signature_html').eq('id', userId).maybeSingle(),
    supabase.from('outlook_auth').select('signature_html').eq('user_id', userId).maybeSingle(),
    supabase.from('gmail_auth').select('signature_html').eq('user_id', userId).maybeSingle(),
  ])
  return {
    html:  prof?.email_signature_html || '',
    plain: prof?.email_signature || '',
    perProvider: {
      outlook: outlook?.signature_html || '',
      gmail:   gmail?.signature_html || '',
    },
  }
}

export function pickSignatureForProvider(sigs, provider) {
  if (provider === 'outlook' && sigs.perProvider.outlook) return { html: sigs.perProvider.outlook, isHtml: true }
  if (provider === 'gmail'   && sigs.perProvider.gmail)   return { html: sigs.perProvider.gmail,   isHtml: true }
  if (sigs.html) return { html: sigs.html, isHtml: true }
  if (sigs.plain) return { html: sigs.plain, isHtml: false }
  return { html: '', isHtml: false }
}

export async function saveProfileSignature({ userId, html, plain }) {
  const patch = {}
  if (html != null) patch.email_signature_html = html
  if (plain != null) patch.email_signature = plain
  if (Object.keys(patch).length === 0) return { success: true }
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function saveProviderSignature({ userId, provider, html }) {
  const table = provider === 'gmail' ? 'gmail_auth' : 'outlook_auth'
  const { error } = await supabase.from(table).update({ signature_html: html }).eq('user_id', userId)
  return error ? { success: false, error: error.message } : { success: true }
}

// Pull the signature Gmail already has configured for this user via
// the gmail-graph edge function. Auto-saves the primary identity's
// signature into gmail_auth.signature_html.
export async function importGmailSignature() {
  const { data, error } = await supabase.functions.invoke('gmail-graph', {
    body: { action: 'fetch_signatures' },
  })
  if (error) return { success: false, error: error.message }
  if (!data?.success) return { success: false, error: data?.error || 'Unknown error' }
  return { success: true, identities: data.identities || [], primary: data.primary_signature || '' }
}
