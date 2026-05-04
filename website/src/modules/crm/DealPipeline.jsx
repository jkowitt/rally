import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Breadcrumbs from '@/components/Breadcrumbs'
import DealActivityTimeline from '@/components/DealActivityTimeline'
import BuyingCommittee from '@/components/BuyingCommittee'
import AccountBrief from '@/components/AccountBrief'
import WarmPathFinder from '@/components/WarmPathFinder'
import PersonalityProfile from '@/components/PersonalityProfile'
import PortalEngagement from '@/components/PortalEngagement'
import CustomFieldsEditor, { CustomFieldsRenderer } from '@/components/CustomFieldsEditor'
import SavedViewsBar from '@/components/SavedViewsBar'
import BulkEditBar from '@/components/BulkEditBar'
import DealComments from '@/components/DealComments'
import SlashInput from '@/components/SlashInput'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Badge, Button, EmptyState } from '@/components/ui'
import {
  Search, Phone, Mail, Handshake, StickyNote, Bell,
  FileText, BarChart3, ClipboardList,
} from 'lucide-react'
import { on } from '@/lib/appEvents'
import { useToast } from '@/components/Toast'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { enrichContact, searchProspects, suggestProspects, researchContacts, researchMoreContacts, parsePdfText, apolloEnrichCompany, hunterVerifyEmail, draftFirstTouchEmail } from '@/lib/claude'
import { useComposeEmail } from '@/hooks/useComposeEmail'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import UpgradeGate, { UsageBadge } from '@/components/UpgradeGate'
import ICPFilter from '@/components/ICPFilter'
import CSVImportWizard from '@/components/CSVImportWizard'
import { useIndustryConfig } from '@/hooks/useIndustryConfig'
import { isAIFeatureEnabled } from '@/lib/featureCheck'
import { lazy, Suspense } from 'react'
const CRMDataImporter = lazy(() => import('@/components/CRMDataImporter'))
import { checkRateLimit } from '@/lib/rateLimit'
import { sanitizeText } from '@/lib/sanitize'
import { humanError } from '@/lib/humanError'
import { runAutomations } from '@/lib/automations'

const STAGES = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed']
const ALL_STAGES = [...STAGES, 'Declined']
const SOURCES = ['Referral', 'Cold Outreach', 'Inbound', 'Event', 'Renewal', 'Other']
const PRIORITIES = ['High', 'Medium', 'Low']
const STAGE_PROBABILITY = { 'Prospect': 10, 'Proposal Sent': 25, 'Negotiation': 50, 'Contracted': 90, 'In Fulfillment': 95, 'Renewed': 100, 'Declined': 0 }

const INDUSTRY_CATEGORIES = [
  'Automotive',
  'Banking & Financial Services',
  'Beverage & Alcohol',
  'Consumer Packaged Goods',
  'Education',
  'Energy & Utilities',
  'Entertainment & Media',
  'Fashion & Apparel',
  'Food & Quick Serve Restaurants',
  'Gaming & Esports',
  'Government & Public Sector',
  'Healthcare',
  'Hospitality & Travel',
  'Insurance',
  'Legal Services',
  'Manufacturing',
  'Non-Hospital Healthcare',
  'Nonprofit & Charity',
  'Real Estate & Construction',
  'Retail',
  'Sports & Fitness',
  'Technology & Software',
  'Telecommunications',
  'Transportation & Logistics',
  'Misc',
]

// Auto-categorize a company by name/industry keywords
function guessCategory(brandName, subIndustry) {
  const text = `${brandName} ${subIndustry || ''}`.toLowerCase()
  const rules = [
    [/auto|car|motor|vehicle|tire|ford|chevy|toyota|honda|bmw|mercedes|kia|hyundai|tesla|dealer/i, 'Automotive'],
    [/bank|financ|capital|invest|wealth|credit union|fidelity|chase|wells fargo/i, 'Banking & Financial Services'],
    [/beer|wine|liquor|spirit|bourbon|vodka|brew|bud|coors|miller|seltzer|beverage/i, 'Beverage & Alcohol'],
    [/cpg|consumer.*good|procter|unilever|colgate|deterg/i, 'Consumer Packaged Goods'],
    [/school|university|college|edu|academ|campus/i, 'Education'],
    [/energy|utilit|power|electric|solar|oil|gas|petrol/i, 'Energy & Utilities'],
    [/entertain|media|movie|film|studio|music|stream|netflix|disney|spotify|podcast|broadcast/i, 'Entertainment & Media'],
    [/fashion|apparel|cloth|shoe|nike|adidas|puma|under armour|new balance|reebok|lululemon/i, 'Fashion & Apparel'],
    [/food|restaurant|pizza|burger|chicken|taco|sandwich|cafe|dine|mcdonald|wendy|chick-fil|chipotle|subway|starbuck|coffee|donut|bakery/i, 'Food & Quick Serve Restaurants'],
    [/gaming|esport|game|twitch|xbox|playstation|riot|ea sport|activision/i, 'Gaming & Esports'],
    [/government|public sector|municipal|city of|state of|county|federal/i, 'Government & Public Sector'],
    [/hospital|health system|medical center|clinic.*health|pharma|drug|biotech/i, 'Healthcare'],
    [/hotel|resort|travel|airlin|cruise|marriott|hilton|hyatt/i, 'Hospitality & Travel'],
    [/insurance|insur|allstate|geico|state farm|progressive|liberty mutual/i, 'Insurance'],
    [/law firm|legal|attorney|lawyer/i, 'Legal Services'],
    [/manufactur|industrial|factory|steel|metal/i, 'Manufacturing'],
    [/dental|chiro|optom|urgent care|physical therapy|vet|dermat|wellness|medspa|non.?hospital/i, 'Non-Hospital Healthcare'],
    [/nonprofit|non.?profit|charit|foundation|united way|ymca|ywca|salvation|red cross/i, 'Nonprofit & Charity'],
    [/real estate|realt|construct|build|home|property|mortgage/i, 'Real Estate & Construction'],
    [/retail|store|shop|mall|walmart|target|costco|amazon|ecommerce|e-commerce/i, 'Retail'],
    [/sport|fitness|gym|athlet|team|league|arena|stadium/i, 'Sports & Fitness'],
    [/tech|software|saas|app|platform|cloud|cyber|data|ai |microsoft|google|apple|meta|salesforce/i, 'Technology & Software'],
    [/telecom|wireless|mobile|phone|verizon|at&t|t-mobile|sprint|comcast|spectrum/i, 'Telecommunications'],
    [/transport|logistic|ship|freight|trucking|fedex|ups|delivery/i, 'Transportation & Logistics'],
  ]
  for (const [pattern, category] of rules) {
    if (pattern.test(text)) return category
  }
  return 'Misc'
}

function getDealScore(deal) {
  let score = 0
  if (deal.value) score += 15
  if (deal.contact_email) score += 10
  if (deal.contact_phone) score += 5
  if (deal.contact_first_name) score += 5
  if (deal.contact_position) score += 5
  if (deal.source) score += 5
  if (deal.notes) score += 5
  score += (STAGE_PROBABILITY[deal.stage] || 0) / 2
  if (deal.win_probability > 0) score += 10
  if (deal.expected_close_date) score += 10
  return Math.min(100, score)
}

function getDealAge(deal) {
  if (!deal.date_added && !deal.created_at) return 0
  const added = new Date(deal.date_added || deal.created_at)
  return Math.floor((Date.now() - added.getTime()) / (1000 * 60 * 60 * 24))
}

function isStale(deal) {
  if (['Contracted', 'In Fulfillment', 'Renewed', 'Declined'].includes(deal.stage)) return false
  const lastActivity = deal.last_contacted ? new Date(deal.last_contacted) : new Date(deal.date_added || deal.created_at)
  const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  return daysSince > 14
}

