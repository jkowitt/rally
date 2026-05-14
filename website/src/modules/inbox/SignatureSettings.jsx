import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import {
  Bold, Italic, Underline as UnderlineIcon, Link2, Image as ImageIcon,
  List as ListIcon, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Type, Palette, Eraser, Upload, X,
} from 'lucide-react'
import {
  getEffectiveSignatures,
  saveProfileSignature,
  saveProviderSignature,
  importGmailSignature,
} from '@/services/emailSignatureService'

// ─── Logo drag-and-drop zone ────────────────────────────────────────────────
// Rendered above the contentEditable editor when the "With logo" template is
// active. Lets the user drop or click-to-upload their logo; on upload the
// placeholder <img src=""> in the editor is replaced with the real base64
// image, auto-sized to 48 px height for a clean, professional look.
// The zone disappears once a logo has been placed (the user can still swap it
// via the toolbar image button or by dropping a new file into the editor).

const LOGO_PLACEHOLDER_MARKER = 'data-sig-logo-placeholder="1"'

function LogoDropZone({ editorRef, onLogoPlaced }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  function processFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 1024 * 1024) return // silently skip — editor handles toast
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const el = editorRef.current
      if (!el) return
      // Find the placeholder img and replace its src + remove the marker
      const placeholder = el.querySelector('img[data-sig-logo-placeholder]')
      if (placeholder) {
        placeholder.src = dataUrl
        placeholder.removeAttribute('data-sig-logo-placeholder')
        placeholder.style.height = '48px'
        placeholder.style.width = 'auto'
        placeholder.style.maxWidth = '160px'
        placeholder.style.display = 'block'
        placeholder.alt = 'Logo'
      } else {
        // No placeholder — insert at cursor / end
        el.focus()
        document.execCommand('insertHTML', false,
          `<img src="${dataUrl}" alt="Logo" style="height:48px;width:auto;max-width:160px;display:block;" />`)
      }
      onLogoPlaced()
    }
    reader.readAsDataURL(file)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) processFile(file)
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => fileRef.current?.click()}
      className={`
        flex items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-dashed
        px-4 py-3 text-xs font-medium transition-colors select-none
        ${dragging
          ? 'border-accent bg-amber-50 text-amber-700'
          : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-accent hover:bg-amber-50 hover:text-amber-700'}
      `}
    >
      <Upload className="w-4 h-4 flex-shrink-0" />
      <span>
        {dragging ? 'Drop logo here' : 'Drop your logo here, or click to upload'}
      </span>
      <span className="text-slate-400 font-normal">· PNG, JPG, SVG · max 1 MB · auto-sized to 48 px</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  )
}

