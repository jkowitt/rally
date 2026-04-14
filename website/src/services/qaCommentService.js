import { supabase } from '@/lib/supabase'

/**
 * Ad-hoc QA walkthrough comments. Separate from the structured
 * qa_test_cases workflow — this is for quick "leave me a note
 * about this page" feedback while walking the site.
 */

export const CATEGORIES = [
  { key: 'bug',        label: 'Bug',        color: 'danger',  icon: '🐛' },
  { key: 'polish',     label: 'Polish',     color: 'warning', icon: '✨' },
  { key: 'suggestion', label: 'Suggestion', color: 'accent',  icon: '💡' },
  { key: 'question',   label: 'Question',   color: 'accent',  icon: '❓' },
  { key: 'note',       label: 'Note',       color: 'muted',   icon: '📝' },
]

export const PRIORITIES = [
  { key: 'low',     label: 'Low',     color: 'muted' },
  { key: 'normal',  label: 'Normal',  color: 'secondary' },
  { key: 'high',    label: 'High',    color: 'warning' },
  { key: 'blocker', label: 'Blocker', color: 'danger' },
]

/** Infer which module the user is commenting about from the URL path. */
function inferModule(pathname) {
  if (!pathname) return null
  if (pathname.startsWith('/app/crm/pipeline')) return 'pipeline'
  if (pathname.startsWith('/app/crm/contracts')) return 'contracts'
  if (pathname.startsWith('/app/crm/assets')) return 'assets'
  if (pathname.startsWith('/app/crm/fulfillment')) return 'fulfillment'
  if (pathname.startsWith('/app/crm/activities')) return 'activities'
  if (pathname.startsWith('/app/crm/tasks')) return 'tasks'
  if (pathname.startsWith('/app/crm/newsletter')) return 'newsletter'
  if (pathname.startsWith('/app/crm/team')) return 'team'
  if (pathname.startsWith('/app/crm/automations')) return 'automations'
  if (pathname.startsWith('/app/crm/insights')) return 'insights'
  if (pathname.startsWith('/app/crm')) return 'crm'
  if (pathname.startsWith('/app/sportify')) return 'sportify'
  if (pathname.startsWith('/app/valora')) return 'valora'
  if (pathname.startsWith('/app/businessnow')) return 'businessnow'
  if (pathname.startsWith('/app/businessops')) return 'businessops'
  if (pathname.startsWith('/app/developer')) return 'developer'
  if (pathname.startsWith('/app/industry')) return 'industry'
  if (pathname.startsWith('/app/growth')) return 'growth'
  if (pathname.startsWith('/app/dashboard') || pathname === '/app' || pathname === '/app/') return 'dashboard'
  if (pathname.startsWith('/app/settings')) return 'settings'
  if (pathname.startsWith('/dev/email')) return 'email_marketing'
  if (pathname.startsWith('/dev/outlook')) return 'outlook'
  if (pathname.startsWith('/dev/pricing')) return 'pricing'
  if (pathname.startsWith('/dev')) return 'dev_console'
  if (pathname === '/' || pathname === '') return 'landing'
  if (pathname.startsWith('/pricing')) return 'pricing_public'
  if (pathname.startsWith('/compare')) return 'compare'
  return 'other'
}

/** Capture the current browser context automatically. */
export function getPageContext() {
  if (typeof window === 'undefined') return {}
  return {
    page_url: window.location.href,
    page_title: document.title,
    module: inferModule(window.location.pathname),
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    user_agent: navigator.userAgent,
  }
}

export async function createComment({ comment, category = 'note', priority = 'normal', tags = [] }, userId, propertyId) {
  const ctx = getPageContext()
  const { data, error } = await supabase
    .from('qa_comments')
    .insert({
      created_by: userId,
      property_id: propertyId,
      comment,
      category,
      priority,
      tags,
      ...ctx,
    })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, comment: data }
}

export async function listComments({ status, category, module, search, limit = 500 } = {}) {
  let q = supabase
    .from('qa_comments')
    .select('*, created_by_profile:profiles!qa_comments_created_by_fkey(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status && status !== 'all') q = q.eq('status', status)
  if (category && category !== 'all') q = q.eq('category', category)
  if (module && module !== 'all') q = q.eq('module', module)
  if (search) q = q.or(`comment.ilike.%${search}%,page_url.ilike.%${search}%`)
  const { data, error } = await q
  // Fallback without the join if the FK relationship name doesn't exist
  if (error) {
    const { data: plain } = await supabase
      .from('qa_comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { comments: plain || [], error: error.message }
  }
  return { comments: data || [] }
}

export async function updateComment(id, patch) {
  const { error } = await supabase
    .from('qa_comments')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function resolveComment(id, userId, resolutionNote) {
  return updateComment(id, {
    status: 'resolved',
    resolved_by: userId,
    resolved_at: new Date().toISOString(),
    resolution_note: resolutionNote || null,
  })
}

export async function deleteComment(id) {
  const { error } = await supabase.from('qa_comments').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function getCommentStats() {
  const { data } = await supabase
    .from('qa_comments')
    .select('status, category, priority, module')
  const rows = data || []
  const byStatus = {}
  const byCategory = {}
  const byModule = {}
  rows.forEach(r => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1
    byCategory[r.category] = (byCategory[r.category] || 0) + 1
    byModule[r.module || 'unknown'] = (byModule[r.module || 'unknown'] || 0) + 1
  })
  return {
    total: rows.length,
    open: byStatus.open || 0,
    resolved: byStatus.resolved || 0,
    byStatus,
    byCategory,
    byModule,
  }
}

/** Export all comments as CSV. */
export async function exportCsv({ status, category, module } = {}) {
  const { comments } = await listComments({ status, category, module, limit: 5000 })
  const headers = [
    'id', 'created_at', 'author', 'category', 'priority', 'status',
    'module', 'page_url', 'comment', 'resolution_note',
  ]
  const rows = comments.map(c => [
    c.id,
    c.created_at,
    c.created_by_profile?.full_name || c.created_by_profile?.email || '',
    c.category,
    c.priority,
    c.status,
    c.module || '',
    c.page_url || '',
    c.comment,
    c.resolution_note || '',
  ])
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  return csv
}

/** Export as markdown for quick pasting into a doc. */
export async function exportMarkdown({ status, category, module } = {}) {
  const { comments } = await listComments({ status, category, module, limit: 5000 })
  const lines = ['# QA Walkthrough Comments', '']
  lines.push(`Generated ${new Date().toLocaleString()} · ${comments.length} comments`, '')

  // Group by module
  const byModule = {}
  comments.forEach(c => {
    const m = c.module || 'other'
    if (!byModule[m]) byModule[m] = []
    byModule[m].push(c)
  })

  Object.entries(byModule).forEach(([mod, items]) => {
    lines.push(`## ${mod} (${items.length})`, '')
    items.forEach(c => {
      const icon = CATEGORIES.find(cat => cat.key === c.category)?.icon || '📝'
      lines.push(`### ${icon} ${c.category} · ${c.priority}${c.status !== 'open' ? ` · ${c.status}` : ''}`)
      lines.push(`*${new Date(c.created_at).toLocaleString()} · ${c.page_url || ''}*`)
      lines.push('')
      lines.push(c.comment)
      if (c.resolution_note) {
        lines.push('')
        lines.push(`**Resolution:** ${c.resolution_note}`)
      }
      lines.push('', '---', '')
    })
  })

  return lines.join('\n')
}
