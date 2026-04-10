import { supabase } from '@/lib/supabase'

export const NOTIF_TYPES = {
  NEW_PAID_SIGNUP: 'new_paid_signup',
  PAYMENT_FAILURE: 'payment_failure',
  CHURN_RISK: 'churn_risk',
  HOT_LEAD: 'hot_lead',
  AUTOMATION_FAILURE: 'automation_failure',
  DAILY_DIGEST: 'daily_digest',
  UPGRADE_OPPORTUNITY: 'upgrade_opportunity',
}

export async function createNotification({ recipientId, type, title, body, link, metadata }) {
  const { data } = await supabase.from('admin_notifications').insert({
    recipient_id: recipientId,
    type,
    title,
    body,
    link,
    metadata: metadata || {},
  }).select().single()
  return data
}

// Notify all developers/admins
export async function notifyAdmins(notification) {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['developer', 'businessops', 'admin'])

  for (const admin of admins || []) {
    await createNotification({ ...notification, recipientId: admin.id })
  }
}

export async function getUnreadCount(userId) {
  const { count } = await supabase
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('read', false)
  return count || 0
}

export async function markAsRead(notificationId) {
  await supabase
    .from('admin_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
}

export async function markAllAsRead(userId) {
  await supabase
    .from('admin_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('read', false)
}

export async function getNotifications(userId, limit = 50) {
  const { data } = await supabase
    .from('admin_notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}
