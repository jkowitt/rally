"use client";

import { useState, useEffect } from "react";
import { rallyCrews, CrewData } from "@/lib/rally-api";

export default function CrewsPage() {
  const [tab, setTab] = useState<"my" | "discover" | "leaderboard">("my");
  const [myCrews, setMyCrews] = useState<Array<CrewData & { myRole: string }>>([]);
  const [publicCrews, setPublicCrews] = useState<CrewData[]>([]);
  const [leaderboard, setLeaderboard] = useState<CrewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCrewForm, setNewCrewForm] = useState({ name: "", description: "", avatarEmoji: "🏟️", color: "#FF6B35" });
  const [joining, setJoining] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<(CrewData & { members?: any[]; myRole: string | null }) | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [myRes, pubRes, lbRes] = await Promise.all([
      rallyCrews.mine(),
      rallyCrews.list(),
      rallyCrews.leaderboard(),
    ]);
    if (myRes.ok && myRes.data) setMyCrews(myRes.data.crews as any);
    if (pubRes.ok && pubRes.data) setPublicCrews(pubRes.data.crews as any);
    if (lbRes.ok && lbRes.data) setLeaderboard(lbRes.data.leaderboard);
    setLoading(false);
  }

  async function handleCreateCrew() {
    if (!newCrewForm.name.trim()) return;
    setCreating(true);
    const res = await rallyCrews.create(newCrewForm);
    if (res.ok) {
      setNewCrewForm({ name: "", description: "", avatarEmoji: "🏟️", color: "#FF6B35" });
      loadData();
    }
    setCreating(false);
  }

  async function handleJoin(slug: string) {
    setJoining(slug);
    const res = await rallyCrews.join(slug);
    if (res.ok) loadData();
    setJoining(null);
  }

  async function handleLeave(slug: string) {
    setLeaving(slug);
    const res = await rallyCrews.leave(slug);
    if (res.ok) {
      loadData();
      setSelectedCrew(null);
    }
    setLeaving(null);
  }

  async function handleViewCrew(slug: string) {
    const res = await rallyCrews.get(slug);
    if (res.ok && res.data) {
      setSelectedCrew(res.data);
    }
  }

  if (loading) {
    return (
      <div className="rally-dash-page">
        <div className="rally-dash-welcome"><h1>Crews</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>Loading crews...</div>
      </div>
    );
  }

  // Crew Detail View
  if (selectedCrew) {
    return (
      <div className="rally-dash-page">
        <button className="rally-social-btn-sm" onClick={() => setSelectedCrew(null)} style={{ marginBottom: "12px" }}>
          &larr; Back to crews
        </button>

        <div className="rally-social-card" style={{ borderLeft: `4px solid ${selectedCrew.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "40px" }}>{selectedCrew.avatarEmoji}</div>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff" }}>{selectedCrew.name}</h2>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{selectedCrew.description || "No description"}</p>
            </div>
          </div>

          <div className="rally-social-stats-grid" style={{ marginBottom: "16px" }}>
            <div className="rally-social-stat-cell">
              <div className="rally-social-stat-value">{selectedCrew.memberCount}</div>
              <div className="rally-social-stat-label">Members</div>
            </div>
            <div className="rally-social-stat-cell">
              <div className="rally-social-stat-value">{selectedCrew.totalPoints.toLocaleString()}</div>
              <div className="rally-social-stat-label">Total Points</div>
            </div>
            <div className="rally-social-stat-cell">
              <div className="rally-social-stat-value">{selectedCrew.totalCheckins}</div>
              <div className="rally-social-stat-label">Check-ins</div>
            </div>
            <div className="rally-social-stat-cell">
              <div className="rally-social-stat-value">{selectedCrew.totalEvents}</div>
              <div className="rally-social-stat-label">Events</div>
            </div>
          </div>

          {/* Actions */}
          {selectedCrew.myRole ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(255,107,53,0.15)", color: "var(--rally-orange)", fontSize: "13px", fontWeight: 600 }}>
                {selectedCrew.myRole === "CAPTAIN" ? "Captain" : selectedCrew.myRole === "LIEUTENANT" ? "Lieutenant" : "Member"}
              </span>
              {selectedCrew.myRole !== "CAPTAIN" && (
                <button
                  className="rally-btn rally-btn--secondary"
                  onClick={() => handleLeave(selectedCrew.slug)}
                  disabled={leaving === selectedCrew.slug}
                  style={{ fontSize: "13px" }}
                >
                  {leaving === selectedCrew.slug ? "Leaving..." : "Leave Crew"}
                </button>
              )}
            </div>
          ) : (
            <button className="rally-btn rally-btn--primary" onClick={() => handleJoin(selectedCrew.slug)} disabled={joining === selectedCrew.slug} style={{ width: "100%" }}>
              {joining === selectedCrew.slug ? "Joining..." : "Join This Crew"}
            </button>
          )}
        </div>

        {/* Members */}
        {selectedCrew.members && selectedCrew.members.length > 0 && (
          <div className="rally-social-card">
            <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>Members</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {selectedCrew.members.map((member: any) => (
                <div key={member.id} className="rally-social-fan-row">
                  <div className="rally-social-fan-avatar">
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#fff", fontSize: "14px" }}>
                      {member.name}
                      {member.role === "CAPTAIN" && <span style={{ marginLeft: "6px", fontSize: "12px" }}>👑</span>}
                      {member.role === "LIEUTENANT" && <span style={{ marginLeft: "6px", fontSize: "12px" }}>⚡</span>}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                      @{member.handle} &middot; {member.tier} &middot; {member.points?.toLocaleString()} pts
                    </div>
                  </div>
                  {member.profile?.currentStreak > 0 && (
                    <span style={{ fontSize: "12px", color: "var(--rally-orange)" }}>🔥 {member.profile.currentStreak}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rally-dash-page">
      <div className="rally-dash-welcome">
        <h1>Crews</h1>
        <p className="rally-dash-subtitle">Form your fan crew. Compete together. Rise together.</p>
      </div>

      {/* Tabs */}
      <div className="rally-social-tabs">
        {(["my", "discover", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            className={`rally-social-tab ${tab === t ? "rally-social-tab-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "my" ? `My Crews (${myCrews.length})` : t === "discover" ? "Discover" : "Leaderboard"}
          </button>
        ))}
      </div>

      {/* My Crews Tab */}
      {tab === "my" && (
        <>
          {myCrews.length === 0 ? (
            <div className="rally-social-card">
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", textAlign: "center" }}>
                You&apos;re not in any crews yet. Create one or join an existing crew.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {myCrews.map((crew) => (
                <button key={crew.id} className="rally-social-crew-card" onClick={() => handleViewCrew(crew.slug)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "28px" }}>{crew.avatarEmoji}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontWeight: 600, color: "#fff" }}>{crew.name}</div>
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                        {crew.memberCount} members &middot; {crew.totalPoints.toLocaleString()} pts &middot; {crew.myRole?.toLowerCase()}
                      </div>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>&rarr;</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Create Crew */}
          <div className="rally-social-card" style={{ marginTop: "16px" }}>
            <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>Create a Crew</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                value={newCrewForm.name}
                onChange={(e) => setNewCrewForm({ ...newCrewForm, name: e.target.value })}
                placeholder="Crew name"
                maxLength={40}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px" }}
              />
              <input
                value={newCrewForm.description}
                onChange={(e) => setNewCrewForm({ ...newCrewForm, description: e.target.value })}
                placeholder="Description (optional)"
                maxLength={120}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px" }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={newCrewForm.avatarEmoji}
                  onChange={(e) => setNewCrewForm({ ...newCrewForm, avatarEmoji: e.target.value })}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "18px" }}
                >
                  {["🏟️", "🏈", "🏀", "⚾", "🏒", "⚽", "🎾", "🐶", "🦅", "🐻", "🦁", "🐯", "🔥", "⚡", "💎", "👑"].map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                <input
                  type="color"
                  value={newCrewForm.color}
                  onChange={(e) => setNewCrewForm({ ...newCrewForm, color: e.target.value })}
                  style={{ width: "48px", height: "42px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", cursor: "pointer" }}
                />
              </div>
              <button
                className="rally-btn rally-btn--primary"
                onClick={handleCreateCrew}
                disabled={creating || !newCrewForm.name.trim()}
                style={{ width: "100%" }}
              >
                {creating ? "Creating..." : "Create Crew"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Discover Tab */}
      {tab === "discover" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {publicCrews.length === 0 ? (
            <div className="rally-social-card">
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", textAlign: "center" }}>No public crews found.</p>
            </div>
          ) : (
            publicCrews.map((crew: any) => (
              <div key={crew.id} className="rally-social-crew-card" style={{ cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "28px" }}>{crew.avatarEmoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#fff" }}>{crew.name}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                      {crew.memberCount} members &middot; {crew.totalPoints.toLocaleString()} pts
                    </div>
                  </div>
                  <button
                    className="rally-social-btn-sm rally-social-btn-primary"
                    onClick={() => handleJoin(crew.slug)}
                    disabled={joining === crew.slug}
                  >
                    {joining === crew.slug ? "..." : "Join"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {tab === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {leaderboard.map((crew, i) => (
            <div key={crew.id} className="rally-social-crew-card">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "28px", textAlign: "center", fontWeight: 800, fontSize: "16px", color: i < 3 ? "var(--rally-orange)" : "rgba(255,255,255,0.4)" }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: "24px" }}>{crew.avatarEmoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#fff", fontSize: "14px" }}>{crew.name}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                    {crew.memberCount} members &middot; {crew.totalCheckins} check-ins
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "var(--rally-orange)", fontSize: "15px" }}>{crew.totalPoints.toLocaleString()}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>points</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
