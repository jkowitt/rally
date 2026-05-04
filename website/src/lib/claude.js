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
  // Try direct parse action first
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'parse_pdf_text', pdf_text })
    if (result?.parsed) return result
  } catch (e) {
    console.warn('parse_pdf_text failed, using fallback:', e.message)
  }

  // Fallback: use edit_contract to parse the contract
  const template = `{
  "brand_name": "",
  "contact_name": "",
  "contact_email": "",
  "contact_phone": "",
  "contact_position": "",
  "contact_company": "",
  "contract_number": "",
  "effective_date": "YYYY-MM-DD",
  "expiration_date": "YYYY-MM-DD",
  "total_value": 0,
  "annual_values": {},
  "benefits": [{"description": "", "category": "", "quantity": 1, "frequency": "Per Season", "value": 0}],
  "summary": ""
}`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: template,
    instructions: `Fill in this JSON template with data extracted from the following contract. Use real values from the contract text. For benefits, list every sponsorship asset, deliverable, or benefit mentioned. For annual_values, calculate per-year revenue if multi-year. Return ONLY valid JSON.\n\nContract text:\n${pdf_text.slice(0, 4000)}`,
  })

  // The edit_contract response has the filled-in JSON as contract_text
  try {
    const text = data.contract_text || ''
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
      return { parsed }
    }
  } catch {}

  throw new Error('Could not parse contract data')
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

// CRM AI functions — all wrapped with try/catch to prevent page crashes
export async function getDealInsights({ deal, activities, tasks, contracts }) {
  try {
    return await invokeEdgeFunction('contract-ai', { action: 'deal_insights', deal, activities, tasks, contracts })
  } catch (e) {
    console.warn('getDealInsights failed:', e.message)
    return { insights: { health_score: 5, next_best_actions: ['AI temporarily unavailable — follow up manually'], risk_factors: [], opportunities: [], coaching_tip: 'Check back later for AI insights.' } }
  }
}

export async function getPipelineForecast({ deals, historical_win_rate }) {
  try {
    return await invokeEdgeFunction('contract-ai', { action: 'pipeline_forecast', deals, historical_win_rate })
  } catch (e) {
    console.warn('getPipelineForecast failed:', e.message)
    return { forecast: { summary: 'AI forecast temporarily unavailable.', pipeline_health: 'Unknown', recommendations: ['Try again later'] } }
  }
}

export async function draftEmail({ deal, context, email_type }) {
  try {
    return await invokeEdgeFunction('contract-ai', { action: 'draft_email', deal, context, email_type })
  } catch (e) {
    console.warn('draftEmail failed:', e.message)
    return { email: { subject: `Follow up — ${deal?.brand_name || 'Sponsorship'}`, body: 'AI drafting temporarily unavailable. Please write your email manually.', tone: 'professional' } }
  }
}

// Personalized first-touch outreach for a prospect. Returns a
// { subject, body } pair the Compose modal can drop in.
//   prospect — the row from searchProspects / suggestProspects
//   contact  — optional contact returned by researchContacts
//   senderName / senderProperty — used for the sign-off
export async function draftFirstTouchEmail({ prospect, contact, senderName, senderProperty }) {
  try {
    const dealLike = {
      brand_name: prospect?.company_name || prospect?.brand_name,
      sub_industry: prospect?.sub_industry || prospect?.category,
      website: prospect?.website,
      city: prospect?.headquarters_city,
      state: prospect?.headquarters_state,
      contact_name: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : null,
      contact_position: contact?.position,
      contact_email: contact?.email || contact?.email_pattern,
    }
    const context = {
      sender_name: senderName,
      sender_property: senderProperty,
      why_good_fit: prospect?.why_good_fit,
      outreach_tip: contact?.outreach_tip,
      estimated_budget: prospect?.estimated_sponsorship_budget,
    }
    const result = await invokeEdgeFunction('contract-ai', {
      action: 'draft_email',
      deal: dealLike,
      context,
      email_type: 'first_touch',
    })
    const email = result?.email || result
    if (!email?.body) return null
    return { subject: email.subject, body: email.body }
  } catch (e) {
    console.warn('draftFirstTouchEmail failed:', e?.message)
    return null
  }
}

