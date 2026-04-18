import { supabase } from '@/lib/supabase'

// ─── Projects CRUD ──────────────────────────────────────

export async function listProjects({ status, ownerId, dealId, limit = 100 } = {}) {
  let q = supabase
    .from('projects')
    .select('*, owner:owner_id(id, full_name, email), deal:deal_id(id, company_name, stage)')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (status && status !== 'all') q = q.eq('status', status)
  if (ownerId) q = q.eq('owner_id', ownerId)
  if (dealId) q = q.eq('deal_id', dealId)
  const { data, error } = await q
  return error ? { projects: [], error: error.message } : { projects: data || [] }
}

export async function getProject(id) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, owner:owner_id(id, full_name, email), deal:deal_id(id, company_name, stage, total_value)')
    .eq('id', id)
    .maybeSingle()
  return error ? { project: null, error: error.message } : { project: data }
}

export async function createProject(fields, userId) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...fields, created_by: userId, owner_id: fields.owner_id || userId })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, project: data }
}

export async function updateProject(id, patch) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, project: data }
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

// ─── Phases ──────────────────────────────────────────────

export async function listPhases(projectId) {
  const { data } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order')
  return data || []
}

export async function createPhase(projectId, fields) {
  const { data, error } = await supabase
    .from('project_phases')
    .insert({ project_id: projectId, ...fields })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, phase: data }
}

export async function updatePhase(id, patch) {
  const { error } = await supabase
    .from('project_phases')
    .update(patch)
    .eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function deletePhase(id) {
  const { error } = await supabase.from('project_phases').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

// ─── Tasks ───────────────────────────────────────────────

export async function listTasks(projectId) {
  const { data } = await supabase
    .from('project_tasks')
    .select('*, assignee:assignee_id(id, full_name, email)')
    .eq('project_id', projectId)
    .order('display_order')
  return data || []
}

export async function createTask(projectId, fields, userId) {
  const { data, error } = await supabase
    .from('project_tasks')
    .insert({ project_id: projectId, ...fields, created_by: userId })
    .select('*, assignee:assignee_id(id, full_name, email)')
    .single()
  return error ? { success: false, error: error.message } : { success: true, task: data }
}

export async function updateTask(id, patch) {
  if (patch.status === 'done' && !patch.completed_at) {
    patch.completed_at = new Date().toISOString()
  }
  if (patch.status && patch.status !== 'done') {
    patch.completed_at = null
  }
  const { data, error } = await supabase
    .from('project_tasks')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, assignee:assignee_id(id, full_name, email)')
    .single()
  return error ? { success: false, error: error.message } : { success: true, task: data }
}

export async function deleteTask(id) {
  const { error } = await supabase.from('project_tasks').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function moveTask(taskId, newStatus, newOrder) {
  return updateTask(taskId, { status: newStatus, display_order: newOrder })
}

// ─── Comments ────────────────────────────────────────────

export async function listComments(projectId, taskId = null) {
  let q = supabase
    .from('project_comments')
    .select('*, author:author_id(id, full_name, email)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (taskId) q = q.eq('task_id', taskId)
  const { data } = await q
  return data || []
}

export async function addComment(projectId, body, userId, taskId = null) {
  const { data, error } = await supabase
    .from('project_comments')
    .insert({ project_id: projectId, task_id: taskId, author_id: userId, body })
    .select('*, author:author_id(id, full_name, email)')
    .single()
  return error ? { success: false, error: error.message } : { success: true, comment: data }
}

// ─── Templates ───────────────────────────────────────────

export async function listTemplates() {
  const { data } = await supabase
    .from('project_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name')
  return data || []
}

export async function getTemplate(id) {
  const { data } = await supabase
    .from('project_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function createFromTemplate(templateId, overrides, userId, propertyId) {
  const template = await getTemplate(templateId)
  if (!template) return { success: false, error: 'Template not found' }

  const result = await createProject({
    property_id: propertyId,
    name: overrides.name || template.name,
    description: overrides.description || template.description,
    status: 'active',
    deal_id: overrides.deal_id || null,
    template_id: templateId,
    start_date: overrides.start_date || new Date().toISOString().slice(0, 10),
    ...overrides,
  }, userId)

  if (!result.success) return result

  const phases = template.template_data?.phases || []
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i]
    const phaseResult = await createPhase(result.project.id, {
      name: phase.name,
      display_order: i + 1,
      status: i === 0 ? 'active' : 'pending',
    })
    if (phaseResult.success && phase.tasks) {
      for (const task of phase.tasks) {
        await createTask(result.project.id, {
          phase_id: phaseResult.phase.id,
          title: task.title,
          priority: task.priority || 'medium',
          display_order: task.order || 0,
        }, userId)
      }
    }
  }

  return result
}

// ─── Stats ───────────────────────────────────────────────

export async function getProjectStats() {
  const [active, completed, onHold, total] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'on_hold'),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
  ])
  return {
    active: active.count || 0,
    completed: completed.count || 0,
    onHold: onHold.count || 0,
    total: total.count || 0,
  }
}

export const STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled']
export const PRIORITIES = ['low', 'medium', 'high', 'urgent']
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked']