// ─── Detect whether the current editor HTML has an unfilled logo placeholder ─
function hasLogoPlaceholder(html) {
  return html.includes('data-sig-logo-placeholder')
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function SignatureSettings() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState('default')   // default | outlook | gmail
  const [html, setHtml] = useState({ default: '', outlook: '', gmail: '' })
  const [plain, setPlain] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [logoPlaced, setLogoPlaced] = useState(false)
  const editorRef = useRef(null)

  useEffect(() => {
    let alive = true
    if (!profile?.id) return
    ;(async () => {
      const sigs = await getEffectiveSignatures(profile.id)
      if (!alive) return
      setHtml({ default: sigs.html, outlook: sigs.perProvider.outlook, gmail: sigs.perProvider.gmail })
      setPlain(sigs.plain)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [profile?.id])

  const currentHtml = html[tab] || ''
  const setCurrentHtml = useCallback((v) => {
    setHtml(prev => ({ ...prev, [tab]: v }))
    // Hide the drop zone once the placeholder is gone
    if (!hasLogoPlaceholder(v)) setLogoPlaced(true)
  }, [tab])

  // Show the drop zone when the logo template is active and logo not yet placed
  const showLogoZone = hasLogoPlaceholder(currentHtml) && !logoPlaced

  // Reset logoPlaced whenever the tab changes or new content is loaded
  useEffect(() => {
    setLogoPlaced(false)
  }, [tab])

  // Imperatively sync the editor's innerHTML when content changes come from
  // outside typing — tab switch, gmail-import, template insert, raw-HTML edit.
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.innerHTML === currentHtml) return
    el.innerHTML = currentHtml
  }, [currentHtml, tab, loading])

  // contentEditable paste handler
  function onPaste(e) {
    const dt = e.clipboardData
    if (!dt) return
    if (dt.types.includes('Files') && dt.files.length > 0) {
      e.preventDefault()
      Array.from(dt.files).forEach(handleImageFile)
      return
    }
  }

  function onDrop(e) {
    if (!e.dataTransfer?.files?.length) return
    e.preventDefault()
    Array.from(e.dataTransfer.files).forEach(handleImageFile)
  }

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Keep signature images under 1 MB so emails stay deliverable.', type: 'warning' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const img = `<img src="${dataUrl}" alt="" style="max-width:240px;display:inline-block;" />`
      const el = editorRef.current
      if (!el) return
      el.focus()
      document.execCommand('insertHTML', false, img)
      setCurrentHtml(el.innerHTML)
    }
    reader.readAsDataURL(file)
  }

  async function save() {
    if (!profile?.id) return
    setSaving(true)
    try {
      if (tab === 'default') {
        const r = await saveProfileSignature({ userId: profile.id, html: html.default, plain })
        if (!r.success) throw new Error(r.error)
      } else {
        const r = await saveProviderSignature({ userId: profile.id, provider: tab, html: html[tab] })
        if (!r.success) throw new Error(r.error)
      }
      toast({ title: 'Signature saved', type: 'success' })
    } catch (e) {
      toast({ title: 'Save failed', description: humanError(e), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function importFromGmail() {
    setImporting(true)
    try {
      const r = await importGmailSignature()
      if (!r.success) throw new Error(r.error)
      if (!r.primary) {
        toast({ title: 'Gmail returned no signature', description: 'Set one in Gmail → Settings → Signature, then try again.', type: 'warning' })
        return
      }
      setHtml(prev => ({ ...prev, gmail: r.primary }))
      setTab('gmail')
      toast({ title: 'Imported from Gmail', description: 'Saved to your Gmail-only signature override.', type: 'success' })
    } catch (e) {
      toast({ title: 'Import failed', description: humanError(e), type: 'error' })
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <div className="p-6 text-xs text-text-muted">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <Link to="/app/crm/inbox" className="text-[10px] text-text-muted hover:text-accent">← Inbox</Link>
        <h1 className="text-xl sm:text-2xl font-semibold mt-1">Email signature</h1>
        <p className="text-[11px] text-text-muted mt-1 max-w-xl">
          Auto-appended to outgoing CRM emails. Paste your existing signature from Gmail or Outlook (text + images supported), or click Import to pull whatever Gmail already has configured.
        </p>
      </header>

      <div className="flex items-center gap-1 border-b border-border">
        {[
          { key: 'default', label: 'Default' },
          { key: 'outlook', label: 'Outlook only' },
          { key: 'gmail',   label: 'Gmail only' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs border-b-2 ${tab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-secondary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="text-[11px] text-text-muted">
        {tab === 'default' && 'Used for any send unless the connected inbox has its own override below.'}
        {tab === 'outlook' && 'Applied only when sending via Outlook. Falls back to Default if blank.'}
        {tab === 'gmail'   && 'Applied only when sending via Gmail. Falls back to Default if blank.'}
      </div>

      {tab === 'gmail' && (
        <Button variant="secondary" size="sm" onClick={importFromGmail} disabled={importing}>
          {importing ? 'Importing…' : '↓ Import from Gmail'}
        </Button>
      )}

      <div className="space-y-2">
        <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">Editor</div>
        <SignatureToolbar
          editorRef={editorRef}
          onChange={() => setCurrentHtml(editorRef.current?.innerHTML || '')}
          onInsertImage={handleImageFile}
        />

        {/* Logo drag-and-drop zone — shown only when the "With logo" template
            has been inserted and the placeholder has not yet been filled */}
        {showLogoZone && (
          <LogoDropZone
            editorRef={editorRef}
            onLogoPlaced={() => {
              setLogoPlaced(true)
              setCurrentHtml(editorRef.current?.innerHTML || '')
            }}
          />
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={onPaste}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onInput={(e) => setCurrentHtml(e.currentTarget.innerHTML)}
          className="bg-white border border-slate-200 rounded p-4 min-h-[200px] text-sm text-slate-900 focus:outline-none focus:border-accent shadow-inner"
          style={{ lineHeight: 1.5 }}
        />
        <div className="text-[10px] text-text-muted">
          Use the toolbar above for formatting + links + logos. You can also drop or paste an image directly into the editor (encoded inline; keep under 1 MB so emails stay deliverable).
        </div>
      </div>

      <details className="bg-slate-50 border border-slate-200 rounded p-3">
        <summary className="cursor-pointer text-[11px] text-text-muted">Raw HTML (advanced)</summary>
        <textarea
          value={currentHtml}
          onChange={(e) => setCurrentHtml(e.target.value)}
          rows={6}
          className="mt-2 w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] font-mono text-slate-700"
        />
      </details>

      {tab === 'default' && (
        <details className="bg-slate-50 border border-slate-200 rounded p-3">
          <summary className="cursor-pointer text-[11px] text-text-muted">Plain-text fallback (sent when client strips HTML)</summary>
          <textarea
            value={plain}
            onChange={(e) => setPlain(e.target.value)}
            rows={4}
            placeholder={'Jane Doe\nVP Sales · Acme Corp\nme@acme.com · +1 (555) 555-0100'}
            className="mt-2 w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-700"
          />
        </details>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save signature'}
        </Button>
      </div>
    </div>
  )
}

// ─── SignatureToolbar ────────────────────────────────────────────────────────
function SignatureToolbar({ editorRef, onChange, onInsertImage }) {
  const fileRef = useRef(null)
  const [colorOpen, setColorOpen] = useState(false)

  function focusEditor() {
    editorRef.current?.focus()
  }

  function exec(command, value) {
    focusEditor()
    document.execCommand(command, false, value)
    onChange?.()
  }

  function insertHTML(html) {
    focusEditor()
    document.execCommand('insertHTML', false, html)
    onChange?.()
  }

  function insertLink() {
    const url = window.prompt('Link URL (https://…):', 'https://')
    if (!url || url === 'https://') return
    const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      exec('createLink', finalUrl)
      const anchors = editorRef.current?.querySelectorAll('a[href]') || []
      anchors.forEach(a => { a.target = '_blank'; a.rel = 'noopener' })
      onChange?.()
    } else {
      insertHTML(`<a href="${finalUrl}" target="_blank" rel="noopener">${finalUrl.replace(/^https?:\/\//, '')}</a>`)
    }
  }

  function setColor(hex) {
    exec('foreColor', hex)
    setColorOpen(false)
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded flex items-center gap-1 p-1 flex-wrap">
      <select
        onChange={(e) => { if (e.target.value) { exec('fontSize', e.target.value); e.target.value = '' } }}
        className="bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none"
        defaultValue=""
        title="Text size"
      >
        <option value="" disabled>Size</option>
        <option value="2">Small</option>
        <option value="3">Normal</option>
        <option value="4">Large</option>
        <option value="5">Heading</option>
      </select>

      <Divider />

      <ToolBtn title="Bold (⌘B)" onClick={() => exec('bold')}><Bold className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn title="Italic (⌘I)" onClick={() => exec('italic')}><Italic className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn title="Underline (⌘U)" onClick={() => exec('underline')}><UnderlineIcon className="w-3.5 h-3.5" /></ToolBtn>

      <Divider />

      <div className="relative">
        <ToolBtn title="Text color" onClick={() => setColorOpen(v => !v)}>
          <Palette className="w-3.5 h-3.5" />
        </ToolBtn>
        {colorOpen && (
          <div className="absolute z-20 mt-1 left-0 bg-white border border-slate-200 rounded p-2 shadow-2xl grid grid-cols-6 gap-1">
            {[
              '#0f172a','#334155','#475569','#64748b','#94a3b8','#cbd5e1',
              '#dc2626','#ea580c','#d97706','#ca8a04','#65a30d','#16a34a',
              '#0d9488','#0284c7','#2563eb','#4f46e5','#7c3aed','#c026d3',
              '#db2777','#e11d48','#ffffff','#f59e0b','#10b981','#3b82f6',
            ].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-5 h-5 rounded border border-slate-300 hover:scale-110 transition-transform"
                style={{ background: c }}
                aria-label={`Color ${c}`}
                title={c}
              />
            ))}
          </div>
        )}
      </div>

      <Divider />

      <ToolBtn title="Bulleted list" onClick={() => exec('insertUnorderedList')}><ListIcon className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn title="Numbered list" onClick={() => exec('insertOrderedList')}><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>

      <Divider />

      <ToolBtn title="Align left" onClick={() => exec('justifyLeft')}><AlignLeft className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn title="Align center" onClick={() => exec('justifyCenter')}><AlignCenter className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn title="Align right" onClick={() => exec('justifyRight')}><AlignRight className="w-3.5 h-3.5" /></ToolBtn>

      <Divider />

      <ToolBtn title="Insert link" onClick={insertLink}><Link2 className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn title="Insert image / logo" onClick={() => fileRef.current?.click()}><ImageIcon className="w-3.5 h-3.5" /></ToolBtn>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onInsertImage(f)
          if (fileRef.current) fileRef.current.value = ''
        }}
        className="hidden"
      />

      <Divider />

      <ToolBtn title="Clear formatting" onClick={() => exec('removeFormat')}><Eraser className="w-3.5 h-3.5" /></ToolBtn>

      <div className="flex-1" />

      <select
        onChange={(e) => {
          if (!e.target.value) return
          const tpl = SIGNATURE_TEMPLATES[e.target.value]
          if (tpl) {
            if (editorRef.current) {
              editorRef.current.innerHTML = tpl
              onChange?.()
            }
          }
          e.target.value = ''
        }}
        className="bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-700 focus:outline-none"
        defaultValue=""
        title="Insert a starter signature template"
      >
        <option value="" disabled>Insert template…</option>
        <option value="minimal">Minimal</option>
        <option value="contact">With contact info</option>
        <option value="social">With social links</option>
        <option value="logo">With logo</option>
      </select>
    </div>
  )
}

function ToolBtn({ title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="text-slate-500 hover:text-accent hover:bg-slate-100 p-1.5 rounded transition-colors"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5" />
}

// ─── Signature templates ─────────────────────────────────────────────────────
// The "logo" template uses data-sig-logo-placeholder="1" on the <img> so the
// LogoDropZone can find and replace it. The placeholder renders as a visible
// dashed box via inline styles so the user can see where the logo will go.
const SIGNATURE_TEMPLATES = {
  minimal: `<p><strong>Your Name</strong><br/>Title · Company</p>`,
  contact: `<p><strong>Your Name</strong><br/>Title · Company<br/><a href="mailto:you@example.com" target="_blank" rel="noopener">you@example.com</a> · +1 (555) 555-0100</p>`,
  social: `<p><strong>Your Name</strong><br/>Title · Company<br/><a href="mailto:you@example.com" target="_blank" rel="noopener">you@example.com</a></p><p style="font-size:11px;color:#64748b;"><a href="https://www.linkedin.com/in/yourname" target="_blank" rel="noopener">LinkedIn</a> · <a href="https://twitter.com/yourhandle" target="_blank" rel="noopener">Twitter</a> · <a href="https://example.com" target="_blank" rel="noopener">example.com</a></p>`,
  logo: `<table cellpadding="0" cellspacing="0" style="border:0;font-family:Arial,sans-serif;"><tr><td style="padding-right:14px;vertical-align:middle;"><img src="" alt="Logo" data-sig-logo-placeholder="1" style="height:48px;width:auto;max-width:160px;display:block;border:2px dashed #cbd5e1;border-radius:4px;padding:6px;min-width:80px;min-height:40px;background:#f8fafc;" /></td><td style="vertical-align:middle;border-left:2px solid #e2e8f0;padding-left:14px;"><strong style="font-size:14px;color:#0f172a;">Your Name</strong><br/><span style="font-size:12px;color:#64748b;">Title · Company</span><br/><a href="mailto:you@example.com" target="_blank" rel="noopener" style="font-size:12px;color:#2563eb;text-decoration:none;">you@example.com</a><span style="font-size:12px;color:#94a3b8;"> · +1 (555) 555-0100</span></td></tr></table>`,
}
