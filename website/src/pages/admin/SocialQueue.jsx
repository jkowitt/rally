import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function SocialQueue() {
  const { profile, realIsDeveloper } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  const canAccess = realIsDeveloper || profile?.role === 'businessops' || profile?.role === 'admin'

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('automation_social_posts')
      .select('*')
      .in('status', ['draft', 'scheduled', 'paused'])
      .order('scheduled_for', { ascending: true })
    setPosts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Auth gate AFTER hooks (rules-of-hooks).
  if (profile && !canAccess) return <Navigate to="/app" replace />

  async function publish(id) {
    await supabase.from('automation_social_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
    }).eq('id', id)
    toast({ title: 'Marked as published', type: 'success' })
    load()
  }

  async function approvePost(id) {
    await supabase.from('automation_social_posts').update({ approved_by_founder: true, status: 'scheduled' }).eq('id', id)
    load()
  }

  async function saveEdit() {
    if (!editing) return
    await supabase.from('automation_social_posts').update({
      content: editing.content,
      founder_edited: true,
    }).eq('id', editing.id)
    setEditing(null)
    toast({ title: 'Saved', type: 'success' })
    load()
  }

  async function deletePost(id) {
    if (!confirm('Delete this post?')) return
    await supabase.from('automation_social_posts').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Social Queue</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">{posts.length} posts queued. Approve, edit, reschedule, or publish.</p>
      </div>

      <div className="space-y-2">
        {loading && <div className="text-center text-text-muted text-sm py-6">Loading...</div>}
        {!loading && posts.length === 0 && (
          <div className="text-center text-text-muted text-sm py-12">No posts in queue. Automation generates 7 posts per week when enabled.</div>
        )}
        {posts.map(post => (
          <div key={post.id} className="bg-bg-surface border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase bg-bg-card px-1.5 py-0.5 rounded text-text-muted">{post.platform}</span>
                <span className="text-[9px] font-mono uppercase bg-bg-card px-1.5 py-0.5 rounded text-text-muted">{post.post_type}</span>
                <span className="text-[9px] text-text-muted">{post.scheduled_for ? new Date(post.scheduled_for).toLocaleString() : 'No schedule'}</span>
                {post.approved_by_founder && <span className="text-[9px] bg-success/15 text-success px-1.5 py-0.5 rounded">APPROVED</span>}
                {post.founder_edited && <span className="text-[9px] bg-accent/15 text-accent px-1.5 py-0.5 rounded">EDITED</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(post)} className="text-[10px] text-accent hover:underline">Edit</button>
                <button onClick={() => approvePost(post.id)} className="text-[10px] text-success hover:underline">Approve</button>
                <button onClick={() => publish(post.id)} className="text-[10px] text-accent hover:underline">Mark Published</button>
                <button onClick={() => deletePost(post.id)} className="text-[10px] text-danger hover:underline">Delete</button>
              </div>
            </div>
            {editing?.id === post.id ? (
              <div className="space-y-2">
                <textarea
                  value={editing.content || ''}
                  onChange={e => setEditing({ ...editing, content: e.target.value })}
                  rows={5}
                  className="w-full bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary"
                />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium">Save</button>
                  <button onClick={() => setEditing(null)} className="text-xs text-text-muted">Cancel</button>
                </div>
              </div>
            ) : (
              <pre className="text-xs text-text-secondary whitespace-pre-wrap bg-bg-card rounded p-3">{post.content}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
