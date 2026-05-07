import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useAuth } from '@/hooks/useAuth'

const MAX_LOGINS_TO_SHOW = 3
const loginCountKey = (uid) => `ll_login_count_${uid}`

export default function ChecklistWidget() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { checklistItems, loaded } = useOnboarding()
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Increment a per-user login counter the first time the widget
  // mounts in this browser session. Once the count exceeds 3 we
  // never auto-show the checklist again. Survives page refreshes
  // because it's keyed in localStorage.
  useEffect(() => {
    if (!profile?.id) return
    const sessionFlag = `ll_login_counted_${profile.id}`
    if (sessionStorage.getItem(sessionFlag) === '1') return
    try {
      const cur = parseInt(localStorage.getItem(loginCountKey(profile.id)) || '0', 10)
      localStorage.setItem(loginCountKey(profile.id), String(cur + 1))
      sessionStorage.setItem(sessionFlag, '1')
    } catch { /* private mode */ }
  }, [profile?.id])

  if (!loaded || !profile) return null
  if (dismissed) return null

  // Hide once the user has logged in 3+ times — they know the
  // product by then and the widget becomes clutter. Reads the
  // counter the effect above maintains.
  let logins = 0
  try { logins = parseInt(localStorage.getItem(loginCountKey(profile.id)) || '0', 10) } catch { /* ignore */ }
  if (logins > MAX_LOGINS_TO_SHOW) return null

  const completed = checklistItems.filter(i => i.completed).length
  const total = checklistItems.length

  // Hide if all items are done
  if (completed >= total) return null

  // Hide if onboarding is complete AND the user has made meaningful
  // progress. They're past the point where a checklist helps.
  if (profile.onboarding_completed && total > 0 && completed / total >= 0.5) return null

  return (
    // Bottom-row floater: sits to the left of the Issue bubble
    // (which sits left of the Prospecting copilot pill). Compact
    // width when collapsed — opens to the full 320px panel on
    // click and grows upward (anchored at the bottom edge).
    <div className={`fixed z-30 bottom-20 md:bottom-5 right-[124px] md:right-[280px] ${expanded ? 'w-[calc(100vw-140px)] sm:w-80 max-w-sm' : 'w-auto'}`}>
      <div className="bg-bg-surface border border-accent/40 rounded-lg shadow-2xl overflow-hidden transition-all">
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
