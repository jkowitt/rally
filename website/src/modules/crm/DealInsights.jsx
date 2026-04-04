import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { getDealInsights, getPipelineForecast, draftEmail } from '@/lib/claude'

const EMAIL_TYPES = ['Follow Up', 'Proposal', 'Thank You', 'Check In', 'Renewal']

const STAGE_PROBABILITY = {
  Prospect: 10,
  'Proposal Sent': 25,
  Negotiation: 50,
  Contracted: 90,
  'In Fulfillment': 95,
  Renewed: 100,
  Declined: 0,
}

function healthColor(score) {
  if (score >= 8) return 'text-success'
  if (score >= 5) return 'text-warning'
  return 'text-danger'
}

function healthBg(score) {
  if (score >= 8) return 'bg-emerald-500/20 border-emerald-500/40'
  if (score >= 5) return 'bg-amber-500/20 border-amber-500/40'
  return 'bg-red-500/20 border-red-500/40'
}

function pipelineHealthBadge(health) {
  const map = {
    healthy: { label: 'Healthy', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' },
    good: { label: 'Good', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' },
    moderate: { label: 'Moderate', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/40' },
    warning: { label: 'Warning', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/40' },
    critical: { label: 'Critical', cls: 'bg-red-500/20 text-red-400 border border-red-500/40' },
    poor: { label: 'Poor', cls: 'bg-red-500/20 text-red-400 border border-red-500/40' },
  }
  const key = (health || '').toLowerCase()
  const cfg = map[key] || { label: health || 'Unknown', cls: 'bg-gray-500/20 text-gray-400 border border-gray-500/40' }
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
}

function formatCurrency(val) {
  if (val == null) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

export default function DealInsights() {
  const { profile } = useAuth()
  const propertyId = profile?.property_id

  // --- Pipeline Forecast State ---
  const [forecastData, setForecastData] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastError, setForecastError] = useState(null)

  // --- Deal Intelligence State ---
  const [selectedDealId, setSelectedDealId] = useState('')
  const [insightsData, setInsightsData] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState(null)
  const [checkedActions, setCheckedActions] = useState({})

  // --- Email State ---
  const [emailType, setEmailType] = useState('Follow Up')
  const [emailData, setEmailData] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState(null)
  const [emailCopied, setEmailCopied] = useState(false)
  const emailRef = useRef(null)

  // Fetch all deals
  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ['deals', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const activeDeals = (deals || []).filter(d => !['Declined', 'Renewed'].includes(d.stage))
  const selectedDeal = (deals || []).find(d => d.id === selectedDealId)

  // Fetch deal-related data when a deal is selected
  const { data: dealActivities } = useQuery({
    queryKey: ['activities', selectedDealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', selectedDealId)
        .order('occurred_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!selectedDealId,
  })

  const { data: dealTasks } = useQuery({
    queryKey: ['tasks', selectedDealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('deal_id', selectedDealId)
        .order('due_date', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!selectedDealId,
  })

  const { data: dealContracts } = useQuery({
    queryKey: ['contracts', selectedDealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('deal_id', selectedDealId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!selectedDealId,
  })

  // --- Handlers ---
  async function handleRunForecast() {
    setForecastLoading(true)
    setForecastError(null)
    setForecastData(null)
    try {
      const historicalWinRate = calculateWinRate(deals || [])
      const result = await getPipelineForecast({ deals: activeDeals, historical_win_rate: historicalWinRate })
      setForecastData(result.forecast)
    } catch (err) {
      setForecastError(err.message || 'Failed to generate forecast')
    } finally {
      setForecastLoading(false)
    }
  }

  async function handleAnalyzeDeal() {
    if (!selectedDeal) return
    setInsightsLoading(true)
    setInsightsError(null)
    setInsightsData(null)
    setCheckedActions({})
    try {
      const result = await getDealInsights({
        deal: selectedDeal,
        activities: dealActivities || [],
        tasks: dealTasks || [],
        contracts: dealContracts || [],
      })
      setInsightsData(result.insights)
    } catch (err) {
      setInsightsError(err.message || 'Failed to analyze deal')
    } finally {
      setInsightsLoading(false)
    }
  }

  async function handleDraftEmail() {
    if (!selectedDeal) return
    setEmailLoading(true)
    setEmailError(null)
    setEmailData(null)
    setEmailCopied(false)
    try {
      const context = {
        activities: dealActivities || [],
        insights: insightsData || null,
      }
      const result = await draftEmail({ deal: selectedDeal, context, email_type: emailType })
      setEmailData(result.email)
    } catch (err) {
      setEmailError(err.message || 'Failed to draft email')
    } finally {
      setEmailLoading(false)
    }
  }

  function handleCopyEmail() {
    if (!emailData) return
    const text = `Subject: ${emailData.subject}\n\n${emailData.body}`
    navigator.clipboard.writeText(text).then(() => {
      setEmailCopied(true)
      setTimeout(() => setEmailCopied(false), 2000)
    })
  }

  function calculateWinRate(allDeals) {
    const closed = allDeals.filter(d => ['Contracted', 'In Fulfillment', 'Renewed', 'Declined'].includes(d.stage))
    if (closed.length === 0) return 0.5
    const won = closed.filter(d => d.stage !== 'Declined').length
    return won / closed.length
  }

  function handleDealChange(e) {
    setSelectedDealId(e.target.value)
    setInsightsData(null)
    setInsightsError(null)
    setEmailData(null)
    setEmailError(null)
    setCheckedActions({})
  }

  if (dealsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Deal Insights</h1>
        <p className="text-text-secondary mt-1">AI-powered pipeline forecasting and deal intelligence</p>
      </div>

      {/* ========== SECTION 1: Pipeline Forecast ========== */}
      <section className="bg-bg-surface border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Pipeline Forecast</h2>
            <p className="text-sm text-text-muted mt-0.5">
              {activeDeals.length} active deal{activeDeals.length !== 1 ? 's' : ''} in pipeline
            </p>
          </div>
          <button
            onClick={handleRunForecast}
            disabled={forecastLoading || activeDeals.length === 0}
            className="px-5 py-2.5 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {forecastLoading ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-2 border-black/30 border-t-black rounded-full" />
                Analyzing...
              </>
            ) : (
              'Run AI Forecast'
            )}
          </button>
        </div>

        {forecastError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
            {forecastError}
          </div>
        )}

        {forecastData && (
          <div className="space-y-6">
            {/* Forecast Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ForecastCard label="30-Day Forecast" value={forecastData.forecast_30_days} />
              <ForecastCard label="60-Day Forecast" value={forecastData.forecast_60_days} />
              <ForecastCard label="90-Day Forecast" value={forecastData.forecast_90_days} />
            </div>

            {/* Scenario + Health */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <ScenarioCard label="Best Case" value={forecastData.best_case} variant="success" />
              <ScenarioCard label="Most Likely" value={forecastData.most_likely} variant="accent" />
              <ScenarioCard label="Worst Case" value={forecastData.worst_case} variant="danger" />
              <div className="bg-bg-card border border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2">
                <span className="text-xs text-text-muted uppercase tracking-wider">Pipeline Health</span>
                {pipelineHealthBadge(forecastData.pipeline_health)}
              </div>
            </div>

            {/* Summary */}
            {forecastData.summary && (
              <div className="bg-bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-text-secondary">{forecastData.summary}</p>
              </div>
            )}

            {/* At-Risk and Hot Deals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forecastData.at_risk_deals?.length > 0 && (
                <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    At-Risk Deals
                  </h3>
                  <ul className="space-y-2">
                    {forecastData.at_risk_deals.map((deal, i) => (
                      <li key={i} className="text-sm text-text-secondary bg-bg-surface rounded px-3 py-2">
                        {typeof deal === 'string' ? deal : deal.name || deal.brand_name || JSON.stringify(deal)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {forecastData.hot_deals?.length > 0 && (
                <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Hot Deals
                  </h3>
                  <ul className="space-y-2">
                    {forecastData.hot_deals.map((deal, i) => (
                      <li key={i} className="text-sm text-text-secondary bg-bg-surface rounded px-3 py-2">
                        {typeof deal === 'string' ? deal : deal.name || deal.brand_name || JSON.stringify(deal)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* AI Recommendations */}
            {forecastData.recommendations?.length > 0 && (
              <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-accent">AI Recommendations</h3>
                <ul className="space-y-2">
                  {forecastData.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-accent mt-0.5 shrink-0">&#x2022;</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!forecastData && !forecastLoading && !forecastError && (
          <div className="text-center py-12 text-text-muted text-sm">
            Click "Run AI Forecast" to analyze your pipeline with AI
          </div>
        )}
      </section>

      {/* ========== SECTION 2: Deal Intelligence ========== */}
      <section className="bg-bg-surface border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Deal Intelligence</h2>
          <p className="text-sm text-text-muted mt-0.5">Select a deal to analyze with AI</p>
        </div>

        {/* Deal Selector + Analyze Button */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-sm text-text-secondary mb-1.5">Select Deal</label>
            <select
              value={selectedDealId}
              onChange={handleDealChange}
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="">-- Choose a deal --</option>
              {(deals || []).map(d => (
                <option key={d.id} value={d.id}>
                  {d.brand_name || d.name || 'Unnamed'} — {d.stage} {d.value ? `(${formatCurrency(d.value)})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAnalyzeDeal}
            disabled={!selectedDealId || insightsLoading}
            className="px-5 py-2.5 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {insightsLoading ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-2 border-black/30 border-t-black rounded-full" />
                Analyzing...
              </>
            ) : (
              'Analyze Deal'
            )}
          </button>
        </div>

        {insightsError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
            {insightsError}
          </div>
        )}

        {insightsData && (
          <div className="space-y-6">
            {/* Health Score + Estimated Close */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`border rounded-lg p-5 flex items-center gap-4 ${healthBg(insightsData.health_score)}`}>
                <div className={`text-4xl font-mono font-bold ${healthColor(insightsData.health_score)}`}>
                  {insightsData.health_score}
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider">Health Score</div>
                  <div className="text-sm text-text-secondary mt-0.5">out of 10</div>
                </div>
              </div>
              {insightsData.days_to_close_estimate != null && (
                <div className="bg-bg-card border border-border rounded-lg p-5 flex items-center gap-4">
                  <div className="text-4xl font-mono font-bold text-accent">
                    {insightsData.days_to_close_estimate}
                  </div>
                  <div>
                    <div className="text-xs text-text-muted uppercase tracking-wider">Est. Days to Close</div>
                    <div className="text-sm text-text-secondary mt-0.5">AI prediction</div>
                  </div>
                </div>
              )}
            </div>

            {/* Next Best Actions */}
            {insightsData.next_best_actions?.length > 0 && (
              <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-accent">Next Best Actions</h3>
                <ul className="space-y-2">
                  {insightsData.next_best_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <button
                        onClick={() => setCheckedActions(prev => ({ ...prev, [i]: !prev[i] }))}
                        className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          checkedActions[i]
                            ? 'bg-accent border-accent text-black'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        {checkedActions[i] && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`text-sm ${checkedActions[i] ? 'line-through text-text-muted' : 'text-text-secondary'}`}>
                        {action}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Factors + Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insightsData.risk_factors?.length > 0 && (
                <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Risk Factors
                  </h3>
                  <ul className="space-y-2">
                    {insightsData.risk_factors.map((risk, i) => (
                      <li key={i} className="text-sm text-red-300/80 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5 shrink-0">!</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {insightsData.opportunities?.length > 0 && (
                <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Opportunities
                  </h3>
                  <ul className="space-y-2">
                    {insightsData.opportunities.map((opp, i) => (
                      <li key={i} className="text-sm text-emerald-300/80 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Talking Points */}
            {insightsData.recommended_talking_points?.length > 0 && (
              <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">Recommended Talking Points</h3>
                <ul className="space-y-2">
                  {insightsData.recommended_talking_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-accent mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Coaching Tip */}
            {insightsData.coaching_tip && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                <div className="text-xs text-accent uppercase tracking-wider font-semibold mb-1">Coaching Tip</div>
                <p className="text-sm text-text-secondary">{insightsData.coaching_tip}</p>
              </div>
            )}

            {/* Draft Email Section */}
            <div className="bg-bg-card border border-border rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Draft Email</h3>
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[180px]">
                  <label className="block text-xs text-text-muted mb-1">Email Type</label>
                  <select
                    value={emailType}
                    onChange={e => {
                      setEmailType(e.target.value)
                      setEmailData(null)
                      setEmailError(null)
                    }}
                    className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    {EMAIL_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleDraftEmail}
                  disabled={emailLoading}
                  className="px-4 py-2 bg-accent/20 text-accent font-medium rounded-lg hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm border border-accent/30"
                >
                  {emailLoading ? (
                    <>
                      <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-accent/30 border-t-accent rounded-full" />
                      Drafting...
                    </>
                  ) : (
                    'Draft Email'
                  )}
                </button>
              </div>

              {emailError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  {emailError}
                </div>
              )}

              {emailData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-text-muted">
                      Tone: <span className="text-text-secondary capitalize">{emailData.tone}</span>
                    </div>
                    <button
                      onClick={handleCopyEmail}
                      className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
                    >
                      {emailCopied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                  </div>
                  <div className="bg-bg-surface border border-border rounded-lg p-3">
                    <div className="text-xs text-text-muted mb-1">Subject</div>
                    <div className="text-sm text-text-primary font-medium">{emailData.subject}</div>
                  </div>
                  <textarea
                    ref={emailRef}
                    readOnly
                    value={emailData.body}
                    rows={12}
                    className="w-full bg-bg-surface border border-border rounded-lg p-3 text-sm text-text-secondary font-mono resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {!insightsData && !insightsLoading && !insightsError && selectedDealId && (
          <div className="text-center py-12 text-text-muted text-sm">
            Click "Analyze Deal" to get AI-powered insights
          </div>
        )}

        {!selectedDealId && (
          <div className="text-center py-12 text-text-muted text-sm">
            Select a deal from the dropdown above to get started
          </div>
        )}
      </section>
    </div>
  )
}

function ForecastCard({ label, value }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
      <div className="text-xs text-text-muted uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-mono font-bold text-text-primary">{formatCurrency(value)}</div>
    </div>
  )
}

function ScenarioCard({ label, value, variant }) {
  const colorMap = {
    success: 'text-success',
    accent: 'text-accent',
    danger: 'text-danger',
  }
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
      <div className="text-xs text-text-muted uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-xl font-mono font-bold ${colorMap[variant] || 'text-text-primary'}`}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}
