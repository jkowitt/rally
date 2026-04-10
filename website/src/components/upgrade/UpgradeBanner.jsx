import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUpgrade } from '@/hooks/useUpgrade'
import UpgradeModal from './UpgradeModal'
import { shouldShowDay18Prompt, shouldShowDay25Prompt, markDay25PromptShown, getPersonalizedStats } from '@/services/upgradePromptService'

// Persistent dismissible banner for day-18 / day-25 prompts
export default function UpgradeBanner() {
  const { profile } = useAuth()
  const { plan } = useUpgrade()
  const [show18, setShow18] = useState(false)
  const [show25, setShow25] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    return sessionStorage.getItem(`upgrade-banner-dismissed-${today}`) === '1'
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!profile || dismissed || plan !== 'free') return
    shouldShowDay18Prompt(profile).then(setShow18)
    shouldShowDay25Prompt(profile).then(async (should) => {
      if (should) {
        const s = await getPersonalizedStats(profile.property_id)
        setStats(s)
        setShow25(true)
        await markDay25PromptShown(profile.id)
      }
    })
  }, [profile, dismissed, plan])

  function dismiss() {
    const today = new Date().toISOString().slice(0, 10)
    sessionStorage.setItem(`upgrade-banner-dismissed-${today}`, '1')
    setDismissed(true)
  }

  if (dismissed || plan !== 'free') return null
  if (!show18 && !show25) return null

  const is25 = show25
  const headline = is25
    ? "Don't lose your momentum"
    : "Here's what you're missing"
  const body = is25 && stats
    ? `You've built ${stats.dealCount} deals and uploaded ${stats.contractCount} contracts. Upgrade today to unlock the features that turn this into revenue.`
    : 'Your free account gives you a taste. Upgrade to unlock AI insights, unlimited deals, and team collaboration.'

  return (
    <>
      <div className="bg-gradient-to-r from-accent to-accent/80 text-bg-primary rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{headline}</div>
          <div className="text-[11px] opacity-80 line-clamp-2">{body}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setModalOpen(true)} className="bg-bg-primary text-accent px-3 py-1.5 rounded text-xs font-semibold hover:opacity-90">
            See what Pro unlocks
          </button>
          <button onClick={dismiss} className="text-bg-primary/70 hover:text-bg-primary text-sm">×</button>
        </div>
      </div>
      {modalOpen && (
        <UpgradeModal
          trigger={is25 ? 'day_25_prompt' : 'day_18_prompt'}
          targetPlan="starter"
          isBlocking={false}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
