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

// Prospect Search & Discovery — with fallback for undeployed edge function actions

function tryParseJSON(text) {
  if (!text) return null
  try {
    const m = text.match(/\[[\s\S]*\]/)
    if (m) return JSON.parse(m[0])
  } catch {}
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
  } catch {}
  try { return JSON.parse(text) } catch {}
  return null
}

export async function searchProspects({ query, category, property_id }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'search_prospects', query, category, property_id })
    if (result?.prospects) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
  }

  // Fallback: use edit_contract with a JSON template
  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: `[{"company_name":"EXAMPLE CORP","category":"Technology","sub_industry":"SaaS","estimated_sponsorship_budget":"$50K-$100K","sponsorship_track_record":"Example history","why_good_fit":"Example reason","headquarters_city":"New York","headquarters_state":"NY","website":"https://example.com","linkedin_url":"https://linkedin.com/company/example","estimated_revenue":"$10M-$50M","estimated_employees":"100-500","priority":"Medium"}]`,
    instructions: `Replace this JSON array with 10-12 REAL companies matching this search. Query: "${query || 'sports sponsorship prospects'}". ${category ? `Category: ${category}.` : ''} Return ONLY a valid JSON array of real companies that would be strong sports sponsorship prospects. Each object must have: company_name, category (Automotive/Banking & Financial Services/Beverage & Alcohol/Food & Quick Serve Restaurants/Technology & Software/Healthcare/Retail/Entertainment & Media/Fashion & Apparel/Energy & Utilities/etc), sub_industry, estimated_sponsorship_budget, sponsorship_track_record, why_good_fit, headquarters_city, headquarters_state, website, linkedin_url (https://linkedin.com/company/slug), estimated_revenue, estimated_employees, priority (High/Medium/Low). Use REAL company names, REAL websites, REAL LinkedIn URLs.`,
  })

  const parsed = tryParseJSON(data.contract_text)
  return { prospects: Array.isArray(parsed) ? parsed : [] }
}

export async function suggestProspects({ property_id }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'suggest_prospects', property_id })
    if (result?.suggestions) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
  }

  // Fetch deals for pipeline context
  let dealContext = ''
  if (property_id) {
    try {
      const { data: deals } = await supabase.from('deals').select('brand_name, value, stage, sub_industry').eq('property_id', property_id).limit(30)
      if (deals?.length > 0) {
        const won = deals.filter(d => ['Contracted','In Fulfillment','Renewed'].includes(d.stage))
        dealContext = `Current pipeline: ${deals.map(d => d.brand_name).join(', ')}. Won deals: ${won.map(d => d.brand_name).join(', ') || 'None'}. Industries: ${[...new Set(deals.map(d => d.sub_industry).filter(Boolean))].join(', ')}.`
      }
    } catch {}
  }

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: `[{"company_name":"EXAMPLE CORP","category":"Technology","sub_industry":"SaaS","reason":"Similar to your winners","rationale":"Example rationale","estimated_sponsorship_budget":"$50K-$100K","headquarters_city":"New York","headquarters_state":"NY","website":"https://example.com","linkedin_url":"https://linkedin.com/company/example","priority":"High","estimated_revenue":"$10M-$50M","estimated_employees":"100-500"}]`,
    instructions: `Replace with 12 REAL companies to suggest as sports sponsorship prospects. ${dealContext} Mix: 4 "Similar to your winners" (same industries as won deals), 4 "Trending in sports sponsorship" (companies increasing sports spend), 4 "Untapped high-potential category". Each must have: company_name, category, sub_industry, reason, rationale (1-2 sentences), estimated_sponsorship_budget, headquarters_city, headquarters_state, website, linkedin_url, priority, estimated_revenue, estimated_employees. Return ONLY valid JSON array.`,
  })

  const parsed = tryParseJSON(data.contract_text)
  return { suggestions: Array.isArray(parsed) ? parsed : [] }
}