// Classify an inbound reply's intent. Returns a 'classification'
// object: { intent, confidence, rationale, suggested_action }.
export async function classifyReplyIntent({ subject, body, original_subject }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', {
      action: 'classify_reply', subject, body, original_subject,
    })
    return result?.classification || null
  } catch (e) {
    console.warn('classifyReplyIntent failed:', e?.message)
    return null
  }
}

// Generate a one-page intelligence brief for a deal.
export async function generateAccountBrief({ deal, contacts, activities, news_snippet }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', {
      action: 'account_brief', deal, contacts, activities, news_snippet,
    })
    return result?.brief || null
  } catch (e) {
    console.warn('generateAccountBrief failed:', e?.message)
    return null
  }
}

// Find lookalike brands for a seed deal. Returns up to 10 matches.
export async function findLookalikes({ deal, recent_wins }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', {
      action: 'find_lookalikes', deal, recent_wins,
    })
    return result?.result?.lookalikes || []
  } catch (e) {
    console.warn('findLookalikes failed:', e?.message)
    return []
  }
}

// Crystal-style personality profile for a contact.
export async function generatePersonalityProfile({ contact, email_samples }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', {
      action: 'personality_profile', contact, email_samples,
    })
    return result?.profile || null
  } catch (e) {
    console.warn('generatePersonalityProfile failed:', e?.message)
    return null
  }
}

// Funding/M&A radar — sweep a list of brand names for known events.
export async function runFundingRadar({ brands }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', {
      action: 'funding_radar', brands,
    })
    return result?.result?.signals || []
  } catch (e) {
    console.warn('runFundingRadar failed:', e?.message)
    return []
  }
}

// Generate post-mortem questions for a won/lost deal.
export async function generatePostmortemQuestions({ deal, outcome }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', {
      action: 'postmortem_questions', deal, outcome,
    })
    return result?.questions || null
  } catch (e) {
    console.warn('generatePostmortemQuestions failed:', e?.message)
    return null
  }
}

// Cluster a property's closed-won deals to derive its ICP.
export async function generateIcpCluster({ wins }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', {
      action: 'icp_cluster', wins,
    })
    return result?.cluster || null
  } catch (e) {
    console.warn('generateIcpCluster failed:', e?.message)
    return null
  }
}

// AI-suggested reply for an inbound email. Wraps the existing
// contract-ai 'draft_email' action with email_type='reply' and
// passes the inbound message as context.
//   incoming  — { subject, body, from_name, from_email }
//   deal      — optional linked deal (so the AI can use deal context)
//   senderName / senderProperty — used for sign-off
//   tone      — 'professional' | 'friendly' | 'concise'
export async function draftReplyEmail({ incoming, deal, senderName, senderProperty, tone = 'professional' }) {
  try {
    const dealLike = deal || {
      brand_name: incoming?.from_name || incoming?.from_email,
    }
    const context = {
      sender_name: senderName,
      sender_property: senderProperty,
      tone,
      incoming_subject: incoming?.subject,
      incoming_body: incoming?.body || incoming?.preview,
      incoming_from: incoming?.from_name || incoming?.from_email,
    }
    const result = await invokeEdgeFunction('contract-ai', {
      action: 'draft_email',
      deal: dealLike,
      context,
      email_type: 'reply',
    })
    const email = result?.email || result
    if (!email?.body) return null
    return { subject: email.subject, body: email.body }
  } catch (e) {
    console.warn('draftReplyEmail failed:', e?.message)
    return null
  }
}

export async function analyzeLostDeal({ deal, activities }) {
  try {
    return await invokeEdgeFunction('contract-ai', { action: 'analyze_lost_deal', deal, activities })
  } catch (e) {
    console.warn('analyzeLostDeal failed:', e.message)
    return { analysis: { likely_reasons: ['AI analysis temporarily unavailable'], lessons_learned: 'Try running this analysis again later.' } }
  }
}

export async function enrichContact({ name, company, position }) {
  try {
    return await invokeEdgeFunction('contract-ai', { action: 'enrich_contact', name, company, position })
  } catch (e) {
    console.warn('enrichContact failed:', e.message)
    return { enrichment: { industry: 'Unknown', conversation_starters: ['AI enrichment temporarily unavailable'] } }
  }
}

