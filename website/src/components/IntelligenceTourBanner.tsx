import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { Card, Button } from '@/components/ui'

const STORAGE_KEY = 'll.intelligence-tour.dismissed'

// IntelligenceTourBanner — one-time dashboard banner introducing the
// new prospect-intelligence pages. Stays dismissed permanently in
// localStorage once the user closes it. Designed to be unobtrusive:
// renders nothing if previously dismissed.
export default function IntelligenceTourBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setOpen(localStorage.getItem(STORAGE_KEY) !== '1')
  }, [])

  function dismiss() {
    setOpen(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* private mode */ }
  }

  if (!open) return null

  return (
    <Card padding="md" className="border-accent/40 bg-accent/5 relative">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-text-muted hover:text-text-primary p-1"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text-primary mb-1">New: Prospect Intelligence</h3>
          <p className="text-xs text-text-secondary mb-2">
            Five new pages to find better deals faster. Try them in this order:
          </p>
          <ol className="text-xs text-text-secondary space-y-1 list-decimal list-inside mb-3">
            <li><Link to="/app/crm/priority" className="text-accent hover:underline font-medium">Priority Queue</Link> — your hottest contacts ranked by 14-day engagement</li>
            <li><Link to="/app/crm/signals" className="text-accent hover:underline font-medium">Signal Radar</Link> — job changes + funding events worth a same-day reach-out</li>
            <li><Link to="/app/crm/lookalikes" className="text-accent hover:underline font-medium">Lookalikes</Link> — find brands that pattern-match to your wins</li>
            <li><Link to="/app/crm/sequences" className="text-accent hover:underline font-medium">Sequences</Link> — build multi-step cadences and watch their reply rate</li>
            <li><Link to="/app/crm/outreach-analytics" className="text-accent hover:underline font-medium">Outreach Analytics</Link> — see what's working across the team</li>
          </ol>
          <Button size="sm" variant="ghost" onClick={dismiss}>Got it</Button>
        </div>
      </div>
    </Card>
  )
}
