// WelcomeStep — first screen of the onboarding flow.
// Scoped to CRM + Prospecting only. Email integration is an
// Enterprise-only feature handled separately in Settings, not in
// the universal onboarding flow.
export default function WelcomeStep({ onNext, userName }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">👋</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
          Welcome to Loud Legacy{userName ? `, ${userName.split(' ')[0]}` : ''}
        </h2>
        <p className="text-sm text-text-secondary">Two quick steps and you're off — under two minutes.</p>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="text-[10px] text-text-muted uppercase tracking-wider">What you'll set up</div>
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-accent">▹</span>
            <span><strong className="text-text-primary">CRM</strong> — drop in your first deal so the pipeline isn't empty when you land.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">▹</span>
            <span><strong className="text-text-primary">Prospecting</strong> — run an AI prospect search so you have real targets to work day one.</span>
          </li>
        </ul>
      </div>

      <button
        onClick={() => onNext('universal')}
        className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Let's Go →
      </button>
    </div>
  )
}
