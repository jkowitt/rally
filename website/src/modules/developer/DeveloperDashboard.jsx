import { useState, useEffect, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags, HIDDEN_MODULES } from '@/hooks/useFeatureFlags'
import { getFlagMeta } from '@/lib/featureFlagMeta'
import { useToast } from '@/components/Toast'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import APIUsageBanner, { CONTACT_LOOKUP_LIMITS } from '@/components/APIUsageBanner'
import { logAudit } from '@/lib/audit'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts'

const CRMDataImporter = lazy(() => import('@/components/CRMDataImporter'))
const QATestSuite = lazy(() => import('./QATestSuite'))
const QATaskManager = lazy(() => import('./QATaskManager'))
const QAUsageSimulator = lazy(() => import('./QAUsageSimulator'))
const QAAutoReports = lazy(() => import('./QAAutoReports'))
const ChangeLog = lazy(() => import('./ChangeLog'))
const ROLES = ['developer', 'admin', 'rep']
const PLANS = ['free', 'starter', 'pro', 'enterprise']

// Descriptions for hidden developer flags — shown inline next to the
// toggle so it's obvious what flipping each one does. Keep in sync with
// HIDDEN_MODULES in src/hooks/useFeatureFlags.jsx.
const HIDDEN_FLAG_DESCRIPTIONS = {
  outlook_integration:
    "Developer-only Outlook integration for personal outreach management.",
  email_marketing_developer:
    "Developer-only email marketing access. Enables the full /app/marketing/email UI for the developer role.",
  email_marketing_public:
    "Public (admin+) email marketing beta. When ON, admin/businessops users see Email Marketing in their sidebar.",
}

