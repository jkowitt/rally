import { useState } from 'react'
import { useOnboarding } from '@/hooks/useOnboarding'
import OnboardingProgress from './OnboardingProgress'
import WelcomeStep from './steps/WelcomeStep'
import CreateDealStep from './steps/CreateDealStep'
import ContractUploadStep from './steps/ContractUploadStep'
import AssetCatalogStep from './steps/AssetCatalogStep'
import CompletionStep from './steps/CompletionStep'
import { useAuth } from '@/hooks/useAuth'
import { trackEvent } from '@/services/onboardingService'

// Map the property.type stored at signup → the 4 buckets the
// WelcomeStep shows. Saves the user from picking their industry
// twice (once on the landing page, then again here).
function mapPropertyTypeToIndustry(type) {
  if (!type) return 'sports'
  if (type === 'nonprofit') return 'nonprofit'
  if (type === 'media') return 'media'
  if (type === 'realestate') return 'realestate'
  // college / professional / minor_league / agency / entertainment
  // / conference / other → roll up to "sports & events"
  return 'sports'
}

export default function OnboardingModal() {
  const { profile } = useAuth()
  const {
    currentStep, completedSteps, totalSteps,
    isOnboardingVisible, setIsOnboardingVisible,
    advanceStep, markStepComplete, skipOnboarding, completeOnboarding,
  } = useOnboarding()
  const [confirmExit, setConfirmExit] = useState(false)

  if (!isOnboardingVisible) return null

  async function handleNext(fromStep) {
    await markStepComplete(fromStep)
    if (fromStep < totalSteps) {
      await advanceStep(fromStep + 1)
    }
    trackEvent('onboarding_step_completed', { step_number: fromStep })
  }

  async function handleSkipStep(stepNum) {
    trackEvent('onboarding_step_skipped', { step_number: stepNum })
    if (stepNum < totalSteps) {
      await advanceStep(stepNum + 1)
    }
  }

  async function handleFinish() {
    await markStepComplete(5)
    await completeOnboarding()
  }

  function handleRequestExit() {
    setConfirmExit(true)
  }

  async function handleConfirmExit() {
    await skipOnboarding()
    setConfirmExit(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-bg-surface border border-accent/30 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
        {/* Header with progress + close */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex-1">
            <OnboardingProgress currentStep={currentStep} completedSteps={completedSteps} totalSteps={totalSteps} />
          </div>
          {currentStep > 1 && currentStep < 5 && (
            <button
              onClick={handleRequestExit}
              className="text-text-muted hover:text-text-primary text-sm shrink-0"
              aria-label="Close onboarding"
            >
              ✕
            </button>
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {currentStep === 1 && (
            <WelcomeStep
              onNext={() => handleNext(1)}
              userName={profile?.full_name}
              initialIndustry={mapPropertyTypeToIndustry(profile?.properties?.type)}
            />
          )}
          {currentStep === 2 && <CreateDealStep onNext={() => handleNext(2)} onSkip={() => handleSkipStep(2)} />}
          {currentStep === 3 && <ContractUploadStep onNext={() => handleNext(3)} onSkip={() => handleSkipStep(3)} />}
          {currentStep === 4 && <AssetCatalogStep onNext={() => handleNext(4)} onSkip={() => handleSkipStep(4)} />}
          {currentStep === 5 && <CompletionStep onFinish={handleFinish} completedSteps={completedSteps} />}
        </div>
      </div>

      {/* Exit confirmation */}
      {confirmExit && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-bg-surface border border-border rounded-lg p-5 max-w-sm w-full space-y-4">
            <h3 className="text-base font-semibold text-text-primary">Are you sure?</h3>
            <p className="text-xs text-text-secondary">You can resume setup anytime from your dashboard. Your progress will be saved.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmExit(false)} className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5">Cancel</button>
              <button onClick={handleConfirmExit} className="bg-danger/15 text-danger border border-danger/30 rounded px-3 py-1.5 text-xs font-medium">Exit Setup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
