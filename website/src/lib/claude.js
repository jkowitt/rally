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

// Newsletter — uses edit_contract as a general-purpose Claude prompt passthrough
// since the newsletter-specific edge function actions may not be deployed yet

function extractJSONFromText(text) {
  // Try to find JSON object or array in text
  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) } catch {}
  }
  const arrMatch = text.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]) } catch {}
  }
  try { return JSON.parse(text) } catch {}
  return null
}

export async function generateWeeklyNewsletter({ property_id }) {
  // First try the dedicated action (if edge function is deployed with it)
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'generate_weekly_newsletter', property_id })
    if (result?.newsletter) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
  }

  // Fallback: use edit_contract action as a Claude prompt passthrough
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
  const weekOf = monday.toISOString().split('T')[0]

  const prompt = `IGNORE the contract editing instruction. You are the editor of "The Sports Business Weekly." Write the edition for week of ${weekOf}.

Cover: 1) HEADLINE STORY 2) DEALS & PARTNERSHIPS (3-4 deals) 3) MARKET TRENDS (2-3 trends) 4) TECHNOLOGY & INNOVATION 5) BRAND SPOTLIGHT 6) NUMBERS THAT MATTER (3-4 stats) 7) LOOKING AHEAD 8) ACTIONABLE TAKEAWAY.

Cite sources inline (SportBusiness Journal, Forbes, Front Office Sports, Sportico, The Athletic, ESPN, Ad Age, CNBC). End with Sources section.

Format as HTML (h2 for sections, p for text, ul/li for lists, strong for emphasis, blockquote for callouts). 1500-2000 words. No html/head/body tags.

Return ONLY valid JSON:
{"title":"The Sports Business Weekly — Week of ${weekOf}","content":"<h2>...</h2><p>...</p>...","summary":"one paragraph","topics":[{"title":"headline","category":"Deals|Trends|Technology|Brands|Data","snippet":"one sentence"}]}`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: 'NEWSLETTER GENERATION REQUEST — NOT A CONTRACT',
    instructions: prompt,
  })

  const parsed = extractJSONFromText(data.contract_text || '')
  if (!parsed || !parsed.content) {
    // If Claude returned HTML directly instead of JSON, wrap it
    return {
      newsletter: {
        title: `The Sports Business Weekly — Week of ${weekOf}`,
        content: data.contract_text || '<p>Newsletter content could not be generated.</p>',
        summary: '',
        topics: [],
      }
    }
  }

  // Store in database
  try {
    await supabase.from('newsletters').insert({
      property_id: property_id || null,
      type: 'weekly_digest',
      title: parsed.title || `The Sports Business Weekly — ${weekOf}`,
      content: parsed.content,
      summary: parsed.summary || '',
      topics: parsed.topics || [],
      week_of: weekOf,
      published_at: new Date().toISOString(),
    })
  } catch { /* table may not exist */ }

  return { newsletter: parsed }
}

export async function generateAfternoonUpdate({ property_id }) {
  // First try the dedicated action
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'generate_afternoon_update', property_id })
    if (result?.update) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
  }

  // Fallback: use edit_contract action
  const today = new Date().toISOString().split('T')[0]

  const prompt = `IGNORE the contract editing instruction. You are the editor of "Afternoon Access," a daily afternoon briefing for sports business professionals. Write today's edition for ${today}.

NOT breaking news — smart context and updates. Write 4-5 concise items: 1) Development worth watching 2) Industry intel 3) Brand move 4) Conversation starter 5) Quick thought. Each 2-4 sentences max.

Cite sources inline (via SportBusiness Journal, per Front Office Sports, etc). End with Sources.

Format as HTML (h3 with emoji prefix for headers, p for text, strong for key terms). No html/head/body tags.

Return ONLY valid JSON:
{"title":"Afternoon Access — ${today}","content":"<h3>...</h3><p>...</p>...","summary":"one sentence teaser","topics":[{"title":"headline","category":"Development|Intel|Brand|Conversation|Thought","snippet":"one sentence"}]}`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: 'AFTERNOON UPDATE REQUEST — NOT A CONTRACT',
    instructions: prompt,
  })

  const parsed = extractJSONFromText(data.contract_text || '')
  if (!parsed || !parsed.content) {
    return {
      update: {
        title: `Afternoon Access — ${today}`,
        content: data.contract_text || '<p>Afternoon update could not be generated.</p>',
        summary: '',
        topics: [],
      }
    }
  }

  // Store in database
  try {
    await supabase.from('newsletters').insert({
      property_id: property_id || null,
      type: 'afternoon_update',
      title: parsed.title || `Afternoon Access — ${today}`,
      content: parsed.content,
      summary: parsed.summary || '',
      topics: parsed.topics || [],
      published_at: new Date().toISOString(),
    })
  } catch { /* table may not exist */ }

  return { update: parsed }
}
