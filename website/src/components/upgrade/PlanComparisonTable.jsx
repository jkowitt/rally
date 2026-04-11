import { PLAN_LIMITS, COMPARISON_ROWS, getPlanValue } from '@/config/planLimits'

const PLANS_TO_SHOW = ['free', 'starter', 'pro']

function formatValue(plan, row) {
  if (row.format) {
    const val = getPlanValue(plan, row.key)
    return row.format(val, plan)
  }
  const val = getPlanValue(plan, row.key)
  if (typeof val === 'boolean') return val ? '✓' : '✗'
  if (typeof val === 'number') return val >= 999999 ? 'Unlimited' : val.toLocaleString()
  return val || '—'
}

export default function PlanComparisonTable({ highlightPlan = 'pro' }) {
  return (
    <div className="bg-bg-card rounded-lg overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-[9px] font-mono text-text-muted uppercase tracking-wider">Feature</th>
              {PLANS_TO_SHOW.map(p => {
                const plan = PLAN_LIMITS[p]
                const isHighlight = p === highlightPlan
                return (
                  <th key={p} className={`px-3 py-2 text-center text-[9px] font-mono uppercase tracking-wider ${isHighlight ? 'bg-accent/10 text-accent' : 'text-text-muted'}`}>
                    {plan.displayName}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-text-secondary">{row.label}</td>
                {PLANS_TO_SHOW.map(p => {
                  const plan = PLAN_LIMITS[p]
                  const isHighlight = p === highlightPlan
                  const value = formatValue(plan, row)
                  return (
                    <td key={p} className={`px-3 py-2 text-center ${isHighlight ? 'bg-accent/5 text-text-primary font-medium' : 'text-text-secondary'}`}>
                      {value === '✓' && <span className="text-success">✓</span>}
                      {value === '✗' && <span className="text-text-muted">✗</span>}
                      {value !== '✓' && value !== '✗' && (typeof value === 'boolean' ? (value ? '✓' : '✗') : value)}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Price row */}
            <tr className="bg-bg-surface">
              <td className="px-3 py-3 text-[10px] font-mono text-text-muted uppercase">Price</td>
              {PLANS_TO_SHOW.map(p => {
                const plan = PLAN_LIMITS[p]
                const isHighlight = p === highlightPlan
                return (
                  <td key={p} className={`px-3 py-3 text-center font-bold ${isHighlight ? 'text-accent' : 'text-text-primary'}`}>
                    {plan.priceLabel}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
