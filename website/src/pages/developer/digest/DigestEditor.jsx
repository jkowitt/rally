import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import * as digest from '@/services/digestIssueService'

/**
 * /app/developer/digest/:id — the WYSIWYG-ish editor for a
 * single Digest issue. Built around a markdown textarea + live
 * preview panel. Toolbar inserts markdown syntax at cursor.
 *
 * Includes:
 *   - AI research panel (calls digest-research edge function)
 *   - Image upload (drag/drop + click-to-browse)
 *   - Image library picker for reuse across issues
 *   - Preview in Digest brand styling
 *   - Save draft / schedule / publish / send test email
 *   - Auto-save after 2s idle typing
 */
export default function DigestEditor() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showResearch, setShowResearch] = useState(false)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [researching, setResearching] = useState(false)
  const [researchTopic, setResearchTopic] = useState('')
  const [researchKeywords, setResearchKeywords] = useState('')
  const textareaRef = useRef(null)
  const autoSaveTimer = useRef(null)

  if (profile && profile.role !== 'developer') return <Navigate to="/app" replace />

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { issue } = await digest.getIssue(id)
    setIssue(issue)
    setLoading(false)
  }

  function updateField(field, value) {
    setIssue(prev => ({ ...prev, [field]: value }))
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveDraft({ [field]: value }), 2000)
  }

  async function saveDraft(patch) {
    if (!issue) return
    setSaving(true)
    await digest.updateIssue(issue.id, patch || {
      title: issue.title,
      subtitle: issue.subtitle,
      author: issue.author,
      industry: issue.industry,
      body_markdown: issue.body_markdown,
      featured_image_url: issue.featured_image_url,
      featured_image_alt: issue.featured_image_alt,
      tags: issue.tags,
      meta_description: issue.meta_description,
    }, profile.id)
    setSaving(false)
  }

  async function handleResearch() {
    if (!researchTopic.trim()) return
    setResearching(true)
    const r = await digest.researchArticle({
      topic: researchTopic,
      industry: issue.industry || 'general',
      keywords: researchKeywords,
    })
    setResearching(false)

    if (!r.success) {
      toast({ title: 'Research failed', description: r.error, type: 'error' })
      return
    }

    // Build the markdown body with citations appended
    let body = r.markdown || ''
    if (r.citations && r.citations.length > 0) {
      body += '\n\n## Sources\n\n'
      body += r.citations.map(c => `${c.num}. [${c.title}](${c.url})`).join('\n')
    }

    const patch = {
      title: r.headline || researchTopic,
      subtitle: r.subheadline || '',
      body_markdown: body,
      ai_researched: true,
      ai_research_prompt: `${researchTopic}${researchKeywords ? ' · ' + researchKeywords : ''}`,
      ai_research_citations: r.citations || [],
    }
    setIssue(prev => ({ ...prev, ...patch }))
    await digest.updateIssue(issue.id, patch, profile.id)
    setShowResearch(false)
    toast({
      title: 'Research complete',
      description: `Loaded ${r.markdown?.length || 0} chars + ${r.citations?.length || 0} citations`,
      type: 'success',
    })
  }

  async function handleImageUpload(file) {
    if (!file) return
    const r = await digest.uploadImage(file, profile.id, issue.id)
    if (!r.success) {
      toast({ title: 'Upload failed', description: r.error, type: 'error' })
      return
    }
    toast({ title: 'Image uploaded', type: 'success' })
    return r.url
  }

  async function insertImageAtCursor(file) {
    const url = await handleImageUpload(file)
    if (!url) return
    insertMarkdown(`\n\n![${file.name || 'Image'}](${url})\n\n`)
  }

  async function setFeaturedImage(file) {
    const url = await handleImageUpload(file)
    if (!url) return
    updateField('featured_image_url', url)
  }

  function insertMarkdown(text) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const current = issue.body_markdown || ''
    const next = current.slice(0, start) + text + current.slice(end)
    updateField('body_markdown', next)
    // Restore cursor position after insert
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  function wrapSelection(before, after = before) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const current = issue.body_markdown || ''
    const selected = current.slice(start, end) || 'text'
    const next = current.slice(0, start) + before + selected + after + current.slice(end)
    updateField('body_markdown', next)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }

  async function handlePublish(mode) {
    setSaving(true)
    // Force save latest state first
    await digest.updateIssue(issue.id, {
      title: issue.title,
      subtitle: issue.subtitle,
      author: issue.author,
      industry: issue.industry,
      body_markdown: issue.body_markdown,
      featured_image_url: issue.featured_image_url,
      featured_image_alt: issue.featured_image_alt,
      tags: issue.tags,
    }, profile.id)

    if (mode === 'schedule') {
      const dateStr = prompt('Publish date/time (YYYY-MM-DD HH:MM):')
      if (!dateStr) { setSaving(false); return }
      const when = new Date(dateStr).toISOString()
      const r = await digest.scheduleIssue(issue.id, when, profile.id)
      setSaving(false)
      if (r.success) { toast({ title: 'Scheduled', type: 'success' }); load() }
      else toast({ title: 'Failed', description: r.error, type: 'error' })
      return
    }

    if (mode === 'publish_and_send') {
      if (!confirm(`Publish "${issue.title}" and send email to all digest subscribers?`)) {
        setSaving(false)
        return
      }
      const r = await digest.publishIssue(issue.id, profile.id, { sendEmail: true })
      setSaving(false)
      if (r.success) {
        toast({ title: 'Published and email sending', description: `Campaign ${r.emailResult?.campaignId || ''}`, type: 'success' })
        load()
      } else {
        toast({ title: 'Failed', description: r.error, type: 'error' })
      }
      return
    }

    if (mode === 'publish_no_email') {
      if (!confirm('Publish to the public archive WITHOUT sending email?')) {
        setSaving(false)
        return
      }
      const r = await digest.publishIssue(issue.id, profile.id, { sendEmail: false })
      setSaving(false)
      if (r.success) { toast({ title: 'Published', type: 'success' }); load() }
      else toast({ title: 'Failed', description: r.error, type: 'error' })
      return
    }
  }

  async function sendTest() {
    const addr = prompt('Send test email to:', profile?.email || '')
    if (!addr) return
    await digest.updateIssue(issue.id, {
      title: issue.title,
      subtitle: issue.subtitle,
      body_markdown: issue.body_markdown,
      featured_image_url: issue.featured_image_url,
    }, profile.id)
    const r = await digest.sendTestEmail(issue.id, addr)
    if (r.success) toast({ title: 'Test sent', description: addr, type: 'success' })
    else toast({ title: 'Test failed', description: r.error, type: 'error' })
  }

  function handleCopyShareableLink() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://loud-legacy.com'
    const shareUrl = `${origin}/digest/${issue.slug}`
    // Include UTM so we can track how many opens come from social shares
    const utmUrl = `${shareUrl}?utm_source=social_share&utm_medium=founder&utm_campaign=${encodeURIComponent(issue.slug)}`

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(utmUrl).then(
        () => toast({
          title: 'Link copied',
          description: `${shareUrl} (with UTM tags) — paste into LinkedIn, X, or wherever`,
          type: 'success',
        }),
        () => toast({ title: 'Copy failed', description: utmUrl, type: 'error' }),
      )
    } else {
      // Fallback: prompt the user to copy manually
      window.prompt('Copy this link:', utmUrl)
    }
  }

  async function handleResendUnopened() {
    // Suggest a subject line but let the author override
    const defaultSubject = `Did you see this? ${issue.title}`
    const subject = prompt(
      'Resend to subscribers who never opened the original.\n\nNew subject line:',
      defaultSubject,
    )
    if (!subject) return
    if (!confirm(
      `Resend "${issue.title}" to UNOPENED subscribers with the new subject:\n\n"${subject}"\n\nThis creates a new campaign. The original must be at least 72h old.`,
    )) return

    const r = await digest.resendUnopened(issue.id, { newSubject: subject })
    if (r.success) {
      toast({
        title: `Resend queued · ${r.recipientsCount} recipients`,
        description: r.recipientsCount === 0 ? 'Nobody is unopened — skipping.' : `Campaign ${r.campaignId}`,
        type: 'success',
      })
    } else {
      toast({ title: 'Resend failed', description: r.error || r.details, type: 'error' })
    }
  }

  if (loading) return <div className="p-6 text-xs text-text-muted">Loading…</div>
  if (!issue) return (
    <div className="p-6 text-center">
      <p className="text-sm text-text-muted">Issue not found.</p>
      <Link to="/app/developer/digest" className="text-accent text-xs hover:underline">← Back to list</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-bg-primary">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/app/developer/digest" className="text-[10px] text-text-muted hover:text-accent">← Digest</Link>
            <div className="text-[10px] font-mono text-text-muted">
              {saving ? 'Saving…' : 'Saved'}
              {issue.status !== 'draft' && ` · ${issue.status}`}
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setShowResearch(true)} className="text-xs px-3 py-1.5 border border-accent/30 text-accent rounded hover:bg-accent/10">
              ✨ AI Research
            </button>
            <button onClick={() => setShowImageLibrary(true)} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">
              Image library
            </button>
            <button onClick={() => setShowPreview(!showPreview)} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            <button onClick={sendTest} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">
              Test email
            </button>
            <button onClick={() => handlePublish('schedule')} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">
              Schedule
            </button>
            <button onClick={() => handlePublish('publish_no_email')} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">
              Publish (no email)
            </button>
            <button onClick={() => handlePublish('publish_and_send')} className="text-xs px-3 py-1.5 bg-accent text-bg-primary rounded font-semibold">
              Publish + Send
            </button>
            {issue.status === 'published' && issue.slug && (
              <button
                onClick={handleCopyShareableLink}
                title="Copy the public article URL to paste into social posts"
                className="text-xs px-3 py-1.5 border border-accent/40 text-accent rounded hover:bg-accent/10"
              >
                🔗 Copy link
              </button>
            )}
            {issue.status === 'published' && issue.email_campaign_id && (
              <button
                onClick={handleResendUnopened}
                title="Create a new campaign targeting only subscribers who never opened the original"
                className="text-xs px-3 py-1.5 border border-warning/40 text-warning rounded hover:bg-warning/10"
              >
                Resend to unopened
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main editor */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!showPreview ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
            {/* Content column */}
            <div className="space-y-4">
              <input
                type="text"
                value={issue.title || ''}
                onChange={e => updateField('title', e.target.value)}
                placeholder="Article title"
                className="w-full bg-transparent border-b border-border focus:border-accent outline-none text-2xl font-semibold text-text-primary py-2"
              />
              <input
                type="text"
                value={issue.subtitle || ''}
                onChange={e => updateField('subtitle', e.target.value)}
                placeholder="Subtitle / deck"
                className="w-full bg-transparent border-b border-border focus:border-accent outline-none text-sm italic text-text-secondary py-2"
              />

              <Toolbar onInsert={insertMarkdown} onWrap={wrapSelection} onUploadImage={insertImageAtCursor} />

              <textarea
                ref={textareaRef}
                value={issue.body_markdown || ''}
                onChange={e => updateField('body_markdown', e.target.value)}
                placeholder="Write in markdown. Use the toolbar above, or type directly. ## for headings, ** for bold, - for lists, > for quotes, [text](url) for links."
                rows={28}
                className="w-full bg-bg-card border border-border rounded-lg p-4 text-sm text-text-primary font-mono focus:outline-none focus:border-accent resize-y"
              />

              <div className="text-[10px] text-text-muted">
                {(issue.body_markdown || '').trim().split(/\s+/).filter(Boolean).length} words · ~{digest.readingTime(issue.body_markdown)} min read
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Settings</div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Author</label>
                  <input
                    type="text"
                    value={issue.author || ''}
                    onChange={e => updateField('author', e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Industry</label>
                  <select
                    value={issue.industry || 'general'}
                    onChange={e => updateField('industry', e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs"
                  >
                    {digest.INDUSTRIES.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={(issue.tags || []).join(', ')}
                    onChange={e => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">URL slug</label>
                  <input
                    type="text"
                    value={issue.slug || ''}
                    onChange={e => updateField('slug', digest.slugify(e.target.value))}
                    className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Meta description (SEO)</label>
                  <textarea
                    value={issue.meta_description || ''}
                    onChange={e => updateField('meta_description', e.target.value)}
                    rows={2}
                    className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Featured image</div>
                {issue.featured_image_url ? (
                  <div className="space-y-2">
                    <img src={issue.featured_image_url} alt="" className="w-full rounded" />
                    <input
                      type="text"
                      value={issue.featured_image_alt || ''}
                      onChange={e => updateField('featured_image_alt', e.target.value)}
                      placeholder="Alt text"
                      className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => updateField('featured_image_url', null)}
                      className="text-[10px] text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded p-4 text-center text-[10px] text-text-muted hover:border-accent/50 transition-colors">
                      Drop or click to upload featured image
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && setFeaturedImage(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <DigestPreview issue={issue} />
        )}
      </div>

      {showResearch && (
        <ResearchModal
          topic={researchTopic}
          setTopic={setResearchTopic}
          keywords={researchKeywords}
          setKeywords={setResearchKeywords}
          industry={issue.industry}
          running={researching}
          onRun={handleResearch}
          onClose={() => setShowResearch(false)}
        />
      )}

      {showImageLibrary && (
        <ImageLibraryModal
          onInsert={url => { insertMarkdown(`\n\n![](${url})\n\n`); setShowImageLibrary(false) }}
          onClose={() => setShowImageLibrary(false)}
        />
      )}
    </div>
  )
}

function Toolbar({ onInsert, onWrap, onUploadImage }) {
  const fileInputRef = useRef(null)
  return (
    <div className="flex flex-wrap gap-1 p-2 bg-bg-card border border-border rounded-lg">
      <ToolBtn onClick={() => onWrap('**')} title="Bold">𝐁</ToolBtn>
      <ToolBtn onClick={() => onWrap('*')} title="Italic"><em>I</em></ToolBtn>
      <Divider />
      <ToolBtn onClick={() => onInsert('\n## ')} title="Heading 2">H2</ToolBtn>
      <ToolBtn onClick={() => onInsert('\n### ')} title="Heading 3">H3</ToolBtn>
      <Divider />
      <ToolBtn onClick={() => onInsert('\n- ')} title="Bullet list">•</ToolBtn>
      <ToolBtn onClick={() => onInsert('\n1. ')} title="Numbered list">1.</ToolBtn>
      <ToolBtn onClick={() => onInsert('\n> ')} title="Blockquote">"</ToolBtn>
      <Divider />
      <ToolBtn onClick={() => {
        const url = prompt('Link URL:')
        if (url) onWrap('[', `](${url})`)
      }} title="Link">🔗</ToolBtn>
      <ToolBtn onClick={() => fileInputRef.current?.click()} title="Upload image">🖼</ToolBtn>
      <ToolBtn onClick={() => onInsert('\n\n---\n\n')} title="Divider">—</ToolBtn>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && onUploadImage(e.target.files[0])}
      />
    </div>
  )
}

function ToolBtn({ children, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="min-w-[32px] h-8 px-2 text-xs text-text-secondary hover:bg-bg-surface hover:text-accent rounded transition-colors"
    >
      {children}
    </button>
  )
}
function Divider() {
  return <div className="w-px h-6 bg-border mx-1 self-center" />
}

function DigestPreview({ issue }) {
  const html = digest.renderMarkdown(issue.body_markdown || '')
  return (
    <div className="max-w-2xl mx-auto bg-[#F1EFE8] text-[#1a1a18] rounded-lg p-8 sm:p-12" style={{ fontFamily: 'Georgia, serif' }}>
      {issue.featured_image_url && (
        <img src={issue.featured_image_url} alt={issue.featured_image_alt || ''} className="w-full rounded mb-8" />
      )}
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#7a7a75]">The Digest</div>
      <h1 className="text-3xl sm:text-4xl font-bold mt-2 leading-tight">{issue.title || 'Untitled'}</h1>
      {issue.subtitle && <p className="text-lg italic text-[#5a5a55] mt-3 leading-snug">{issue.subtitle}</p>}
      <div className="text-xs text-[#7a7a75] mt-4">
        {issue.author || 'Loud Legacy Ventures'}
        {issue.published_at && ' · ' + new Date(issue.published_at).toLocaleDateString()}
        {issue.body_markdown && ' · ' + digest.readingTime(issue.body_markdown) + ' min read'}
      </div>
      <div className="mt-8 digest-body leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

function ResearchModal({ topic, setTopic, keywords, setKeywords, industry, running, onRun, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-accent/30 rounded-lg max-w-lg w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent">AI Research</div>
          <h2 className="text-lg font-semibold mt-1">Research a topic with Claude</h2>
          <p className="text-[11px] text-text-muted mt-1">
            Claude will search the web, write a 800-1200 word draft with inline citations, and load it into the editor. You'll review and edit before publishing — never auto-published.
          </p>
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-1">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            autoFocus
            placeholder="e.g. How tariffs are reshaping the 2026 homebuilding pipeline"
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-1">Optional keywords</label>
          <input
            type="text"
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="e.g. lumber, permits, interest rates"
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="text-[10px] text-text-muted">
          Target industry: <span className="text-accent font-mono">{industry || 'general'}</span> · change in the sidebar if needed.
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-border text-text-secondary py-2 rounded text-xs">Cancel</button>
          <button
            onClick={onRun}
            disabled={running || !topic.trim()}
            className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold disabled:opacity-50"
          >
            {running ? 'Researching… (30-60s)' : 'Run research'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ImageLibraryModal({ onInsert, onClose }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    digest.listReusableImages().then(imgs => { setImages(imgs); setLoading(false) })
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Image Library</div>
            <div className="text-sm font-semibold mt-0.5">Click any image to insert</div>
          </div>
          <button onClick={onClose} className="text-text-muted">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="text-xs text-text-muted text-center py-8">Loading…</div>}
          {!loading && images.length === 0 && (
            <div className="text-xs text-text-muted text-center py-8">No reusable images yet. Upload one via the editor toolbar.</div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map(img => (
              <button
                key={img.id}
                onClick={() => onInsert(img.public_url)}
                className="bg-bg-card border border-border rounded overflow-hidden hover:border-accent/50 transition-all"
              >
                <img src={img.public_url} alt={img.alt_text || ''} className="w-full h-32 object-cover" />
                <div className="p-1.5 text-[9px] text-text-muted truncate">{img.original_filename}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
