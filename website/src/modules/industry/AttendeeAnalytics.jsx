import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

export default function AttendeeAnalytics() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ event_id: '', registration_type: 'general', total_registered: '', total_attended: '', badge_scans_total: '', session_name: '' })

  const { data: events } = useQuery({
    queryKey: ['attendee-events', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('events').select('id, name, event_date').eq('property_id', propertyId).order('event_date', { ascending: false })
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: attendees } = useQuery({
    queryKey: ['attendee-data', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('conference_attendees').select('*, events(name, event_date)').eq('property_id', propertyId).order('tracked_date', { ascending: false })
      return data || []
    },
    enabled: !!propertyId,
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('conference_attendees').insert({ ...form, property_id: propertyId, total_registered: parseInt(form.total_registered) || 0, total_attended: parseInt(form.total_attended) || 0, badge_scans_total: parseInt(form.badge_scans_total) || 0 })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendee-data'] }); toast({ title: 'Attendance recorded', type: 'success' }); setShowAdd(false); setForm({ event_id: '', registration_type: 'general', total_registered: '', total_attended: '', badge_scans_total: '', session_name: '' }) },
  })

  const totalRegistered = (attendees || []).reduce((s, a) => s + (a.total_registered || 0), 0)
  const totalAttended = (attendees || []).reduce((s, a) => s + (a.total_attended || 0), 0)
  const totalScans = (attendees || []).reduce((s, a) => s + (a.badge_scans_total || 0), 0)
  const attendanceRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Attendee Analytics</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">Track registrations, attendance, and badge scans</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">+ Record Attendance</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Registered</div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">{totalRegistered.toLocaleString()}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Attended</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">{totalAttended.toLocaleString()}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Attendance Rate</div>
          <div className="text-2xl font-bold font-mono text-success mt-1">{attendanceRate}%</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Badge Scans</div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">{totalScans.toLocaleString()}</div>
        </div>
      </div>

      {showAdd && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Record Attendance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.event_id} onChange={e => setForm({ ...form, event_id: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="">Select event</option>
              {(events || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={form.registration_type} onChange={e => setForm({ ...form, registration_type: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              {['general', 'vip', 'speaker', 'exhibitor', 'press'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" placeholder="Total registered" value={form.total_registered} onChange={e => setForm({ ...form, total_registered: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Total attended" value={form.total_attended} onChange={e => setForm({ ...form, total_attended: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Badge scans" value={form.badge_scans_total} onChange={e => setForm({ ...form, badge_scans_total: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input placeholder="Session name (optional)" value={form.session_name} onChange={e => setForm({ ...form, session_name: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMutation.mutate()} disabled={!form.event_id} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">Save</button>
            <button onClick={() => setShowAdd(false)} className="text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left">
            <th className="px-4 py-3 text-xs text-text-muted font-mono">Event</th>
            <th className="px-4 py-3 text-xs text-text-muted font-mono">Type</th>
            <th className="px-4 py-3 text-xs text-text-muted font-mono text-center">Registered</th>
            <th className="px-4 py-3 text-xs text-text-muted font-mono text-center">Attended</th>
            <th className="px-4 py-3 text-xs text-text-muted font-mono text-center">Scans</th>
            <th className="px-4 py-3 text-xs text-text-muted font-mono">Session</th>
          </tr></thead>
          <tbody>
            {(attendees || []).map(a => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text-primary">{a.events?.name || '—'}</td>
                <td className="px-4 py-3"><span className="text-[10px] font-mono bg-bg-card px-2 py-0.5 rounded text-text-muted">{a.registration_type}</span></td>
                <td className="px-4 py-3 text-center font-mono">{a.total_registered}</td>
                <td className="px-4 py-3 text-center font-mono text-accent">{a.total_attended}</td>
                <td className="px-4 py-3 text-center font-mono">{a.badge_scans_total}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{a.session_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!attendees || attendees.length === 0) && <div className="text-xs text-text-muted text-center py-8">No attendance data yet.</div>}
      </div>
    </div>
  )
}
