import { supabase } from '@/lib/supabase'

function toCsv(headers, rows) {
  const headerLine = headers.map(h => `"${h}"`).join(',')
  const dataLines = rows.map(row =>
    headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
  )
  return headerLine + '\n' + dataLines.join('\n')
}

function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function logExport(userId, exportType, rowCount) {
  try {
    await supabase.from('data_exports').insert({
      user_id: userId,
      export_type: exportType,
      row_count: rowCount,
      completed_at: new Date().toISOString(),
    })
  } catch {}
}

export async function exportDeals(userId) {
  const { data } = await supabase
    .from('deals')
    .select('company_name, stage, total_value, annual_value, start_date, end_date, assigned_to, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (!data || data.length === 0) return { success: false, error: 'No deals to export' }

  const headers = ['company_name', 'stage', 'total_value', 'annual_value', 'start_date', 'end_date', 'assigned_to', 'created_at', 'updated_at']
  const csv = toCsv(headers, data)
  downloadCsv(`deals_export_${new Date().toISOString().slice(0, 10)}.csv`, csv)
  await logExport(userId, 'deals_csv', data.length)
  return { success: true, count: data.length }
}

export async function exportContacts(userId) {
  const { data } = await supabase
    .from('contacts')
    .select('first_name, last_name, email, phone, title, company, linkedin_url, source, created_at')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (!data || data.length === 0) return { success: false, error: 'No contacts to export' }

  const headers = ['first_name', 'last_name', 'email', 'phone', 'title', 'company', 'linkedin_url', 'source', 'created_at']
  const csv = toCsv(headers, data)
  downloadCsv(`contacts_export_${new Date().toISOString().slice(0, 10)}.csv`, csv)
  await logExport(userId, 'contacts_csv', data.length)
  return { success: true, count: data.length }
}

export async function exportActivities(userId) {
  const { data } = await supabase
    .from('activities')
    .select('type, description, deal_id, contact_id, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (!data || data.length === 0) return { success: false, error: 'No activities to export' }

  const headers = ['type', 'description', 'deal_id', 'contact_id', 'created_by', 'created_at']
  const csv = toCsv(headers, data)
  downloadCsv(`activities_export_${new Date().toISOString().slice(0, 10)}.csv`, csv)
  await logExport(userId, 'activities_csv', data.length)
  return { success: true, count: data.length }
}

export async function exportGdprData(userId) {
  const [deals, contacts, activities, profile] = await Promise.all([
    supabase.from('deals').select('*').limit(10000),
    supabase.from('contacts').select('*').limit(10000),
    supabase.from('activities').select('*').limit(10000),
    supabase.from('profiles').select('*').eq('id', userId).single(),
  ])

  const bundle = {
    exported_at: new Date().toISOString(),
    user_profile: profile.data,
    deals: deals.data || [],
    contacts: contacts.data || [],
    activities: activities.data || [],
  }

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `loud_legacy_data_export_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)

  await logExport(userId, 'gdpr_full', (deals.data?.length || 0) + (contacts.data?.length || 0) + (activities.data?.length || 0))
  return { success: true }
}

export async function getExportHistory(userId) {
  const { data } = await supabase
    .from('data_exports')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })
    .limit(20)
  return data || []
}
