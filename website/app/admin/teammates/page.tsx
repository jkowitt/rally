"use client";

import { useState, useEffect, useCallback } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyTeammates, type RallyUser, type TeammateInvitation, type TeammatePermissions } from "@/lib/rally-api";

const PERMISSION_LABELS: Record<keyof TeammatePermissions, string> = {
  events: "Events",
  engagements: "Live Engagements",
  rewards: "Rewards",
  redemptions: "Redemptions",
  notifications: "Notifications",
  bonusOffers: "Bonus Offers",
  content: "Content",
  analytics: "Analytics",
};

const DEFAULT_PERMISSIONS: TeammatePermissions = {
  events: false,
  engagements: false,
  rewards: false,
  redemptions: false,
  notifications: false,
  bonusOffers: false,
  content: false,
  analytics: false,
};

export default function TeammatesPage() {
  const { user } = useRallyAuth();
  const [teammates, setTeammates] = useState<RallyUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeammateInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePerms, setInvitePerms] = useState<TeammatePermissions>({ ...DEFAULT_PERMISSIONS });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<TeammatePermissions>({ ...DEFAULT_PERMISSIONS });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTeammates = useCallback(async () => {
    setLoading(true);
    const res = await rallyTeammates.list();
    if (res.ok && res.data) {
      setTeammates(res.data.teammates || []);
      setPendingInvitations(res.data.pendingInvitations || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTeammates(); }, [loadTeammates]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { setError("Email is required"); return; }
    setError("");
    const res = await rallyTeammates.invite(inviteEmail.trim(), inviteName.trim() || undefined, invitePerms);
    if (res.ok) {
      setMessage(res.data?.converted ? `${inviteEmail} converted to teammate!` : `Invitation sent to ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePerms({ ...DEFAULT_PERMISSIONS });
      loadTeammates();
    } else {
      setError(res.error || "Failed to send invitation");
    }
  };

  const handleUpdatePermissions = async (teammateId: string) => {
    const res = await rallyTeammates.updatePermissions(teammateId, editPerms);
    if (res.ok) {
      setMessage("Permissions updated");
      setEditingId(null);
      loadTeammates();
    } else {
      setError(res.error || "Failed to update permissions");
    }
  };

  const handleRemove = async (teammateId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team? They will be reverted to a regular user.`)) return;
    const res = await rallyTeammates.remove(teammateId);
    if (res.ok) {
      setMessage(`${name} removed from the team`);
      loadTeammates();
    } else {
      setError(res.error || "Failed to remove teammate");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const res = await rallyTeammates.cancelInvitation(invitationId);
    if (res.ok) {
      setMessage("Invitation cancelled");
      loadTeammates();
    }
  };

  const startEdit = (tm: RallyUser) => {
    setEditingId(tm.id);
    setEditPerms(tm.teammatePermissions || { ...DEFAULT_PERMISSIONS });
  };

  if (loading) {
    return <div className="admin-loading"><div className="rally-spinner" /> Loading teammates...</div>;
  }

  return (
    <div className="admin-page">
      {message && (
        <div className="admin-alert admin-alert--success" onClick={() => setMessage("")}>
          {message}
        </div>
      )}
      {error && (
        <div className="admin-alert admin-alert--error" onClick={() => setError("")}>
          {error}
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h2>Team Members</h2>
          <p className="admin-subtitle">
            Invite teammates to help manage your property. Control which features they can access.
          </p>
        </div>
        <button className="rally-btn rally-btn--primary" onClick={() => setShowInvite(true)}>
          Invite Teammate
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="admin-card" style={{ marginBottom: "1.5rem", border: "2px solid var(--rally-primary)" }}>
          <h3>Invite a Teammate</h3>
          <p className="admin-subtitle" style={{ marginBottom: "1rem" }}>
            Enter their email. If they already have a Rally account, they will be converted to a teammate.
            Otherwise, they will receive an invitation to register.
          </p>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Email *</label>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@example.com" />
            </div>
            <div className="admin-form-group">
              <label>Name (optional)</label>
              <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full Name" />
            </div>
          </div>

          <h4 style={{ margin: "1rem 0 0.5rem" }}>Permissions</h4>
          <div className="admin-permissions-grid">
            {(Object.keys(PERMISSION_LABELS) as Array<keyof TeammatePermissions>).map((key) => (
              <label key={key} className="admin-permission-toggle">
                <input
                  type="checkbox"
                  checked={invitePerms[key]}
                  onChange={(e) => setInvitePerms({ ...invitePerms, [key]: e.target.checked })}
                />
                <span>{PERMISSION_LABELS[key]}</span>
              </label>
            ))}
          </div>

          <div className="admin-form-actions" style={{ marginTop: "1rem" }}>
            <button className="rally-btn rally-btn--primary" onClick={handleInvite}>Send Invitation</button>
            <button className="rally-btn rally-btn--secondary" onClick={() => setShowInvite(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Active Teammates */}
      <div className="admin-card">
        <h3>Active Teammates ({teammates.length})</h3>
        {teammates.length === 0 ? (
          <p className="admin-empty">No teammates yet. Invite someone to get started.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Permissions</th>
                  <th>Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teammates.map((tm) => (
                  <tr key={tm.id}>
                    <td>
                      <strong>{tm.name}</strong>
                      <br /><small style={{ opacity: 0.6 }}>{tm.handle}</small>
                    </td>
                    <td>{tm.email}</td>
                    <td>
                      {editingId === tm.id ? (
                        <div className="admin-permissions-grid admin-permissions-grid--compact">
                          {(Object.keys(PERMISSION_LABELS) as Array<keyof TeammatePermissions>).map((key) => (
                            <label key={key} className="admin-permission-toggle">
                              <input
                                type="checkbox"
                                checked={editPerms[key]}
                                onChange={(e) => setEditPerms({ ...editPerms, [key]: e.target.checked })}
                              />
                              <span>{PERMISSION_LABELS[key]}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="admin-permission-pills">
                          {Object.entries(tm.teammatePermissions || {})
                            .filter(([, v]) => v)
                            .map(([k]) => (
                              <span key={k} className="admin-pill admin-pill--active">
                                {PERMISSION_LABELS[k as keyof TeammatePermissions] || k}
                              </span>
                            ))}
                          {Object.values(tm.teammatePermissions || {}).every((v) => !v) && (
                            <span className="admin-pill admin-pill--none">No access</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge ${tm.emailVerified ? "admin-badge--success" : "admin-badge--warning"}`}>
                        {tm.emailVerified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td>
                      {editingId === tm.id ? (
                        <div className="admin-actions-inline">
                          <button className="rally-btn rally-btn--primary rally-btn--small" onClick={() => handleUpdatePermissions(tm.id)}>Save</button>
                          <button className="rally-btn rally-btn--secondary rally-btn--small" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="admin-actions-inline">
                          <button className="rally-btn rally-btn--secondary rally-btn--small" onClick={() => startEdit(tm)}>Edit</button>
                          <button className="rally-btn rally-btn--danger rally-btn--small" onClick={() => handleRemove(tm.id, tm.name)}>Remove</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="admin-card" style={{ marginTop: "1.5rem" }}>
          <h3>Pending Invitations ({pendingInvitations.length})</h3>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Invited</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvitations.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.email}{inv.name && <><br /><small>{inv.name}</small></>}</td>
                    <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                    <td>
                      <button className="rally-btn rally-btn--danger rally-btn--small" onClick={() => handleCancelInvitation(inv.id)}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
