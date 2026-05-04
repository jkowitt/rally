import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Card, EmptyState, Badge } from '@/components/ui'
import { BarChart3, Eye, Mail, MousePointerClick, MessageSquare, AlertOctagon } from 'lucide-react'

// OutreachAnalytics — read-only roll-up of outreach_log over the last
// 30 days. Pulls from outreach_performance_30d (totals + rates) and
// outreach_performance_per_sender_30d (per rep). Designed for the
// manager who wants a single screen of "is the team sending? are
// people opening?"
export default function OutreachAnalytics() {
  const { profile } = useAuth()

  const { data: totals } = useQuery({
    queryKey: ['outreach-perf-30d', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('outreach_performance_30d')
        .select('*')
        .eq('property_id', profile.property_id)
        .maybeSingle()
      return data
    },
  })

  const { data: perSender = [] } = useQuery({
    queryKey: ['outreach-perf-sender-30d', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('outreach_performance_per_sender_30d')
        .select('*')
        .eq('property_id', profile.property_id)
        .order('sends', { ascending: false })
      return data || []
    },
  })

  const { data: hourly = [] } = useQuery({
    queryKey: ['outreach-hourly', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      // Pull recent opens to build a coarse hour-of-day chart on the client.
      const { data } = await supabase
        .from('outreach_log')
        .select('opened_at')
        .eq('property_id', profile.property_id)
        .not('opened_at', 'is', null)
        .gte('opened_at', new Date(Date.now() - 30 * 86400_000).toISOString())
      return data || []
    },
  })

  const hourCounts = Array(24).fill(0)
  for (const r of hourly) {
    if (!r.opened_at) continue
    const h = new Date(r.opened_at).getHours()
    hourCounts[h]++
  }
  const maxHourly = Math.max(...hourCounts, 1)
  const bestHour = hourCounts.indexOf(Math.max(...hourCounts))

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'CRM & Prospecting', to: '/app' },
        { label: 'Outreach Analytics' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-accent" />
          Outreach Analytics
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Last 30 days — sends, opens, clicks, replies, by sender and by hour.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile icon={Mail} label="Sends" value={totals?.sends || 0} />
        <KpiTile icon={Eye} label="Opens" value={totals?.opens || 0} sub={totals ? `${totals.open_rate}%` : null} />
        <KpiTile icon={MousePointerClick} label="Clicks" value={totals?.clicks || 0} />
        <KpiTile icon={MessageSquare} label="Replies" value={totals?.replies || 0} sub={totals ? `${totals.reply_rate}%` : null} />
      </div>

      {totals?.bounces > 0 && (
        <Card padding="md" className="border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <AlertOctagon className="w-4 h-4 text-warning" />
            <span><strong>{totals.bounces}</strong> bounce{totals.bounces === 1 ? '' : 's'} in the last 30 days. Verify deliverability.</span>
          </div>
        </Card>
      )}

      <Card padding="md">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Per-rep performance</h2>
        {perSender.length === 0 ? (
          <p className="text-xs text-text-muted">No outbound sends in the last 30 days.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="text-left py-1.5 px-4 sm:px-0">Rep</th>
                  <th className="text-right py-1.5 px-2 sm:px-0">Sends</th>
                  <th className="text-right py-1.5 px-2 sm:px-0">Opens</th>
                  <th className="text-right py-1.5 px-2 sm:px-0">Replies</th>
                  <th className="text-right py-1.5 px-4 sm:px-0">Reply rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perSender.map(s => {
                  const rr = s.sends > 0 ? Math.round(100 * s.replies / s.sends * 10) / 10 : 0
                  return (
                    <tr key={s.user_id}>
                      <td className="py-2 px-4 sm:px-0 text-text-primary truncate">{s.full_name || s.user_id?.slice(0, 8)}</td>
                      <td className="py-2 px-2 sm:px-0 text-right text-text-secondary">{s.sends}</td>
                      <td className="py-2 px-2 sm:px-0 text-right text-text-secondary">{s.opens}</td>
                      <td className="py-2 px-2 sm:px-0 text-right text-text-secondary">{s.replies}</td>
                      <td className="py-2 px-4 sm:px-0 text-right">
                        <Badge tone={rr >= 10 ? 'success' : rr >= 5 ? 'accent' : 'neutral'}>{rr}%</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Open hour heatmap</h2>
          {hourly.length > 0 && (
            <span className="text-[11px] text-text-muted font-mono">peak: {bestHour}:00 local</span>
          )}
        </div>
        {hourly.length === 0 ? (
          <p className="text-xs text-text-muted">No tracked opens yet.</p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {hourCounts.map((c, h) => (
              <div key={h} className="flex-1 flex flex-col items-center gap-1" title={`${h}:00 — ${c} opens`}>
                <div
                  className="w-full bg-accent rounded-t"
                  style={{ height: `${(c / maxHourly) * 100}%`, minHeight: c > 0 ? '2px' : 0 }}
                />
                <span className="text-[9px] font-mono text-text-muted">{h}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function KpiTile({ icon: Icon, label, value, sub }) {
  return (
    <Card padding="md" className="space-y-1">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-text-primary tabular-nums">{Number(value).toLocaleString()}</span>
        {sub && <span className="text-xs text-accent pb-1">{sub}</span>}
      </div>
    </Card>
  )
}
