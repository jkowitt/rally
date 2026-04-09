import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'

const DEFAULT_ASSUMPTIONS = {
  // Pricing
  starter_price: 39,
  pro_price: 99,
  enterprise_price: 249,
  // Starting point
  current_users: 1,
  current_mrr: 0,
  // Growth rates (monthly)
  organic_growth_rate: 8, // % month over month
  paid_growth_rate: 0, // additional from ads
  churn_rate: 5, // % monthly
  // Conversion funnel
  free_to_starter: 5, // % convert
  starter_to_pro: 15, // % upgrade
  pro_to_enterprise: 5, // % upgrade
  // Plan mix of new signups
  starter_mix: 60, // %
  pro_mix: 30,
  enterprise_mix: 10,
  // Advertising
  monthly_ad_spend: 0,
  avg_cpm: 25,
  click_through_rate: 2, // %
  landing_page_conversion: 5, // %
  // Costs
  hosting_monthly: 25,
  supabase_monthly: 25,
  api_costs_monthly: 50,
  other_costs_monthly: 0,
  // Overage revenue per user
  avg_overage_per_user: 2,
}

function calculateProjections(assumptions) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions }
  const months = []
  let totalUsers = a.current_users
  let starterUsers = 0
  let proUsers = 0
  let enterpriseUsers = 0
  let freeUsers = totalUsers

  for (let m = 0; m < 60; m++) {
    const year = Math.floor(m / 12) + 1
    const monthLabel = `Y${year}M${(m % 12) + 1}`

    // New organic signups
    const organicNew = Math.round(totalUsers * (a.organic_growth_rate / 100))

    // New paid signups from advertising
    let paidNew = 0
    if (a.monthly_ad_spend > 0 && a.avg_cpm > 0) {
      const impressions = (a.monthly_ad_spend / a.avg_cpm) * 1000
      const clicks = impressions * (a.click_through_rate / 100)
      paidNew = Math.round(clicks * (a.landing_page_conversion / 100))
    }

    const totalNew = organicNew + paidNew

    // Conversions from free to paid
    const newStarter = Math.round(totalNew * (a.starter_mix / 100))
    const newPro = Math.round(totalNew * (a.pro_mix / 100))
    const newEnterprise = Math.round(totalNew * (a.enterprise_mix / 100))
    const newFree = totalNew - newStarter - newPro - newEnterprise

    // Upgrades
    const starterToPro = Math.round(starterUsers * (a.starter_to_pro / 100 / 12))
    const proToEnterprise = Math.round(proUsers * (a.pro_to_enterprise / 100 / 12))

    // Churn
    const churnedStarter = Math.round(starterUsers * (a.churn_rate / 100))
    const churnedPro = Math.round(proUsers * (a.churn_rate / 100))
    const churnedFree = Math.round(freeUsers * (a.churn_rate / 100) * 1.5) // free churns faster

    // Update counts
    freeUsers = Math.max(0, freeUsers + newFree - churnedFree)
    starterUsers = Math.max(0, starterUsers + newStarter - starterToPro - churnedStarter)
    proUsers = Math.max(0, proUsers + newPro + starterToPro - proToEnterprise - churnedPro)
    enterpriseUsers = Math.max(0, enterpriseUsers + newEnterprise + proToEnterprise)
    totalUsers = freeUsers + starterUsers + proUsers + enterpriseUsers

    // Revenue
    const subscriptionRevenue = (starterUsers * a.starter_price) + (proUsers * a.pro_price) + (enterpriseUsers * a.enterprise_price)
    const overageRevenue = (starterUsers + proUsers) * a.avg_overage_per_user
    const mrr = subscriptionRevenue + overageRevenue
    const arr = mrr * 12

    // Costs
    const totalCosts = a.hosting_monthly + a.supabase_monthly + a.api_costs_monthly + a.other_costs_monthly + a.monthly_ad_spend
    const profit = mrr - totalCosts

    months.push({
      month: m + 1, label: monthLabel, year,
      totalUsers, freeUsers, starterUsers, proUsers, enterpriseUsers,
      newSignups: totalNew, organicNew, paidNew,
      churnedTotal: churnedStarter + churnedPro + churnedFree,
      mrr, arr, subscriptionRevenue, overageRevenue,
      costs: totalCosts, adSpend: a.monthly_ad_spend, profit,
      cumulativeRevenue: 0, // calculated below
    })
  }

  // Cumulative revenue
  let cumRev = 0
  for (const m of months) { cumRev += m.mrr; m.cumulativeRevenue = cumRev }

  // Year summaries
  const years = [1, 2, 3, 4, 5].map(y => {
    const yearMonths = months.filter(m => m.year === y)
    const lastMonth = yearMonths[yearMonths.length - 1]
    return {
      year: y,
      endUsers: lastMonth?.totalUsers || 0,
      endMRR: lastMonth?.mrr || 0,
      arr: (lastMonth?.mrr || 0) * 12,
      totalRevenue: yearMonths.reduce((s, m) => s + m.mrr, 0),
      totalCosts: yearMonths.reduce((s, m) => s + m.costs, 0),
      totalProfit: yearMonths.reduce((s, m) => s + m.profit, 0),
      totalSignups: yearMonths.reduce((s, m) => s + m.newSignups, 0),
      endStarter: lastMonth?.starterUsers || 0,
      endPro: lastMonth?.proUsers || 0,
      endEnterprise: lastMonth?.enterpriseUsers || 0,
    }
  })

  return { months, years }
}

