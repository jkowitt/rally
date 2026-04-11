import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: 'text-[#E1306C]', bg: 'bg-[#E1306C]/10' },
  { id: 'facebook', label: 'Facebook', color: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10' },
  { id: 'twitter', label: 'X (Twitter)', color: 'text-text-primary', bg: 'bg-bg-card' },
  { id: 'linkedin', label: 'LinkedIn', color: 'text-[#0A66C2]', bg: 'bg-[#0A66C2]/10' },
  { id: 'tiktok', label: 'TikTok', color: 'text-text-primary', bg: 'bg-bg-card' },
  { id: 'youtube', label: 'YouTube', color: 'text-[#FF0000]', bg: 'bg-[#FF0000]/10' },
  { id: 'google_ads', label: 'Google Ads', color: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10' },
  { id: 'meta_ads', label: 'Meta Ads', color: 'text-[#0668E1]', bg: 'bg-[#0668E1]/10' },
]

const POST_TYPES = ['organic', 'ad', 'story', 'reel', 'carousel']
const AD_OBJECTIVES = ['awareness', 'traffic', 'engagement', 'conversions', 'leads']
const STATUS_COLORS = {
  draft: 'bg-bg-card text-text-muted',
  scheduled: 'bg-accent/15 text-accent',
  publishing: 'bg-warning/15 text-warning',
  published: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
  paused: 'bg-bg-card text-text-muted',
}

export default function MarketingHub() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('posts') // 'posts', 'create', 'integrations', 'ads', 'templates'
  const fileInputRef = useRef(null)

  // ── Queries ──
  const { data: integrations } = useQuery({
    queryKey: ['marketing-integrations'],
    queryFn: async () => {
      const { data } = await supabase.from('service_integrations').select('*').order('service')
      return data || []
    },
  })

  const { data: posts } = useQuery({
    queryKey: ['marketing-posts'],
    queryFn: async () => {
      const { data } = await supabase.from('marketing_posts').select('*').order('created_at', { ascending: false }).limit(100)
      return data || []
    },
  })

  const { data: templates } = useQuery({
    queryKey: ['marketing-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('marketing_templates').select('*').order('created_at', { ascending: false })
      return data || []
    },
  })

  const connectedPlatforms = (integrations || []).filter(i => i.connected)
  const autoEnabled = connectedPlatforms.some(i => i.auto_post)

  // Stats
  const published = (posts || []).filter(p => p.status === 'published').length
  const scheduled = (posts || []).filter(p => p.status === 'scheduled').length
  const drafts = (posts || []).filter(p => p.status === 'draft').length
  const ads = (posts || []).filter(p => p.is_ad).length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Published" value={published} color="text-success" />
        <StatCard label="Scheduled" value={scheduled} color="text-accent" />
        <StatCard label="Drafts" value={drafts} />
        <StatCard label="Ads" value={ads} color="text-[#4285F4]" />
      </div>

      {/* Automation toggle */}
      <div className="bg-bg-card border border-border rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="text-xs font-medium text-text-primary">Automated Posting</span>
          <p className="text-[10px] text-text-muted">When ON, scheduled posts auto-publish to connected platforms. When OFF, posts queue for manual approval.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${autoEnabled ? 'bg-success animate-pulse' : 'bg-bg-surface border border-border'}`} />
          <span className={`text-[10px] font-mono ${autoEnabled ? 'text-success' : 'text-text-muted'}`}>{autoEnabled ? 'AUTO' : 'MANUAL'}</span>
          <span className="text-[9px] text-text-muted">({connectedPlatforms.length} connected)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="sm:hidden">
        <select value={tab} onChange={e => setTab(e.target.value)} className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
          <option value="posts">Posts ({(posts || []).length})</option>
          <option value="create">Create Post</option>
          <option value="ads">Ads Manager</option>
          <option value="integrations">Integrations ({connectedPlatforms.length}/{PLATFORMS.length})</option>
          <option value="templates">Templates</option>
        </select>
      </div>
      <div className="hidden sm:flex gap-1 bg-bg-card rounded-lg p-1">
        {[
          { id: 'posts', label: `Posts (${(posts || []).length})` },
          { id: 'create', label: 'Create Post' },
          { id: 'ads', label: 'Ads Manager' },
          { id: 'integrations', label: `Integrations (${connectedPlatforms.length}/${PLATFORMS.length})` },
          { id: 'templates', label: 'Templates' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}>{t.label}</button>
        ))}
      </div>

      {/* POSTS */}
      {tab === 'posts' && <PostsList posts={posts} integrations={integrations} queryClient={queryClient} toast={toast} profile={profile} />}

      {/* CREATE */}
      {tab === 'create' && <CreatePost integrations={integrations} templates={templates} queryClient={queryClient} toast={toast} profile={profile} setTab={setTab} />}

      {/* ADS */}
      {tab === 'ads' && <AdsManager posts={posts} integrations={integrations} queryClient={queryClient} toast={toast} profile={profile} setTab={setTab} />}

      {/* INTEGRATIONS */}
      {tab === 'integrations' && <IntegrationsManager integrations={integrations} queryClient={queryClient} toast={toast} />}

      {/* TEMPLATES */}
      {tab === 'templates' && <TemplatesManager templates={templates} queryClient={queryClient} toast={toast} />}
    </div>
  )
}

// ─── Posts List ───
function PostsList({ posts, integrations, queryClient, toast, profile }) {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? posts : (posts || []).filter(p => p.status === filter)

  async function deletePost(id) {
    if (!confirm('Delete this post?')) return
    await supabase.from('marketing_posts').delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['marketing-posts'] })
  }

  async function publishPost(post) {
    const connected = (integrations || []).filter(i => i.connected && (post.platforms || []).includes(i.service))
    if (connected.length === 0) { toast({ title: 'No connected platforms for this post', type: 'warning' }); return }

    await supabase.from('marketing_posts').update({
      status: 'published', published_at: new Date().toISOString(),
    }).eq('id', post.id)
    queryClient.invalidateQueries({ queryKey: ['marketing-posts'] })
    toast({ title: `Published to ${connected.map(c => c.display_name || c.service).join(', ')}`, type: 'success' })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {['all', 'draft', 'scheduled', 'published', 'failed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-[10px] px-2 py-1 rounded capitalize shrink-0 ${filter === s ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary'}`}>{s}</button>
        ))}
      </div>

      {(filtered || []).map(post => (
        <div key={post.id} className="bg-bg-surface border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${STATUS_COLORS[post.status]}`}>{post.status}</span>
                {post.is_ad && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#4285F4]/15 text-[#4285F4]">AD</span>}
                <span className="text-[8px] font-mono text-text-muted">{post.post_type}</span>
              </div>
              {post.title && <p className="text-sm text-text-primary font-medium mt-1">{post.title}</p>}
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{post.caption}</p>
            </div>
            {(post.media_urls || []).length > 0 && (
              <div className="w-12 h-12 bg-bg-card rounded border border-border flex items-center justify-center text-[8px] text-text-muted shrink-0">
                {post.media_urls.length} media
              </div>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {(post.platforms || []).map(p => {
                const platform = PLATFORMS.find(pl => pl.id === p)
                return <span key={p} className={`text-[8px] px-1.5 py-0.5 rounded ${platform?.bg || 'bg-bg-card'} ${platform?.color || 'text-text-muted'}`}>{platform?.label || p}</span>
              })}
            </div>
            <div className="flex gap-2">
              {post.scheduled_at && <span className="text-[9px] text-text-muted">{new Date(post.scheduled_at).toLocaleString()}</span>}
              {post.status === 'draft' && <button onClick={() => publishPost(post)} className="text-[9px] text-accent hover:underline">Publish</button>}
              <button onClick={() => deletePost(post.id)} className="text-[9px] text-danger hover:underline">Delete</button>
            </div>
          </div>
        </div>
      ))}

      {(!filtered || filtered.length === 0) && (
        <div className="text-center py-8 text-text-muted text-sm">No posts yet. Create your first post.</div>
      )}
    </div>
  )
}

// ─── Create Post ───
function CreatePost({ integrations, templates, queryClient, toast, profile, setTab }) {
  const [form, setForm] = useState({
    title: '', caption: '', platforms: [], post_type: 'organic',
    is_ad: false, ad_budget: '', ad_duration_days: 7, ad_objective: 'awareness',
    ad_target_audience: { age_range: '18-65', interests: '', locations: '' },
    scheduled_at: '', campaign_name: '', tags: '',
  })
  const [mediaFiles, setMediaFiles] = useState([])
  const fileRef = useRef(null)

  const connectedPlatforms = (integrations || []).filter(i => i.connected)

  function togglePlatform(id) {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(id) ? f.platforms.filter(p => p !== id) : [...f.platforms, id],
    }))
  }

  function applyTemplate(template) {
    setForm(f => ({
      ...f,
      caption: template.caption_template || f.caption,
      platforms: template.platforms || f.platforms,
      post_type: template.post_type || f.post_type,
    }))
    toast({ title: `Applied: ${template.name}`, type: 'success' })
  }

  async function handleSubmit(status = 'draft') {
    if (!form.caption.trim() && !form.title.trim()) { toast({ title: 'Add a caption or title', type: 'warning' }); return }
    if (form.platforms.length === 0) { toast({ title: 'Select at least one platform', type: 'warning' }); return }

    // Upload media files to Supabase storage (if available)
    const mediaUrls = []
    for (const file of mediaFiles) {
      const path = `marketing/${Date.now()}_${file.name}`
      const { data: upload, error } = await supabase.storage.from('media').upload(path, file)
      if (!error && upload) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
        mediaUrls.push(urlData?.publicUrl || path)
      }
    }

    const { error } = await supabase.from('marketing_posts').insert({
      title: form.title || null,
      caption: form.caption,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      platforms: form.platforms,
      post_type: form.post_type,
      status,
      scheduled_at: form.scheduled_at || null,
      is_ad: form.is_ad,
      ad_budget: form.is_ad ? parseFloat(form.ad_budget) || null : null,
      ad_duration_days: form.is_ad ? form.ad_duration_days : null,
      ad_objective: form.is_ad ? form.ad_objective : null,
      ad_target_audience: form.is_ad ? form.ad_target_audience : null,
      campaign_name: form.campaign_name || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      created_by: profile?.id,
    })

    if (error) { toast({ title: 'Error creating post', description: error.message, type: 'error' }); return }
    queryClient.invalidateQueries({ queryKey: ['marketing-posts'] })
    toast({ title: status === 'scheduled' ? 'Post scheduled' : status === 'published' ? 'Post published' : 'Draft saved', type: 'success' })
    setTab('posts')
  }

  return (
    <div className="space-y-4">
      {/* Templates quick apply */}
      {(templates || []).length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {templates.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)} className="text-[10px] bg-bg-card border border-border px-2 py-1 rounded shrink-0 hover:border-accent/50">{t.name}</button>
          ))}
        </div>
      )}

      {/* Form */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-4">
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Post title (optional)" className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />

        <textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Write your caption..." rows={4} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent min-h-[100px] sm:min-h-[150px]" />

        {/* Media upload */}
        <div>
          <button onClick={() => fileRef.current?.click()} className="text-xs bg-bg-card border border-border rounded px-3 py-2 text-text-secondary hover:text-text-primary hover:border-accent/50">
            + Add Media ({mediaFiles.length} files)
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => setMediaFiles(prev => [...prev, ...Array.from(e.target.files)])} />
          {mediaFiles.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {mediaFiles.map((f, i) => (
                <div key={i} className="relative bg-bg-card rounded p-1 text-[9px] text-text-muted">
                  {f.name.slice(0, 20)}
                  <button onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1 text-danger">x</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform selection */}
        <div>
          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Publish To</label>
          <div className="flex gap-1.5 flex-wrap">
            {PLATFORMS.filter(p => !p.id.includes('_ads')).map(p => {
              const isConnected = connectedPlatforms.some(c => c.service === p.id)
              const isSelected = form.platforms.includes(p.id)
              return (
                <button key={p.id} onClick={() => isConnected ? togglePlatform(p.id) : toast({ title: `Connect ${p.label} first in Integrations`, type: 'warning' })}
                  className={`text-[10px] px-2.5 py-1.5 rounded border transition-colors ${isSelected ? `${p.bg} ${p.color} border-current` : isConnected ? 'bg-bg-card text-text-secondary border-border hover:border-accent/50' : 'bg-bg-card/50 text-text-muted/50 border-border/50 cursor-not-allowed'}`}>
                  {p.label} {!isConnected && '(not connected)'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Post type + schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-text-muted uppercase block mb-1">Post Type</label>
            <select value={form.post_type} onChange={e => setForm(f => ({ ...f, post_type: e.target.value }))} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary">
              {POST_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-muted uppercase block mb-1">Schedule For</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted uppercase block mb-1">Campaign</label>
            <input value={form.campaign_name} onChange={e => setForm(f => ({ ...f, campaign_name: e.target.value }))} placeholder="Campaign name" className="w-full bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary" />
          </div>
        </div>

        {/* Ad toggle */}
        <div className="flex items-center gap-2">
          <button onClick={() => setForm(f => ({ ...f, is_ad: !f.is_ad }))} className={`text-xs px-3 py-1.5 rounded border ${form.is_ad ? 'bg-[#4285F4]/15 text-[#4285F4] border-[#4285F4]/30' : 'bg-bg-card text-text-muted border-border'}`}>
            {form.is_ad ? 'Ad Enabled' : 'Make this an Ad'}
          </button>
        </div>

        {/* Ad config */}
        {form.is_ad && (
          <div className="bg-bg-card border border-[#4285F4]/20 rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-text-muted uppercase block mb-1">Budget ($)</label>
                <input type="number" value={form.ad_budget} onChange={e => setForm(f => ({ ...f, ad_budget: e.target.value }))} placeholder="500" className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary" />
              </div>
              <div>
                <label className="text-[10px] text-text-muted uppercase block mb-1">Duration (days)</label>
                <input type="number" value={form.ad_duration_days} onChange={e => setForm(f => ({ ...f, ad_duration_days: parseInt(e.target.value) || 7 }))} className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary" />
              </div>
              <div>
                <label className="text-[10px] text-text-muted uppercase block mb-1">Objective</label>
                <select value={form.ad_objective} onChange={e => setForm(f => ({ ...f, ad_objective: e.target.value }))} className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary capitalize">
                  {AD_OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={form.ad_target_audience.age_range} onChange={e => setForm(f => ({ ...f, ad_target_audience: { ...f.ad_target_audience, age_range: e.target.value } }))} placeholder="Age range (e.g. 18-45)" className="bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary" />
              <input value={form.ad_target_audience.interests} onChange={e => setForm(f => ({ ...f, ad_target_audience: { ...f.ad_target_audience, interests: e.target.value } }))} placeholder="Interests (comma-separated)" className="bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary" />
              <input value={form.ad_target_audience.locations} onChange={e => setForm(f => ({ ...f, ad_target_audience: { ...f.ad_target_audience, locations: e.target.value } }))} placeholder="Locations (comma-separated)" className="bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary" />
            </div>
          </div>
        )}

        {/* Tags */}
        <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (comma-separated)" className="w-full bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary" />

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleSubmit('draft')} className="bg-bg-card border border-border text-text-secondary px-4 py-2 rounded text-sm font-medium hover:text-text-primary">Save Draft</button>
          {form.scheduled_at && <button onClick={() => handleSubmit('scheduled')} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium">Schedule</button>}
          <button onClick={() => handleSubmit('published')} className="bg-success text-bg-primary px-4 py-2 rounded text-sm font-medium">Publish Now</button>
        </div>
      </div>
    </div>
  )
}

// ─── Ads Manager ───
function AdsManager({ posts, integrations, queryClient, toast, profile, setTab }) {
  const adPosts = (posts || []).filter(p => p.is_ad)
  const totalSpend = adPosts.reduce((s, p) => s + (p.ad_budget || 0), 0)
  const activeAds = adPosts.filter(p => p.status === 'published').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Total Ads" value={adPosts.length} />
        <StatCard label="Active" value={activeAds} color="text-success" />
        <StatCard label="Total Budget" value={`$${totalSpend.toLocaleString()}`} color="text-accent" />
        <StatCard label="Avg Budget" value={adPosts.length ? `$${Math.round(totalSpend / adPosts.length).toLocaleString()}` : '—'} />
      </div>

      <button onClick={() => setTab('create')} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium">Create New Ad</button>

      {adPosts.map(ad => (
        <div key={ad.id} className="bg-bg-surface border border-border rounded-lg p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${STATUS_COLORS[ad.status]}`}>{ad.status}</span>
                <span className="text-sm text-text-primary font-medium">{ad.title || ad.campaign_name || 'Untitled Ad'}</span>
              </div>
              <p className="text-[10px] text-text-muted mt-0.5">{ad.ad_objective} — ${ad.ad_budget?.toLocaleString()} over {ad.ad_duration_days} days</p>
            </div>
            <div className="flex gap-1">
              {(ad.platforms || []).map(p => {
                const pl = PLATFORMS.find(x => x.id === p)
                return <span key={p} className={`text-[8px] px-1 py-0.5 rounded ${pl?.bg} ${pl?.color}`}>{pl?.label || p}</span>
              })}
            </div>
          </div>
        </div>
      ))}

      {adPosts.length === 0 && <div className="text-center py-8 text-text-muted text-sm">No ads yet. Create your first ad campaign.</div>}
    </div>
  )
}

// ─── Integrations Manager ───
function IntegrationsManager({ integrations, queryClient, toast }) {
  const [editingService, setEditingService] = useState(null)
  const [form, setForm] = useState({ api_key: '', api_secret: '', access_token: '', account_id: '', account_name: '' })

  function startEdit(platform) {
    const existing = (integrations || []).find(i => i.service === platform.id)
    setEditingService(platform.id)
    setForm({
      api_key: existing?.api_key || '',
      api_secret: existing?.api_secret || '',
      access_token: existing?.access_token || '',
      account_id: existing?.account_id || '',
      account_name: existing?.account_name || '',
    })
  }

  async function saveIntegration(platformId) {
    const existing = (integrations || []).find(i => i.service === platformId)
    const platform = PLATFORMS.find(p => p.id === platformId)
    const isConnected = !!(form.api_key || form.access_token)

    if (existing) {
      await supabase.from('service_integrations').update({
        ...form, connected: isConnected, display_name: platform?.label,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('service_integrations').insert({
        service: platformId, display_name: platform?.label,
        ...form, connected: isConnected,
      })
    }

    queryClient.invalidateQueries({ queryKey: ['marketing-integrations'] })
    setEditingService(null)
    toast({ title: isConnected ? `${platform?.label} connected` : `${platform?.label} disconnected`, type: 'success' })
  }

  async function toggleAutoPost(integrationId, current) {
    await supabase.from('service_integrations').update({ auto_post: !current }).eq('id', integrationId)
    queryClient.invalidateQueries({ queryKey: ['marketing-integrations'] })
  }

  async function disconnect(integrationId) {
    await supabase.from('service_integrations').update({
      connected: false, api_key: null, api_secret: null, access_token: null, refresh_token: null,
    }).eq('id', integrationId)
    queryClient.invalidateQueries({ queryKey: ['marketing-integrations'] })
    toast({ title: 'Disconnected', type: 'success' })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">Connect your social media accounts and ad platforms. Add API keys or access tokens to enable posting.</p>

      {PLATFORMS.map(platform => {
        const integration = (integrations || []).find(i => i.service === platform.id)
        const isEditing = editingService === platform.id

        return (
          <div key={platform.id} className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${integration?.connected ? 'bg-success' : 'bg-bg-card border border-border'}`} />
                <span className={`text-sm font-medium ${platform.color}`}>{platform.label}</span>
                {integration?.account_name && <span className="text-[9px] text-text-muted">@{integration.account_name}</span>}
              </div>
              <div className="flex items-center gap-2">
                {integration?.connected && (
                  <button onClick={() => toggleAutoPost(integration.id, integration.auto_post)} className={`text-[9px] px-2 py-0.5 rounded ${integration.auto_post ? 'bg-success/15 text-success' : 'bg-bg-card text-text-muted'}`}>
                    {integration.auto_post ? 'Auto' : 'Manual'}
                  </button>
                )}
                {integration?.connected && <button onClick={() => disconnect(integration.id)} className="text-[9px] text-danger hover:underline">Disconnect</button>}
                <button onClick={() => isEditing ? setEditingService(null) : startEdit(platform)} className="text-[10px] text-accent hover:underline">
                  {isEditing ? 'Cancel' : integration?.connected ? 'Edit' : 'Connect'}
                </button>
              </div>
            </div>

            {isEditing && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} placeholder="API Key" className="bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary font-mono" />
                  <input value={form.api_secret} onChange={e => setForm(f => ({ ...f, api_secret: e.target.value }))} placeholder="API Secret" className="bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary font-mono" />
                  <input value={form.access_token} onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))} placeholder="Access Token" className="bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary font-mono" />
                  <input value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} placeholder="Account / Page ID" className="bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary font-mono" />
                </div>
                <input value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} placeholder="Display name (@handle)" className="w-full bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary" />
                <button onClick={() => saveIntegration(platform.id)} className="bg-accent text-bg-primary px-4 py-1.5 rounded text-xs font-medium">Save</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Templates Manager ───
function TemplatesManager({ templates, queryClient, toast }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', caption_template: '', platforms: [], post_type: 'organic' })

  async function saveTemplate() {
    if (!form.name.trim()) return
    await supabase.from('marketing_templates').insert(form)
    queryClient.invalidateQueries({ queryKey: ['marketing-templates'] })
    setForm({ name: '', caption_template: '', platforms: [], post_type: 'organic' })
    setShowAdd(false)
    toast({ title: 'Template saved', type: 'success' })
  }

  async function deleteTemplate(id) {
    await supabase.from('marketing_templates').delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['marketing-templates'] })
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setShowAdd(!showAdd)} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium">{showAdd ? 'Cancel' : 'New Template'}</button>

      {showAdd && (
        <div className="bg-bg-card border border-accent/30 rounded-lg p-4 space-y-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Template name" className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
          <textarea value={form.caption_template} onChange={e => setForm(f => ({ ...f, caption_template: e.target.value }))} placeholder="Caption template (use {brand}, {date}, {event} as variables)" rows={3} className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary" />
          <button onClick={saveTemplate} disabled={!form.name.trim()} className="bg-accent text-bg-primary px-4 py-2 rounded text-xs font-medium disabled:opacity-50">Save</button>
        </div>
      )}

      {(templates || []).map(t => (
        <div key={t.id} className="bg-bg-surface border border-border rounded-lg p-3 flex items-center justify-between">
          <div>
            <span className="text-sm text-text-primary font-medium">{t.name}</span>
            {t.caption_template && <p className="text-[10px] text-text-muted mt-0.5 truncate max-w-[300px]">{t.caption_template}</p>}
          </div>
          <button onClick={() => deleteTemplate(t.id)} className="text-[9px] text-danger hover:underline">Delete</button>
        </div>
      ))}

      {(!templates || templates.length === 0) && !showAdd && (
        <div className="text-center py-6 text-text-muted text-sm">No templates yet.</div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-bg-card rounded-lg p-3 text-center">
      <div className={`text-lg font-bold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-[9px] text-text-muted">{label}</div>
    </div>
  )
}
