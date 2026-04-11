import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const FEATURE_OPTIONS = [
  'Revenue Dashboard', 'Sponsor ROI Reports', 'Custom KPI Tracking', 'Pipeline Analytics',
  'Fulfillment Scorecards', 'Event Performance Metrics', 'Asset Utilization Report',
  'Team Leaderboard', 'Renewal Forecasting', 'Custom Data Visualizations',
  'Branded PDF Reports', 'Client-Facing Portal', 'API Integration',
  'Custom Notifications', 'Automated Reporting', 'Other',
]

const BUDGET_RANGES = [
  'Under $2,500', '$2,500 - $5,000', '$5,000 - $10,000',
  '$10,000 - $25,000', '$25,000+', 'Let\'s discuss',
]

const TIMELINES = ['ASAP', 'Within 30 days', 'Next quarter', 'No rush — exploring options']

export default function CustomDashboardRequest() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'developer'

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    contact_name: profile?.full_name || '',
    contact_email: profile?.email || '',
    contact_phone: '',
    property_name: profile?.properties?.name || '',
    description: '',
    desired_features: [],
    integrations_needed: '',
    timeline: '',
    budget_range: '',
    branding: { primary_color: '#E8B84B', accent_color: '', logo_url: '' },
  })

  // Existing requests
  const { data: requests } = useQuery({
    queryKey: ['custom-dashboard-requests', propertyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_dashboard_requests')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!propertyId,
  })

  // Active custom dashboards for this property
  const { data: customDashboards } = useQuery({
    queryKey: ['custom-dashboards', propertyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_dashboards')
        .select('*')
        .eq('property_id', propertyId)
        .eq('active', true)
      return data || []
    },
    enabled: !!propertyId,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('custom_dashboard_requests').insert({
        property_id: propertyId,
        requested_by: profile?.id,
        ...form,
        desired_features: form.desired_features.map(f => ({ feature: f, priority: 'high' })),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboard-requests'] })
      toast({ title: 'Request submitted! We\'ll be in touch within 24 hours.', type: 'success' })
      setShowForm(false)
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  function toggleFeature(feature) {
    setForm(prev => ({
      ...prev,
      desired_features: prev.desired_features.includes(feature)
        ? prev.desired_features.filter(f => f !== feature)
        : [...prev.desired_features, feature],
    }))
  }

  const statusConfig = {
    submitted: { label: 'Submitted', color: 'bg-accent/10 text-accent border-accent/30' },
    contacted: { label: 'Contacted', color: 'bg-accent/10 text-accent border-accent/30' },
    scoping: { label: 'Scoping', color: 'bg-warning/10 text-warning border-warning/30' },
    building: { label: 'Building', color: 'bg-success/10 text-success border-success/30' },
    delivered: { label: 'Delivered', color: 'bg-success/10 text-success border-success/30' },
    declined: { label: 'Declined', color: 'bg-danger/10 text-danger border-danger/30' },
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Custom Dashboard</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Request a white-label dashboard tailored to your organization
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">
            Request Custom Dashboard
          </button>
        )}
      </div>

      {/* Active Custom Dashboards */}
      {customDashboards?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-mono text-text-muted uppercase tracking-wider">Your Custom Dashboards</h2>
          {customDashboards.map(d => (
            <a key={d.id} href={`/app/custom/${d.slug}`} className="block bg-bg-surface border border-accent/20 rounded-lg p-4 hover:border-accent/40 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-text-primary">{d.name}</span>
                  <span className="text-[10px] font-mono text-accent ml-2">Custom</span>
                </div>
                <span className="text-xs text-accent">&rarr;</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Existing Requests */}
      {requests?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-mono text-text-muted uppercase tracking-wider">Your Requests</h2>
          {requests.map(r => {
            const sc = statusConfig[r.status] || statusConfig.submitted
            return (
              <div key={r.id} className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${sc.color}`}>{sc.label}</span>
                      <span className="text-xs text-text-muted font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2">{r.description}</p>
                    {r.desired_features?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {r.desired_features.map((f, i) => (
                          <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{f.feature}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* How It Works */}
      <div className="bg-bg-surface border border-border rounded-lg p-5 sm:p-6">
        <h2 className="text-sm font-medium text-text-primary mb-4">How Custom Dashboards Work</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Submit Request', desc: 'Tell us what you need — features, branding, integrations, timeline.' },
            { step: '02', title: 'We Scope & Build', desc: 'Our team creates a white-label dashboard with your logo, colors, and data views.' },
            { step: '03', title: 'Your Team Uses It', desc: 'Only your property\'s users see the custom dashboard. Private and branded.' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-mono text-sm font-bold mx-auto">{s.step}</div>
              <h3 className="text-sm font-medium text-text-primary mt-3">{s.title}</h3>
              <p className="text-xs text-text-secondary mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What's Included */}
      <div className="bg-bg-surface border border-border rounded-lg p-5 sm:p-6">
        <h2 className="text-sm font-medium text-text-primary mb-3">What You Can Customize</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            'Your logo on every page', 'Custom color scheme', 'Branded PDF reports',
            'Custom KPI widgets', 'Sponsor-facing portal', 'Automated reporting',
            'Custom data views', 'API integrations', 'Team-specific metrics',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="text-accent text-[10px]">✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {(!requests || requests.length === 0) && (!customDashboards || customDashboards.length === 0) && !isAdmin && (
        <div className="bg-bg-surface border border-border rounded-lg p-8 text-center">
          <div className="text-3xl mb-3">🎨</div>
          <p className="text-sm text-text-secondary mb-1">Custom dashboards are available for your organization</p>
          <p className="text-xs text-text-muted">Ask your admin to submit a request, or contact us directly</p>
          <a href="mailto:jason@loud-legacy.com?subject=Custom Dashboard Inquiry" className="text-accent text-xs hover:underline mt-2 block">
            Contact us &rarr;
          </a>
        </div>
      )}

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between sticky top-0 bg-bg-surface z-10">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-text-primary">Request Custom Dashboard</h2>
                <p className="text-[10px] sm:text-xs text-text-muted">We'll contact you within 24 hours</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Your Name *</label>
                  <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Email *</label>
                  <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Phone</label>
                  <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="Optional" className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Organization</label>
                  <input value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-text-muted">What do you need? *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe the dashboard you envision — what data, what views, who will use it, and what decisions it should help with..." className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1 resize-none" />
              </div>

              {/* Feature Selection */}
              <div>
                <label className="text-xs text-text-muted mb-2 block">Select desired features</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FEATURE_OPTIONS.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFeature(f)}
                      className={`text-left px-2.5 py-1.5 rounded text-xs border transition-colors ${
                        form.desired_features.includes(f) ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-card border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Branding */}
              <div>
                <label className="text-xs text-text-muted mb-2 block">Branding (optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-text-muted">Logo URL</label>
                    <input value={form.branding.logo_url} onChange={(e) => setForm({ ...form, branding: { ...form.branding, logo_url: e.target.value } })} placeholder="https://..." className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-0.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted">Primary Color</label>
                    <input type="color" value={form.branding.primary_color} onChange={(e) => setForm({ ...form, branding: { ...form.branding, primary_color: e.target.value } })} className="w-full h-8 bg-bg-card border border-border rounded mt-0.5 cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted">Accent Color</label>
                    <input type="color" value={form.branding.accent_color || '#E8B84B'} onChange={(e) => setForm({ ...form, branding: { ...form.branding, accent_color: e.target.value } })} className="w-full h-8 bg-bg-card border border-border rounded mt-0.5 cursor-pointer" />
                  </div>
                </div>
              </div>

              {/* Integrations */}
              <div>
                <label className="text-xs text-text-muted">External integrations needed</label>
                <input value={form.integrations_needed} onChange={(e) => setForm({ ...form, integrations_needed: e.target.value })} placeholder="e.g. Salesforce, custom API, ticketing system..." className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1" />
              </div>

              {/* Timeline + Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Timeline</label>
                  <select value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1">
                    <option value="">Select...</option>
                    {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Budget Range</label>
                  <select value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1">
                    <option value="">Select...</option>
                    {BUDGET_RANGES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !form.description.trim() || !form.contact_name || !form.contact_email}
                className="w-full bg-accent text-bg-primary py-2.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
