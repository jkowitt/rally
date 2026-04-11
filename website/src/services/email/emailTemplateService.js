import { supabase } from '@/lib/supabase'

/**
 * Email template CRUD + seed defaults + variable substitution.
 * Separate from the outreach template service (which is for mailto-based
 * 1:1 prospecting, not broadcast campaigns).
 */

// HTML wrapper — table-based layout for Gmail/Outlook/Apple Mail compatibility.
// Content goes into {{content}}. The footer auto-adds unsubscribe + address.
const BASE_HTML = (content, options = {}) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#e8e8e8;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
  <tr><td align="center" style="padding:24px 12px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#141414;border:1px solid #2a2a2a;border-radius:8px;">
      <tr><td style="padding:32px;color:#e8e8e8;font-size:15px;line-height:1.6;">
        ${content}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;font-size:11px;color:#888;text-align:center;">
        Loud Legacy, ${options.address || '123 Main St, City, ST 00000'}<br>
        <a href="{{unsubscribe_url}}" style="color:#E8B84B;text-decoration:underline;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="https://loud-legacy.com" style="color:#888;">loud-legacy.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

const SEED_TEMPLATES = [
  {
    name: 'Sponsorship CRM Newsletter',
    category: 'newsletter',
    subject_line: 'The Sponsorship Weekly — {{month}}',
    preview_text: 'New features, sponsor-tracking tips, and the week in sponsorship.',
    html_content: BASE_HTML(`
      <h1 style="margin:0 0 8px;color:#E8B84B;font-size:22px;">The Sponsorship Weekly</h1>
      <p style="color:#888;margin:0 0 24px;font-size:12px;">Hi {{first_name}},</p>
      <p>This week in sponsorship: three big things to share.</p>
      <p style="margin:24px 0;"><a href="https://loud-legacy.com/blog" style="background:#E8B84B;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Read the issue →</a></p>
    `),
  },
  {
    name: 'Product Announcement',
    category: 'promotional',
    subject_line: 'New in Loud Legacy: {{feature_name}}',
    preview_text: 'We just shipped something you\'ll want to see.',
    html_content: BASE_HTML(`
      <h1 style="margin:0 0 16px;color:#E8B84B;">New: {{feature_name}}</h1>
      <p>Hi {{first_name}},</p>
      <p>We just shipped {{feature_name}} — and we built it specifically for teams like {{organization}}.</p>
      <p style="margin:24px 0;"><a href="https://loud-legacy.com/changelog" style="background:#E8B84B;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">See what's new →</a></p>
    `),
  },
  {
    name: 'Free Trial Welcome',
    category: 'transactional',
    subject_line: 'Welcome to Loud Legacy — start here',
    preview_text: 'Your 14-day free trial is ready. Here\'s the fastest path to value.',
    html_content: BASE_HTML(`
      <h1 style="margin:0 0 16px;color:#E8B84B;">Welcome, {{first_name}} 👋</h1>
      <p>Your Loud Legacy trial is live. The single fastest way to see value is to upload one sponsorship contract — our AI will parse every benefit in about 30 seconds.</p>
      <p style="margin:24px 0;"><a href="https://loud-legacy.com/app/crm/contracts" style="background:#E8B84B;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Upload your first contract</a></p>
    `),
  },
  {
    name: 'Upgrade Offer',
    category: 'promotional',
    subject_line: "You're ready for Pro, {{first_name}}",
    preview_text: 'Based on how you\'re using Loud Legacy, here\'s why Pro makes sense.',
    html_content: BASE_HTML(`
      <h1 style="margin:0 0 16px;color:#E8B84B;">Ready for Pro?</h1>
      <p>Hi {{first_name}},</p>
      <p>Your team at {{organization}} has been using Loud Legacy well. Here's why Pro is the next step:</p>
      <ul><li>Unlimited deals</li><li>Full automation engine</li><li>Team seats</li></ul>
      <p style="margin:24px 0;"><a href="https://loud-legacy.com/#pricing" style="background:#E8B84B;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Upgrade now</a></p>
    `),
  },
  {
    name: 'Case Study',
    category: 'newsletter',
    subject_line: 'How {{case_org}} manages {{case_count}} sponsors with Loud Legacy',
    preview_text: 'Real numbers from a real team.',
    html_content: BASE_HTML(`
      <h1 style="margin:0 0 16px;color:#E8B84B;">A case study worth reading</h1>
      <p>Hi {{first_name}},</p>
      <p>{{case_org}} runs their entire sponsorship program on Loud Legacy. Here's what their team did and what they measured.</p>
      <p style="margin:24px 0;"><a href="https://loud-legacy.com/case-studies" style="background:#E8B84B;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Read the case study</a></p>
    `),
  },
  {
    name: 'Re-engagement',
    category: 'drip',
    subject_line: 'Did we lose you, {{first_name}}?',
    preview_text: 'No pressure — just checking in.',
    html_content: BASE_HTML(`
      <h1 style="margin:0 0 16px;color:#E8B84B;">Still there?</h1>
      <p>Hi {{first_name}},</p>
      <p>We haven't seen you in Loud Legacy lately. No pressure — just wanted to make sure the tool's still useful to your team at {{organization}}.</p>
      <p>If something specific is blocking you, hit reply and tell me. I read everything.</p>
      <p>— Jason</p>
    `),
  },
  {
    name: 'Drip Email — Day 1',
    category: 'drip',
    subject_line: 'The feature most people miss on day one',
    preview_text: 'Takes 20 seconds and saves hours later.',
    html_content: BASE_HTML(`
      <h1 style="margin:0 0 16px;color:#E8B84B;">Hidden feature alert</h1>
      <p>Hi {{first_name}},</p>
      <p>Most people start in the deal pipeline. But the fastest way to get value from Loud Legacy is the contract uploader — drop any sponsorship PDF and AI pulls every benefit in 30 seconds.</p>
      <p style="margin:24px 0;"><a href="https://loud-legacy.com/app/crm/contracts" style="background:#E8B84B;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Try it now</a></p>
    `),
  },
  {
    name: 'Conference Industry Newsletter',
    category: 'newsletter',
    subject_line: 'Sponsorship trends for conference organizers — {{month}}',
    preview_text: 'What conference teams are seeing this month.',
    html_content: BASE_HTML(`
      <h1 style="margin:0 0 16px;color:#E8B84B;">Conference Sponsorship Monthly</h1>
      <p>Hi {{first_name}},</p>
      <p>Three trends we're seeing across conference sponsorship this month:</p>
      <ol><li>Later commitment windows</li><li>Higher emphasis on data deliverables</li><li>Smaller but higher-value packages</li></ol>
      <p style="margin:24px 0;"><a href="https://loud-legacy.com/blog" style="background:#E8B84B;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Read more</a></p>
    `),
  },
]

