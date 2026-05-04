import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button, Card, EmptyState } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { MessageCircle, Send, Trash2 } from 'lucide-react'

interface Comment {
  id: string
  body: string
  author_id: string | null
  mentioned_user_ids: string[]
  created_at: string
  author?: { full_name: string | null; email: string | null } | null
}

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
}

// DealComments — threaded notes per deal with @-mentions. Mention
// suggestions surface in a dropdown when the user types @. The
// notify_mentioned_users() trigger (077) writes a notification row
// for every mentioned user.
export default function DealComments({ dealId, propertyId }: { dealId: string; propertyId: string }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const { data: team = [] } = useQuery({
    queryKey: ['team-for-mentions', propertyId],
    enabled: !!propertyId,
    queryFn: async (): Promise<TeamMember[]> => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').eq('property_id', propertyId)
      return data || []
    },
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['deal-comments', dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<Comment[]> => {
      const { data } = await supabase
        .from('deal_comments')
        .select('*, author:author_id(full_name, email)')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data || []) as Comment[]
    },
  })

  const post = useMutation({
    mutationFn: async () => {
      // Resolve @mentions: scan body for @[name] tokens and match
      // to team members by full_name or email handle.
      const mentioned: string[] = []
      const handleRegex = /@([a-zA-Z][a-zA-Z0-9._-]*)/g
      const matches = body.match(handleRegex) || []
      for (const m of matches) {
        const handle = m.slice(1).toLowerCase()
        const member = team.find(t =>
          (t.full_name || '').toLowerCase().replace(/\s+/g, '.').startsWith(handle) ||
          (t.email || '').toLowerCase().split('@')[0] === handle
        )
        if (member && !mentioned.includes(member.id)) mentioned.push(member.id)
      }
      const { error } = await supabase.from('deal_comments').insert({
        property_id: propertyId, deal_id: dealId,
        author_id: profile?.id || null,
        body: body.trim(),
        mentioned_user_ids: mentioned,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-comments', dealId] })
      setBody('')
      toast({ title: 'Comment posted', type: 'success' })
    },
    onError: (e: any) => toast({ title: 'Could not post', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deal_comments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-comments', dealId] }),
  })

  function onChange(v: string) {
    setBody(v)
    // Detect ongoing @mention typing.
    const lastAt = v.lastIndexOf('@')
    if (lastAt >= 0) {
      const after = v.slice(lastAt + 1)
      if (/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(after) && after.length > 0) {
        setMentionQuery(after.toLowerCase())
        setShowMentions(true)
        return
      }
    }
    setShowMentions(false)
  }

  function pickMention(member: TeamMember) {
    const handle = (member.full_name || '').replace(/\s+/g, '.').toLowerCase() ||
                   (member.email || '').split('@')[0].toLowerCase()
    const lastAt = body.lastIndexOf('@')
    setBody(body.slice(0, lastAt) + '@' + handle + ' ')
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const filteredTeam = mentionQuery
    ? team.filter(t =>
        (t.full_name || '').toLowerCase().includes(mentionQuery) ||
        (t.email || '').toLowerCase().includes(mentionQuery)
      ).slice(0, 5)
    : team.slice(0, 5)

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Comments</h3>
        {comments.length > 0 && <span className="text-[11px] text-text-muted">{comments.length}</span>}
      </div>

      <div className="relative">
        <textarea
          ref={inputRef}
          value={body}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add a comment… type @ to mention someone"
          rows={2}
          className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
        />
        {showMentions && filteredTeam.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
            {filteredTeam.map(t => (
              <button
                key={t.id} type="button"
                onClick={() => pickMention(t)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-card text-text-primary"
              >
                {t.full_name || t.email}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-1.5">
          <Button size="sm" disabled={!body.trim() || post.isPending} onClick={() => post.mutate()}>
            <Send className="w-3.5 h-3.5" /> {post.isPending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>

      {comments.length === 0 && (
        <EmptyState title="No comments yet" description="Discuss this deal with the team without leaving the CRM." className="border-0 py-3" />
      )}

      <ul className="space-y-2">
        {comments.map(c => (
          <li key={c.id} className="bg-bg-card border border-border rounded p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-text-primary">{c.author?.full_name || c.author?.email || 'Someone'}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-muted font-mono">{new Date(c.created_at).toLocaleString()}</span>
                {c.author_id === profile?.id && (
                  <button onClick={() => { if (confirm('Delete comment?')) remove.mutate(c.id) }} className="text-text-muted hover:text-danger p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
