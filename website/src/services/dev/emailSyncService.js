import { supabase } from '@/lib/supabase'
import * as graph from './outlookGraphService'

/**
 * High-level sync operations called from the UI.
 */

export async function forceSyncNow() {
  return await graph.runDeltaSync()
}

export async function runFullSync(days = 90) {
  return await graph.runFullSync({ days })
}

/** Emails that aren't yet linked to a contact or deal and aren't ignored. */
export async function getUnlinkedEmails({ folder, limit = 100 } = {}) {
  let q = supabase
    .from('outlook_emails')
    .select('id, outlook_message_id, subject, from_email, from_name, to_emails, body_preview, received_at, sent_at, folder, is_sent, has_attachments, conversation_id')
    .is('linked_contact_id', null)
    .eq('ignored', false)
    .order('received_at', { ascending: false })
    .limit(limit)
  if (folder && folder !== 'all') q = q.eq('folder', folder)
  const { data, error } = await q
  if (error) return { emails: [], error: error.message }
  return { emails: data || [] }
}

export async function getEmailDetail(id) {
  const { data, error } = await supabase
    .from('outlook_emails')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) return { email: null, error: error.message }
  return { email: data }
}

/** Emails in the same conversation thread. */
export async function getConversation(conversationId) {
  if (!conversationId) return { emails: [] }
  const { data, error } = await supabase
    .from('outlook_emails')
    .select('id, subject, from_email, from_name, to_emails, body_preview, received_at, is_sent')
    .eq('conversation_id', conversationId)
    .order('received_at', { ascending: true })
  if (error) return { emails: [], error: error.message }
  return { emails: data || [] }
}

/**
 * Link an email to an existing contact (and optionally deal).
 * Also writes an activity record so the deal timeline updates.
 */
export async function linkEmailToContact({ emailId, contactId, dealId = null }) {
  const { data: email } = await supabase
    .from('outlook_emails')
    .select('*')
    .eq('id', emailId)
    .single()
  if (!email) return { success: false, error: 'Email not found' }

  const { error: updErr } = await supabase
    .from('outlook_emails')
    .update({
      linked_contact_id: contactId,
      linked_deal_id: dealId,
      manually_linked: true,
      auto_linked: false,
      crm_logged: true,
      crm_logged_at: new Date().toISOString(),
    })
    .eq('id', emailId)
  if (updErr) return { success: false, error: updErr.message }

  // Bump contact last_contacted_at
  await supabase
    .from('contacts')
    .update({ last_contacted_at: email.received_at || email.sent_at || new Date().toISOString() })
    .eq('id', contactId)

  // Write an activity row so the deal timeline picks this up naturally.
  if (dealId) {
    await supabase.from('activities').insert({
      deal_id: dealId,
      activity_type: email.is_sent ? 'Email Sent' : 'Email',
      subject: email.subject || '(no subject)',
      description: email.body_preview || '',
      occurred_at: email.received_at || email.sent_at || new Date().toISOString(),
    })
  }

  return { success: true }
}

/** Ignore an email — removes from unlinked queue without deleting. */
export async function ignoreEmail(emailId) {
  const { error } = await supabase
    .from('outlook_emails')
    .update({ ignored: true })
    .eq('id', emailId)
  return error ? { success: false, error: error.message } : { success: true }
}

/** Un-ignore — restores to unlinked list. */
export async function unignoreEmail(emailId) {
  const { error } = await supabase
    .from('outlook_emails')
    .update({ ignored: false })
    .eq('id', emailId)
  return error ? { success: false, error: error.message } : { success: true }
}

/** Search contacts by name or email for manual linking. */
export async function searchContacts(query, limit = 10) {
  if (!query || query.length < 2) return []
  const { data } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, company, deal_id')
    .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(limit)
  return data || []
}

/** Create a new contact from an email sender. */
export async function createContactFromEmail(emailId, propertyId) {
  const { data: email } = await supabase
    .from('outlook_emails')
    .select('*')
    .eq('id', emailId)
    .single()
  if (!email) return { success: false, error: 'Email not found' }

  const [firstName, ...rest] = (email.from_name || email.from_email).split(' ')
  const lastName = rest.join(' ')
  const domain = email.from_email?.split('@')[1] || ''
  const company = domain ? domain.split('.')[0] : ''

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      property_id: propertyId,
      first_name: firstName,
      last_name: lastName,
      email: email.from_email,
      company,
      last_contacted_at: email.received_at,
    })
    .select()
    .single()
  if (error) return { success: false, error: error.message }

  // Auto-link the email to the new contact
  await linkEmailToContact({ emailId, contactId: contact.id })
  return { success: true, contact }
}

/** Get the most recent sync log entries. */
export async function getRecentSyncLogs(limit = 10) {
  const { data } = await supabase
    .from('outlook_sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)
  return data || []
}
