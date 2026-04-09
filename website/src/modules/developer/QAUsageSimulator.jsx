import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const SIM_PROPERTY_NAME = '🔬 QA Simulator Property'

// Plan limits for calculating 70% capacity
const PLAN_LIMITS = {
  starter: { prospect_search: 50, contact_research: 40, contract_upload: 25, ai_valuation: 25, newsletter_generate: 10, deals: 500, users: 5 },
  pro: { prospect_search: 200, contact_research: 160, contract_upload: 999999, ai_valuation: 200, newsletter_generate: 999999, deals: 999999, users: 15 },
  enterprise: { prospect_search: 999999, contact_research: 999999, contract_upload: 999999, ai_valuation: 999999, newsletter_generate: 999999, deals: 999999, users: 999999 },
}

// Realistic fake data
const BRANDS = [
  'Nike', 'Adidas', 'Coca-Cola', 'Pepsi', 'Gatorade', 'State Farm', 'Geico', 'Toyota', 'Ford', 'Budweiser',
  'Red Bull', 'Monster Energy', 'Under Armour', 'New Balance', 'Puma', 'Visa', 'Mastercard', 'AT&T', 'Verizon', 'T-Mobile',
  'McDonald\'s', 'Chick-fil-A', 'Subway', 'Wendy\'s', 'Taco Bell', 'Amazon', 'Google', 'Microsoft', 'Apple', 'Samsung',
  'Delta Airlines', 'Southwest', 'Hilton', 'Marriott', 'FanDuel', 'DraftKings', 'Crypto.com', 'SoFi', 'Allstate', 'Progressive',
  'Lowe\'s', 'Home Depot', 'Target', 'Walmart', 'Best Buy', 'Capital One', 'Chase', 'Bank of America', 'Wells Fargo', 'USAA',
  'Intel', 'Cisco', 'Salesforce', 'Oracle', 'IBM', 'Uber', 'Lyft', 'DoorDash', 'Instacart', 'Spotify',
  'Netflix', 'Hulu', 'Disney', 'ESPN+', 'YouTube TV', 'Michelob Ultra', 'Corona', 'Modelo', 'Jack Daniel\'s', 'Grey Goose',
  'Titleist', 'Callaway', 'TaylorMade', 'Ping', 'Rolex', 'Omega', 'Tag Heuer', 'Breitling', 'Patagonia', 'The North Face',
  'Tesla', 'BMW', 'Mercedes', 'Audi', 'Porsche', 'Hyundai', 'Kia', 'Honda', 'Chevrolet', 'Ram Trucks',
  'Gatorade Zero', 'PRIME', 'Body Armor', 'Powerade', 'Celsius', 'Liquid IV', 'Nuun', 'LMNT', 'AG1', 'Herbalife',
  'Fidelity', 'Schwab', 'Robinhood', 'eTrade', 'Webull', 'Accenture', 'Deloitte', 'PwC', 'KPMG', 'EY',
  'Lululemon', 'Peloton', 'Whoop', 'Oura', 'Garmin', 'Fitbit', 'GoPro', 'Bose', 'Sony', 'LG',
]

const FIRST_NAMES = ['Jason', 'Sarah', 'Mike', 'Emily', 'David', 'Jessica', 'Chris', 'Amanda', 'Brian', 'Nicole', 'Kevin', 'Lauren', 'Matt', 'Rachel', 'Tom', 'Megan', 'Ryan', 'Heather', 'Josh', 'Stephanie', 'Alex', 'Jen', 'Tyler', 'Brianna', 'Cody', 'Natalie', 'Derek', 'Kayla', 'Jake', 'Samantha']
const LAST_NAMES = ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'King', 'Wright', 'Scott', 'Hill', 'Green']
const POSITIONS = ['VP Marketing', 'Director of Sponsorships', 'CMO', 'Brand Manager', 'Head of Partnerships', 'Marketing Manager', 'SVP Marketing', 'Partnership Director', 'Sponsorship Manager', 'Chief Brand Officer', 'VP Sales', 'Regional Director', 'Account Executive', 'Business Development Lead', 'Community Relations Manager']
const STAGES = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed']
const SOURCES = ['Inbound', 'Outbound', 'Referral', 'Event', 'Cold Call', 'LinkedIn', 'Website', 'Trade Show']
const ASSET_CATEGORIES = ['LED Board', 'Jersey Patch', 'Radio Read', 'Social Post', 'Naming Right', 'Signage', 'Activation Space', 'Digital']
const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'Task Completed', 'Follow Up']
const EVENT_TYPES = ['Game Day', 'Tournament', 'Banquet', 'Clinic', 'Fundraiser', 'Other']
const USAGE_ACTIONS = ['prospect_search', 'contact_research', 'contract_upload', 'ai_valuation', 'newsletter_generate']

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randDate(daysBack, daysForward = 0) {
  const d = new Date()
  d.setDate(d.getDate() - randInt(-daysForward, daysBack))
  return d.toISOString().split('T')[0]
}

