import { useUpgrade } from '@/hooks/useUpgrade'

// Shows X of Y used with a progress bar
export default function UsageMeter({ limitType, label, onUpgrade }) {
  const { usage, currentPlan, getUsagePct, getRemaining, plan } = useUpgrade()
  const limit = currentPlan[limitType] ?? 0
  const used = usage[limitType] || 0
  const pct = getUsagePct(limitType)
  const remaining = getRemaining(limitType)
  const isUnlimited = limit >= 999999

  const barColor = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-accent'

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-[10px] font-mono text-text-muted">
          {isUnlimited ? 'Unlimited' : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && (
        <>
          <div className="w-full bg-bg-surface rounded-full h-1.5 overflow-hidden">
            <div className={`h-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          {pct >= 70 && onUpgrade && (
            <button onClick={onUpgrade} className="mt-2 text-[10px] text-accent hover:underline">
              {remaining === 0 ? 'Upgrade for more' : `${remaining} remaining — upgrade?`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
