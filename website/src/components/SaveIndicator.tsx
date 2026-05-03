import type { SaveStatus } from '@/hooks/useAutoSave'

// Compact status badge + manual save button for any surface
// using useAutoSave. Pass the hook's return values directly:
//
//   const auto = useAutoSave(value, saveFn)
//   <SaveIndicator {...auto} />

export interface SaveIndicatorProps {
  status: SaveStatus
  save: () => void | Promise<void>
  lastSavedAt: Date | null
  error: Error | null
  className?: string
  showManualButton?: boolean
}

type Tone = 'muted' | 'warning' | 'success' | 'accent' | 'danger'

interface Label {
  text: string
  tone: Tone
}

export default function SaveIndicator({
  status,
  save,
  lastSavedAt,
  error,
  className = '',
  showManualButton = true,
}: SaveIndicatorProps) {
  const labels: Record<SaveStatus, Label> = {
    idle: { text: 'Up to date', tone: 'muted' },
    dirty: { text: 'Unsaved changes', tone: 'warning' },
    saving: { text: 'Saving…', tone: 'accent' },
    saved: { text: lastSavedAt ? `Saved · ${formatTime(lastSavedAt)}` : 'Saved', tone: 'success' },
    error: { text: error?.message ? `Save failed: ${error.message}` : 'Save failed', tone: 'danger' },
  }
  const current = labels[status] || labels.idle
  const toneClass =
    current.tone === 'warning' ? 'text-warning' :
    current.tone === 'success' ? 'text-success' :
    current.tone === 'accent'  ? 'text-accent' :
    current.tone === 'danger'  ? 'text-danger' :
    'text-text-muted'

  return (
    <div className={`inline-flex items-center gap-3 text-xs font-mono ${className}`}>
      <span
        className={toneClass}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {current.text}
      </span>
      {showManualButton && (status === 'dirty' || status === 'error') && (
        <button
          type="button"
          onClick={() => { void save() }}
          className="px-2 py-1 rounded bg-accent text-bg-primary hover:bg-accent/90 transition-colors text-[11px] font-medium"
        >
          Save now
        </button>
      )}
    </div>
  )
}

function formatTime(d: Date): string {
  try {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
