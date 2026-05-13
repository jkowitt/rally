import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { humanError } from '@/lib/humanError'

export default function TeamManager() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteLink, setInviteLink] = useState('')
  const [showGoals, setShowGoals] = useState(null)

  // Fetch pending invitations
  const { data: pendingInvites } = useQuery({
    queryKey: ['pending-invites', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('invitations').select('*').eq('property_id', propertyId).eq('accepted', false).order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!propertyId,
  })

  // Fetch team
  const { data: team } = useQuery({
    queryKey: ['team', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('teams').select('*').eq('property_id', propertyId).limit(1)
      return data?.[0] || null
    },
    enabled: !!propertyId,
  })

  // Fetch team members
  const { data: members } = useQuery({
    queryKey: ['team-members', team?.id],
    queryFn: async () => {
      const { data } = await supabase.from('team_members').select('*, profiles:user_id(id, full_name, email, role)').eq('team_id', team.id).order('role')
      return data || []
    },
    enabled: !!team?.id,
  })

  // Fetch member activity stats
  const { data: memberStats } = useQuery({
    queryKey: ['member-stats', propertyId],
    queryFn: async () => {
      const { data: deals } = await supabase.from('deals').select('id, brand_name, value, stage, created_by').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(1000)
      const { data: activities } = await supabase.from('activities').select('id, created_by, activity_type').eq('property_id', propertyId).order('occurred_at', { ascending: false }).limit(1000)
      return { deals: deals || [], activities: activities || [] }
    },
    enabled: !!propertyId,
  })

  // Create team if doesn't exist
  const createTeamMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('teams').insert({
        name: profile?.properties?.name || 'My Team',
        property_id: propertyId,
        type: 'property',
        created_by: profile?.id,
      }).select().single()
      if (error) throw error
      // Add self as owner
      await supabase.from('team_members').insert({
        team_id: data.id,
        user_id: profile?.id,
        role: 'owner',
        invited_by: profile?.id,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast({ title: 'Team created', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: humanError(err), type: 'error' }),
  })

  // Invite member — creates invitation record + optionally adds existing user
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteEmail.trim()) throw new Error('Email is required')

      // 1. Create invitation record with unique token
      const { data: invitation, error: invErr } = await supabase.from('invitations').insert({
        property_id: propertyId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: profile?.id,
      }).select().single()
      if (invErr) throw invErr

      // 2. Check if user already exists — if so, add them directly
      const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', inviteEmail.trim().toLowerCase()).single()
      if (existingUser) {
        // User exists — add to team + update property
        await supabase.from('profiles').update({ property_id: propertyId }).eq('id', existingUser.id)
        if (team) {
          await supabase.from('team_members').insert({
            team_id: team.id,
            user_id: existingUser.id,
            role: inviteRole === 'admin' ? 'admin' : 'member',
            invited_by: profile?.id,
          })
        }
        await supabase.from('invitations').update({ accepted: true, accepted_at: new Date().toISOString() }).eq('id', invitation.id)
      }

      // 3. Try to send invite email
      let emailSent = true
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: inviteEmail.trim(),
            subject: `${profile?.full_name || 'Your teammate'} invited you to ${profile?.properties?.name || 'their team'} on Loud CRM`,
            body: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
              <div style="background:#080A0F;padding:24px;text-align:center;">
                <h1 style="color:#E8B84B;font-family:monospace;font-size:20px;margin:0;">LOUD LEGACY</h1>
              </div>
              <div style="padding:32px 24px;background:#0F1218;color:#F0F2F8;">
                <h2 style="margin:0 0 16px;">You've been invited!</h2>
                <p style="color:#8B92A8;line-height:1.6;"><strong style="color:#F0F2F8;">${profile?.full_name || 'A teammate'}</strong> has invited you to join <strong style="color:#E8B84B;">${profile?.properties?.name || 'their team'}</strong> as a <strong>${inviteRole}</strong>.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${window.location.origin}/login?invite=${invitation.token}" style="background:#E8B84B;color:#080A0F;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">Accept Invitation</a>
                </div>
                <p style="color:#555D75;font-size:12px;">This invitation expires in 7 days.</p>
              </div>
            </div>`,
          },
        })
      } catch {
        emailSent = false
      }

      return { invitation, existingUser: !!existingUser, emailSent }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      if (result.existingUser) {
        toast({ title: 'User added to team', description: `${inviteEmail} was already registered and has been added`, type: 'success' })
      } else if (result.emailSent) {
        toast({ title: 'Invitation emailed', description: `Invite sent to ${inviteEmail}`, type: 'success' })
      } else {
        toast({ title: 'Invite created', description: 'Email not configured — share the invite link manually', type: 'warning' })
      }
      setShowInvite(false)
      setInviteEmail('')
      setInviteLink('')
    },
    onError: (err) => toast({ title: 'Invite failed', description: humanError(err), type: 'error' }),
  })

  // Update member role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }) => {
      await supabase.from('team_members').update({ role }).eq('id', memberId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast({ title: 'Role updated', type: 'success' })
    },
  })

  // Update goals
  const updateGoalsMutation = useMutation({
    mutationFn: async ({ memberId, new_business_goal, renewal_goal }) => {
      await supabase.from('team_members').update({ new_business_goal, renewal_goal }).eq('id', memberId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast({ title: 'Goals updated', type: 'success' })
      setShowGoals(null)
    },
  })

  // Remove member
  const removeMutation = useMutation({
    mutationFn: async (memberId) => {
      await supabase.from('team_members').delete().eq('id', memberId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast({ title: 'Member removed', type: 'success' })
    },
  })

  const isAdmin = profile?.role === 'developer' || members?.some(m => m.user_id === profile?.id && ['owner', 'admin'].includes(m.role))
  const roleColors = { owner: 'text-accent', admin: 'text-warning', member: 'text-text-secondary' }

  function getMemberDeals(userId) {
    return (memberStats?.deals || []).filter(d => d.created_by === userId)
  }

  function getMemberActivities(userId) {
    return (memberStats?.activities || []).filter(a => a.created_by === userId)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Team</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            {team ? `${members?.length || 0} members` : 'Set up your team'}
          </p>
        </div>
        {isAdmin && team && (
          <button
            onClick={() => setShowInvite(true)}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          >
            + Invite Member
          </button>
        )}
      </div>

      {/* Team Invite Link — shareable by admin */}
      {isAdmin && team && profile?.properties?.team_invite_token && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">Team Invite Link</h3>
            <span className="text-[10px] text-text-muted">Anyone with this link can join your team</span>
          </div>
          <div className="flex gap-2">
            <input
              value={`${window.location.origin}/login?team=${profile.properties.team_invite_token}`}
              readOnly
              className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary font-mono focus:outline-none"
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/login?team=${profile.properties.team_invite_token}`)
                toast({ title: 'Team link copied!', type: 'success' })
              }}
              className="bg-accent text-bg-primary px-4 py-2 rounded text-xs font-medium hover:opacity-90 shrink-0"
            >
              Copy
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-text-muted">New members join as:</span>
            <select
              value={profile.properties.team_invite_role || 'rep'}
              onChange={async (e) => {
                await supabase.from('properties').update({ team_invite_role: e.target.value }).eq('id', propertyId)
                toast({ title: `Default role set to ${e.target.value}`, type: 'success' })
              }}
              className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="rep">Rep</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={async () => {
                if (!confirm('Reset the team invite link? The old link will stop working.')) return
                const newToken = crypto.randomUUID()
                await supabase.from('properties').update({ team_invite_token: newToken }).eq('id', propertyId)
                toast({ title: 'Link reset — old link is now invalid', type: 'success' })
                window.location.reload()
              }}
              className="text-[10px] text-text-muted hover:text-danger transition-colors"
            >
              Reset link
            </button>
          </div>
        </div>
      )}

      {/* No team yet */}
      {!team && (
        <div className="bg-bg-surface border border-border rounded-lg p-8 sm:p-12 text-center">
          <div className="text-3xl mb-3">👥</div>
          <p className="text-text-secondary text-sm mb-1">No team set up yet</p>
          <p className="text-text-muted text-xs mb-4">Create a team to invite members, set goals, and track performance</p>
          <button
            onClick={() => createTeamMutation.mutate()}
            disabled={createTeamMutation.isPending}
            className="bg-accent text-bg-primary px-5 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      )}

      {/* Team members */}
      {team && (
        <div className="space-y-3">
          {members?.map(member => {
            const user = member.profiles
            const deals = getMemberDeals(member.user_id)
            const activities = getMemberActivities(member.user_id)
            const wonDeals = deals.filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage))
            const totalRevenue = wonDeals.reduce((s, d) => s + (Number(d.value) || 0), 0)
            const newBizGoal = member.new_business_goal || 0
            const renewalGoal = member.renewal_goal || 0

            return (
              <div key={member.id} className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary">{user?.full_name || user?.email || 'Unknown'}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-card ${roleColors[member.role] || 'text-text-muted'}`}>
                        {member.role}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{user?.email}</div>

                    {/* Stats */}
                    <div className="flex gap-4 mt-2 text-xs font-mono flex-wrap">
                      <span className="text-text-secondary">{deals.length} deals</span>
                      <span className="text-success">{wonDeals.length} won</span>
                      <span className="text-accent">${(totalRevenue / 1000).toFixed(0)}K revenue</span>
                      <span className="text-text-muted">{activities.length} activities</span>
                    </div>

                    {/* Goals progress */}
                    {(newBizGoal > 0 || renewalGoal > 0) && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {newBizGoal > 0 && (
                          <div>
                            <div className="flex justify-between text-[10px] text-text-muted font-mono mb-0.5">
                              <span>New Biz</span>
                              <span>${(totalRevenue / 1000).toFixed(0)}K / ${(newBizGoal / 1000).toFixed(0)}K</span>
                            </div>
                            <div className="w-full bg-bg-card rounded-full h-1.5">
                              <div className="bg-accent rounded-full h-1.5 transition-all" style={{ width: `${Math.min(100, (totalRevenue / newBizGoal) * 100)}%` }} />
                            </div>
                          </div>
                        )}
                        {renewalGoal > 0 && (
                          <div>
                            <div className="flex justify-between text-[10px] text-text-muted font-mono mb-0.5">
                              <span>Renewals</span>
                              <span>$0K / ${(renewalGoal / 1000).toFixed(0)}K</span>
                            </div>
                            <div className="w-full bg-bg-card rounded-full h-1.5">
                              <div className="bg-success rounded-full h-1.5" style={{ width: '0%' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Admin actions */}
                  {isAdmin && member.role !== 'owner' && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <select
                        value={member.role}
                        onChange={(e) => updateRoleMutation.mutate({ memberId: member.id, role: e.target.value })}
                        className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => setShowGoals(showGoals === member.id ? null : member.id)}
                        className="text-[10px] text-accent hover:underline"
                      >
                        Set Goals
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remove ${user?.full_name}?`)) removeMutation.mutate(member.id) }}
                        className="text-[10px] text-text-muted hover:text-danger"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Goals editor */}
                {showGoals === member.id && (
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-text-muted">New Business Goal ($)</label>
                      <input
                        type="number"
                        defaultValue={member.new_business_goal || ''}
                        id={`goal-new-${member.id}`}
                        className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted">Renewal Goal ($)</label>
                      <input
                        type="number"
                        defaultValue={member.renewal_goal || ''}
                        id={`goal-renewal-${member.id}`}
                        className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newBiz = Number(document.getElementById(`goal-new-${member.id}`).value) || 0
                        const renewal = Number(document.getElementById(`goal-renewal-${member.id}`).value) || 0
                        updateGoalsMutation.mutate({ memberId: member.id, new_business_goal: newBiz, renewal_goal: renewal })
                      }}
                      className="col-span-2 bg-accent text-bg-primary py-1.5 rounded text-xs font-medium hover:opacity-90"
                    >
                      Save Goals
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pending Invitations */}
      {team && pendingInvites?.length > 0 && (
        <div>
          <h2 className="text-sm font-mono text-text-muted uppercase tracking-wider mb-2">Pending Invitations</h2>
          <div className="space-y-2">
            {pendingInvites.map(inv => (
              <div key={inv.id} className="bg-bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-text-primary">{inv.email}</span>
                  <span className="text-[10px] text-text-muted ml-2 font-mono">{inv.role}</span>
                  <span className="text-[10px] text-text-muted ml-2">{new Date(inv.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/login?invite=${inv.token}`
                      navigator.clipboard.writeText(link)
                      toast({ title: 'Invite link copied!', type: 'success' })
                    }}
                    className="text-[10px] text-accent hover:underline"
                  >
                    Copy Link
                  </button>
                  <span className="text-[10px] font-mono text-warning">Pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Invite Team Member</h3>
              <button onClick={() => { setShowInvite(false); setInviteLink('') }} className="text-text-muted hover:text-text-primary">&times;</button>
            </div>

            {inviteLink ? (
              /* Show invite link after creation */
              <div className="space-y-3">
                <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-center">
                  <div className="text-success text-sm font-medium mb-1">Invitation Created!</div>
                  <p className="text-xs text-text-secondary">Share this link with your teammate</p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={inviteLink}
                    readOnly
                    className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary font-mono focus:outline-none"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink)
                      toast({ title: 'Link copied!', type: 'success' })
                    }}
                    className="bg-accent text-bg-primary px-4 py-2 rounded text-xs font-medium hover:opacity-90 shrink-0"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-text-muted text-center">
                  When they open this link, they'll create an account and automatically join your team as a {inviteRole}.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setInviteLink(''); setInviteEmail('') }}
                    className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90"
                  >
                    Invite Another
                  </button>
                  <button onClick={() => { setShowInvite(false); setInviteLink('') }} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm">Done</button>
                </div>
              </div>
            ) : (
              /* Invite form */
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted">Email Address</label>
                  <input
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent mt-1"
                  >
                    <option value="rep">Member — can manage their own deals and contacts</option>
                    <option value="admin">Admin — can manage the team, settings, and all deals</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={async () => {
                      const result = await inviteMutation.mutateAsync()
                      if (result?.invitation?.token) {
                        setInviteLink(`${window.location.origin}/login?invite=${result.invitation.token}`)
                      }
                    }}
                    disabled={!inviteEmail.trim() || inviteMutation.isPending}
                    className="flex-1 bg-accent text-bg-primary py-2.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {inviteMutation.isPending ? 'Creating...' : 'Send Invitation'}
                  </button>
                  <button onClick={() => { setShowInvite(false); setInviteLink('') }} className="flex-1 bg-bg-card text-text-secondary py-2.5 rounded text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