export default function QAUsageSimulator() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [stats, setStats] = useState(null)
  const [simPlan, setSimPlan] = useState('pro')
  const [capacityPct, setCapacityPct] = useState(70)

  async function checkActive() {
    const { data } = await supabase.from('properties').select('id').eq('name', SIM_PROPERTY_NAME).maybeSingle()
    setActive(!!data)
    return data?.id
  }

  useState(() => { checkActive() })

  // Calculate volumes based on plan + capacity %
  function getVolumes() {
    const limits = PLAN_LIMITS[simPlan]
    const pct = capacityPct / 100
    const maxDeals = Math.min(limits.deals, 500) // cap at 500 for perf
    const maxUsers = Math.min(limits.users, 15)
    return {
      deals: Math.round(maxDeals * pct),
      contacts: Math.round(maxDeals * pct * 1.8), // ~2 contacts per deal
      contracts: Math.round(maxDeals * pct * 0.35), // ~35% have contracts
      assets: Math.min(50, Math.round(maxDeals * pct * 0.3)),
      fulfillment: Math.round(maxDeals * pct * 0.35 * 5), // ~5 per contract
      activities: Math.round(maxDeals * pct * 3), // ~3 activities per deal
      tasks: Math.round(maxDeals * pct * 0.5),
      events: Math.min(30, Math.round(maxDeals * pct * 0.1)),
      users: Math.round(maxUsers * pct),
      // Usage at 70% of plan limits
      usage_prospect: Math.round(limits.prospect_search * pct),
      usage_research: Math.round(limits.contact_research * pct),
      usage_upload: Math.min(Math.round(limits.contract_upload * pct), 200),
      usage_valuation: Math.round(limits.ai_valuation * pct),
      usage_newsletter: Math.min(Math.round(limits.newsletter_generate * pct), 50),
    }
  }

  async function startSimulation() {
    const vol = getVolumes()
    const totalRecords = vol.deals + vol.contacts + vol.contracts + vol.assets + vol.fulfillment + vol.activities + vol.tasks + vol.events + vol.users + vol.usage_prospect + vol.usage_research + vol.usage_upload + vol.usage_valuation + vol.usage_newsletter
    if (!confirm(`This will create ~${totalRecords.toLocaleString()} records simulating ${capacityPct}% of the ${simPlan} plan. Continue?`)) return
    setLoading(true)
    const counts = { deals: 0, contacts: 0, contracts: 0, benefits: 0, assets: 0, fulfillment: 0, activities: 0, tasks: 0, events: 0, users: 0, usage: 0 }

    try {
      // 1. Create QA property with plan
      setProgress('Creating QA property...')
      const { data: prop, error: propErr } = await supabase.from('properties').insert({
        name: SIM_PROPERTY_NAME, sport: 'QA Testing', city: 'Test City', state: 'QA', plan: simPlan,
      }).select().single()
      if (propErr) throw propErr
      const pid = prop.id

      // 2. Create simulated user profiles (fake auth users can't be created, so we simulate via profiles)
      setProgress(`Creating ${vol.users} simulated team members...`)
      const simUsers = []
      for (let i = 0; i < vol.users; i++) {
        const first = rand(FIRST_NAMES), last = rand(LAST_NAMES)
        const { data: user } = await supabase.from('profiles').upsert({
          id: crypto.randomUUID(),
          property_id: pid,
          full_name: `${first} ${last} (SIM)`,
          email: `sim.${first.toLowerCase()}.${last.toLowerCase()}${i}@qa-test.loud-legacy.com`,
          role: i === 0 ? 'admin' : 'rep',
        }, { onConflict: 'id' }).select().maybeSingle()
        if (user) simUsers.push(user)
      }
      counts.users = simUsers.length
      const allUserIds = [profile?.id, ...simUsers.map(u => u.id)].filter(Boolean)

      // 3. Create assets
      setProgress(`Creating ${vol.assets} assets...`)
      const assetRows = Array.from({ length: vol.assets }, (_, i) => ({
        property_id: pid,
        name: `${rand(ASSET_CATEGORIES)} Package ${i + 1}`,
        category: rand(ASSET_CATEGORIES),
        quantity: randInt(5, 100),
        base_price: randInt(1000, 75000),
        impressions_per_game: randInt(5000, 500000),
        active: true,
      }))
      const { data: assets } = await supabase.from('assets').insert(assetRows).select()
      counts.assets = assets?.length || 0

      // 4. Create deals
      setProgress(`Creating ${vol.deals} deals...`)
      const usedBrands = new Set()
      const suffixes = ['East', 'West', 'North', 'South', 'Regional', 'National', 'Local', 'Global', 'Corp', 'Inc', 'Group', 'Partners']
      const dealRows = Array.from({ length: vol.deals }, () => {
        let brand = rand(BRANDS)
        let attempts = 0
        while (usedBrands.has(brand) && attempts < 10) { brand = `${rand(BRANDS)} ${rand(suffixes)}`; attempts++ }
        if (usedBrands.has(brand)) brand = `${rand(BRANDS)} ${randInt(1, 999)}`
        usedBrands.add(brand)
        const first = rand(FIRST_NAMES), last = rand(LAST_NAMES)
        return {
          property_id: pid,
          brand_name: brand,
          contact_name: `${first} ${last}`,
          contact_email: `${first.toLowerCase()}.${last.toLowerCase()}@${brand.toLowerCase().replace(/[^a-z]/g, '')}.com`,
          contact_first_name: first,
          contact_last_name: last,
          contact_position: rand(POSITIONS),
          contact_company: brand,
          value: randInt(5000, 500000),
          start_date: randDate(180),
          end_date: randDate(-30, 365),
          stage: rand(STAGES),
          source: rand(SOURCES),
          sub_industry: rand(['Automotive', 'Beverage', 'Technology', 'Financial Services', 'Retail', 'Healthcare', 'Food & QSR', 'Telecom', 'Insurance', 'Energy']),
          notes: `Simulated deal for QA load testing. ${rand(POSITIONS)} at ${brand}.`,
          win_probability: randInt(10, 95),
          priority: rand(['High', 'Medium', 'Low']),
          assigned_to: rand(allUserIds),
        }
      })
      const allDeals = []
      for (let i = 0; i < dealRows.length; i += 40) {
        setProgress(`Creating deals ${i + 1}-${Math.min(i + 40, dealRows.length)}...`)
        const { data } = await supabase.from('deals').insert(dealRows.slice(i, i + 40)).select()
        if (data) allDeals.push(...data)
      }
      counts.deals = allDeals.length

      // 5. Create contacts
      setProgress(`Creating ${vol.contacts} contacts...`)
      const contactRows = Array.from({ length: vol.contacts }, () => {
        const deal = rand(allDeals)
        const first = rand(FIRST_NAMES), last = rand(LAST_NAMES)
        return {
          property_id: pid,
          deal_id: Math.random() > 0.2 ? deal?.id : null,
          first_name: first,
          last_name: last,
          email: `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1, 99)}@${(deal?.brand_name || 'example').toLowerCase().replace(/[^a-z]/g, '')}.com`,
          phone: `(${randInt(200, 999)}) ${randInt(200, 999)}-${randInt(1000, 9999)}`,
          position: rand(POSITIONS),
          company: deal?.brand_name || rand(BRANDS),
          city: rand(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Dallas', 'Miami', 'Atlanta', 'Denver', 'Seattle', 'Boston', 'Nashville', 'Charlotte', 'Portland', 'Austin']),
          state: rand(['NY', 'CA', 'IL', 'TX', 'AZ', 'TX', 'FL', 'GA', 'CO', 'WA', 'MA', 'TN', 'NC', 'OR', 'TX']),
          is_primary: Math.random() > 0.7,
          notes: Math.random() > 0.5 ? `Met at ${rand(['trade show', 'conference', 'networking event', 'LinkedIn', 'referral from colleague'])}` : null,
        }
      })
      for (let i = 0; i < contactRows.length; i += 50) {
        setProgress(`Creating contacts ${i + 1}-${Math.min(i + 50, contactRows.length)}...`)
        const { data } = await supabase.from('contacts').insert(contactRows.slice(i, i + 50)).select()
        counts.contacts += data?.length || 0
      }

      // 6. Create contracts
      const contractDeals = allDeals.filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)).slice(0, vol.contracts)
      if (contractDeals.length > 0) {
        setProgress(`Creating ${contractDeals.length} contracts...`)
        const contractRows = contractDeals.map(d => ({
          deal_id: d.id,
          property_id: pid,
          brand_name: d.brand_name,
          contract_number: `SIM-${randInt(10000, 99999)}`,
          effective_date: d.start_date,
          expiration_date: d.end_date,
          total_value: d.value,
          signed: true,
          signed_date: randDate(90),
          status: rand(['Active', 'Signed', 'Draft']),
          created_by: rand(allUserIds),
        }))
        const { data: contracts } = await supabase.from('contracts').insert(contractRows).select()
        counts.contracts = contracts?.length || 0

        // 6b. Contract benefits — link to assets
        setProgress('Creating contract benefits...')
        const benefitFreqs = ['Per Game', 'Per Month', 'Per Season', 'One Time']
        const benefitDescs = ['LED signage during games', 'Social media mentions', 'Jersey logo placement', 'PA announcements', 'Naming rights display', 'Digital banner ads', 'Activation booth space', 'Halftime feature', 'Pre-game presentation', 'Radio read sponsorship']
        const benefitRows = (contracts || []).flatMap(c => {
          return Array.from({ length: randInt(2, 6) }, () => {
            const asset = rand(assets || [])
            return {
              contract_id: c.id,
              asset_id: asset?.id || null,
              benefit_description: rand(benefitDescs),
              quantity: randInt(1, 10),
              frequency: rand(benefitFreqs),
              value: randInt(500, 25000),
            }
          })
        })
        for (let i = 0; i < benefitRows.length; i += 50) {
          await supabase.from('contract_benefits').insert(benefitRows.slice(i, i + 50))
        }
        counts.benefits = benefitRows.length

        // 7. Fulfillment records
        setProgress(`Creating fulfillment records...`)
        const fulfillmentRows = (contracts || []).flatMap(c => {
          return Array.from({ length: randInt(3, 8) }, () => ({
            deal_id: c.deal_id,
            contract_id: c.id,
            asset_id: rand(assets || [])?.id || null,
            scheduled_date: randDate(60, 180),
            delivered: Math.random() > 0.4,
            delivery_notes: `${rand(ASSET_CATEGORIES)} delivery — ${rand(['on schedule', 'ahead of schedule', 'rescheduled', 'confirmed', 'awaiting approval'])}`,
            auto_generated: true,
          }))
        })
        for (let i = 0; i < fulfillmentRows.length; i += 50) {
          const { data: fr } = await supabase.from('fulfillment_records').insert(fulfillmentRows.slice(i, i + 50)).select()
          counts.fulfillment += fr?.length || 0
        }
      }

      // 8. Activities — heavy
      setProgress(`Creating ${vol.activities} activities...`)
      const activityRows = Array.from({ length: vol.activities }, () => {
        const deal = rand(allDeals)
        const type = rand(ACTIVITY_TYPES)
        return {
          property_id: pid,
          deal_id: deal?.id,
          activity_type: type,
          subject: `${type} with ${deal?.contact_name || deal?.brand_name || 'prospect'} at ${deal?.brand_name}`,
          description: `${type}: Discussed ${rand(['sponsorship terms', 'activation ideas', 'renewal options', 'budget allocation', 'brand visibility', 'event integration', 'contract details', 'ROI metrics'])}. ${rand(['Positive reception', 'Need follow-up', 'Decision pending', 'Moving forward', 'Asked for revised proposal', 'Referred to VP'])}`,
          occurred_at: new Date(Date.now() - randInt(0, 120 * 86400000)).toISOString(),
          created_by: rand(allUserIds),
        }
      })
      for (let i = 0; i < activityRows.length; i += 50) {
        setProgress(`Creating activities ${i + 1}-${Math.min(i + 50, activityRows.length)}...`)
        const { data } = await supabase.from('activities').insert(activityRows.slice(i, i + 50)).select()
        counts.activities += data?.length || 0
      }

      // 9. Tasks
      setProgress(`Creating ${vol.tasks} tasks...`)
      const taskVerbs = ['Follow up with', 'Send proposal to', 'Schedule meeting with', 'Review contract for', 'Prepare deck for', 'Call back', 'Email recap to', 'Send pricing to', 'Coordinate activation with', 'Finalize terms with']
      const taskRows = Array.from({ length: vol.tasks }, () => {
        const deal = rand(allDeals)
        return {
          property_id: pid,
          deal_id: deal?.id,
          title: `${rand(taskVerbs)} ${deal?.brand_name}`,
          description: `Auto-generated task for QA load testing.`,
          priority: rand(['High', 'Medium', 'Low']),
          status: rand(['Pending', 'Pending', 'In Progress', 'Done', 'Done']), // weighted toward pending
          due_date: randDate(-14, 30),
          assigned_to: rand(allUserIds),
          created_by: rand(allUserIds),
        }
      })
      for (let i = 0; i < taskRows.length; i += 50) {
        const { data } = await supabase.from('tasks').insert(taskRows.slice(i, i + 50)).select()
        counts.tasks += data?.length || 0
      }

      // 10. Events
      setProgress(`Creating ${vol.events} events...`)
      const eventRows = Array.from({ length: vol.events }, (_, i) => ({
        property_id: pid,
        name: `${rand(['Home', 'Away', 'Rivalry', 'Championship', 'Alumni', 'Preseason', 'Playoff', 'Season Opener'])} ${rand(EVENT_TYPES)} ${i + 1}`,
        event_date: new Date(Date.now() + randInt(-60, 120) * 86400000).toISOString(),
        venue: rand(['Main Stadium', 'Arena Center', 'Convention Hall', 'Field House', 'Ballroom', 'Conference Center', 'Club Level', 'Suite Deck', 'Press Room', 'Training Facility']),
        event_type: rand(EVENT_TYPES),
        status: rand(['Planning', 'Confirmed', 'In Progress', 'Completed']),
        notes: `QA simulated event with ${randInt(50, 5000)} expected attendees.`,
      }))
      const { data: eventData } = await supabase.from('events').insert(eventRows).select()
      counts.events = eventData?.length || 0

      // 11. Usage tracking — simulate 70% of plan API usage this month
      setProgress(`Simulating API usage at ${capacityPct}% capacity...`)
      const usageRows = []
      const usagePairs = [
        ['prospect_search', vol.usage_prospect],
        ['contact_research', vol.usage_research],
        ['contract_upload', vol.usage_upload],
        ['ai_valuation', vol.usage_valuation],
        ['newsletter_generate', vol.usage_newsletter],
      ]
      for (const [action, count] of usagePairs) {
        const cappedCount = Math.min(count, 200) // cap per action for DB sanity
        for (let i = 0; i < cappedCount; i++) {
          // Spread across the month
          const daysAgo = randInt(0, 28)
          usageRows.push({
            property_id: pid,
            user_id: rand(allUserIds),
            action_type: action,
            created_at: new Date(Date.now() - daysAgo * 86400000 - randInt(0, 86400000)).toISOString(),
          })
        }
      }
      for (let i = 0; i < usageRows.length; i += 50) {
        setProgress(`Creating usage records ${i + 1}-${Math.min(i + 50, usageRows.length)}...`)
        const { data } = await supabase.from('usage_tracker').insert(usageRows.slice(i, i + 50)).select()
        counts.usage += data?.length || 0
      }

      // 12. Valuations
      setProgress('Creating valuations...')
      const valRows = (assets || []).slice(0, 15).map(a => ({
        property_id: pid,
        asset_id: a.id,
        audience_size: randInt(5000, 500000),
        broadcast_minutes: randInt(1, 30),
        screen_share_percent: randInt(5, 80),
        clarity_score: (Math.random() * 0.5 + 0.5).toFixed(2),
        cpp: randInt(10, 100),
        calculated_emv: randInt(5000, 200000),
        claude_suggested_emv: randInt(5000, 200000),
        claude_reasoning: 'QA simulated valuation based on market benchmarks.',
      }))
      await supabase.from('valuations').insert(valRows)

      setStats(counts)
      setActive(true)
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      toast({ title: `Simulator ON — ${total.toLocaleString()} records (${simPlan} at ${capacityPct}%)`, type: 'success' })
    } catch (err) {
      toast({ title: 'Simulation failed', description: err.message, type: 'error' })
    }
    setProgress('')
    setLoading(false)
  }

  async function stopSimulation() {
    if (!confirm('Delete the QA Simulator property and ALL its data?')) return
    setLoading(true)
    setProgress('Removing simulated data...')

    try {
      const { data: prop } = await supabase.from('properties').select('id').eq('name', SIM_PROPERTY_NAME).maybeSingle()
      if (prop) {
        const pid = prop.id
        const dealIds = (await supabase.from('deals').select('id').eq('property_id', pid)).data?.map(d => d.id) || []

        setProgress('Removing activities & tasks...')
        await supabase.from('activities').delete().eq('property_id', pid)
        await supabase.from('tasks').delete().eq('property_id', pid)
        await supabase.from('usage_tracker').delete().eq('property_id', pid)
        await supabase.from('valuations').delete().eq('property_id', pid)

        if (dealIds.length > 0) {
          setProgress('Removing fulfillment & contracts...')
          // Batch delete fulfillment, benefits, contracts in chunks
          for (let i = 0; i < dealIds.length; i += 50) {
            await supabase.from('fulfillment_records').delete().in('deal_id', dealIds.slice(i, i + 50))
          }
          // Delete benefits via contract_ids
          const { data: contractIds } = await supabase.from('contracts').select('id').eq('property_id', pid)
          if (contractIds?.length) {
            for (let i = 0; i < contractIds.length; i += 50) {
              await supabase.from('contract_benefits').delete().in('contract_id', contractIds.slice(i, i + 50).map(c => c.id))
            }
          }
          for (let i = 0; i < dealIds.length; i += 50) {
            await supabase.from('contracts').delete().in('deal_id', dealIds.slice(i, i + 50))
          }
        }

        setProgress('Removing contacts, deals, assets...')
        await supabase.from('contacts').delete().eq('property_id', pid)
        await supabase.from('deals').delete().eq('property_id', pid)
        await supabase.from('assets').delete().eq('property_id', pid)
        await supabase.from('events').delete().eq('property_id', pid)

        // Remove sim profiles
        setProgress('Removing simulated users...')
        await supabase.from('profiles').delete().eq('property_id', pid)

        await supabase.from('properties').delete().eq('id', pid)
      }
      setActive(false)
      setStats(null)
      toast({ title: 'Simulator OFF — all simulated data removed', type: 'success' })
    } catch (err) {
      toast({ title: 'Cleanup failed', description: err.message, type: 'error' })
    }
    setProgress('')
    setLoading(false)
  }

  const vol = getVolumes()

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-medium text-text-primary">Usage Simulator</h4>
          <p className="text-[10px] text-text-muted mt-0.5">Simulate a real customer at high capacity — {capacityPct}% of plan limits with active users.</p>
        </div>
        <button
          onClick={active ? stopSimulation : startSimulation}
          disabled={loading}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
            active ? 'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30' : 'bg-accent text-bg-primary hover:opacity-90'
          }`}
        >
          {loading ? progress || 'Working...' : active ? 'Turn OFF' : 'Turn ON'}
        </button>
      </div>

      {/* Config (only when inactive) */}
      {!active && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Simulate Plan</label>
            <div className="flex gap-1">
              {['starter', 'pro', 'enterprise'].map(p => (
                <button key={p} onClick={() => setSimPlan(p)} className={`px-3 py-1.5 rounded text-xs font-medium capitalize ${simPlan === p ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Capacity: {capacityPct}%</label>
            <input type="range" min={20} max={95} value={capacityPct} onChange={e => setCapacityPct(Number(e.target.value))} className="w-full accent-accent" />
            <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
              <span>20% (light)</span><span>70% (heavy)</span><span>95% (near limit)</span>
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-success animate-pulse' : 'bg-bg-card border border-border'}`} />
        <span className={`text-xs font-mono ${active ? 'text-success' : 'text-text-muted'}`}>{active ? `ACTIVE — ${simPlan} at ${capacityPct}%` : 'INACTIVE'}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
        {[
          { label: 'Deals', count: stats?.deals ?? vol.deals },
          { label: 'Contacts', count: stats?.contacts ?? vol.contacts },
          { label: 'Contracts', count: stats?.contracts ?? vol.contracts },
          { label: 'Benefits', count: stats?.benefits ?? Math.round(vol.contracts * 4) },
          { label: 'Assets', count: stats?.assets ?? vol.assets },
          { label: 'Fulfillment', count: stats?.fulfillment ?? vol.fulfillment },
          { label: 'Activities', count: stats?.activities ?? vol.activities },
          { label: 'Tasks', count: stats?.tasks ?? vol.tasks },
          { label: 'Events', count: stats?.events ?? vol.events },
          { label: 'Team', count: stats?.users ?? vol.users },
          { label: 'API Usage', count: stats?.usage ?? (vol.usage_prospect + vol.usage_research + vol.usage_upload + vol.usage_valuation + vol.usage_newsletter) },
        ].map(s => (
          <div key={s.label} className="bg-bg-card rounded p-2">
            <div className={`text-sm font-bold ${active ? 'text-accent' : 'text-text-muted'}`}>{typeof s.count === 'number' ? s.count.toLocaleString() : s.count}</div>
            <div className="text-[9px] text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Usage breakdown */}
      {!active && (
        <div className="bg-bg-card rounded p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">API Usage at {capacityPct}% of {simPlan} limits</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
            {[
              { label: 'Prospect Search', used: vol.usage_prospect, max: PLAN_LIMITS[simPlan].prospect_search },
              { label: 'Contact Research', used: vol.usage_research, max: PLAN_LIMITS[simPlan].contact_research },
              { label: 'Contract Upload', used: Math.min(vol.usage_upload, 200), max: Math.min(PLAN_LIMITS[simPlan].contract_upload, 200) },
              { label: 'AI Valuation', used: vol.usage_valuation, max: PLAN_LIMITS[simPlan].ai_valuation },
              { label: 'Newsletter', used: Math.min(vol.usage_newsletter, 50), max: Math.min(PLAN_LIMITS[simPlan].newsletter_generate, 50) },
            ].map(u => (
              <div key={u.label}>
                <div className="text-text-secondary">{u.label}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex-1 bg-bg-surface rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.min(100, (u.used / u.max) * 100)}%` }} />
                  </div>
                  <span className="text-text-muted font-mono">{u.used}/{u.max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active && (
        <p className="text-[10px] text-warning">
          Simulated data is isolated under "{SIM_PROPERTY_NAME}" with {vol.users} fake team members. Turn OFF to delete everything.
        </p>
      )}
    </div>
  )
}
