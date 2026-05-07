import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const LIMITS = {
  contact_lookup: { label: 'Contact Lookups', max: 25, icon: '👤', combineKeys: ['apollo', 'hunter'] },
  claude: { label: 'Claude AI', max: 500, icon: '🤖' },
}

export default function APIUsageBanner({ compact }) {
  const { profile } = useAuth()
  const userId = profile?.id

  const { data: usage } = useQuery({
    // Per-user — was previously fetching the whole property's
    // usage so the rep saw their teammates' credits in the
    // top-bar pill. Each user gets their own monthly allotment.
    queryKey: ['api-usage-banner', userId],
    enabled: !!userId,
    queryFn: async () => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('api_usage')
        .select('service, credits_used')
        .eq('user_id', userId)
        .gte('called_at', startOfMonth.toISOString())
      if (!data) return {}
      const grouped = {}
      data.forEach(u => { grouped[u.service] = (grouped[u.service] || 0) + (u.credits_used || 1) })
      return grouped
    },
    refetchInterval: 60000,
  })

  if (!usage) return null

  const services = Object.entries(LIMITS).map(([key, config]) => {
    let used
    if (config.combineKeys) {
      used = config.combineKeys.reduce((sum, k) => sum + (usage[k] || 0), 0)
    } else {
      used = usage[key] || 0
    }
    const pct = Math.round((used / config.max) * 100)
    const isWarning = pct >= 80
    const isDanger = pct >= 95
    return { key, ...config, used, pct, isWarning, isDanger }
  }).filter(s => s.used > 0 || s.key === 'contact_lookup') // always show contact lookups

  if (services.length === 0) return null

  const hasWarning = services.some(s => s.isWarning)

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {services.map(s => (
          <div
            key={s.key}
            className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border ${
              s.isDanger ? 'border-danger/30 bg-danger/10 text-danger' :
              s.isWarning ? 'border-warning/30 bg-warning/10 text-warning' :
              'border-border bg-bg-card text-text-muted'
            }`}
            title={`${s.label}: ${s.used}/${s.max} this month`}
          >
            <span>{s.icon}</span>
            <span>{s.used}/{s.max}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`rounded-lg border p-3 ${hasWarning ? 'border-warning/30 bg-warning/5' : 'border-border bg-bg-surface'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">API Usage This Month</span>
        {hasWarning && <span className="text-[10px] font-mono text-warning">Approaching limit</span>}
      </div>
      <div className="flex gap-3 flex-wrap">
        {services.map(s => (
          <div key={s.key} className="flex-1 min-w-[100px]">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-text-secondary">{s.icon} {s.label}</span>
              <span className={`font-mono ${s.isDanger ? 'text-danger' : s.isWarning ? 'text-warning' : 'text-text-muted'}`}>
                {s.used}/{s.max}
              </span>
            </div>
            <div className="w-full bg-bg-card rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  s.isDanger ? 'bg-danger' : s.isWarning ? 'bg-warning' : 'bg-accent'
                }`}
                style={{ width: `${Math.min(s.pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function APIUsageCompact() {
  return <APIUsageBanner compact />
}
