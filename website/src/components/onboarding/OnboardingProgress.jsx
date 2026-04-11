export default function OnboardingProgress({ currentStep, completedSteps, totalSteps }) {
  const percentComplete = Math.round((completedSteps.length / totalSteps) * 100)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-[10px] font-mono text-accent">{percentComplete}% complete</span>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1
          const isCompleted = completedSteps.includes(stepNum)
          const isCurrent = stepNum === currentStep
          return (
            <div key={stepNum} className="flex-1 flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                isCompleted ? 'bg-accent border-accent text-bg-primary' :
                isCurrent ? 'border-accent text-accent' :
                'border-border text-text-muted'
              }`}>
                {isCompleted ? '✓' : stepNum}
              </div>
              {stepNum < totalSteps && (
                <div className={`flex-1 h-0.5 ${completedSteps.includes(stepNum) ? 'bg-accent' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
