import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { sendQueuedEmail } from '@/services/emailSequenceService'
import { useToast } from '@/components/Toast'

export default function EmailQueue() {
  const { profile, realIsDeveloper } = useAuth()
  const { toast } = useToast()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const canAccess = realIsDeveloper || profile?.role === 'businessops' || profile?.role === 'admin'

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('email_sends')
      .select('*, profiles:user_id(full_name, email)')
      .in('status', ['queued', 'failed'])
      .order('scheduled_for', { ascending: true })
    setQueue(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Auth gate AFTER hooks (rules-of-hooks).
  if (profile && !canAccess) return <Navigate to="/app" replace />

  async function sendNow(sendId) {
    setProcessing(true)
    const result = await sendQueuedEmail(sendId)
    if (result.sent) toast({ title: 'Email sent', type: 'success' })
    else if (result.failed) toast({ title: 'Send failed', description: result.error, type: 'error' })
    else toast({ title: 'Skipped', type: 'info' })
    await load()
    setProcessing(false)
  }

  async function skipEmail(sendId) {
    await supabase.from('email_sends').update({ status: 'skipped' }).eq('id', sendId)
    toast({ title: 'Skipped', type: 'info' })
    await load()
  }

  async function sendAll() {
    if (!confirm(`Send all ${queue.length} queued emails?`)) return
    setProcessing(true)
    for (const send of queue) {
      await sendQueuedEmail(send.id)
    }
    toast({ title: `Processed ${queue.length} emails`, type: 'success' })
    await load()
    setProcessing(false)
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Email Queue</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">{queue.length} emails waiting to send</p>
        </div>
        {queue.length > 0 && (
          <button onClick={sendAll} disabled={processing} className="bg-accent text-bg-primary px-4 py-2 rounded text-xs font-medium disabled:opacity-50">
            {processing ? 'Sending...' : `Send All (${queue.length})`}
          </button>
        )}
      </div>

      <div className="space-y-1">
        {loading && <div className="text-center text-text-muted text-sm py-6">Loading...</div>}
        {!loading && queue.length === 0 && (
          <div className="text-center text-text-muted text-sm py-12">No emails in queue. When automation is OFF, new scheduled emails will land here for manual review.</div>
        )}
        {queue.map(send => (
          <div key={send.id} className={`bg-bg-surface border rounded-lg p-3 ${send.status === 'failed' ? 'border-danger/30' : 'border-border'}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm text-text-primary font-medium truncate">{send.subject}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${send.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{send.status}</span>
                </div>
                <div className="text-[10px] text-text-muted">
                  → {send.profiles?.email || 'unknown'} · scheduled {new Date(send.scheduled_for).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => sendNow(send.id)} className="text-[10px] text-accent hover:underline">Send</button>
                <button onClick={() => skipEmail(send.id)} className="text-[10px] text-text-muted hover:text-danger">Skip</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
