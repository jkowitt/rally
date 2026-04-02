import { supabase } from './supabase'

async function invokeEdgeFunction(functionName, payload) {
  // Call Edge Function directly via fetch for better error visibility
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yBmy9yYrchSL94IWrth3kA_qCCIGgWz'
  const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://juaqategmrghsfkbaiap.supabase.co'}/functions/v1/${functionName}`
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || anonKey
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify(payload),
  })
  const text = await resp.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text } }
  if (!resp.ok) throw new Error(data.error || data.message || 'Edge Function error: ' + resp.status + ' ' + text.slice(0, 200))
  if (data.error) throw new Error(data.error)
  return data
}

export async function runValuation({ asset_id, property_id, broadcast_minutes, screen_share_percent, clarity_score, audience_size, cpp }) {
  return invokeEdgeFunction('claude-valuation', {
    asset_id,
    property_id,
    broadcast_minutes,
    screen_share_percent,
    clarity_score,
    audience_size,
    cpp,
  })
}

export async function runDailyIntelligence(property_id) {
  return invokeEdgeFunction('daily-intelligence', { property_id })
}

export async function updateBenchmarks(property_id) {
  return invokeEdgeFunction('benchmark-updater', { property_id })
}

export async function submitContactForm({ name, email, message, property_name }) {
  return invokeEdgeFunction('contact-form', { name, email, message, property_name })
}

// Contract AI functions
export async function generateContract({ deal_id, property_id, assets, terms }) {
  return invokeEdgeFunction('contract-ai', { action: 'generate_contract', deal_id, property_id, assets, terms })
}

export async function editContractText({ contract_text, instructions }) {
  return invokeEdgeFunction('contract-ai', { action: 'edit_contract', contract_text, instructions })
}

export async function parsePdfText(pdf_text) {
  return invokeEdgeFunction('contract-ai', { action: 'parse_pdf_text', pdf_text })
}

export async function summarizeContract(contract_text) {
  return invokeEdgeFunction('contract-ai', { action: 'summarize_contract', contract_text })
}

export async function extractBenefits({ contract_id, contract_text, property_id }) {
  return invokeEdgeFunction('contract-ai', { action: 'extract_benefits', contract_id, contract_text, property_id })
}

export async function generateFulfillment({ contract_id, deal_id, start_date, end_date }) {
  return invokeEdgeFunction('contract-ai', { action: 'generate_fulfillment', contract_id, deal_id, start_date, end_date })
}