export default function DealPipeline() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const config = useIndustryConfig()
  const t = config.terminology || {}
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)
  // Default to kanban on desktop, table on mobile — kanban with 6 stages
  // requires horizontal scrolling on phones, which is bad UX.
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      return 'table'
    }
    return 'kanban'
  })
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showProspectFinder, setShowProspectFinder] = useState(false)
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [filterCategory, setFilterCategory] = useState('')
  const [selectedDeals, setSelectedDeals] = useState(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [viewingDeal, setViewingDeal] = useState(null)
  const [columnFilters, setColumnFilters] = useState({})
  const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set())
  const [showColumnFilters, setShowColumnFilters] = useState(false)
  const [showCRMImporter, setShowCRMImporter] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: deals, isLoading } = useQuery({
    queryKey: ['deals', propertyId],
    queryFn: async () => {
      let query = supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(2000)
      // Developer sees all deals if no property assigned
      if (propertyId) query = query.eq('property_id', propertyId)
      const { data, error } = await query
      if (error) { console.error('Deals query error:', error); return [] }
      return data || []
    },
    enabled: !!propertyId || profile?.role === 'developer',
  })

  // Fetch contacts for all deals (gracefully fails if table doesn't exist yet)
  const { data: allContacts } = useQuery({
    queryKey: ['contacts', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('property_id', propertyId)
        .order('is_primary', { ascending: false })
      if (error) return [] // table might not exist yet
      return data
    },
    enabled: !!propertyId,
  })

  // Team profiles for assignment display
  const { data: teamUsers } = useQuery({
    queryKey: ['team-users', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').eq('property_id', propertyId)
      return data || []
    },
    enabled: !!propertyId,
  })
  const userNameMap = (teamUsers || []).reduce((m, u) => { m[u.id] = u.full_name || u.email || u.id.slice(0, 6); return m }, {})

  // Listen for command-palette events that open the deal form or
  // the prospect finder. Stays robust if Pipeline isn't mounted —
  // dispatchers fire after navigate() so this listener is alive.
  useEffect(() => {
    const offNew = on('open-new-deal', () => { setEditingDeal(null); setShowForm(true) })
    const offFind = on('open-find-prospects', () => setShowProspectFinder(true))
    return () => { offNew(); offFind() }
  }, [])

  // Auto-open deal from URL param (?deal=<id>), filter by stage
  // (?stage=<name>), or open the prospect-finder modal (?find=1).
  // The find param lets the Prospecting hub's "Find Prospects"
  // sidebar entry deep-link directly into the modal.
  useEffect(() => {
    const dealId = searchParams.get('deal')
    const stageParam = searchParams.get('stage')
    const findParam = searchParams.get('find')
    if (findParam === '1') {
      setShowProspectFinder(true)
      setSearchParams({}, { replace: true })
      return
    }
    if (dealId && deals?.length) {
      const found = deals.find(d => d.id === dealId)
      if (found) {
        setViewingDeal({ ...found, stage: found.stage || 'Prospect' })
        setSearchParams({}, { replace: true })
      }
    } else if (stageParam && deals?.length) {
      // Switch to table view and filter to the requested stage
      setViewMode('table')
      setShowColumnFilters(true)
      setColumnFilters(prev => ({ ...prev, stage: stageParam }))
      setSearchParams({}, { replace: true })
    }
  }, [deals, searchParams, setSearchParams])

  // Group contacts by deal_id for easy lookup
  const contactsByDeal = (allContacts || []).reduce((acc, c) => {
    if (c.deal_id) {
      if (!acc[c.deal_id]) acc[c.deal_id] = []
      acc[c.deal_id].push(c)
    }
    return acc
  }, {})

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage, oldStage }) => {
      const { error } = await supabase.from('deals').update({ stage }).eq('id', id)
      if (error) throw error
      // Auto-log stage change to activity timeline
      try {
        await supabase.from('activities').insert({
          property_id: propertyId,
          deal_id: id,
          activity_type: 'Stage Change',
          subject: `Stage changed: ${oldStage || '?'} → ${stage}`,
          occurred_at: new Date().toISOString(),
          created_by: profile?.id,
        })
      } catch (e) { console.warn(e) }
      // Fire automations
      runAutomations(propertyId, 'deal_stage_change', { deal_id: id, from_stage: oldStage, to_stage: stage })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['activities', propertyId] })
      toast({ title: 'Stage updated', type: 'success' })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ contacts: formContacts, proposedAssets: formProposedAssets, ...deal }) => {
      const payload = { ...deal }
      // Convert year values to dates
      if (payload.start_date && !String(payload.start_date).includes('-')) {
        payload.start_date = `${payload.start_date}-01-01`
      }
      if (payload.end_date && !String(payload.end_date).includes('-')) {
        payload.end_date = `${payload.end_date}-12-31`
      }
      // Convert tags string to array (column may not exist if migration 009 hasn't run)
      if (typeof payload.tags === 'string') {
        payload.tags = payload.tags ? payload.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      }
      // Convert win_probability to int
      if (payload.win_probability) payload.win_probability = parseInt(payload.win_probability) || 0
      else delete payload.win_probability

      // Remove fields that require migration 009 if they're empty
      const pro_fields = ['win_probability', 'deal_score', 'expected_close_date', 'lost_reason', 'tags', 'stale_days', 'contact_tags']
      pro_fields.forEach((f) => { if (!payload[f] || (Array.isArray(payload[f]) && payload[f].length === 0)) delete payload[f] })

      // Remove new company fields if empty (column may not exist pre-migration)
      const companyFields = ['city', 'state', 'website', 'linkedin', 'founded', 'revenue_thousands', 'employees', 'sub_industry', 'outreach_status', 'is_multi_year', 'deal_years', 'annual_values', 'renewal_date', 'logo_url']
      companyFields.forEach((f) => { if (!payload[f]) delete payload[f] })
      if (payload.revenue_thousands) payload.revenue_thousands = Number(payload.revenue_thousands) || null
      if (payload.employees) payload.employees = Number(payload.employees) || null

      const optionalFields = ['start_date', 'end_date', 'value', 'contact_phone', 'contact_position', 'contact_company', 'contact_email', 'last_contacted', 'next_follow_up', 'source', 'expected_close_date']
      optionalFields.forEach((f) => { if (!payload[f]) delete payload[f] })
      // Account-lead is nullable: send null (not empty string) when unset.
      if (payload.account_lead_id === '') payload.account_lead_id = null

      // Set primary contact on deal from first contact (backward compat)
      if (formContacts?.length > 0) {
        const primary = formContacts.find(c => c.is_primary) || formContacts[0]
        payload.contact_first_name = primary.first_name || ''
        payload.contact_last_name = primary.last_name || ''
        payload.contact_name = [primary.first_name, primary.last_name].filter(Boolean).join(' ')
        payload.contact_email = primary.email || ''
        payload.contact_phone = primary.phone || ''
        payload.contact_position = primary.position || ''
        payload.contact_company = primary.company || payload.brand_name
      } else {
        // Build contact_name from first/last
        if (payload.contact_first_name || payload.contact_last_name) {
          payload.contact_name = [payload.contact_first_name, payload.contact_last_name].filter(Boolean).join(' ')
        }
      }

      let dealId = payload.id
      if (payload.id) {
        const { error } = await supabase.from('deals').update(payload).eq('id', payload.id)
        if (error) throw error
      } else {
        delete payload.id
        const { data, error } = await supabase.from('deals').insert({ ...payload, property_id: propertyId }).select('id').single()
        if (error) throw error
        dealId = data.id
        // Fire automation for new deal
        runAutomations(propertyId, 'deal_created', { deal_id: dealId, brand_name: payload.brand_name, stage: payload.stage })
      }

      // Save contacts to contacts table (if migration has been run)
      if (formContacts && dealId) {
        try {
          // Delete existing contacts for this deal
          await supabase.from('contacts').delete().eq('deal_id', dealId)
          // Insert new contacts
          const contactRows = formContacts
            .filter(c => c.first_name || c.last_name || c.email)
            .map((c, i) => ({
              property_id: propertyId,
              deal_id: dealId,
              first_name: c.first_name || '',
              last_name: c.last_name || null,
              email: c.email || null,
              phone: c.phone || null,
              position: c.position || null,
              company: c.company || payload.brand_name || null,
              city: c.city || null,
              state: c.state || null,
              linkedin: c.linkedin || null,
              website: c.website || null,
              is_primary: c.is_primary || i === 0,
              email_verified: c.email_verified || 'unknown',
              enriched_from: c.enriched_from || null,
            }))
          if (contactRows.length > 0) {
            // Try with enrichment fields first; fall back without if columns don't exist
            const { error: insertErr } = await supabase.from('contacts').insert(contactRows)
            if (insertErr) {
              const fallbackRows = contactRows.map(({ email_verified, enriched_from, ...rest }) => rest)
              await supabase.from('contacts').insert(fallbackRows)
            }
          }
        } catch (e) { console.warn(e) 
          // contacts table may not exist yet — silently skip
        }
      }

      // Save proposed assets
      if (formProposedAssets?.length > 0 && dealId) {
        try {
          await supabase.from('deal_assets').delete().eq('deal_id', dealId)
          const assetRows = formProposedAssets.map(pa => ({
            deal_id: dealId,
            asset_id: pa.asset_id,
            quantity: pa.quantity || 1,
            custom_price: pa.custom_price || null,
            is_proposed: true,
            proposed_at: new Date().toISOString(),
            notes: pa.notes || null,
          }))
          await supabase.from('deal_assets').insert(assetRows)
        } catch (e) { console.warn(e) 
          // deal_assets columns may not exist yet
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['contacts', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['deal-assets'] })
      toast({ title: 'Deal saved', type: 'success' })
      setShowForm(false)
      setEditingDeal(null)
    },
    onError: (err) => toast({ title: 'Error saving deal', description: err.message, type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('deals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      toast({ title: 'Deal deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting deal', description: err.message, type: 'error' }),
  })

  const declineMutation = useMutation({
    mutationFn: async ({ id, lost_reason }) => {
      const update = { stage: 'Declined' }
      if (lost_reason) update.lost_reason = lost_reason
      const { error } = await supabase.from('deals').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      toast({ title: 'Deal declined', type: 'warning' })
    },
    onError: (err) => toast({ title: 'Error declining deal', description: err.message, type: 'error' }),
  })

  // Bulk operations
  async function bulkDelete() {
    if (!selectedDeals.size) return
    if (!confirm(`Delete ${selectedDeals.size} deal${selectedDeals.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    for (const id of selectedDeals) {
      await supabase.from('deals').delete().eq('id', id)
    }
    setSelectedDeals(new Set())
    setBulkMode(false)
    queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
    toast({ title: `${selectedDeals.size} deals deleted`, type: 'success' })
  }

  async function bulkChangeStage(stage) {
    if (!selectedDeals.size) return
    for (const id of selectedDeals) {
      await supabase.from('deals').update({ stage }).eq('id', id)
    }
    setSelectedDeals(new Set())
    queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
    toast({ title: `${selectedDeals.size} deals moved to ${stage}`, type: 'success' })
  }

  async function autoCategorize() {
    const uncategorized = (deals || []).filter(d => !d.sub_industry)
    if (uncategorized.length === 0) { toast({ title: 'All deals already categorized', type: 'success' }); return }
    let updated = 0
    for (const deal of uncategorized) {
      const category = guessCategory(deal.brand_name, '')
      if (category && category !== 'Misc') {
        await supabase.from('deals').update({ sub_industry: category }).eq('id', deal.id)
        updated++
      }
    }
    queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
    toast({ title: `${updated} deals categorized`, type: 'success' })
  }

  async function bulkDeleteAll() {
    if (!confirm(`DELETE ALL ${activeDeals.length} active deals? This cannot be undone.`)) return
    if (!confirm('Are you absolutely sure? This deletes everything in your pipeline.')) return
    const { error } = await supabase.from('deals').delete().eq('property_id', propertyId).neq('stage', 'Declined')
    if (error) { toast({ title: 'Error', description: error.message, type: 'error' }); return }
    queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
    toast({ title: 'All deals deleted', type: 'success' })
  }

  function toggleSelectDeal(id) {
    setSelectedDeals(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selectedDeals.size === activeDeals.length) {
      setSelectedDeals(new Set())
    } else {
      setSelectedDeals(new Set(activeDeals.map(d => d.id)))
    }
  }

  // Inline field update (for double-click editing in table)
  const inlineUpdateMutation = useMutation({
    mutationFn: async ({ id, field, value }) => {
      const update = { [field]: value === '' ? null : value }
      // Build contact_name when updating first/last
      if (field === 'contact_first_name' || field === 'contact_last_name') {
        const deal = deals?.find(d => d.id === id)
        const first = field === 'contact_first_name' ? value : (deal?.contact_first_name || '')
        const last = field === 'contact_last_name' ? value : (deal?.contact_last_name || '')
        update.contact_name = [first, last].filter(Boolean).join(' ')
      }
      const { error } = await supabase.from('deals').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', propertyId] }),
    onError: (err) => toast({ title: 'Error updating field', description: err.message, type: 'error' }),
  })

  function handleDragEnd(result) {
    if (!result.destination) return
    const dealId = result.draggableId
    const newStage = result.destination.droppableId
    const oldStage = result.source.droppableId
    if (oldStage === newStage) return
    updateStageMutation.mutate({ id: dealId, stage: newStage, oldStage })
  }

  // Filter out Declined deals from the active pipeline
  // Include deals with no stage (default to Prospect) and exclude Declined
  const activeDealsRaw = (deals || []).filter((d) => d.stage !== 'Declined').map(d => ({
    ...d,
    stage: d.stage || 'Prospect', // Default null stage to Prospect
  }))

  // Category filter
  const activeDealsAfterCategory = filterCategory
    ? activeDealsRaw.filter(d => guessCategory(d.brand_name, d.sub_industry) === filterCategory)
    : activeDealsRaw

  // Column filters
  const activeDealsFiltered = Object.keys(columnFilters).length > 0
    ? activeDealsAfterCategory.filter(d => {
        for (const [col, val] of Object.entries(columnFilters)) {
          if (!val) continue
          const lower = val.toLowerCase()
          if (col === 'brand_name') {
            if (!(d.brand_name || '').toLowerCase().includes(lower)) return false
          } else if (col === 'category') {
            if (guessCategory(d.brand_name, d.sub_industry) !== val) return false
          } else if (col === 'contact_name') {
            const name = `${d.contact_first_name || ''} ${d.contact_last_name || ''}`.trim()
            if (!name.toLowerCase().includes(lower)) return false
          } else if (col === 'contact_email') {
            if (!(d.contact_email || '').toLowerCase().includes(lower)) return false
          } else if (col === 'value') {
            const numVal = Number(d.value) || 0
            const filterNum = Number(val.replace(/[$,]/g, ''))
            if (!isNaN(filterNum) && numVal < filterNum) return false
          } else if (col === 'stage') {
            if (d.stage !== val) return false
          } else if (col === 'priority') {
            if (d.priority !== val) return false
          } else if (col === 'source') {
            if (d.source !== val) return false
          }
        }
        return true
      })
    : activeDealsAfterCategory

  const setColumnFilter = (col, val) => {
    setColumnFilters(prev => {
      const next = { ...prev }
      if (val) next[col] = val; else delete next[col]
      return next
    })
  }
  const activeColumnFilterCount = Object.values(columnFilters).filter(Boolean).length

  // Sorting
  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }

  const activeDeals = [...activeDealsFiltered].sort((a, b) => {
    if (!sortField) return 0
    let aVal, bVal
    if (sortField === 'value') {
      aVal = Number(a.value) || 0; bVal = Number(b.value) || 0
    } else if (sortField === 'priority') {
      aVal = PRIORITY_ORDER[a.priority] ?? 3; bVal = PRIORITY_ORDER[b.priority] ?? 3
    } else if (sortField === 'stage') {
      aVal = ALL_STAGES.indexOf(a.stage); bVal = ALL_STAGES.indexOf(b.stage)
    } else if (sortField === 'category') {
      aVal = guessCategory(a.brand_name, a.sub_industry); bVal = guessCategory(b.brand_name, b.sub_industry)
    } else if (sortField === 'date_added') {
      aVal = a.date_added || ''; bVal = b.date_added || ''
    } else if (sortField === 'score') {
      aVal = getDealScore(a); bVal = getDealScore(b)
    } else {
      aVal = (a[sortField] || '').toString().toLowerCase()
      bVal = (b[sortField] || '').toString().toLowerCase()
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = activeDeals.filter((d) => d.stage === stage)
    return acc
  }, {})

  const totalValue = activeDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
  const declinedCount = (deals || []).filter((d) => d.stage === 'Declined').length || 0
  const priorityColor = { High: 'text-danger', Medium: 'text-warning', Low: 'text-text-muted' }

  // Get unique categories in current deals for the filter
  const dealCategories = [...new Set(activeDealsRaw.map(d => guessCategory(d.brand_name, d.sub_industry)))].sort()

  return (
    <div className="space-y-4 sm:space-y-6">
      <Breadcrumbs items={[
        { label: 'CRM & Prospecting', to: '/app' },
        { label: `${t.deal || 'Deal'} Pipeline` },
      ]} />

      <SavedViewsBar
        appliesTo="deal"
        currentFilters={columnFilters}
        onApply={(filters) => setColumnFilters(filters || {})}
      />

      <BulkEditBar
        selectedIds={Array.from(bulkSelectedIds)}
        onClear={() => setBulkSelectedIds(new Set())}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">{t.deal || 'Deal'} Pipeline</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            {activeDeals.length} active deals &middot; ${(totalValue / 1000).toFixed(0)}K pipeline
            {declinedCount > 0 && <span className="text-text-muted"> &middot; {declinedCount} declined</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex bg-bg-card rounded overflow-hidden border border-border">
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'kanban' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>Board</button>
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'table' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>Table</button>
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-bg-surface border border-border rounded px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent"
          >
            <option value="">All Categories</option>
            {dealCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {filterCategory && (
            <button onClick={() => setFilterCategory('')} className="text-xs text-text-muted hover:text-accent">Clear</button>
          )}
          {viewMode === 'table' && (
            <button
              onClick={() => { setShowColumnFilters(!showColumnFilters); if (showColumnFilters) setColumnFilters({}) }}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${showColumnFilters ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-bg-surface border-border text-text-muted hover:text-text-primary'}`}
            >
              Filters{activeColumnFilterCount > 0 ? ` (${activeColumnFilterCount})` : ''}
            </button>
          )}
          {activeColumnFilterCount > 0 && (
            <button onClick={() => setColumnFilters({})} className="text-xs text-text-muted hover:text-accent">Clear Filters</button>
          )}
          <button
            onClick={() => setShowProspectFinder(true)}
            className="bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded text-sm font-medium hover:bg-accent/20 transition-colors"
          >
            Find {t.prospect || 'Prospect'}s
          </button>
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedDeals(new Set()) }}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${bulkMode ? 'bg-danger/10 border border-danger/30 text-danger' : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'}`}
          >
            {bulkMode ? 'Cancel' : 'Bulk Edit'}
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="bg-bg-surface border border-border text-text-secondary px-3 py-2 rounded text-sm font-medium hover:text-text-primary hover:border-accent/50 transition-colors"
          >
            Paste List
          </button>
          <button
            onClick={() => setShowCSVImport(true)}
            className="bg-bg-surface border border-border text-text-secondary px-3 py-2 rounded text-sm font-medium hover:text-text-primary hover:border-accent/50 transition-colors"
          >
            CSV Import
          </button>
          {(profile?.role === 'developer' || profile?.role === 'admin') && (
            <button
              onClick={() => setShowCRMImporter(true)}
              className="bg-accent/10 border border-accent/30 text-accent px-3 py-2 rounded text-sm font-medium hover:bg-accent/20 transition-colors"
            >
              Full Import
            </button>
          )}
          <button
            onClick={() => { setEditingDeal(null); setShowForm(true) }}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          >
            + New Deal
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {bulkMode && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs text-accent hover:underline font-medium">
              {selectedDeals.size === activeDeals.length ? 'Deselect All' : `Select All (${activeDeals.length})`}
            </button>
            <span className="text-xs text-text-muted font-mono">{selectedDeals.size} selected</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              onChange={(e) => { if (e.target.value) bulkChangeStage(e.target.value); e.target.value = '' }}
              disabled={!selectedDeals.size}
              className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent disabled:opacity-50"
              defaultValue=""
            >
              <option value="" disabled>Move to stage...</option>
              {['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed', 'Declined'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={bulkDelete}
              disabled={!selectedDeals.size}
              className="bg-danger/10 text-danger border border-danger/30 px-3 py-1.5 rounded text-xs font-medium hover:bg-danger/20 disabled:opacity-50"
            >
              Delete Selected ({selectedDeals.size})
            </button>
            <button
              onClick={autoCategorize}
              className="bg-accent/10 text-accent border border-accent/30 px-3 py-1.5 rounded text-xs font-medium hover:bg-accent/20"
            >
              Auto-Categorize
            </button>
            <button
              onClick={bulkDeleteAll}
              className="bg-danger text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90"
            >
              Delete All Deals
            </button>
          </div>
        </div>
      )}

      {/* Pipeline Health Metrics */}
      {activeDeals.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Weighted Pipeline</div>
            <div className="text-lg font-semibold text-accent font-mono">
              ${(activeDeals.reduce((s, d) => s + (Number(d.value) || 0) * ((d.win_probability || STAGE_PROBABILITY[d.stage] || 0) / 100), 0) / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Avg Deal Size</div>
            <div className="text-lg font-semibold text-text-primary font-mono">
              ${(totalValue / (activeDeals.length || 1) / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Win Rate</div>
            <div className="text-lg font-semibold text-success font-mono">
              {deals ? Math.round((deals.filter(d => ['Contracted','In Fulfillment','Renewed'].includes(d.stage)).length / (deals.filter(d => d.stage !== 'Declined').length || 1)) * 100) : 0}%
            </div>
            <div className="text-[10px] text-text-muted font-mono mt-0.5">
              {(deals || []).filter(d => ['Contracted','In Fulfillment','Renewed'].includes(d.stage)).length || 0}/{(deals || []).filter(d => d.stage !== 'Declined').length || 0} prospects
            </div>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Avg Deal Age</div>
            <div className="text-lg font-semibold text-text-primary font-mono">
              {Math.round(activeDeals.reduce((s, d) => s + getDealAge(d), 0) / (activeDeals.length || 1))}d
            </div>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Stale Deals</div>
            <div className={`text-lg font-semibold font-mono ${activeDeals.filter(isStale).length > 0 ? 'text-warning' : 'text-success'}`}>
              {activeDeals.filter(isStale).length}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : (deals?.length || 0) === 0 ? (
        <EmptyState
          title="No deals yet"
          description="Your pipeline starts here. Add a prospect manually, or use Find Prospects to surface real companies that match your ICP."
          primaryAction={
            <Button size="lg" onClick={() => { setEditingDeal(null); setShowForm(true) }}>
              + Add your first deal
            </Button>
          }
          secondaryAction={
            <Button size="lg" variant="secondary" onClick={() => setShowProspectFinder(true)}>
              Find Prospects
            </Button>
          }
        />
      ) : viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none">
            {STAGES.map((stage) => (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-w-[260px] sm:min-w-[200px] flex-1 bg-bg-surface border rounded-lg p-3 transition-colors snap-center ${
                      snapshot.isDraggingOver ? 'border-accent/40' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-text-muted uppercase">{stage}</span>
                      <span className="text-xs font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">
                        {dealsByStage[stage].length}
                      </span>
                    </div>
                    <div className="space-y-2 min-h-[100px]">
                      {dealsByStage[stage].map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setViewingDeal(deal)}
                              className={`bg-bg-card border border-border rounded p-3 cursor-pointer hover:border-accent/30 transition-colors ${
                                snapshot.isDragging ? 'shadow-lg border-accent/50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-text-primary font-medium truncate">{deal.brand_name}</div>
                                {isStale(deal) && <Badge tone="warning" className="text-[9px]" title="No activity in 14+ days">STALE</Badge>}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {deal.value && (
                                  <span className="text-xs text-accent font-mono">${Number(deal.value).toLocaleString()}</span>
                                )}
                                <span className="text-[10px] font-mono text-text-muted" title="Win probability">{deal.win_probability || STAGE_PROBABILITY[deal.stage] || 0}%</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {deal.contact_name && (
                                  <span className="text-xs text-text-muted truncate">{deal.contact_name}</span>
                                )}
                                {(contactsByDeal[deal.id]?.length || 0) > 1 && (
                                  <span className="text-[10px] font-mono text-accent bg-accent/10 px-1 rounded">+{contactsByDeal[deal.id].length - 1}</span>
                                )}
                                {deal.priority && (
                                  <span className={`text-[10px] font-mono ${priorityColor[deal.priority]}`}>{deal.priority}</span>
                                )}
                              </div>
                              {/* Score bar — pill on the right shows the numeric value */}
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <div className="flex-1 bg-bg-surface rounded-full h-1" title={`Deal score: ${getDealScore(deal)}/100`}>
                                  <div className="bg-accent rounded-full h-1 transition-all" style={{ width: `${getDealScore(deal)}%` }} />
                                </div>
                                <span className="text-[9px] font-mono text-text-muted shrink-0 tabular-nums">{getDealScore(deal)}</span>
                              </div>
                              <div className="flex gap-1 mt-1">
                                {deal.renewal_flag && (
                                  <Badge tone="warning" className="text-[9px]">RENEWAL</Badge>
                                )}
                                {deal.source && (
                                  <span className="text-[10px] font-mono text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">{deal.source}</span>
                                )}
                              </div>
                              <div className="flex gap-2 mt-2 pt-1 border-t border-border">
                                <button
                                  onClick={(e) => { e.stopPropagation(); const reason = prompt('Reason for declining?'); if (reason !== null) declineMutation.mutate({ id: deal.id, lost_reason: reason }) }}
                                  className="text-[10px] sm:text-[10px] text-xs text-text-muted hover:text-warning font-mono px-1 py-0.5 sm:p-0"
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (confirm('Permanently delete this deal?')) deleteMutation.mutate(deal.id) }}
                                  className="text-[10px] sm:text-[10px] text-xs text-text-muted hover:text-danger font-mono px-1 py-0.5 sm:p-0"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        /* Table View */
        <div className="bg-bg-surface border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {[
                  { key: 'brand_name', label: 'Brand' },
                  { key: 'category', label: 'Category' },
                  { key: 'contact_name', label: 'Contact' },
                  { key: 'contact_email', label: 'Email' },
                  { key: 'value', label: 'Value' },
                  { key: 'stage', label: 'Stage' },
                  { key: 'priority', label: 'Priority' },
                  { key: 'source', label: 'Source' },
                  { key: 'date_added', label: 'Added' },
                  { key: 'score', label: 'Score' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="px-4 py-3 text-xs text-text-muted font-mono uppercase cursor-pointer hover:text-accent select-none whitespace-nowrap"
                  >
                    {col.label}
                    {sortField === col.key && (
                      <span className="ml-1 text-accent">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Actions</th>
              </tr>
              {showColumnFilters && (
                <tr className="border-b border-border bg-bg-card/30">
                  <td className="px-2 py-2">
                    <input type="text" placeholder="Filter brand..." value={columnFilters.brand_name || ''} onChange={(e) => setColumnFilter('brand_name', e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent" />
                  </td>
                  <td className="px-2 py-2">
                    <select value={columnFilters.category || ''} onChange={(e) => setColumnFilter('category', e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent">
                      <option value="">All</option>
                      {dealCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" placeholder="Filter contact..." value={columnFilters.contact_name || ''} onChange={(e) => setColumnFilter('contact_name', e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" placeholder="Filter email..." value={columnFilters.contact_email || ''} onChange={(e) => setColumnFilter('contact_email', e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" placeholder="Min $..." value={columnFilters.value || ''} onChange={(e) => setColumnFilter('value', e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-accent" />
                  </td>
                  <td className="px-2 py-2">
                    <select value={columnFilters.stage || ''} onChange={(e) => setColumnFilter('stage', e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent">
                      <option value="">All</option>
                      {ALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select value={columnFilters.priority || ''} onChange={(e) => setColumnFilter('priority', e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent">
                      <option value="">All</option>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select value={columnFilters.source || ''} onChange={(e) => setColumnFilter('source', e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent">
                      <option value="">All</option>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2"></td>
                </tr>
              )}
            </thead>
            <tbody>
              {activeDeals.map((deal) => {
                const category = guessCategory(deal.brand_name, deal.sub_industry)
                return (
                <tr key={deal.id} onClick={() => !bulkMode && setViewingDeal(deal)} className={`border-b border-border last:border-0 hover:bg-bg-card/50 cursor-pointer ${selectedDeals.has(deal.id) ? 'bg-accent/5' : ''}`}>
                  <td className="px-4 py-3 text-text-primary font-medium">
                    <div className="flex items-center gap-2">
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedDeals.has(deal.id)}
                          onChange={() => toggleSelectDeal(deal.id)}
                          className="accent-accent shrink-0"
                        />
                      )}
                      <EditableCell value={deal.brand_name} dealId={deal.id} field="brand_name" onSave={(v) => inlineUpdateMutation.mutate(v)} />
                    </div>
                    {deal.assigned_to && userNameMap[deal.assigned_to] && (
                      <div className="text-[9px] text-text-muted font-mono mt-0.5 pl-0.5">{userNameMap[deal.assigned_to]}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <EditableCell value={deal.sub_industry || category} dealId={deal.id} field="sub_industry" onSave={(v) => inlineUpdateMutation.mutate(v)} options={INDUSTRY_CATEGORIES} className="text-[11px] font-mono text-text-muted" />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <EditableCell value={deal.contact_name} dealId={deal.id} field="contact_first_name" onSave={(v) => inlineUpdateMutation.mutate(v)} />
                    {(contactsByDeal[deal.id]?.length || 0) > 1 && (
                      <span className="ml-1 text-[10px] font-mono text-accent bg-accent/10 px-1 rounded">+{contactsByDeal[deal.id].length - 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    <EditableCell value={deal.contact_email} dealId={deal.id} field="contact_email" onSave={(v) => inlineUpdateMutation.mutate(v)} />
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <EditableCell value={deal.value} dealId={deal.id} field="value" type="number" onSave={(v) => inlineUpdateMutation.mutate(v)} className="text-accent" format={(v) => v ? `$${Number(v).toLocaleString()}` : '—'} />
                    {deal.annual_values && Object.keys(deal.annual_values).length > 1 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {Object.entries(deal.annual_values).map(([yr, val]) => (
                          <span key={yr} className="text-[9px] font-mono text-text-muted" title={`${yr}: $${Number(val).toLocaleString()}`}>
                            {yr.slice(2)}:${(Number(val)/1000).toFixed(0)}K
                          </span>
                        ))}
                      </div>
                    )}
                    {deal.is_multi_year && deal.deal_years > 1 && (
                      <span className="text-[9px] font-mono text-accent/60">{deal.deal_years}yr</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <EditableCell value={deal.stage} dealId={deal.id} field="stage" onSave={(v) => inlineUpdateMutation.mutate(v)} options={ALL_STAGES} className="text-xs font-mono bg-bg-card px-2 py-0.5 rounded text-text-secondary" />
                  </td>
                  <td className="px-4 py-3">
                    <EditableCell value={deal.priority} dealId={deal.id} field="priority" onSave={(v) => inlineUpdateMutation.mutate(v)} options={PRIORITIES} className={`text-xs font-mono ${priorityColor[deal.priority] || 'text-text-muted'}`} />
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    <EditableCell value={deal.source} dealId={deal.id} field="source" onSave={(v) => inlineUpdateMutation.mutate(v)} options={SOURCES} />
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs font-mono">
                    <EditableCell value={deal.date_added} dealId={deal.id} field="date_added" type="date" onSave={(v) => inlineUpdateMutation.mutate(v)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-bg-surface rounded-full h-1.5" title={`Score: ${getDealScore(deal)}/100`}>
                      <div className="bg-accent rounded-full h-1.5 transition-all" style={{ width: `${getDealScore(deal)}%` }} />
                    </div>
                    <div className="text-[10px] text-text-muted font-mono text-center mt-0.5">{getDealScore(deal)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingDeal(deal); setShowForm(true) }} className="text-xs text-text-muted hover:text-accent">Edit</button>
                      <button onClick={() => { const reason = prompt('Reason for declining?'); if (reason !== null) declineMutation.mutate({ id: deal.id, lost_reason: reason }) }} className="text-xs text-text-muted hover:text-warning">Decline</button>
                      <button onClick={() => { if (confirm('Permanently delete this deal?')) deleteMutation.mutate(deal.id) }} className="text-xs text-text-muted hover:text-danger">Delete</button>
                    </div>
                  </td>
                </tr>
                )
              })}
              {activeDeals.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center">
                    <div className="text-text-muted text-sm mb-3">No active deals yet.</div>
                    <a
                      href="/app/crm/migrate"
                      className="inline-block bg-accent text-bg-primary font-semibold px-4 py-2 rounded text-xs hover:opacity-90"
                    >
                      Migrate from existing system →
                    </a>
                    <div className="text-[10px] text-text-muted mt-2">
                      Bringing contracts in from another system? Import them all at once.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <DealForm
          deal={editingDeal}
          dealContacts={editingDeal ? (contactsByDeal[editingDeal.id] || []) : []}
          propertyId={propertyId}
          profileId={profile?.id}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => { setShowForm(false); setEditingDeal(null) }}
          saving={saveMutation.isPending}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          propertyId={propertyId}
          onClose={() => setShowBulkImport(false)}
          onImported={(count) => {
            queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
            toast({ title: `${count} prospects imported`, type: 'success' })
            setShowBulkImport(false)
          }}
        />
      )}

      {showProspectFinder && (
        <ProspectFinder
          propertyId={propertyId}
          onClose={() => setShowProspectFinder(false)}
          onAdded={(count) => {
            queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
            queryClient.invalidateQueries({ queryKey: ['contacts', propertyId] })
            toast({ title: `${count} prospect${count !== 1 ? 's' : ''} added to pipeline`, type: 'success' })
          }}
        />
      )}

      {viewingDeal && (
        <DealViewer
          deal={viewingDeal}
          contacts={contactsByDeal[viewingDeal.id] || []}
          onClose={() => setViewingDeal(null)}
          onEdit={() => { setEditingDeal(viewingDeal); setShowForm(true); setViewingDeal(null) }}
          userNameMap={userNameMap}
        />
      )}

      {showCSVImport && (
        <CSVImportWizard
          onClose={() => setShowCSVImport(false)}
          onImported={(count) => {
            queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
            toast({ title: `${count} deals imported from CSV`, type: 'success' })
            setShowCSVImport(false)
          }}
        />
      )}

      {showCRMImporter && (
        <Suspense fallback={null}>
          <CRMDataImporter
            onClose={() => setShowCRMImporter(false)}
            onImported={(count) => {
              queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
              queryClient.invalidateQueries({ queryKey: ['contacts', propertyId] })
              toast({ title: `${count} records imported`, type: 'success' })
              setShowCRMImporter(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

// Inline editable cell — double-click to edit, Enter/blur to save
function EditableCell({ value, dealId, field, onSave, className, format, type = 'text', options }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function save() {
    setEditing(false)
    const trimmed = String(draft).trim()
    if (trimmed !== (value || '')) {
      onSave({ id: dealId, field, value: type === 'number' ? (trimmed ? Number(trimmed.replace(/[$,]/g, '')) : '') : trimmed })
    }
  }

  if (editing) {
    if (options) {
      return (
        <select
          ref={inputRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          className="bg-bg-card border border-accent rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none w-full"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'text' : type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        className="bg-bg-card border border-accent rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none w-full"
      />
    )
  }

  const display = format ? format(value) : (value || '—')
  return (
    <span
      onDoubleClick={() => { setDraft(value || ''); setEditing(true) }}
      className={`cursor-text hover:bg-accent/5 rounded px-0.5 -mx-0.5 ${className || ''}`}
      title="Double-click to edit"
    >
      {display}
    </span>
  )
}

/* ============ Deal Viewer (Read-Only) ============ */

// Compact relative-time helper for "Last emailed N ago" labels.
// Keeps the call-site terse; not exported because every other
// surface that needs this would re-derive from useNowMinute().
function relTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  const ago = Date.now() - t
  if (ago < 60_000) return 'just now'
  if (ago < 3_600_000) return `${Math.floor(ago / 60_000)}m ago`
  if (ago < 86_400_000) return `${Math.floor(ago / 3_600_000)}h ago`
  if (ago < 7 * 86_400_000) return `${Math.floor(ago / 86_400_000)}d ago`
  return new Date(iso).toLocaleDateString()
}

function DealViewer({ deal, contacts, onClose, onEdit, userNameMap = {} }) {
  const navigate = useNavigate()
  const composeEmail = useComposeEmail()
  const { toast } = useToast()
  const { profile } = useAuth()
  const [shareCopied, setShareCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [enrichingCompany, setEnrichingCompany] = useState(false)
  const [verifyingEmail, setVerifyingEmail] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [warmPathContact, setWarmPathContact] = useState(null)
  const [personalityContact, setPersonalityContact] = useState(null)
  const queryClient = useQueryClient()
  const viewerPlanLimits = usePlanLimits()
  const propertyId = deal.property_id
  const priorityColor = { High: 'text-danger', Medium: 'text-warning', Low: 'text-text-muted' }
  const stageTone = {
    Prospect: 'neutral',
    'Proposal Sent': 'warning',
    Negotiation: 'accent',
    Contracted: 'success',
    'In Fulfillment': 'success',
    Renewed: 'success',
    Declined: 'danger',
  }

  async function handleEnrichCompany() {
    if (!viewerPlanLimits.canUse('contact_research')) {
      toast({ title: 'Upgrade required', description: 'Verified contact lookups require a paid plan.', type: 'warning' })
      return
    }
    setEnrichingCompany(true)
    const isExempt = viewerPlanLimits.plan === 'enterprise' || viewerPlanLimits.plan === 'developer'
    if (!isExempt) viewerPlanLimits.trackUsage('contact_research')
    try {
      const res = await apolloEnrichCompany({ company_name: deal.brand_name, domain: deal.website, property_id: propertyId })
      if (res?.data) {
        const d = res.data
        const updates = {}
        if (d.website && !deal.website) updates.website = d.website
        if (d.linkedin_url && !deal.linkedin) updates.linkedin = d.linkedin_url
        if (d.city && !deal.city) updates.city = d.city
        if (d.state && !deal.state) updates.state = d.state
        if (d.industry && !deal.sub_industry) updates.sub_industry = d.industry
        if (d.estimated_num_employees) updates.employees = d.estimated_num_employees
        if (d.annual_revenue) updates.revenue_thousands = Math.round(d.annual_revenue / 1000)
        if (d.founded_year) updates.founded = d.founded_year
        if (Object.keys(updates).length > 0) {
          await supabase.from('deals').update(updates).eq('id', deal.id)
          queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
        }
        toast({ title: 'Company enriched via Apollo', description: `${d.estimated_num_employees || '?'} employees, ${d.industry || 'unknown'}`, type: 'success' })
      } else {
        toast({ title: 'No data found', description: 'Apollo returned no results for this company', type: 'warning' })
      }
    } catch (e) { toast({ title: 'Enrichment failed', description: e.message, type: 'error' }) }
    setEnrichingCompany(false)
  }

  // Enroll a contact into the property's default 3-touch sequence.
  // Lazily creates the sequence the first time. Sets next_send_at = now()
  // so the cron picks it up on the next run; pauses automatically if
  // the contact replies (handled by the autopause_sequence_on_reply trigger).
  async function handleStartSequence(contactId) {
    if (!contactId) return
    try {
      const { data: seqId, error: seqErr } = await supabase
        .rpc('ensure_default_prospect_sequence', { p_property_id: propertyId })
      if (seqErr) throw seqErr
      const { error: enrErr } = await supabase
        .from('prospect_sequence_enrollments')
        .insert({
          sequence_id: seqId,
          property_id: propertyId,
          contact_id: contactId,
          deal_id: deal.id || null,
          enrolled_by: profile?.id,
          current_step: 0,
          next_send_at: new Date().toISOString(),
        })
      if (enrErr) {
        if (enrErr.code === '23505') {
          toast({ title: 'Already enrolled', description: 'This contact is already in the 3-touch sequence.', type: 'info' })
          return
        }
        throw enrErr
      }
      toast({ title: 'Sequence started', description: 'First email will go out within 15 minutes.', type: 'success' })
    } catch (e) {
      toast({ title: 'Could not start sequence', description: humanError(e), type: 'error' })
    }
  }

  // Click-to-call via Twilio. Prompts for the rep's phone number
  // (Twilio bridges from there to the contact). User's phone is
  // remembered in localStorage so they only enter it once per device.
  async function handleTwilioCall(contact) {
    if (!contact?.phone) return
    let userPhone = ''
    try { userPhone = localStorage.getItem('ll.user-phone') || '' } catch { /* private mode */ }
    if (!userPhone) {
      userPhone = prompt('Your phone number (we call you first, then bridge to the contact):') || ''
      if (!userPhone) return
      try { localStorage.setItem('ll.user-phone', userPhone) } catch { /* ignore */ }
    }
    try {
      const { data, error } = await supabase.functions.invoke('twilio-call', {
        body: { to: contact.phone, from: userPhone, contact_id: contact.id, deal_id: deal.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast({ title: 'Calling…', description: `Twilio is dialing ${userPhone}, then bridging to ${contact.phone}.`, type: 'success' })
    } catch (e) {
      toast({ title: 'Call failed', description: humanError(e), type: 'error' })
    }
  }

  async function handleVerifyEmail(contactId, email) {
    if (!viewerPlanLimits.canUse('contact_research')) {
      toast({ title: 'Upgrade required', description: 'Email verification requires a paid plan.', type: 'warning' })
      return
    }
    setVerifyingEmail(contactId)
    const isExempt = viewerPlanLimits.plan === 'enterprise' || viewerPlanLimits.plan === 'developer'
    if (!isExempt) viewerPlanLimits.trackUsage('contact_research')
    try {
      const res = await hunterVerifyEmail({ email, property_id: propertyId })
      const status = res?.status || res?.result || 'unknown'
      await supabase.from('contacts').update({ email_verified: status, email_verified_at: new Date().toISOString() }).eq('id', contactId)
      queryClient.invalidateQueries({ queryKey: ['contacts', propertyId] })
      toast({ title: `Email ${status}`, description: email, type: status === 'verified' ? 'success' : 'warning' })
    } catch (e) { toast({ title: 'Verification failed', description: e.message, type: 'error' }) }
    setVerifyingEmail(null)
  }

  const handleShare = async () => {
    try {
      setSharing(true)
      // Check for existing active link
      const { data: existing } = await supabase
        .from('sponsor_portal_links')
        .select('token')
        .eq('deal_id', deal.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle()
      let linkToken = existing?.token
      if (!linkToken) {
        const { data: created, error } = await supabase
          .from('sponsor_portal_links')
          .insert({ deal_id: deal.id, property_id: propertyId, created_by: profile?.id })
          .select('token')
          .single()
        if (error) throw error
        linkToken = created.token
      }
      const url = `${window.location.origin}/sponsor/${linkToken}`
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      toast({ title: 'Sponsor link copied to clipboard!', type: 'success' })
      setTimeout(() => setShareCopied(false), 3000)
    } catch (err) {
      console.error('Share error:', err)
      toast({ title: 'Failed to create share link', type: 'error' })
    } finally {
      setSharing(false)
    }
  }

  // Fetch contracts linked to this deal
  const { data: dealContracts } = useQuery({
    queryKey: ['deal-contracts', deal.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('id, brand_name, status, signed, effective_date, expiration_date, total_value, contract_benefits(*)').eq('deal_id', deal.id)
      if (error) console.warn('Deal contracts query error:', error.message)
      return data || []
    },
    enabled: !!deal.id,
  })

  // Fetch assets linked via deal_assets OR sourced from this deal's contracts
  const { data: dealAssets } = useQuery({
    queryKey: ['deal-assets-viewer', deal.id, dealContracts],
    queryFn: async () => {
      const allAssets = []
      const seen = new Set()
      // Get assets from deal_assets join table
      const { data: fromDealAssets } = await supabase.from('deal_assets').select('*, assets(id, name, category, base_price, quantity)').eq('deal_id', deal.id)
      for (const da of (fromDealAssets || [])) {
        if (da.assets && !seen.has(da.assets.id)) {
          seen.add(da.assets.id)
          allAssets.push({ ...da.assets, proposed_price: da.custom_price, is_proposed: da.is_proposed })
        }
      }
      // Get assets auto-created from contracts linked to this deal
      const contractIds = (dealContracts || []).map(c => c.id).filter(Boolean)
      if (contractIds.length > 0) {
        const { data: fromContracts } = await supabase.from('assets').select('id, name, category, base_price, quantity, from_contract, source_contract_id').in('source_contract_id', contractIds)
        for (const a of (fromContracts || [])) {
          if (!seen.has(a.id)) { seen.add(a.id); allAssets.push(a) }
        }
      }
      // Also get assets by property that are from any contract (fallback)
      if (allAssets.length === 0 && deal.property_id) {
        const { data: propAssets } = await supabase.from('assets').select('id, name, category, base_price, quantity, from_contract, source_contract_id').eq('property_id', deal.property_id).eq('from_contract', true).limit(50)
        for (const a of (propAssets || [])) {
          if (!seen.has(a.id)) { seen.add(a.id); allAssets.push(a) }
        }
      }
      return allAssets
    },
    enabled: !!deal.id,
  })

  // Fetch fulfillment records for this deal (or by contract if deal_id is null)
  const { data: dealFulfillment } = useQuery({
    queryKey: ['deal-fulfillment', deal.id, dealContracts],
    queryFn: async () => {
      // First try by deal_id
      const { data: byDeal } = await supabase.from('fulfillment_records').select('id, benefit_id, scheduled_date, delivered, delivered_date, contract_id, contract_benefits!fulfillment_records_benefit_id_fkey(benefit_description)').eq('deal_id', deal.id).order('scheduled_date')
      let records = byDeal || []
      // Also get fulfillment records linked to this deal's contracts (for deal-less records)
      const contractIds = (dealContracts || []).map(c => c.id).filter(Boolean)
      if (contractIds.length > 0) {
        const { data: byContract } = await supabase.from('fulfillment_records').select('id, benefit_id, scheduled_date, delivered, delivered_date, contract_id, contract_benefits!fulfillment_records_benefit_id_fkey(benefit_description)').in('contract_id', contractIds).order('scheduled_date')
        const existingIds = new Set(records.map(r => r.id))
        for (const r of (byContract || [])) {
          if (!existingIds.has(r.id)) records.push(r)
        }
      }
      return records
    },
    enabled: !!deal.id,
  })

  const fulfillmentDelivered = (dealFulfillment || []).filter(f => f.delivered).length || 0
  const fulfillmentTotal = dealFulfillment?.length || 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-viewer-title"
        className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-bg-surface z-10">
          <div className="flex-1 min-w-0">
            <h2 id="deal-viewer-title" className="text-lg font-semibold text-text-primary truncate">{deal.brand_name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge tone={stageTone[deal.stage] || 'neutral'}>{deal.stage}</Badge>
              {deal.priority && <span className={`text-[10px] font-mono ${priorityColor[deal.priority]}`}>{deal.priority}</span>}
              {deal.source && <span className="text-[10px] text-text-muted font-mono">{deal.source}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleEnrichCompany} disabled={enrichingCompany} className="inline-flex items-center gap-1 border border-border text-text-secondary px-2 py-1.5 rounded text-[11px] hover:border-accent/50 hover:text-accent disabled:opacity-50 transition-colors" title="Enrich company data with Apollo (1 token)">
              {enrichingCompany ? <span className="font-mono">...</span> : <><Search className="w-3 h-3" /> Enrich</>}
            </button>
            <button onClick={handleShare} disabled={sharing} className="border border-accent text-accent px-3 py-1.5 rounded text-xs font-medium hover:bg-accent/10 disabled:opacity-50">
              {sharing ? '...' : shareCopied ? 'Copied!' : 'Share'}
            </button>
            <button onClick={onEdit} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">Edit</button>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
          </div>
        </div>

        {/* Tab strip — dropdown on mobile, inline tabs on tablet+ */}
        {(() => {
          const tabs = [
            { id: 'overview',     label: 'Overview' },
            { id: 'contracts',    label: `Contracts${dealContracts?.length ? ` (${dealContracts.length})` : ''}` },
            { id: 'fulfillment',  label: `Fulfillment${fulfillmentTotal ? ` (${fulfillmentDelivered}/${fulfillmentTotal})` : ''}` },
            { id: 'activity',     label: 'Activity' },
          ]
          return (
            <>
              <div className="px-4 sm:hidden pt-3 pb-2 border-b border-border bg-bg-surface sticky top-[60px] z-[5]">
                <label className="sr-only" htmlFor="deal-viewer-tab-select">Section</label>
                <select
                  id="deal-viewer-tab-select"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="hidden sm:flex px-5 pt-3 border-b border-border gap-1 bg-bg-surface sticky top-[60px] z-[5]">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`text-sm font-medium px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
                      activeTab === t.id
                        ? 'text-accent border-accent'
                        : 'text-text-muted border-transparent hover:text-text-primary'
                    }`}
                    aria-current={activeTab === t.id ? 'page' : undefined}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )
        })()}

        <div className="p-4 sm:p-5 space-y-4">
          {activeTab === 'overview' && <>
          {/* Value + Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">            <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <div className="text-[10px] text-text-muted font-mono">Value</div>
              <div className="text-lg font-semibold text-accent font-mono">{deal.value ? `$${Number(deal.value).toLocaleString()}` : '—'}</div>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <div className="text-[10px] text-text-muted font-mono">Start</div>
              <div className="text-sm text-text-primary font-mono">{deal.start_date || '—'}</div>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <div className="text-[10px] text-text-muted font-mono">End</div>
              <div className="text-sm text-text-primary font-mono">{deal.end_date || '—'}</div>
            </div>
          </div>

          {/* Contacts */}
          <div>
            <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-2">Contacts ({contacts.length || (deal.contact_name ? 1 : 0)})</div>
            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map((c, i) => (
                  <div key={c.id || i} className="bg-bg-card border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-text-primary font-medium">{c.first_name} {c.last_name}</span>
                      {c.is_primary && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-accent text-bg-primary">Primary</span>}
                      {c.enriched_from === 'apollo' && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-success/10 text-success">✓ Apollo</span>}
                      {c.email_verified === 'verified' && <span className="text-[9px] font-mono text-success">✓ verified</span>}
                      {c.email_verified === 'invalid' && <span className="text-[9px] font-mono text-danger">✗ invalid</span>}
                      {c.email_verified === 'risky' && <span className="text-[9px] font-mono text-warning">⚠ risky</span>}
                    </div>
                    {c.position && <div className="text-xs text-text-secondary mt-0.5">{c.position}</div>}
                    {c.last_contacted_at && (
                      <div className="text-[10px] text-text-muted mt-0.5">
                        Last emailed {relTime(c.last_contacted_at)}
                      </div>
                    )}
                    <div className="flex gap-3 mt-1.5 flex-wrap items-center">
                      {c.email && (
                        <button
                          type="button"
                          onClick={() => composeEmail.open({
                            to: c.email,
                            dealId: deal.id,
                            defaultSubject: `Re: ${deal.brand_name || 'Sponsorship'}`,
                          })}
                          className="text-xs text-accent hover:underline font-medium"
                          title="Compose email"
                        >
                          ✉ {c.email}
                        </button>
                      )}
                      {c.email && c.id && !c.email_verified && (
                        <button
                          onClick={() => handleVerifyEmail(c.id, c.email)}
                          disabled={verifyingEmail === c.id}
                          className="text-[9px] font-mono text-text-muted hover:text-accent disabled:opacity-50"
                          title="Verify email with Hunter (1 token)"
                        >
                          {verifyingEmail === c.id ? '...' : '✉️ verify'}
                        </button>
                      )}
                      {c.email && c.id && (
                        <button
                          type="button"
                          onClick={() => handleStartSequence(c.id)}
                          className="text-[10px] font-mono text-text-muted hover:text-accent"
                          title="Enroll in the 3-touch warm-intro sequence"
                        >
                          ⚡ Start sequence
                        </button>
                      )}
                      {c.id && (
                        <button
                          type="button"
                          onClick={() => setWarmPathContact(c)}
                          className="text-[10px] font-mono text-text-muted hover:text-accent"
                          title="See if anyone on the team can warm-intro you"
                        >
                          🔗 Warm path
                        </button>
                      )}
                      {c.id && (
                        <button
                          type="button"
                          onClick={() => setPersonalityContact(c)}
                          className="text-[10px] font-mono text-text-muted hover:text-accent"
                          title="Generate a Crystal-style personality read"
                        >
                          🧠 Personality
                        </button>
                      )}
                      {c.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <a href={`tel:${c.phone}`} className="text-xs text-accent hover:underline">{c.phone}</a>
                          <button
                            type="button"
                            onClick={() => handleTwilioCall(c)}
                            className="text-[10px] font-mono text-text-muted hover:text-accent"
                            title="Place a recorded call via Twilio (auto-transcribed)"
                          >
                            📞 Call
                          </button>
                        </span>
                      )}
                      {c.linkedin && (
                        <a href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                          LinkedIn &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : deal.contact_name ? (
              <div className="bg-bg-card border border-border rounded-lg p-3">
                <span className="text-sm text-text-primary">{deal.contact_name}</span>
                {deal.contact_position && <div className="text-xs text-text-secondary mt-0.5">{deal.contact_position}</div>}
                <div className="flex gap-3 mt-1.5 flex-wrap">
                  {deal.contact_email && (
                    <button
                      type="button"
                      onClick={() => composeEmail.open({
                        to: deal.contact_email,
                        dealId: deal.id,
                        defaultSubject: `Re: ${deal.brand_name || 'Sponsorship'}`,
                      })}
                      className="text-xs text-accent hover:underline font-medium"
                    >
                      ✉ {deal.contact_email}
                    </button>
                  )}
                  {deal.contact_phone && <a href={`tel:${deal.contact_phone}`} className="text-xs text-accent hover:underline">{deal.contact_phone}</a>}
                </div>
              </div>
            ) : (
              <div className="text-xs text-text-muted bg-bg-card rounded-lg p-3 text-center">No contacts yet</div>
            )}
          </div>

          {/* Buying Committee — multi-stakeholder map per deal */}
          {contacts.length > 0 && (
            <div>
              <BuyingCommittee dealId={deal.id} propertyId={propertyId} contacts={contacts} />
            </div>
          )}

          {/* Account Brief — one-click 1-page intelligence summary */}
          <div>
            <AccountBrief deal={deal} contacts={contacts} />
          </div>

          {/* Portal engagement — time on each portal section */}
          <div>
            <PortalEngagement dealId={deal.id} />
          </div>

          {/* Team comments — threaded discussion + @-mentions */}
          <div>
            <DealComments dealId={deal.id} propertyId={propertyId} />
          </div>

          {/* Company Info */}
          {(deal.city || deal.state || deal.website || deal.linkedin || deal.sub_industry) && (
            <div>
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-2">Company Info</div>
              <div className="bg-bg-card border border-border rounded-lg p-3 space-y-1.5">
                {deal.sub_industry && <div className="text-xs text-text-secondary"><span className="text-text-muted">Industry:</span> {deal.sub_industry}</div>}
                {(deal.city || deal.state) && <div className="text-xs text-text-secondary"><span className="text-text-muted">Location:</span> {[deal.city, deal.state].filter(Boolean).join(', ')}</div>}
                {deal.website && (
                  <div className="text-xs">
                    <span className="text-text-muted">Website: </span>
                    <a href={deal.website.startsWith('http') ? deal.website : `https://${deal.website}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{deal.website}</a>
                  </div>
                )}
                {deal.linkedin && (
                  <div className="text-xs">
                    <span className="text-text-muted">LinkedIn: </span>
                    <a href={deal.linkedin.startsWith('http') ? deal.linkedin : `https://${deal.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Company Page &rarr;</a>
                  </div>
                )}
                {deal.employees && <div className="text-xs text-text-secondary"><span className="text-text-muted">Employees:</span> {deal.employees}</div>}
                {deal.revenue_thousands && <div className="text-xs text-text-secondary"><span className="text-text-muted">Revenue:</span> ${Number(deal.revenue_thousands).toLocaleString()}K</div>}
              </div>
            </div>
          )}

          {/* Deal Details */}
          <div>
            <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-2">Deal Details</div>
            <div className="bg-bg-card border border-border rounded-lg p-3 space-y-1.5">
              {deal.win_probability > 0 && <div className="text-xs text-text-secondary"><span className="text-text-muted">Win Probability:</span> {deal.win_probability}%</div>}
              {deal.expected_close_date && <div className="text-xs text-text-secondary"><span className="text-text-muted">Expected Close:</span> {deal.expected_close_date}</div>}
              {deal.renewal_date && <div className="text-xs text-text-secondary"><span className="text-text-muted">Renewal Date:</span> {deal.renewal_date}</div>}
              {deal.is_multi_year && <div className="text-xs text-text-secondary"><span className="text-text-muted">Multi-Year:</span> {deal.deal_years} years</div>}
              {deal.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {deal.tags.map((t, i) => <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-surface text-text-muted">{t}</span>)}
                </div>
              )}
              {deal.date_added && <div className="text-xs text-text-secondary"><span className="text-text-muted">Added:</span> {deal.date_added}</div>}
              {deal.assigned_to && (
                <div className="text-xs text-text-secondary"><span className="text-text-muted">Assigned To:</span> <span className="text-accent">{userNameMap[deal.assigned_to] || deal.assigned_to.slice(0, 8)}</span></div>
              )}
              {deal.account_lead_id && (
                <div className="text-xs text-text-secondary"><span className="text-text-muted">Account Lead:</span> <span className="text-accent">{userNameMap[deal.account_lead_id] || deal.account_lead_id.slice(0, 8)}</span></div>
              )}
              {deal.last_contacted && <div className="text-xs text-text-secondary"><span className="text-text-muted">Last Contacted:</span> {deal.last_contacted}</div>}
            </div>
          </div>

          {/* Notes */}
          {deal.notes && (
            <div>
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-2">Notes</div>
              <div className="bg-bg-card border border-border rounded-lg p-3 text-xs text-text-secondary whitespace-pre-wrap">{deal.notes}</div>
            </div>
          )}

          {/* Annual Revenue (multi-year) */}
          {deal.annual_values && Object.keys(deal.annual_values).length > 0 && (
            <div>
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-2">Revenue by Year</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(deal.annual_values).map(([year, val]) => (
                  <div key={year} className="bg-bg-card border border-border rounded p-2 text-center">
                    <div className="text-[10px] text-text-muted font-mono">{year}</div>
                    <div className="text-sm text-accent font-mono">${Number(val).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>}

          {activeTab === 'contracts' && <>
          {/* Contracts */}
          {dealContracts?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Contracts ({dealContracts.length})</div>
                <button onClick={() => { onClose(); navigate('/app/crm/contracts') }} className="text-[10px] text-accent hover:underline">View all &rarr;</button>
              </div>
              <div className="space-y-2">
                {dealContracts.map(c => (
                  <div key={c.id} className="bg-bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-accent/30 transition-colors" onClick={() => { onClose(); navigate('/app/crm/contracts') }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-primary font-medium">{c.brand_name || 'Contract'}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${c.signed ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {c.status || (c.signed ? 'Signed' : 'Draft')}
                      </span>
                    </div>
                    {c.total_value && <div className="text-xs text-accent font-mono mt-1">${Number(c.total_value).toLocaleString()}</div>}
                    <div className="flex gap-3 mt-1 text-[10px] text-text-muted font-mono">
                      {c.effective_date && <span>Start: {c.effective_date}</span>}
                      {c.expiration_date && <span>End: {c.expiration_date}</span>}
                    </div>
                    {/* Contract Benefits */}
                    {c.contract_benefits?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-[10px] text-text-muted font-mono">Benefits ({c.contract_benefits.length}):</div>
                        {c.contract_benefits.slice(0, 5).map((b, i) => (
                          <div key={b.id || i} className="flex items-center justify-between text-[11px]">
                            <span className="text-text-secondary truncate mr-2">{b.benefit_description}</span>
                            <span className="text-text-muted font-mono shrink-0">
                              {b.quantity > 1 ? `${b.quantity}x` : ''}{b.value ? ` $${Number(b.value).toLocaleString()}` : ''}
                            </span>
                          </div>
                        ))}
                        {c.contract_benefits.length > 5 && <div className="text-[10px] text-text-muted">+{c.contract_benefits.length - 5} more</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assets */}
          {dealAssets?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Assets ({dealAssets.length})</div>
                <button onClick={() => { onClose(); navigate('/app/crm/assets') }} className="text-[10px] text-accent hover:underline">View catalog &rarr;</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dealAssets.map(a => (
                  <div key={a.id} className="bg-bg-card border border-border rounded-lg p-2.5 cursor-pointer hover:border-accent/30 transition-colors" onClick={() => { onClose(); navigate('/app/crm/assets') }}>
                    <div className="text-xs text-text-primary font-medium truncate">{a.name}</div>
                    <div className="text-[10px] text-text-muted font-mono">{a.category}</div>
                    {(a.base_price || a.proposed_price) && (
                      <div className="text-[10px] text-accent font-mono mt-0.5">
                        ${Number(a.proposed_price || a.base_price).toLocaleString()}
                        {a.quantity > 1 && ` x${a.quantity}`}
                      </div>
                    )}
                    {a.from_contract && <div className="text-[9px] font-mono text-text-muted mt-0.5">From contract</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          </>}

          {activeTab === 'fulfillment' && <>
          {/* Fulfillment */}
          {dealFulfillment?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
                  Fulfillment ({fulfillmentDelivered}/{fulfillmentTotal} delivered)
                </div>
                <button onClick={() => { onClose(); navigate('/app/crm/fulfillment') }} className="text-[10px] text-accent hover:underline">View tracker &rarr;</button>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-bg-card rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full transition-all ${fulfillmentDelivered === fulfillmentTotal ? 'bg-success' : 'bg-accent'}`} style={{ width: `${fulfillmentTotal ? (fulfillmentDelivered / fulfillmentTotal) * 100 : 0}%` }} />
              </div>
              <div className="space-y-1.5">
                {dealFulfillment.slice(0, 8).map(f => (
                  <div key={f.id} className="flex items-center justify-between text-[11px] py-1 border-b border-border last:border-0">
                    <span className={`truncate mr-2 ${f.delivered ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                      {f.contract_benefits?.benefit_description || 'Fulfillment item'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.scheduled_date && <span className="text-[10px] text-text-muted font-mono">{f.scheduled_date}</span>}
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${f.delivered ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {f.delivered ? 'Delivered' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
                {dealFulfillment.length > 8 && <div className="text-[10px] text-text-muted text-center py-1">+{dealFulfillment.length - 8} more items</div>}
              </div>
            </div>
          )}
          </>}

          {activeTab === 'overview' && !dealContracts?.length && !dealAssets?.length && !dealFulfillment?.length && (
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center space-y-2">
              <div className="text-xs text-text-muted">No contracts, assets, or fulfillment linked yet.</div>
              <div className="flex justify-center gap-3">
                <button onClick={() => { onClose(); navigate('/app/crm/contracts') }} className="text-[10px] text-accent hover:underline">Upload contract</button>
                <button onClick={() => { onClose(); navigate('/app/crm/assets') }} className="text-[10px] text-accent hover:underline">Add assets</button>
              </div>
            </div>
          )}

          {activeTab === 'fulfillment' && !dealFulfillment?.length && (
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center text-xs text-text-muted">
              No fulfillment records yet. Sign and upload a contract to start tracking benefits.
            </div>
          )}

          {activeTab === 'contracts' && !dealContracts?.length && (
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center space-y-2">
              <div className="text-xs text-text-muted">No contracts on this deal yet.</div>
              <button onClick={() => { onClose(); navigate('/app/crm/contracts') }} className="text-[10px] text-accent hover:underline">Upload contract</button>
            </div>
          )}

          {activeTab === 'activity' && (
            <ErrorBoundary>
              <DealActivityTimeline dealId={deal.id} propertyId={propertyId} />
            </ErrorBoundary>
          )}
        </div>
      </div>

      <WarmPathFinder
        open={!!warmPathContact}
        onClose={() => setWarmPathContact(null)}
        contact={warmPathContact}
        propertyId={propertyId}
      />

      <PersonalityProfile
        open={!!personalityContact}
        onClose={() => setPersonalityContact(null)}
        contact={personalityContact}
        propertyId={propertyId}
      />
    </div>
  )
}

function DealForm({ deal, dealContacts, propertyId, profileId, onSave, onCancel, saving }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const planLimits = usePlanLimits()
  const [activeTab, setActiveTab] = useState('contacts')
  const [enriching, setEnriching] = useState(null) // index of contact being enriched
  const [enrichResult, setEnrichResult] = useState(null)
  const [aiResearching, setAiResearching] = useState(false)
  const [aiResearchingMore, setAiResearchingMore] = useState(false)

  // Fetch available assets for proposal
  const { data: availableAssets } = useQuery({
    queryKey: ['assets', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('assets').select('id, name, category, base_price, quantity').eq('property_id', propertyId).eq('active', true)
      return data || []
    },
    enabled: !!propertyId,
  })

  // Fetch parent accounts + agencies so the deal form can link
  // a deal to its parent company / agency-of-record. Both are
  // optional; null is fine.
  const { data: accountsList = [] } = useQuery({
    queryKey: ['accounts-list', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase.from('accounts').select('id, name').eq('property_id', propertyId).order('name')
      return data || []
    },
  })
  const { data: agenciesList = [] } = useQuery({
    queryKey: ['agencies-list', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase.from('agencies').select('id, name').eq('property_id', propertyId).order('name')
      return data || []
    },
  })

  // Fetch custom field defs for the property so we can render
  // any property-specific columns inline in the form.
  const { data: customFieldDefs = [] } = useQuery({
    queryKey: ['custom-field-defs', propertyId, 'deal'],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_field_defs')
        .select('*')
        .eq('property_id', propertyId)
        .eq('applies_to', 'deal')
        .order('position', { ascending: true })
      return data || []
    },
  })

  // Fetch team members for assignment dropdown
  const { data: teamProfiles } = useQuery({
    queryKey: ['team-profiles', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, role').eq('property_id', propertyId)
      return data || []
    },
    enabled: !!propertyId,
  })

  // Fetch existing proposed assets for this deal
  const { data: existingDealAssets } = useQuery({
    queryKey: ['deal-assets', deal?.id],
    queryFn: async () => {
      const { data } = await supabase.from('deal_assets').select('*').eq('deal_id', deal.id)
      return data || []
    },
    enabled: !!deal?.id,
  })

  const [proposedAssets, setProposedAssets] = useState([])

  // Initialize proposed assets from existing deal_assets
  useEffect(() => {
    if (existingDealAssets?.length > 0) {
      setProposedAssets(existingDealAssets.map(da => ({
        asset_id: da.asset_id,
        quantity: da.quantity || 1,
        custom_price: da.custom_price || '',
        notes: da.notes || '',
        is_proposed: da.is_proposed ?? true,
      })))
    }
  }, [existingDealAssets])

  function toggleProposedAsset(assetId) {
    setProposedAssets(prev => {
      const exists = prev.find(pa => pa.asset_id === assetId)
      if (exists) return prev.filter(pa => pa.asset_id !== assetId)
      return [...prev, { asset_id: assetId, quantity: 1, custom_price: '', notes: '', is_proposed: true }]
    })
  }

  function updateProposedAsset(assetId, field, value) {
    setProposedAssets(prev => prev.map(pa =>
      pa.asset_id === assetId ? { ...pa, [field]: value } : pa
    ))
  }

  async function saveProposedAssets() {
    if (!deal?.id) return
    try {
      // Delete existing deal_assets for this deal
      await supabase.from('deal_assets').delete().eq('deal_id', deal.id)
      // Insert new ones
      if (proposedAssets.length > 0) {
        const rows = proposedAssets.map(pa => ({
          deal_id: deal.id,
          asset_id: pa.asset_id,
          quantity: pa.quantity || 1,
          custom_price: pa.custom_price || null,
          notes: pa.notes || null,
          is_proposed: true,
          proposed_at: new Date().toISOString(),
        }))
        await supabase.from('deal_assets').insert(rows)
      }
      queryClient.invalidateQueries({ queryKey: ['deal-assets', deal.id] })
      toast({ title: `${proposedAssets.length} proposed assets saved`, type: 'success' })
    } catch (e) { console.warn(e) 
      // deal_assets table columns may not exist yet
    }
  }

  const EMPTY_CONTACT = { first_name: '', last_name: '', email: '', email_verified: 'unknown', phone: '', position: '', company: '', city: '', state: '', linkedin: '', website: '', is_primary: false, enriched_from: null }

  // Initialize contacts from dealContacts (from contacts table) or fall back to deal's inline contact fields
  const initialContacts = dealContacts?.length > 0
    ? dealContacts.map(c => ({ ...EMPTY_CONTACT, ...c, first_name: c.first_name || '', last_name: c.last_name || '', email: c.email || '', phone: c.phone || '', position: c.position || '', company: c.company || '', city: c.city || '', state: c.state || '', linkedin: c.linkedin || '', website: c.website || '', is_primary: !!c.is_primary, email_verified: c.email_verified || 'unknown', enriched_from: c.enriched_from || null }))
    : [{
        ...EMPTY_CONTACT,
        first_name: deal?.contact_first_name || deal?.contact_name?.split(' ')[0] || '',
        last_name: deal?.contact_last_name || deal?.contact_name?.split(' ').slice(1).join(' ') || '',
        email: deal?.contact_email || '',
        phone: deal?.contact_phone || '',
        position: deal?.contact_position || '',
        company: deal?.contact_company || '',
        is_primary: true,
      }]

  const [contacts, setContacts] = useState(initialContacts)

  const [form, setForm] = useState({
    brand_name: deal?.brand_name || '',
    value: deal?.value || '',
    start_date: deal?.start_date ? String(deal.start_date).slice(0, 4) : '',
    end_date: deal?.end_date ? String(deal.end_date).slice(0, 4) : '',
    stage: deal?.stage || 'Prospect',
    source: deal?.source || '',
    priority: deal?.priority || 'Medium',
    renewal_flag: deal?.renewal_flag || false,
    win_probability: deal?.win_probability || '',
    expected_close_date: deal?.expected_close_date || '',
    tags: deal?.tags?.join(', ') || '',
    date_added: deal?.date_added || new Date().toISOString().split('T')[0],
    last_contacted: deal?.last_contacted || '',
    next_follow_up: deal?.next_follow_up || '',
    notes: deal?.notes || '',
    city: deal?.city || '',
    state: deal?.state || '',
    website: deal?.website || '',
    linkedin: deal?.linkedin || '',
    founded: deal?.founded || '',
    revenue_thousands: deal?.revenue_thousands || '',
    employees: deal?.employees || '',
    sub_industry: deal?.sub_industry || '',
    outreach_status: deal?.outreach_status || 'Not Started',
    is_multi_year: deal?.is_multi_year || false,
    deal_years: deal?.deal_years || 1,
    annual_values: deal?.annual_values || {},
    renewal_date: deal?.renewal_date || '',
    logo_url: deal?.logo_url || '',
    assigned_to: deal?.assigned_to || '',
    account_lead_id: deal?.account_lead_id || '',
    custom_fields: deal?.custom_fields || {},
    account_id: deal?.account_id || '',
    agency_id: deal?.agency_id || '',
    ...(deal?.id ? { id: deal.id } : {}),
  })

  function updateContact(index, field, value) {
    setContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function addContact() {
    setContacts(prev => [...prev, { ...EMPTY_CONTACT, company: form.brand_name }])
  }

  // Duplicate detection: when the user types a brand_name, fetch
  // existing open deals at that brand from the property. Shown as
  // a soft warning above the form. Only fires when creating new.
  const isNewDeal = !deal?.id
  const { data: dupes = [] } = useQuery({
    queryKey: ['deal-dupes', propertyId, form?.brand_name],
    enabled: isNewDeal && !!propertyId && !!(form?.brand_name && form.brand_name.trim().length >= 3),
    queryFn: async () => {
      const { data } = await supabase.rpc('find_duplicate_deals', {
        p_property_id: propertyId,
        p_brand_name: form.brand_name.trim(),
      })
      return data || []
    },
  })

  async function aiResearchDealContacts() {
    if (!form.brand_name) return
    if (!planLimits.canUse('contact_research')) {
      toast({ title: 'Contact research limit reached', description: 'Upgrade your plan for more contact searches', type: 'warning' })
      return
    }
    setAiResearching(true)
    planLimits.trackUsage('contact_research')
    try {
      const data = await researchContacts({
        company_name: form.brand_name,
        category: form.sub_industry || '',
        website: form.website || '',
        property_id: propertyId,
      })
      if (data.research?.contacts?.length > 0) {
        const source = data.research.source || 'claude'
        const newContacts = data.research.contacts.map((c, i) => ({
          ...EMPTY_CONTACT,
          first_name: c.first_name || '',
          last_name: c.last_name || '',
          email: c.email_pattern || c.email || '',
          email_verified: c.email_verified || 'unknown',
          position: c.position || '',
          company: form.brand_name,
          phone: c.phone || '',
          linkedin: c.linkedin_url || c.linkedin || '',
          is_primary: contacts.length === 0 && i === 0,
          notes: c.why_target || '',
          enriched_from: c.source || source,
        }))
        const hasOnlyEmpty = contacts.length === 1 && !contacts[0].first_name && !contacts[0].email
        setContacts(hasOnlyEmpty ? newContacts : [...contacts, ...newContacts])
        if (data.research.company_linkedin) {
          setForm(prev => ({ ...prev, linkedin: prev.linkedin || data.research.company_linkedin }))
        }
        toast({
          title: `Found ${newContacts.length} contacts at ${form.brand_name}`,
          description: source === 'apollo' ? 'Verified via Apollo.io' : 'AI-researched (unverified)',
          type: 'success',
        })
      } else {
        toast({ title: 'No contacts found', description: 'Try entering a more specific company name', type: 'warning' })
      }
    } catch (e) {
      toast({ title: 'Contact research failed', description: e.message, type: 'error' })
    } finally {
      setAiResearching(false)
    }
  }

  async function aiFindMoreDealContacts() {
    if (!form.brand_name) return
    setAiResearchingMore(true)
    try {
      const data = await researchMoreContacts({
        company_name: form.brand_name,
        category: form.sub_industry || '',
        website: form.website || '',
        existing_contacts: contacts.filter(c => c.first_name).map(c => ({
          first_name: c.first_name,
          last_name: c.last_name,
          position: c.position,
        })),
      })
      if (data.research?.contacts?.length > 0) {
        const newContacts = data.research.contacts.map(c => ({
          ...EMPTY_CONTACT,
          first_name: c.first_name || '',
          last_name: c.last_name || '',
          email: c.email_pattern || c.email || '',
          email_verified: c.email_verified || 'unknown',
          position: c.position || '',
          company: form.brand_name,
          phone: c.phone || '',
          linkedin: c.linkedin_url || c.linkedin || '',
          notes: c.why_target || '',
          enriched_from: c.source || data.research.source || 'claude',
        }))
        setContacts(prev => [...prev, ...newContacts])
        toast({ title: `Found ${newContacts.length} more contacts`, type: 'success' })
      } else {
        toast({ title: 'No additional contacts found', type: 'warning' })
      }
    } catch (e) {
      toast({ title: 'Contact search failed', description: e.message, type: 'error' })
    } finally {
      setAiResearchingMore(false)
    }
  }

  function removeContact(index) {
    setContacts(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Ensure at least one primary
      if (updated.length > 0 && !updated.some(c => c.is_primary)) {
        updated[0].is_primary = true
      }
      return updated
    })
  }

  function setPrimary(index) {
    setContacts(prev => prev.map((c, i) => ({ ...c, is_primary: i === index })))
  }

  // Activity log for this deal
  const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'Follow Up', 'Contract Sent', 'Stage Change']
  const ACTIVITY_ICONS = {
    Call: Phone,
    Email: Mail,
    Meeting: Handshake,
    Note: StickyNote,
    'Follow Up': Bell,
    'Contract Sent': FileText,
    'Stage Change': BarChart3,
  }

  const [activityForm, setActivityForm] = useState({ activity_type: 'Note', subject: '', description: '' })
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)

  const { data: dealActivities } = useQuery({
    queryKey: ['deal-activities', deal?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', deal.id)
        .order('occurred_at', { ascending: false })
      if (error) return []
      return data
    },
    enabled: !!deal?.id,
  })

  async function logActivity() {
    if (!activityForm.subject.trim() || !deal?.id) return
    setSavingActivity(true)
    try {
      await supabase.from('activities').insert({
        property_id: propertyId,
        created_by: profileId,
        deal_id: deal.id,
        activity_type: activityForm.activity_type,
        subject: activityForm.subject.trim(),
        description: activityForm.description.trim() || null,
        occurred_at: new Date().toISOString(),
      })
      queryClient.invalidateQueries({ queryKey: ['deal-activities', deal.id] })
      queryClient.invalidateQueries({ queryKey: ['activities', propertyId] })
      setActivityForm({ activity_type: 'Note', subject: '', description: '' })
      setShowActivityForm(false)
    } catch { /* activities table may not exist */ }
    setSavingActivity(false)
  }

  const activityCount = dealActivities?.length || 0

  // Fetch contracts for this deal
  const { data: dealContracts } = useQuery({
    queryKey: ['deal-contracts', deal?.id],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('id, brand_name, contract_number, status, total_value, pdf_file_data, pdf_file_name, effective_date, expiration_date').eq('deal_id', deal.id).order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!deal?.id,
  })

  const [uploadingContract, setUploadingContract] = useState(false)
  const contractFileRef = useRef(null)

  async function handleUploadContractToDeal(e) {
    const file = e.target.files?.[0]
    if (!file || !deal?.id) return
    setUploadingContract(true)
    try {
      // Read as base64
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(file)
      })

      // Extract text if PDF
      let contractText = ''
      if (file.type === 'application/pdf') {
        try {
          // Load pdfjs from CDN
          if (!window.pdfjsLib) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script')
              script.src = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
              script.onload = resolve
              script.onerror = reject
              document.head.appendChild(script)
            })
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
          }
          const arrayBuffer = await file.arrayBuffer()
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            contractText += content.items.map(item => item.str).join(' ') + '\n\n'
          }
        } catch (e) { console.warn(e) }
      }

      // Try to parse contract text with AI to extract benefits
      let parsed = null
      if (contractText) {
        try {
          const result = await parsePdfText(contractText)
          parsed = result.parsed
        } catch { /* parsing failed, continue without benefits */ }
      }

      // Create contract record
      const { data: newContract } = await supabase.from('contracts').insert({
        property_id: propertyId,
        deal_id: deal.id,
        brand_name: form.brand_name,
        status: 'In Review',
        contract_text: contractText || null,
        ai_summary: parsed?.summary || null,
        ai_extracted_benefits: parsed?.benefits || null,
        pdf_file_data: base64,
        pdf_file_name: file.name,
        pdf_content_type: file.type || 'application/pdf',
        total_value: parsed?.total_value || form.value || null,
        effective_date: parsed?.effective_date || (form.start_date ? `${form.start_date}-01-01` : null),
        expiration_date: parsed?.expiration_date || (form.end_date ? `${form.end_date}-12-31` : null),
        created_by: profileId,
      }).select().single()

      // Auto-insert benefits + sync to assets and fulfillment
      let benefitCount = 0
      if (newContract && parsed?.benefits?.length > 0) {
        const benefitRows = parsed.benefits.map(b => ({
          contract_id: newContract.id,
          benefit_description: b.description,
          quantity: b.quantity || 1,
          frequency: b.frequency || 'Per Season',
          value: b.value || null,
          fulfillment_auto_generated: false,
        }))
        const { data: insertedBenefits, error: benErr } = await supabase.from('contract_benefits').insert(benefitRows).select()
        if (benErr) {
          console.error('Benefits insert failed:', benErr)
          toast({ title: 'Benefits could not be saved', description: benErr.message, type: 'warning' })
        }
        benefitCount = insertedBenefits?.length || 0

        // Create fulfillment records
        if (insertedBenefits?.length > 0) {
          const { error: fulErr } = await supabase.from('fulfillment_records').insert(insertedBenefits.map(b => ({
            deal_id: deal.id,
            contract_id: newContract.id,
            benefit_id: b.id,
            scheduled_date: parsed.effective_date || null,
            delivered: false,
            auto_generated: true,
          })))
          if (fulErr) console.warn('Fulfillment insert error:', fulErr.message)
        }

        // Sync to asset catalog
        if (insertedBenefits?.length > 0) {
          try {
            const guessCategory = (desc) => {
              const d = (desc || '').toLowerCase()
              if (d.includes('led') || d.includes('board')) return 'LED Board'
              if (d.includes('jersey') || d.includes('patch')) return 'Jersey Patch'
              if (d.includes('radio') || d.includes('announce')) return 'Radio Read'
              if (d.includes('social')) return 'Social Post'
              if (d.includes('naming') || d.includes('title')) return 'Title Sponsorship'
              if (d.includes('sign') || d.includes('banner')) return 'Signage'
              if (d.includes('hospitality') || d.includes('suite')) return 'Hospitality'
              if (d.includes('email') || d.includes('newsletter')) return 'Email/Newsletter'
              if (d.includes('print') || d.includes('program')) return 'Print Ad'
              return 'Digital'
            }
            for (const b of insertedBenefits) {
              const { error: assetErr } = await supabase.from('assets').insert({
                property_id: propertyId,
                name: b.benefit_description || 'Contract Benefit',
                category: guessCategory(b.benefit_description),
                quantity: b.quantity || 1,
                base_price: b.value || null,
                active: true,
                from_contract: true,
                source_contract_id: newContract.id,
                sold_count: b.quantity || 1,
                total_available: 0,
              })
              if (assetErr) console.warn('Asset insert error:', assetErr.message)
            }
          } catch (e) { console.warn('Asset sync error:', e) }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['deal-contracts', deal.id] })
      queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['fulfillment-records'] })
      toast({
        title: 'Contract uploaded',
        description: benefitCount > 0 ? `${benefitCount} benefits synced to Assets & Fulfillment` : undefined,
        type: 'success'
      })
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, type: 'error' })
    } finally {
      setUploadingContract(false)
    }
  }

  const proposedCount = proposedAssets.length
  const contractCount = dealContracts?.length || 0
  const tabs = [
    { id: 'contacts', label: `Contacts (${contacts.length})` },
    { id: 'deal', label: 'Deal Details' },
    { id: 'assets', label: `Assets${proposedCount ? ` (${proposedCount})` : ''}` },
    { id: 'contract', label: `Contract${contractCount ? ` (${contractCount})` : ''}` },
    { id: 'activity', label: `Activity${activityCount ? ` (${activityCount})` : ''}` },
  ]

  function handleSave() {
    onSave({ ...form, contacts, proposedAssets })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-form-title"
        className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 id="deal-form-title" className="text-lg font-semibold text-text-primary mb-1">
          {deal ? 'Edit Deal' : 'New Deal'}
        </h2>

        {/* Brand name with Apollo enrich button */}
        <div className="flex gap-2 mt-3">
          <input
            placeholder="Brand / Company Name"
            value={form.brand_name}
            onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
            className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={!form.brand_name || enriching === 'company'}
            onClick={async () => {
              setEnriching('company')
              try {
                const res = await apolloEnrichCompany({
                  company_name: form.brand_name,
                  domain: form.website || undefined,
                  property_id: propertyId,
                })
                if (res?.data) {
                  const d = res.data
                  setForm(prev => ({
                    ...prev,
                    website: d.website || prev.website,
                    linkedin: d.linkedin_url || prev.linkedin,
                    city: d.city || prev.city,
                    state: d.state || prev.state,
                    sub_industry: d.industry || prev.sub_industry,
                    employees: d.estimated_num_employees || prev.employees,
                    revenue_thousands: d.annual_revenue ? Math.round(d.annual_revenue / 1000) : prev.revenue_thousands,
                    founded: d.founded_year || prev.founded,
                  }))
                  toast({
                    title: `Enriched from Apollo`,
                    description: res.cached ? 'From 30-day cache' : `${d.estimated_num_employees || '?'} employees, ${d.industry || 'unknown industry'}`,
                    type: 'success',
                  })
                } else if (res?.error) {
                  toast({ title: 'Apollo not configured', description: 'Add APOLLO_API_KEY to enable company enrichment', type: 'warning' })
                }
              } catch (e) {
                toast({ title: 'Enrichment failed', description: e.message, type: 'error' })
              } finally {
                setEnriching(null)
              }
            }}
            className="shrink-0 bg-accent/10 text-accent border border-accent/30 rounded px-3 py-2 text-xs font-medium hover:bg-accent/20 disabled:opacity-50 whitespace-nowrap"
            title="Enrich with Apollo.io firmographic data"
          >
            {enriching === 'company' ? '...' : '✦ Enrich'}
          </button>
        </div>

        {/* Duplicate detection — soft warning when a brand_name
            matches an open deal already in the pipeline. */}
        {isNewDeal && dupes && dupes.length > 0 && (
          <div className="mt-2 mb-4 bg-warning/10 border border-warning/30 rounded p-2.5 text-xs">
            <div className="font-medium text-warning mb-1">
              Heads up — {dupes.length} open deal{dupes.length === 1 ? '' : 's'} already targeting "{form.brand_name}":
            </div>
            <ul className="space-y-0.5 text-text-secondary">
              {dupes.slice(0, 5).map(d => (
                <li key={d.deal_id} className="font-mono">
                  · {d.brand_name} — {d.stage}
                  {d.value && <span> · ${Number(d.value).toLocaleString()}</span>}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-text-muted mt-1">
              You can still create this deal — but consider linking to an existing one or assigning a single owner.
            </p>
          </div>
        )}

        {!isNewDeal && <div className="mb-4" />}
        {isNewDeal && (!dupes || dupes.length === 0) && <div className="mb-4" />}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-mono transition-colors border-b-2 -mb-px ${
                activeTab === tab.id ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Contacts Tab — multiple contacts */}
          {activeTab === 'contacts' && (
            <>
              {contacts.map((contact, idx) => (
                <div key={idx} className={`bg-bg-card border rounded-lg p-3 space-y-2 ${contact.is_primary ? 'border-accent/40' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPrimary(idx)}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${contact.is_primary ? 'bg-accent text-bg-primary' : 'bg-bg-surface text-text-muted hover:text-accent'}`}
                      >
                        {contact.is_primary ? 'PRIMARY' : 'Set Primary'}
                      </button>
                      <span className="text-xs text-text-muted font-mono">Contact {idx + 1}</span>
                    </div>
                    {contacts.length > 1 && (
                      <button type="button" onClick={() => removeContact(idx)} className="text-text-muted hover:text-danger text-sm">&times;</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="First Name"
                      value={contact.first_name}
                      onChange={(e) => updateContact(idx, 'first_name', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    <input
                      placeholder="Last Name"
                      value={contact.last_name}
                      onChange={(e) => updateContact(idx, 'last_name', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                  <input
                    placeholder="Position / Title"
                    value={contact.position}
                    onChange={(e) => updateContact(idx, 'position', e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                  />
                  <input
                    placeholder="Company"
                    value={contact.company}
                    onChange={(e) => updateContact(idx, 'company', e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex gap-1 relative">
                      <input
                        type="email"
                        placeholder="Email"
                        value={contact.email}
                        onChange={(e) => updateContact(idx, 'email', e.target.value)}
                        className="flex-1 bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent min-w-0 pr-7"
                      />
                      {contact.email_verified === 'verified' && (
                        <span title="Verified" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-success text-xs">✓</span>
                      )}
                      {contact.email_verified === 'invalid' && (
                        <span title="Invalid" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-danger text-xs">✗</span>
                      )}
                      {contact.email && contact.email_verified !== 'verified' && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await hunterVerifyEmail({ email: contact.email, property_id: propertyId })
                              if (res?.data?.result) {
                                const status = res.data.result === 'deliverable' ? 'verified' :
                                  res.data.result === 'undeliverable' ? 'invalid' :
                                  res.data.result === 'risky' ? 'risky' : 'unknown'
                                updateContact(idx, 'email_verified', status)
                                toast({ title: `Email: ${status}`, type: status === 'verified' ? 'success' : 'warning' })
                              } else if (res?.error) {
                                toast({ title: 'Verify failed', description: res.error, type: 'error' })
                              }
                            } catch (e) {
                              toast({ title: 'Verify failed', description: e.message, type: 'error' })
                            }
                          }}
                          title="Verify email with Hunter.io"
                          className="shrink-0 bg-accent/10 text-accent border border-accent/30 rounded px-2 text-[10px] font-medium hover:bg-accent/20"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="City"
                      value={contact.city}
                      onChange={(e) => updateContact(idx, 'city', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    <input
                      placeholder="State"
                      value={contact.state}
                      onChange={(e) => updateContact(idx, 'state', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex gap-1">
                      <input
                        placeholder="LinkedIn URL"
                        value={contact.linkedin}
                        onChange={(e) => updateContact(idx, 'linkedin', e.target.value)}
                        className="flex-1 bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent min-w-0"
                      />
                      {contact.linkedin && (
                        <a
                          href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center justify-center w-8 h-8 bg-accent/10 text-accent border border-accent/30 rounded hover:bg-accent/20 self-center text-xs font-bold"
                          title="Open LinkedIn profile"
                        >
                          in
                        </a>
                      )}
                    </div>
                    <input
                      placeholder="Website"
                      value={contact.website}
                      onChange={(e) => updateContact(idx, 'website', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                  {/* Contact summary with clickable links */}
                  {(contact.first_name || contact.last_name) && (contact.linkedin || contact.email) && (
                    <div className="flex items-center gap-2 flex-wrap text-[11px] bg-bg-surface rounded px-2.5 py-1.5">
                      <span className="text-text-primary font-medium">{contact.first_name} {contact.last_name}</span>
                      {contact.enriched_from === 'apollo' && (
                        <span title="Verified via Apollo.io" className="text-[9px] font-mono px-1 py-0.5 rounded bg-success/10 text-success border border-success/30">✓ Apollo</span>
                      )}
                      {contact.enriched_from === 'claude' && (
                        <span title="AI-researched (unverified)" className="text-[9px] font-mono px-1 py-0.5 rounded bg-warning/10 text-warning border border-warning/30">AI</span>
                      )}
                      {contact.position && <span className="text-text-muted">— {contact.position}</span>}
                      {contact.linkedin && (
                        <a
                          href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline font-medium"
                        >
                          {contact.enriched_from === 'apollo' ? 'LinkedIn →' : 'Find on LinkedIn →'}
                        </a>
                      )}
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <a href={`mailto:${contact.email}`} className="text-accent hover:underline">{contact.email}</a>
                          {contact.email_verified === 'verified' && (
                            <span title="Email verified via Hunter.io" className="text-success text-[10px]">✓</span>
                          )}
                          {contact.email_verified === 'invalid' && (
                            <span title="Email invalid" className="text-danger text-[10px]">✗</span>
                          )}
                          {contact.email_verified === 'risky' && (
                            <span title="Email risky" className="text-warning text-[10px]">⚠</span>
                          )}
                        </span>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}
                          onClick={(e) => {
                            if (!confirm(`Call ${contact.first_name} ${contact.last_name} at ${contact.phone}?`)) {
                              e.preventDefault()
                            }
                          }}
                          className="text-accent hover:underline md:hidden"
                        >
                          Call {contact.phone}
                        </a>
                      )}
                    </div>
                  )}
                  {/* AI Enrich for this contact */}
                  <button
                    type="button"
                    disabled={enriching !== null || (!contact.first_name && !form.brand_name)}
                    onClick={async () => {
                      setEnriching(idx)
                      setEnrichResult(null)
                      try {
                        const result = await enrichContact({
                          name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || form.brand_name,
                          company: contact.company || form.brand_name,
                          position: contact.position,
                        })
                        setEnrichResult({ idx, data: result })
                      } catch (err) {
                        setEnrichResult({ idx, error: err.message })
                      } finally {
                        setEnriching(null)
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-accent/10 text-accent border border-accent/30 rounded px-2 py-1.5 text-[11px] font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
                  >
                    <span>✦</span>
                    {enriching === idx ? 'AI Enriching...' : 'AI Enrich'}
                  </button>
                  {enrichResult?.idx === idx && enrichResult.data && (
                    <div className="bg-bg-surface border border-accent/20 rounded p-2 text-xs text-text-secondary">
                      <div className="text-accent font-medium text-[10px] uppercase tracking-wider mb-1">AI Suggestions</div>
                      <div className="whitespace-pre-wrap">{typeof enrichResult.data === 'string' ? enrichResult.data : enrichResult.data.enrichment || JSON.stringify(enrichResult.data, null, 2)}</div>
                    </div>
                  )}
                  {enrichResult?.idx === idx && enrichResult.error && (
                    <div className="text-xs text-danger bg-danger/10 rounded p-2">{enrichResult.error}</div>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addContact}
                  className="flex-1 border border-dashed border-border rounded-lg py-2 text-xs text-text-muted hover:text-accent hover:border-accent/40 transition-colors"
                >
                  + Add Manually
                </button>
                <button
                  type="button"
                  onClick={aiResearchDealContacts}
                  disabled={aiResearching || !form.brand_name}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-accent/10 text-accent border border-accent/30 rounded-lg py-2 text-xs font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
                >
                  {aiResearching ? (
                    <>
                      <span className="animate-spin w-3 h-3 border-2 border-accent border-t-transparent rounded-full"></span>
                      Researching...
                    </>
                  ) : (
                    <>✦ AI Find Contacts <UsageBadge action="contact_research" /></>
                  )}
                </button>
              </div>
              {contacts.some(c => c.first_name) && (
                <button
                  type="button"
                  onClick={aiFindMoreDealContacts}
                  disabled={aiResearchingMore || !form.brand_name}
                  className="w-full flex items-center justify-center gap-1.5 border border-dashed border-accent/20 rounded-lg py-2 text-xs text-text-muted hover:text-accent hover:border-accent/40 disabled:opacity-50 transition-colors"
                >
                  {aiResearchingMore ? (
                    <>
                      <span className="animate-spin w-3 h-3 border-2 border-accent border-t-transparent rounded-full"></span>
                      Finding more decision-makers...
                    </>
                  ) : (
                    <>+ Find More Contacts at {form.brand_name || 'Company'}</>
                  )}
                </button>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs text-text-muted">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Select Source</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Date Added</label>
                  <input
                    type="date"
                    value={form.date_added}
                    onChange={(e) => setForm({ ...form, date_added: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </>
          )}

          {/* Deal Details Tab */}
          {activeTab === 'deal' && (
            <>
              <input
                type="number"
                placeholder="Deal Value ($)"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Stage</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Assigned To</label>
                  <p className="text-[10px] text-text-muted/70 mt-0.5 mb-1">Who's working the next action.</p>
                  <select
                    value={form.assigned_to}
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value || null })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Unassigned</option>
                    {(teamProfiles || []).map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Account Lead</label>
                  <p className="text-[10px] text-text-muted/70 mt-0.5 mb-1">Owns the long-term relationship.</p>
                  <select
                    value={form.account_lead_id}
                    onChange={(e) => setForm({ ...form, account_lead_id: e.target.value || null })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">— Pick lead —</option>
                    {(teamProfiles || []).map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Fiscal Year Start</label>
                  <select
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 2 + i).map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Fiscal Year End</label>
                  <select
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 2 + i).map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Win Probability %</label>
                  <input
                    type="number"
                    min="0" max="100"
                    placeholder="0-100"
                    value={form.win_probability}
                    onChange={(e) => setForm({ ...form, win_probability: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Expected Close</label>
                  <input
                    type="date"
                    value={form.expected_close_date}
                    onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted">Tags (comma-separated)</label>
                <input
                  placeholder="e.g. VIP, Renewal, Q4 Target"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={form.renewal_flag}
                    onChange={(e) => setForm({ ...form, renewal_flag: e.target.checked })}
                    className="accent-accent"
                  />
                  Renewal Deal
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={form.is_multi_year}
                    onChange={(e) => {
                      const multi = e.target.checked
                      setForm({ ...form, is_multi_year: multi, deal_years: multi ? Math.max(form.deal_years, 2) : 1 })
                    }}
                    className="accent-accent"
                  />
                  Multi-Year Deal
                </label>
              </div>

              {/* Revenue by Year */}
              {form.is_multi_year && (
                <div className="bg-bg-card border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-text-muted font-mono uppercase tracking-wider">Revenue by Year</div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted">Years:</label>
                      <select
                        value={form.deal_years}
                        onChange={(e) => setForm({ ...form, deal_years: parseInt(e.target.value) })}
                        className="bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
                      >
                        {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Array.from({ length: form.deal_years }, (_, i) => {
                      const startYear = form.start_date ? parseInt(form.start_date) : new Date().getFullYear()
                      const year = startYear + i
                      return (
                        <div key={year}>
                          <label className="text-[10px] text-text-muted font-mono">{year}</label>
                          <input
                            type="number"
                            placeholder="$"
                            value={form.annual_values[year] || ''}
                            onChange={(e) => setForm({ ...form, annual_values: { ...form.annual_values, [year]: e.target.value ? Number(e.target.value) : '' } })}
                            className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                          />
                        </div>
                      )
                    })}
                  </div>
                  {Object.values(form.annual_values).some(v => v) && (
                    <div className="text-xs text-accent font-mono text-right">
                      Total: ${Object.values(form.annual_values).reduce((s, v) => s + (Number(v) || 0), 0).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Renewal Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Renewal Date</label>
                  <input
                    type="date"
                    value={form.renewal_date}
                    onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Sponsor Logo URL</label>
                  <input
                    placeholder="https://..."
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Company Info */}
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-2">Company Info</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  placeholder="LinkedIn"
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">                <input
                  placeholder="Founded"
                  value={form.founded}
                  onChange={(e) => setForm({ ...form, founded: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="Revenue ($K)"
                  value={form.revenue_thousands}
                  onChange={(e) => setForm({ ...form, revenue_thousands: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="Employees"
                  value={form.employees}
                  onChange={(e) => setForm({ ...form, employees: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Sub-Industry"
                  value={form.sub_industry}
                  onChange={(e) => setForm({ ...form, sub_industry: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <select
                  value={form.outreach_status}
                  onChange={(e) => setForm({ ...form, outreach_status: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="Researching">Researching</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Replied">Replied</option>
                  <option value="Meeting Set">Meeting Set</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>
            </>
          )}

          {/* Proposed Assets Tab */}
          {activeTab === 'assets' && (
            <>
              <div className="text-xs text-text-muted mb-3">
                Select assets to include in this proposal. These will be tracked as proposed assets in the Asset Catalog.
              </div>

              {/* Asset Selection Grid */}
              {availableAssets?.length > 0 ? (
                <div className="space-y-2">
                  {availableAssets.map(asset => {
                    const isSelected = proposedAssets.some(pa => pa.asset_id === asset.id)
                    const proposed = proposedAssets.find(pa => pa.asset_id === asset.id)
                    return (
                      <div key={asset.id} className={`border rounded-lg p-3 transition-colors ${isSelected ? 'border-accent bg-accent/5' : 'border-border bg-bg-card hover:border-accent/30'}`}>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleProposedAsset(asset.id)}
                            className={`w-5 h-5 rounded border flex items-center justify-center text-xs shrink-0 ${isSelected ? 'bg-accent border-accent text-bg-primary' : 'border-border text-transparent hover:border-accent/50'}`}
                          >
                            {isSelected ? '✓' : ''}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-text-primary font-medium">{asset.name}</div>
                            <div className="flex gap-3 text-xs font-mono text-text-muted">
                              <span>{asset.category}</span>
                              {asset.base_price && <span>${Number(asset.base_price).toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Editable details when selected */}
                        {isSelected && proposed && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 sm:pl-8">
                            <div>
                              <label className="text-[10px] text-text-muted">Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={proposed.quantity}
                                onChange={(e) => updateProposedAsset(asset.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-text-muted">Custom Price</label>
                              <input
                                type="number"
                                placeholder={asset.base_price ? `$${Number(asset.base_price).toLocaleString()}` : '$'}
                                value={proposed.custom_price}
                                onChange={(e) => updateProposedAsset(asset.id, 'custom_price', e.target.value)}
                                className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-text-muted">Notes</label>
                              <input
                                placeholder="Optional"
                                value={proposed.notes}
                                onChange={(e) => updateProposedAsset(asset.id, 'notes', e.target.value)}
                                className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center text-text-muted text-xs py-8 bg-bg-card rounded-lg">
                  No assets available. Add assets in the Asset Catalog first.
                </div>
              )}

              {/* Proposal Summary */}
              {proposedAssets.length > 0 && (
                <div className="bg-bg-card border border-border rounded-lg p-3 mt-3">
                  <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-2">Proposal Summary</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">{proposedAssets.length} asset{proposedAssets.length !== 1 ? 's' : ''} selected</span>
                    <span className="text-accent font-mono font-medium">
                      ${proposedAssets.reduce((sum, pa) => {
                        const asset = availableAssets?.find(a => a.id === pa.asset_id)
                        const price = pa.custom_price || asset?.base_price || 0
                        return sum + (Number(price) * (pa.quantity || 1))
                      }, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Save proposed assets button */}
              {deal?.id && (
                <button
                  type="button"
                  onClick={saveProposedAssets}
                  className="w-full bg-accent/10 text-accent border border-accent/30 rounded px-3 py-2 text-xs font-medium hover:bg-accent/20 transition-colors mt-2"
                >
                  Save Proposed Assets
                </button>
              )}
            </>
          )}

          {/* Contract Tab */}
          {activeTab === 'contract' && (
            <>
              <div className="text-xs text-text-muted mb-3">
                Upload contracts directly to this deal. PDFs are stored as-is and analyzed for benefits/assets.
              </div>

              {/* Upload button */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => contractFileRef.current?.click()}
                  disabled={uploadingContract || !deal?.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent/10 text-accent border border-accent/30 rounded-lg py-2.5 text-xs font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
                >
                  {uploadingContract ? (
                    <>
                      <span className="animate-spin w-3 h-3 border-2 border-accent border-t-transparent rounded-full"></span>
                      Uploading...
                    </>
                  ) : (
                    <>Upload Contract PDF</>
                  )}
                </button>
                <input ref={contractFileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleUploadContractToDeal} className="hidden" />
                <a
                  href="/app/crm/contracts"
                  className="flex items-center justify-center gap-1 bg-bg-card border border-border rounded-lg px-4 py-2.5 text-xs text-text-secondary hover:text-accent transition-colors"
                >
                  Open Contract Manager
                </a>
              </div>

              {!deal?.id && (
                <div className="text-xs text-text-muted bg-bg-card rounded p-3 text-center mt-2">
                  Save the deal first to upload contracts
                </div>
              )}

              {/* Existing contracts for this deal */}
              {dealContracts?.length > 0 && (
                <div className="space-y-2 mt-3">
                  <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Contracts on File</div>
                  {dealContracts.map(c => (
                    <div key={c.id} className="bg-bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-text-primary">{c.pdf_file_name || c.contract_number || 'Contract'}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            c.status === 'Signed' ? 'bg-success/10 text-success' :
                            c.status === 'Final' ? 'bg-accent/10 text-accent' :
                            c.status === 'In Review' ? 'bg-warning/10 text-warning' :
                            'bg-bg-surface text-text-muted'
                          }`}>{c.status}</span>
                          {c.pdf_file_data && <span className="text-[10px] text-success font-mono">PDF</span>}
                        </div>
                        <div className="flex gap-3 text-[10px] text-text-muted font-mono mt-0.5">
                          {c.total_value && <span>${Number(c.total_value).toLocaleString()}</span>}
                          {c.effective_date && <span>{c.effective_date} &rarr; {c.expiration_date || '?'}</span>}
                        </div>
                      </div>
                      <a
                        href="/app/crm/contracts"
                        className="text-[10px] text-accent hover:underline shrink-0"
                      >
                        View &rarr;
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {deal?.id && (!dealContracts || dealContracts.length === 0) && !uploadingContract && (
                <div className="text-center text-text-muted text-xs py-6 bg-bg-card rounded-lg mt-2">
                  No contracts attached yet. Upload a PDF or create one in the Contract Manager.
                </div>
              )}
            </>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <>
              {/* Date tracking */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Last Contacted</label>
                  <input
                    type="date"
                    value={form.last_contacted}
                    onChange={(e) => setForm({ ...form, last_contacted: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Next Follow-Up</label>
                  <input
                    type="date"
                    value={form.next_follow_up}
                    onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Account / Agency — link this deal to a parent
                  company or agency-of-record. Both optional. */}
              {(accountsList.length > 0 || agenciesList.length > 0) && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <label className="text-xs text-text-muted">Parent account</label>
                    <p className="text-[10px] text-text-muted/70 mt-0.5 mb-1">Roll up many deals under one company.</p>
                    <select
                      value={form.account_id}
                      onChange={(e) => setForm({ ...form, account_id: e.target.value || null })}
                      className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="">— none —</option>
                      {accountsList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Agency of record</label>
                    <p className="text-[10px] text-text-muted/70 mt-0.5 mb-1">Third-party representing this brand.</p>
                    <select
                      value={form.agency_id}
                      onChange={(e) => setForm({ ...form, agency_id: e.target.value || null })}
                      className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="">— none —</option>
                      {agenciesList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Custom fields — property-specific columns rendered
                  from custom_field_defs. Empty = nothing shows. */}
              {customFieldDefs.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-2">Custom fields</div>
                  <CustomFieldsRenderer
                    defs={customFieldDefs}
                    value={form.custom_fields}
                    onChange={(custom_fields) => setForm({ ...form, custom_fields })}
                  />
                </div>
              )}

              {/* Notes — supports slash commands (try typing "/") */}
              <SlashInput
                value={form.notes}
                onChange={(notes) => setForm({ ...form, notes })}
                placeholder="Deal notes... (type / for commands)"
                rows={3}
                commands={[
                  { id: 'task',     icon: '✓', label: 'Add task',          hint: 'Insert a checklist item',     insert: '[ ] ' },
                  { id: 'next',     icon: '→', label: 'Next step',         hint: 'Insert "Next:"',              insert: 'Next: ' },
                  { id: 'blocker',  icon: '⚠', label: 'Blocker',           hint: 'Insert "Blocker:"',           insert: 'Blocker: ' },
                  { id: 'meeting',  icon: '📅', label: 'Meeting note',     hint: 'Insert "Meeting:"',           insert: `Meeting (${new Date().toLocaleDateString()}): ` },
                  { id: 'pricing',  icon: '$',  label: 'Pricing context',  hint: 'Insert "Proposed:"',          insert: 'Proposed: $' },
                  { id: 'contact',  icon: '👤', label: 'Reference contact', hint: 'Insert "Contact:"',           insert: 'Contact: ' },
                ]}
              />

              {/* Activity Log */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-muted font-mono uppercase tracking-wider">Activity Log</span>
                  {deal?.id && (
                    <button
                      type="button"
                      onClick={() => setShowActivityForm(!showActivityForm)}
                      className="text-xs text-accent hover:text-accent/80 font-medium"
                    >
                      {showActivityForm ? 'Cancel' : '+ Log Activity'}
                    </button>
                  )}
                </div>

                {!deal?.id && (
                  <div className="text-xs text-text-muted bg-bg-card rounded p-3 text-center">
                    Save the deal first to start logging activities
                  </div>
                )}

                {/* Inline add activity form */}
                {showActivityForm && deal?.id && (
                  <div className="bg-bg-card border border-accent/20 rounded-lg p-3 space-y-2 mb-3">
                    <div className="flex gap-2">
                      <select
                        value={activityForm.activity_type}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, activity_type: e.target.value }))}
                        className="bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                      >
                        {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        placeholder="Subject (e.g. 'Intro call with VP Marketing')"
                        value={activityForm.subject}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="flex-1 bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                        autoFocus
                      />
                    </div>
                    <textarea
                      placeholder="Details (optional)"
                      value={activityForm.description}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
                    />
                    <button
                      type="button"
                      onClick={logActivity}
                      disabled={savingActivity || !activityForm.subject.trim()}
                      className="w-full bg-accent text-bg-primary py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {savingActivity ? 'Saving...' : 'Log Activity'}
                    </button>
                  </div>
                )}

                {/* Activity timeline */}
                {deal?.id && (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {dealActivities?.length === 0 && (
                      <div className="text-xs text-text-muted text-center py-4">No activity logged yet</div>
                    )}
                    {dealActivities?.map((a) => (
                      <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                        {(() => {
                          const Icon = ACTIVITY_ICONS[a.activity_type] || ClipboardList
                          return <Icon className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-primary font-medium truncate">{a.subject}</span>
                            <span className="text-[10px] text-text-muted font-mono shrink-0">
                              {new Date(a.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {a.description && (
                            <div className="text-[11px] text-text-muted truncate">{a.description}</div>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-text-muted bg-bg-surface px-1.5 py-0.5 rounded shrink-0">
                          {a.activity_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={saving || !form.brand_name}
            className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onCancel} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm hover:text-text-primary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Column name aliases for auto-detection
const COLUMN_MAP = {
  company: 'company', brand: 'company', 'brand name': 'company', 'company name': 'company', organization: 'company',
  'first name': 'first_name', 'first': 'first_name', firstname: 'first_name', 'given name': 'first_name',
  'last name': 'last_name', 'last': 'last_name', lastname: 'last_name', surname: 'last_name', 'family name': 'last_name',
  title: 'position', position: 'position', role: 'position', 'job title': 'position',
  city: 'city', town: 'city',
  state: 'state', province: 'state', region: 'state',
  email: 'email', 'e-mail': 'email', 'email address': 'email',
  phone: 'phone', telephone: 'phone', 'phone number': 'phone', mobile: 'phone',
  linkedin: 'linkedin', 'linkedin url': 'linkedin', 'linkedin profile': 'linkedin',
  website: 'website', url: 'website', web: 'website', 'company website': 'website',
  founded: 'founded', 'year founded': 'founded', established: 'founded',
  'revenue ($000s)': 'revenue_thousands', revenue: 'revenue_thousands', 'revenue ($k)': 'revenue_thousands', 'annual revenue': 'revenue_thousands',
  employees: 'employees', 'employee count': 'employees', headcount: 'employees', 'num employees': 'employees',
  'sub-industry': 'sub_industry', 'sub industry': 'sub_industry', industry: 'sub_industry', sector: 'sub_industry', category: 'sub_industry',
  priority: 'priority',
  'outreach status': 'outreach_status', status: 'outreach_status', outreach: 'outreach_status',
  notes: 'notes', note: 'notes', comments: 'notes', description: 'notes',
  value: 'value', 'deal value': 'value', amount: 'value',
}

function BulkImportModal({ propertyId, onClose, onImported }) {
  const [rawText, setRawText] = useState('')
  const [grouped, setGrouped] = useState([]) // { company, companyData, contacts[] }
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState('paste') // paste | review
  const [expanded, setExpanded] = useState({})

  function parseProspects(text) {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length === 0) return []

    // Detect delimiter
    const firstLine = lines[0]
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes('|') ? '|' : ','

    // Parse all rows
    const allParts = lines.map(l => l.split(delimiter).map(p => p.trim()))

    // Detect if first row is a header
    let headers = null
    let dataRows = allParts
    const firstRowLower = allParts[0].map(p => p.toLowerCase())
    const matchedHeaders = firstRowLower.map(h => COLUMN_MAP[h])
    const headerHits = matchedHeaders.filter(Boolean).length

    if (headerHits >= 2) {
      // First row is a header
      headers = matchedHeaders.map((h, i) => h || `col_${i}`)
      dataRows = allParts.slice(1)
    } else {
      // No header detected — guess columns by position or content
      headers = null
    }

    // Parse each row into a structured record
    const records = []
    for (const parts of dataRows) {
      if (parts.every(p => !p)) continue // skip empty rows

      if (headers) {
        const rec = {}
        headers.forEach((h, i) => { if (parts[i]) rec[h] = parts[i] })
        if (rec.company || rec.first_name || rec.email) records.push(rec)
      } else {
        // Smart detection (no headers)
        const rec = { company: '', first_name: '', last_name: '', email: '', phone: '', position: '', value: '' }
        for (const part of parts) {
          if (!part) continue
          if (/@/.test(part) && !rec.email) rec.email = part
          else if (/^\$?[\d,]+\.?\d*$/.test(part.replace(/\s/g, ''))) rec.value = part.replace(/[$,\s]/g, '')
          else if (/^[\d\s().+-]{10,}$/.test(part)) rec.phone = part
          else if (/linkedin\.com/i.test(part)) rec.linkedin = part
          else if (/^https?:\/\//i.test(part) || /\.\w{2,4}$/.test(part)) rec.website = part
          else if (!rec.company) rec.company = part
          else if (!rec.first_name) {
            // Could be "First Last" or just first name
            const nameParts = part.split(/\s+/)
            rec.first_name = nameParts[0]
            if (nameParts.length > 1) rec.last_name = nameParts.slice(1).join(' ')
          } else if (!rec.last_name) rec.last_name = part
          else if (!rec.position) rec.position = part
        }
        if (rec.company || rec.first_name) records.push(rec)
      }
    }

    // Group by company — multiple contacts per company become one deal
    const companyMap = new Map()
    for (const rec of records) {
      const key = (rec.company || '').toLowerCase().trim()
      if (!companyMap.has(key)) {
        companyMap.set(key, {
          company: rec.company || '',
          companyData: {
            city: rec.city || '',
            state: rec.state || '',
            website: rec.website || '',
            linkedin: rec.linkedin || '',
            founded: rec.founded || '',
            revenue_thousands: rec.revenue_thousands || '',
            employees: rec.employees || '',
            sub_industry: rec.sub_industry || '',
            priority: rec.priority || 'Medium',
            outreach_status: rec.outreach_status || '',
            notes: rec.notes || '',
            value: rec.value || '',
          },
          contacts: [],
        })
      }
      const group = companyMap.get(key)
      // Merge company-level data from subsequent rows
      const cd = group.companyData
      if (rec.city && !cd.city) cd.city = rec.city
      if (rec.state && !cd.state) cd.state = rec.state
      if (rec.website && !cd.website) cd.website = rec.website
      if (rec.founded && !cd.founded) cd.founded = rec.founded
      if (rec.revenue_thousands && !cd.revenue_thousands) cd.revenue_thousands = rec.revenue_thousands
      if (rec.employees && !cd.employees) cd.employees = rec.employees
      if (rec.sub_industry && !cd.sub_industry) cd.sub_industry = rec.sub_industry
      if (rec.notes && !cd.notes) cd.notes = rec.notes

      if (rec.first_name || rec.last_name || rec.email) {
        group.contacts.push({
          first_name: rec.first_name || '',
          last_name: rec.last_name || '',
          email: rec.email || '',
          phone: rec.phone || '',
          position: rec.position || '',
          city: rec.city || '',
          state: rec.state || '',
          linkedin: rec.linkedin || '',
          website: rec.website || '',
        })
      }
    }

    return Array.from(companyMap.values())
  }

  function handleParse() {
    const results = parseProspects(rawText)
    setGrouped(results)
    setStep('review')
  }

  function removeGroup(index) {
    setGrouped(prev => prev.filter((_, i) => i !== index))
  }

  function removeContact(groupIdx, contactIdx) {
    setGrouped(prev => prev.map((g, i) => i === groupIdx ? { ...g, contacts: g.contacts.filter((_, ci) => ci !== contactIdx) } : g))
  }

  async function handleImport() {
    if (grouped.length === 0) return
    setImporting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      let dealCount = 0

      for (const group of grouped) {
        // Build deal row — auto-assign category if not provided
        const autoCategory = group.companyData.sub_industry || guessCategory(group.company, '')
        const dealRow = {
          property_id: propertyId,
          brand_name: group.company,
          stage: 'Prospect',
          priority: group.companyData.priority || 'Medium',
          date_added: today,
          source: 'Inbound',
          notes: group.companyData.notes || null,
        }

        // Set primary contact on deal (first contact)
        if (group.contacts.length > 0) {
          const primary = group.contacts[0]
          dealRow.contact_first_name = primary.first_name || null
          dealRow.contact_last_name = primary.last_name || null
          dealRow.contact_name = [primary.first_name, primary.last_name].filter(Boolean).join(' ') || null
          dealRow.contact_email = primary.email || null
          dealRow.contact_phone = primary.phone || null
          dealRow.contact_position = primary.position || null
          dealRow.contact_company = group.company || null
        }

        // Add value if present
        if (group.companyData.value) {
          dealRow.value = Number(String(group.companyData.value).replace(/[$,\s]/g, '')) || null
        }

        // Add company enrichment fields (may fail pre-migration — that's ok)
        const companyExtras = {}
        if (group.companyData.city) companyExtras.city = group.companyData.city
        if (group.companyData.state) companyExtras.state = group.companyData.state
        if (group.companyData.website) companyExtras.website = group.companyData.website
        if (group.companyData.linkedin) companyExtras.linkedin = group.companyData.linkedin
        if (group.companyData.founded) companyExtras.founded = group.companyData.founded
        if (group.companyData.revenue_thousands) companyExtras.revenue_thousands = Number(String(group.companyData.revenue_thousands).replace(/[$,\s]/g, '')) || null
        if (group.companyData.employees) companyExtras.employees = Number(String(group.companyData.employees).replace(/[,\s]/g, '')) || null
        companyExtras.sub_industry = autoCategory
        if (group.companyData.outreach_status) companyExtras.outreach_status = group.companyData.outreach_status

        // Insert deal
        const { data: dealData, error: dealErr } = await supabase
          .from('deals')
          .insert({ ...dealRow, ...companyExtras })
          .select('id')
          .single()

        if (dealErr) {
          // Retry without company extras (migration not run)
          const { data: dealData2, error: dealErr2 } = await supabase
            .from('deals')
            .insert(dealRow)
            .select('id')
            .single()
          if (dealErr2) throw dealErr2

          dealCount++
          // Try inserting contacts
          if (group.contacts.length > 0 && dealData2?.id) {
            try {
              await supabase.from('contacts').insert(
                group.contacts.map((c, i) => ({
                  property_id: propertyId,
                  deal_id: dealData2.id,
                  first_name: c.first_name || '',
                  last_name: c.last_name || null,
                  email: c.email || null,
                  phone: c.phone || null,
                  position: c.position || null,
                  company: group.company || null,
                  city: c.city || null,
                  state: c.state || null,
                  linkedin: c.linkedin || null,
                  website: c.website || null,
                  is_primary: i === 0,
                }))
              )
            } catch { /* contacts table may not exist */ }
          }
          continue
        }

        dealCount++
        // Insert contacts linked to the deal
        if (group.contacts.length > 0 && dealData?.id) {
          try {
            await supabase.from('contacts').insert(
              group.contacts.map((c, i) => ({
                property_id: propertyId,
                deal_id: dealData.id,
                first_name: c.first_name || '',
                last_name: c.last_name || null,
                email: c.email || null,
                phone: c.phone || null,
                position: c.position || null,
                company: group.company || null,
                city: c.city || null,
                state: c.state || null,
                linkedin: c.linkedin || null,
                website: c.website || null,
                is_primary: i === 0,
              }))
            )
          } catch { /* contacts table may not exist */ }
        }
      }

      onImported(dealCount)
    } catch (err) {
      alert('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const totalContacts = grouped.reduce((s, g) => s + g.contacts.length, 0)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Bulk Import Prospects</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {step === 'paste'
                ? 'Paste a list or spreadsheet data — contacts at the same company are grouped automatically'
                : `${grouped.length} companies, ${totalContacts} contacts — review and import`}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        {step === 'paste' && (
          <div className="p-5 flex-1 flex flex-col gap-4">
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-text-muted font-mono mb-2">Supported formats (auto-detected):</div>
              <div className="text-xs text-text-secondary space-y-1 font-mono">
                <div>Tab-separated with headers (paste from Excel / Google Sheets)</div>
                <div>Company, First Name, Last Name, Title, Email, Phone, ...</div>
                <div>Company | Contact | email | phone</div>
                <div>Multiple rows with same Company = grouped as one deal</div>
              </div>
              <div className="text-[10px] text-text-muted mt-2 font-mono">
                Headers: Company, First Name, Last Name, Title, City, State, Email, Phone, LinkedIn, Website, Founded, Revenue ($000s), Employees, Sub-Industry, Priority, Outreach Status, Notes
              </div>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"Company\tFirst Name\tLast Name\tTitle\tCity\tState\tEmail\tPhone\nNike\tJohn\tSmith\tVP Marketing\tPortland\tOR\tjohn@nike.com\t503-555-0100\nNike\tSarah\tJones\tDirector Sales\tPortland\tOR\tsarah@nike.com\t503-555-0101\nAdidas\tMike\tChen\tCMO\tBoston\tMA\tmike@adidas.com\t617-555-0200"}
              rows={14}
              className="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent resize-none font-mono"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="flex-1 bg-accent text-bg-primary py-2.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Parse {rawText.trim().split('\n').filter(l => l.trim()).length || 0} Lines
              </button>
              <button onClick={onClose} className="px-6 bg-bg-card text-text-secondary py-2.5 rounded text-sm hover:text-text-primary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5">
              {grouped.length === 0 ? (
                <div className="text-center text-text-muted text-sm py-12">
                  No prospects could be parsed. Try a different format.
                </div>
              ) : (
                <div className="space-y-3">
                  {grouped.map((group, gi) => (
                    <div key={gi} className="bg-bg-card border border-border rounded-lg overflow-hidden">
                      {/* Company header */}
                      <div
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-bg-surface/50"
                        onClick={() => setExpanded(prev => ({ ...prev, [gi]: !prev[gi] }))}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-muted font-mono">{expanded[gi] ? '▼' : '▶'}</span>
                          <div>
                            <div className="text-sm font-medium text-text-primary">{group.company || 'Unknown Company'}</div>
                            <div className="text-[10px] text-text-muted font-mono">
                              {group.contacts.length} contact{group.contacts.length !== 1 ? 's' : ''}
                              {group.companyData.city && ` · ${group.companyData.city}`}
                              {group.companyData.state && `, ${group.companyData.state}`}
                              {group.companyData.sub_industry && ` · ${group.companyData.sub_industry}`}
                              {group.companyData.revenue_thousands && ` · $${group.companyData.revenue_thousands}K rev`}
                              {group.companyData.employees && ` · ${group.companyData.employees} emp`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeGroup(gi) }}
                          className="text-text-muted hover:text-danger text-xs"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Expanded: show contacts */}
                      {expanded[gi] && (
                        <div className="border-t border-border p-3 space-y-2">
                          {group.contacts.map((c, ci) => (
                            <div key={ci} className="bg-bg-surface border border-border rounded p-2 flex items-start gap-2 group/contact">
                              <span className="text-[10px] text-text-muted font-mono w-5 pt-1 text-right shrink-0">{ci + 1}</span>
                              <div className="flex-1 text-xs space-y-0.5">
                                <div className="text-text-primary font-medium">
                                  {[c.first_name, c.last_name].filter(Boolean).join(' ') || 'No Name'}
                                  {c.position && <span className="text-text-muted font-normal ml-1">— {c.position}</span>}
                                </div>
                                <div className="text-text-muted font-mono">
                                  {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                                </div>
                                {(c.city || c.state || c.linkedin) && (
                                  <div className="text-text-muted">
                                    {[c.city, c.state].filter(Boolean).join(', ')}
                                    {c.linkedin && <span className="ml-2">LI</span>}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeContact(gi, ci)}
                                className="text-text-muted hover:text-danger text-xs opacity-0 group-hover/contact:opacity-100"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                          {group.contacts.length === 0 && (
                            <div className="text-xs text-text-muted text-center py-2">No contacts — company only</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border flex gap-3">
              <button
                onClick={() => setStep('paste')}
                className="px-4 bg-bg-card text-text-secondary py-2.5 rounded text-sm hover:text-text-primary"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing || grouped.length === 0}
                className="flex-1 bg-accent text-bg-primary py-2.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${grouped.length} Companies, ${totalContacts} Contacts`}
              </button>
              <button onClick={onClose} className="px-4 bg-bg-card text-text-secondary py-2.5 rounded text-sm hover:text-text-primary">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============ Prospect Finder - AI-Powered Prospect Search & Discovery ============ */
function ProspectFinder({ propertyId, onClose, onAdded }) {
  const { profile } = useAuth()
  const planLimits = usePlanLimits()
  const composeEmail = useComposeEmail()
  const { toast } = useToast()
  const effectivePropertyId = propertyId || profile?.property_id
  const [tab, setTab] = useState('search') // search | suggestions
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [icpFilters, setIcpFilters] = useState(null)
  const [results, setResults] = useState([]) // search or suggestion results
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [researchingIdx, setResearchingIdx] = useState(null)
  const [researchedContacts, setResearchedContacts] = useState({}) // { idx: { contacts, company_linkedin, ... } }
  const [addingIdx, setAddingIdx] = useState(null)
  const [addedIdxs, setAddedIdxs] = useState(new Set())
  const [useVerified, setUseVerified] = useState(true)
  // Bulk send state — selectedContacts keyed by `${idx}:${ci}`.
  // Each entry is { prospect, contact } so we can send + draft with full context.
  const [selectedContacts, setSelectedContacts] = useState(new Map())
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, failed: 0, total: 0 })
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkProvider, setBulkProvider] = useState('outlook')

  const MAX_BULK_SEND = 25

  const propertyType = profile?.properties?.type
  const industryKey = ({ college: 'sports', professional: 'sports', minor_league: 'sports', nonprofit: 'nonprofit', conference: 'conference', media: 'media', realestate: 'realestate', entertainment: 'entertainment' })[propertyType] || 'sports'

  async function handleSearch() {
    if (!searchQuery.trim() && !searchCategory) return
    if (!checkRateLimit('prospect_search', 10)) {
      setStatus('Too many searches. Please wait a moment before trying again.')
      return
    }
    if (!isAIFeatureEnabled('ai_prospect_search')) {
      setStatus('Prospect search is currently disabled by the developer.')
      return
    }
    if (!planLimits.canUse('prospect_search')) {
      setStatus('Prospect search limit reached. Upgrade your plan for more searches.')
      return
    }
    setLoading(true)
    setStatus('Searching for prospects...')
    planLimits.trackUsage('prospect_search')
    setResults([])
    setResearchedContacts({})
    setAddedIdxs(new Set())
    try {
      const data = await searchProspects({
        query: sanitizeText(searchQuery),
        category: sanitizeText(searchCategory),
        property_id: propertyId,
        icp_filters: icpFilters,
        industry: industryKey,
      })
      setResults(data.prospects || [])
      setStatus(data.prospects?.length ? `Found ${data.prospects.length} prospects` : 'No results found. Try a broader search.')
    } catch (e) {
      setStatus('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSuggest() {
    setLoading(true)
    setStatus('Analyzing your pipeline and finding suggestions...')
    setResults([])
    setResearchedContacts({})
    setAddedIdxs(new Set())
    try {
      const data = await suggestProspects({ property_id: propertyId, icp_filters: icpFilters, industry: industryKey })
      setResults(data.suggestions || [])
      setStatus(data.suggestions?.length ? `${data.suggestions.length} AI-suggested prospects based on your pipeline` : 'No suggestions available.')
    } catch (e) {
      setStatus('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResearchContacts(idx) {
    const prospect = results[idx]
    if (!prospect) return

    // Check if user can use contact research
    if (!planLimits.canUse('contact_research')) {
      setStatus('Verified contact lookups require a paid plan. Upgrade to Starter or higher for 50+ lookups/mo.')
      return
    }

    setResearchingIdx(idx)

    // Charge a credit for non-enterprise/developer users
    const isExempt = planLimits.plan === 'enterprise' || planLimits.plan === 'developer'
    if (!isExempt) {
      planLimits.trackUsage('contact_research')
    }

    try {
      const companyKey = prospect.company_name.trim().toLowerCase()

      // Step 0: Check shared cache first (30-day TTL)
      setStatus('Checking contact database...')
      const { data: cached } = await supabase
        .from('contact_research')
        .select('*')
        .ilike('company_name', companyKey)
        .gt('expires_at', new Date().toISOString())
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cached?.data) {
        setStatus(`Found cached contacts for ${prospect.company_name} (saves API tokens)`)
        const cachedResearch = cached.data
        cachedResearch._fromCache = true
        setResearchedContacts(prev => ({ ...prev, [idx]: cachedResearch }))
        setResearchingIdx(null)
        return
      }

      // Step 1: Not cached — fetch fresh data
      let apolloData = null
      let contacts = []
      let source = 'claude'

      if (useVerified) {
        try {
          setStatus('Searching Apollo for verified contacts...')
          const apolloResult = await apolloEnrichCompany({
            company_name: prospect.company_name,
            domain: prospect.website,
            property_id: effectivePropertyId,
          })
          if (apolloResult?.data) apolloData = apolloResult.data

          const peopleResult = await import('@/lib/claude').then(m => m.apolloFindPeople({
            company_name: prospect.company_name,
            property_id: effectivePropertyId,
          }))
          if (peopleResult?.people?.length > 0) {
            contacts = peopleResult.people.map(p => ({
              name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
              first_name: p.first_name || '',
              last_name: p.last_name || '',
              position: p.title || '',
              email: p.email || '',
              phone: p.phone || '',
              linkedin: p.linkedin_url || '',
              source: 'apollo',
            }))
            source = 'apollo'
          }
        } catch { /* Apollo failed — fall back to AI */ }
      }

      // Step 2: Fall back to AI if Apollo returned nothing
      if (contacts.length === 0) {
        setStatus('Researching contacts with AI...')
        const data = await researchContacts({
          company_name: prospect.company_name,
          category: prospect.category || prospect.sub_industry,
          website: prospect.website,
        })
        if (data.research) {
          contacts = (data.research.contacts || []).map(c => ({ ...c, source: 'claude' }))
          source = 'claude'
        }
      }

      // Step 3: Verify emails with Hunter
      if (useVerified && contacts.length > 0) {
        setStatus('Verifying emails with Hunter...')
        for (let i = 0; i < contacts.length; i++) {
          if (contacts[i].email) {
            try {
              const result = await hunterVerifyEmail({ email: contacts[i].email, property_id: effectivePropertyId })
              contacts[i].email_verified = result?.status || 'unknown'
            } catch { contacts[i].email_verified = 'unknown' }
          }
        }
      }

      const research = {
        contacts,
        source,
        company_linkedin: apolloData?.linkedin_url || prospect.linkedin || null,
        ...(apolloData ? { employees: apolloData.employees, revenue: apolloData.revenue, tech_stack: apolloData.tech_stack } : {}),
      }

      // Step 4: Store to shared cache for all users
      try {
        await supabase.from('contact_research').insert({
          company_name: prospect.company_name,
          source,
          data: research,
          property_id: effectivePropertyId,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        })
      } catch { /* cache write failure is non-fatal */ }

      setResearchedContacts(prev => ({ ...prev, [idx]: research }))
      setStatus(contacts.length ? `Found ${contacts.length} contacts${source === 'apollo' ? ' (Apollo verified)' : ''}` : 'No contacts found')
    } catch (e) {
      setResearchedContacts(prev => ({ ...prev, [idx]: { error: e.message, contacts: [] } }))
    } finally {
      setResearchingIdx(null)
    }
  }

  const [searchingMoreIdx, setSearchingMoreIdx] = useState(null)

  async function handleFindMoreContacts(idx) {
    const prospect = results[idx]
    const existing = researchedContacts[idx]?.contacts || []
    if (!prospect) return
    setSearchingMoreIdx(idx)
    try {
      const data = await researchMoreContacts({
        company_name: prospect.company_name,
        category: prospect.category || prospect.sub_industry,
        website: prospect.website,
        existing_contacts: existing,
      })
      if (data.research?.contacts?.length > 0) {
        // Merge new contacts with existing
        setResearchedContacts(prev => ({
          ...prev,
          [idx]: {
            ...prev[idx],
            contacts: [...(prev[idx]?.contacts || []), ...data.research.contacts],
          }
        }))
      }
    } catch (e) {
      alert('Error finding more contacts: ' + e.message)
    } finally {
      setSearchingMoreIdx(null)
    }
  }

  async function handleAddProspect(idx) {
    const prospect = results[idx]
    if (!prospect) return
    setAddingIdx(idx)
    try {
      // Auto-research contacts if not already done
      let research = researchedContacts[idx]
      if (!research || !research.contacts?.length) {
        setResearchingIdx(idx)
        try {
          const data = await researchContacts({
            company_name: prospect.company_name,
            category: prospect.category || prospect.sub_industry,
            website: prospect.website,
          })
          research = data.research
          setResearchedContacts(prev => ({ ...prev, [idx]: research }))
        } catch (e) { console.warn(e) 
          // If research fails, continue without contacts
          research = null
        } finally {
          setResearchingIdx(null)
        }
      }

      const primaryContact = research?.contacts?.[0]

      // Create the deal
      if (!effectivePropertyId) throw new Error('No company linked to your account. Go to Settings to set up your property.')
      const dealRow = {
        property_id: effectivePropertyId,
        brand_name: prospect.company_name,
        stage: 'Prospect',
        priority: prospect.priority || 'Medium',
        date_added: new Date().toISOString().split('T')[0],
        source: 'Cold Outreach',
        notes: [
          prospect.why_good_fit || prospect.rationale || '',
          prospect.sponsorship_track_record ? `Track record: ${prospect.sponsorship_track_record}` : '',
          prospect.estimated_sponsorship_budget ? `Est. budget: ${prospect.estimated_sponsorship_budget}` : '',
        ].filter(Boolean).join('\n'),
      }

      // Set primary contact on deal
      if (primaryContact) {
        dealRow.contact_first_name = primaryContact.first_name || null
        dealRow.contact_last_name = primaryContact.last_name || null
        dealRow.contact_name = [primaryContact.first_name, primaryContact.last_name].filter(Boolean).join(' ') || null
        dealRow.contact_email = primaryContact.email_pattern || null
        dealRow.contact_position = primaryContact.position || null
        dealRow.contact_company = prospect.company_name
      }

      // Company enrichment fields
      const extras = {}
      if (prospect.headquarters_city) extras.city = prospect.headquarters_city
      if (prospect.headquarters_state) extras.state = prospect.headquarters_state
      if (prospect.website) extras.website = prospect.website
      if (prospect.linkedin_url || research?.company_linkedin) extras.linkedin = prospect.linkedin_url || research?.company_linkedin
      if (prospect.sub_industry) extras.sub_industry = prospect.sub_industry
      extras.outreach_status = 'Researching'

      const { data: dealData, error: dealErr } = await supabase
        .from('deals')
        .insert({ ...dealRow, ...extras })
        .select('id')
        .single()

      if (dealErr) {
        // Retry without extras
        const { data: fallback, error: fallbackErr } = await supabase
          .from('deals')
          .insert(dealRow)
          .select('id')
          .single()
        if (fallbackErr) throw fallbackErr
        if (fallback?.id && research?.contacts?.length > 0) {
          await insertContacts(fallback.id, prospect, research)
        }
      } else if (dealData?.id && research?.contacts?.length > 0) {
        await insertContacts(dealData.id, prospect, research)
      }

      setAddedIdxs(prev => new Set([...prev, idx]))
      onAdded(1)
    } catch (e) {
      alert('Error adding prospect: ' + e.message)
    } finally {
      setAddingIdx(null)
    }
  }

  async function insertContacts(dealId, prospect, research) {
    try {
      const contactRows = research.contacts.slice(0, 3).map((c, i) => ({
        property_id: effectivePropertyId,
        deal_id: dealId,
        first_name: c.first_name || '',
        last_name: c.last_name || null,
        email: c.email_pattern || null,
        phone: research.company_phone || null,
        position: c.position || null,
        company: prospect.company_name,
        city: prospect.headquarters_city || null,
        state: prospect.headquarters_state || null,
        linkedin: c.linkedin_url || null,
        website: prospect.website || null,
        is_primary: i === 0,
        notes: c.why_target || null,
      }))
      await supabase.from('contacts').insert(contactRows)
    } catch (e) { console.warn(e) 
      // contacts table may not exist
    }
  }

  function toggleSelected(idx, ci, prospect, contact) {
    const key = `${idx}:${ci}`
    setSelectedContacts(prev => {
      const next = new Map(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        if (next.size >= MAX_BULK_SEND) {
          toast({
            title: `Cap reached`,
            description: `You can select at most ${MAX_BULK_SEND} contacts at a time. Send this batch first.`,
            type: 'warning',
          })
          return prev
        }
        next.set(key, { prospect, contact })
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedContacts(new Map())
  }

  function selectAllForProspect(idx) {
    const research = researchedContacts[idx]
    if (!research?.contacts?.length) return
    const prospect = results[idx]
    setSelectedContacts(prev => {
      const next = new Map(prev)
      for (let ci = 0; ci < research.contacts.length; ci++) {
        const c = research.contacts[ci]
        if (!c.email && !c.email_pattern) continue
        const key = `${idx}:${ci}`
        if (!next.has(key) && next.size < MAX_BULK_SEND) {
          next.set(key, { prospect, contact: c })
        }
      }
      return next
    })
  }

  // Personalized bulk send. For each selected contact:
  //   1. Generate AI first-touch draft
  //   2. Invoke the connected provider (outlook | gmail) 'send' action
  //   3. Track per-contact progress for the UI
  async function handleBulkSend() {
    const entries = Array.from(selectedContacts.values())
    if (!entries.length) return
    if (entries.length > MAX_BULK_SEND) {
      toast({ title: `Too many selected (${entries.length})`, description: `Max ${MAX_BULK_SEND} per batch.`, type: 'warning' })
      return
    }
    setBulkSending(true)
    setBulkConfirmOpen(false)
    setBulkProgress({ sent: 0, failed: 0, total: entries.length })
    const fnName = bulkProvider === 'gmail' ? 'gmail-graph' : 'outlook-graph'
    let sent = 0, failed = 0
    for (const { prospect, contact } of entries) {
      const to = contact.email || contact.email_pattern
      if (!to) { failed++; continue }
      try {
        const draft = await draftFirstTouchEmail({
          prospect,
          contact,
          senderName: profile?.full_name,
          senderProperty: profile?.properties?.name,
        })
        const subject = draft?.subject || `Sponsorship opportunity with ${prospect.company_name || ''}`.trim()
        const body = draft?.body || ''
        const { error } = await supabase.functions.invoke(fnName, {
          body: {
            action: 'send',
            to: [to],
            subject,
            body,
            user_id: profile?.id,
          },
        })
        if (error) throw error
        sent++
      } catch (e) {
        console.warn('bulk send failed for', to, e)
        failed++
      }
      setBulkProgress({ sent, failed, total: entries.length })
    }
    setBulkSending(false)
    if (sent > 0) {
      toast({ title: `Sent ${sent} email${sent === 1 ? '' : 's'}`, description: failed ? `${failed} failed.` : `via ${bulkProvider}.`, type: failed ? 'warning' : 'success' })
    } else {
      toast({ title: 'Bulk send failed', description: `0 of ${entries.length} sent. Check your provider connection.`, type: 'error' })
    }
    clearSelection()
  }

  const SEARCH_CATEGORIES = [
    'Automotive', 'Banking & Financial Services', 'Beverage & Alcohol',
    'Consumer Packaged Goods', 'Energy & Utilities', 'Entertainment & Media',
    'Fashion & Apparel', 'Food & Quick Serve Restaurants', 'Gaming & Esports',
    'Healthcare', 'Hospitality & Travel', 'Insurance',
    'Real Estate & Construction', 'Retail', 'Sports & Fitness',
    'Technology & Software', 'Telecommunications',
  ]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prospect-finder-title"
        className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 id="prospect-finder-title" className="text-base sm:text-lg font-semibold text-text-primary">Find Prospects</h2>
              <p className="text-[10px] sm:text-xs text-text-muted mt-0.5">
                AI-powered search and suggestions
              </p>
            </div>
            <button onClick={onClose} aria-label="Close dialog" className="text-text-muted hover:text-text-primary text-lg p-1">&times;</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-bg-card rounded-lg p-1">
            <button
              onClick={() => setTab('search')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'search' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Search
            </button>
            <button
              onClick={() => { setTab('suggestions'); if (results.length === 0) handleSuggest() }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'suggestions' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              AI Suggestions
            </button>
          </div>

          {/* Verified Contact Toggle */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useVerified} onChange={(e) => setUseVerified(e.target.checked)} className="accent-accent w-3.5 h-3.5" />
              <span className={`text-xs font-mono ${useVerified ? 'text-accent' : 'text-text-muted'}`}>✓ Verified contacts</span>
            </label>
            <span className="text-[9px] text-text-muted">1 credit per lookup</span>
          </div>
        </div>

        {/* Search Controls */}
        {tab === 'search' && (
          <div className="p-3 sm:p-4 border-b border-border space-y-3">
            <div className="flex gap-2">
              <input
                placeholder="Search companies or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={loading || (!searchQuery.trim() && !searchCategory)}
                className="bg-accent text-bg-primary px-4 sm:px-5 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>
            {/* ICP Filter — narrows results to ideal customer profile */}
            <ICPFilter value={icpFilters} onChange={setIcpFilters} propertyId={effectivePropertyId} mode="inline" />
            <div className="flex gap-1.5 flex-wrap max-h-[100px] overflow-y-auto">
              <button
                onClick={() => { setSearchCategory(''); }}
                className={`px-2 py-1 rounded text-[11px] font-mono border ${!searchCategory ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-card border-border text-text-muted'}`}
              >
                All
              </button>
              {SEARCH_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSearchCategory(searchCategory === cat ? '' : cat) }}
                  className={`px-2 py-1 rounded text-[11px] font-mono border ${searchCategory === cat ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-card border-border text-text-muted'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions controls with ICP filter */}
        {tab === 'suggestions' && (
          <div className="p-3 sm:p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-text-secondary">
                Suggestions based on your pipeline, won deals, and market trends — filtered by your ICP.
              </div>
              <button onClick={handleSuggest} disabled={loading} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 shrink-0">
                {loading ? '...' : 'Refresh'}
              </button>
            </div>
            <ICPFilter value={icpFilters} onChange={setIcpFilters} propertyId={effectivePropertyId} mode="inline" />
          </div>
        )}

        {/* Status */}
        {status && (
          <div className="px-4 pt-3">
            <p className={`text-xs font-mono ${status.startsWith('Error') ? 'text-danger' : 'text-accent'}`}>{status}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-text-muted">{tab === 'search' ? 'Searching for prospects...' : 'Analyzing pipeline and finding suggestions...'}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {results.map((prospect, idx) => {
              const isAdded = addedIdxs.has(idx)
              const research = researchedContacts[idx]
              const isResearching = researchingIdx === idx
              const isAdding = addingIdx === idx
              
              return (
                <div key={idx} className={`bg-bg-card border rounded-lg overflow-hidden transition-colors ${isAdded ? 'border-success/40 bg-success/5' : 'border-border'}`}>
                  {/* Prospect Header */}
                  <div className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-text-primary">{prospect.company_name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-surface text-text-muted">
                            {prospect.category || prospect.sub_industry}
                          </span>
                          {prospect.priority && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              prospect.priority === 'High' ? 'bg-danger/10 text-danger' :
                              prospect.priority === 'Medium' ? 'bg-warning/10 text-warning' :
                              'bg-bg-surface text-text-muted'
                            }`}>{prospect.priority}</span>
                          )}
                          {prospect.icp_match_score && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              prospect.icp_match_score >= 8 ? 'bg-success/10 text-success' :
                              prospect.icp_match_score >= 5 ? 'bg-accent/10 text-accent' :
                              'bg-bg-surface text-text-muted'
                            }`} title="ICP match score">ICP {prospect.icp_match_score}/10</span>
                          )}
                          {prospect.reason && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              prospect.reason.includes('winner') ? 'bg-success/10 text-success' :
                              prospect.reason.includes('Trending') ? 'bg-accent/10 text-accent' :
                              'bg-warning/10 text-warning'
                            }`}>{prospect.reason}</span>
                          )}
                          {isAdded && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/10 text-success">Added</span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-1 text-[11px] text-text-muted font-mono flex-wrap">
                          {prospect.headquarters_city && (
                            <span>{prospect.headquarters_city}{prospect.headquarters_state ? `, ${prospect.headquarters_state}` : ''}</span>
                          )}
                          {prospect.estimated_sponsorship_budget && (
                            <span className="text-accent">Budget: {prospect.estimated_sponsorship_budget}</span>
                          )}
                          {prospect.estimated_revenue && <span>{prospect.estimated_revenue}</span>}
                        </div>
                        <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">
                          {prospect.why_good_fit || prospect.rationale || prospect.sponsorship_track_record}
                        </p>
                        <div className="flex gap-3 mt-2">
                          {prospect.website && (
                            <a href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent hover:underline">
                              Website
                            </a>
                          )}
                          {prospect.linkedin_url && (
                            <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent hover:underline font-medium">
                              Find on LinkedIn &rarr;
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col gap-2 sm:gap-1.5 shrink-0">
                        {!isAdded && (
                          <button
                            onClick={() => handleAddProspect(idx)}
                            disabled={isAdding || isResearching}
                            className="flex-1 sm:flex-none text-xs bg-accent text-bg-primary px-3 py-2 sm:py-1.5 rounded font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                          >
                            {isResearching ? 'Researching contacts...' : isAdding ? 'Adding...' : 'Add to Pipeline'}
                          </button>
                        )}
                        {isAdded && (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-success font-medium">Added with {research?.contacts?.length || 0} contacts</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Researched Contacts */}
                  {research && !research.error && research.contacts?.length > 0 && (
                    <div className="border-t border-border bg-bg-surface/50 p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
                            Top {research.contacts.length} Contacts
                          </span>
                          {research.source === 'apollo' && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/30">✓ Apollo Verified</span>
                          )}
                          {research.source === 'claude' && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">AI Researched</span>
                          )}
                          {research._fromCache && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">Cached — no token used</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => selectAllForProspect(idx)}
                          className="text-[10px] font-mono text-accent hover:underline"
                        >
                          Select all
                        </button>
                      </div>
                      <div className="space-y-2">
                        {research.contacts.map((contact, ci) => {
                          const selKey = `${idx}:${ci}`
                          const isSelected = selectedContacts.has(selKey)
                          const canSelect = !!(contact.email || contact.email_pattern)
                          return (
                          <div key={ci} className={`flex items-start gap-2 sm:gap-3 bg-bg-card border rounded p-2.5 sm:p-3 transition-colors ${isSelected ? 'border-accent' : 'border-border'}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!canSelect}
                              onChange={() => toggleSelected(idx, ci, prospect, contact)}
                              aria-label={`Select ${contact.first_name || 'contact'} for bulk send`}
                              className="accent-accent mt-1 w-3.5 h-3.5 shrink-0 disabled:opacity-30"
                              title={canSelect ? 'Include in bulk send' : 'No email available'}
                            />
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] sm:text-xs font-mono shrink-0">
                              {ci + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-medium text-text-primary">
                                  {contact.first_name} {contact.last_name}
                                </span>
                                <span className="text-[9px] sm:text-[10px] font-mono text-text-muted bg-bg-surface px-1 py-0.5 rounded">
                                  {contact.position}
                                </span>
                              </div>
                              <div className="flex gap-2 mt-1 text-[11px] text-text-muted font-mono flex-wrap">
                                {contact.email && (
                                  <span className="break-all flex items-center gap-1">
                                    {contact.email}
                                    {contact.email_verified === 'verified' && <span className="text-success" title="Email verified">✓</span>}
                                    {contact.email_verified === 'invalid' && <span className="text-danger" title="Invalid email">✗</span>}
                                    {contact.email_verified === 'risky' && <span className="text-warning" title="Risky email">⚠</span>}
                                  </span>
                                )}
                                {!contact.email && contact.email_pattern && <span className="break-all">{contact.email_pattern}</span>}
                                {contact.phone && <span>{contact.phone}</span>}
                                {contact.linkedin_url && (
                                  <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">
                                    LinkedIn &rarr;
                                  </a>
                                )}
                                {!contact.linkedin_url && contact.linkedin && (
                                  <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">
                                    LinkedIn &rarr;
                                  </a>
                                )}
                              </div>
                              {contact.why_target && (
                                <p className="text-[10px] sm:text-[11px] text-text-secondary mt-1">{contact.why_target}</p>
                              )}
                              {contact.outreach_tip && (
                                <p className="text-[10px] sm:text-[11px] text-accent/80 mt-0.5 italic">{contact.outreach_tip}</p>
                              )}
                              {(contact.email || contact.email_pattern) && (
                                <button
                                  type="button"
                                  onClick={() => composeEmail.open({
                                    to: contact.email || contact.email_pattern,
                                    defaultSubject: `Sponsorship opportunity with ${prospect.company_name || prospect.brand_name || ''}`.trim(),
                                    generateDraft: () => draftFirstTouchEmail({
                                      prospect,
                                      contact,
                                      senderName: profile?.full_name,
                                      senderProperty: profile?.properties?.name,
                                    }),
                                  })}
                                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-medium"
                                >
                                  ✉ Email {contact.first_name || 'this contact'}
                                </button>
                              )}
                            </div>
                          </div>
                          )
                        })}
                      </div>
                      {/* Find More Contacts button */}
                      <button
                        onClick={() => handleFindMoreContacts(idx)}
                        disabled={searchingMoreIdx === idx}
                        className="w-full mt-3 flex items-center justify-center gap-2 bg-bg-card border border-dashed border-border rounded-lg py-2.5 text-xs text-text-muted hover:text-accent hover:border-accent/40 disabled:opacity-50 transition-colors"
                      >
                        {searchingMoreIdx === idx ? (
                          <>
                            <span className="animate-spin w-3 h-3 border-2 border-accent border-t-transparent rounded-full"></span>
                            Finding more decision-makers...
                          </>
                        ) : (
                          <>+ Find More Contacts at {prospect.company_name}</>
                        )}
                      </button>

                      {research.company_phone && (
                        <div className="flex gap-4 mt-2 text-xs text-text-muted font-mono flex-wrap">
                          <span>Phone: {research.company_phone}</span>
                          {research.company_address && <span>HQ: {research.company_address}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Research error */}
                  {research?.error && (
                    <div className="border-t border-border p-3">
                      <p className="text-xs text-danger">{research.error}</p>
                    </div>
                  )}

                  {/* Researching spinner */}
                  {isResearching && (
                    <div className="border-t border-border p-4 flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full"></div>
                      <span className="text-xs text-text-muted">Researching top contacts at {prospect.company_name}...</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && !status && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm text-text-muted">
                {tab === 'search'
                  ? 'Search for prospects by company name, category, or keyword'
                  : 'Get AI-powered prospect suggestions based on your pipeline'
                }
              </p>
            </div>
          </div>
        )}

        {/* Bulk-send action bar */}
        {selectedContacts.size > 0 && (
          <div className="p-3 border-t border-accent/40 bg-accent/5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-text-primary">
                {selectedContacts.size} contact{selectedContacts.size === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBulkProvider('outlook')}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono ${bulkProvider === 'outlook' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}
                >
                  Outlook
                </button>
                <button
                  type="button"
                  onClick={() => setBulkProvider('gmail')}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono ${bulkProvider === 'gmail' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}
                >
                  Gmail
                </button>
              </div>
              <button type="button" onClick={clearSelection} className="text-[11px] text-text-muted hover:text-text-primary">
                Clear
              </button>
            </div>
            <button
              type="button"
              onClick={() => setBulkConfirmOpen(true)}
              disabled={bulkSending}
              className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {bulkSending
                ? `Sending… ${bulkProgress.sent + bulkProgress.failed}/${bulkProgress.total}`
                : `Send personalized to ${selectedContacts.size}`}
            </button>
          </div>
        )}

        {/* Bulk-send confirm dialog */}
        {bulkConfirmOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setBulkConfirmOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-bg-surface border border-border rounded-lg max-w-md w-full p-5">
              <h3 className="text-base font-semibold text-text-primary mb-2">Send {selectedContacts.size} personalized emails?</h3>
              <p className="text-xs text-text-muted mb-3">
                Each contact will receive an AI-drafted first-touch email via {bulkProvider === 'gmail' ? 'Gmail' : 'Outlook'}. This counts toward
                your daily send quota and cannot be undone.
              </p>
              <div className="bg-bg-card border border-border rounded p-2 max-h-40 overflow-y-auto mb-4">
                <ul className="text-[11px] text-text-secondary font-mono space-y-1">
                  {Array.from(selectedContacts.values()).map(({ contact, prospect }, i) => (
                    <li key={i} className="truncate">
                      {contact.email || contact.email_pattern} <span className="text-text-muted">— {prospect.company_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkConfirmOpen(false)}
                  className="px-3 py-1.5 bg-bg-card text-text-secondary text-xs rounded hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkSend}
                  className="px-3 py-1.5 bg-accent text-bg-primary text-xs rounded font-medium hover:opacity-90"
                >
                  Send all
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border flex items-center justify-between gap-2">
          <div className="text-xs text-text-muted font-mono">
            {addedIdxs.size > 0 && `${addedIdxs.size} of ${results.length} added`}
            {addedIdxs.size === 0 && results.length > 0 && `${results.length} prospects found`}
          </div>
          <div className="flex gap-2">
            {results.length > 0 && addedIdxs.size < results.length && (
              <button
                onClick={async () => {
                  for (let i = 0; i < results.length; i++) {
                    if (!addedIdxs.has(i) && addingIdx === null) {
                      await handleAddProspect(i)
                    }
                  }
                }}
                disabled={addingIdx !== null || researchingIdx !== null}
                className="px-4 bg-accent text-bg-primary py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                Add All ({results.length - addedIdxs.size})
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 sm:px-6 bg-bg-card text-text-secondary py-2 rounded text-sm hover:text-text-primary"
            >
              {addedIdxs.size > 0 ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
