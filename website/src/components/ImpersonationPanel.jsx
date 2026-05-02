import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useImpersonation } from '@/hooks/useImpersonation'
import { setQAIndustry } from '@/hooks/useIndustryConfig'

const INDUSTRIES = [
  { value: '', label: 'Default' },
  { value: 'college', label: 'Sports — College' },
  { value: 'professional', label: 'Sports — Pro' },
  { value: 'minor_league', label: 'Sports — Minor League' },
  { value: 'agency', label: 'Agency' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'conference', label: 'Conference' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'media', label: 'Media' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
]

const ROLES = [
  { value: '', label: 'Default (developer)' },
  { value: 'admin', label: 'Admin' },
  { value: 'businessops', label: 'Business Ops' },
  { value: 'rep', label: 'Rep' },
]

export default function ImpersonationPanel() {
  const { realIsDeveloper } = useAuth()
  const { industry, role, tier, tierPresets, isActive, setIndustry, setRole, setTier, reset } = useImpersonation()
  const [open, setOpen] = useState(false)

  if (!realIsDeveloper) return null

  function handleIndustry(value) {
    setIndustry(value)
    // Keep legacy QA override key in sync so any direct readers stay aligned
    setQAIndustry(value || null)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`hidden md:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
          isActive
            ? 'bg-warning/15 text-warning border-warning/40'
            : 'bg-bg-card text-accent border-accent/30 hover:border-accent'
        }`}
        title="Developer impersonation panel"
      >
        <span>{isActive ? 'Impersonating' : 'View as'}</span>
        <span className="opacity-60">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-bg-surface border border-border rounded-lg shadow-xl z-50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Impersonate</span>
              {isActive && (
                <button
                  onClick={() => { reset(); setQAIndustry(null) }}
                  className="text-[10px] text-danger hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            <Field label="Industry">
              <select
                value={industry || ''}
                onChange={(e) => handleIndustry(e.target.value)}
                className="w-full bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                {INDUSTRIES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Role">
              <select
                value={role || ''}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                {ROLES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Account Tier">
              <div className="grid grid-cols-3 gap-1">
                <TierButton
                  label="Off"
                  active={!tier}
                  onClick={() => setTier(null)}
                />
                {Object.entries(tierPresets).map(([key, preset]) => (
                  <TierButton
                    key={key}
                    label={preset.label}
                    active={tier === key}
                    onClick={() => setTier(key)}
                  />
                ))}
              </div>
            </Field>

            <div className="text-[10px] text-text-muted leading-relaxed pt-1 border-t border-border">
              Preview only. Database writes still happen as the developer.
              Sign in as the user for true impersonation.
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1">{label}</div>
      {children}
    </div>
  )
}

function TierButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-mono py-1 rounded transition-colors border ${
        active
          ? 'bg-accent/15 text-accent border-accent/40'
          : 'bg-bg-card text-text-secondary border-border hover:border-accent/30'
      }`}
    >
      {label}
    </button>
  )
}
