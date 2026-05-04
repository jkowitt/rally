import { useEffect, useRef } from 'react'
import AddonsCatalog from './AddonsCatalog'
import { Sparkles, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

// AdditionalFeaturesPanel — right-side slide-over invoked from the
// sidebar's "Additional Features" entry. Mounts AddonsCatalog inline
// so the user can browse all 16 add-ons + Buy now (self-serve) or
// Contact sales (high-touch) without leaving the app shell.
//
// Trapped focus + ESC-to-close + scroll-lock while open.
export default function AdditionalFeaturesPanel({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="addfeat-title">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        ref={ref}
        className="w-full sm:w-[640px] max-w-full bg-bg-primary border-l border-border overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-bg-surface border-b border-border px-5 py-3 flex items-center justify-between">
          <div>
            <h2 id="addfeat-title" className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Additional Features
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Specialty modules priced per property. Some you can buy instantly; bigger ones we set up together.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <AddonsCatalog embedded />
        </div>
      </div>
    </div>
  )
}