export async function generateMeetingNotes({ deal, attendees, agenda, raw_notes }) {
  try {
    return await invokeEdgeFunction('contract-ai', { action: 'meeting_notes', deal, attendees, agenda, raw_notes })
  } catch (e) {
    console.warn('generateMeetingNotes failed:', e.message)
    return { notes: { summary: 'AI notes temporarily unavailable.', action_items: [], sentiment: 'Neutral' } }
  }
}

// Email sending
export async function sendEmail({ to, subject, body, reply_to }) {
  return invokeEdgeFunction('send-email', { to, subject, body, reply_to })
}

// Prospect Search & Discovery — with fallback for undeployed edge function actions

// Apollo.io enrichment (primary)
export async function apolloEnrichCompany({ company_name, domain, property_id }) {
  try {
    return await invokeEdgeFunction('apollo-enrichment', { action: 'enrich_company', company_name, domain, property_id })
  } catch {
    return { data: null, error: 'Apollo not configured' }
  }
}

export async function apolloFindPeople({ company_name, property_id }) {
  try {
    return await invokeEdgeFunction('apollo-enrichment', { action: 'find_people', company_name, property_id })
  } catch {
    return { data: null, error: 'Apollo not configured' }
  }
}

export async function apolloEnrichPerson({ person_name, company_name, property_id }) {
  try {
    return await invokeEdgeFunction('apollo-enrichment', { action: 'enrich_person', person_name, company_name, property_id })
  } catch {
    return { data: null, error: 'Apollo not configured' }
  }
}

// Hunter.io email verification
export async function hunterVerifyEmail({ email, property_id }) {
  try {
    return await invokeEdgeFunction('hunter-verify', { action: 'verify_email', email, property_id })
  } catch {
    return { data: null, error: 'Hunter not configured' }
  }
}

export async function hunterFindEmail({ first_name, last_name, domain, property_id }) {
  try {
    return await invokeEdgeFunction('hunter-verify', { action: 'find_email', first_name, last_name, domain, property_id })
  } catch {
    return { data: null, error: 'Hunter not configured' }
  }
}

export async function hunterDomainSearch({ domain, property_id }) {
  try {
    return await invokeEdgeFunction('hunter-verify', { action: 'domain_search', domain, property_id })
  } catch {
    return { data: null, error: 'Hunter not configured' }
  }
}

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

export async function searchProspects({ query, category, property_id, icp_filters, industry }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'search_prospects', query, category, property_id, icp_filters, industry })
    if (result?.prospects?.length > 0) return result
  } catch (e) {
    console.warn('search_prospects failed, using fallback:', e.message)
  }

  // Fallback: use edit_contract with a prospect list document
  const prospectDoc = `PROSPECT LIST — SPORTS SPONSORSHIP TARGETS

1. Acme Corp | Technology | SaaS | $100K-$500K | Strong digital presence | San Francisco, CA | https://acme.com | https://linkedin.com/company/acme | $50M-$100M revenue | 500-1000 employees | High
2. Beta Industries | Manufacturing | Industrial | $50K-$200K | Regional sponsor history | Chicago, IL | https://beta.com | https://linkedin.com/company/beta | $20M-$50M | 200-500 | Medium
3. Gamma Foods | Food & QSR | Fast Casual | $75K-$300K | Active sports marketing | Dallas, TX | https://gamma.com | https://linkedin.com/company/gamma | $100M+ | 1000+ | High`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: prospectDoc,
    instructions: `Replace ALL entries with 8-10 REAL, well-known companies matching: "${query || 'sports sponsorship prospects'}". ${category ? `Industry: ${category}.` : ''} Include both major national brands AND strong regional companies. Use companies that ACTUALLY exist — real names, real websites (e.g. https://nike.com, https://coca-cola.com), real LinkedIn company pages (https://linkedin.com/company/nike). Include companies known for sports sponsorships AND companies that should be doing sports sponsorships based on their brand/market. Each line: "Number. Company Name | Category | Sub-industry | Budget Range | Why good fit (1 sentence) | City, State | https://real-website.com | https://linkedin.com/company/real-slug | Revenue range | Employee count | Priority". Do NOT use made-up companies.`,
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

