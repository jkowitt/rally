import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { humanError } from '@/lib/humanError'
import { Mic, Upload, Square, Loader2, CheckCircle2 } from 'lucide-react'

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
  const { profile } = useAuth()
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

  useEffect(() => () => {
    // Tear down stream + timer if the modal closes mid-recording.
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  async function startRecording() {
    if (!effectivePropertyId) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream, mimeTypeFor() || undefined)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = handleStop
      mr.start()
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
    } catch (err) {
      toast({ title: 'Microphone unavailable', description: humanError(err), type: 'error' })
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
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 50MB. Try splitting longer recordings.', type: 'warning' })
      return
    }
    await processBlob(file, file.type || 'application/octet-stream', 'file_upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function processBlob(blob, mime, source) {
    if (!effectivePropertyId) return
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
      if (!result?.success) throw new Error(result?.error || 'Transcription failed')

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
