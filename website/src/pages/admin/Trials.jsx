import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { calculateEngagementScore, scoreAllFreeUsers } from '@/services/trialHealthService'
import { useToast } from '@/components/Toast'

const TAG_COLORS = {
  hot: 'bg-danger/15 text-danger border-danger/30',
  warm: 'bg-warning/15 text-warning border-warning/30',
  cold: 'bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/30',
  ghost: 'bg-bg-card text-text-muted border-border',
}

export default function Trials() {
  const { profile, realIsDeveloper } = useAuth()
  const { toast } = useToast()
  const [trials, setTrials] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [scoring, setScoring] = useState(false)

  const canAccess = realIsDeveloper || profile?.role === 'businessops' || profile?.role === 'admin'
  if (profile && !canAccess) return <Navigate to="/app" replace />

  async function load() {
    setLoading(true)
    const { data: freeUsers } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at, properties!profiles_property_id_fkey(name, plan)')
      .order('created_at', { ascending: false })
    const filtered = (freeUsers || []).filter(u => (u.properties?.plan || 'free') === 'free')

    // Get engagement scores
    const userIds = filtered.map(u => u.id)
    const { data: scores } = await supabase
      .from('user_engagement_scores')
      .select('*')
      .in('user_id', userIds)
    const scoreMap = {}
    ;(scores || []).forEach(s => { scoreMap[s.user_id] = s })

    const merged = filtered.map(u => ({
      ...u,
      engagement: scoreMap[u.id] || { score: 0, tag: 'ghost' },
    }))
    // Sort by score descending
    merged.sort((a, b) => (b.engagement.score || 0) - (a.engagement.score || 0))
    setTrials(merged)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function runScoring() {
    setScoring(true)
    const result = await scoreAllFreeUsers()
    toast({ title: `Scored ${result.scored} users`, type: 'success' })
    await load()
    setScoring(false)
  }

  const filtered = filter === 'all' ? trials : trials.filter(t => t.engagement.tag === filter)
  const counts = {
    all: trials.length,
    hot: trials.filter(t => t.engagement.tag === 'hot').length,
    warm: trials.filter(t => t.engagement.tag === 'warm').length,
    cold: trials.filter(t => t.engagement.tag === 'cold').length,
    ghost: trials.filter(t => t.engagement.tag === 'ghost').length,
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Trial Users</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Free plan users sorted by engagement score.</p>
        </div>
        <button onClick={runScoring} disabled={scoring} className="bg-accent text-bg-primary px-4 py-2 rounded text-xs font-medium disabled:opacity-50">
          {scoring ? 'Scoring...' : 'Run Scoring'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {['all', 'hot', 'warm', 'cold', 'ghost'].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`bg-bg-card rounded-lg p-3 text-center border-2 transition-colors ${filter === t ? 'border-accent' : 'border-transparent'}`}
          >
            <div className="text-lg font-bold text-text-primary">{counts[t]}</div>
            <div className={`text-[9px] uppercase ${t !== 'all' ? TAG_COLORS[t]?.split(' ')[1] : 'text-text-muted'}`}>{t}</div>
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {loading && <div className="text-center text-text-muted text-sm py-6">Loading...</div>}
        {!loading && filtered.map(user => {
          const days = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
          return (
            <div key={user.id} className="bg-bg-surface border border-border rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-text-primary font-medium">{user.full_name || user.email}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${TAG_COLORS[user.engagement.tag]}`}>
                    {user.engagement.tag?.toUpperCase()} · {user.engagement.score || 0}
                  </span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {user.email} · {user.properties?.name || 'No property'} · Day {days}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={async () => { await calculateEngagementScore(user.id); load() }} className="text-[10px] text-accent hover:underline">Rescore</button>
              </div>
            </div>
          )
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-text-muted text-sm py-6">No trials match this filter.</div>
        )}
      </div>
    </div>
  )
}
