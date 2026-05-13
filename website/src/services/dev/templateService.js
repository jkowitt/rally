import { supabase } from '@/lib/supabase'

/**
 * Personal outreach email templates. CRUD + variable substitution.
 * On first load, if no templates exist, seed the 6 defaults from the
 * GTM playbook.
 */

const SEED_TEMPLATES = [
  {
    name: 'Initial Outreach — Conference/Events',
    stage: 'initial',
    industry: 'conference_events',
    subject: 'Quick question about sponsor tracking at {{organization}}',
    body: `Hi {{first_name}},

I run Loud CRM — it's a sponsor CRM built for conference and event teams. Most orgs I talk to are still tracking sponsor relationships in spreadsheets, bouncing between Outlook, calendars, and shared drives to pull a report when someone asks "how's that renewal going?"

{{industry_pain_point}}

I built this because I was living that chaos myself. Loud CRM reads your contracts, tracks fulfillment, auto-builds brand reports, and pulls sponsor communication history into one timeline.

Worth 15 minutes to see if it'd move the needle at {{organization}}?

— {{sender_name}}
{{trial_link}}`,
  },
  {
    name: 'Initial Outreach — Minor League Sports',
    stage: 'initial',
    industry: 'minor_league_sports',
    subject: 'Quick question about sponsor management at {{organization}}',
    body: `Hi {{first_name}},

Quick question — how does {{organization}} currently track which sponsor assets are sold, which are delivered, and which contracts are up for renewal?

If the answer is "a spreadsheet and a lot of hope," you're not alone. I built Loud CRM for teams exactly like yours: AI contract parsing, asset catalog, renewal pipeline, and an auto-generated brand report at the end of each season.

{{industry_pain_point}}

Worth 15 minutes to walk through?

— {{sender_name}}
{{trial_link}}`,
  },
  {
    name: 'Follow-up Day 5',
    stage: 'follow_up_1',
    industry: 'both',
    subject: 'Re: Quick question about sponsor tracking at {{organization}}',
    body: `Hi {{first_name}},

Bumping this up in case it got buried. No pressure if the timing's off — just wanted to make sure it landed.

The thing I'd most want to show you is the AI contract parser: drop in a sponsorship PDF and it pulls out terms, assets, and deliverables in about 20 seconds. Saves a couple hours per contract.

Happy to send a 2-minute Loom instead of a live call if that's easier.

— {{sender_name}}`,
  },
  {
    name: 'Demo Request',
    stage: 'demo_request',
    industry: 'both',
    subject: '15 minutes to show you something — {{organization}}',
    body: `Hi {{first_name}},

Thanks for responding. Let me show you what I meant — specifically the AI contract parsing, the brand report generator, and the sponsor deal pipeline. 15 minutes, screen share, real live data.

Here's my Calendly: [insert link]

If none of those times work, just reply with three windows and I'll make one fit.

— {{sender_name}}`,
  },
  {
    name: 'Post-Demo Follow-up',
    stage: 'post_demo',
    industry: 'both',
    subject: 'Following up — Loud CRM demo + next steps',
    body: `Hi {{first_name}},

Thanks for the time today. Quick recap of what we covered:
• AI contract parsing (the piece you flagged as most useful)
• Sponsor deal pipeline with renewal alerts
• Auto-generated brand reports

Your free trial is ready to go — no card required for 14 days:
{{trial_link}}

Happy to jump on a second call with your team if that helps. Otherwise, hit reply when you've had a chance to poke around.

— {{sender_name}}`,
  },
  {
    name: 'Trial Follow-up (No Conversion)',
    stage: 'trial_follow_up',
    industry: 'both',
    subject: 'Still thinking it over?',
    body: `Hi {{first_name}},

Saw you started a Loud CRM trial but haven't converted yet. Totally fine — just checking in.

Is there something specific blocking you? Missing feature, pricing, timing, integration gap? I actually want to know — I use that feedback to prioritize the roadmap.

No sales pitch. Just curious.

— {{sender_name}}`,
  },
]

export async function listTemplates() {
  const { data, error } = await supabase
    .from('outlook_templates')
    .select('*')
    .order('stage')
  return error ? { templates: [], error: error.message } : { templates: data || [] }
}

export async function getTemplate(id) {
  const { data, error } = await supabase
    .from('outlook_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return error ? { template: null, error: error.message } : { template: data }
}

export async function createTemplate(userId, fields) {
  const { data, error } = await supabase
    .from('outlook_templates')
    .insert({ user_id: userId, ...fields })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, template: data }
}

export async function updateTemplate(id, fields) {
  const { data, error } = await supabase
    .from('outlook_templates')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, template: data }
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from('outlook_templates').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

/** Seed the default templates if the table is empty for this user. */
export async function seedIfEmpty(userId) {
  const { data } = await supabase.from('outlook_templates').select('id').limit(1)
  if (data && data.length > 0) return { seeded: false }
  const rows = SEED_TEMPLATES.map(t => ({ user_id: userId, ...t, is_seeded: true }))
  const { error } = await supabase.from('outlook_templates').insert(rows)
  if (error) return { seeded: false, error: error.message }
  return { seeded: true, count: rows.length }
}

const INDUSTRY_PAIN_POINTS = {
  conference_events: 'Every conference team I talk to loses a few days per event reconciling what was promised to sponsors vs. what was actually delivered.',
  minor_league_sports: 'Most minor league teams I talk to are juggling sponsor fulfillment across three spreadsheets and a shared drive — and the GM still asks for the renewal forecast every Monday.',
  both: 'Most teams I talk to are juggling sponsor fulfillment across spreadsheets and shared drives, and nobody has a single source of truth.',
}

/**
 * Replace {{vars}} in a template with values from a prospect.
 * Any variable not known is left as-is so it's obvious something's missing.
 */
export function substituteVariables({ subject, body }, prospect, sender = {}) {
  const vars = {
    first_name: prospect?.first_name || '',
    last_name: prospect?.last_name || '',
    organization: prospect?.organization || '',
    industry_pain_point: INDUSTRY_PAIN_POINTS[prospect?.industry] || INDUSTRY_PAIN_POINTS.both,
    sender_name: sender?.name || 'Jason',
    trial_link: sender?.trialLink || 'https://loud-legacy.com/signup',
  }
  const sub = (s) => (s || '').replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m))
  return { subject: sub(subject), body: sub(body) }
}

/**
 * Call Claude via the existing contract-ai edge function to personalize
 * a template with one custom sentence based on the prospect's org/industry.
 */
export async function personalizeWithAI(template, prospect) {
  const { data } = await supabase.functions.invoke('contract-ai', {
    body: {
      action: 'draft_email',
      context: {
        template_name: template.name,
        template_subject: template.subject,
        template_body: template.body,
        prospect_first_name: prospect.first_name,
        prospect_last_name: prospect.last_name,
        prospect_organization: prospect.organization,
        prospect_industry: prospect.industry,
        prospect_title: prospect.title,
        instructions: 'Personalize this outreach template. Keep the original structure, but add exactly one custom sentence near the top that references something specific about this prospect\'s organization or industry. Return JSON: { "subject": "...", "body": "..." }.',
      },
    },
  })
  return data || null
}

/**
 * Build a mailto: URL so the email opens in the default Outlook client
 * with subject and body pre-filled. Direct Graph sending is a future
 * enhancement — mailto keeps the integration simple and auditable.
 */
export function buildMailtoLink(email, subject, body) {
  const params = new URLSearchParams({ subject: subject || '', body: body || '' })
  return `mailto:${email}?${params.toString().replace(/\+/g, '%20')}`
}
