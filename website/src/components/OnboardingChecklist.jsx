import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const STEPS = [
  { id: 'assets', label: 'Add your first asset', desc: 'Set up your sponsorship inventory', href: '/app/crm/assets', check: (data) => (data.assets || 0) > 0 },
  { id: 'deal', label: 'Create your first deal', desc: 'Add a prospect to your pipeline', href: '/app/crm/pipeline', check: (data) => (data.deals || 0) > 0 },
  { id: 'contact', label: 'Research contacts', desc: 'Use AI to find decision-makers', href: '/app/crm/pipeline', check: (data) => (data.contacts || 0) > 0 },
  { id: 'contract', label: 'Upload a contract', desc: 'Import an existing agreement', href: '/app/crm/contracts', check: (data) => (data.contracts || 0) > 0 },
  { id: 'team', label: 'Invite a teammate', desc: 'Grow your team', href: '/app/crm/team', check: (data) => (data.teamMembers || 0) > 1 },
]

export default function OnboardingChecklist() {
  const { profile } = useAuth()
  const propertyId = profile?.property_id
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('ll_onboarding_dismissed') === 'true' } catch { return false }
  })

  const { data: progress } = useQuery({
    queryKey: ['onboarding-progress', propertyId],
    queryFn: async () => {
      if (!propertyId) return {}
      const [assets, deals, contacts, contracts, teamMembers] = await Promise.all([
        supabase.from('assets').select('id', { count: 'exact', head: true }).eq('property_id', propertyId),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('property_id', propertyId),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('property_id', propertyId),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('property_id', propertyId),
        supabase.from('team_members').select('id', { count: 'exact', head: true }),
      ])
      return {
        assets: assets.count || 0,
        deals: deals.count || 0,
        contacts: contacts.count || 0,
        contracts: contracts.count || 0,
        teamMembers: teamMembers.count || 0,
      }
    },
    enabled: !!propertyId,
    refetchInterval: 60000,
  })

  if (dismissed || !progress) return null

  const completed = STEPS.filter(s => s.check(progress))
  const allDone = completed.length === STEPS.length
  if (allDone) return null

  const pct = Math.round((completed.length / STEPS.length) * 100)

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('ll_onboarding_dismissed', 'true')
  }

  return (
    <div className="bg-bg-surface border border-accent/20 rounded-lg p-4 sm:p-5 mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Getting Started</h3>
          <p className="text-[10px] text-text-muted font-mono mt-0.5">{completed.length}/{STEPS.length} completed &middot; {pct}%</p>
        </div>
        <button onClick={dismiss} className="text-text-muted hover:text-text-primary text-xs">&times;</button>
      </div>
      <div className="w-full bg-bg-card rounded-full h-1.5 mb-3">
        <div className="bg-accent rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1.5">
        {STEPS.map(step => {
          const done = step.check(progress)
          return (
            <a
              key={step.id}
              href={step.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${done ? 'bg-success/5' : 'hover:bg-bg-card'}`}
            >
              <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                done ? 'bg-success border-success text-white' : 'border-border text-text-muted'
              }`}>
                {done ? '✓' : ''}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`text-xs ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{step.label}</span>
                {!done && <span className="text-[10px] text-text-muted ml-1.5">{step.desc}</span>}
              </div>
              {!done && <span className="text-[10px] text-accent shrink-0">&rarr;</span>}
            </a>
          )
        })}
      </div>
    </div>
  )
}
