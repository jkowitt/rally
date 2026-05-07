import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOnboarding } from '@/hooks/useOnboarding'
import { ChevronDown, Settings, LogOut, User, Mail, ShieldCheck, BookOpen, PlayCircle } from 'lucide-react'

// UserMenu — replaces the standalone "name + role pill + Sign Out"
// strip in the top-right of the TopBar with a single clickable
// pill that opens a dropdown. Dropdown surfaces:
//   • Full name + email + role at the top so the rep can confirm
//     which account they're signed into (the original ask: "let me
//     see which email the name is associated with").
//   • Settings / Profile / Inbox-connect shortcuts.
//   • Sign out at the bottom.
//
// Closes on outside click + Esc. Keyboard accessible: Enter / Space
// on the pill toggles, arrow keys are not strictly needed because
// the menu is short.
export default function UserMenu() {
  const { profile, signOut } = useAuth()
  const { resumeOnboarding } = useOnboarding()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Outside-click + Esc to close.
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const name = profile?.full_name || profile?.email?.split('@')[0] || 'You'
  const email = profile?.email || ''
  const role = profile?.role || ''

  // First-letter avatar — shape matches the rest of the app's small
  // round badges. Falls back to a generic icon when there's no name.
  const initial = (name || ' ').trim().charAt(0).toUpperCase()

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={email || name}
        className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm transition-colors ${open ? 'bg-bg-card' : 'hover:bg-bg-card'}`}
      >
        <span className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-mono font-semibold shrink-0">
          {initial}
        </span>
        <span className="hidden sm:flex flex-col items-start min-w-0">
          <span className="text-text-primary truncate max-w-[140px] leading-tight">{name}</span>
          {email && (
            <span className="text-[10px] text-text-muted truncate max-w-[140px] leading-tight font-mono">
              {email}
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-72 bg-bg-surface border border-border rounded-lg shadow-2xl z-50 overflow-hidden"
        >
          {/* Account context block — name, email, role pill so the
              rep can confirm exactly which account they're using. */}
          <div className="p-3 border-b border-border bg-bg-card/60 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-mono font-semibold shrink-0">
                {initial}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-text-primary font-medium truncate">{name}</div>
                {role && (
                  <span className="inline-block text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-bg-surface text-text-muted">
                    {role}
                  </span>
                )}
              </div>
            </div>
            {email && (
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono pt-1">
                <Mail className="w-3 h-3" />
                <span className="truncate">{email}</span>
              </div>
            )}
          </div>

          {/* Quick links — Settings + Profile + Inbox */}
          <div className="py-1">
            <MenuItem
              to="/app/settings"
              icon={Settings}
              label="Settings"
              sub="Plan, billing, integrations"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              to="/app/crm/inbox/signature"
              icon={User}
              label="Profile & signature"
              sub="Name, email signature, avatar"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              to="/app/crm/inbox/connect"
              icon={ShieldCheck}
              label="Inbox connections"
              sub="Outlook · Gmail · Notifications"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              to="/app/manual"
              icon={BookOpen}
              label="User manual"
              sub="Every feature, with steps"
              onClick={() => setOpen(false)}
            />
            <button
              onClick={() => { setOpen(false); resumeOnboarding() }}
              role="menuitem"
              className="w-full flex items-start gap-2 px-3 py-2 hover:bg-bg-card transition-colors text-left"
            >
              <PlayCircle className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text-primary leading-tight">Replay setup</div>
                <div className="text-[10px] text-text-muted leading-tight mt-0.5">
                  Re-open the first-login walkthrough
                </div>
              </div>
            </button>
            {(role === 'developer' || role === 'admin') && (
              <MenuItem
                to="/app/developer"
                icon={BookOpen}
                label="Dev Tools"
                sub="Feature flags, QA, usage"
                onClick={() => setOpen(false)}
              />
            )}
          </div>

          {/* Sign out — visually separated so it's hard to fat-finger. */}
          <button
            onClick={() => { setOpen(false); signOut() }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-danger hover:bg-danger/10 border-t border-border"
            role="menuitem"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function MenuItem({ to, icon: Icon, label, sub, onClick }: { to: string; icon: any; label: string; sub: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      role="menuitem"
      className="flex items-start gap-2 px-3 py-2 hover:bg-bg-card transition-colors"
    >
      <Icon className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-text-primary leading-tight">{label}</div>
        <div className="text-[10px] text-text-muted leading-tight mt-0.5">{sub}</div>
      </div>
    </Link>
  )
}
