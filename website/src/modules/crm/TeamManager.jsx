import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

export default function TeamManager() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [showGoals, setShowGoals] = useState(null)

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
      const { data: deals } = await supabase.from('deals').select('id, brand_name, value, stage, created_by').eq('property_id', propertyId)
      const { data: activities } = await supabase.from('activities').select('id, created_by, activity_type').eq('property_id', propertyId)
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
    onError: (err) => toast({ title: 'Error', description: err.message, type: 'error' }),
  })

  // Invite member
  const inviteMutation = useMutation({
    mutationFn: async () => {
      // Find user by email
      const { data: user } = await supabase.from('profiles').select('id').eq('email', inviteEmail).single()
      if (!user) throw new Error('No user found with that email')
      await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: user.id,
        role: inviteRole,
        invited_by: profile?.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast({ title: 'Member invited', type: 'success' })
      setShowInvite(false)
      setInviteEmail('')
    },
    onError: (err) => toast({ title: 'Error', description: err.message, type: 'error' }),
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
    return memberStats?.deals?.filter(d => d.created_by === userId) || []
  }

  function getMemberActivities(userId) {
    return memberStats?.activities?.filter(a => a.created_by === userId) || []
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

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Invite Team Member</h3>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                autoFocus
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => inviteMutation.mutate()}
                  disabled={!inviteEmail || inviteMutation.isPending}
                  className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Inviting...' : 'Invite'}
                </button>
                <button onClick={() => setShowInvite(false)} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
