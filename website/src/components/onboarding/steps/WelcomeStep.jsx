// WelcomeStep — first screen of the onboarding flow.
//
// We used to ask for industry here so the app could swap terminology
// (deals/sponsors/properties) and gate modules. That's gone — every
// new property gets the same CRM + Prospecting + Account Management
// stack at full feature depth. Specialty modules (Activations, VALORA,
// industry-specific dashboards) are now add-ons priced via Contact
// Sales rather than industry presets.
//
// initialIndustry is still accepted for backwards compat (some callers
// still pass it from query params) but is ignored.
export default function WelcomeStep({ onNext, userName }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">👋</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
          Welcome to Loud Legacy{userName ? `, ${userName.split(' ')[0]}` : ''}
        </h2>
        <p className="text-sm text-text-secondary">Let's get your account set up in under 5 minutes.</p>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="text-[10px] text-text-muted uppercase tracking-wider">What you get</div>
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-accent">▹</span>
            <span><strong className="text-text-primary">CRM</strong> — pipeline, contacts, contracts, fulfillment, accounts, audit log.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">▹</span>
            <span><strong className="text-text-primary">Prospecting</strong> — find prospects, signal radar, lookalikes, multi-step sequences with reply-intent classification.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">▹</span>
            <span><strong className="text-text-primary">Account Management</strong> — renewal pipeline, account health, QBRs, onboarding playbooks, recap reports.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">▹</span>
            <span><strong className="text-text-primary">Inbox</strong> — Outlook + Gmail unified, AI reply suggestions, tracking pixels.</span>
          </li>
        </ul>
        <div className="text-[11px] text-text-muted pt-2 border-t border-border">
          Specialty modules (phone calls, EDGAR/funding signals, custom-branded portal, multi-property)
          are available as add-ons —{' '}
          <a href="/pricing#addons" className="text-accent hover:underline">see the catalog</a>.
        </div>
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
