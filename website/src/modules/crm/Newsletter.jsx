import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { generateWeeklyNewsletter, generateAfternoonUpdate } from '@/lib/claude'

function getMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// Get current ET hour (accounting for EDT/EST roughly)
function getETHour() {
  const now = new Date()
  const etOffset = -5 // EST; EDT would be -4
  const utcHour = now.getUTCHours()
  return (utcHour + etOffset + 24) % 24
}

const CATEGORY_COLORS = {
  Deals: 'bg-success/10 text-success',
  Trends: 'bg-accent/10 text-accent',
  Technology: 'bg-purple-500/10 text-purple-400',
  Brands: 'bg-warning/10 text-warning',
  Data: 'bg-blue-500/10 text-blue-400',
  Development: 'bg-accent/10 text-accent',
  Intel: 'bg-success/10 text-success',
  Brand: 'bg-warning/10 text-warning',
  Conversation: 'bg-purple-500/10 text-purple-400',
  Thought: 'bg-blue-500/10 text-blue-400',
}

export default function Newsletter() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const [view, setView] = useState('latest')
  const [selectedNewsletter, setSelectedNewsletter] = useState(null)
  const autoGenTriggered = useRef({ weekly: false, afternoon: false })

  // Fetch ALL newsletters globally (no property filter — shared across all users)
  const { data: newsletters, isLoading, isFetched } = useQuery({
    queryKey: ['newsletters-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data
    },
  })

  const weeklyDigests = newsletters?.filter(n => n.type === 'weekly_digest') || []
  const afternoonUpdates = newsletters?.filter(n => n.type === 'afternoon_update') || []
  const latestWeekly = weeklyDigests[0]
  const latestAfternoon = afternoonUpdates[0]

  // Determine what's current
  const now = new Date()
  const monday = getMonday()
  const weekOf = monday.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]
  const etHour = getETHour()
  const isMonday = now.getDay() === 1

  // Check staleness
  const weeklyIsCurrent = latestWeekly?.week_of === weekOf
  const afternoonIsCurrent = latestAfternoon?.published_at
    ? new Date(latestAfternoon.published_at).toISOString().split('T')[0] === todayStr
    : false

  // Weekly should exist if it's Monday 6am+ ET or any day after Monday of this week
  const weeklyNeeded = !weeklyIsCurrent && (isMonday ? etHour >= 6 : true)
  // Afternoon should exist if it's 1pm+ ET today
  const afternoonNeeded = !afternoonIsCurrent && etHour >= 13

  // Auto-generate mutations (silent — no toast, no manual trigger needed)
  const weeklyMutation = useMutation({
    mutationFn: () => generateWeeklyNewsletter({ property_id: propertyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletters-global'] }),
  })

  const afternoonMutation = useMutation({
    mutationFn: () => generateAfternoonUpdate({ property_id: propertyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletters-global'] }),
  })

  // Auto-generate weekly on load if stale (runs once)
  useEffect(() => {
    if (isFetched && weeklyNeeded && !autoGenTriggered.current.weekly && !weeklyMutation.isPending) {
      autoGenTriggered.current.weekly = true
      weeklyMutation.mutate()
    }
  }, [isFetched, weeklyNeeded])

  // Auto-generate afternoon on load if stale (runs once)
  useEffect(() => {
    if (isFetched && afternoonNeeded && !autoGenTriggered.current.afternoon && !afternoonMutation.isPending) {
      autoGenTriggered.current.afternoon = true
      afternoonMutation.mutate()
    }
  }, [isFetched, afternoonNeeded])

  // Generating state
  const isGenerating = weeklyMutation.isPending || afternoonMutation.isPending

  // On latest view, auto-show the latest weekly by default
  const displayNewsletter = selectedNewsletter ||
    (view === 'latest' && latestWeekly && !isGenerating ? latestWeekly : null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Newsletter</h1>
          <p className="text-text-secondary text-sm mt-1">
            Sports business intelligence &mdash; auto-updated weekly & daily
          </p>
        </div>
        <div className="flex gap-3 text-xs font-mono text-text-muted items-center">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${weeklyIsCurrent ? 'bg-success' : 'bg-warning animate-pulse'}`}></span>
            <span>Weekly {weeklyIsCurrent ? 'current' : weeklyMutation.isPending ? 'generating...' : 'updating'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${afternoonIsCurrent ? 'bg-success' : etHour < 13 ? 'bg-text-muted' : 'bg-warning animate-pulse'}`}></span>
            <span>Afternoon {afternoonIsCurrent ? 'current' : etHour < 13 ? 'arrives 1pm ET' : afternoonMutation.isPending ? 'generating...' : 'updating'}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-bg-card rounded-lg p-1">
          {[
            { key: 'latest', label: 'This Week' },
            { key: 'afternoon', label: 'Afternoon Access' },
            { key: 'archive', label: `Archive (${newsletters?.length || 0})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setView(key); setSelectedNewsletter(null) }}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                view === key ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-xs text-text-muted font-mono">
          Mondays 6am ET &middot; Daily 1pm ET
        </div>
      </div>

      {/* Generation spinner */}
      {isGenerating && !displayNewsletter && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-text-muted">
              {weeklyMutation.isPending ? 'Composing this week\'s digest...' : 'Preparing today\'s afternoon access...'}
            </p>
            <p className="text-xs text-text-muted mt-1">This will be ready in a moment</p>
          </div>
        </div>
      )}

      {/* Loading initial data */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
        </div>
      )}

      {/* ===== THIS WEEK VIEW ===== */}
      {view === 'latest' && !isLoading && (
        <>
          {/* If we have a selected or default newsletter, show it full-screen */}
          {displayNewsletter ? (
            <div>
              {selectedNewsletter && (
                <button
                  onClick={() => setSelectedNewsletter(null)}
                  className="text-xs text-text-muted hover:text-accent mb-3 flex items-center gap-1"
                >
                  &larr; Back
                </button>
              )}

              {/* Quick switch between weekly and afternoon */}
              {!selectedNewsletter && (latestWeekly || latestAfternoon) && (
                <div className="flex gap-2 mb-4">
                  {latestWeekly && (
                    <button
                      onClick={() => setSelectedNewsletter(latestWeekly)}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                        (displayNewsletter?.id === latestWeekly?.id) ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'
                      }`}
                    >
                      Weekly Digest &mdash; {latestWeekly.week_of}
                    </button>
                  )}
                  {latestAfternoon && (
                    <button
                      onClick={() => setSelectedNewsletter(latestAfternoon)}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                        (displayNewsletter?.id === latestAfternoon?.id) ? 'bg-warning/80 text-bg-primary border-warning' : 'border-border text-text-secondary hover:border-warning/50'
                      }`}
                    >
                      Afternoon Access &mdash; {new Date(latestAfternoon.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </button>
                  )}
                </div>
              )}

              <NewsletterReader newsletter={displayNewsletter} />
            </div>
          ) : !isGenerating && (
            <div className="bg-bg-surface border border-border rounded-lg p-12 text-center">
              <p className="text-text-muted text-sm">
                {etHour < 6 && isMonday ? 'This week\'s digest will be ready at 6:00 AM ET.' :
                 'Newsletter will be generated momentarily...'}
              </p>
            </div>
          )}
        </>
      )}

      {/* ===== AFTERNOON ACCESS LIST ===== */}
      {view === 'afternoon' && !isLoading && (
        <div className="space-y-3">
          {selectedNewsletter ? (
            <div>
              <button
                onClick={() => setSelectedNewsletter(null)}
                className="text-xs text-text-muted hover:text-accent mb-3 flex items-center gap-1"
              >
                &larr; Back to list
              </button>
              <NewsletterReader newsletter={selectedNewsletter} />
            </div>
          ) : (
            <>
              {afternoonUpdates.length === 0 && !isGenerating ? (
                <div className="text-center text-text-muted text-sm py-12">
                  {etHour < 13 ? 'Today\'s Afternoon Access arrives at 1:00 PM ET.' : 'No afternoon updates yet.'}
                </div>
              ) : afternoonUpdates.map(n => (
                <NewsletterCard key={n.id} newsletter={n} onClick={() => setSelectedNewsletter(n)} />
              ))}
            </>
          )}
        </div>
      )}

      {/* ===== FULL ARCHIVE ===== */}
      {view === 'archive' && !isLoading && (
        <div className="space-y-3">
          {selectedNewsletter ? (
            <div>
              <button
                onClick={() => setSelectedNewsletter(null)}
                className="text-xs text-text-muted hover:text-accent mb-3 flex items-center gap-1"
              >
                &larr; Back to archive
              </button>
              <NewsletterReader newsletter={selectedNewsletter} />
            </div>
          ) : (
            <>
              {(!newsletters || newsletters.length === 0) ? (
                <div className="text-center text-text-muted text-sm py-12">No archived newsletters.</div>
              ) : (
                <div className="space-y-2">
                  {newsletters.map(n => (
                    <NewsletterCard key={n.id} newsletter={n} onClick={() => setSelectedNewsletter(n)} compact />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* Newsletter card for list views */
function NewsletterCard({ newsletter, onClick, featured, compact }) {
  const isWeekly = newsletter.type === 'weekly_digest'
  const topics = newsletter.topics || []

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="bg-bg-surface border border-border rounded-lg px-4 py-3 cursor-pointer hover:border-accent/30 transition-colors flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
            isWeekly ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
          }`}>
            {isWeekly ? 'Weekly' : 'Daily'}
          </span>
          <span className="text-sm text-text-primary truncate">{newsletter.title}</span>
        </div>
        <span className="text-xs text-text-muted font-mono shrink-0">{formatDate(newsletter.published_at)}</span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`bg-bg-surface border border-border rounded-lg p-4 cursor-pointer hover:border-accent/30 transition-colors ${
        featured ? 'ring-1 ring-accent/10' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${
              isWeekly ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
            }`}>
              {isWeekly ? 'Weekly' : 'Afternoon'}
            </span>
            <span className="text-xs text-text-muted font-mono">
              {formatDate(newsletter.published_at)} {formatTime(newsletter.published_at)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-text-primary mb-1">{newsletter.title}</h3>
          {newsletter.summary && (
            <p className="text-xs text-text-secondary line-clamp-2 mb-2">{newsletter.summary}</p>
          )}
          {topics.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {topics.slice(0, 5).map((topic, i) => (
                <span key={i} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  CATEGORY_COLORS[topic.category] || 'bg-bg-card text-text-muted'
                }`}>
                  {topic.title?.length > 40 ? topic.title.slice(0, 40) + '...' : topic.title}
                </span>
              ))}
              {topics.length > 5 && (
                <span className="text-[10px] font-mono text-text-muted">+{topics.length - 5} more</span>
              )}
            </div>
          )}
        </div>
        <span className="text-text-muted text-lg shrink-0">&rsaquo;</span>
      </div>
    </div>
  )
}

/* Full newsletter reader */
function NewsletterReader({ newsletter }) {
  const isWeekly = newsletter.type === 'weekly_digest'
  const topics = newsletter.topics || []

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-bg-surface border border-border rounded-t-lg p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${
            isWeekly ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
          }`}>
            {isWeekly ? 'Weekly Digest' : 'Afternoon Access'}
          </span>
          <span className="text-xs text-text-muted font-mono">
            {formatDate(newsletter.published_at)}
          </span>
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">{newsletter.title}</h1>
        {newsletter.summary && (
          <p className="text-sm text-text-secondary max-w-xl mx-auto">{newsletter.summary}</p>
        )}
      </div>

      {/* Topic pills */}
      {topics.length > 0 && (
        <div className="bg-bg-surface border-x border-border px-6 py-3 flex gap-2 flex-wrap">
          {topics.map((topic, i) => (
            <span key={i} className={`text-xs font-mono px-2 py-1 rounded ${
              CATEGORY_COLORS[topic.category] || 'bg-bg-card text-text-muted'
            }`}>
              {topic.title}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="bg-bg-surface border border-border rounded-b-lg px-6 py-8">
        <div
          className="newsletter-content prose prose-sm max-w-none text-text-primary
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text-primary [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border
            [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-text-primary [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:text-sm [&_p]:text-text-secondary [&_p]:leading-relaxed [&_p]:mb-3
            [&_ul]:text-sm [&_ul]:text-text-secondary [&_ul]:ml-4 [&_ul]:mb-3
            [&_li]:mb-1 [&_li]:leading-relaxed
            [&_strong]:text-text-primary [&_strong]:font-medium
            [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:bg-accent/5 [&_blockquote]:rounded-r
            [&_blockquote_p]:text-accent/90 [&_blockquote_p]:text-sm [&_blockquote_p]:italic
            [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2"
          dangerouslySetInnerHTML={{ __html: newsletter.content }}
        />
      </div>

      {/* Footer */}
      <div className="text-center mt-4">
        <p className="text-xs text-text-muted font-mono">
          Published {formatDate(newsletter.published_at)} at {formatTime(newsletter.published_at)}
          {newsletter.week_of && ` \u00b7 Week of ${newsletter.week_of}`}
        </p>
      </div>
    </div>
  )
}
