import { useState } from 'react'
import { useIndustryConfig } from '@/hooks/useIndustryConfig'

const FAQ = [
  { q: 'How do I add a new prospect?', a: 'Go to Pipeline → click "+ New Deal" or use "Find Prospects" to search by company name or industry. AI will auto-research contacts.', category: 'Pipeline' },
  { q: 'How do I upload a contract?', a: 'Go to Contracts → "Upload Contract" tab → choose a PDF or Word file. AI automatically extracts benefits, contacts, and revenue data.', category: 'Contracts' },
  { q: 'How do I track fulfillment?', a: 'Go to Fulfillment. Benefits from signed contracts auto-populate. Mark items as delivered, add notes, and generate recap reports.', category: 'Fulfillment' },
  { q: 'How do I find decision-maker contacts?', a: 'Open any deal → Contacts tab → click "AI Find Contacts". AI discovers top executives with names, titles, emails, and LinkedIn profiles.', category: 'Contacts' },
  { q: 'How does the newsletter work?', a: 'The Newsletter page auto-generates a weekly industry digest every Monday and daily afternoon highlights. No action needed — content appears automatically.', category: 'Newsletter' },
  { q: 'How do I invite my team?', a: 'Go to Team → click "Invite Member" → enter their email. They\'ll get a link to join your property with the role you assign.', category: 'Team' },
  { q: 'What are asset categories?', a: 'Assets are the sponsorship inventory you sell — LED boards, jersey patches, social posts, etc. Categories adapt based on your industry.', category: 'Assets' },
  { q: 'How do valuations work?', a: 'Go to the valuation module → select an asset → enter metrics (audience, duration, etc.). AI calculates estimated value and market position.', category: 'Valuations' },
  { q: 'How do I export data?', a: 'Most pages have export buttons: CSV in Activities, iCal in Events, PDF in Contracts, PowerPoint in Fulfillment.', category: 'Export' },
  { q: 'How do I manage events?', a: 'Go to the events module → create events with date, venue, and type. Add tasks, vendors, run-of-show, and sponsor activations per event.', category: 'Events' },
  { q: 'How do I upgrade my plan?', a: 'Go to Settings → scroll to Plan & Billing → click Upgrade on any tier. Payment is processed through Stripe.', category: 'Billing' },
  { q: 'Can I use this for non-sports industries?', a: 'Yes! At registration, select your industry type. The platform adapts terminology, asset categories, event types, and valuations to your industry.', category: 'General' },
]

const SHORTCUTS = [
  { keys: 'Ctrl+K', desc: 'Open global search' },
  { keys: 'Escape', desc: 'Close modals and menus' },
  { keys: 'Enter', desc: 'Submit forms and quick-add items' },
  { keys: 'Double-click', desc: 'Edit table cells inline' },
]

export default function HelpCenter() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const config = useIndustryConfig()

  const categories = [...new Set(FAQ.map(f => f.category))]
  const filtered = FAQ.filter(f => {
    if (category && f.category !== category) return false
    if (search) {
      const s = search.toLowerCase()
      return f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s)
    }
    return true
  })

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Help Center</h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">Find answers and learn how to use the platform</p>
      </div>

      {/* Search */}
      <input
        placeholder="Search help topics..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
        autoFocus
      />

      {/* Category pills */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setCategory('')} className={`px-2.5 py-1 rounded text-xs font-mono ${!category ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted hover:text-text-secondary'}`}>All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(category === c ? '' : c)} className={`px-2.5 py-1 rounded text-xs font-mono ${category === c ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted hover:text-text-secondary'}`}>{c}</button>
        ))}
      </div>

      {/* FAQ */}
      <div className="space-y-2">
        {filtered.map((faq, i) => (
          <FAQItem key={i} question={faq.q} answer={faq.a} category={faq.category} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-text-muted text-sm py-8 bg-bg-surface border border-border rounded-lg">
            No results found. Try a different search term.
          </div>
        )}
      </div>

      {/* Keyboard shortcuts */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
        <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Keyboard Shortcuts</h2>
        <div className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="flex items-center justify-between py-1">
              <span className="text-sm text-text-secondary">{s.desc}</span>
              <kbd className="text-[10px] font-mono text-text-muted bg-bg-card px-2 py-0.5 rounded border border-border">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 text-center">
        <p className="text-sm text-text-secondary">Still need help?</p>
        <a href="mailto:jason@loud-legacy.com" className="text-accent text-sm hover:underline mt-1 block">
          Contact support &rarr;
        </a>
      </div>
    </div>
  )
}

function FAQItem({ question, answer, category }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-text-primary">{question}</span>
        </div>
        <span className="text-text-muted text-xs shrink-0 ml-2">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-sm text-text-secondary leading-relaxed">{answer}</p>
          <span className="text-[9px] font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded mt-2 inline-block">{category}</span>
        </div>
      )}
    </div>
  )
}
