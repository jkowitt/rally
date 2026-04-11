import { useOnboarding } from '@/hooks/useOnboarding'

export default function ResumeBanner() {
  const { isOnboardingComplete, isOnboardingSkipped, completedSteps, totalSteps, resumeOnboarding, currentStep, loaded } = useOnboarding()

  if (!loaded) return null
  if (isOnboardingComplete) return null
  // Show banner only if user has started onboarding but stopped (skipped or closed)
  if (!isOnboardingSkipped && completedSteps.length === 0) return null
  if (completedSteps.length === 0 && currentStep === 1) return null

  const remaining = totalSteps - completedSteps.length

  return (
    <div className="bg-accent text-bg-primary rounded-lg px-4 py-3 flex items-center justify-between gap-3 mb-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">Complete your setup</div>
        <div className="text-[11px] opacity-80">{remaining} {remaining === 1 ? 'step' : 'steps'} remaining — {Math.round((completedSteps.length / totalSteps) * 100)}% done</div>
      </div>
      <button onClick={resumeOnboarding} className="bg-bg-primary text-accent px-3 py-1.5 rounded text-xs font-semibold hover:opacity-90 shrink-0">
        Continue →
      </button>
    </div>
  )
}
