import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const BUSINESS_MODELS = [
  { id: 'saas', label: 'SaaS / Subscription', desc: 'Recurring revenue from software or memberships' },
  { id: 'services', label: 'Services / Consulting', desc: 'Project-based or hourly billing' },
  { id: 'agency', label: 'Agency / Retainer', desc: 'Retainer + project hybrid' },
  { id: 'ecommerce', label: 'Ecommerce / Product', desc: 'Physical or digital product sales' },
  { id: 'events', label: 'Events / Sponsorships', desc: 'Revenue from event sponsorships and ticketing' },
  { id: 'nonprofit', label: 'Nonprofit / Donations', desc: 'Grants, donations, and sponsor revenue' },
]

const STAGES = [
  { id: 'idea', label: 'Idea Stage', desc: 'Still figuring out what to build' },
  { id: 'launch', label: 'Pre-Launch / Launch', desc: 'Building MVP or just launched' },
  { id: 'growth', label: 'Growth', desc: 'Finding product-market fit, scaling acquisition' },
  { id: 'scale', label: 'Scale', desc: 'Proven model, optimizing for efficiency' },
  { id: 'mature', label: 'Mature', desc: 'Stable revenue, optimizing retention and expansion' },
]

const QUESTIONS = [
  { id: 'target_customer', category: 'Customer', q: 'Who is your ideal customer in one sentence?' },
  { id: 'value_prop', category: 'Customer', q: 'What problem do you solve that others do not?' },
  { id: 'monthly_revenue', category: 'Finance', q: 'What is your current monthly revenue?' },
  { id: 'customer_count', category: 'Finance', q: 'How many paying customers do you have?' },
  { id: 'cac', category: 'Finance', q: 'Do you know your customer acquisition cost?' },
  { id: 'marketing_channels', category: 'Marketing', q: 'Which channels drive the most revenue today?' },
  { id: 'content_cadence', category: 'Marketing', q: 'How often do you publish content?' },
  { id: 'sales_process', category: 'Sales', q: 'Is your sales process documented?' },
  { id: 'team_size', category: 'Team', q: 'How many people work on this full-time?' },
  { id: 'biggest_constraint', category: 'Strategic', q: 'What is the single biggest constraint on growth?' },
  { id: 'next_90_days', category: 'Strategic', q: 'What is your #1 priority for the next 90 days?' },
]

