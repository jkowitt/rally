import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { searchContacts, linkEmailToContact, createContactFromEmail } from '@/services/dev/emailSyncService'
import { useAuth } from '@/hooks/useAuth'

/**
 * Right panel — shows linked contact + deal context, or a link/create
 * interface when the email is unlinked.
 */
export default function CRMContextPanel({ email, onLinked }) {
  const { profile } = useAuth()
  const [contact, setContact] = useState(null)
  const [deal, setDeal] = useState(null)
  const [activities, setActivities] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!email) return
    if (email.linked_contact_id) {
      loadLinked(email.linked_contact_id, email.linked_deal_id)
    } else {
      setContact(null); setDeal(null); setActivities([])
    }
  }, [email?.id])

  async function loadLinked(contactId, dealId) {
    const { data: c } = await supabase.from('contacts').select('*').eq('id', contactId).maybeSingle()
    setContact(c)
    if (dealId) {
      const { data: d } = await supabase.from('deals').select('*').eq('id', dealId).maybeSingle()
      setDeal(d)
      const { data: acts } = await supabase
        .from('activities')
        .select('id, activity_type, subject, occurred_at')
        .eq('deal_id', dealId)
        .order('occurred_at', { ascending: false })
        .limit(5)
      setActivities(acts || [])
    } else {
      setDeal(null); setActivities([])
    }
  }

  async function runSearch(q) {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setResults(await searchContacts(q))
  }

  async function link(contactId, dealId) {
    await linkEmailToContact({ emailId: email.id, contactId, dealId })
    onLinked?.()
  }

  async function createFromEmail() {
    if (!profile?.property_id) return
    setCreating(true)
    const r = await createContactFromEmail(email.id, profile.property_id)
    setCreating(false)
    if (r.success) onLinked?.()
  }

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-text-muted">
        No email selected
      </div>
    )
  }

  // Linked view
  if (contact) {
    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Contact</div>
          <div className="text-sm font-semibold text-text-primary mt-1">
            {contact.first_name} {contact.last_name}
          </div>
          <div className="text-[11px] text-text-muted">{contact.position} {contact.company && `· ${contact.company}`}</div>
          <div className="text-[11px] text-text-muted mt-1">{contact.email}</div>
        </div>

        {deal && (
          <div className="bg-bg-card border border-border rounded-lg p-4 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Deal</div>
            <div className="text-sm font-semibold text-text-primary">{deal.brand_name}</div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-accent/30 text-accent">{deal.stage}</span>
              {deal.value && <span className="text-[11px] text-text-secondary">${Number(deal.value).toLocaleString()}</span>}
            </div>
          </div>
        )}

        {activities.length > 0 && (
          <div className="bg-bg-card border border-border rounded-lg p-4 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Recent Activity</div>
            {activities.map(a => (
              <div key={a.id} className="text-[11px] border-l-2 border-border pl-2">
                <div className="text-text-primary">{a.activity_type}: {a.subject}</div>
                <div className="text-text-muted">{new Date(a.occurred_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Unlinked — show search + create
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Link to Contact</div>
        <input
          type="text"
          value={query}
          onChange={e => runSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
        />
        {results.length > 0 && (
          <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
            {results.map(c => (
              <button
                key={c.id}
                onClick={() => link(c.id, c.deal_id)}
                className="w-full text-left bg-bg-card border border-border rounded px-2 py-2 text-[11px] hover:border-accent/50"
              >
                <div className="text-text-primary">{c.first_name} {c.last_name}</div>
                <div className="text-text-muted">{c.email} {c.company && `· ${c.company}`}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <button
          onClick={createFromEmail}
          disabled={creating}
          className="w-full bg-accent/10 border border-accent/30 text-accent py-2 rounded text-xs font-semibold hover:bg-accent/20 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create new contact from this email'}
        </button>
        <div className="text-[10px] text-text-muted mt-2">
          Pre-fills from sender: {email.from_name || email.from_email}
        </div>
      </div>
    </div>
  )
}
