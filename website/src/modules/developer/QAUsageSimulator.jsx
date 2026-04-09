import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const SIM_PROPERTY_NAME = '🔬 QA Simulator Property'

// Realistic fake data generators
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
]

const FIRST_NAMES = ['Jason', 'Sarah', 'Mike', 'Emily', 'David', 'Jessica', 'Chris', 'Amanda', 'Brian', 'Nicole', 'Kevin', 'Lauren', 'Matt', 'Rachel', 'Tom', 'Megan', 'Ryan', 'Heather', 'Josh', 'Stephanie']
const LAST_NAMES = ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris']
const POSITIONS = ['VP Marketing', 'Director of Sponsorships', 'CMO', 'Brand Manager', 'Head of Partnerships', 'Marketing Manager', 'SVP Marketing', 'Partnership Director', 'Sponsorship Manager', 'Chief Brand Officer']
const STAGES = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed']
const SOURCES = ['Inbound', 'Outbound', 'Referral', 'Event', 'Cold Call', 'LinkedIn', 'Website', 'Trade Show']
const ASSET_CATEGORIES = ['LED Board', 'Jersey Patch', 'Radio Read', 'Social Post', 'Naming Right', 'Signage', 'Activation Space', 'Digital']
const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'Task Completed', 'Follow Up']
const EVENT_TYPES = ['Game Day', 'Tournament', 'Banquet', 'Clinic', 'Fundraiser', 'Other']

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

  // Check if simulator property exists
  async function checkActive() {
    const { data } = await supabase.from('properties').select('id').eq('name', SIM_PROPERTY_NAME).maybeSingle()
    setActive(!!data)
    return data?.id
  }

  // Check on mount
  useState(() => { checkActive() })

  async function startSimulation() {
    if (!confirm('This will create a QA Simulator property with 100+ deals, contacts, contracts, assets, events, and activities. Continue?')) return
    setLoading(true)
    const counts = { deals: 0, contacts: 0, contracts: 0, assets: 0, fulfillment: 0, activities: 0, tasks: 0, events: 0 }

    try {
      // 1. Create QA property
      setProgress('Creating QA property...')
      const { data: prop, error: propErr } = await supabase.from('properties').insert({
        name: SIM_PROPERTY_NAME, sport: 'QA Testing', city: 'Test City', state: 'QA',
      }).select().single()
      if (propErr) throw propErr
      const pid = prop.id

      // 2. Create assets (30)
      setProgress('Creating 30 assets...')
      const assetRows = Array.from({ length: 30 }, (_, i) => ({
        property_id: pid,
        name: `${rand(ASSET_CATEGORIES)} ${i + 1}`,
        category: rand(ASSET_CATEGORIES),
        quantity: randInt(1, 50),
        base_price: randInt(500, 50000),
        active: true,
      }))
      const { data: assets } = await supabase.from('assets').insert(assetRows).select()
      counts.assets = assets?.length || 0

      // 3. Create deals (120)
      setProgress('Creating 120 deals...')
      const usedBrands = new Set()
      const dealRows = Array.from({ length: 120 }, () => {
        let brand = rand(BRANDS)
        while (usedBrands.has(brand)) brand = `${rand(BRANDS)} ${rand(['East', 'West', 'North', 'South', 'Regional', 'National', 'Local', 'Global'])}`
        usedBrands.add(brand)
        const first = rand(FIRST_NAMES), last = rand(LAST_NAMES)
        return {
          property_id: pid,
          brand_name: brand,
          contact_name: `${first} ${last}`,
          contact_email: `${first.toLowerCase()}.${last.toLowerCase()}@${brand.toLowerCase().replace(/[^a-z]/g, '')}.com`,
          value: randInt(5000, 500000),
          start_date: randDate(180),
          end_date: randDate(-30, 365),
          stage: rand(STAGES),
          source: rand(SOURCES),
          notes: `Simulated deal for QA testing. Contact: ${rand(POSITIONS)}.`,
          win_probability: randInt(10, 95),
          priority: rand(['High', 'Medium', 'Low']),
        }
      })
      // Insert in batches of 40
      const allDeals = []
      for (let i = 0; i < dealRows.length; i += 40) {
        const { data } = await supabase.from('deals').insert(dealRows.slice(i, i + 40)).select()
        if (data) allDeals.push(...data)
      }
      counts.deals = allDeals.length

      // 4. Create contacts (200)
      setProgress('Creating 200 contacts...')
      const contactRows = Array.from({ length: 200 }, () => {
        const deal = rand(allDeals)
        const first = rand(FIRST_NAMES), last = rand(LAST_NAMES)
        return {
          property_id: pid,
          deal_id: Math.random() > 0.3 ? deal?.id : null,
          first_name: first,
          last_name: last,
          email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
          phone: `(${randInt(200, 999)}) ${randInt(200, 999)}-${randInt(1000, 9999)}`,
          position: rand(POSITIONS),
          company: deal?.brand_name || rand(BRANDS),
          city: rand(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Dallas', 'Miami', 'Atlanta', 'Denver', 'Seattle']),
          state: rand(['NY', 'CA', 'IL', 'TX', 'AZ', 'TX', 'FL', 'GA', 'CO', 'WA']),
          is_primary: Math.random() > 0.7,
        }
      })
      for (let i = 0; i < contactRows.length; i += 50) {
        const { data } = await supabase.from('contacts').insert(contactRows.slice(i, i + 50)).select()
        counts.contacts += data?.length || 0
      }

      // 5. Create contracts (40 — for contracted/fulfilled/renewed deals)
      setProgress('Creating 40 contracts...')
      const contractDeals = allDeals.filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)).slice(0, 40)
      if (contractDeals.length > 0) {
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
        }))
        const { data } = await supabase.from('contracts').insert(contractRows).select()
        counts.contracts = data?.length || 0

        // 6. Create fulfillment records (5 per contract)
        setProgress('Creating fulfillment records...')
        const fulfillmentRows = (data || []).flatMap(c => {
          return Array.from({ length: randInt(3, 8) }, () => ({
            deal_id: c.deal_id,
            contract_id: c.id,
            asset_id: rand(assets || [])?.id || null,
            scheduled_date: randDate(60, 180),
            delivered: Math.random() > 0.5,
            delivery_notes: `Simulated fulfillment — ${rand(ASSET_CATEGORIES)}`,
            auto_generated: true,
          }))
        })
        for (let i = 0; i < fulfillmentRows.length; i += 50) {
          const { data: fr } = await supabase.from('fulfillment_records').insert(fulfillmentRows.slice(i, i + 50)).select()
          counts.fulfillment += fr?.length || 0
        }
      }

      // 7. Create activities (300)
      setProgress('Creating 300 activities...')
      const activityRows = Array.from({ length: 300 }, () => {
        const deal = rand(allDeals)
        const type = rand(ACTIVITY_TYPES)
        return {
          property_id: pid,
          deal_id: deal?.id,
          activity_type: type,
          subject: `${type} with ${deal?.brand_name || 'prospect'}`,
          description: `Simulated ${type.toLowerCase()} for QA testing.`,
          occurred_at: new Date(Date.now() - randInt(0, 90 * 86400000)).toISOString(),
          created_by: profile?.id,
        }
      })
      for (let i = 0; i < activityRows.length; i += 50) {
        const { data } = await supabase.from('activities').insert(activityRows.slice(i, i + 50)).select()
        counts.activities += data?.length || 0
      }

      // 8. Create tasks (60)
      setProgress('Creating 60 tasks...')
      const taskRows = Array.from({ length: 60 }, () => {
        const deal = rand(allDeals)
        return {
          property_id: pid,
          deal_id: deal?.id,
          title: `${rand(['Follow up with', 'Send proposal to', 'Schedule meeting with', 'Review contract for', 'Prepare deck for', 'Call back'])} ${deal?.brand_name}`,
          priority: rand(['High', 'Medium', 'Low']),
          status: rand(['Pending', 'In Progress', 'Done']),
          due_date: randDate(-14, 30),
          created_by: profile?.id,
        }
      })
      const { data: taskData } = await supabase.from('tasks').insert(taskRows).select()
      counts.tasks = taskData?.length || 0

      // 9. Create events (15)
      setProgress('Creating 15 events...')
      const eventRows = Array.from({ length: 15 }, (_, i) => ({
        property_id: pid,
        name: `QA ${rand(EVENT_TYPES)} Event ${i + 1}`,
        event_date: new Date(Date.now() + randInt(-30, 90) * 86400000).toISOString(),
        venue: rand(['Main Stadium', 'Arena Center', 'Convention Hall', 'Field House', 'Ballroom', 'Conference Center']),
        event_type: rand(EVENT_TYPES),
        status: rand(['Planning', 'Confirmed', 'In Progress', 'Completed']),
      }))
      const { data: eventData } = await supabase.from('events').insert(eventRows).select()
      counts.events = eventData?.length || 0

      setStats(counts)
      setActive(true)
      toast({ title: `Simulator ON — ${Object.values(counts).reduce((a, b) => a + b, 0)} records created`, type: 'success' })
    } catch (err) {
      toast({ title: 'Simulation failed', description: err.message, type: 'error' })
    }
    setProgress('')
    setLoading(false)
  }

  async function stopSimulation() {
    if (!confirm('This will delete the QA Simulator property and ALL its data (deals, contracts, assets, etc.). Continue?')) return
    setLoading(true)
    setProgress('Removing simulated data...')

    try {
      const { data: prop } = await supabase.from('properties').select('id').eq('name', SIM_PROPERTY_NAME).maybeSingle()
      if (prop) {
        // Delete in order to respect FK constraints
        await supabase.from('activities').delete().eq('property_id', prop.id)
        await supabase.from('tasks').delete().eq('property_id', prop.id)
        await supabase.from('fulfillment_records').delete().in('deal_id',
          (await supabase.from('deals').select('id').eq('property_id', prop.id)).data?.map(d => d.id) || []
        )
        await supabase.from('contracts').delete().eq('property_id', prop.id)
        await supabase.from('contacts').delete().eq('property_id', prop.id)
        await supabase.from('deals').delete().eq('property_id', prop.id)
        await supabase.from('assets').delete().eq('property_id', prop.id)
        await supabase.from('events').delete().eq('property_id', prop.id)
        await supabase.from('properties').delete().eq('id', prop.id)
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

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-text-primary">Usage Simulator</h4>
          <p className="text-[10px] text-text-muted mt-0.5">Generate realistic fake data to stress-test the platform under high usage.</p>
        </div>
        <button
          onClick={active ? stopSimulation : startSimulation}
          disabled={loading}
          className={`relative px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
            active
              ? 'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30'
              : 'bg-accent text-bg-primary hover:opacity-90'
          }`}
        >
          {loading ? progress || 'Working...' : active ? 'Turn OFF' : 'Turn ON'}
        </button>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-success animate-pulse' : 'bg-bg-card border border-border'}`} />
        <span className={`text-xs font-mono ${active ? 'text-success' : 'text-text-muted'}`}>{active ? 'ACTIVE' : 'INACTIVE'}</span>
      </div>

      {/* What it creates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {[
          { label: 'Deals', count: stats?.deals ?? (active ? '120' : '—') },
          { label: 'Contacts', count: stats?.contacts ?? (active ? '200' : '—') },
          { label: 'Contracts', count: stats?.contracts ?? (active ? '40' : '—') },
          { label: 'Assets', count: stats?.assets ?? (active ? '30' : '—') },
          { label: 'Fulfillment', count: stats?.fulfillment ?? (active ? '~200' : '—') },
          { label: 'Activities', count: stats?.activities ?? (active ? '300' : '—') },
          { label: 'Tasks', count: stats?.tasks ?? (active ? '60' : '—') },
          { label: 'Events', count: stats?.events ?? (active ? '15' : '—') },
        ].map(s => (
          <div key={s.label} className="bg-bg-card rounded p-2">
            <div className={`text-sm font-bold ${active ? 'text-accent' : 'text-text-muted'}`}>{s.count}</div>
            <div className="text-[9px] text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {active && (
        <p className="text-[10px] text-warning">
          Simulated data lives under the "{SIM_PROPERTY_NAME}" property. It won't affect your real data. Turn OFF to delete all simulated records.
        </p>
      )}
    </div>
  )
}
