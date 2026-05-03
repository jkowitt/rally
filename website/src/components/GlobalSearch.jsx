import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const RECENT_SEARCHES_KEY = 'rally_recent_searches'
const MAX_RECENT_SEARCHES = 5

function getRecentSearches() {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(term) {
  try {
    const searches = getRecentSearches().filter((s) => s !== term)
    searches.unshift(term)
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES))
    )
  } catch {
    // localStorage unavailable
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // localStorage unavailable
  }
}

function formatCurrency(value) {
  if (value == null) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatStage(stage) {
  if (!stage) return null
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const CATEGORIES = [
  {
    key: 'deals',
    label: 'Deals',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    route: '/app/crm/pipeline',
    columns: ['brand_name', 'contact_name', 'contact_email', 'value', 'stage'],
    searchColumns: ['brand_name', 'contact_name', 'contact_email'],
    display: (r) => r.brand_name,
    subtitle: (r) => [r.contact_name, r.contact_email].filter(Boolean).join(' · '),
    preview: (r) => {
      const parts = []
      if (r.value != null) parts.push(formatCurrency(r.value))
      if (r.stage) parts.push(formatStage(r.stage))
      return parts.join(' · ') || null
    },
  },
  {
    key: 'contacts',
    label: 'Contacts',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    route: '/app/crm/pipeline',
    columns: ['first_name', 'last_name', 'email', 'phone', 'company', 'position'],
    searchColumns: ['first_name', 'last_name', 'email', 'company'],
    display: (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'Unknown',
    subtitle: (r) => [r.position, r.company].filter(Boolean).join(' at ') || '',
    preview: (r) => {
      const parts = []
      if (r.email) parts.push(r.email)
      if (r.phone) parts.push(r.phone)
      return parts.join(' · ') || null
    },
  },
  {
    key: 'contracts',
    label: 'Contracts',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    route: '/app/crm/contracts',
    columns: ['brand_name', 'contract_number', 'status', 'total_value'],
    searchColumns: ['brand_name', 'contract_number'],
    display: (r) => r.brand_name || r.contract_number,
    subtitle: (r) => r.contract_number || '',
    preview: (r) => {
      const parts = []
      if (r.status) parts.push(r.status.charAt(0).toUpperCase() + r.status.slice(1))
      if (r.total_value != null) parts.push(formatCurrency(r.total_value))
      return parts.join(' · ') || null
    },
  },
  {
    key: 'assets',
    label: 'Assets',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    route: '/app/crm/assets',
    columns: ['name'],
    searchColumns: ['name'],
    display: (r) => r.name,
    subtitle: () => '',
    preview: () => null,
  },
  {
    key: 'activities',
    label: 'Activities',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    route: '/app/crm/activities',
    columns: ['subject', 'activity_type'],
    searchColumns: ['subject'],
    display: (r) => r.subject,
    subtitle: (r) => r.activity_type ? r.activity_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '',
    preview: (r) => r.activity_type ? r.activity_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null,
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    route: '/app/crm/tasks',
    columns: ['title', 'status', 'priority', 'due_date'],
    searchColumns: ['title'],
    display: (r) => r.title,
    subtitle: () => '',
    preview: (r) => {
      const parts = []
      if (r.priority) parts.push(r.priority.charAt(0).toUpperCase() + r.priority.slice(1))
      if (r.status) parts.push(r.status)
      if (r.due_date) {
        const d = new Date(r.due_date)
        parts.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      }
      return parts.join(' · ') || null
    },
  },
]

function highlightMatch(text, query) {
  if (!text || !query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-accent/30 text-text-primary rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState([])
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { profile } = useAuth()

  // Quick-action commands that run instead of navigating to a specific
  // record. Matched against the query string by label + keywords; also
  // shown when the search is empty so users can discover them.
  const QUICK_ACTIONS = [
    { id: 'goto-pipeline',  label: 'Go to Pipeline',           hint: 'Open the deal kanban',           keywords: 'pipeline deals kanban', run: () => navigate('/app/crm/pipeline') },
    { id: 'goto-accounts',  label: 'Go to Account Management', hint: 'Contracts + fulfillment',         keywords: 'accounts contracts fulfillment', run: () => navigate('/app/accounts') },
    { id: 'goto-ops',       label: 'Go to Operations',         hint: 'Marketing, finance, team',        keywords: 'ops operations marketing finance team', run: () => navigate('/app/ops') },
    { id: 'goto-tasks',     label: 'Go to Tasks',              hint: 'Open task list',                  keywords: 'tasks todo to-do', run: () => navigate('/app/crm/tasks') },
    { id: 'goto-fulfillment', label: 'Go to Fulfillment',      hint: 'Track delivered benefits',        keywords: 'fulfillment delivered benefits', run: () => navigate('/app/crm/fulfillment') },
    { id: 'goto-contracts', label: 'Go to Contracts',          hint: 'Upload + manage contracts',       keywords: 'contracts upload', run: () => navigate('/app/crm/contracts') },
    { id: 'create-deal',    label: 'Create new deal',          hint: 'Open the new deal form',          keywords: 'new deal create add', run: () => { navigate('/app/crm/pipeline'); setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-deal')), 60) } },
    { id: 'find-prospects', label: 'Find Prospects',           hint: 'AI-powered prospect search',      keywords: 'find prospects search ai', run: () => { navigate('/app/crm/pipeline'); setTimeout(() => window.dispatchEvent(new CustomEvent('open-find-prospects')), 60) } },
    { id: 'upload-contract', label: 'Upload contract',         hint: 'Send a signed contract to AM',    keywords: 'upload contract sign signed', run: () => { navigate('/app/crm/contracts'); setTimeout(() => window.dispatchEvent(new CustomEvent('open-upload-contract')), 60) } },
    { id: 'goto-settings',  label: 'Open Settings',            hint: 'Plan, billing, addons',           keywords: 'settings plan billing addons', run: () => navigate('/app/settings') },
  ]

  const q = query.trim().toLowerCase()
  const matchedActions = q
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(q) || a.keywords.includes(q))
    : QUICK_ACTIONS.slice(0, 5)

  // Build flat list of all results for keyboard navigation. Actions
  // come first so Enter on an empty query runs the top action.
  const flatResults = [
    ...matchedActions.map(a => ({ ...a, _action: true })),
    ...CATEGORIES.flatMap((cat) =>
      (results[cat.key] || []).map((r) => ({ ...r, _category: cat }))
    ),
  ]

  // Total result count
  const totalCount = flatResults.length

  // Count per category
  const categoryCounts = {}
  for (const cat of CATEGORIES) {
    const count = (results[cat.key] || []).length
    if (count > 0) categoryCounts[cat.key] = count
  }

  // Focus input when opened, load recent searches
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({})
      setActiveIndex(0)
      setRecentSearches(getRecentSearches())
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Debounced search (300ms)
  useEffect(() => {
    if (!query.trim() || !profile?.property_id) {
      setResults({})
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(() => {
      performSearch(query.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [query, profile?.property_id])

  async function performSearch(term) {
    const pattern = `%${term}%`
    const propertyId = profile.property_id

    try {
      const queries = CATEGORIES.map((cat) => {
        let q = supabase
          .from(cat.key)
          .select(cat.columns.join(', '))
          .eq('property_id', propertyId)
          .limit(5)

        // Build OR filter across searchable columns only
        const orFilter = cat.searchColumns.map((col) => `${col}.ilike.${pattern}`).join(',')
        q = q.or(orFilter)

        return q.then(({ data, error }) => ({
          key: cat.key,
          data: error ? [] : data || [],
        }))
      })

      const settled = await Promise.all(queries)
      const grouped = {}
      for (const { key, data } of settled) {
        if (data.length > 0) grouped[key] = data
      }

      setResults(grouped)

      // Save to recent searches if we got results
      if (Object.keys(grouped).length > 0) {
        saveRecentSearch(term)
      }
    } catch {
      // Silently handle errors - results stay empty
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = useCallback(
    (item) => {
      if (query.trim()) saveRecentSearch(query.trim())
      onClose()
      if (item._action) {
        try { item.run() } catch (e) { console.warn('Action failed:', e) }
        return
      }
      navigate(item._category.route)
    },
    [onClose, navigate, query]
  )

  const handleRecentSearch = useCallback(
    (term) => {
      setQuery(term)
    },
    []
  )

  const handleClearRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatResults[activeIndex]) {
            handleSelect(flatResults[activeIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, flatResults, activeIndex, handleSelect, onClose])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  if (!open) return null

  let itemIndex = -1

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-3 sm:px-0"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal - full width on mobile, constrained on desktop */}
      <div
        className="relative w-full max-w-xl bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden sm:max-h-[80vh] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 sm:py-3 border-b border-border shrink-0">
          <svg
            className="w-5 h-5 text-text-muted shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals, contacts, contracts, assets..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm sm:text-sm text-base outline-none min-h-[44px] sm:min-h-0"
          />
          {loading && (
            <svg
              className="w-4 h-4 text-text-muted animate-spin shrink-0"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {!loading && totalCount > 0 && (
            <span className="hidden sm:inline text-xs text-text-muted shrink-0">
              {totalCount} result{totalCount !== 1 ? 's' : ''}
            </span>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-text-muted bg-bg-primary border border-border rounded">
            ESC
          </kbd>
          {/* Mobile close button */}
          <button
            className="sm:hidden p-1 text-text-muted hover:text-text-primary"
            onClick={onClose}
            aria-label="Close search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
          {/* No results state */}
          {query.trim() && !loading && flatResults.length === 0 && (
            <div className="px-4 py-10 text-center">
              <svg
                className="w-10 h-10 text-text-muted mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-sm text-text-secondary">
                No results for "<span className="text-text-primary font-medium">{query}</span>"
              </p>
              <p className="text-xs text-text-muted mt-2">Suggestions:</p>
              <ul className="text-xs text-text-muted mt-1 space-y-0.5">
                <li>Check your spelling</li>
                <li>Try broader keywords (e.g. brand name, contact email)</li>
                <li>Search by deal name, contract number, or task title</li>
              </ul>
            </div>
          )}

          {/* Empty state with recent searches */}
          {!query.trim() && (
            <div className="px-4 py-6">
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Recent Searches
                    </span>
                    <button
                      onClick={handleClearRecent}
                      className="text-xs text-text-muted hover:text-accent transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleRecentSearch(term)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 sm:py-2 text-left rounded-lg hover:bg-bg-card transition-colors group min-h-[44px] sm:min-h-0"
                      >
                        <svg
                          className="w-4 h-4 text-text-muted shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm text-text-secondary group-hover:text-text-primary truncate">
                          {term}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-text-muted">
                    Start typing to search across all your data
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {CATEGORIES.map((cat) => (
                      <span
                        key={cat.key}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-text-muted bg-bg-card rounded-md border border-border"
                      >
                        {cat.icon}
                        {cat.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick actions — always render at top when matches exist */}
          {matchedActions.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider bg-bg-primary/50 sticky top-0 flex items-center justify-between">
                <span>Actions</span>
                <span className="text-[10px] font-normal text-text-muted bg-bg-card px-1.5 py-0.5 rounded-full border border-border">
                  {matchedActions.length}
                </span>
              </div>
              {matchedActions.map((a, i) => {
                itemIndex++
                const currentIndex = itemIndex
                const isActive = currentIndex === activeIndex
                return (
                  <button
                    key={a.id}
                    data-active={isActive}
                    onClick={() => handleSelect({ ...a, _action: true })}
                    onMouseEnter={() => setActiveIndex(currentIndex)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors min-h-[48px] sm:min-h-0 ${
                      isActive ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-bg-card'
                    }`}
                  >
                    <span className={`text-sm shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`}>
                      ⌘
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.label}</div>
                      {a.hint && <div className="text-xs text-text-muted truncate">{a.hint}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Categorized results with preview cards */}
          {CATEGORIES.map((cat) => {
            const items = results[cat.key]
            if (!items || items.length === 0) return null

            return (
              <div key={cat.key}>
                {/* Section header with count */}
                <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider bg-bg-primary/50 sticky top-0 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {cat.label}
                  </span>
                  <span className="text-[10px] font-normal text-text-muted bg-bg-card px-1.5 py-0.5 rounded-full border border-border">
                    {items.length}
                  </span>
                </div>
                {items.map((item, i) => {
                  itemIndex++
                  const currentIndex = itemIndex
                  const isActive = currentIndex === activeIndex
                  const displayText = cat.display(item)
                  const subtitleText = cat.subtitle(item)
                  const previewText = cat.preview(item)

                  return (
                    <button
                      key={`${cat.key}-${i}`}
                      data-active={isActive}
                      onClick={() =>
                        handleSelect({ ...item, _category: cat })
                      }
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-left transition-colors min-h-[52px] sm:min-h-0 ${
                        isActive
                          ? 'bg-accent/10 text-accent'
                          : 'text-text-primary hover:bg-bg-card'
                      }`}
                    >
                      <span
                        className={`shrink-0 ${
                          isActive ? 'text-accent' : 'text-text-muted'
                        }`}
                      >
                        {cat.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {highlightMatch(displayText, query)}
                        </div>
                        {subtitleText && (
                          <div className="text-xs text-text-muted truncate mt-0.5">
                            {highlightMatch(subtitleText, query)}
                          </div>
                        )}
                        {/* Preview card info */}
                        {previewText && (
                          <div className={`text-xs mt-0.5 truncate ${isActive ? 'text-accent/70' : 'text-text-muted/70'}`}>
                            {previewText}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <kbd className="hidden sm:inline-flex shrink-0 items-center px-1.5 py-0.5 text-[10px] font-medium text-text-muted bg-bg-primary border border-border rounded">
                          Enter
                        </kbd>
                      )}
                      {/* Mobile arrow indicator */}
                      {!isActive && (
                        <svg
                          className="w-4 h-4 text-text-muted/40 shrink-0 sm:hidden"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {flatResults.length > 0 && (
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-border text-[11px] text-text-muted shrink-0">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-bg-primary border border-border rounded text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-bg-primary border border-border rounded text-[10px]">↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-bg-primary border border-border rounded text-[10px]">↵</kbd>
              open
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-bg-primary border border-border rounded text-[10px]">esc</kbd>
              close
            </span>
            <span className="ml-auto text-text-muted">
              {totalCount} result{totalCount !== 1 ? 's' : ''} across {Object.keys(categoryCounts).length} categor{Object.keys(categoryCounts).length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
        )}

        {/* Mobile footer - simplified */}
        {flatResults.length > 0 && (
          <div className="sm:hidden flex items-center justify-center px-4 py-2 border-t border-border text-xs text-text-muted shrink-0">
            {totalCount} result{totalCount !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
    </div>
  )
}
