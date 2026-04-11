import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const TOOLTIPS = [
  { selector: 'a[href="/app/crm/pipeline"]', title: 'Deal Pipeline', body: 'Your deals live here — drag and drop to update stages.' },
  { selector: 'a[href="/app/crm/contracts"]', title: 'Contract Manager', body: 'Upload contracts here — AI extracts every benefit automatically.' },
  { selector: 'a[href="/app/crm/insights"]', title: 'AI Insights', body: 'Click here for AI-powered recommendations on any deal.' },
  { selector: 'a[href="/app/crm/fulfillment"]', title: 'Fulfillment Tracker', body: 'Track delivery of every sponsor benefit here.' },
]

export default function TooltipTour() {
  const { profile } = useAuth()
  const [index, setIndex] = useState(-1)
  const [targetRect, setTargetRect] = useState(null)

  useEffect(() => {
    if (!profile || profile.tooltip_tour_completed) return
    if (!profile.onboarding_completed) return
    // Start tour after a small delay so the layout settles
    const timer = setTimeout(() => setIndex(0), 1000)
    return () => clearTimeout(timer)
  }, [profile])

  useEffect(() => {
    if (index < 0 || index >= TOOLTIPS.length) return
    const el = document.querySelector(TOOLTIPS[index].selector)
    if (!el) {
      // Skip to next if element not found
      next()
      return
    }
    const rect = el.getBoundingClientRect()
    setTargetRect(rect)
  }, [index])

  async function finish() {
    setIndex(-1)
    try {
      await supabase.from('profiles').update({ tooltip_tour_completed: true }).eq('id', profile.id)
    } catch {}
  }

  function next() {
    if (index >= TOOLTIPS.length - 1) finish()
    else setIndex(index + 1)
  }

  if (index < 0 || !targetRect) return null
  const tip = TOOLTIPS[index]

  // Position tooltip relative to target
  const tooltipStyle = {
    position: 'fixed',
    top: targetRect.bottom + 8,
    left: Math.min(targetRect.left, window.innerWidth - 280),
    maxWidth: 260,
    zIndex: 201,
  }

  const ringStyle = {
    position: 'fixed',
    top: targetRect.top - 4,
    left: targetRect.left - 4,
    width: targetRect.width + 8,
    height: targetRect.height + 8,
    zIndex: 200,
    pointerEvents: 'none',
  }

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 z-[199] bg-black/60" onClick={next} />

      {/* Gold pulsing ring around target */}
      <div style={ringStyle} className="rounded-lg border-2 border-accent animate-pulse" />

      {/* Tooltip */}
      <div style={tooltipStyle} className="bg-bg-surface border border-accent/50 rounded-lg shadow-2xl p-3">
        <div className="text-xs font-semibold text-accent mb-1">{tip.title}</div>
        <div className="text-[11px] text-text-secondary mb-3 leading-relaxed">{tip.body}</div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={finish} className="text-[10px] text-text-muted hover:text-text-primary">Skip tour</button>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted">{index + 1}/{TOOLTIPS.length}</span>
            <button onClick={next} className="bg-accent text-bg-primary px-3 py-1 rounded text-[11px] font-semibold hover:opacity-90">
              {index === TOOLTIPS.length - 1 ? 'Done' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
