// WelcomeStep — first screen of the onboarding flow.
// Tells the user what they're about to do AND what they'll have at
// the end of it, so the next two screens feel like progress instead
// of busywork.
export default function WelcomeStep({ onNext, userName }) {
  const firstName = userName ? userName.split(' ')[0] : null
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">Welcome</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight">
          {firstName ? `Hi ${firstName}, let's get` : `Let's get`} your CRM ready in two minutes.
        </h2>
        <p className="text-sm text-text-secondary mt-3 leading-relaxed">
          Loud Legacy is built around one job: <strong className="text-text-primary">turn the people you should be talking to into signed sponsors</strong>. The next two steps drop a real deal into your pipeline and run an AI prospect search so the app isn't empty when you land on it.
        </p>
      </div>

      <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
        <Bullet
          n="1"
          title="Add a deal you already have"
          body="So your pipeline starts with at least one card and you can practice moving it through the stages."
        />
        <Bullet
          n="2"
          title="Run an AI prospect search"
          body="Describe who you want to reach and the AI returns named companies + verified decision-makers. Add the good ones to your pipeline in one click."
        />
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-lg px-4 py-3 text-[11px] text-text-secondary">
        Skip anything that doesn't fit — you can always replay this from the user menu.
      </div>

      <button
        onClick={() => onNext('universal')}
        className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Let's go →
      </button>
    </div>
  )
}

function Bullet({ n, title, body }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-mono font-semibold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{title}</div>
        <div className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{body}</div>
      </div>
    </div>
  )
}