export async function suggestProspects({ property_id, icp_filters, industry }) {
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'suggest_prospects', property_id, icp_filters, industry })
    if (result?.suggestions?.length > 0) return result
  } catch (e) {
    console.warn('suggest_prospects failed, using fallback:', e.message)
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
    instructions: `Replace ALL entries with 8-10 REAL, well-known companies as sports sponsorship prospects. ${dealContext} Include major national brands, Fortune 500 companies, and strong regional businesses. Mix: companies that already invest in sports sponsorships (Nike, Anheuser-Busch, State Farm, etc level) AND companies that SHOULD be in sports (growing brands, companies entering new markets). Each line: "Number. Company | Category | Sub-industry | Reason | Rationale (1-2 sentences) | Budget range | City, State | https://real-website.com | https://linkedin.com/company/real-slug | Priority | Revenue | Employees". Every company must be REAL and verifiable.`,
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

export async function researchContacts({ company_name, category, website, property_id }) {
  // TIER 1: Apollo.io (real, verified data)
  try {
    const apollo = await invokeEdgeFunction('apollo-enrichment', {
      action: 'find_people',
      company_name,
      property_id,
    })
    if (apollo?.data && Array.isArray(apollo.data) && apollo.data.length > 0) {
      const contacts = apollo.data.map(p => ({
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        position: p.title || '',
        email_pattern: p.email || '',
        email_verified: p.email_status === 'verified' ? 'verified' : p.email_status === 'unavailable' ? 'invalid' : 'unknown',
        linkedin_url: p.linkedin_url || `https://www.google.com/search?q=${encodeURIComponent((p.first_name || '') + ' ' + (p.last_name || '') + ' ' + company_name + ' LinkedIn')}`,
        why_target: p.headline || `${p.title} at ${company_name}`,
        outreach_tip: p.seniority ? `Senior ${p.departments?.[0] || 'decision-maker'}` : '',
        phone: p.phone || '',
        photo_url: p.photo_url || '',
        source: 'apollo',
      }))
      return { research: { contacts, source: 'apollo', verified: true } }
    }
  } catch { /* Apollo not configured or failed, fall through */ }

  // TIER 2: Claude AI (fallback when Apollo not available)
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'research_contacts', company_name, category, website })
    if (result?.research) return { ...result, research: { ...result.research, source: 'claude' } }
  } catch (e) {
    console.warn('research_contacts failed, using fallback:', e.message)
  }

  // Fallback: use edit_contract. The key is giving Claude a realistic document
  // with EXAMPLE contacts that it will replace with REAL ones.
  const domain = website ? (website.startsWith('http') ? new URL(website).hostname.replace('www.', '') : website.replace(/^www\./, '')) : company_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
  const slug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')

  const contactDoc = `SPONSORSHIP OUTREACH TARGETS — ${company_name.toUpperCase()}

Based on ${company_name}'s organizational structure${category ? ` in the ${category} industry` : ''}, the following are the key roles and likely contacts for sports sponsorship outreach:

1. [CMO/VP Marketing Name] | [Their exact title at ${company_name}] | [email]@${domain} | https://www.linkedin.com/in/[their-actual-linkedin-slug] | This person leads brand strategy and would approve major sponsorship investments
2. [Head of Partnerships/Sponsorships Name] | [Their exact title at ${company_name}] | [email]@${domain} | https://www.linkedin.com/in/[their-actual-linkedin-slug] | This person manages partnership deals and sponsorship activations
3. [Director BD/Community Name] | [Their exact title at ${company_name}] | [email]@${domain} | https://www.linkedin.com/in/[their-actual-linkedin-slug] | This person handles community engagement and local business development

Company LinkedIn: https://www.linkedin.com/company/${slug}`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: contactDoc,
    instructions: `You are a B2B sales intelligence researcher with deep knowledge of corporate leadership. Fill in this outreach document for ${company_name}${website ? ` (${website})` : ''}.

CRITICAL: Use the ACTUAL, REAL executives who work at ${company_name}. You know who leads marketing, partnerships, and business development at major companies from public sources — press releases, LinkedIn, news articles, conference speakers, and SEC filings. Use that knowledge.

For each of the 3 roles:
- The person's REAL full name (the actual human who holds or recently held this role at ${company_name})
- Their REAL title at ${company_name}
- Email in the format most commonly used at @${domain}
- Their ACTUAL LinkedIn profile URL — use the format https://www.linkedin.com/in/[their-real-slug]. LinkedIn slugs are typically the person's name like "john-smith" or "johnsmith" or a custom slug like "john-smith-marketing". Use the REAL slug you know from their public LinkedIn profile. If you know the person's name but not their exact slug, use firstname-lastname format.
- One sentence on why they're the right sponsorship contact

Do NOT leave brackets [ ] or placeholders. Do NOT use generic names. Keep the pipe-delimited numbered format.`,
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
          linkedin_url: `https://www.google.com/search?q=${encodeURIComponent(parts[0] + ' ' + company_name + ' LinkedIn')}`,
          why_target: parts[4] || '',
          outreach_tip: '',
        })
      }
    }
  }

  const companyLinkedin = `https://www.google.com/search?q=${encodeURIComponent(company_name + ' LinkedIn company page')}`

  if (contacts.length > 0) {
    return {
      research: {
        contacts: contacts.map(c => ({ ...c, source: 'claude', email_verified: 'unknown' })),
        company_linkedin: companyLinkedin,
        company_phone: '',
        company_address: '',
        source: 'claude',
        verified: false,
      }
    }
  }

  throw new Error('Could not find contacts. Try a more specific company name.')
}

