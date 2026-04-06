import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

/* ── Signature Pad (canvas-based drawing) ── */
function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#e2e8f0'
  }, [])

  function getPoint(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  function startDraw(e) {
    e.preventDefault()
    isDrawing.current = true
    lastPoint.current = getPoint(e)
  }

  function draw(e) {
    e.preventDefault()
    if (!isDrawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const point = getPoint(e)
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPoint.current = point
  }

  function endDraw(e) {
    e.preventDefault()
    isDrawing.current = false
    lastPoint.current = null
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onClear?.()
  }

  function save() {
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave?.(dataUrl)
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className="w-full h-40 bg-bg-card border border-border rounded-lg cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-card transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          className="px-3 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          Save Signature
        </button>
      </div>
    </div>
  )
}

/* ── Type-to-Sign ── */
function TypeToSign({ onSave }) {
  const [typed, setTyped] = useState('')
  const canvasRef = useRef(null)

  function renderAndSave() {
    if (!typed.trim()) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.font = 'italic 32px "Georgia", "Times New Roman", cursive'
    ctx.fillStyle = '#e2e8f0'
    ctx.textBaseline = 'middle'
    ctx.fillText(typed, 16, rect.height / 2)
    const dataUrl = canvas.toDataURL('image/png')
    onSave?.(dataUrl)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Type your full name"
        className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <canvas
        ref={canvasRef}
        className="w-full h-20 bg-bg-card border border-border rounded-lg"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={renderAndSave}
          disabled={!typed.trim()}
          className="px-3 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Use Typed Signature
        </button>
      </div>
    </div>
  )
}

/* ── Signer Row (draggable) ── */
function SignerRow({ signer, index, onRemove, onDragStart, onDragOver, onDrop, totalSigners }) {
  const statusColor = {
    signed: 'text-green-400',
    pending: 'text-yellow-400',
    not_started: 'text-text-secondary',
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className="flex items-center gap-3 p-3 bg-bg-card border border-border rounded-lg cursor-grab active:cursor-grabbing"
    >
      <span className="text-text-secondary text-sm font-mono w-6 shrink-0">
        #{signer.order}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{signer.name}</p>
        <p className="text-text-secondary text-xs truncate">{signer.email}</p>
      </div>

      <span className="text-xs text-text-secondary bg-bg-surface px-2 py-0.5 rounded hidden sm:inline-block">
        {signer.role}
      </span>

      <span className={`text-xs ${statusColor[signer.status] || statusColor.not_started}`}>
        {signer.status === 'signed'
          ? `Signed ${signer.signed_at ? new Date(signer.signed_at).toLocaleDateString() : ''}`
          : signer.status === 'pending'
            ? 'Awaiting'
            : 'Not started'}
      </span>

      {signer.status !== 'signed' && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-text-secondary hover:text-red-400 transition-colors text-lg leading-none"
          title="Remove signer"
        >
          &times;
        </button>
      )}
    </div>
  )
}

/* ── Add Signer Form ── */
function AddSignerForm({ onAdd, nextOrder }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Sponsor Representative')

  const roles = [
    'Sponsor Representative',
    'Property Director',
    'Legal Counsel',
    'Finance Officer',
    'Witness',
  ]

  function handleAdd() {
    if (!name.trim() || !email.trim()) return
    onAdd({
      name: name.trim(),
      email: email.trim(),
      role,
      order: nextOrder,
      status: 'not_started',
      signed_at: null,
      signature_data: null,
    })
    setName('')
    setEmail('')
    setRole('Sponsor Representative')
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-bg-card border border-dashed border-border rounded-lg">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-bg-surface border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-bg-surface border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg bg-bg-surface border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {roles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!name.trim() || !email.trim()}
        className="px-4 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
      >
        + Add
      </button>
    </div>
  )
}

/* ── Compute overall signature status ── */
function computeStatus(signers) {
  if (!signers || signers.length === 0) return 'not_started'
  const signedCount = signers.filter((s) => s.status === 'signed').length
  if (signedCount === 0) return 'pending'
  if (signedCount === signers.length) return 'completed'
  return 'partially_signed'
}

const STATUS_LABELS = {
  not_started: 'Not Started',
  pending: 'Pending',
  partially_signed: 'Partially Signed',
  completed: 'Completed',
}

const STATUS_BADGE = {
  not_started: 'bg-bg-card text-text-secondary',
  pending: 'bg-yellow-500/10 text-yellow-400',
  partially_signed: 'bg-orange-500/10 text-orange-400',
  completed: 'bg-green-500/10 text-green-400',
}

/* ═══════════════════════════════════════════
   Main Modal Component
   ═══════════════════════════════════════════ */
