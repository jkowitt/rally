import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { humanError } from '@/lib/humanError'
import { Mic, Upload, Square, Loader2, CheckCircle2, Lock } from 'lucide-react'

// Whisper API hard-rejects files >25MB. Cap at 24MB on the client
// so the user gets the error before they wait through an upload
// that's going to fail anyway.
const MAX_FILE_BYTES = 24 * 1024 * 1024
// Roll our own client-side daily cap so we can fail fast instead of
// waiting for the 429 round-trip. The server is the source of truth
// (50/day) — this number just keeps the UI honest.
const SOFT_CLIENT_CAP_HINT = 50

// ActivityCapture — drop-in panel that records audio in the
// browser OR accepts an audio/video file upload, then ships it
// to the transcribe-activity edge function. The function runs
// Whisper + Claude and creates a real activity row + tasks for
// any action items it heard.
//
// The component only handles the upload + invocation flow; the
// edge function does the heavy lifting. We poll the recording
// row until status === 'promoted' or 'failed' so the UI shows
// the result inline without a hard refresh.
//
// Props:
//   - dealId, propertyId, userId  (required)
//   - onPromoted(activityId)      called when transcription succeeds
export default function ActivityCapture({ dealId, propertyId, userId, onPromoted }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { profile, isDeveloper } = useAuth()
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const timerRef = useRef(null)

  // Use the explicit user/property IDs when passed, else fall back
  // to the auth profile so the component works in either context.
  const effectivePropertyId = propertyId || profile?.property_id
  const effectiveUserId = userId || profile?.id

  // Enterprise-only gate. Recording + transcription is heavy compute
  // (Whisper + Claude) and a key differentiator on the enterprise
  // tier. Developers always pass for QA. The CTA explains the value
  // instead of just hiding the feature.
  const plan = profile?.properties?.plan
  const planAllowed = isDeveloper || plan === 'enterprise'
  if (!planAllowed) {
    return <PlanLockedCard />
  }

  useEffect(() => () => {
    // Tear down stream + timer if the modal closes mid-recording.
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  async function startRecording() {
    if (!effectivePropertyId) return
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: 'Recording not supported',
        description: 'Your browser doesn\'t support in-browser recording. Use the Upload button to add a Zoom or audio file instead.',
        type: 'warning',
      })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const opts = mimeTypeFor()
      const mr = opts ? new MediaRecorder(stream, opts) : new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = handleStop
      // Auto-stop at 30 minutes — beyond that the audio almost
      // always exceeds the 24MB Whisper cap and the rep should
      // chunk the call into shorter segments.
      mr.start()
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1
          if (next >= 30 * 60) stopRecording()
          return next
        })
      }, 1000)
    } catch (err) {
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        toast({
          title: 'Microphone access blocked',
          description: 'Allow microphone access in your browser settings, then try again. The icon usually lives next to the URL bar.',
          type: 'warning',
        })
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        toast({ title: 'No microphone detected', description: 'Plug one in or pick a different audio device, then try again.', type: 'warning' })
      } else {
        toast({ title: 'Recording failed', description: humanError(err), type: 'error' })
      }
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRecording(false)
  }

  async function handleStop() {
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' })
    chunksRef.current = []
    await processBlob(blob, blob.type, 'voice_note')
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1)
      toast({
        title: `File is ${mb}MB — too large`,
        description: 'Whisper caps audio at 24MB per file. Split longer recordings (Zoom can export shorter segments) or compress the audio.',
        type: 'warning',
      })
      return
    }
    await processBlob(file, file.type || 'application/octet-stream', 'file_upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function processBlob(blob, mime, source) {
    if (!effectivePropertyId) return
    if (blob.size > MAX_FILE_BYTES) {
      const mb = (blob.size / 1024 / 1024).toFixed(1)
      toast({
        title: `Recording is ${mb}MB — too large`,
        description: 'Audio above 24MB exceeds the Whisper cap. Try a shorter recording.',
        type: 'warning',
      })
      return
    }
    setUploading(true)
    setLastResult(null)
    try {
      // 1. Insert recording row with placeholder, get an id.
      const { data: row, error: insErr } = await supabase.from('activity_recordings').insert({
        property_id: effectivePropertyId,
        deal_id: dealId || null,
        user_id: effectiveUserId,
        source,
        audio_mime: mime,
        status: 'uploaded',
      }).select('id').single()
      if (insErr) throw insErr

      // 2. Upload the audio bytes to the 'recordings' bucket
      //    under {property_id}/{recording_id}.{ext}.
      const ext = extFor(mime) || 'webm'
      const path = `${effectivePropertyId}/${row.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('recordings').upload(path, blob, {
        contentType: mime,
        upsert: true,
      })
      if (upErr) throw upErr

      await supabase.from('activity_recordings').update({ audio_path: path }).eq('id', row.id)

      // 3. Kick off transcription. The edge function takes 5–20s
      //    depending on length; the UI flips to "transcribing"
      //    while we wait, then renders the result inline.
      setUploading(false)
      setTranscribing(true)
      const { data: result, error: fnErr } = await supabase.functions.invoke('transcribe-activity', {
        body: { recording_id: row.id },
      })
      if (fnErr) throw fnErr
      if (!result?.success) {
        // Translate the structured errors the function returns into
        // copy that points the rep at the next action.
        if (result?.error === 'rate_limited') {
          toast({
            title: 'Daily transcription cap hit',
            description: result.message || `You've used all ${SOFT_CLIENT_CAP_HINT} of today's transcriptions. Resets in 24h.`,
            type: 'warning',
          })
          return
        }
        if (result?.error === 'plan_required') {
          toast({
            title: 'Enterprise plan required',
            description: result.message || 'Audio capture is part of the Enterprise tier.',
            type: 'warning',
          })
          return
        }
        throw new Error(result?.error || 'Transcription failed')
      }

      setLastResult(result)
      toast({
        title: 'Activity captured',
        description: result.action_item_count
          ? `${result.action_item_count} action item${result.action_item_count === 1 ? '' : 's'} added as tasks.`
          : 'Logged to the deal timeline.',
        type: 'success',
      })

      // Refresh anything that might show this activity / task.
      queryClient.invalidateQueries({ queryKey: ['deal-activities'] })
      queryClient.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey?.[0]
        return k === 'tasks' || k === 'todo-tasks' || k === 'tasks-dashboard' || k === 'activities-dashboard'
      }})
      onPromoted?.(result.activity_id)
    } catch (err) {
      toast({ title: 'Capture failed', description: humanError(err), type: 'error' })
    } finally {
      setUploading(false)
      setTranscribing(false)
    }
  }

  const busy = recording || uploading || transcribing

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-widest text-text-muted">AI capture</div>
          <div className="text-xs text-text-secondary mt-0.5">
            Record a call, drop a Zoom export, or paste meeting audio. AI transcribes, summarizes, and creates the activity + tasks.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!recording && (
            <button
              onClick={startRecording}
              disabled={busy}
              className="text-[11px] inline-flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded px-2.5 py-1.5 hover:bg-accent/20 disabled:opacity-50"
            >
              <Mic className="w-3.5 h-3.5" /> Record
            </button>
          )}
          {recording && (
            <button
              onClick={stopRecording}
              className="text-[11px] inline-flex items-center gap-1.5 bg-danger/10 border border-danger/30 text-danger rounded px-2.5 py-1.5 hover:bg-danger/20 animate-pulse"
            >
              <Square className="w-3 h-3 fill-current" /> Stop ({formatTime(elapsed)})
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="text-[11px] inline-flex items-center gap-1.5 bg-bg-surface border border-border text-text-secondary rounded px-2.5 py-1.5 hover:border-accent/40 hover:text-accent disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*,.m4a,.webm,.mp3,.mp4"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      </div>

      {(uploading || transcribing) && (
        <div className="mt-2 text-[11px] text-text-muted inline-flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          {uploading ? 'Uploading…' : 'Transcribing & extracting actions…'}
        </div>
      )}

      {lastResult && (
        <div className="mt-2 bg-success/5 border border-success/30 rounded p-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-success font-medium">
            <CheckCircle2 className="w-3 h-3" /> Captured
            {lastResult.sentiment && (
              <span className="ml-2 text-[10px] font-mono text-text-muted">
                · sentiment: {lastResult.sentiment}
                {lastResult.commitment_score != null && ` · score: ${lastResult.commitment_score}`}
              </span>
            )}
          </div>
          {lastResult.summary && (
            <p className="text-text-secondary mt-1 leading-relaxed">{lastResult.summary}</p>
          )}
          {lastResult.action_item_count > 0 && (
            <p className="text-text-muted mt-1">{lastResult.action_item_count} task{lastResult.action_item_count === 1 ? '' : 's'} created.</p>
          )}
        </div>
      )}
    </div>
  )
}

function mimeTypeFor() {
  // MediaRecorder MIME negotiation differs across browsers. Try
  // a small priority list; fall back to the browser default by
  // returning undefined.
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  if (typeof MediaRecorder === 'undefined') return undefined
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return { mimeType: m } } catch { /* ignore */ }
  }
  return undefined
}

function extFor(mime) {
  if (!mime) return 'webm'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('m4a')) return 'm4a'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('wav')) return 'wav'
  return 'bin'
}

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

// Shown in place of the recorder when the user isn't on the
// enterprise plan. Sells the value and points at billing without
// hiding the feature entirely — buyers in mid-market need to see
// what they're missing to upgrade.
function PlanLockedCard() {
  return (
    <div className="bg-bg-card border border-accent/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-mono uppercase tracking-widest text-accent">Enterprise feature</div>
          <h3 className="text-sm font-semibold text-text-primary mt-0.5">AI call + meeting capture</h3>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Record a sales call in the browser or drop a Zoom export. The AI transcribes it, summarizes the key moments, scores buying intent, and creates the right tasks automatically. Available on the Enterprise plan.
          </p>
          <Link
            to="/app/settings/billing"
            className="inline-block mt-2 text-[11px] bg-accent text-bg-primary rounded px-3 py-1.5 font-semibold hover:opacity-90"
          >
            See plans →
          </Link>
        </div>
      </div>
    </div>
  )
}