export default function GrowthWorkbook() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [workbook, setWorkbook] = useState(null)
  const [step, setStep] = useState('intro') // intro | biz-model | stage | questions | summary
  const [bizModel, setBizModel] = useState('')
  const [stage, setStage] = useState('')
  const [responses, setResponses] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!profile?.property_id) return setLoading(false)
      const { data } = await supabase
        .from('growth_workbook_responses')
        .select('*')
        .eq('property_id', profile.property_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) {
        setWorkbook(data)
        setBizModel(data.business_model || '')
        setStage(data.current_stage || '')
        setResponses(data.responses || {})
        if (data.completed) setStep('summary')
      }
      setLoading(false)
    }
    load()
  }, [profile?.property_id])

  async function saveProgress(updates = {}) {
    if (!profile?.property_id) return
    setSaving(true)
    const payload = {
      property_id: profile.property_id,
      user_id: profile.id,
      business_model: bizModel,
      current_stage: stage,
      responses,
      updated_at: new Date().toISOString(),
      ...updates,
    }
    if (workbook?.id) {
      await supabase.from('growth_workbook_responses').update(payload).eq('id', workbook.id)
    } else {
      const { data } = await supabase.from('growth_workbook_responses').insert(payload).select().single()
      if (data) setWorkbook(data)
    }
    setSaving(false)
  }

  function calculateHealthScore() {
    const answered = Object.values(responses).filter(v => v && String(v).trim().length > 3).length
    return Math.round((answered / QUESTIONS.length) * 100)
  }

  async function finish() {
    const score = calculateHealthScore()
    const gaps = QUESTIONS.filter(q => !responses[q.id] || String(responses[q.id]).trim().length <= 3).map(q => q.q)
    await saveProgress({
      completed: true,
      completed_at: new Date().toISOString(),
      health_score: score,
      gaps,
    })
    toast({ title: 'Workbook saved', type: 'success' })
    setStep('summary')
  }

  if (loading) return <div className="text-center text-text-muted text-sm py-8">Loading...</div>

  // ─── INTRO ───
  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🧭</div>
          <h1 className="text-2xl font-bold text-text-primary">Growth Workbook</h1>
          <p className="text-sm text-text-secondary mt-2">A 10-minute self-assessment to figure out where you are — and what to focus on next.</p>
        </div>

        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">What you get:</h3>
          <ul className="space-y-2 text-xs text-text-secondary">
            <li className="flex items-start gap-2"><span className="text-success shrink-0">✓</span> A clear picture of your business stage and model</li>
            <li className="flex items-start gap-2"><span className="text-success shrink-0">✓</span> A health score across 5 categories (customer, finance, marketing, sales, strategy)</li>
            <li className="flex items-start gap-2"><span className="text-success shrink-0">✓</span> A gap analysis showing what you haven't figured out yet</li>
            <li className="flex items-start gap-2"><span className="text-success shrink-0">✓</span> Recommended next workbooks to tackle your weakest areas</li>
          </ul>
        </div>

        <button onClick={() => setStep('biz-model')} className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90">
          {workbook?.completed ? 'Retake Assessment' : "Let's Start →"}
        </button>

        {workbook?.completed && (
          <button onClick={() => setStep('summary')} className="w-full text-xs text-text-muted hover:text-text-primary">
            Skip to my last results
          </button>
        )}
      </div>
    )
  }

  // ─── BUSINESS MODEL ───
  if (step === 'biz-model') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary">What kind of business do you run?</h2>
          <p className="text-xs text-text-secondary mt-1">This tells us which metrics matter to you.</p>
        </div>
        <div className="space-y-2">
          {BUSINESS_MODELS.map(m => (
            <button
              key={m.id}
              onClick={() => { setBizModel(m.id); saveProgress(); setStep('stage') }}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${bizModel === m.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
            >
              <div className="text-sm font-medium text-text-primary">{m.label}</div>
              <div className="text-[11px] text-text-muted mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
        <button onClick={() => setStep('intro')} className="text-xs text-text-muted hover:text-text-primary">← Back</button>
      </div>
    )
  }

  // ─── STAGE ───
  if (step === 'stage') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary">Where are you today?</h2>
          <p className="text-xs text-text-secondary mt-1">Pick the stage that best fits your current reality.</p>
        </div>
        <div className="space-y-2">
          {STAGES.map(s => (
            <button
              key={s.id}
              onClick={() => { setStage(s.id); saveProgress(); setStep('questions') }}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${stage === s.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
            >
              <div className="text-sm font-medium text-text-primary">{s.label}</div>
              <div className="text-[11px] text-text-muted mt-0.5">{s.desc}</div>
            </button>
          ))}
        </div>
        <button onClick={() => setStep('biz-model')} className="text-xs text-text-muted hover:text-text-primary">← Back</button>
      </div>
    )
  }

  // ─── QUESTIONS ───
  if (step === 'questions') {
    const groupedByCategory = {}
    QUESTIONS.forEach(q => {
      if (!groupedByCategory[q.category]) groupedByCategory[q.category] = []
      groupedByCategory[q.category].push(q)
    })
    const answeredCount = Object.values(responses).filter(v => v && String(v).trim().length > 3).length

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary">Answer what you can</h2>
          <p className="text-xs text-text-secondary mt-1">Skip anything you're not sure about — gaps are useful too.</p>
          <div className="mt-3 w-full bg-bg-card rounded-full h-1.5">
            <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }} />
          </div>
          <div className="text-[10px] text-text-muted mt-1">{answeredCount} / {QUESTIONS.length} answered</div>
        </div>

        <div className="space-y-5">
          {Object.entries(groupedByCategory).map(([cat, qs]) => (
            <div key={cat} className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-accent">{cat}</h3>
              {qs.map(q => (
                <div key={q.id}>
                  <label className="text-xs text-text-primary block mb-1">{q.q}</label>
                  <textarea
                    value={responses[q.id] || ''}
                    onChange={e => setResponses(r => ({ ...r, [q.id]: e.target.value }))}
                    onBlur={() => saveProgress()}
                    rows={2}
                    className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary resize-none focus:outline-none focus:border-accent"
                    placeholder="Your answer..."
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setStep('stage')} className="flex-1 border border-border text-text-secondary py-3 rounded-lg text-sm font-medium">← Back</button>
          <button onClick={finish} disabled={saving} className="flex-1 bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving...' : 'Finish Assessment →'}
          </button>
        </div>
      </div>
    )
  }

  // ─── SUMMARY ───
  const score = workbook?.health_score ?? calculateHealthScore()
  const gaps = workbook?.gaps || QUESTIONS.filter(q => !responses[q.id] || String(responses[q.id]).trim().length <= 3).map(q => q.q)
  const scoreColor = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">📊</div>
        <h2 className="text-xl font-bold text-text-primary">Your Growth Snapshot</h2>
        <p className="text-xs text-text-secondary mt-1">Based on your answers, here's where you stand.</p>
      </div>

      <div className="bg-bg-card border border-accent/30 rounded-lg p-6 text-center">
        <div className="text-[10px] text-text-muted uppercase tracking-wider">Clarity Score</div>
        <div className={`text-5xl font-bold mt-2 ${scoreColor}`}>{score}<span className="text-lg text-text-muted">/100</span></div>
        <div className="text-xs text-text-secondary mt-2">
          {score >= 80 && 'You have a clear picture of your business. Focus on execution.'}
          {score >= 50 && score < 80 && 'You have the foundations. Fill in the gaps to accelerate.'}
          {score < 50 && 'Lots of unknowns here. Start with the customer and finance questions.'}
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-4">
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2">Your Business Model</h3>
        <div className="text-sm text-text-primary">{BUSINESS_MODELS.find(m => m.id === bizModel)?.label || '—'}</div>
        <div className="text-[10px] text-text-muted mt-1">{STAGES.find(s => s.id === stage)?.label || '—'}</div>
      </div>

      {gaps.length > 0 && (
        <div className="bg-bg-card border border-warning/30 rounded-lg p-4 space-y-2">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-warning">Gaps to address</h3>
          <ul className="space-y-1.5">
            {gaps.slice(0, 5).map((g, i) => (
              <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                <span className="text-warning shrink-0">•</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-bg-card border border-success/30 rounded-lg p-4 space-y-2">
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-success">Recommended next steps</h3>
        <ul className="space-y-1.5 text-xs text-text-secondary">
          <li>→ Tackle a <span className="text-accent">Strategic Workbook</span> that targets your biggest gap</li>
          <li>→ Run <span className="text-accent">Financial Projections</span> to pressure-test growth assumptions</li>
          <li>→ Generate an <span className="text-accent">AI Report</span> for your board or investors</li>
        </ul>
      </div>

      <button onClick={() => setStep('intro')} className="w-full border border-border text-text-secondary py-3 rounded-lg text-sm font-medium hover:border-accent/50 hover:text-text-primary">
        Retake Assessment
      </button>
    </div>
  )
}
