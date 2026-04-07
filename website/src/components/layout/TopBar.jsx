import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import NotificationCenter from '../NotificationCenter'
import { APIUsageCompact } from './../../components/APIUsageBanner'
import { setQAIndustry } from '@/hooks/useIndustryConfig'

export default function TopBar({ onMenuToggle, mobileMenuOpen }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  function openSearch() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }

  return (
    <header className="h-14 border-b border-border bg-bg-surface flex items-center justify-between px-3 sm:px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="md:hidden text-text-muted hover:text-text-primary text-lg p-1 -ml-1"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Mobile logo */}
        <button onClick={() => navigate('/app')} className="md:hidden font-mono font-bold text-accent text-xs cursor-pointer hover:opacity-80 transition-opacity" style={{letterSpacing:'0.08em',wordSpacing:'-0.3em'}}>LOUD LEGACY</button>

        {/* Desktop property info */}
        {profile?.properties?.name && (
          <span className="hidden md:inline text-sm text-text-primary font-medium">
            {profile.properties.name}
          </span>
        )}
        {profile?.properties?.sport && (
          <span className="hidden md:inline text-xs text-text-muted font-mono bg-bg-card px-2 py-0.5 rounded">
            {profile.properties.sport}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search - full on desktop, icon on mobile */}
        <button
          onClick={openSearch}
          className="hidden sm:flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary hover:border-accent/30 transition-colors"
        >
          <span>Search...</span>
          <kbd className="text-[10px] font-mono bg-bg-surface px-1.5 py-0.5 rounded border border-border">Ctrl+K</kbd>
        </button>
        <button
          onClick={openSearch}
          className="sm:hidden text-text-muted hover:text-text-primary p-1"
          aria-label="Search"
        >
          ⌕
        </button>

        <div className="hidden lg:block">
          <APIUsageCompact />
        </div>
        {profile?.role === 'developer' && (
          <select
            defaultValue={localStorage.getItem('ll_qa_industry') || ''}
            onChange={(e) => setQAIndustry(e.target.value || null)}
            className="hidden md:block bg-bg-card border border-accent/30 rounded px-2 py-1 text-[10px] font-mono text-accent focus:outline-none focus:border-accent"
            title="QA: Switch industry view"
          >
            <option value="">QA: Default</option>
            <option value="college">Sports — College</option>
            <option value="professional">Sports — Pro</option>
            <option value="minor_league">Sports — Minor League</option>
            <option value="agency">Agency</option>
            <option value="entertainment">Entertainment</option>
            <option value="conference">Conference</option>
            <option value="nonprofit">Nonprofit</option>
            <option value="media">Media</option>
            <option value="realestate">Real Estate</option>
            <option value="other">Other</option>
          </select>
        )}
        <NotificationCenter />
        <span className="hidden sm:inline text-sm text-text-secondary truncate max-w-[120px]">
          {profile?.full_name || profile?.id?.slice(0, 8)}
        </span>
        <span className="hidden md:inline text-[10px] font-mono text-text-muted bg-bg-card px-2 py-0.5 rounded uppercase">
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
