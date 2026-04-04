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

// Newsletter — tries dedicated action first, falls back to edit_contract
// as a Claude prompt passthrough if the edge function isn't deployed with newsletter actions

export async function generateWeeklyNewsletter({ property_id }) {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
  const weekOf = monday.toISOString().split('T')[0]

  // Try the dedicated action first
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'generate_weekly_newsletter', property_id })
    if (result?.newsletter) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
    // Fall through to fallback
  }

  // Fallback: use edit_contract which calls Claude with our prompt as "instructions"
  // The edit_contract action returns { contract_text: "..." } with raw Claude output
  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: `Write a sports business newsletter for the week of ${weekOf}. Format as HTML.`,
    instructions: `You are the editor of "The Sports Business Weekly," a premium newsletter for sports sponsorship professionals. Write the edition for week of ${weekOf}.

Sections: HEADLINE STORY, DEALS & PARTNERSHIPS (3-4 deals), MARKET TRENDS (2-3), TECHNOLOGY & INNOVATION, BRAND SPOTLIGHT, NUMBERS THAT MATTER (3-4 stats), LOOKING AHEAD, ACTIONABLE TAKEAWAY.

Cite real sources inline (SportBusiness Journal, Forbes, Front Office Sports, Sportico, ESPN, Ad Age). End with a Sources section.

Use HTML: <h2> for section headers, <p> for paragraphs, <ul>/<li> for lists, <strong> for emphasis, <blockquote> for callouts. 1500-2000 words. Do NOT wrap in html/head/body tags. Output ONLY the HTML content.`,
  })

  const htmlContent = (data.contract_text || '').trim()

  const newsletter = {
    title: `The Sports Business Weekly — Week of ${weekOf}`,
    content: htmlContent || '<p>Newsletter could not be generated. Please try again.</p>',
    summary: '',
    topics: [],
  }

  // Try to store in DB
  try {
    await supabase.from('newsletters').insert({
      property_id: property_id || null,
      type: 'weekly_digest',
      title: newsletter.title,
      content: newsletter.content,
      summary: '',
      topics: [],
      week_of: weekOf,
      published_at: new Date().toISOString(),
    })
  } catch { /* table may not exist */ }

  return { newsletter }
}

export async function generateAfternoonUpdate({ property_id }) {
  const today = new Date().toISOString().split('T')[0]

  // Try the dedicated action first
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'generate_afternoon_update', property_id })
    if (result?.update) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
  }

  // Fallback
  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: `Write a daily afternoon sports business briefing for ${today}. Format as HTML.`,
    instructions: `You are the editor of "Afternoon Access," a daily afternoon briefing for sports business professionals. Write today's edition for ${today}.

NOT breaking news — smart context and updates to consider. Write 4-5 concise items:
1) A development worth watching 2) Industry intel 3) Brand move 4) Conversation starter 5) Quick thought

Each item 2-4 sentences max. Sharp, informed, conversational tone. Cite sources inline (via SportBusiness Journal, per Front Office Sports, etc). End with brief Sources list.

Use HTML: <h3> with emoji prefix for item headers, <p> for text, <strong> for key terms. Do NOT wrap in html/head/body tags. Output ONLY the HTML content.`,
  })

  const htmlContent = (data.contract_text || '').trim()

  const update = {
    title: `Afternoon Access — ${today}`,
    content: htmlContent || '<p>Afternoon update could not be generated. Please try again.</p>',
    summary: '',
    topics: [],
  }

  // Try to store in DB
  try {
    await supabase.from('newsletters').insert({
      property_id: property_id || null,
      type: 'afternoon_update',
      title: update.title,
      content: update.content,
      summary: '',
      topics: [],
      published_at: new Date().toISOString(),
    })
  } catch { /* table may not exist */ }

  return { update }
}
