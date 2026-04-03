import { useState, useEffect } from 'react'
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
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [view, setView] = useState('latest') // latest | archive | weekly | afternoon
  const [selectedNewsletter, setSelectedNewsletter] = useState(null)

  // Fetch all newsletters
  const { data: newsletters, isLoading } = useQuery({
    queryKey: ['newsletters', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .eq('property_id', propertyId)
        .order('published_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  // Separate weekly and afternoon
  const weeklyDigests = newsletters?.filter(n => n.type === 'weekly_digest') || []
  const afternoonUpdates = newsletters?.filter(n => n.type === 'afternoon_update') || []

  // Latest of each type
  const latestWeekly = weeklyDigests[0]
  const latestAfternoon = afternoonUpdates[0]

  // Check if weekly needs refresh (6am ET Monday)
  const now = new Date()
  const monday = getMonday()
  const weekOf = monday.toISOString().split('T')[0]
  const needsWeeklyRefresh = !latestWeekly || latestWeekly.week_of !== weekOf

  // Check if afternoon needs refresh (1pm ET daily)
  const todayStr = now.toISOString().split('T')[0]
  const latestAfternoonDate = latestAfternoon?.published_at ? new Date(latestAfternoon.published_at).toISOString().split('T')[0] : null
  const needsAfternoonRefresh = latestAfternoonDate !== todayStr

  // Auto-generate on load if stale
  const weeklyMutation = useMutation({
    mutationFn: () => generateWeeklyNewsletter({ property_id: propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters', propertyId] })
      toast({ title: 'Weekly newsletter generated', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error generating newsletter', description: err.message, type: 'error' }),
  })

  const afternoonMutation = useMutation({
    mutationFn: () => generateAfternoonUpdate({ property_id: propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters', propertyId] })
      toast({ title: 'Afternoon update generated', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error generating update', description: err.message, type: 'error' }),
  })

  // Auto-generate weekly if needed (simulates 6am Monday refresh)
  useEffect(() => {
    if (propertyId && needsWeeklyRefresh && !weeklyMutation.isPending && newsletters !== undefined && !weeklyMutation.isSuccess) {
      weeklyMutation.mutate()
    }
  }, [propertyId, needsWeeklyRefresh, newsletters])

  // Auto-generate afternoon if needed (simulates 1pm daily refresh)
  useEffect(() => {
    if (propertyId && needsAfternoonRefresh && !afternoonMutation.isPending && newsletters !== undefined && !afternoonMutation.isSuccess) {
      // Only auto-generate afternoon after noon ET (approximation)
      const etHour = now.getUTCHours() - 4 // rough ET offset
      if (etHour >= 12) {
        afternoonMutation.mutate()
      }
    }
  }, [propertyId, needsAfternoonRefresh, newsletters])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Newsletter</h1>
          <p className="text-text-secondary text-sm mt-1">
            Sports business intelligence, delivered fresh
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => weeklyMutation.mutate()}
            disabled={weeklyMutation.isPending}
            className="bg-bg-surface border border-border text-text-secondary px-3 py-2 rounded text-sm hover:text-accent hover:border-accent disabled:opacity-50"
          >
            {weeklyMutation.isPending ? 'Generating...' : 'Refresh Weekly'}
          </button>
          <button
            onClick={() => afternoonMutation.mutate()}
            disabled={afternoonMutation.isPending}
            className="bg-bg-surface border border-border text-text-secondary px-3 py-2 rounded text-sm hover:text-accent hover:border-accent disabled:opacity-50"
          >
            {afternoonMutation.isPending ? 'Generating...' : 'Refresh Afternoon'}
          </button>
        </div>
      </div>

      {/* Schedule info */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
        <div className="flex gap-6 text-xs font-mono text-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span>Weekly Digest: Mondays @ 6:00 AM ET</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning"></span>
            <span>Afternoon Access: Daily @ 1:00 PM ET</span>
          </div>
        </div>
        <div className="text-xs text-text-muted font-mono">
          {weeklyDigests.length} weekly &middot; {afternoonUpdates.length} daily in archive
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit">
        {[
          { key: 'latest', label: 'Latest' },
          { key: 'weekly', label: 'Weekly Digests' },
          { key: 'afternoon', label: 'Afternoon Access' },
          { key: 'archive', label: 'Archive' },
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

      {/* Loading */}
      {(isLoading || weeklyMutation.isPending || afternoonMutation.isPending) && !selectedNewsletter && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-text-muted">
              {weeklyMutation.isPending ? 'Composing your weekly digest...' :
               afternoonMutation.isPending ? 'Preparing afternoon highlights...' :
               'Loading newsletters...'}
            </p>
          </div>
        </div>
      )}

      {/* Selected newsletter (full view) */}
      {selectedNewsletter && (
        <div>
          <button
            onClick={() => setSelectedNewsletter(null)}
            className="text-xs text-text-muted hover:text-accent mb-3 flex items-center gap-1"
          >
            &larr; Back to list
          </button>
          <NewsletterReader newsletter={selectedNewsletter} />
        </div>
      )}

      {/* Latest view — show both latest weekly and afternoon side by side */}
      {view === 'latest' && !selectedNewsletter && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Weekly */}
          <div className="space-y-3">
            <h2 className="text-sm font-mono text-text-muted uppercase tracking-wider">Weekly Digest</h2>
            {latestWeekly ? (
              <NewsletterCard
                newsletter={latestWeekly}
                onClick={() => setSelectedNewsletter(latestWeekly)}
                featured
              />
            ) : (
              <div className="bg-bg-surface border border-border rounded-lg p-8 text-center">
                <p className="text-sm text-text-muted mb-3">No weekly digest yet</p>
                <button
                  onClick={() => weeklyMutation.mutate()}
                  disabled={weeklyMutation.isPending}
                  className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {weeklyMutation.isPending ? 'Generating...' : 'Generate Now'}
                </button>
              </div>
            )}
          </div>

          {/* Afternoon */}
          <div className="space-y-3">
            <h2 className="text-sm font-mono text-text-muted uppercase tracking-wider">Afternoon Access</h2>
            {latestAfternoon ? (
              <NewsletterCard
                newsletter={latestAfternoon}
                onClick={() => setSelectedNewsletter(latestAfternoon)}
                featured
              />
            ) : (
              <div className="bg-bg-surface border border-border rounded-lg p-8 text-center">
                <p className="text-sm text-text-muted mb-3">No afternoon update yet</p>
                <button
                  onClick={() => afternoonMutation.mutate()}
                  disabled={afternoonMutation.isPending}
                  className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {afternoonMutation.isPending ? 'Generating...' : 'Generate Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly list */}
      {view === 'weekly' && !selectedNewsletter && !isLoading && (
        <div className="space-y-3">
          {weeklyDigests.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12">No weekly digests yet.</div>
          ) : weeklyDigests.map(n => (
            <NewsletterCard key={n.id} newsletter={n} onClick={() => setSelectedNewsletter(n)} />
          ))}
        </div>
      )}

      {/* Afternoon list */}
      {view === 'afternoon' && !selectedNewsletter && !isLoading && (
        <div className="space-y-3">
          {afternoonUpdates.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12">No afternoon updates yet.</div>
          ) : afternoonUpdates.map(n => (
            <NewsletterCard key={n.id} newsletter={n} onClick={() => setSelectedNewsletter(n)} />
          ))}
        </div>
      )}

      {/* Full archive */}
      {view === 'archive' && !selectedNewsletter && !isLoading && (
        <div className="space-y-3">
          {(!newsletters || newsletters.length === 0) ? (
            <div className="text-center text-text-muted text-sm py-12">No archived newsletters yet.</div>
          ) : newsletters.map(n => (
            <NewsletterCard key={n.id} newsletter={n} onClick={() => setSelectedNewsletter(n)} />
          ))}
        </div>
      )}
    </div>
  )
}

/* Newsletter card for list views */
function NewsletterCard({ newsletter, onClick, featured }) {
  const isWeekly = newsletter.type === 'weekly_digest'
  const topics = newsletter.topics || []

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
              {isWeekly ? 'Weekly' : 'Daily'}
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
          Generated {formatDate(newsletter.published_at)} at {formatTime(newsletter.published_at)}
          {newsletter.week_of && ` for week of ${newsletter.week_of}`}
        </p>
      </div>
    </div>
  )
}
