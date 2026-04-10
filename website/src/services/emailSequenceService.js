import { supabase } from '@/lib/supabase'
import { checkGate, logEvent } from './automationGate'

// Enroll a user into a sequence by trigger name
export async function enrollUser(userId, triggerEvent) {
  const { data: sequence } = await supabase
    .from('email_sequences')
    .select('id, name')
    .eq('trigger_event', triggerEvent)
    .eq('is_active', true)
    .maybeSingle()
  if (!sequence) return null

  const { data: existing } = await supabase
    .from('email_sequence_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('sequence_id', sequence.id)
    .maybeSingle()
  if (existing) return existing

  const { data: enrollment } = await supabase
    .from('email_sequence_enrollments')
    .insert({ user_id: userId, sequence_id: sequence.id })
    .select()
    .single()

  await logEvent('email', 'sequence_enrolled', 'sent', { user_id: userId, sequence_name: sequence.name })
  return enrollment
}

// Queue the next email for a user's active enrollments
export async function queueDueEmails() {
  if (!(await checkGate('email', 'queue_due_emails'))) return { queued: 0 }

  const { data: enrollments } = await supabase
    .from('email_sequence_enrollments')
    .select('*, email_sequences(id, name)')
    .eq('completed', false)
    .eq('unsubscribed', false)
    .eq('paused', false)
  if (!enrollments?.length) return { queued: 0 }

  let queued = 0
  for (const enroll of enrollments) {
    const daysSinceEnroll = Math.floor((Date.now() - new Date(enroll.enrolled_at).getTime()) / 86400000)
    // Get next unsent email
    const { data: nextEmails } = await supabase
      .from('email_sequence_emails')
      .select('*')
      .eq('sequence_id', enroll.sequence_id)
      .lte('day_offset', daysSinceEnroll)
      .order('day_offset', { ascending: true })
    const nextIndex = enroll.current_email_index
    const email = nextEmails?.[nextIndex]
    if (!email) continue

    // Idempotency: check if already queued
    const { data: existingSend } = await supabase
      .from('email_sends')
      .select('id')
      .eq('enrollment_id', enroll.id)
      .eq('email_index', nextIndex)
      .maybeSingle()
    if (existingSend) continue

    await supabase.from('email_sends').insert({
      enrollment_id: enroll.id,
      user_id: enroll.user_id,
      email_index: nextIndex,
      subject: email.subject,
      scheduled_for: new Date().toISOString(),
      status: 'queued',
    })
    queued++
  }
  await logEvent('email', 'queue_due_emails', 'sent', { queued })
  return { queued }
}

export async function sendQueuedEmail(sendId) {
  if (!(await checkGate('email', 'send_email'))) return { skipped: true }

  const { data: send } = await supabase
    .from('email_sends')
    .select('*, email_sequence_enrollments(user_id, sequence_id, current_email_index)')
    .eq('id', sendId)
    .maybeSingle()
  if (!send || send.status === 'sent') return { alreadySent: true }

  // Get user email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, unsubscribed_marketing')
    .eq('id', send.user_id)
    .maybeSingle()
  if (!profile?.email || profile.unsubscribed_marketing) {
    await supabase.from('email_sends').update({ status: 'skipped' }).eq('id', sendId)
    return { skipped: true }
  }

  // Get email content
  const { data: email } = await supabase
    .from('email_sequence_emails')
    .select('*')
    .eq('sequence_id', send.email_sequence_enrollments.sequence_id)
    .eq('day_offset', (await supabase.from('email_sequence_emails').select('day_offset').eq('sequence_id', send.email_sequence_enrollments.sequence_id).order('day_offset').range(send.email_index, send.email_index)).data?.[0]?.day_offset || 0)
    .maybeSingle()

  try {
    // Use existing send-email edge function
    await supabase.functions.invoke('send-email', {
      body: {
        to: profile.email,
        subject: send.subject,
        body: email?.body_html || email?.body_text || 'No content',
      },
    })
    await supabase.from('email_sends').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    }).eq('id', sendId)
    // Advance enrollment
    await supabase.from('email_sequence_enrollments')
      .update({ current_email_index: send.email_index + 1 })
      .eq('id', send.enrollment_id)
    await logEvent('email', 'send_email', 'sent', { user_id: send.user_id, email: profile.email, subject: send.subject })
    return { sent: true }
  } catch (err) {
    await supabase.from('email_sends').update({ status: 'failed' }).eq('id', sendId)
    await logEvent('email', 'send_email', 'failed', { user_id: send.user_id }, err.message)
    return { failed: true, error: err.message }
  }
}

export async function unsubscribe(userId) {
  await supabase.from('profiles').update({ unsubscribed_marketing: true }).eq('id', userId)
  await supabase.from('email_sequence_enrollments').update({ unsubscribed: true }).eq('user_id', userId)
}
