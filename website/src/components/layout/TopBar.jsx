import { useAuth } from '@/hooks/useAuth'

export default function TopBar() {
  const { profile, signOut } = useAuth()

  function openSearch() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  return (
    <header className="h-14 border-b border-border bg-bg-surface flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {profile?.properties?.name && (
          <span className="text-sm text-text-primary font-medium">
            {profile.properties.name}
          </span>
        )}
        {profile?.properties?.sport && (
          <span className="text-xs text-text-muted font-mono bg-bg-card px-2 py-0.5 rounded">
            {profile.properties.sport}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={openSearch}
          className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary hover:border-accent/30 transition-colors"
        >
          <span>Search...</span>
          <kbd className="text-[10px] font-mono bg-bg-surface px-1.5 py-0.5 rounded border border-border">Ctrl+K</kbd>
        </button>
        <span className="text-sm text-text-secondary">
          {profile?.full_name || profile?.id?.slice(0, 8)}
        </span>
        <span className="text-[10px] font-mono text-text-muted bg-bg-card px-2 py-0.5 rounded uppercase">
          {profile?.role}
        </span>
        <button
          onClick={signOut}
          className="text-xs text-text-muted hover:text-danger transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