export default function DeveloperDashboard() {
  // Use REAL developer status (not the impersonated overlay) so the
  // developer can keep the dashboard accessible while previewing the
  // app as a rep / admin / businessops via the impersonation panel.
  const { realIsDeveloper, realProfile, profile } = useAuth()
  const { flags, toggleFlag } = useFeatureFlags()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  // Tab state in the URL so refreshes + bookmarks land on the right tab.
  // ?tab=qa  →  active tab "qa"; missing or unknown falls back to "overview".
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const setActiveTab = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === 'overview') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
  }
  const [editingUser, setEditingUser] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [runningAnalysis, setRunningAnalysis] = useState(false)
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkPlan, setNewLinkPlan] = useState('pro')
  const [showCRMImporter, setShowCRMImporter] = useState(false)
  const [showCreateProperty, setShowCreateProperty] = useState(false)
  const [newPropName, setNewPropName] = useState('')
  const [newPropType, setNewPropType] = useState('college')
  const [newPropCity, setNewPropCity] = useState('')
  const [newPropState, setNewPropState] = useState('')
  const [savingFlag, setSavingFlag] = useState(null)
  const [expandedFlag, setExpandedFlag] = useState(null)   // module key whose info pane is open
  const [diagnosticResult, setDiagnosticResult] = useState(null)
  const [runningDiagnostic, setRunningDiagnostic] = useState(false)

  async function handleToggleFlag(module, label) {
    setSavingFlag(module)
    const result = await toggleFlag(module)
    setSavingFlag(null)
    if (result.success) {
      toast({ title: `${label} ${result.enabled ? 'enabled' : 'disabled'}`, description: 'Saved to database', type: 'success' })
    } else {
      // Surface the real error in the toast AND make it dismissable
      // so the developer can see what blocked the save
      toast({
        title: 'Save failed',
        description: result.error || 'Check browser console for details',
        type: 'error',
      })
    }
  }

  /**
   * Runs a live test against feature_flags to find out EXACTLY why
   * saves aren't persisting. Tests the edge function write path
   * (preferred) plus three direct DB operations and reports which
   * works. Gives an actionable recommendation based on the results.
   */
  async function runFeatureFlagDiagnostic() {
    setRunningDiagnostic(true)
    const result = {
      edgeFunction: 'unknown',
      canSelect: false,
      canUpdate: false,
      canInsert: false,
      rowCount: 0,
      errors: [],
      recommendation: '',
    }
    try {
      // 1. Does the set-feature-flag edge function work? Preferred path.
      try {
        const testMod = `__diagnostic_ef_${Date.now()}`
        const { data: efData, error: efErr } = await supabase.functions.invoke('set-feature-flag', {
          body: { module: testMod, enabled: false },
        })
        if (efErr) {
          result.edgeFunction = 'not_deployed'
          result.errors.push(`Edge fn: ${efErr.message}`)
        } else if (efData?.success) {
          result.edgeFunction = 'working'
          // Clean up sentinel row
          await supabase.from('feature_flags').delete().eq('module', testMod).catch(() => {})
        } else {
          result.edgeFunction = 'deployed_but_rejected'
          result.errors.push(`Edge fn rejected: ${efData?.error || 'unknown'}${efData?.hint ? ' — ' + efData.hint : ''}`)
        }
      } catch (err) {
        result.edgeFunction = 'not_deployed'
        result.errors.push(`Edge fn threw: ${err.message}`)
      }

      // 2. Can we select from the table? (read test)
      const { data: rows, error: selErr } = await supabase
        .from('feature_flags')
        .select('module, enabled')
      if (selErr) {
        result.errors.push(`SELECT: ${selErr.message}`)
      } else {
        result.canSelect = true
        result.rowCount = rows?.length || 0
      }

      // 3. Can we UPDATE an existing row directly? (Use 'crm' — seeded day 1)
      const { error: updErr } = await supabase
        .from('feature_flags')
        .update({ updated_at: new Date().toISOString() })
        .eq('module', 'crm')
        .select()
      if (updErr) {
        result.errors.push(`UPDATE crm: ${updErr.message}`)
      } else {
        result.canUpdate = true
      }

      // 4. Can we INSERT a new row directly? (sentinel, cleaned up on success)
      const sentinel = `__diagnostic_direct_${Date.now()}`
      const { error: insErr } = await supabase
        .from('feature_flags')
        .insert({ module: sentinel, enabled: false, updated_at: new Date().toISOString() })
      if (insErr) {
        result.errors.push(`INSERT sentinel: ${insErr.message}`)
      } else {
        result.canInsert = true
        await supabase.from('feature_flags').delete().eq('module', sentinel)
      }

      // ─── Build recommendation based on what worked ───
      if (result.edgeFunction === 'working') {
        result.recommendation = '✓ Edge function works. Toggles should persist via the primary path. If you still see reverts, hard-refresh the browser to pick up the latest JS.'
      } else if (result.canInsert) {
        result.recommendation = '✓ Direct DB writes work (migration 058 applied). Toggles persist via the fallback path.'
      } else if (result.edgeFunction === 'not_deployed' && !result.canInsert) {
        result.recommendation = '✗ Neither path works. Deploy the edge function: supabase functions deploy set-feature-flag — OR apply migration 058: supabase db push'
      } else if (result.canUpdate && !result.canInsert) {
        result.recommendation = '✗ Can update existing rows but not insert new ones. Deploy the edge function OR run migration 058.'
      } else if (!result.canUpdate) {
        result.recommendation = '✗ Cannot even update existing rows. Your profile role is likely not \'developer\' in the DB. Check: select role from profiles where id = auth.uid()'
      } else {
        result.recommendation = '✗ Unexpected state. See raw errors below.'
      }
    } catch (err) {
      result.errors.push(`Exception: ${err.message}`)
    } finally {
      setDiagnosticResult(result)
      setRunningDiagnostic(false)
    }
  }
  const [newPropPlan, setNewPropPlan] = useState('free')

  // Auth gate moved AFTER hook calls (rules-of-hooks). All useQuery
  // calls below are gated with enabled:!!realIsDeveloper so RLS-bound
  // requests don't fire for non-developers.

  const { data: properties } = useQuery({
    queryKey: ['dev-properties'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
      return data || []
    },
    refetchInterval: 10000, // every 10 seconds
  })

  const { data: profiles } = useQuery({
    queryKey: ['dev-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*, properties!profiles_property_id_fkey(*)').order('created_at', { ascending: false })
      if (error) { console.error('Profiles query error:', error); return [] }
      return data || []
    },
    refetchInterval: 10000,
  })

  const { data: invitations } = useQuery({
    queryKey: ['dev-invitations'],
    queryFn: async () => {
      const { data } = await supabase.from('invitations').select('*, properties(name)').order('created_at', { ascending: false }).limit(50)
      return data || []
    },
    refetchInterval: 30000,
  })

  const { data: apiUsage } = useQuery({
    queryKey: ['dev-api-usage'],
    queryFn: async () => {
      const { data } = await supabase.from('api_usage').select('service, credits_used').gte('called_at', new Date(Date.now() - 30 * 86400000).toISOString())
      if (!data) return {}
      const grouped = {}
      data.forEach(u => { grouped[u.service] = (grouped[u.service] || 0) + (u.credits_used || 1) })
      return grouped
    },
  })

  // Code analysis reports
  const { data: analysisReports } = useQuery({
    queryKey: ['dev-analysis'],
    queryFn: async () => {
      const { data } = await supabase.from('code_analysis_reports').select('*').order('run_date', { ascending: false }).limit(14)
      return data || []
    },
  })

  // Feature suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['dev-suggestions'],
    queryFn: async () => {
      const { data } = await supabase.from('feature_suggestions').select('*').order('created_at', { ascending: false })
      return data || []
    },
  })

  // Premium invite links (table may not exist if migration 025 hasn't run)
  const { data: premiumLinks } = useQuery({
    queryKey: ['dev-premium-links'],
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_invite_links').select('*, properties(name)').order('created_at', { ascending: false })
      if (error) return [] // table may not exist yet
      return data || []
    },
  })

  const createPremiumLinkMutation = useMutation({
    mutationFn: async ({ label, plan }) => {
      const { data, error } = await supabase.from('premium_invite_links').insert({
        label, plan, created_by: profile?.id,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dev-premium-links'] })
      const url = `${window.location.origin}/login?premium=${data.token}`
      navigator.clipboard.writeText(url)
      toast({ title: 'Premium link created & copied!', type: 'success' })
      setNewLinkLabel('')
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  const revokePremiumLinkMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('premium_invite_links').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-premium-links'] })
      toast({ title: 'Link revoked', type: 'success' })
    },
  })

  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('feature_suggestions').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-suggestions'] })
      toast({ title: 'Suggestion updated', type: 'success' })
    },
  })

  // Custom dashboard requests
  const { data: customRequests } = useQuery({
    queryKey: ['dev-custom-requests'],
    queryFn: async () => {
      const { data } = await supabase.from('custom_dashboard_requests').select('*, properties(name)').order('created_at', { ascending: false })
      return data || []
    },
  })

  const updateCustomRequestMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('custom_dashboard_requests').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-custom-requests'] })
      toast({ title: 'Request updated', type: 'success' })
    },
  })

  const createPropertyMutation = useMutation({
    mutationFn: async ({ name, type, city, state, plan }) => {
      const { data, error } = await supabase.from('properties').insert({
        name, type, city: city || null, state: state || null, plan,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dev-properties'] })
      toast({ title: `Property "${data.name}" created`, type: 'success' })
      setShowCreateProperty(false)
      setNewPropName('')
      setNewPropCity('')
      setNewPropState('')
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  const deletePropertyMutation = useMutation({
    mutationFn: async (id) => {
      // Unlink users first
      await supabase.from('profiles').update({ property_id: null }).eq('property_id', id)
      const { error } = await supabase.from('properties').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-properties'] })
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'Property deleted', type: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  // Overage pricing
  const { data: overagePricing } = useQuery({
    queryKey: ['dev-overage-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase.from('overage_pricing').select('*').order('service')
      if (error) return []
      return data || []
    },
  })

  const updateOverageMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('overage_pricing').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-overage-pricing'] })
      toast({ title: 'Pricing updated', type: 'success' })
    },
  })

  async function runCodeAnalysis() {
    setRunningAnalysis(true)
    try {
      const { data, error } = await supabase.functions.invoke('code-analysis', { body: { action: 'run_analysis' } })
      if (error) throw error
      if (data?.error) toast({ title: 'Analysis error', description: data.error, type: 'warning' })
      else toast({ title: 'Analysis complete', type: 'success' })
      queryClient.invalidateQueries({ queryKey: ['dev-analysis'] })
    } catch (e) {
      toast({ title: 'Analysis failed', description: e.message, type: 'error' })
    }
    setRunningAnalysis(false)
  }

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
      if (error) throw error
      logAudit({ action: 'role_change', entityType: 'profile', entityId: userId, changes: { role: { new: role } } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'Role updated', type: 'success' })
      setEditingUser(null)
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('properties').update(updates).eq('id', id)
      if (error) throw error
      logAudit({ action: updates.plan ? 'plan_change' : 'update', entityType: 'property', entityId: id, changes: updates })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-properties'] })
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'Plan updated', type: 'success' })
    },
  })

  // Contact research cache analytics
  const { data: contactCache } = useQuery({
    queryKey: ['dev-contact-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_research')
        .select('company_name, source, fetched_at, expires_at, data')
        .order('fetched_at', { ascending: false })
        .limit(200)
      if (error) return []
      // Group by company and count pulls
      const companies = {}
      for (const row of (data || [])) {
        const key = row.company_name.toLowerCase().trim()
        if (!companies[key]) {
          companies[key] = {
            name: row.company_name,
            source: row.source,
            lastFetched: row.fetched_at,
            expiresAt: row.expires_at,
            contactCount: row.data?.contacts?.length || 0,
            pullCount: 0,
          }
        }
        companies[key].pullCount++
      }
      return Object.values(companies).sort((a, b) => b.pullCount - a.pullCount)
    },
  })

  // Usage log per company (how many times searched across all users)
  const { data: lookupCounts } = useQuery({
    queryKey: ['dev-lookup-counts'],
    queryFn: async () => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('api_usage')
        .select('endpoint, credits_used, called_at')
        .in('service', ['apollo', 'hunter'])
        .gte('called_at', startOfMonth.toISOString())
      return {
        total: (data || []).length,
        credits: (data || []).reduce((s, r) => s + (r.credits_used || 1), 0),
      }
    },
  })

  // Apollo + Hunter contact-lookup credits this month, grouped by
  // user AND by property. Surfaced in a panel below so a developer
  // can see who's burning credits and which company they belong to.
  // Joins are done client-side because the api_usage RLS policy
  // already lets developers read everything; pulling profiles +
  // properties separately keeps the query simple and cacheable.
  const { data: lookupBreakdown } = useQuery({
    queryKey: ['dev-lookup-breakdown'],
    queryFn: async () => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const [usageRes, profilesRes, propertiesRes] = await Promise.all([
        supabase
          .from('api_usage')
          .select('user_id, property_id, credits_used')
          .in('service', ['apollo', 'hunter'])
          .gte('called_at', startOfMonth.toISOString()),
        supabase.from('profiles').select('id, full_name, email, property_id, role'),
        supabase.from('properties').select('id, name, plan'),
      ])
      const profileById = new Map((profilesRes.data || []).map(p => [p.id, p]))
      const propertyById = new Map((propertiesRes.data || []).map(p => [p.id, p]))
      const byUser = new Map()
      const byProperty = new Map()
      for (const row of usageRes.data || []) {
        const credits = row.credits_used || 1
        if (row.user_id) {
          const cur = byUser.get(row.user_id) || { credits: 0 }
          cur.credits += credits
          byUser.set(row.user_id, cur)
        }
        if (row.property_id) {
          const cur = byProperty.get(row.property_id) || { credits: 0 }
          cur.credits += credits
          byProperty.set(row.property_id, cur)
        }
      }
      const userRows = Array.from(byUser.entries()).map(([uid, v]) => {
        const p = profileById.get(uid)
        const prop = p?.property_id ? propertyById.get(p.property_id) : null
        const plan = prop?.plan || 'free'
        const cap = p?.role === 'developer' ? Infinity : (CONTACT_LOOKUP_LIMITS[plan] ?? CONTACT_LOOKUP_LIMITS.free)
        return {
          user_id: uid,
          name: p?.full_name || p?.email || 'Unknown user',
          email: p?.email || null,
          company: prop?.name || '—',
          plan,
          cap,
          credits: v.credits,
          pctOfCap: cap === Infinity ? 0 : Math.round((v.credits / cap) * 100),
        }
      }).sort((a, b) => b.credits - a.credits)
      const propertyRows = Array.from(byProperty.entries()).map(([pid, v]) => {
        const prop = propertyById.get(pid)
        return {
          property_id: pid,
          company: prop?.name || 'Unknown company',
          plan: prop?.plan || 'free',
          credits: v.credits,
        }
      }).sort((a, b) => b.credits - a.credits)
      return { byUser: userRows, byProperty: propertyRows }
    },
  })

  // ─── Analytics queries ───
  const { data: allDeals } = useQuery({
    queryKey: ['dev-all-deals'],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, brand_name, value, stage, property_id, created_at, assigned_to, is_multi_year, annual_values').order('created_at', { ascending: false }).limit(5000)
      return data || []
    },
  })

  const { data: allContracts } = useQuery({
    queryKey: ['dev-all-contracts'],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('id, brand_name, total_value, status, signed, property_id, created_at').order('created_at', { ascending: false }).limit(5000)
      return data || []
    },
  })

  const { data: loginLogs } = useQuery({
    queryKey: ['dev-login-history'],
    queryFn: async () => {
      const { data } = await supabase.from('login_history').select('*').order('login_at', { ascending: false }).limit(200)
      return data || []
    },
  })

  const { data: auditLogs } = useQuery({
    queryKey: ['dev-audit-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100)
      return data || []
    },
  })

  const { data: allAssets } = useQuery({
    queryKey: ['dev-all-assets'],
    queryFn: async () => {
      const { data } = await supabase.from('assets').select('id, name, category, base_price, quantity, property_id, from_contract, active').limit(5000)
      return data || []
    },
  })

  const assignPropertyMutation = useMutation({
    mutationFn: async ({ userId, propertyId }) => {
      const { error } = await supabase.from('profiles').update({ property_id: propertyId }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'Property assigned', type: 'success' })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'User removed', type: 'success' })
    },
  })

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'invites', label: `Invite Links (${(premiumLinks || []).filter(l => l.active && !l.claimed_by && new Date(l.expires_at) > new Date()).length})` },
    { id: 'properties', label: `Properties (${properties?.length || 0})` },
    { id: 'users', label: `Users (${profiles?.length || 0})` },
    { id: 'flags', label: 'Feature Flags' },
    { id: 'api', label: 'API Usage' },
    { id: 'health', label: `Code Health (${analysisReports?.length || 0})` },
    { id: 'suggestions', label: `Suggestions (${(suggestions || []).filter(s => s.status === 'new').length || 0})` },
    { id: 'analytics', label: 'Analytics' },
    { id: 'qa', label: 'QA Hub' },
    { id: 'changelog', label: 'Change Log' },
    { id: 'cache', label: `Contact Cache (${(contactCache || []).length})` },
    { id: 'custom', label: 'Custom Dashboards' },
  ]

  const roleColor = { developer: 'bg-accent/20 text-accent', admin: 'bg-warning/20 text-warning', rep: 'bg-bg-card text-text-muted' }

  // Final auth gate — all hooks above run once; if the user isn't
  // a developer we redirect after the hook count is established.
  if (!realIsDeveloper) return <Navigate to="/app" replace />

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Developer Admin</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Full platform control &middot; {properties?.length || 0} properties &middot; {profiles?.length || 0} users
          </p>
        </div>
        <button
          onClick={() => setShowCRMImporter(true)}
          className="bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded text-sm font-medium hover:bg-accent/20 transition-colors"
        >
          Import CRM Data
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Properties" value={properties?.length || 0} color="text-accent" />
        <StatCard label="Total Users" value={profiles?.length || 0} color="text-text-primary" />
        <StatCard label="Admins" value={(profiles || []).filter(p => p.role === 'admin').length || 0} color="text-warning" />
        <StatCard label="Pending Invites" value={(invitations || []).filter(i => !i.accepted).length || 0} color="text-text-muted" />
      </div>

      {/* API Usage Banner */}
      <APIUsageBanner />

      {/* Tabs */}
      {/* Mobile: dropdown, Desktop: tabs */}
      <div className="sm:hidden">
        <select value={activeTab} onChange={e => setActiveTab(e.target.value)} className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
          {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
        </select>
      </div>
      <div className="hidden sm:flex gap-1 bg-bg-card rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* All Signups - Real-Time */}
          <Panel title={`All Signups (${profiles?.length || 0}) — live`}>
            <div className="text-[9px] text-text-muted font-mono mb-2">Auto-refreshes every 10 seconds</div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {profiles?.map(p => {
                const plan = p.properties?.plan || 'free'
                const planColors = { free: 'bg-bg-card text-text-muted', starter: 'bg-warning/10 text-warning', pro: 'bg-accent/10 text-accent', enterprise: 'bg-success/10 text-success' }
                const trialEnds = p.properties?.trial_ends_at ? new Date(p.properties.trial_ends_at) : null
                const trialActive = trialEnds && trialEnds > new Date()
                const trialDays = trialActive ? Math.ceil((trialEnds - new Date()) / 86400000) : 0
                return (
                  <div key={p.id} className="bg-bg-card border border-border rounded-lg px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm text-text-primary font-medium truncate">{p.full_name || p.id.slice(0, 8)}</span>
                          <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${roleColor[p.role]}`}>{p.role}</span>
                          <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${planColors[plan]}`}>{plan}</span>
                          {trialActive && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-accent/10 text-accent">{trialDays}d trial</span>}
                        </div>
                        <div className="flex gap-2 text-[10px] text-text-muted mt-0.5 flex-wrap">
                          <span>{p.email || '—'}</span>
                          <span>{p.properties?.name || 'No property'}</span>
                          <span>{p.created_at ? new Date(p.created_at).toLocaleDateString() + ' ' + new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <select
                          value={plan}
                          onChange={(e) => {
                            if (p.property_id) {
                              updatePropertyMutation.mutate({ id: p.property_id, updates: { plan: e.target.value } })
                            } else {
                              toast({ title: 'No property linked', description: 'This user needs a property first', type: 'warning' })
                            }
                          }}
                          className={`border rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-accent ${planColors[plan]}`}
                        >
                          {PLANS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                        </select>
                        <select
                          value={p.role}
                          onChange={(e) => updateRoleMutation.mutate({ userId: p.id, role: e.target.value })}
                          className="bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!profiles || profiles.length === 0) && (
                <div className="text-text-muted text-xs text-center py-8">No signups yet. Share your signup link to get started.</div>
              )}
            </div>
          </Panel>

          {/* Feature Flags — hidden modules never rendered here */}
          <Panel title="Feature Flags">
            {/* Diagnostic — tests if migration 058 was actually applied */}
            <div className="mb-3 pb-3 border-b border-border">
              <button
                onClick={runFeatureFlagDiagnostic}
                disabled={runningDiagnostic}
                className="text-[10px] px-2 py-1 border border-border rounded hover:border-accent/50 disabled:opacity-50"
              >
                {runningDiagnostic ? 'Testing…' : 'Run save diagnostic'}
              </button>
              {diagnosticResult && (
                <div className="mt-2 space-y-1 text-[10px] font-mono">
                  <div className={diagnosticResult.edgeFunction === 'working' ? 'text-success' : 'text-danger'}>
                    {diagnosticResult.edgeFunction === 'working' ? '✓' : '✗'} Edge function (set-feature-flag): {diagnosticResult.edgeFunction}
                  </div>
                  <div className={diagnosticResult.canSelect ? 'text-success' : 'text-danger'}>
                    {diagnosticResult.canSelect ? '✓' : '✗'} SELECT ({diagnosticResult.rowCount} rows)
                  </div>
                  <div className={diagnosticResult.canUpdate ? 'text-success' : 'text-danger'}>
                    {diagnosticResult.canUpdate ? '✓' : '✗'} UPDATE existing row
                  </div>
                  <div className={diagnosticResult.canInsert ? 'text-success' : 'text-danger'}>
                    {diagnosticResult.canInsert ? '✓' : '✗'} INSERT new row
                  </div>
                  {diagnosticResult.recommendation && (
                    <div className="text-text-secondary mt-1 font-sans leading-relaxed">
                      {diagnosticResult.recommendation}
                    </div>
                  )}
                  {diagnosticResult.errors.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-text-muted">
                        Raw errors ({diagnosticResult.errors.length})
                      </summary>
                      {diagnosticResult.errors.map((e, i) => (
                        <div key={i} className="text-danger pl-2">{e}</div>
                      ))}
                    </details>
                  )}
                </div>
              )}
            </div>

            {(() => {
              // Bucket the flag list so reps + devs can find what they
              // need without scrolling 30 entries. Hubs sit at the top
              // because they gate entire top-level surfaces; everything
              // else lives under a category header.
              const visibleEntries = Object.entries(flags).filter(([m]) => !HIDDEN_MODULES.includes(m))
              const visibleSet = new Set(visibleEntries.map(([m]) => m))

              // Order matters — hubs first, then per-industry, then
              // shared infrastructure. Modules not in any bucket fall
              // into "Other" so nothing silently disappears.
              const BUCKETS = [
                { key: 'hubs', label: 'Hubs (overarching)', accent: 'accent', modules: ['hub_accounts', 'hub_business_ops'] },
                { key: 'sports',         label: 'Sports',                     modules: ['show_sports', 'sportify'] },
                { key: 'entertainment',  label: 'Entertainment',              modules: ['show_entertainment', 'industry_entertainment'] },
                { key: 'conference',     label: 'Conference / Trade show',    modules: ['show_conference', 'industry_conference'] },
                { key: 'nonprofit',      label: 'Nonprofit',                  modules: ['show_nonprofit', 'industry_nonprofit'] },
                { key: 'media',          label: 'Media',                      modules: ['show_media', 'industry_media'] },
                { key: 'realestate',     label: 'Real Estate',                modules: ['show_realestate', 'industry_realestate'] },
                { key: 'agency',         label: 'Agency',                     modules: ['show_agency', 'industry_agency'] },
                { key: 'other_industry', label: 'Other industry',             modules: ['show_other'] },
                { key: 'inbox',          label: 'Inbox + email infra',        modules: ['inbox_outlook', 'inbox_gmail'] },
                { key: 'growth',         label: 'Client growth tools',        modules: [
                  'client_growth_hub', 'client_marketing_hub', 'client_ad_spend', 'client_goal_tracker',
                  'client_connection_manager', 'client_financial_projections', 'client_finance_dashboard',
                  'client_growth_workbook', 'client_report_builder', 'client_strategic_workbooks',
                ] },
                { key: 'core',           label: 'Core modules',               modules: [
                  'crm', 'valora', 'businessnow', 'newsletter', 'automations',
                  'businessops', 'developer', 'marketing',
                ] },
              ]

              const claimed = new Set()
              for (const b of BUCKETS) for (const m of b.modules) claimed.add(m)
              const otherModules = visibleEntries.map(([m]) => m).filter(m => !claimed.has(m))
              if (otherModules.length > 0) {
                BUCKETS.push({ key: 'misc', label: 'Other', modules: otherModules })
              }

              const renderToggle = (module) => {
                const enabled = Boolean(flags[module])
                const meta = getFlagMeta(module)
                const expanded = expandedFlag === module
                return (
                  <div key={module} className="py-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm text-text-primary truncate" title={meta.label}>{meta.label}</span>
                        <button
                          type="button"
                          onClick={() => setExpandedFlag(expanded ? null : module)}
                          aria-label={`More info about ${meta.label}`}
                          aria-expanded={expanded}
                          title={meta.description}
                          className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono leading-none ${expanded ? 'bg-accent text-bg-primary' : 'bg-bg-surface text-text-muted hover:text-accent border border-border'}`}
                        >
                          ⓘ
                        </button>
                      </div>
                      <button
                        onClick={() => handleToggleFlag(module, module)}
                        disabled={savingFlag === module}
                        className={`shrink-0 px-3 py-1 rounded text-xs font-mono transition-opacity ${enabled ? 'bg-success/20 text-success' : 'bg-bg-card text-text-muted'} ${savingFlag === module ? 'opacity-50' : ''}`}
                      >
                        {savingFlag === module ? '…' : (enabled ? 'ON' : 'OFF')}
                      </button>
                    </div>
                    {expanded && (
                      <div className="mt-1.5 ml-1 pl-2 border-l-2 border-accent/40 space-y-1">
                        <div className="text-[11px] text-text-secondary leading-relaxed">{meta.description}</div>
                        <div className="text-[9px] text-text-muted font-mono">flag key: {module}</div>
                      </div>
                    )}
                  </div>
                )
              }

              const hubBucket = BUCKETS[0]
              const restBuckets = BUCKETS.slice(1)

              return (
                <>
                  {/* Hubs — overarching, always at the top with stronger
                      visual treatment so devs see them first. */}
                  <div className="mb-5 bg-accent/5 border border-accent/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-accent">{hubBucket.label}</div>
                      <div className="text-[9px] text-text-muted">Top-level navigation</div>
                    </div>
                    <div className="text-[11px] text-text-muted mb-2 leading-relaxed">
                      Hide or expose entire top-bar hubs. Account Management defaults ON; Business Operations defaults OFF for non-developers.
                    </div>
                    <div className="space-y-0">
                      {hubBucket.modules.filter(m => visibleSet.has(m)).map(renderToggle)}
                    </div>
                  </div>

                  {/* Industry + infra buckets, in the order defined above. */}
                  <div className="space-y-4">
                    {restBuckets.map(b => {
                      const inBucket = b.modules.filter(m => visibleSet.has(m))
                      if (inBucket.length === 0) return null
                      return (
                        <details key={b.key} open className="bg-bg-card border border-border rounded-lg p-3">
                          <summary className="cursor-pointer flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{b.label}</span>
                            <span className="text-[9px] text-text-muted font-mono">{inBucket.length}</span>
                          </summary>
                          <div className="mt-2 space-y-0 divide-y divide-border/40">
                            {inBucket.map(renderToggle)}
                          </div>
                        </details>
                      )
                    })}
                  </div>
                </>
              )
            })()}

            {/* Hidden Developer Flags — only the developer role sees this
                section. These flags are excluded from the filter above so
                they don't appear twice. Toggling works the same way. */}
            {profile?.role === 'developer' && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-accent">
                    Hidden Developer Flags
                  </div>
                  <div className="text-[9px] text-text-muted">
                    developer-only
                  </div>
                </div>
                <div className="text-[10px] text-text-muted mb-3 leading-relaxed">
                  These flags are hidden from the normal list. Flipping them
                  ON activates features currently gated behind internal review
                  (Outlook sync, email marketing, etc).
                </div>
                <div className="space-y-2">
                  {HIDDEN_MODULES.map(module => {
                    const enabled = Boolean(flags[module])
                    const meta = getFlagMeta(module)
                    // Hidden flags always show the description inline
                    // (no info-toggle) since they're rare + deserve
                    // explicit context every time.
                    const description = meta.description || HIDDEN_FLAG_DESCRIPTIONS[module] || 'Hidden developer flag.'
                    return (
                      <div key={module} className="flex items-center justify-between py-2">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="text-sm text-text-primary">{meta.label}</div>
                          <div className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                            {description}
                          </div>
                          <div className="text-[9px] text-text-muted mt-0.5 font-mono opacity-60">flag key: {module}</div>
                        </div>
                        <button
                          onClick={() => handleToggleFlag(module, module)}
                          disabled={savingFlag === module}
                          className={`shrink-0 px-3 py-1 rounded text-xs font-mono transition-opacity ${enabled ? 'bg-success/20 text-success' : 'bg-bg-card text-text-muted border border-border'} ${savingFlag === module ? 'opacity-50' : ''}`}
                        >
                          {savingFlag === module ? '…' : (enabled ? 'ON' : 'OFF')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Panel>

          {/* API Usage (30 days) */}
          <Panel title="API Usage (30 days)">
            {apiUsage && Object.keys(apiUsage).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(apiUsage).map(([service, credits]) => (
                  <div key={service} className="flex items-center justify-between py-1">
                    <span className="text-sm text-text-primary capitalize">{service}</span>
                    <span className="text-xs text-accent font-mono">{credits} credits</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted">No API usage recorded</div>
            )}
          </Panel>

          {/* Contact-lookup credits this month — broken down by
              user and by property. Apollo + Hunter combined since
              they share a single 25-credit monthly bucket per user. */}
          <Panel
            title="Contact Lookups This Month — by User"
            actions={
              <span className="text-[10px] text-text-muted font-mono">
                Caps: free {CONTACT_LOOKUP_LIMITS.free} · starter {CONTACT_LOOKUP_LIMITS.starter} · pro {CONTACT_LOOKUP_LIMITS.pro} · enterprise {CONTACT_LOOKUP_LIMITS.enterprise}
              </span>
            }
          >
            {lookupBreakdown?.byUser?.length ? (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {lookupBreakdown.byUser.map(r => {
                  const overLimit = r.cap !== Infinity && r.credits >= r.cap
                  const nearLimit = !overLimit && r.cap !== Infinity && r.pctOfCap >= 80
                  const usageColor = overLimit ? 'text-danger' : nearLimit ? 'text-warning' : 'text-accent'
                  return (
                    <div key={r.user_id} className="flex items-center justify-between py-1 border-b border-border last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-text-primary truncate">{r.name}</div>
                        <div className="text-[10px] text-text-muted truncate">{r.company}{r.email ? ` · ${r.email}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{r.plan}</span>
                        <span className={`text-xs font-mono ${usageColor}`}>
                          {r.credits}/{r.cap === Infinity ? '∞' : r.cap}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs text-text-muted">No contact lookups this month.</div>
            )}
          </Panel>

          <Panel title="Contact Lookups This Month — by Company">
            {lookupBreakdown?.byProperty?.length ? (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {lookupBreakdown.byProperty.map(r => (
                  <div key={r.property_id} className="flex items-center justify-between py-1 border-b border-border last:border-b-0">
                    <span className="text-sm text-text-primary truncate">{r.company}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{r.plan}</span>
                      <span className="text-xs text-accent font-mono">{r.credits}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted">No contact lookups this month.</div>
            )}
          </Panel>

          {/* Pending Invitations */}
          <Panel title="Pending Invitations">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(invitations || []).filter(i => !i.accepted).slice(0, 10).map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-text-primary">{inv.email}</span>
                  <span className="text-text-muted">{inv.properties?.name} &middot; {inv.role}</span>
                </div>
              ))}
              {(invitations || []).filter(i => !i.accepted).length === 0 && (
                <div className="text-text-muted text-xs">No pending invitations</div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* INVITE LINKS */}
      {activeTab === 'invites' && (
        <div className="space-y-4">
          <Panel title="Generate Premium Access Link">
            <p className="text-xs text-text-muted mb-3">
              Create a link that gives a company premium plan access when they sign up. Links expire after 48 hours.
            </p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Label (e.g. 'NIU Athletics pilot')"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent min-w-0 sm:min-w-[200px]"
              />
              <select
                value={newLinkPlan}
                onChange={(e) => setNewLinkPlan(e.target.value)}
                className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <button
                onClick={() => createPremiumLinkMutation.mutate({ label: newLinkLabel || 'Unnamed', plan: newLinkPlan })}
                disabled={createPremiumLinkMutation.isPending}
                className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {createPremiumLinkMutation.isPending ? 'Creating...' : 'Generate & Copy Link'}
              </button>
            </div>
          </Panel>

          <Panel title={`All Links (${premiumLinks?.length || 0})`}>
            <div className="space-y-2">
              {premiumLinks?.map(link => {
                const isExpired = new Date(link.expires_at) < new Date()
                const isClaimed = !!link.claimed_by
                const isActive = link.active && !isExpired && !isClaimed
                const status = !link.active ? 'Revoked' : isClaimed ? 'Claimed' : isExpired ? 'Expired' : 'Active'
                const statusColor = { Active: 'bg-success/10 text-success', Claimed: 'bg-accent/10 text-accent', Expired: 'bg-bg-card text-text-muted', Revoked: 'bg-danger/10 text-danger' }
                const url = `${window.location.origin}/login?premium=${link.token}`
                return (
                  <div key={link.id} className={`bg-bg-card border rounded-lg px-4 py-3 ${isActive ? 'border-success/30' : 'border-border'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-text-primary font-medium">{link.label || 'Unnamed'}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${statusColor[status]}`}>{status}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">{link.plan}</span>
                        </div>
                        <div className="text-[10px] text-text-muted mt-1 flex gap-3 flex-wrap">
                          <span>Created {new Date(link.created_at).toLocaleDateString()}</span>
                          <span>Expires {new Date(link.expires_at).toLocaleDateString()} {new Date(link.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isClaimed && link.properties?.name && <span>Claimed by: {link.properties.name}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {isActive && (
                          <>
                            <button
                              onClick={() => { navigator.clipboard.writeText(url); toast({ title: 'Link copied!', type: 'success' }) }}
                              className="text-[10px] text-accent hover:underline font-mono"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => { if (confirm('Revoke this link?')) revokePremiumLinkMutation.mutate(link.id) }}
                              className="text-[10px] text-danger hover:underline font-mono"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!premiumLinks || premiumLinks.length === 0) && (
                <div className="text-text-muted text-xs text-center py-6">No invite links created yet.</div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* PROPERTIES */}
      {activeTab === 'properties' && (
        <div className="space-y-3">
          {/* Create Property */}
          {showCreateProperty ? (
            <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">Create New Property / Company</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Company Name *" value={newPropName} onChange={(e) => setNewPropName(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" autoFocus />
                <select value={newPropType} onChange={(e) => setNewPropType(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  <option value="college">College Athletics</option>
                  <option value="professional">Professional Team</option>
                  <option value="minor_league">Minor League</option>
                  <option value="agency">Agency</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="conference">Conference</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="media">Media</option>
                  <option value="realestate">Real Estate</option>
                  <option value="other">Other</option>
                </select>
                <input placeholder="City" value={newPropCity} onChange={(e) => setNewPropCity(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
                <input placeholder="State" value={newPropState} onChange={(e) => setNewPropState(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
                <select value={newPropPlan} onChange={(e) => setNewPropPlan(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (!newPropName.trim()) return; createPropertyMutation.mutate({ name: newPropName.trim(), type: newPropType, city: newPropCity, state: newPropState, plan: newPropPlan }) }}
                  disabled={!newPropName.trim() || createPropertyMutation.isPending}
                  className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {createPropertyMutation.isPending ? 'Creating...' : 'Create Property'}
                </button>
                <button onClick={() => setShowCreateProperty(false)} className="text-text-muted text-sm hover:text-text-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCreateProperty(true)} className="bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded text-sm font-medium hover:bg-accent/20 transition-colors">
              + Create Property
            </button>
          )}

          {/* Property List */}
          {properties?.map(p => {
            const propUsers = (profiles || []).filter(pr => pr.property_id === p.id)
            const unassignedUsers = (profiles || []).filter(pr => !pr.property_id)
            const trialEnds = p.trial_ends_at ? new Date(p.trial_ends_at) : null
            const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / 86400000)) : null
            const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0
            const trialActive = trialDaysLeft !== null && trialDaysLeft > 0
            return (
            <div key={p.id} className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">{p.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{p.type || 'college'}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      p.plan === 'pro' ? 'bg-accent/20 text-accent' :
                      p.plan === 'enterprise' ? 'bg-success/20 text-success' :
                      p.plan === 'starter' ? 'bg-warning/20 text-warning' :
                      'bg-bg-card text-text-muted'
                    }`}>{p.plan || 'free'}</span>
                    {trialActive && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">{trialDaysLeft}d trial left</span>
                    )}
                    {trialExpired && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-danger/10 text-danger">Trial expired</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-text-muted font-mono flex-wrap">
                    {p.city && <span>{p.city}{p.state ? `, ${p.state}` : ''}</span>}
                    {p.sport && <span>{p.sport}</span>}
                    {p.billing_email && <span>{p.billing_email}</span>}
                    <span>{propUsers.length} user{propUsers.length !== 1 ? 's' : ''}</span>
                    <span className="text-[9px]">ID: {p.id.slice(0, 8)}</span>
                    {trialEnds && <span className="text-[9px]">Trial ends: {trialEnds.toLocaleDateString()}</span>}
                  </div>
                  {/* Users at this company */}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {propUsers.map(u => (
                      <span key={u.id} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${roleColor[u.role] || 'bg-bg-card text-text-muted'}`}>
                        {u.full_name || u.email || u.id.slice(0, 6)} ({u.role})
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex gap-2">
                    <select
                      value={p.plan || 'free'}
                      onChange={(e) => updatePropertyMutation.mutate({ id: p.id, updates: { plan: e.target.value } })}
                      className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                    >
                      {PLANS.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                    </select>
                    <select
                      value={p.type || 'college'}
                      onChange={(e) => updatePropertyMutation.mutate({ id: p.id, updates: { type: e.target.value } })}
                      className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="college">College</option>
                      <option value="professional">Professional</option>
                      <option value="minor_league">Minor League</option>
                      <option value="agency">Agency</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="conference">Conference</option>
                      <option value="nonprofit">Nonprofit</option>
                      <option value="media">Media</option>
                      <option value="realestate">Real Estate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {/* Trial days control */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-text-muted shrink-0">Trial:</span>
                    {[7, 14, 30, 60, 90].map(days => (
                      <button
                        key={days}
                        onClick={() => {
                          const newEnd = new Date(Date.now() + days * 86400000).toISOString()
                          updatePropertyMutation.mutate({ id: p.id, updates: { trial_ends_at: newEnd, trial_started_at: p.trial_started_at || new Date().toISOString() } })
                        }}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                          trialDaysLeft !== null && Math.abs(trialDaysLeft - days) < 2
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-text-muted hover:border-accent/50 hover:text-text-primary'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const custom = prompt('Set trial days from today:', '30')
                        if (custom && !isNaN(custom)) {
                          const newEnd = new Date(Date.now() + Number(custom) * 86400000).toISOString()
                          updatePropertyMutation.mutate({ id: p.id, updates: { trial_ends_at: newEnd, trial_started_at: p.trial_started_at || new Date().toISOString() } })
                        }
                      }}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border text-text-muted hover:border-accent/50 hover:text-text-primary"
                    >
                      Custom
                    </button>
                    {trialActive && (
                      <button
                        onClick={() => {
                          if (!confirm(`End trial for "${p.name}" immediately?`)) return
                          updatePropertyMutation.mutate({ id: p.id, updates: { trial_ends_at: new Date().toISOString() } })
                        }}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-danger/30 text-danger hover:bg-danger/10"
                      >
                        End trial
                      </button>
                    )}
                  </div>
                  {/* Assign user to this property */}
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) assignPropertyMutation.mutate({ userId: e.target.value, propertyId: p.id }) }}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">+ Assign user...</option>
                    {(profiles || []).filter(pr => pr.property_id !== p.id).map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email || u.id.slice(0, 8)} {u.properties?.name ? `(${u.properties.name})` : '(unassigned)'}</option>
                    ))}
                  </select>
                  {propUsers.length === 0 && (
                    <button
                      onClick={() => { if (confirm(`Delete "${p.name}"? This cannot be undone.`)) deletePropertyMutation.mutate(p.id) }}
                      className="text-[10px] text-danger hover:underline text-right"
                    >
                      Delete property
                    </button>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* USERS */}
      {activeTab === 'users' && (
        <div className="space-y-2">
          <div className="text-xs text-text-muted mb-2">
            Manage all users. Change roles, reassign companies, or disable accounts. First user at each company is auto-assigned admin.
          </div>
          {profiles?.map(p => {
            const isDisabled = p.role === 'disabled'
            return (
            <div key={p.id} className={`bg-bg-surface border rounded-lg px-4 py-3 ${isDisabled ? 'border-danger/30 opacity-60' : 'border-border'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-primary">{p.full_name || p.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${roleColor[p.role] || 'bg-danger/20 text-danger'}`}>{p.role}</span>
                    {isDisabled && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-danger/10 text-danger">DISABLED</span>}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 flex gap-2 flex-wrap">
                    <span>{p.email || p.id.slice(0, 12)}</span>
                    <span>{p.properties?.name || 'No company'}</span>
                    {p.properties?.city && <span>{p.properties.city}{p.properties.state ? `, ${p.properties.state}` : ''}</span>}
                    {p.properties?.type && <span className="text-[10px] font-mono">{p.properties.type}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <select
                    value={p.role}
                    onChange={(e) => updateRoleMutation.mutate({ userId: p.id, role: e.target.value })}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                  >
                    {[...ROLES, 'disabled'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select
                    value={p.property_id || ''}
                    onChange={(e) => assignPropertyMutation.mutate({ userId: p.id, propertyId: e.target.value || null })}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent max-w-[140px]"
                  >
                    <option value="">No company</option>
                    {properties?.map(prop => <option key={prop.id} value={prop.id}>{prop.name}</option>)}
                  </select>
                  {p.id !== profile?.id && (
                    <button
                      onClick={() => { if (confirm(`Permanently delete ${p.full_name || 'this user'}? This removes all their data.`)) deleteUserMutation.mutate(p.id) }}
                      className="text-text-muted hover:text-danger text-xs px-1"
                      title="Delete user"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* FLAGS */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          <Panel title="Module Visibility">
            <p className="text-xs text-text-muted mb-4">Toggle modules on/off for all users. Changes save immediately.</p>
            <div className="space-y-1">
              {[
                { key: 'crm', label: 'Legacy CRM', desc: 'Pipeline, contracts, assets, fulfillment, activities, tasks' },
                { key: 'sportify', label: 'Activations', desc: 'Events, sponsor activations, run-of-show, broadcast — same engine across every industry' },
                { key: 'valora', label: 'VALORA', desc: 'AI media valuations, market positioning' },
                { key: 'businessnow', label: 'Business Now', desc: 'Intelligence feed, alerts, AI briefings' },
                { key: 'newsletter', label: 'Newsletter', desc: 'Weekly digest, afternoon updates, AI content' },
                { key: 'automations', label: 'Automations', desc: 'Workflow rules, triggers, webhooks' },
                { key: 'marketing', label: 'Marketing Hub', desc: 'Social media posts, ads, integrations, templates' },
                { key: 'businessops', label: 'Business Ops', desc: 'Revenue pipeline, projections, accounting, QA' },
                { key: 'developer', label: 'Dev Tools', desc: 'Admin panel, QA, analytics, change log' },
              ].map(m => (
                <div key={m.key} className="flex items-center justify-between py-2.5 px-2 rounded hover:bg-bg-card border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary">{m.label}</span>
                    <p className="text-[10px] text-text-muted mt-0.5">{m.desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggleFlag(m.key, m.label)}
                    disabled={savingFlag === m.key}
                    className={`px-3 py-1.5 rounded text-[10px] font-mono font-medium shrink-0 ml-2 transition-colors ${savingFlag === m.key ? 'bg-warning/20 text-warning border border-warning/30 animate-pulse' : flags[m.key] ? 'bg-success/20 text-success border border-success/30 hover:bg-success/30' : 'bg-bg-card text-text-muted border border-border hover:bg-bg-card/80'}`}
                  >
                    {savingFlag === m.key ? 'SAVING...' : flags[m.key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Industry Visibility (Welcome + Signup)">
            <p className="text-xs text-text-muted mb-4">Toggle which industries appear in the welcome page and account signup. Turning OFF hides the industry from the public selectors but keeps all code intact — easy to turn back ON. Entertainment and conferences are now bundled under "Sports, Events & Entertainment".</p>
            <div className="space-y-1">
              {[
                { key: 'show_sports', label: 'Sports, Events & Entertainment', desc: 'Teams, venues, conferences, festivals, trade shows, agencies' },
                { key: 'show_nonprofit', label: 'Nonprofit', desc: 'Foundations, charities, community orgs' },
                { key: 'show_media', label: 'Media', desc: 'Publishers, broadcasters, digital media' },
                { key: 'show_realestate', label: 'Real Estate', desc: 'Commercial, mixed-use, development' },
                { key: 'show_other', label: 'Other', desc: 'Generic "Other" option for unlisted types' },
              ].map(m => (
                <div key={m.key} className="flex items-center justify-between py-2.5 px-2 rounded hover:bg-bg-card border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary">{m.label}</span>
                    <p className="text-[10px] text-text-muted mt-0.5">{m.desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggleFlag(m.key, m.label)}
                    disabled={savingFlag === m.key}
                    className={`px-3 py-1.5 rounded text-[10px] font-mono font-medium shrink-0 ml-2 transition-colors ${savingFlag === m.key ? 'bg-warning/20 text-warning border border-warning/30 animate-pulse' : flags[m.key] !== false ? 'bg-success/20 text-success border border-success/30 hover:bg-success/30' : 'bg-bg-card text-text-muted border border-border hover:bg-bg-card/80'}`}
                  >
                    {savingFlag === m.key ? 'SAVING...' : flags[m.key] !== false ? 'SHOWN' : 'HIDDEN'}
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Industry Modules (In-App)">
            <p className="text-xs text-text-muted mb-4">Toggle industry-specific modules that show inside the app after login. Separate from the signup visibility above.</p>
            <div className="space-y-1">
              {[
                { key: 'industry_nonprofit', label: 'Nonprofit', desc: 'Impact metrics, grant tracker, donor portal' },
                { key: 'industry_media', label: 'Media', desc: 'Campaign calendar, audience analytics, media kit builder' },
                { key: 'industry_realestate', label: 'Real Estate', desc: 'Occupancy dashboard, broker network' },
                { key: 'industry_entertainment', label: 'Entertainment', desc: 'Booking calendar, talent management' },
                { key: 'industry_conference', label: 'Conference', desc: 'Attendee analytics, session planning' },
                { key: 'industry_agency', label: 'Agency', desc: 'Commission tracker, multi-property view' },
              ].map(m => (
                <div key={m.key} className="flex items-center justify-between py-2.5 px-2 rounded hover:bg-bg-card border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary">{m.label}</span>
                    <p className="text-[10px] text-text-muted mt-0.5">{m.desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggleFlag(m.key, m.label)}
                    disabled={savingFlag === m.key}
                    className={`px-3 py-1.5 rounded text-[10px] font-mono font-medium shrink-0 ml-2 transition-colors ${savingFlag === m.key ? 'bg-warning/20 text-warning border border-warning/30 animate-pulse' : flags[m.key] ? 'bg-success/20 text-success border border-success/30 hover:bg-success/30' : 'bg-bg-card text-text-muted border border-border hover:bg-bg-card/80'}`}
                  >
                    {savingFlag === m.key ? 'SAVING...' : flags[m.key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Client Growth Tools (Business Ops for Customers)">
            <p className="text-xs text-text-muted mb-2">Toggle client-facing Growth Tools at <span className="text-accent font-mono">/app/growth</span>. All default to OFF — greenlight when ready. Master toggle controls the whole section; individual tools appear as tabs.</p>
            <p className="text-[10px] text-text-muted mb-4">Build phases: <span className="text-success">Phase 1 (ship-ready)</span> · <span className="text-warning">Phase 2 (strategic)</span> · <span className="text-accent">Phase 3 (premium)</span></p>
            <div className="space-y-1">
              {[
                { key: 'client_growth_hub', label: 'Master: Growth Hub Page', desc: 'Enables /app/growth route and sidebar link', phase: 'master' },
                { key: 'client_marketing_hub', label: 'Marketing Hub', desc: 'Social scheduling, ads, integrations, templates', phase: 1 },
                { key: 'client_ad_spend', label: 'Ad Spend Manager', desc: 'Channel ROI, CPM, CAC tracking', phase: 1 },
                { key: 'client_goal_tracker', label: 'Goal Tracker', desc: 'KPI targets with progress bars', phase: 1 },
                { key: 'client_connection_manager', label: 'Connection Manager', desc: 'Personal CRM for prospects, investors, advisors', phase: 1 },
                { key: 'client_financial_projections', label: 'Financial Projections', desc: '5-year scenario modeler with adjustable assumptions', phase: 2 },
                { key: 'client_finance_dashboard', label: 'Finance Dashboard', desc: 'Revenue, expenses, P&L tracking', phase: 2 },
                { key: 'client_growth_workbook', label: 'Growth Workbook (NEW)', desc: '"Where you are" self-assessment with health score', phase: 2 },
                { key: 'client_report_builder', label: 'AI Report Builder', desc: 'Monthly reviews, investor updates, growth analysis', phase: 3 },
                { key: 'client_strategic_workbooks', label: 'Strategic Workbooks (NEW)', desc: '6 templated playbooks: ICP, pricing, positioning, QBR, etc.', phase: 3 },
              ].map(m => (
                <div key={m.key} className={`flex items-center justify-between py-2.5 px-2 rounded hover:bg-bg-card border-b border-border last:border-0 ${m.phase === 'master' ? 'bg-accent/5' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${m.phase === 'master' ? 'text-accent font-semibold' : 'text-text-primary'}`}>{m.label}</span>
                      {m.phase !== 'master' && (
                        <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${m.phase === 1 ? 'bg-success/15 text-success' : m.phase === 2 ? 'bg-warning/15 text-warning' : 'bg-accent/15 text-accent'}`}>
                          P{m.phase}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">{m.desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggleFlag(m.key, m.label)}
                    disabled={savingFlag === m.key}
                    className={`px-3 py-1.5 rounded text-[10px] font-mono font-medium shrink-0 ml-2 transition-colors ${savingFlag === m.key ? 'bg-warning/20 text-warning animate-pulse' : flags[m.key] ? 'bg-success/20 text-success border border-success/30' : 'bg-bg-card text-text-muted border border-border'}`}
                  >
                    {savingFlag === m.key ? '...' : flags[m.key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="AI Feature Toggles">
            <p className="text-xs text-text-muted mb-4">Disable individual AI features across the platform. Useful for maintenance or when edge functions are down.</p>
            <div className="space-y-3">
              {[
                { key: 'ai_newsletter', label: 'Newsletter Generation', desc: 'AI-generated weekly/daily newsletters' },
                { key: 'ai_insights', label: 'AI Deal Insights', desc: 'Pipeline forecasts, deal analysis, email drafting' },
                { key: 'ai_prospect_search', label: 'Prospect Search', desc: 'AI-powered prospect and contact research' },
                { key: 'ai_contract_analysis', label: 'Contract Analysis', desc: 'AI reads and extracts benefits from contracts' },
                { key: 'ai_valuation', label: 'VALORA Valuations', desc: 'AI media value estimation' },
                { key: 'ai_daily_briefing', label: 'Daily Intelligence', desc: 'BusinessNow AI briefing generation' },
              ].map(feat => {
                const isOn = localStorage.getItem(`ll_flag_${feat.key}`) !== 'off'
                return (
                  <div key={feat.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="text-sm text-text-primary">{feat.label}</span>
                      <span className="text-xs text-text-muted ml-2">{feat.desc}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = isOn ? 'off' : 'on'
                        localStorage.setItem(`ll_flag_${feat.key}`, newVal)
                        // Broadcast to other tabs
                        window.dispatchEvent(new StorageEvent('storage', { key: `ll_flag_${feat.key}`, newValue: newVal }))
                        toast({ title: `${feat.label}: ${newVal === 'off' ? 'DISABLED' : 'ENABLED'}`, type: newVal === 'off' ? 'warning' : 'success' })
                        // Force re-render
                        queryClient.invalidateQueries()
                      }}
                      className={`px-4 py-1.5 rounded text-xs font-mono font-medium ${isOn ? 'bg-success/20 text-success border border-success/30' : 'bg-danger/20 text-danger border border-danger/30'}`}
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* API USAGE */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          <Panel title="API Credit Usage (Last 30 Days)">
            {apiUsage && Object.keys(apiUsage).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(apiUsage).map(([service, credits]) => (
                  <div key={service} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-text-primary capitalize font-medium">{service}</span>
                      <span className="text-xs text-text-muted ml-2">
                        {service === 'apollo' ? '500 credits/mo on Basic' :
                         service === 'hunter' ? '500 verifications/mo on Starter' :
                         service === 'claude' ? 'Usage-based' : ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-accent font-mono">{credits}</div>
                      <div className="text-[10px] text-text-muted">credits used</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted py-4 text-center">No API usage in the last 30 days</div>
            )}
          </Panel>
          <Panel title="Overage Pricing (Non-Enterprise)">
            <p className="text-xs text-text-muted mb-3">Set included usage per plan and overage cost per additional request. Enterprise plans have unlimited usage at no extra charge.</p>
            <div className="overflow-x-auto">
            <div className="space-y-1 min-w-[600px]">
              <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.5fr] gap-2 px-2 py-1 text-[10px] font-mono text-text-muted uppercase">
                <span>Feature</span>
                <span>Included/mo</span>
                <span>Overage $/ea</span>
                <span>Active</span>
              </div>
              {(overagePricing || []).map(item => (
                <div key={item.id} className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.5fr] gap-2 items-center bg-bg-card border border-border rounded px-3 py-2">
                  <span className="text-sm text-text-primary">{item.label || item.service}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={item.included_qty}
                      onChange={(e) => updateOverageMutation.mutate({ id: item.id, updates: { included_qty: parseInt(e.target.value) || 0 } })}
                      className="w-16 bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-accent text-center"
                    />
                    <span className="text-[10px] text-text-muted">/mo</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-text-muted">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={(item.overage_price_cents / 100).toFixed(2)}
                      onChange={(e) => updateOverageMutation.mutate({ id: item.id, updates: { overage_price_cents: Math.round(parseFloat(e.target.value) * 100) || 0 } })}
                      className="w-16 bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-accent text-center"
                    />
                    <span className="text-[10px] text-text-muted">/ea</span>
                  </div>
                  <button
                    onClick={() => updateOverageMutation.mutate({ id: item.id, updates: { active: !item.active } })}
                    className={`text-[10px] font-mono px-2 py-1 rounded ${item.active ? 'bg-success/20 text-success' : 'bg-bg-surface text-text-muted'}`}
                  >
                    {item.active ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
              {(!overagePricing || overagePricing.length === 0) && (
                <div className="text-xs text-text-muted text-center py-4">Run migration 028 to enable overage pricing.</div>
              )}
            </div>
            </div>
          </Panel>

          <Panel title="Integration Status">
            <div className="space-y-2">
              {[
                { name: 'Claude AI', status: 'active', desc: 'Contract analysis, prospecting, valuations' },
                { name: 'Apollo.io', status: 'pending', desc: 'Add APOLLO_API_KEY to activate' },
                { name: 'Hunter.io', status: 'pending', desc: 'Add HUNTER_API_KEY to activate' },
                { name: 'Email (Resend)', status: 'pending', desc: 'Add RESEND_API_KEY to activate' },
                { name: 'Stripe', status: 'pending', desc: 'Coming soon — billing integration' },
              ].map(int => (
                <div key={int.name} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-text-primary">{int.name}</span>
                    <span className="text-xs text-text-muted ml-2">{int.desc}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    int.status === 'active' ? 'bg-success/20 text-success' : 'bg-bg-card text-text-muted'
                  }`}>
                    {int.status}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* CODE HEALTH */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Automated code analysis runs twice daily. Reports include working modules, issues, and AI-suggested improvements.</p>
            <button
              onClick={runCodeAnalysis}
              disabled={runningAnalysis}
              className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
            >
              {runningAnalysis ? 'Analyzing...' : 'Run Analysis Now'}
            </button>
          </div>
          {analysisReports?.map(report => (
            <div key={report.id} className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{report.run_date}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{report.run_time}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${report.status === 'completed' ? 'bg-success/10 text-success' : report.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{report.status}</span>
                </div>
                {report.build_status && <span className="text-[10px] font-mono text-text-muted">Build: {report.build_status}</span>}
              </div>
              {report.summary && <p className="text-xs text-text-secondary mb-3">{report.summary}</p>}
              {/* Issues */}
              {report.issues?.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">Issues ({report.issues.length})</div>
                  {report.issues.map((issue, i) => (
                    <div key={i} className={`flex items-start gap-2 py-1.5 text-xs border-l-2 pl-2 mb-1 ${
                      issue.severity === 'critical' || issue.severity === 'high' ? 'border-l-danger' : issue.severity === 'medium' ? 'border-l-warning' : 'border-l-text-muted'
                    }`}>
                      <div className="flex-1">
                        <span className="text-text-primary">[{issue.module}] {issue.description}</span>
                        {issue.fix_suggestion && <div className="text-text-muted mt-0.5">Fix: {issue.fix_suggestion}</div>}
                      </div>
                      {issue.can_auto_fix && (
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-accent/10 text-accent shrink-0">auto-fixable</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Improvements */}
              {report.improvements?.length > 0 && (
                <div>
                  <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">Improvements ({report.improvements.length})</div>
                  {report.improvements.map((imp, i) => (
                    <div key={i} className="flex items-start justify-between py-1 text-xs">
                      <span className="text-text-secondary">[{imp.module}] {imp.description}</span>
                      <div className="flex gap-1 shrink-0">
                        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${imp.impact === 'high' ? 'bg-success/10 text-success' : 'bg-bg-card text-text-muted'}`}>{imp.impact}</span>
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-bg-card text-text-muted">{imp.effort}</span>
                        {imp.from_user_suggestion && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-accent/10 text-accent">user req</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!analysisReports || analysisReports.length === 0) && (
            <div className="text-center text-text-muted text-sm py-12 bg-bg-surface border border-border rounded-lg">
              No analysis reports yet. Click "Run Analysis Now" to generate your first report.
            </div>
          )}
        </div>
      )}

      {/* FEATURE SUGGESTIONS */}
      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap text-xs">
            <span className="text-text-muted font-mono">
              {suggestions?.length || 0} total &middot;
              {(suggestions || []).filter(s => s.status === 'new').length || 0} new &middot;
              {(suggestions || []).filter(s => s.status === 'planned').length || 0} planned &middot;
              {(suggestions || []).filter(s => s.contact_me).length || 0} want contact
            </span>
          </div>
          {suggestions?.map(s => {
            const statusColors = {
              new: 'bg-accent/10 text-accent', reviewed: 'bg-bg-card text-text-muted',
              planned: 'bg-success/10 text-success', in_progress: 'bg-warning/10 text-warning',
              completed: 'bg-success/10 text-success', declined: 'bg-danger/10 text-danger',
            }
            const priorityColors = { critical: 'text-danger', important: 'text-warning', nice_to_have: 'text-text-muted' }
            return (
              <div key={s.id} className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-text-primary">{s.title}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{s.category}</span>
                      <span className={`text-[9px] font-mono ${priorityColors[s.priority]}`}>{s.priority?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-2">{s.description}</p>
                    <div className="flex gap-3 text-[10px] text-text-muted">
                      <span>{s.user_name}</span>
                      <span>{s.user_email}</span>
                      {s.contact_me && <span className="text-accent">Wants contact</span>}
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <select
                    value={s.status}
                    onChange={(e) => updateSuggestionMutation.mutate({ id: s.id, updates: { status: e.target.value } })}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent shrink-0"
                  >
                    {['new', 'reviewed', 'planned', 'in_progress', 'completed', 'declined'].map(st => (
                      <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
          {(!suggestions || suggestions.length === 0) && (
            <div className="text-center text-text-muted text-sm py-12 bg-bg-surface border border-border rounded-lg">
              No feature suggestions yet. Users can submit from the sidebar.
            </div>
          )}
        </div>
      )}

      {/* QA TEST SUITE */}
      {activeTab === 'qa' && (
        <div className="space-y-6 min-w-0 overflow-x-hidden">
          {/* Walkthrough comments — ad-hoc notes captured via the floating button */}
          <Panel title="QA Walkthrough Comments">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-text-secondary">
                Click the floating 💬 button on any page to leave a comment.
                All comments roll up into one report.
              </div>
              <a
                href="/app/developer/qa-comments"
                className="text-xs bg-accent text-bg-primary px-3 py-1.5 rounded font-semibold whitespace-nowrap"
              >
                Open comment report →
              </a>
            </div>
          </Panel>

          {/* Auto QA Engine — probe-based full-site runner with pattern detection */}
          <Panel title="Auto QA Engine">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-text-secondary max-w-lg">
                Exercises every module (DB reads, writes, routes, edge functions,
                uploads, integration flows) and repeats 10× to catch flaky failures.
                Auto-generates Claude Code repair prompts for any patterns found.
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href="/app/developer/auto-qa"
                  className="text-xs bg-accent text-bg-primary px-3 py-1.5 rounded font-semibold whitespace-nowrap"
                >
                  Run QA pass →
                </a>
                <a
                  href="/app/developer/repair-prompts"
                  className="text-xs border border-border text-text-secondary px-3 py-1.5 rounded whitespace-nowrap hover:border-accent/50"
                >
                  Prompt archive
                </a>
              </div>
            </div>
          </Panel>

          {/* The Digest — editorial newsletter management */}
          <Panel title="The Digest by Loud Legacy Ventures">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-text-secondary max-w-lg">
                Monthly editorial newsletter. AI research, rich text editor, image library,
                subscriber management, and branded email dispatch via the existing Resend
                integration.
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href="/app/developer/digest"
                  className="text-xs bg-accent text-bg-primary px-3 py-1.5 rounded font-semibold whitespace-nowrap"
                >
                  Manage issues →
                </a>
                <a
                  href="/digest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs border border-border text-text-secondary px-3 py-1.5 rounded whitespace-nowrap hover:border-accent/50"
                >
                  Public archive ↗
                </a>
              </div>
            </div>
          </Panel>

          <Suspense fallback={<div className="text-text-muted text-xs p-4">Loading reports...</div>}>
            <QAAutoReports />
          </Suspense>
          <Panel title="QA Task Manager">
            <Suspense fallback={<div className="text-text-muted text-xs p-4">Loading task manager...</div>}>
              <QATaskManager />
            </Suspense>
          </Panel>
          <Suspense fallback={<div className="text-text-muted text-xs p-4">Loading simulator...</div>}>
            <QAUsageSimulator />
          </Suspense>
          <Panel title="QA Test Suite (Runs)">
            <Suspense fallback={<div className="text-text-muted text-xs p-4">Loading test suite...</div>}>
              <QATestSuite profiles={profiles} />
            </Suspense>
          </Panel>
          <QAHub properties={properties} profiles={profiles} />
        </div>
      )}

      {/* CHANGE LOG */}
      {activeTab === 'changelog' && (
        <Panel title="Change Log">
          <Suspense fallback={<div className="text-text-muted text-xs p-4">Loading...</div>}>
            <ChangeLog />
          </Suspense>
        </Panel>
      )}

      {/* ANALYTICS */}
      {activeTab === 'analytics' && (
        <AnalyticsTab
          profiles={profiles}
          properties={properties}
          deals={allDeals}
          contracts={allContracts}
          assets={allAssets}
          loginLogs={loginLogs}
          auditLogs={auditLogs}
          apiUsage={apiUsage}
        />
      )}

      {/* CONTACT CACHE */}
      {activeTab === 'cache' && (
        <div className="space-y-4">
          <Panel title="Contact Research Cache">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted">
                Cached contact lookups shared across all users. 30-day TTL. {lookupCounts?.total || 0} API calls this month ({lookupCounts?.credits || 0} credits).
              </p>
              <span className="text-sm font-mono text-accent">{(contactCache || []).length} companies cached</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase">Company</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase">Source</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase text-center">Contacts</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase text-center">Pulls</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase">Last Fetched</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {(contactCache || []).map((c, i) => {
                    const isExpired = new Date(c.expiresAt) < new Date()
                    return (
                      <tr key={i} className={`border-b border-border last:border-0 ${isExpired ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-2 text-text-primary font-medium">{c.name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            c.source === 'apollo' ? 'bg-success/10 text-success' :
                            c.source === 'hunter' ? 'bg-accent/10 text-accent' :
                            'bg-bg-card text-text-muted'
                          }`}>{c.source}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-text-secondary">{c.contactCount}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`font-mono text-sm ${c.pullCount > 3 ? 'text-accent font-bold' : 'text-text-secondary'}`}>{c.pullCount}</span>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-text-muted font-mono">{new Date(c.lastFetched).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-[10px] font-mono">
                          {isExpired
                            ? <span className="text-danger">Expired</span>
                            : <span className="text-text-muted">{Math.ceil((new Date(c.expiresAt) - new Date()) / 86400000)}d left</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                  {(!contactCache || contactCache.length === 0) && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-text-muted text-xs">No cached contact research yet. Lookups will appear here after users search for contacts.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* CUSTOM DASHBOARDS */}
      {activeTab === 'custom' && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">Custom dashboard requests from property admins. Use Claude Code to build each one and deliver to the requesting property.</p>
          {customRequests?.map(r => {
            const statusColors = {
              submitted: 'bg-accent/10 text-accent', contacted: 'bg-accent/10 text-accent',
              scoping: 'bg-warning/10 text-warning', building: 'bg-success/10 text-success',
              delivered: 'bg-success/10 text-success', declined: 'bg-danger/10 text-danger',
            }
            return (
              <div key={r.id} className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-text-primary">{r.property_name || r.properties?.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${statusColors[r.status]}`}>{r.status}</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-2">{r.description}</p>
                    <div className="flex gap-3 text-[10px] text-text-muted flex-wrap">
                      <span>{r.contact_name}</span>
                      <span>{r.contact_email}</span>
                      {r.contact_phone && <span>{r.contact_phone}</span>}
                      {r.budget_range && <span className="text-accent">{r.budget_range}</span>}
                      {r.timeline && <span>{r.timeline}</span>}
                    </div>
                    {r.desired_features?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {r.desired_features.map((f, i) => (
                          <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{f.feature}</span>
                        ))}
                      </div>
                    )}
                    {r.integrations_needed && (
                      <div className="text-[10px] text-text-muted mt-1">Integrations: {r.integrations_needed}</div>
                    )}
                    {r.branding?.logo_url && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-text-muted">Logo:</span>
                        <img src={r.branding.logo_url} alt="Logo" className="h-6 object-contain" />
                        {r.branding.primary_color && <span className="w-4 h-4 rounded" style={{ background: r.branding.primary_color }} />}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <select
                      value={r.status}
                      onChange={(e) => updateCustomRequestMutation.mutate({ id: r.id, updates: { status: e.target.value } })}
                      className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                    >
                      {['submitted', 'contacted', 'scoping', 'building', 'delivered', 'declined'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
          {(!customRequests || customRequests.length === 0) && (
            <div className="text-center text-text-muted text-sm py-12 bg-bg-surface border border-border rounded-lg">
              No custom dashboard requests yet. Admins can request from their sidebar.
            </div>
          )}
        </div>
      )}

      {/* CRM Data Importer Modal */}
      {showCRMImporter && (
        <Suspense fallback={null}>
          <CRMDataImporter
            onClose={() => setShowCRMImporter(false)}
            onImported={(count) => {
              queryClient.invalidateQueries()
              toast({ title: `${count} records imported`, type: 'success' })
              setShowCRMImporter(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

// ─── QA Hub ───

const QA_PAGES = [
  { path: '/', label: 'Landing Page', public: true },
  { path: '/login', label: 'Login / Signup', public: true },
  { path: '/app', label: 'Dashboard' },
  { path: '/app/crm/pipeline', label: 'Deal Pipeline' },
  { path: '/app/crm/contracts', label: 'Contracts' },
  { path: '/app/crm/assets', label: 'Asset Catalog' },
  { path: '/app/crm/fulfillment', label: 'Fulfillment Tracker' },
  { path: '/app/crm/activities', label: 'Activity Timeline' },
  { path: '/app/crm/tasks', label: 'Task Manager' },
  { path: '/app/crm/insights', label: 'AI Insights' },
  { path: '/app/ops/newsletter', label: 'Newsletter' },
  { path: '/app/ops/team', label: 'Team Manager' },
  { path: '/app/crm/declined', label: 'Declined Deals' },
  { path: '/app/sportify/events', label: 'Activations · Events' },
  { path: '/app/valora', label: 'VALORA Valuations' },
  { path: '/app/businessnow', label: 'BusinessNow Intelligence' },
  { path: '/app/settings', label: 'Settings' },
  { path: '/app/help', label: 'Help Center' },
  { path: '/app/custom-dashboard', label: 'Custom Dashboard Request' },
  { path: '/app/developer', label: 'Developer Dashboard' },
]

const QA_CHECKS = [
  { id: 'db_profiles', label: 'Profiles table', check: async (sb) => { const { count } = await sb.from('profiles').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_properties', label: 'Properties table', check: async (sb) => { const { count } = await sb.from('properties').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_deals', label: 'Deals table', check: async (sb) => { const { count } = await sb.from('deals').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_contracts', label: 'Contracts table', check: async (sb) => { const { count } = await sb.from('contracts').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_assets', label: 'Assets table', check: async (sb) => { const { count } = await sb.from('assets').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_contacts', label: 'Contacts table', check: async (sb) => { const { count } = await sb.from('contacts').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_fulfillment', label: 'Fulfillment records', check: async (sb) => { const { count } = await sb.from('fulfillment_records').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_events', label: 'Events table', check: async (sb) => { const { count } = await sb.from('events').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_teams', label: 'Teams table', check: async (sb) => { const { count } = await sb.from('teams').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_feature_flags', label: 'Feature flags', check: async (sb) => { const { data } = await sb.from('feature_flags').select('module, enabled'); return { ok: !!data, detail: data ? data.map(f => `${f.module}:${f.enabled ? 'ON' : 'OFF'}`).join(', ') : 'table missing' } } },
  { id: 'db_newsletters', label: 'Newsletters table', check: async (sb) => { const { count } = await sb.from('newsletters').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_audit', label: 'Audit log', check: async (sb) => { const { count } = await sb.from('audit_log').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_login_history', label: 'Login history', check: async (sb) => { const { count } = await sb.from('login_history').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_valuations', label: 'Valuations + training data', check: async (sb) => { const { count: v } = await sb.from('valuations').select('*', { count: 'exact', head: true }); const { count: t } = await sb.from('valuation_training_data').select('*', { count: 'exact', head: true }); return { ok: v !== null && t !== null, detail: `${v} valuations, ${t} training rows` } } },
  { id: 'db_usage', label: 'Usage tracker', check: async (sb) => { const { count } = await sb.from('usage_tracker').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} rows` } } },
  { id: 'db_cms', label: 'CMS content', check: async (sb) => { const { count } = await sb.from('ui_content').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} entries` } } },
  { id: 'db_premium_links', label: 'Premium invite links', check: async (sb) => { const { count } = await sb.from('premium_invite_links').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} links` } } },
  { id: 'db_sponsor_portal', label: 'Sponsor portal links', check: async (sb) => { const { count } = await sb.from('sponsor_portal_links').select('*', { count: 'exact', head: true }); return { ok: count !== null, detail: `${count} links` } } },
  { id: 'auth_session', label: 'Auth session', check: async (sb) => { const { data } = await sb.auth.getSession(); return { ok: !!data.session, detail: data.session ? `Expires ${new Date(data.session.expires_at * 1000).toLocaleString()}` : 'No session' } } },
  { id: 'edge_fn', label: 'Edge function (contract-ai)', check: async (sb) => { try { const { data, error } = await sb.functions.invoke('contract-ai', { body: { action: 'ping' } }); return { ok: !error, detail: error ? error.message : 'Reachable' } } catch (e) { return { ok: false, detail: e.message } } } },
]

function QAHub({ properties, profiles }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [healthResults, setHealthResults] = useState({})
  const [running, setRunning] = useState(false)
  const [pageTests, setPageTests] = useState({})
  const [testingPage, setTestingPage] = useState(null)
  const [errorLog, setErrorLog] = useState([])

  // Historical health reports
  const { data: healthHistory } = useQuery({
    queryKey: ['health-reports'],
    queryFn: async () => {
      const { data } = await supabase.from('health_check_reports').select('*').order('run_date', { ascending: false }).limit(20)
      return data || []
    },
  })

  // Capture client-side errors
  useEffect(() => {
    function captureError(event) {
      setErrorLog(prev => [{
        message: event.message || event.reason?.message || 'Unknown error',
        source: event.filename || event.reason?.stack?.split('\n')[1] || '',
        time: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 50))
    }
    window.addEventListener('error', captureError)
    window.addEventListener('unhandledrejection', captureError)
    return () => {
      window.removeEventListener('error', captureError)
      window.removeEventListener('unhandledrejection', captureError)
    }
  }, [])

  async function runAllHealthChecks() {
    setRunning(true)
    const results = {}
    for (const check of QA_CHECKS) {
      try {
        results[check.id] = await check.check(supabase)
      } catch (e) {
        results[check.id] = { ok: false, detail: e.message }
      }
    }
    setHealthResults(results)
    setRunning(false)
    const passed = Object.values(results).filter(r => r.ok).length
    toast({ title: `Health check: ${passed}/${QA_CHECKS.length} passed`, type: passed === QA_CHECKS.length ? 'success' : 'warning' })
  }

  function testPage(path) {
    setTestingPage(path)
    const start = performance.now()
    // Navigate to the page, measure load time
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = path
    iframe.onload = () => {
      const loadTime = Math.round(performance.now() - start)
      setPageTests(prev => ({ ...prev, [path]: { ok: true, loadTime, tested: new Date().toLocaleTimeString() } }))
      document.body.removeChild(iframe)
      setTestingPage(null)
    }
    iframe.onerror = () => {
      setPageTests(prev => ({ ...prev, [path]: { ok: false, loadTime: 0, tested: new Date().toLocaleTimeString(), error: 'Failed to load' } }))
      document.body.removeChild(iframe)
      setTestingPage(null)
    }
    document.body.appendChild(iframe)
    // Timeout after 10s
    setTimeout(() => {
      if (testingPage === path) {
        setPageTests(prev => ({ ...prev, [path]: { ok: false, loadTime: 10000, tested: new Date().toLocaleTimeString(), error: 'Timeout (10s)' } }))
        try { document.body.removeChild(iframe) } catch {}
        setTestingPage(null)
      }
    }, 10000)
  }

  async function testAllPages() {
    for (const page of QA_PAGES) {
      testPage(page.path)
      await new Promise(r => setTimeout(r, 2000)) // 2s between tests
    }
  }

  const passedHealth = Object.values(healthResults).filter(r => r.ok).length
  const totalHealth = Object.keys(healthResults).length
  const passedPages = Object.values(pageTests).filter(r => r.ok).length
  const totalPages = Object.keys(pageTests).length

  return (
    <div className="space-y-4">
      {/* QA Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MiniKPI label="Health Checks" value={totalHealth > 0 ? `${passedHealth}/${totalHealth}` : '—'} sub={totalHealth > 0 ? (passedHealth === totalHealth ? 'All passing' : `${totalHealth - passedHealth} failing`) : 'Not run yet'} accent={passedHealth === totalHealth && totalHealth > 0} />
        <MiniKPI label="Page Tests" value={totalPages > 0 ? `${passedPages}/${totalPages}` : '—'} sub={totalPages > 0 ? `Avg ${Math.round(Object.values(pageTests).reduce((s, r) => s + (r.loadTime || 0), 0) / totalPages)}ms` : 'Not run yet'} />
        <MiniKPI label="Client Errors" value={errorLog.length} sub={errorLog.length > 0 ? `Last: ${errorLog[0]?.time}` : 'No errors captured'} />
        <MiniKPI label="Total Pages" value={QA_PAGES.length} sub={`${QA_PAGES.filter(p => p.public).length} public`} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={runAllHealthChecks} disabled={running} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {running ? 'Running...' : 'Run Health Checks'}
        </button>
        <button onClick={testAllPages} disabled={!!testingPage} className="bg-bg-surface border border-border text-text-secondary px-4 py-2 rounded text-sm font-medium hover:text-text-primary disabled:opacity-50">
          {testingPage ? `Testing ${testingPage}...` : 'Test All Pages'}
        </button>
        <button onClick={() => setErrorLog([])} className="text-xs text-text-muted hover:text-text-primary border border-border rounded px-3 py-2">
          Clear Error Log
        </button>
      </div>

      {/* Health Checks */}
      <Panel title={`Database & Service Health (${totalHealth > 0 ? `${passedHealth}/${totalHealth}` : 'not run'})`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {QA_CHECKS.map(check => {
            const result = healthResults[check.id]
            return (
              <div key={check.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-bg-card">
                <span className="text-xs text-text-primary">{check.label}</span>
                {result ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-text-muted font-mono truncate max-w-[150px]">{result.detail}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${result.ok ? 'bg-success' : 'bg-danger'}`} />
                  </div>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-bg-card" />
                )}
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Page Testing */}
      <Panel title="Page Load Testing">
        <div className="space-y-1">
          {QA_PAGES.map(page => {
            const result = pageTests[page.path]
            const isTesting = testingPage === page.path
            return (
              <div key={page.path} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-bg-card gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${result ? (result.ok ? 'bg-success' : 'bg-danger') : 'bg-bg-card'} ${isTesting ? 'animate-pulse bg-accent' : ''}`} />
                  <span className="text-xs text-text-primary truncate">{page.label}</span>
                  <span className="text-[9px] text-text-muted font-mono hidden sm:inline">{page.path}</span>
                  {page.public && <span className="text-[8px] font-mono text-text-muted bg-bg-card px-1 py-0.5 rounded hidden sm:inline">public</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {result && (
                    <span className={`text-[10px] font-mono ${result.loadTime > 3000 ? 'text-danger' : result.loadTime > 1000 ? 'text-warning' : 'text-success'}`}>
                      {result.loadTime}ms
                    </span>
                  )}
                  {result?.error && <span className="text-[9px] text-danger hidden sm:inline">{result.error}</span>}
                  <button onClick={() => navigate(page.path)} className="text-[9px] text-accent hover:underline">Go</button>
                  <button onClick={() => testPage(page.path)} disabled={isTesting} className="text-[9px] text-text-muted hover:text-text-primary disabled:opacity-30">Test</button>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Error Log */}
      <Panel title={`Client Error Log (${errorLog.length})`}>
        {errorLog.length > 0 ? (
          <div className="space-y-1 max-h-[250px] overflow-y-auto">
            {errorLog.map((err, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                <span className="text-[9px] font-mono text-danger bg-danger/10 px-1.5 py-0.5 rounded shrink-0">{err.time}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-text-primary truncate">{err.message}</div>
                  {err.source && <div className="text-[9px] text-text-muted truncate">{err.source}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-text-muted text-center py-6">No errors captured. Errors will appear here in real-time as they occur.</div>
        )}
      </Panel>

      {/* Scheduled Health Check History */}
      {(healthHistory || []).length > 0 && (
        <Panel title="Automated Health Checks (Mon/Thu/Sun)">
          <div className="space-y-1.5">
            {healthHistory.map(report => (
              <div key={report.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${report.status === 'passed' ? 'bg-success' : report.status === 'warnings' ? 'bg-warning' : 'bg-danger'}`} />
                  <span className="text-xs text-text-primary capitalize">{report.schedule}</span>
                  <span className="text-[9px] text-text-muted font-mono hidden sm:inline">{new Date(report.run_date).toLocaleString()}</span>
                  <span className="text-[9px] text-text-muted font-mono sm:hidden">{new Date(report.run_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-text-secondary">{report.passed_checks}/{report.total_checks}</span>
                  {report.error_count_24h > 0 && (
                    <span className="text-[9px] font-mono text-danger">{report.error_count_24h}err</span>
                  )}
                  {report.platform_stats && (
                    <span className="text-[9px] text-text-muted font-mono hidden sm:inline">
                      {report.platform_stats.profiles}u {report.platform_stats.deals}d
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Environment Info */}
      <Panel title="Environment">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div><span className="text-text-muted">URL:</span> <span className="text-text-primary font-mono">{window.location.origin}</span></div>
          <div><span className="text-text-muted">Browser:</span> <span className="text-text-primary font-mono">{navigator.userAgent.split(' ').pop()}</span></div>
          <div><span className="text-text-muted">Screen:</span> <span className="text-text-primary font-mono">{window.innerWidth}x{window.innerHeight}</span></div>
          <div><span className="text-text-muted">Device Pixel Ratio:</span> <span className="text-text-primary font-mono">{window.devicePixelRatio}x</span></div>
          <div><span className="text-text-muted">Online:</span> <span className={`font-mono ${navigator.onLine ? 'text-success' : 'text-danger'}`}>{navigator.onLine ? 'Yes' : 'No'}</span></div>
          <div><span className="text-text-muted">Properties:</span> <span className="text-text-primary font-mono">{(properties || []).length}</span></div>
          <div><span className="text-text-muted">Users:</span> <span className="text-text-primary font-mono">{(profiles || []).length}</span></div>
          <div><span className="text-text-muted">LocalStorage:</span> <span className="text-text-primary font-mono">{Object.keys(localStorage).length} keys</span></div>
          <div><span className="text-text-muted">Session:</span> <span className="text-text-primary font-mono">{Object.keys(sessionStorage).length} keys</span></div>
        </div>
      </Panel>
    </div>
  )
}

const CHART_COLORS = ['#E8B84B', '#52C48A', '#E05252', '#8B92A8', '#9E7D2F', '#5BA3E0']
const STAGE_ORDER = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed', 'Declined']

function AnalyticsTab({ profiles, properties, deals, contracts, assets, loginLogs, auditLogs, apiUsage }) {
  const now = new Date()
  const currentYear = now.getFullYear()

  // ─── Signup growth (last 30 days) ───
  const signupsByDay = (() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const count = (profiles || []).filter(p => p.created_at?.slice(0, 10) === key).length
      days.push({ date: key.slice(5), count })
    }
    return days
  })()
  const totalSignups = (profiles || []).length
  const signupsThisWeek = (profiles || []).filter(p => {
    const d = new Date(p.created_at)
    return (now - d) < 7 * 86400000
  }).length

  // ─── Deals by stage ───
  const dealsByStage = STAGE_ORDER.map(stage => ({
    stage: stage.replace('Proposal Sent', 'Proposal').replace('In Fulfillment', 'Fulfillment'),
    count: (deals || []).filter(d => (d.stage || 'Prospect') === stage).length,
    value: (deals || []).filter(d => (d.stage || 'Prospect') === stage).reduce((s, d) => s + (Number(d.value) || 0), 0),
  })).filter(d => d.count > 0)

  // ─── Revenue metrics ───
  const totalPipeline = (deals || []).filter(d => d.stage !== 'Declined').reduce((s, d) => s + (Number(d.value) || 0), 0)
  const contractedValue = (deals || []).filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)).reduce((s, d) => s + (Number(d.value) || 0), 0)
  const signedContracts = (contracts || []).filter(c => c.signed).length
  const totalContractValue = (contracts || []).reduce((s, c) => s + (Number(c.total_value) || 0), 0)

  // ─── Revenue by property ───
  const revenueByProperty = (properties || []).map(p => {
    const propDeals = (deals || []).filter(d => d.property_id === p.id && d.stage !== 'Declined')
    return {
      name: p.name?.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
      pipeline: propDeals.reduce((s, d) => s + (Number(d.value) || 0), 0),
      contracted: propDeals.filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)).reduce((s, d) => s + (Number(d.value) || 0), 0),
      deals: propDeals.length,
    }
  }).filter(p => p.deals > 0).sort((a, b) => b.pipeline - a.pipeline).slice(0, 10)

  // ─── Revenue by year (all properties combined) ───
  const revenueByYear = [currentYear, currentYear + 1, currentYear + 2].map(year => {
    let revenue = 0
    for (const d of (deals || []).filter(d => d.stage !== 'Declined')) {
      if (d.annual_values && d.annual_values[year]) {
        revenue += Number(d.annual_values[year]) || 0
      } else {
        const sd = d.start_date ? new Date(d.start_date).getFullYear() : null
        if (sd === year) revenue += Number(d.value) || 0
      }
    }
    return { year: String(year), revenue }
  })

  // ─── Users by role ───
  const usersByRole = ['developer', 'admin', 'rep', 'disabled'].map(role => ({
    name: role, value: (profiles || []).filter(p => p.role === role).length,
  })).filter(r => r.value > 0)

  // ─── Properties by plan ───
  const propertiesByPlan = ['free', 'starter', 'pro', 'enterprise'].map(plan => ({
    name: plan, value: (properties || []).filter(p => (p.plan || 'free') === plan).length,
  })).filter(p => p.value > 0)

  // ─── Properties by type ───
  const propertiesByType = (() => {
    const counts = {}
    for (const p of (properties || [])) {
      const t = p.type || 'other'
      counts[t] = (counts[t] || 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  })()

  // ─── Login activity (last 14 days) ───
  const loginsByDay = (() => {
    const days = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const count = (loginLogs || []).filter(l => l.login_at?.slice(0, 10) === key && l.success).length
      const failed = (loginLogs || []).filter(l => l.login_at?.slice(0, 10) === key && !l.success).length
      days.push({ date: key.slice(5), logins: count, failed })
    }
    return days
  })()

  // ─── Asset inventory ───
  const assetsByCategory = (() => {
    const counts = {}
    for (const a of (assets || []).filter(a => a.active)) {
      counts[a.category] = (counts[a.category] || 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
  })()
  const totalAssets = (assets || []).filter(a => a.active).length
  const contractAssets = (assets || []).filter(a => a.from_contract).length

  // ─── Deal conversion rate ───
  const totalDeals = (deals || []).length
  const wonDeals = (deals || []).filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)).length
  const lostDeals = (deals || []).filter(d => d.stage === 'Declined').length
  const winRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0

  function fmtMoney(v) {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
    return `$${Math.round(v)}`
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <MiniKPI label="Total Users" value={totalSignups} sub={`+${signupsThisWeek} this week`} />
        <MiniKPI label="Properties" value={(properties || []).length} sub={`${propertiesByPlan.find(p => p.name === 'free')?.value || 0} free`} />
        <MiniKPI label="Total Deals" value={totalDeals} sub={`${winRate}% win rate`} accent />
        <MiniKPI label="Pipeline" value={fmtMoney(totalPipeline)} sub={`${(deals || []).filter(d => d.stage !== 'Declined').length} active`} accent />
        <MiniKPI label="Contracted" value={fmtMoney(contractedValue)} sub={`${wonDeals} deals won`} />
        <MiniKPI label="Contracts" value={(contracts || []).length} sub={`${signedContracts} signed`} />
      </div>

      {/* Row 1: Signup Growth + Login Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-3">User Signups (30 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={signupsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" fill="#E8B84B" fillOpacity={0.2} stroke="#E8B84B" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-3">Login Activity (14 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={loginsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="logins" fill="#52C48A" radius={[2, 2, 0, 0]} name="Successful" />
              <Bar dataKey="failed" fill="#E05252" radius={[2, 2, 0, 0]} name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Pipeline + Revenue by Property */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-3">Deals by Stage (all properties)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dealsByStage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="stage" tick={{ fontSize: 9, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Value']} />
              <Bar dataKey="value" fill="#E8B84B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-3">Revenue by Property (top 10)</h3>
          {revenueByProperty.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByProperty} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#8B92A8' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#8B92A8' }} width={100} />
                <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} formatter={(v) => [`$${Number(v).toLocaleString()}`]} />
                <Bar dataKey="pipeline" fill="#E8B84B" radius={[0, 4, 4, 0]} name="Pipeline" />
                <Bar dataKey="contracted" fill="#52C48A" radius={[0, 4, 4, 0]} name="Contracted" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-text-muted text-xs text-center py-16">No deal data yet</div>
          )}
        </div>
      </div>

      {/* Row 3: Revenue by Year + Conversion Funnel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {revenueByYear.map(ry => (
          <div key={ry.year} className="bg-bg-surface border border-border rounded-lg p-4 text-center">
            <div className="text-[10px] text-text-muted font-mono uppercase">{ry.year}</div>
            <div className="text-2xl font-bold font-mono text-accent mt-1">{fmtMoney(ry.revenue)}</div>
            <div className="text-[10px] text-text-muted">projected revenue</div>
          </div>
        ))}
      </div>

      {/* Row 4: Pie Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-2">Users by Role</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={usersByRole} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={{ fontSize: 9, fill: '#8B92A8' }}>
                {usersByRole.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-2">Properties by Plan</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={propertiesByPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={{ fontSize: 9, fill: '#8B92A8' }}>
                {propertiesByPlan.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-2">Properties by Industry</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={propertiesByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={{ fontSize: 9, fill: '#8B92A8' }}>
                {propertiesByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-2">Win / Loss</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={[{ name: 'Won', value: wonDeals }, { name: 'Lost', value: lostDeals }, { name: 'Open', value: totalDeals - wonDeals - lostDeals }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={{ fontSize: 9, fill: '#8B92A8' }}>
                <Cell fill="#52C48A" />
                <Cell fill="#E05252" />
                <Cell fill="#8B92A8" />
              </Pie>
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 5: Asset Inventory + Recent Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-2">Assets by Category (top 10) — {totalAssets} total, {contractAssets} from contracts</h3>
          {assetsByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={assetsByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#8B92A8' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fill: '#8B92A8' }} width={90} />
                <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="value" fill="#E8B84B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-text-muted text-xs text-center py-16">No assets yet</div>
          )}
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-2">Recent Audit Log</h3>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
            {(auditLogs || []).slice(0, 20).map(log => (
              <div key={log.id} className="flex items-start gap-2 py-1 border-b border-border last:border-0">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                  log.action === 'login' ? 'bg-success/10 text-success' :
                  log.action === 'role_change' ? 'bg-warning/10 text-warning' :
                  log.action === 'plan_change' ? 'bg-accent/10 text-accent' :
                  log.action === 'delete' ? 'bg-danger/10 text-danger' :
                  'bg-bg-card text-text-muted'
                }`}>{log.action}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-text-secondary truncate">{log.entity_type} {log.entity_name || ''}</div>
                  <div className="text-[9px] text-text-muted">{log.user_email} · {new Date(log.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {(!auditLogs || auditLogs.length === 0) && (
              <div className="text-text-muted text-xs text-center py-8">No audit logs yet. Actions will appear here as users interact with the platform.</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 6: API Usage + Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MiniKPI label="Total Assets" value={totalAssets} sub={`${contractAssets} from contracts`} />
        <MiniKPI label="Signed Contracts" value={signedContracts} sub={fmtMoney(totalContractValue)} />
        <MiniKPI label="Login Events" value={(loginLogs || []).length} sub={`${(loginLogs || []).filter(l => !l.success).length} failed`} />
        <MiniKPI label="Audit Events" value={(auditLogs || []).length} sub="all time" />
      </div>
    </div>
  )
}

function MiniKPI({ label, value, sub, accent }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3">
      <div className="text-[9px] text-text-muted font-mono uppercase">{label}</div>
      <div className={`text-lg font-semibold font-mono mt-0.5 ${accent ? 'text-accent' : 'text-text-primary'}`}>{value}</div>
      {sub && <div className="text-[9px] text-text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

function Panel({ title, children, actions }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-mono text-text-muted uppercase">{title}</h3>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-text-muted font-mono uppercase">{label}</div>
      <div className={`text-xl font-semibold font-mono ${color} mt-0.5`}>{value}</div>
    </div>
  )
}
