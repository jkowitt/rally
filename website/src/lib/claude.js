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
  }

  // Fallback: use edit_contract with a real HTML template as the "contract"
  // Claude will "edit" this template by replacing placeholder content with real content
  const template = `<h2>Headline Story</h2>
<p>[PLACEHOLDER — Replace with the biggest sports business story this week. Include a major sponsorship deal, partnership announcement, or market shift. Cite the source. Write 3-4 detailed sentences.]</p>

<h2>Deals & Partnerships</h2>
<ul>
<li><strong>[PLACEHOLDER Deal 1]</strong> — [Replace with a real recent sponsorship deal. Include dollar figures if available. Cite source.]</li>
<li><strong>[PLACEHOLDER Deal 2]</strong> — [Replace with another real deal.]</li>
<li><strong>[PLACEHOLDER Deal 3]</strong> — [Replace with another real deal.]</li>
</ul>

<h2>Market Trends</h2>
<p><strong>[PLACEHOLDER Trend 1]</strong> — [Replace with a real emerging trend in sports sponsorship. Include data points. 2-3 sentences.]</p>
<p><strong>[PLACEHOLDER Trend 2]</strong> — [Replace with another real trend. 2-3 sentences.]</p>

<h2>Technology & Innovation</h2>
<p>[PLACEHOLDER — Replace with 1-2 real tech developments impacting sports business — AI, streaming, fan engagement, measurement tools. 3-4 sentences with specific company names.]</p>

<h2>Brand Spotlight</h2>
<p>[PLACEHOLDER — Replace with a deep dive on one real brand's sports marketing strategy. What are they doing, why it works, what others can learn. 4-5 sentences.]</p>

<h2>Numbers That Matter</h2>
<ul>
<li><strong>[PLACEHOLDER Stat 1]</strong> — [Replace with a real industry stat with source]</li>
<li><strong>[PLACEHOLDER Stat 2]</strong> — [Replace with a real stat]</li>
<li><strong>[PLACEHOLDER Stat 3]</strong> — [Replace with a real stat]</li>
</ul>

<h2>Looking Ahead</h2>
<p>[PLACEHOLDER — Replace with what to watch next week: upcoming events, earnings, major announcements. 2-3 sentences.]</p>

<h2>Actionable Takeaway</h2>
<blockquote><p>[PLACEHOLDER — Replace with one specific, actionable thing a sponsorship sales professional should do this week. Be concrete and practical.]</p></blockquote>

<h2>Sources</h2>
<ul>
<li>[PLACEHOLDER — List all publications referenced: SportBusiness Journal, Forbes, Front Office Sports, Sportico, The Athletic, ESPN, Ad Age, CNBC]</li>
</ul>`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: template,
    instructions: `This is The Sports Business Weekly newsletter template for the week of ${weekOf}. Replace ALL [PLACEHOLDER] content with real, substantive sports business information. Use real company names, real dollar figures, real industry data, and real publication sources. Every section must contain actual sports business content — no placeholder text should remain. Cite sources inline like (Source: SportBusiness Journal) or (via Front Office Sports). Write 1500-2000 words total. Return ONLY the HTML content.`,
  })

  let htmlContent = (data.contract_text || '').trim()
  // Strip any leading "---" or prompt echoes
  htmlContent = htmlContent.replace(/^---[\s\S]*?---\s*/m, '').trim()
  // If it still contains PLACEHOLDER, generation failed
  if (htmlContent.includes('[PLACEHOLDER')) {
    htmlContent = '<p>Newsletter generation is temporarily unavailable. Please try again later.</p>'
  }

  const newsletter = {
    title: `The Sports Business Weekly — Week of ${weekOf}`,
    content: htmlContent,
    summary: '',
    topics: [],
  }

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

  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'generate_afternoon_update', property_id })
    if (result?.update) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
  }

  const template = `<h3>📡 Development Worth Watching</h3>
<p>[PLACEHOLDER — Replace with a real evolving story in sports business. Not breaking news, but a noteworthy development. 2-3 sentences with source citation.]</p>

<h3>📊 Industry Intel</h3>
<p>[PLACEHOLDER — Replace with a real insight or data point about sponsor behavior, fan engagement trends, or market dynamics. 2-3 sentences with source.]</p>

<h3>🏷️ Brand Move</h3>
<p>[PLACEHOLDER — Replace with a real brand making an interesting sports marketing play — new activation, renewed deal, or category shift. 2-3 sentences with source.]</p>

<h3>💬 Conversation Starter</h3>
<p>[PLACEHOLDER — Replace with something real that would spark discussion with a prospect or colleague. A trend, a surprising stat, or a contrarian take. 2-3 sentences.]</p>

<h3>💡 Quick Thought</h3>
<p>[PLACEHOLDER — Replace with a brief, sharp observation about a current sports business topic. 1-2 sentences.]</p>

<h3>📎 Sources</h3>
<p>[PLACEHOLDER — List publications referenced]</p>`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: template,
    instructions: `This is the Afternoon Access daily briefing template for ${today}. Replace ALL [PLACEHOLDER] content with real, current sports business information. Use real company names, real deals, real data. Conversational tone — like a sharp colleague sharing what caught their eye. Cite sources inline (via SportBusiness Journal, per Front Office Sports, etc). No placeholder text should remain. Return ONLY the HTML.`,
  })

  let htmlContent = (data.contract_text || '').trim()
  htmlContent = htmlContent.replace(/^---[\s\S]*?---\s*/m, '').trim()
  if (htmlContent.includes('[PLACEHOLDER')) {
    htmlContent = '<p>Afternoon update is temporarily unavailable. Please try again later.</p>'
  }

  const update = {
    title: `Afternoon Access — ${today}`,
    content: htmlContent,
    summary: '',
    topics: [],
  }

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
