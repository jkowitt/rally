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

  // Fallback: use edit_contract with a prospect list document
  const prospectDoc = `PROSPECT LIST — SPORTS SPONSORSHIP TARGETS

1. Acme Corp | Technology | SaaS | $100K-$500K | Strong digital presence | San Francisco, CA | https://acme.com | https://linkedin.com/company/acme | $50M-$100M revenue | 500-1000 employees | High
2. Beta Industries | Manufacturing | Industrial | $50K-$200K | Regional sponsor history | Chicago, IL | https://beta.com | https://linkedin.com/company/beta | $20M-$50M | 200-500 | Medium
3. Gamma Foods | Food & QSR | Fast Casual | $75K-$300K | Active sports marketing | Dallas, TX | https://gamma.com | https://linkedin.com/company/gamma | $100M+ | 1000+ | High`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: prospectDoc,
    instructions: `Replace ALL entries with 8-10 REAL companies that match: "${query || 'sports sponsorship prospects'}". ${category ? `Industry filter: ${category}.` : ''} Use REAL company names, REAL websites, REAL LinkedIn company page URLs. Each line: "Number. Company Name | Category | Sub-industry | Sponsorship Budget Range | Why good fit (1 sentence) | City, State | https://website.com | https://linkedin.com/company/real-slug | Revenue range | Employee range | Priority (High/Medium/Low)". Replace Acme, Beta, Gamma with actual companies.`,
  })

  const text = (data.contract_text || '').trim()
  const prospects = []

  for (const line of text.split('\n')) {
    const match = line.match(/^\d+\.\s*(.+)/)
    if (match) {
      const parts = match[1].split('|').map(p => p.trim())
      if (parts.length >= 6) {
        prospects.push({
          company_name: parts[0] || '',
          category: parts[1] || '',
          sub_industry: parts[2] || '',
          estimated_sponsorship_budget: parts[3] || '',
          why_good_fit: parts[4] || '',
          headquarters_city: (parts[5] || '').split(',')[0]?.trim() || '',
          headquarters_state: (parts[5] || '').split(',')[1]?.trim() || '',
          website: parts[6] || '',
          linkedin_url: parts[7] || '',
          estimated_revenue: parts[8] || '',
          estimated_employees: parts[9] || '',
          priority: parts[10] || 'Medium',
        })
      }
    }
  }

  return { prospects }
}

export async function suggestProspects({ property_id }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'suggest_prospects', property_id })
    if (result?.suggestions) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
  }

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

  const prospectDoc = `SUGGESTED PROSPECT LIST — AI RECOMMENDATIONS

1. Acme Corp | Technology | SaaS | Similar to winners | Strong digital marketing budget aligns with your won deals | $100K-$500K | San Francisco, CA | https://acme.com | https://linkedin.com/company/acme | High | $50M+ | 500+
2. Beta Foods | Food & QSR | Fast Casual | Trending in sports | Increasing sports sponsorship spend in 2025 | $75K-$300K | Dallas, TX | https://beta.com | https://linkedin.com/company/beta | High | $100M+ | 1000+
3. Gamma Auto | Automotive | Dealership | Untapped category | Strong community presence, no current sports deals | $50K-$200K | Chicago, IL | https://gamma.com | https://linkedin.com/company/gamma | Medium | $20M-$50M | 200+`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: prospectDoc,
    instructions: `Replace ALL entries with 8-10 REAL companies you'd recommend as sports sponsorship prospects. ${dealContext} Mix of: companies similar to won deals, companies trending in sports sponsorship, and untapped high-potential categories. Each line: "Number. Company | Category | Sub-industry | Reason (Similar to winners/Trending/Untapped) | Rationale (1-2 sentences) | Budget range | City, State | https://website | https://linkedin.com/company/slug | Priority | Revenue | Employees". Use REAL companies only.`,
  })

  const text = (data.contract_text || '').trim()
  const suggestions = []

  for (const line of text.split('\n')) {
    const match = line.match(/^\d+\.\s*(.+)/)
    if (match) {
      const parts = match[1].split('|').map(p => p.trim())
      if (parts.length >= 6) {
        suggestions.push({
          company_name: parts[0] || '',
          category: parts[1] || '',
          sub_industry: parts[2] || '',
          reason: parts[3] || '',
          rationale: parts[4] || '',
          estimated_sponsorship_budget: parts[5] || '',
          headquarters_city: (parts[6] || '').split(',')[0]?.trim() || '',
          headquarters_state: (parts[6] || '').split(',')[1]?.trim() || '',
          website: parts[7] || '',
          linkedin_url: parts[8] || '',
          priority: parts[9] || 'Medium',
          estimated_revenue: parts[10] || '',
          estimated_employees: parts[11] || '',
        })
      }
    }
  }

  return { suggestions }
}

