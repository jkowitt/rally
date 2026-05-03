import { useAuth } from '@/hooks/useAuth'
import { useImpersonation } from '@/hooks/useImpersonation'
import { setQAIndustry } from '@/hooks/useIndustryConfig'

export default function ImpersonationBanner() {
  const { realIsDeveloper } = useAuth()
  const { isActive, industry, role, tier, tierPresets, reset } = useImpersonation()

  if (!realIsDeveloper || !isActive) return null

  const parts: string[] = []
  if (industry) parts.push(`industry: ${industry}`)
  if (role) parts.push(`role: ${role}`)
  if (tier) parts.push(`tier: ${tierPresets[tier]?.label || tier}`)

  return (
    <div className="bg-warning/15 border-b border-warning/30 px-4 py-1.5 flex items-center justify-between text-xs">
      <div className="flex items-center gap-3 text-warning font-mono">
        <span className="uppercase tracking-wider font-semibold">Impersonating</span>
        <span className="text-text-secondary">{parts.join(' · ')}</span>
        <span className="text-text-muted hidden sm:inline">— preview only, writes still as dev</span>
      </div>
      <button
        onClick={() => { reset(); setQAIndustry(null) }}
        className="text-[10px] font-mono text-warning hover:text-danger uppercase tracking-wider border border-warning/40 hover:border-danger px-2 py-0.5 rounded"
      >
        Exit
      </button>
    </div>
  )
}
