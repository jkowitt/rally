import { supabase } from './supabase'

async function invokeEdgeFunction(functionName, payload) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  })
  if (error) {
    // Extract real error from response body
    let msg = error.message || 'Edge Function error'
    try {
      if (error.context?.body) {
        const reader = error.context.body.getReader()
        const { value } = await reader.read()
        const text = new TextDecoder().decode(value)
        const parsed = JSON.parse(text)
        if (parsed.error) msg = parsed.error
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
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

// CRM AI functions
export async function getDealInsights({ deal, activities, tasks, contracts }) {
  return invokeEdgeFunction('contract-ai', { action: 'deal_insights', deal, activities, tasks, contracts })
}

export async function getPipelineForecast({ deals, historical_win_rate }) {
  return invokeEdgeFunction('contract-ai', { action: 'pipeline_forecast', deals, historical_win_rate })
}

export async function draftEmail({ deal, context, email_type }) {
  return invokeEdgeFunction('contract-ai', { action: 'draft_email', deal, context, email_type })
}

export async function analyzeLostDeal({ deal, activities }) {
  return invokeEdgeFunction('contract-ai', { action: 'analyze_lost_deal', deal, activities })
}

export async function enrichContact({ name, company, position }) {
  return invokeEdgeFunction('contract-ai', { action: 'enrich_contact', name, company, position })
}

export async function generateMeetingNotes({ deal, attendees, agenda, raw_notes }) {
  return invokeEdgeFunction('contract-ai', { action: 'meeting_notes', deal, attendees, agenda, raw_notes })
}

// Prospect Search & Discovery
export async function searchProspects({ query, category, property_id }) {
  return invokeEdgeFunction('contract-ai', { action: 'search_prospects', query, category, property_id })
}

export async function suggestProspects({ property_id }) {
  return invokeEdgeFunction('contract-ai', { action: 'suggest_prospects', property_id })
}

export async function researchContacts({ company_name, category, website }) {
  return invokeEdgeFunction('contract-ai', { action: 'research_contacts', company_name, category, website })
}

// Newsletter
export async function generateWeeklyNewsletter({ property_id }) {
  return invokeEdgeFunction('contract-ai', { action: 'generate_weekly_newsletter', property_id })
}

export async function generateAfternoonUpdate({ property_id }) {
  return invokeEdgeFunction('contract-ai', { action: 'generate_afternoon_update', property_id })
}