export async function listTemplates({ category } = {}) {
  let q = supabase.from('email_templates').select('*').order('created_at', { ascending: false })
  if (category && category !== 'all') q = q.eq('category', category)
  const { data, error } = await q
  return error ? { templates: [], error: error.message } : { templates: data || [] }
}

export async function getTemplate(id) {
  const { data, error } = await supabase.from('email_templates').select('*').eq('id', id).maybeSingle()
  return error ? { template: null, error: error.message } : { template: data }
}

export async function createTemplate(fields, userId, propertyId) {
  const { data, error } = await supabase
    .from('email_templates')
    .insert({ ...fields, created_by: userId, property_id: propertyId })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, template: data }
}

export async function updateTemplate(id, patch) {
  const { data, error } = await supabase
    .from('email_templates')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, template: data }
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from('email_templates').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

/** Seed default templates if none exist. */
export async function seedIfEmpty(userId, propertyId) {
  const { data } = await supabase.from('email_templates').select('id').limit(1)
  if (data && data.length > 0) return { seeded: false }
  const rows = SEED_TEMPLATES.map(t => ({
    ...t,
    plain_text_content: htmlToText(t.html_content),
    is_system_template: true,
    created_by: userId,
    property_id: propertyId,
  }))
  const { error } = await supabase.from('email_templates').insert(rows)
  return error ? { seeded: false, error: error.message } : { seeded: true, count: rows.length }
}

/** Replace {{vars}} with subscriber data + runtime vars. */
export function substituteVariables(template, subscriber, runtime = {}) {
  const vars = {
    first_name: subscriber?.first_name || '',
    last_name: subscriber?.last_name || '',
    email: subscriber?.email || '',
    organization: subscriber?.organization || '',
    industry: subscriber?.industry || '',
    plan: subscriber?.loud_legacy_plan || '',
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    unsubscribe_url: runtime.unsubscribeUrl || '#',
    ...runtime,
  }
  const sub = (s) => (s || '').replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m))
  return {
    subject: sub(template.subject_line),
    html: sub(template.html_content),
    text: sub(template.plain_text_content || htmlToText(template.html_content)),
    preview: sub(template.preview_text),
  }
}

/** Stripped-down HTML → text conversion for plain text fallback. */
export function htmlToText(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