export default function FinancialProjections() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: savedScenarios } = useQuery({
    queryKey: ['biz-projections'],
    queryFn: async () => { const { data } = await supabase.from('biz_projections').select('*').order('created_at', { ascending: false }); return data || [] },
  })

  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS)
  const [scenarioName, setScenarioName] = useState('Base Case')

  const projection = useMemo(() => calculateProjections(assumptions), [assumptions])

  function updateAssumption(key, value) {
    setAssumptions(prev => ({ ...prev, [key]: Number(value) || 0 }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('biz_projections').insert({
        name: scenarioName, assumptions, results: projection.years, created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-projections'] }); toast({ title: 'Scenario saved', type: 'success' }) },
  })

  function loadScenario(scenario) {
    setAssumptions(scenario.assumptions)
    setScenarioName(scenario.name)
    toast({ title: `Loaded: ${scenario.name}`, type: 'success' })
  }

  // Chart data — quarterly
  const quarterlyData = [3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60].map(m => {
    const d = projection.months[m - 1]
    if (!d) return null
    return { label: `M${m}`, mrr: d.mrr, users: d.totalUsers, profit: d.profit, arr: d.arr }
  }).filter(Boolean)

  const y5 = projection.years[4]

  return (
    <div className="space-y-4">
      {/* 5-Year Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {projection.years.map(y => (
          <div key={y.year} className={`bg-bg-surface border rounded-lg p-3 text-center ${y.year <= 2 ? 'border-accent/30' : 'border-border'}`}>
            <div className="text-[10px] text-text-muted font-mono">Year {y.year}</div>
            <div className="text-lg font-bold font-mono text-accent mt-0.5">${y.arr >= 1000000 ? `${(y.arr / 1000000).toFixed(1)}M` : `${(y.arr / 1000).toFixed(0)}K`}</div>
            <div className="text-[9px] text-text-muted">ARR</div>
            <div className="text-xs font-mono text-text-secondary mt-1">{y.endUsers} users</div>
            <div className={`text-[10px] font-mono mt-0.5 ${y.totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>${(y.totalProfit / 1000).toFixed(0)}K profit</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-3">MRR Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 9, fill: '#8B92A8' }} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 11 }} formatter={v => [`$${Number(v).toLocaleString()}`, '']} />
              <Area type="monotone" dataKey="mrr" fill="#E8B84B" fillOpacity={0.2} stroke="#E8B84B" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-3">Users + Profit</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 9, fill: '#8B92A8' }} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 11 }} />
              <Line type="monotone" dataKey="users" stroke="#52C48A" strokeWidth={2} name="Users" />
              <Line type="monotone" dataKey="profit" stroke="#E8B84B" strokeWidth={2} name="Monthly Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assumption Controls */}
      <div className="bg-bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-primary">Scenario: {scenarioName}</h3>
          <div className="flex gap-2">
            <input value={scenarioName} onChange={e => setScenarioName(e.target.value)} className="bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent w-32" />
            <button onClick={() => saveMutation.mutate()} className="bg-accent text-bg-primary px-3 py-1 rounded text-xs font-medium hover:opacity-90">Save</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <SliderInput label="Organic Growth %/mo" value={assumptions.organic_growth_rate} onChange={v => updateAssumption('organic_growth_rate', v)} min={0} max={30} />
          <SliderInput label="Churn Rate %/mo" value={assumptions.churn_rate} onChange={v => updateAssumption('churn_rate', v)} min={0} max={20} />
          <SliderInput label="Free → Starter %" value={assumptions.free_to_starter} onChange={v => updateAssumption('free_to_starter', v)} min={0} max={30} />
          <SliderInput label="Starter → Pro %" value={assumptions.starter_to_pro} onChange={v => updateAssumption('starter_to_pro', v)} min={0} max={50} />
          <SliderInput label="Starter Price $" value={assumptions.starter_price} onChange={v => updateAssumption('starter_price', v)} min={19} max={99} step={5} />
          <SliderInput label="Pro Price $" value={assumptions.pro_price} onChange={v => updateAssumption('pro_price', v)} min={49} max={249} step={10} />
          <SliderInput label="Enterprise Price $" value={assumptions.enterprise_price} onChange={v => updateAssumption('enterprise_price', v)} min={99} max={999} step={25} />
          <SliderInput label="Starting Users" value={assumptions.current_users} onChange={v => updateAssumption('current_users', v)} min={1} max={100} />

          <div className="sm:col-span-2 md:col-span-4 border-t border-border pt-3 mt-1">
            <div className="text-[10px] font-mono text-accent uppercase mb-2">Advertising</div>
          </div>
          <SliderInput label="Ad Spend $/mo" value={assumptions.monthly_ad_spend} onChange={v => updateAssumption('monthly_ad_spend', v)} min={0} max={10000} step={100} />
          <SliderInput label="CPM $" value={assumptions.avg_cpm} onChange={v => updateAssumption('avg_cpm', v)} min={5} max={100} />
          <SliderInput label="CTR %" value={assumptions.click_through_rate} onChange={v => updateAssumption('click_through_rate', v)} min={0.5} max={10} step={0.5} />
          <SliderInput label="Landing Conv %" value={assumptions.landing_page_conversion} onChange={v => updateAssumption('landing_page_conversion', v)} min={1} max={20} />

          <div className="sm:col-span-2 md:col-span-4 border-t border-border pt-3 mt-1">
            <div className="text-[10px] font-mono text-accent uppercase mb-2">Costs</div>
          </div>
          <SliderInput label="Hosting $/mo" value={assumptions.hosting_monthly} onChange={v => updateAssumption('hosting_monthly', v)} min={0} max={500} step={5} />
          <SliderInput label="Supabase $/mo" value={assumptions.supabase_monthly} onChange={v => updateAssumption('supabase_monthly', v)} min={0} max={500} step={5} />
          <SliderInput label="API Costs $/mo" value={assumptions.api_costs_monthly} onChange={v => updateAssumption('api_costs_monthly', v)} min={0} max={500} step={10} />
          <SliderInput label="Other Costs $/mo" value={assumptions.other_costs_monthly} onChange={v => updateAssumption('other_costs_monthly', v)} min={0} max={5000} step={50} />
        </div>
      </div>

      {/* Year-by-year detail table */}
      <div className="bg-bg-surface border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border text-left">
            <th className="px-3 py-2 text-text-muted font-mono">Year</th>
            <th className="px-3 py-2 text-text-muted font-mono text-right">Users</th>
            <th className="px-3 py-2 text-text-muted font-mono text-right">Starter</th>
            <th className="px-3 py-2 text-text-muted font-mono text-right">Pro</th>
            <th className="px-3 py-2 text-text-muted font-mono text-right">Enterprise</th>
            <th className="px-3 py-2 text-text-muted font-mono text-right">MRR</th>
            <th className="px-3 py-2 text-text-muted font-mono text-right">ARR</th>
            <th className="px-3 py-2 text-text-muted font-mono text-right">Revenue</th>
            <th className="px-3 py-2 text-text-muted font-mono text-right">Costs</th>
            <th className="px-3 py-2 text-text-muted font-mono text-right">Profit</th>
          </tr></thead>
          <tbody>
            {projection.years.map(y => (
              <tr key={y.year} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-text-primary font-mono">Y{y.year}</td>
                <td className="px-3 py-2 text-right font-mono">{y.endUsers}</td>
                <td className="px-3 py-2 text-right font-mono">{y.endStarter}</td>
                <td className="px-3 py-2 text-right font-mono">{y.endPro}</td>
                <td className="px-3 py-2 text-right font-mono">{y.endEnterprise}</td>
                <td className="px-3 py-2 text-right font-mono text-accent">${y.endMRR.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-accent">${y.arr.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">${y.totalRevenue.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-danger">${y.totalCosts.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-mono font-bold ${y.totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>${y.totalProfit.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Saved Scenarios */}
      {(savedScenarios || []).length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-2">Saved Scenarios</h3>
          <div className="flex gap-2 flex-wrap">
            {(savedScenarios || []).map(s => (
              <button key={s.id} onClick={() => loadScenario(s)} className="bg-bg-card border border-border text-text-secondary px-3 py-1.5 rounded text-xs font-mono hover:border-accent/50 hover:text-text-primary">
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SliderInput({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="text-accent font-mono">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} className="w-full accent-accent h-3 cursor-pointer touch-manipulation" />
    </div>
  )
}
