import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import {
  getEffectiveSignatures,
  saveProfileSignature,
  saveProviderSignature,
  importGmailSignature,
} from '@/services/emailSignatureService'

// /app/crm/inbox/signature
//
// Edit the email signature that gets auto-appended to outgoing
// CRM emails. Three tiers:
//   • Default (profile.email_signature_html) — used when no
//     per-provider override is set.
//   • Outlook override — applied only when sending via Outlook.
//   • Gmail override   — applied only when sending via Gmail.
//
// Reps with Gmail connected can hit "Import from Gmail" to pull
// whatever signature Gmail already has configured. Outlook has no
// equivalent API, so the user pastes from their Outlook Options
// panel (Ctrl+A / Cmd+A inside the signature box, then Cmd+C, then
// Cmd+V here).
export default function SignatureSettings() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState('default')   // default | outlook | gmail
  const [html, setHtml] = useState({ default: '', outlook: '', gmail: '' })
  const [plain, setPlain] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
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
  const setCurrentHtml = (v) => setHtml(prev => ({ ...prev, [tab]: v }))

  // contentEditable paste handler — accepts rich HTML (with images)
  // from Gmail / Outlook / Apple Mail and keeps formatting. We also
  // support drag-and-drop image files and convert them inline to
  // base64 so the email is self-contained when sent.
  function onPaste(e) {
    const dt = e.clipboardData
    if (!dt) return
    if (dt.types.includes('Files') && dt.files.length > 0) {
      e.preventDefault()
      Array.from(dt.files).forEach(handleImageFile)
      return
    }
    // Default behaviour for HTML pastes: let the browser drop it in.
    // We'll re-read innerHTML in onInput.
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
        <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">Editor — paste rich HTML or drop image files</div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={onPaste}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onInput={(e) => setCurrentHtml(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: currentHtml }}
          className="bg-bg-card border border-border rounded p-3 min-h-[160px] text-sm text-text-primary focus:outline-none focus:border-accent prose-sm"
        />
        <div className="text-[10px] text-text-muted">
          Drop or paste an image to insert it inline (encoded as base64; keep under 1 MB).
        </div>
      </div>

      <details className="bg-bg-card border border-border rounded p-3">
        <summary className="cursor-pointer text-[11px] text-text-muted">Raw HTML (advanced)</summary>
        <textarea
          value={currentHtml}
          onChange={(e) => setCurrentHtml(e.target.value)}
          rows={6}
          className="mt-2 w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-[11px] font-mono text-text-secondary"
        />
      </details>

      {tab === 'default' && (
        <details className="bg-bg-card border border-border rounded p-3">
          <summary className="cursor-pointer text-[11px] text-text-muted">Plain-text fallback (sent when client strips HTML)</summary>
          <textarea
            value={plain}
            onChange={(e) => setPlain(e.target.value)}
            rows={4}
            placeholder={'Jane Doe\nVP Sales · Acme Corp\nme@acme.com · +1 (555) 555-0100'}
            className="mt-2 w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-[11px] text-text-secondary"
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