export async function researchContacts({ company_name, category, website }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'research_contacts', company_name, category, website })
    if (result?.research) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
  }

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: `{"contacts":[{"first_name":"Jane","last_name":"Smith","position":"VP Marketing","email_pattern":"jane.smith@company.com","linkedin_url":"https://linkedin.com/in/jane-smith","why_target":"Decision maker for sponsorships","outreach_tip":"Reference their recent campaign"}],"company_linkedin":"https://linkedin.com/company/example","company_phone":"(555) 123-4567","company_address":"123 Main St, City, ST"}`,
    instructions: `Replace with REAL data for ${company_name}${category ? ` (${category})` : ''}${website ? `, website: ${website}` : ''}. Find the top 3 decision-makers for sports sponsorship outreach (VP/Director Marketing, CMO, Head of Partnerships, etc). Each contact needs: first_name, last_name, position, email_pattern (likely format like first.last@domain.com), linkedin_url (https://linkedin.com/in/firstname-lastname format), why_target (1 sentence), outreach_tip (1 sentence). Also include company_linkedin, company_phone, company_address. Return ONLY valid JSON object.`,
  })

  const parsed = tryParseJSON(data.contract_text)
  if (parsed && parsed.contacts) {
    return { research: parsed }
  }
  return { research: { contacts: [], company_linkedin: '', company_phone: '', company_address: '' } }
}

export async function researchMoreContacts({ company_name, category, website, existing_contacts }) {
  const existingNames = (existing_contacts || []).map(c => `${c.first_name} ${c.last_name} (${c.position})`).join(', ')

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: `{"contacts":[{"first_name":"Jane","last_name":"Doe","position":"Director of Operations","email_pattern":"jane.doe@company.com","linkedin_url":"https://linkedin.com/in/jane-doe","why_target":"Key operational decision maker","outreach_tip":"Reference their recent initiative"}],"company_linkedin":"https://linkedin.com/company/example","company_phone":"(555) 123-4567","company_address":"123 Main St, City, ST"}`,
    instructions: `Replace with NEW contacts at ${company_name}${category ? ` (${category})` : ''}${website ? `, website: ${website}` : ''}. IMPORTANT: Do NOT include these people who are already known: ${existingNames || 'none'}. Find 3 DIFFERENT decision-makers at this company who could influence sponsorship decisions. Look for: Regional Marketing Managers, Directors of Community Relations, Event Marketing leads, Brand Managers, VP of Sales, Directors of Business Development, CFO/Finance leads who approve budgets, PR/Communications Directors. Each contact needs: first_name, last_name, position, email_pattern, linkedin_url (https://linkedin.com/in/firstname-lastname), why_target, outreach_tip. Return ONLY valid JSON.`,
  })

  const parsed = tryParseJSON(data.contract_text)
  if (parsed && parsed.contacts) {
    return { research: parsed }
  }
  return { research: { contacts: [] } }
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
    instructions: `This is The Sports Business Weekly newsletter for the week of ${weekOf}. Replace ALL [PLACEHOLDER] content with REAL sports business news, deals, and developments from the LAST 7 DAYS ONLY (${new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]} through ${new Date().toISOString().split('T')[0]}). Every story, deal, stat, and trend MUST be from the past week. Use real company names, real dollar figures, real industry data. Cite sources inline like (Source: SportBusiness Journal, ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}) or (via Front Office Sports). No placeholder text should remain. Write 1500-2000 words total. Return ONLY the HTML content.`,
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

  // Update existing record for this week, or insert new
  try {
    const { data: existing } = await supabase
      .from('newsletters')
      .select('id')
      .eq('type', 'weekly_digest')
      .eq('week_of', weekOf)
      .limit(1)

    if (existing?.length > 0) {
      await supabase.from('newsletters').update({
        title: newsletter.title,
        content: newsletter.content,
        published_at: new Date().toISOString(),
      }).eq('id', existing[0].id)
    } else {
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
    }
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
    instructions: `This is the Afternoon Access daily briefing for ${today}. Replace ALL [PLACEHOLDER] content with REAL sports business news and developments from TODAY (${today}) or the last 24 hours only. Every item must be current — today's news, today's developments, today's data. Use real company names, real deals. Conversational tone — like a sharp colleague sharing what caught their eye this afternoon. Cite sources inline (via SportBusiness Journal, per Front Office Sports, etc). No placeholder text should remain. Return ONLY the HTML.`,
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

  // Update existing record for today, or insert new
  try {
    const { data: existing } = await supabase
      .from('newsletters')
      .select('id')
      .eq('type', 'afternoon_update')
      .gte('published_at', today + 'T00:00:00Z')
      .limit(1)

    if (existing?.length > 0) {
      await supabase.from('newsletters').update({
        title: update.title,
        content: update.content,
        published_at: new Date().toISOString(),
      }).eq('id', existing[0].id)
    } else {
      await supabase.from('newsletters').insert({
        property_id: property_id || null,
        type: 'afternoon_update',
        title: update.title,
        content: update.content,
        summary: '',
        topics: [],
        published_at: new Date().toISOString(),
      })
    }
  } catch { /* table may not exist */ }

  return { update }
}