export async function researchMoreContacts({ company_name, category, website, existing_contacts }) {
  const existingNames = (existing_contacts || []).map(c => `${c.first_name} ${c.last_name} (${c.position})`).join(', ')
  const domain = website ? (website.startsWith('http') ? new URL(website).hostname.replace('www.', '') : website.replace(/^www\./, '')) : company_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'

  const contactDoc = `ADDITIONAL OUTREACH TARGETS — ${company_name.toUpperCase()}

The following are secondary contacts at ${company_name} for sponsorship outreach, targeting different departments than the primary contacts:

4. [Name] | [Title — try Regional Marketing, Event Marketing, or Community Relations] | [email]@${domain} | https://www.linkedin.com/in/[their-actual-linkedin-slug] | Handles regional or event-level sponsorship execution
5. [Name] | [Title — try PR/Communications, Brand Management, or Public Affairs] | [email]@${domain} | https://www.linkedin.com/in/[their-actual-linkedin-slug] | Manages public-facing brand partnerships and communications
6. [Name] | [Title — try Finance/CFO, Operations, or Sales leadership] | [email]@${domain} | https://www.linkedin.com/in/[their-actual-linkedin-slug] | Approves budgets or oversees commercial operations

ALREADY KNOWN (do not repeat): ${existingNames || 'None'}`

  const data = await invokeEdgeFunction('contract-ai', {
    action: 'edit_contract',
    contract_text: contactDoc,
    instructions: `Fill in this secondary contact research for ${company_name}${category ? ` (${category})` : ''}. Use the REAL people who work at ${company_name} — use names from public sources, press releases, conference appearances, and news. Use their ACTUAL names and REAL titles. Generate email @${domain}. For LinkedIn URLs, use https://www.linkedin.com/in/ followed by the person's real LinkedIn slug (typically firstname-lastname or a custom slug). Do NOT repeat: ${existingNames || 'none'}. No brackets or placeholders. Keep pipe-delimited numbered format.`,
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
          linkedin_url: `https://www.google.com/search?q=${encodeURIComponent(parts[0] + ' ' + company_name + ' LinkedIn')}`,
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

export async function generateWeeklyNewsletter({ property_id, industry }) {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
  const weekOf = monday.toISOString().split('T')[0]

  // Try the dedicated action first
  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'generate_weekly_newsletter', property_id, industry })
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

export async function generateAfternoonUpdate({ property_id, industry }) {
  const today = new Date().toISOString().split('T')[0]

  try {
    const result = await invokeEdgeFunction('contract-ai', { action: 'generate_afternoon_update', property_id, industry })
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
