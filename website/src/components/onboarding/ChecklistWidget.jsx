import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useAuth } from '@/hooks/useAuth'

export default function ChecklistWidget() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { checklistItems, loaded } = useOnboarding()
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!loaded || !profile) return null
  if (dismissed) return null

  // Hide for returning users — the checklist is only useful during
  // the first-week ramp-up. After that, it becomes clutter.
  //
  // "Returning user" heuristic:
  //   - Account older than 7 days, OR
  //   - Onboarding marked complete AND checklist is more than half done
  // Either signal means they know the product already.
  const accountAge = profile.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
    : 0
  if (accountAge > 7) return null

  const completed = checklistItems.filter(i => i.completed).length
  const total = checklistItems.length

  // Hide if all items are done
  if (completed >= total) return null

  // Hide if onboarding is complete AND the user has made meaningful
  // progress. They're past the point where a checklist helps.
  if (profile.onboarding_completed && total > 0 && completed / total >= 0.5) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 right-3 md:right-4 z-30 w-[calc(100vw-24px)] sm:w-80 max-w-sm">
      <div className={`bg-bg-surface border border-accent/40 rounded-lg shadow-2xl overflow-hidden transition-all ${expanded ? '' : ''}`}>
        {/* Header */}
        <div
          className="px-3 py-2.5 bg-gradient-to-r from-accent/10 to-bg-card border-b border-border flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-accent">Getting started</span>
            <span className="text-[10px] font-mono text-text-muted">{completed}/{total}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
              className="text-text-muted hover:text-text-primary text-[10px] px-1"
              aria-label="Dismiss"
            >
              ×
            </button>
            <span className="text-text-muted text-xs">{expanded ? '▾' : '▸'}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-bg-card">
          <div className="h-1 bg-accent transition-all" style={{ width: `${(completed / total) * 100}%` }} />
        </div>

        {/* Expanded checklist */}
        {expanded && (
          <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
            {checklistItems.map(item => (
              <button
                key={item.key}
                onClick={() => { navigate(item.link); setExpanded(false) }}
                className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded hover:bg-bg-card transition-colors ${item.completed ? 'opacity-60' : ''}`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${item.completed ? 'bg-success text-bg-primary' : 'border border-border text-text-muted'}`}>
                  {item.completed && '✓'}
                </span>
                <span className={`text-[11px] flex-1 ${item.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>{item.label}</span>
                {!item.completed && <span className="text-[10px] text-accent">→</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
