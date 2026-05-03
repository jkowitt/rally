import { useState } from 'react'

const INDUSTRY_CHOICES = [
  { id: 'sports', label: 'Sports, Events & Entertainment', icon: '🏟', desc: 'Adapts terminology for sponsorship deals, contracts, and fulfillment.' },
  { id: 'nonprofit', label: 'Nonprofit', icon: '💛', desc: 'Uses donor/pledge terminology and grant tracking.' },
  { id: 'media', label: 'Media', icon: '📡', desc: 'Ad sales, insertion orders, and campaign tracking.' },
  { id: 'realestate', label: 'Real Estate', icon: '🏢', desc: 'Lease pipeline, tenant management, and property units.' },
]

export default function WelcomeStep({ onNext, userName, initialIndustry }) {
  // If the user already picked an industry on the landing page,
  // pre-select it here so they're confirming, not re-entering.
  const [selected, setSelected] = useState(initialIndustry || 'sports')

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">👋</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">Welcome to Loud Legacy{userName ? `, ${userName.split(' ')[0]}` : ''}</h2>
        <p className="text-sm text-text-secondary">Let's get your account set up in under 10 minutes.</p>
      </div>

      <div>
        <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-3">Confirm your industry</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INDUSTRY_CHOICES.map(ind => (
            <button
              key={ind.id}
              onClick={() => setSelected(ind.id)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${selected === ind.id ? 'border-accent bg-accent/5' : 'border-border bg-bg-card hover:border-accent/50'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{ind.icon}</span>
                <span className={`text-sm font-medium ${selected === ind.id ? 'text-accent' : 'text-text-primary'}`}>{ind.label}</span>
              </div>
              <p className="text-[10px] text-text-muted leading-relaxed">{ind.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => onNext(selected)} className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
        Let's Go →
      </button>
    </div>
  )
}