export async function researchContacts({ company_name, category, website }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'research_contacts', company_name, category, website })
    if (result?.research) return result
  } catch (e) {
    if (!e.message?.includes('Unknown action')) throw e
  }

  // Fallback: use edit_contract. The key is giving Claude a realistic document
  // with EXAMPLE contacts that it will replace with REAL ones.
  const domain = website ? (website.startsWith('http') ? new URL(website).hostname.replace('www.', '') : website.replace(/^www\./, '')) : company_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
  const slug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')

  const contactDoc = `CONTACT DIRECTORY — ${company_name.toUpperCase()}

1. Sarah Johnson | Chief Marketing Officer | sarah.johnson@${domain} | https://linkedin.com/in/sarah-johnson-cmo | Oversees all brand partnerships and sponsorship strategy
2. Michael Chen | VP of Partnerships | michael.chen@${domain} | https://linkedin.com/in/michael-chen-partnerships | Manages sponsorship deal negotiations and activation planning
3. Rachel Williams | Director of Business Development | rachel.williams@${domain} | https://linkedin.com/in/rachel-williams-bizdev | Leads new business initiatives and community sponsorship programs

Company LinkedIn: https://linkedin.com/company/${slug}`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: contactDoc,
    instructions: `Update this contact directory with the REAL people who currently work at ${company_name}${category ? ` (${category} industry)` : ''}. Replace Sarah Johnson, Michael Chen, and Rachel Williams with the ACTUAL names of real executives at ${company_name} in similar roles (CMO/VP Marketing, Head of Partnerships/Sponsorships, Director of Business Development/Community Relations). Use their real job titles. Generate realistic email addresses using @${domain}. Use realistic LinkedIn profile URLs based on their actual names. Keep the exact same pipe-delimited format. Do NOT use placeholder or made-up names — use the real people who work at ${company_name}.`,
  })

  const text = (data.contract_text || '').trim()
  const contacts = []
  const lines = text.split('\n')

  for (const line of lines) {
    // Match lines like "1. Name | Title | email | linkedin | why"
    const match = line.match(/^\d+\.\s*(.+)/)
    if (match) {
      const parts = match[1].split('|').map(p => p.trim())
      if (parts.length >= 3) {
        const nameParts = parts[0].split(' ')
        contacts.push({
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          position: parts[1] || '',
          email_pattern: parts[2] || '',
          linkedin_url: (parts[3] && parts[3].includes('linkedin.com')) ? parts[3] : `https://linkedin.com/in/${nameParts.join('-').toLowerCase()}`,
          why_target: parts[4] || '',
          outreach_tip: '',
        })
      }
    }
  }

  // Extract company linkedin
  const companyLiMatch = text.match(/Company LinkedIn:\s*(https:\/\/linkedin\.com\/company\/[^\s]+)/)
  const companyLinkedin = companyLiMatch?.[1] || `https://linkedin.com/company/${slug}`

  if (contacts.length > 0) {
    return {
      research: {
        contacts,
        company_linkedin: companyLinkedin,
        company_phone: '',
        company_address: '',
      }
    }
  }

  throw new Error('Could not find contacts. Try a more specific company name.')
}

export async function researchMoreContacts({ company_name, category, website, existing_contacts }) {
  const existingNames = (existing_contacts || []).map(c => `${c.first_name} ${c.last_name} (${c.position})`).join(', ')
  const domain = website ? (website.startsWith('http') ? new URL(website).hostname.replace('www.', '') : website.replace(/^www\./, '')) : company_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'

  const contactDoc = `ADDITIONAL CONTACTS — ${company_name.toUpperCase()}

4. Amanda Torres | Regional Marketing Manager | amanda.torres@${domain} | https://linkedin.com/in/amanda-torres-marketing | Manages regional sponsorship activations
5. David Park | Director of Communications | david.park@${domain} | https://linkedin.com/in/david-park-comms | Oversees PR and public-facing sponsorship announcements
6. Jennifer Adams | Brand Partnerships Manager | jennifer.adams@${domain} | https://linkedin.com/in/jennifer-adams-brand | Coordinates day-to-day sponsorship fulfillment`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: contactDoc,
    instructions: `Update this contact list with REAL people who currently work at ${company_name}${category ? ` (${category})` : ''}. Replace Amanda Torres, David Park, and Jennifer Adams with ACTUAL employees at ${company_name}. IMPORTANT: Do NOT use any of these people who are already known: ${existingNames || 'none'}. Find people in different roles: Regional Marketing, Community Relations, Event Marketing, Brand Manager, PR/Communications, Finance, or Operations. Use their real names and real titles. Generate realistic emails @${domain} and LinkedIn URLs. Keep the exact numbered pipe-delimited format.`,
  })

  const text = (data.contract_text || '').trim()
  const contacts = []

  for (const line of text.split('\n')) {
    const match = line.match(/^\d+\.\s*(.+)/)
    if (match) {
      const parts = match[1].split('|').map(p => p.trim())
      if (parts.length >= 3) {
        const nameParts = parts[0].split(' ')
        contacts.push({
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          position: parts[1] || '',
          email_pattern: parts[2] || '',
          linkedin_url: (parts[3] && parts[3].includes('linkedin.com')) ? parts[3] : `https://linkedin.com/in/${nameParts.join('-').toLowerCase()}`,
          why_target: parts[4] || '',
          outreach_tip: '',
        })
      }
    }
  }

  if (contacts.length > 0) {
    return { research: { contacts } }
  }

  throw new Error('No additional contacts found.')
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
