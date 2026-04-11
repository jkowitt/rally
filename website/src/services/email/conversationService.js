import { supabase } from '@/lib/supabase'

/**
 * Email reply conversations — threads built from inbound replies to
 * campaigns/sequences plus Jason's outbound replies.
 */

export async function listConversations({
  status,
  search,
  campaignId,
  hasCrmContact,
  priority,
  limit = 100,
} = {}) {
  let q = supabase
    .from('email_conversations')
    .select('*, email_subscribers(first_name, last_name, email, organization), email_campaigns(name)')
    .order('last_message_at', { ascending: false })
    .limit(limit)
  if (status && status !== 'all') q = q.eq('status', status)
  if (campaignId) q = q.eq('campaign_id', campaignId)
  if (hasCrmContact === true) q = q.not('crm_contact_id', 'is', null)
  if (hasCrmContact === false) q = q.is('crm_contact_id', null)
  if (priority && priority !== 'all') q = q.eq('priority', priority)
  const { data, error } = await q
  if (error) return { conversations: [], error: error.message }
  // Client-side search across subject/subscriber name
  let out = data || []
  if (search) {
    const s = search.toLowerCase()
    out = out.filter(c =>
      c.subject?.toLowerCase().includes(s) ||
      c.email_subscribers?.email?.toLowerCase().includes(s) ||
      c.email_subscribers?.first_name?.toLowerCase().includes(s) ||
      c.email_subscribers?.last_name?.toLowerCase().includes(s) ||
      c.email_subscribers?.organization?.toLowerCase().includes(s)
    )
  }
  return { conversations: out }
}

export async function getConversation(id) {
  const { data, error } = await supabase
    .from('email_conversations')
    .select('*, email_subscribers(*), email_campaigns(name, subject_line), contacts(id, first_name, last_name, company), deals(id, brand_name, stage, value)')
    .eq('id', id)
    .maybeSingle()
  return error ? { conversation: null, error: error.message } : { conversation: data }
}

export async function getMessages(conversationId) {
  const { data } = await supabase
    .from('email_conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function getNotes(conversationId) {
  const { data } = await supabase
    .from('email_conversation_notes')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function addNote(conversationId, note, userId) {
  const { data, error } = await supabase
    .from('email_conversation_notes')
    .insert({ conversation_id: conversationId, note, created_by: userId })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, note: data }
}

export async function updateConversation(id, patch) {
  const { data, error } = await supabase
    .from('email_conversations')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, conversation: data }
}

export async function markAsRead(conversationId) {
  await supabase
    .from('email_conversation_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('is_read', false)
  await updateConversation(conversationId, { unread_count: 0 })
}

/**
 * Send a reply from Jason. Stores the outbound message and invokes
 * the email-marketing-send edge function with a "direct" flag so it
 * sends a single email immediately.
 */
export async function sendReply(conversationId, { subject, bodyHtml, bodyText, fromEmail, fromName }) {
  const { conversation } = await getConversation(conversationId)
  if (!conversation) return { success: false, error: 'Conversation not found' }

  const subscriberEmail = conversation.email_subscribers?.email
  if (!subscriberEmail) return { success: false, error: 'No subscriber email' }

  // Invoke send edge function in "direct" mode
  const { data, error } = await supabase.functions.invoke('email-marketing-send', {
    body: {
      mode: 'direct',
      to: subscriberEmail,
      subject,
      html: bodyHtml,
      text: bodyText,
      from_email: fromEmail,
      from_name: fromName,
      conversation_id: conversationId,
    },
  })
  if (error) return { success: false, error: error.message }

  // Store outbound message row
  const { data: msg } = await supabase
    .from('email_conversation_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'outbound',
      from_email: fromEmail,
      from_name: fromName,
      to_email: subscriberEmail,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      sent_at: new Date().toISOString(),
      provider_message_id: data?.message_id,
    })
    .select()
    .single()

  // Update conversation
  await updateConversation(conversationId, {
    last_message_at: new Date().toISOString(),
    last_message_from: 'jason',
    status: 'replied',
    unread_count: 0,
    message_count: (conversation.message_count || 0) + 1,
  })

  // If linked to a deal, create an activity row
  if (conversation.crm_deal_id) {
    await supabase.from('activities').insert({
      deal_id: conversation.crm_deal_id,
      activity_type: 'Email Sent',
      subject: subject,
      description: (bodyText || '').slice(0, 200),
      occurred_at: new Date().toISOString(),
    })
  }

  return { success: true, message: msg }
}

/** Dashboard metrics. */
export async function getConversationStats() {
  const [total, open, replied, unread] = await Promise.all([
    supabase.from('email_conversations').select('id', { count: 'exact', head: true }),
    supabase.from('email_conversations').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('email_conversations').select('id', { count: 'exact', head: true }).eq('status', 'replied'),
    supabase.from('email_conversations').select('id', { count: 'exact', head: true }).gt('unread_count', 0),
  ])
  return {
    total: total.count || 0,
    open: open.count || 0,
    replied: replied.count || 0,
    unread: unread.count || 0,
  }
}

/**
 * Call Claude via the existing contract-ai edge function to generate
 * three reply suggestions. Returns [{ tone, subject, body }, ...].
 */
export async function getSmartReplies(conversation, lastMessage) {
  const { data } = await supabase.functions.invoke('contract-ai', {
    body: {
      action: 'draft_email',
      context: {
        instructions: 'Generate 3 different reply suggestions to this email. Each should be professional but personal, under 150 words, and move toward a demo or trial conversion where appropriate. Return JSON with key "suggestions" containing an array of {tone, subject, body}. Tones should be: Direct, Warm, Curious.',
        subscriber_first_name: conversation.email_subscribers?.first_name,
        subscriber_organization: conversation.email_subscribers?.organization,
        campaign_subject: conversation.email_campaigns?.subject_line,
        last_message: (lastMessage?.body_text || lastMessage?.body_html || '').slice(0, 500),
        deal_stage: conversation.deals?.stage,
      },
    },
  })
  return data?.suggestions || []
}
