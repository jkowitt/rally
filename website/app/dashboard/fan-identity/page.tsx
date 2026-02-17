"use client";

import { useState, useEffect } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyFanProfile, rallyShareCards, FanProfile, FanMilestone } from "@/lib/rally-api";

const VERIFIED_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  ROOKIE: { label: "Rookie", icon: "🌱", color: "#8B95A5" },
  CASUAL: { label: "Casual Fan", icon: "👋", color: "#2D9CDB" },
  DEDICATED: { label: "Dedicated", icon: "💪", color: "#FF6B35" },
  SUPERFAN: { label: "Superfan", icon: "⭐", color: "#FFD700" },
  LEGEND: { label: "Legend", icon: "🌟", color: "#FF4500" },
};

export default function FanIdentityPage() {
  const { user } = useRallyAuth();
  const [profile, setProfile] = useState<FanProfile | null>(null);
  const [milestones, setMilestones] = useState<FanMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTagline, setEditingTagline] = useState(false);
  const [tagline, setTagline] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingResume, setGeneratingResume] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const [profileRes, milestonesRes] = await Promise.all([
      rallyFanProfile.me(),
      rallyShareCards.myMilestones(),
    ]);
    if (profileRes.ok && profileRes.data) {
      setProfile(profileRes.data);
      setTagline(profileRes.data.tagline || "");
    }
    if (milestonesRes.ok && milestonesRes.data) {
      setMilestones(milestonesRes.data.milestones);
    }
    setLoading(false);
  }

  async function handleSaveTagline() {
    setSaving(true);
    const res = await rallyFanProfile.update({ tagline });
    if (res.ok && res.data) {
      setProfile(res.data);
      setEditingTagline(false);
    }
    setSaving(false);
  }

  async function handleRefreshStats() {
    setRefreshing(true);
    const res = await rallyFanProfile.refresh();
    if (res.ok && res.data) {
      setProfile(res.data);
      // Reload milestones too
      const milestonesRes = await rallyShareCards.myMilestones();
      if (milestonesRes.ok && milestonesRes.data) {
        setMilestones(milestonesRes.data.milestones);
      }
    }
    setRefreshing(false);
  }

  async function handleGenerateResume() {
    setGeneratingResume(true);
    const res = await rallyShareCards.createFanResume();
    if (res.ok && res.data) {
      alert(`Fan Resume card created! Share ID: ${res.data.id}`);
    }
    setGeneratingResume(false);
  }

  const verified = VERIFIED_LABELS[profile?.verifiedLevel || "ROOKIE"];
  const predictionPct = profile && profile.totalPredictions > 0
    ? Math.round((profile.correctPredictions / profile.totalPredictions) * 100)
    : null;
  const triviaPct = profile && profile.totalTrivia > 0
    ? Math.round((profile.correctTrivia / profile.totalTrivia) * 100)
    : null;

  if (loading) {
    return (
      <div className="rally-dash-page">
        <div className="rally-dash-welcome"><h1>Fan Identity</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>Loading your fan identity...</div>
      </div>
    );
  }

  return (
    <div className="rally-dash-page">
      <div className="rally-dash-welcome">
        <h1>Fan Identity</h1>
        <p className="rally-dash-subtitle">Your verified fan resume — who you are as a fan</p>
      </div>

      {/* Verified Level Banner */}
      <div className="rally-social-card" style={{ background: `linear-gradient(135deg, ${verified.color}22, ${verified.color}11)`, border: `1px solid ${verified.color}44` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "48px" }}>{verified.icon}</div>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: verified.color, fontWeight: 700 }}>Verified Fan Level</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#fff" }}>{verified.label}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
              {profile?.eventsAttended || 0} events &middot; {profile?.currentStreak || 0} streak &middot; {user?.tier || "Bronze"} tier
            </div>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div className="rally-social-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>Fan Tagline</h3>
          {!editingTagline && (
            <button className="rally-social-btn-sm" onClick={() => setEditingTagline(true)}>Edit</button>
          )}
        </div>
        {editingTagline ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Die-hard since day one..."
              maxLength={80}
              style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px" }}
            />
            <button className="rally-social-btn-sm rally-social-btn-primary" onClick={handleSaveTagline} disabled={saving}>
              {saving ? "..." : "Save"}
            </button>
            <button className="rally-social-btn-sm" onClick={() => { setEditingTagline(false); setTagline(profile?.tagline || ""); }}>Cancel</button>
          </div>
        ) : (
          <p style={{ color: "#fff", fontSize: "16px", fontStyle: profile?.tagline ? "normal" : "italic" }}>
            {profile?.tagline || "No tagline set. Tell the world who you root for."}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="rally-social-card">
        <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>Fan Stats</h3>
        <div className="rally-social-stats-grid">
          <StatCell label="Events" value={profile?.eventsAttended || 0} />
          <StatCell label="Check-ins" value={profile?.totalCheckins || 0} />
          <StatCell label="Current Streak" value={profile?.currentStreak || 0} suffix="🔥" />
          <StatCell label="Longest Streak" value={profile?.longestStreak || 0} />
          <StatCell label="Unique Venues" value={profile?.uniqueVenues || 0} suffix="🗺️" />
          <StatCell label="Predictions" value={profile?.totalPredictions || 0} pct={predictionPct} />
          <StatCell label="Trivia" value={profile?.totalTrivia || 0} pct={triviaPct} />
          <StatCell label="Photos" value={profile?.totalPhotos || 0} />
          <StatCell label="Polls" value={profile?.totalPolls || 0} />
          <StatCell label="Noise Meter" value={profile?.totalNoiseMeter || 0} suffix="📢" />
          <StatCell label="Total Points" value={user?.points || 0} />
          <StatCell label="Tier" value={user?.tier || "Bronze"} isText />
        </div>
      </div>

      {/* Sport Breakdown */}
      {profile?.sportBreakdown && Object.keys(profile.sportBreakdown).length > 0 && (
        <div className="rally-social-card">
          <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>Sports Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(profile.sportBreakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([sport, count]) => {
                const max = Math.max(...Object.values(profile.sportBreakdown!).map(v => v as number));
                const pct = max > 0 ? ((count as number) / max) * 100 : 0;
                return (
                  <div key={sport} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ width: "90px", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{sport}</span>
                    <div style={{ flex: 1, height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.08)" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: "4px", background: "var(--rally-orange)", transition: "width 0.3s" }} />
                    </div>
                    <span style={{ width: "30px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "#fff" }}>{count as number}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Milestones / Badges */}
      <div className="rally-social-card">
        <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
          Badges & Milestones ({milestones.length})
        </h3>
        {milestones.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
            No badges yet. Check in to events to start earning milestones.
          </p>
        ) : (
          <div className="rally-social-badges-grid">
            {milestones.map((m) => (
              <div key={m.id} className="rally-social-badge">
                <div className="rally-social-badge-icon">{m.icon}</div>
                <div className="rally-social-badge-title">{m.title}</div>
                <div className="rally-social-badge-stat">{m.stat}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          className="rally-btn rally-btn--primary"
          onClick={handleGenerateResume}
          disabled={generatingResume}
          style={{ flex: 1, minWidth: "160px" }}
        >
          {generatingResume ? "Generating..." : "Generate Fan Resume Card"}
        </button>
        <button
          className="rally-btn rally-btn--secondary"
          onClick={handleRefreshStats}
          disabled={refreshing}
          style={{ flex: 1, minWidth: "160px" }}
        >
          {refreshing ? "Refreshing..." : "Refresh Stats"}
        </button>
      </div>
    </div>
  );
}

function StatCell({ label, value, suffix, pct, isText }: { label: string; value: number | string; suffix?: string; pct?: number | null; isText?: boolean }) {
  return (
    <div className="rally-social-stat-cell">
      <div className="rally-social-stat-value">
        {isText ? value : typeof value === "number" ? value.toLocaleString() : value}
        {suffix && <span style={{ marginLeft: "4px" }}>{suffix}</span>}
      </div>
      <div className="rally-social-stat-label">{label}</div>
      {pct !== undefined && pct !== null && (
        <div style={{ fontSize: "11px", color: pct >= 70 ? "#34C759" : "rgba(255,255,255,0.4)" }}>{pct}% accuracy</div>
      )}
    </div>
  );
}
