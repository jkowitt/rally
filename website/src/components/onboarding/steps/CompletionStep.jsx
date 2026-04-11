import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function CompletionStep({ onFinish, completedSteps }) {
  useEffect(() => {
    // Fire a gold confetti burst
    const duration = 2500
    const end = Date.now() + duration
    const colors = ['#E8B84B', '#F5D46E', '#FFFFFF']
    ;(function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    })()
  }, [])

  const items = [
    { label: 'Industry configured', done: completedSteps.includes(1) },
    { label: 'First deal added', done: completedSteps.includes(2) },
    { label: 'Contract uploaded & parsed', done: completedSteps.includes(3) },
    { label: 'Asset catalog reviewed', done: completedSteps.includes(4) },
  ]

  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">You're set up and ready to go</h2>
        <p className="text-sm text-text-secondary">Your deal is in the pipeline. Your contract benefits are tracked. Your assets are cataloged.</p>
      </div>

      <div className="bg-bg-card border border-success/30 rounded-lg p-4 text-left space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${item.done ? 'bg-success text-bg-primary' : 'bg-bg-surface border border-border text-text-muted'}`}>
              {item.done ? '✓' : '○'}
            </span>
            <span className={`text-xs ${item.done ? 'text-text-primary' : 'text-text-muted'}`}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
        <p className="text-xs text-text-secondary">
          Your dashboard has a checklist with 6 more quick wins to explore — invite your team, set up fulfillment, run AI insights, and more.
        </p>
      </div>

      <button onClick={onFinish} className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
        Go to my Dashboard →
      </button>
    </div>
  )
}
