import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
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

function getETHour() {
  const now = new Date()
  const etString = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })
  return parseInt(etString) || 0
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

const GEN_STEPS = {
  weekly: [
    'Scanning sports business headlines...',
    'Analyzing sponsorship deals and partnerships...',
    'Reviewing market trends and data...',
    'Spotlighting brand strategies...',
    'Compiling key stats and numbers...',
    'Drafting actionable insights...',
    'Verifying sources and citations...',
    'Formatting your weekly digest...',
  ],
  afternoon: [
    'Scanning afternoon developments...',
    'Gathering industry intel...',
    'Finding notable brand moves...',
    'Crafting conversation starters...',
    'Verifying sources...',
  ],
}

export default function Newsletter() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [view, setView] = useState('latest')
  const [selectedNewsletter, setSelectedNewsletter] = useState(null)
  const autoGenTriggered = useRef({ weekly: false, afternoon: false })

  // Progress tracking for generation
  const [genProgress, setGenProgress] = useState({ type: null, step: 0, startedAt: null })
  const progressInterval = useRef(null)

  function startProgress(type) {
    const steps = GEN_STEPS[type]
    setGenProgress({ type, step: 0, startedAt: Date.now() })
    let step = 0
    clearInterval(progressInterval.current)
    progressInterval.current = setInterval(() => {
      step++
      if (step < steps.length) {
        setGenProgress(prev => ({ ...prev, step }))
      }
    }, 3500) // advance step every 3.5s
  }

  function stopProgress() {
    clearInterval(progressInterval.current)
    setGenProgress({ type: null, step: 0, startedAt: null })
  }

  useEffect(() => {
    return () => clearInterval(progressInterval.current)
  }, [])

  // Fetch newsletters globally
  const { data: newsletters, isLoading, isFetched, isError } = useQuery({
    queryKey: ['newsletters-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(200)
      if (error) {
        // Table may not exist yet — return empty
        console.warn('Newsletter query error (table may not exist):', error.message)
        return []
      }
      return data || []
    },
    retry: false,
    refetchInterval: 15 * 60 * 1000, // Re-check every 15 minutes
    refetchIntervalInBackground: true,
  })

  const weeklyDigests = (newsletters || []).filter(n => n.type === 'weekly_digest')
  const afternoonUpdates = (newsletters || []).filter(n => n.type === 'afternoon_update')
  const latestWeekly = weeklyDigests[0]
  const latestAfternoon = afternoonUpdates[0]

  const now = new Date()
  const monday = getMonday()
  const weekOf = monday.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  // Archive excludes the current week's digest and today's afternoon
  const archivedNewsletters = (newsletters || []).filter(n => {
    if (n.type === 'weekly_digest' && n.week_of === weekOf) return false
    if (n.type === 'afternoon_update' && n.published_at && new Date(n.published_at).toISOString().split('T')[0] === todayStr) return false
    return true
  })
  const etHour = getETHour()
  const isMonday = now.getDay() === 1

  const weeklyIsCurrent = latestWeekly?.week_of === weekOf
  const afternoonIsCurrent = latestAfternoon?.published_at
    ? new Date(latestAfternoon.published_at).toISOString().split('T')[0] === todayStr
    : false

  // Always generate weekly if none exists for this week
  // Schedule: Monday 6am ET, but generate immediately if there's nothing at all
  const weeklyNeeded = !weeklyIsCurrent
  // Always generate afternoon if none exists for today (after 1pm ET, or immediately if no afternoon exists at all)
  const afternoonNeeded = !afternoonIsCurrent && (afternoonUpdates.length === 0 || etHour >= 13)

  // Locally generated newsletters (in case DB table doesn't exist yet)
  const [localWeekly, setLocalWeekly] = useState(null)
  const [localAfternoon, setLocalAfternoon] = useState(null)

  // Mutations with progress tracking
  const weeklyMutation = useMutation({
    mutationFn: () => {
      startProgress('weekly')
      return generateWeeklyNewsletter({ property_id: propertyId })
    },
    onSuccess: (data) => {
      stopProgress()
      // Store locally so it displays even if DB insert failed
      if (data?.newsletter) {
        setLocalWeekly({
          id: 'local-weekly-' + Date.now(),
          type: 'weekly_digest',
          title: data.newsletter.title,
          content: data.newsletter.content,
          summary: data.newsletter.summary || '',
          topics: data.newsletter.topics || [],
          week_of: weekOf,
          published_at: new Date().toISOString(),
        })
      }
      queryClient.invalidateQueries({ queryKey: ['newsletters-global'] })
    },
    onError: (err) => {
      stopProgress()
      toast({ title: 'Newsletter generation failed', description: err.message, type: 'error' })
    },
  })

  const afternoonMutation = useMutation({
    mutationFn: () => {
      startProgress('afternoon')
      return generateAfternoonUpdate({ property_id: propertyId })
    },
    onSuccess: (data) => {
      stopProgress()
      if (data?.update) {
        setLocalAfternoon({
          id: 'local-afternoon-' + Date.now(),
          type: 'afternoon_update',
          title: data.update.title,
          content: data.update.content,
          summary: data.update.summary || '',
          topics: data.update.topics || [],
          published_at: new Date().toISOString(),
        })
      }
      queryClient.invalidateQueries({ queryKey: ['newsletters-global'] })
    },
    onError: (err) => {
      stopProgress()
      toast({ title: 'Afternoon update failed', description: err.message, type: 'error' })
    },
  })

  // Auto-generate on load (once per session)
  useEffect(() => {
    if ((isFetched || isError) && weeklyNeeded && !autoGenTriggered.current.weekly && !weeklyMutation.isPending) {
      autoGenTriggered.current.weekly = true
      weeklyMutation.mutate()
    }
  }, [isFetched, isError, weeklyNeeded])

  useEffect(() => {
    if ((isFetched || isError) && afternoonNeeded && !autoGenTriggered.current.afternoon && !afternoonMutation.isPending && !weeklyMutation.isPending) {
      // Wait for weekly to finish if it's also generating
      autoGenTriggered.current.afternoon = true
      afternoonMutation.mutate()
    }
  }, [isFetched, isError, afternoonNeeded, weeklyMutation.isPending])

  const isGenerating = weeklyMutation.isPending || afternoonMutation.isPending

  // Use local newsletters as fallback if DB didn't have them
  const effectiveWeekly = latestWeekly || localWeekly
  const effectiveAfternoon = latestAfternoon || localAfternoon
  const effectiveWeeklyIsCurrent = effectiveWeekly?.week_of === weekOf || !!localWeekly
  const effectiveAfternoonIsCurrent = effectiveAfternoon ? (
    new Date(effectiveAfternoon.published_at).toISOString().split('T')[0] === todayStr || !!localAfternoon
  ) : false

  // Show old content while generating new — never blank the screen
  const displayNewsletter = selectedNewsletter ||
    (view === 'latest' && effectiveWeekly ? effectiveWeekly : null)

  // Progress UI data
  const progressSteps = genProgress.type ? GEN_STEPS[genProgress.type] : []
  const progressPct = progressSteps.length > 0
    ? Math.min(95, ((genProgress.step + 1) / progressSteps.length) * 100)
    : 0
  const elapsed = genProgress.startedAt ? Math.floor((Date.now() - genProgress.startedAt) / 1000) : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Newsletter</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Sports business intelligence &mdash; auto-updated weekly & daily
          </p>
        </div>
        <div className="flex gap-3 text-[10px] sm:text-xs font-mono text-text-muted items-center">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${effectiveWeeklyIsCurrent ? 'bg-success' : weeklyMutation.isPending ? 'bg-accent animate-pulse' : 'bg-warning'}`}></span>
            <span>Weekly {effectiveWeeklyIsCurrent ? 'current' : weeklyMutation.isPending ? 'generating...' : 'pending'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${effectiveAfternoonIsCurrent ? 'bg-success' : etHour < 13 ? 'bg-text-muted' : afternoonMutation.isPending ? 'bg-accent animate-pulse' : 'bg-warning'}`}></span>
            <span>Afternoon {effectiveAfternoonIsCurrent ? 'current' : etHour < 13 ? '1pm ET' : afternoonMutation.isPending ? 'generating...' : 'pending'}</span>
          </div>
        </div>
      </div>

      {/* ===== GENERATION PROGRESS BANNER ===== */}
      {isGenerating && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full shrink-0"></div>
            <div>
              <div className="text-sm font-medium text-text-primary">
                {weeklyMutation.isPending ? 'Generating Weekly Digest' : 'Generating Afternoon Access'}
              </div>
              <div className="text-xs text-text-muted font-mono mt-0.5">
                {elapsed}s elapsed
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-bg-card rounded-full h-2 mb-3">
            <div
              className="bg-accent rounded-full h-2 transition-all duration-1000 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Step list */}
          <div className="space-y-1.5">
            {progressSteps.map((step, i) => {
              const isDone = i < genProgress.step
              const isActive = i === genProgress.step
              const isPending = i > genProgress.step
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-xs w-4 text-center shrink-0 ${isDone ? 'text-success' : isActive ? 'text-accent' : 'text-text-muted/30'}`}>
                    {isDone ? '✓' : isActive ? '●' : '○'}
                  </span>
                  <span className={`text-xs ${isDone ? 'text-text-secondary' : isActive ? 'text-text-primary font-medium' : 'text-text-muted/40'}`}>
                    {step}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error retry */}
      {(weeklyMutation.isError || afternoonMutation.isError) && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-danger">
            Failed to generate newsletter. {weeklyMutation.error?.message || afternoonMutation.error?.message}
          </div>
          <button
            onClick={() => weeklyMutation.isError ? weeklyMutation.mutate() : afternoonMutation.mutate()}
            className="bg-danger text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex gap-1 bg-bg-card rounded-lg p-1 overflow-x-auto">
          {[
            { key: 'latest', label: 'This Week' },
            { key: 'afternoon', label: 'Afternoon Access' },
            { key: 'archive', label: `Archive (${archivedNewsletters.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setView(key); setSelectedNewsletter(null) }}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                view === key ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="hidden sm:block text-xs text-text-muted font-mono">
          Mondays 6am ET &middot; Daily 1pm ET
        </div>
      </div>

      {/* Loading initial data */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
        </div>
      )}

      {/* ===== THIS WEEK VIEW ===== */}
      {view === 'latest' && !isLoading && (
        <>
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

              {/* Quick switch */}
              {(effectiveWeekly || effectiveAfternoon) && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {effectiveWeekly && (
                    <button
                      onClick={() => setSelectedNewsletter(effectiveWeekly)}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                        (displayNewsletter?.id === effectiveWeekly?.id) ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'
                      }`}
                    >
                      Weekly Digest &mdash; {effectiveWeekly.week_of}
                    </button>
                  )}
                  {effectiveAfternoon && (
                    <button
                      onClick={() => setSelectedNewsletter(effectiveAfternoon)}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                        (displayNewsletter?.id === effectiveAfternoon?.id) ? 'bg-warning/80 text-bg-primary border-warning' : 'border-border text-text-secondary hover:border-warning/50'
                      }`}
                    >
                      Afternoon Access &mdash; {new Date(effectiveAfternoon.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </button>
                  )}
                </div>
              )}

              <NewsletterReader newsletter={displayNewsletter} />
            </div>
          ) : !isGenerating && (
            <div className="bg-bg-surface border border-border rounded-lg p-8 sm:p-12 text-center">
              <div className="text-3xl mb-3">📰</div>
              <p className="text-text-secondary text-sm mb-1">No newsletter yet for this week</p>
              <p className="text-text-muted text-xs mb-4">
                The weekly digest auto-generates every Monday at 6:00 AM ET
              </p>
              <button
                onClick={() => weeklyMutation.mutate()}
                disabled={weeklyMutation.isPending}
                className="bg-accent text-bg-primary px-5 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Generate Now
              </button>
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
              {afternoonUpdates.length === 0 && !localAfternoon && !isGenerating ? (
                <div className="bg-bg-surface border border-border rounded-lg p-8 sm:p-12 text-center">
                  <div className="text-3xl mb-3">☀️</div>
                  <p className="text-text-secondary text-sm mb-1">
                    {etHour < 13 ? 'Today\'s Afternoon Access arrives at 1:00 PM ET' : 'No afternoon updates yet'}
                  </p>
                  <p className="text-text-muted text-xs mb-4">Daily highlights auto-generate each afternoon</p>
                  <button
                    onClick={() => afternoonMutation.mutate()}
                    disabled={afternoonMutation.isPending}
                    className="bg-accent text-bg-primary px-5 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Generate Now
                  </button>
                </div>
              ) : (
                <>
                  {localAfternoon && !afternoonUpdates.some(n => n.id === localAfternoon.id) && (
                    <NewsletterCard key={localAfternoon.id} newsletter={localAfternoon} onClick={() => setSelectedNewsletter(localAfternoon)} />
                  )}
                  {afternoonUpdates.map(n => (
                    <NewsletterCard key={n.id} newsletter={n} onClick={() => setSelectedNewsletter(n)} />
                  ))}
                </>
              )}
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
              {archivedNewsletters.length === 0 ? (
                <div className="bg-bg-surface border border-border rounded-lg p-8 sm:p-12 text-center">
                  <div className="text-3xl mb-3">📁</div>
                  <p className="text-text-secondary text-sm">No archived newsletters yet</p>
                  <p className="text-text-muted text-xs mt-1">Past editions will appear here after this week</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {archivedNewsletters.map(n => (
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  {topic.title?.length > 35 ? topic.title.slice(0, 35) + '...' : topic.title}
                </span>
              ))}
              {topics.length > 5 && (
                <span className="text-[10px] font-mono text-text-muted">+{topics.length - 5}</span>
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
      <div className="bg-bg-surface border border-border rounded-t-lg p-4 sm:p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${
            isWeekly ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
          }`}>
            {isWeekly ? 'Weekly Digest' : 'Afternoon Access'}
          </span>
          <span className="text-xs text-text-muted font-mono">
            {formatDate(newsletter.published_at)}
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-semibold text-text-primary mb-2">{newsletter.title}</h1>
        {newsletter.summary && (
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto">{newsletter.summary}</p>
        )}
      </div>

      {/* Topic pills */}
      {topics.length > 0 && (
        <div className="bg-bg-surface border-x border-border px-4 sm:px-6 py-3 flex gap-2 flex-wrap">
          {topics.map((topic, i) => (
            <span key={i} className={`text-[10px] sm:text-xs font-mono px-2 py-1 rounded ${
              CATEGORY_COLORS[topic.category] || 'bg-bg-card text-text-muted'
            }`}>
              {topic.title}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="bg-bg-surface border border-border rounded-b-lg px-4 sm:px-6 py-6 sm:py-8">
        <div
          className="newsletter-content prose prose-sm max-w-none text-text-primary
            [&_h2]:text-base [&_h2]:sm:text-lg [&_h2]:font-semibold [&_h2]:text-text-primary [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border
            [&_h3]:text-sm [&_h3]:sm:text-base [&_h3]:font-medium [&_h3]:text-text-primary [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:text-xs [&_p]:sm:text-sm [&_p]:text-text-secondary [&_p]:leading-relaxed [&_p]:mb-3
            [&_ul]:text-xs [&_ul]:sm:text-sm [&_ul]:text-text-secondary [&_ul]:ml-4 [&_ul]:mb-3
            [&_li]:mb-1 [&_li]:leading-relaxed
            [&_strong]:text-text-primary [&_strong]:font-medium
            [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:bg-accent/5 [&_blockquote]:rounded-r
            [&_blockquote_p]:text-accent/90 [&_blockquote_p]:text-xs [&_blockquote_p]:sm:text-sm [&_blockquote_p]:italic
            [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2"
          dangerouslySetInnerHTML={{ __html: newsletter.content }}
        />
      </div>

      {/* Footer */}
      <div className="text-center mt-4">
        <p className="text-[10px] sm:text-xs text-text-muted font-mono">
          Published {formatDate(newsletter.published_at)} at {formatTime(newsletter.published_at)}
          {newsletter.week_of && ` \u00b7 Week of ${newsletter.week_of}`}
        </p>
      </div>
    </div>
  )
}
