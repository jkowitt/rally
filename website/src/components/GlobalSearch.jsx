import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

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
    columns: ['brand_name', 'contact_name', 'contact_email'],
    display: (r) => r.brand_name,
    subtitle: (r) => [r.contact_name, r.contact_email].filter(Boolean).join(' · '),
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
    columns: ['brand_name', 'contract_number'],
    display: (r) => r.brand_name || r.contract_number,
    subtitle: (r) => r.contract_number || '',
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
    display: (r) => r.name,
    subtitle: () => '',
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
    columns: ['subject'],
    display: (r) => r.subject,
    subtitle: () => '',
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
    columns: ['title'],
    display: (r) => r.title,
    subtitle: () => '',
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
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { profile } = useAuth()

  // Build flat list of all results for keyboard navigation
  const flatResults = CATEGORIES.flatMap((cat) =>
    (results[cat.key] || []).map((r) => ({ ...r, _category: cat }))
  )

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({})
      setActiveIndex(0)
      // Small delay so the DOM is ready
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Debounced search
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

        // Build OR filter across all searchable columns
        const orFilter = cat.columns.map((col) => `${col}.ilike.${pattern}`).join(',')
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
    } catch {
      // Silently handle errors - results stay empty
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = useCallback(
    (item) => {
      onClose()
      navigate(item._category.route)
    },
    [onClose, navigate]
  )

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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
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
            placeholder="Search deals, contracts, assets, activities, tasks..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none"
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
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-text-muted bg-bg-primary border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto overscroll-contain">
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
              <p className="text-xs text-text-muted mt-1">Try a different search term</p>
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted">Start typing to search across Loud Legacy</p>
            </div>
          )}

          {CATEGORIES.map((cat) => {
            const items = results[cat.key]
            if (!items || items.length === 0) return null

            return (
              <div key={cat.key}>
                <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider bg-bg-primary/50 sticky top-0">
                  {cat.label}
                </div>
                {items.map((item, i) => {
                  itemIndex++
                  const currentIndex = itemIndex
                  const isActive = currentIndex === activeIndex
                  const displayText = cat.display(item)
                  const subtitleText = cat.subtitle(item)

                  return (
                    <button
                      key={`${cat.key}-${i}`}
                      data-active={isActive}
                      onClick={() =>
                        handleSelect({ ...item, _category: cat })
                      }
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
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
                      </div>
                      {isActive && (
                        <kbd className="hidden sm:inline-flex shrink-0 items-center px-1.5 py-0.5 text-[10px] font-medium text-text-muted bg-bg-primary border border-border rounded">
                          Enter
                        </kbd>
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
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[11px] text-text-muted">
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
          </div>
        )}
      </div>
    </div>
  )
}