export default function ESignatureModal({ contract, onComplete, onClose }) {
  const { toast } = useToast()
  const [signers, setSigners] = useState(contract?.signers || [])
  const [activeSignerIdx, setActiveSignerIdx] = useState(null)
  const [signMode, setSignMode] = useState('draw') // 'draw' | 'type'
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const dragIdx = useRef(null)

  const status = computeStatus(signers)

  /* ── Drag-to-reorder ── */
  function handleDragStart(e, idx) {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, dropIdx) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === dropIdx) return
    const updated = [...signers]
    const [moved] = updated.splice(dragIdx.current, 1)
    updated.splice(dropIdx, 0, moved)
    // Recalculate order numbers
    const reordered = updated.map((s, i) => ({ ...s, order: i + 1 }))
    setSigners(reordered)
    dragIdx.current = null
  }

  /* ── Add / Remove signers ── */
  function addSigner(signer) {
    setSigners((prev) => [...prev, signer])
    setShowAddForm(false)
  }

  function removeSigner(idx) {
    setSigners((prev) => {
      const updated = prev.filter((_, i) => i !== idx)
      return updated.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  /* ── Apply signature to active signer ── */
  function applySignature(dataUrl) {
    if (activeSignerIdx === null) return
    setSigners((prev) =>
      prev.map((s, i) =>
        i === activeSignerIdx
          ? { ...s, status: 'signed', signed_at: new Date().toISOString(), signature_data: dataUrl }
          : s,
      ),
    )
    setActiveSignerIdx(null)
    toast({ title: 'Signature captured', type: 'success' })
  }

  /* ── Persist to Supabase ── */
  async function saveToSupabase() {
    if (!contract?.id) return
    setSaving(true)
    try {
      const currentStatus = computeStatus(signers)
      const isFullySigned = currentStatus === 'completed'

      const payload = {
        signature_status: currentStatus,
        signers,
        ...(isFullySigned ? { fully_signed_at: new Date().toISOString() } : {}),
      }

      const { error } = await supabase
        .from('contracts')
        .update(payload)
        .eq('id', contract.id)

      if (error) throw error

      toast({ title: isFullySigned ? 'Contract fully signed!' : 'Signature progress saved', type: 'success' })

      if (isFullySigned) {
        onComplete?.({ ...contract, ...payload })
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Failed to save signature data', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /* ── PDF preview data URL ── */
  const pdfSrc = contract?.pdf_file_data
    ? contract.pdf_file_data.startsWith('data:')
      ? contract.pdf_file_data
      : `data:application/pdf;base64,${contract.pdf_file_data}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              E-Signature — {contract?.brand_name || 'Contract'}
            </h2>
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto flex flex-col lg:flex-row">

          {/* Left: PDF Preview */}
          <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border p-4 flex flex-col min-h-[300px]">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Contract Preview</h3>
            {pdfSrc ? (
              <iframe
                src={pdfSrc}
                title="Contract PDF"
                className="flex-1 w-full rounded-lg border border-border bg-white min-h-[260px]"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-secondary text-sm bg-bg-card rounded-lg border border-border">
                No PDF available for this contract.
              </div>
            )}
          </div>

          {/* Right: Signers + Signature Capture */}
          <div className="lg:w-1/2 p-4 flex flex-col gap-4 overflow-auto">

            {/* Signers list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-text-secondary">
                  Signers ({signers.filter((s) => s.status === 'signed').length}/{signers.length} signed)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  {showAddForm ? 'Cancel' : '+ Add Signer'}
                </button>
              </div>

              {showAddForm && (
                <div className="mb-3">
                  <AddSignerForm onAdd={addSigner} nextOrder={signers.length + 1} />
                </div>
              )}

              <div className="flex flex-col gap-2">
                {signers.length === 0 && (
                  <p className="text-text-secondary text-sm text-center py-4">
                    No signers added yet. Add signers to begin the signing flow.
                  </p>
                )}
                {signers.map((signer, idx) => (
                  <div key={`${signer.email}-${idx}`}>
                    <SignerRow
                      signer={signer}
                      index={idx}
                      onRemove={removeSigner}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      totalSigners={signers.length}
                    />
                    {signer.status !== 'signed' && (
                      <button
                        type="button"
                        onClick={() => setActiveSignerIdx(activeSignerIdx === idx ? null : idx)}
                        className="mt-1 ml-9 text-xs text-accent hover:underline"
                      >
                        {activeSignerIdx === idx ? 'Cancel signing' : 'Sign now'}
                      </button>
                    )}

                    {/* Inline signature capture for active signer */}
                    {activeSignerIdx === idx && (
                      <div className="mt-2 ml-9 p-3 bg-bg-surface border border-border rounded-lg">
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setSignMode('draw')}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                              signMode === 'draw'
                                ? 'bg-accent text-white'
                                : 'bg-bg-card text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            Draw
                          </button>
                          <button
                            type="button"
                            onClick={() => setSignMode('type')}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                              signMode === 'type'
                                ? 'bg-accent text-white'
                                : 'bg-bg-card text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            Type
                          </button>
                        </div>

                        {signMode === 'draw' ? (
                          <SignaturePad
                            onSave={applySignature}
                            onClear={() => {}}
                          />
                        ) : (
                          <TypeToSign onSave={applySignature} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <p className="text-xs text-text-secondary hidden sm:block">
            {status === 'completed'
              ? 'All parties have signed.'
              : `${signers.filter((s) => s.status !== 'signed').length} signature(s) remaining.`}
          </p>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-card transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={saveToSupabase}
              disabled={saving || signers.length === 0}
              className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Progress'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ESignatureModal }
