"use client";

import { useState, useEffect } from "react";
import { rallyRewards } from "@/lib/rally-api";
import type { Reward } from "@/lib/rally-api";
import { useRallyAuth } from "@/lib/rally-auth";

export default function AdminRewardsPage() {
  const { user } = useRallyAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [pointsCost, setPointsCost] = useState(100);
  const [description, setDescription] = useState("");

  const schoolId = user?.favoriteSchool || user?.schoolId || "rally-university";

  useEffect(() => {
    if (schoolId) loadRewards();
  }, [schoolId]);

  const loadRewards = async () => {
    setLoading(true);
    const res = await rallyRewards.list(schoolId);
    if (res.ok && res.data) {
      setRewards(res.data.rewards);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setPointsCost(100);
    setDescription("");
    setError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setShowCreate(true);
  };

  const openEdit = (reward: Reward) => {
    setName(reward.name);
    setPointsCost(reward.pointsCost);
    setDescription(reward.description);
    setEditingId(reward.id);
    setShowCreate(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!name) { setError("Reward name is required"); return; }
    if (pointsCost <= 0) { setError("Points cost must be greater than 0"); return; }

    setSaving(true);
    setError(null);

    const res = editingId
      ? await rallyRewards.update(schoolId, editingId, { name, pointsCost, description })
      : await rallyRewards.create(schoolId, { name, pointsCost, description });

    if (res.ok) {
      setShowCreate(false);
      resetForm();
      await loadRewards();
    } else {
      setError(res.error || "Failed to save reward");
    }
    setSaving(false);
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm("Delete this reward?")) return;
    await rallyRewards.delete(schoolId, rewardId);
    await loadRewards();
  };

  const tierForPoints = (pts: number) => {
    if (pts >= 5000) return { name: "Platinum", color: "#A78BFA" };
    if (pts >= 2000) return { name: "Gold", color: "#F59E0B" };
    if (pts >= 500) return { name: "Silver", color: "#94A3B8" };
    return { name: "Bronze", color: "#D97706" };
  };

  return (
    <div className="rally-admin-page">
      <div className="rally-admin-section">
        <div className="rally-admin-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3>Rewards ({rewards.length})</h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
              Manage rewards for {schoolId === "rally-university" ? "Rally University" : schoolId}
            </p>
          </div>
          <button className="rally-btn rally-btn--primary" onClick={openCreate} style={{ padding: "8px 20px", fontSize: "13px" }}>
            + Create Reward
          </button>
        </div>

        {/* Create / Edit Form */}
        {showCreate && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 16px", color: "#FF6B35" }}>{editingId ? "Edit Reward" : "Create Reward"}</h4>
            {error && <div style={{ padding: "8px 12px", marginBottom: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "13px" }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={labelStyle}>Reward Name *</label>
                <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Free Rally T-Shirt" />
              </div>
              <div>
                <label style={labelStyle}>Points Cost *</label>
                <input style={{ ...inputStyle, textAlign: "right" }} type="number" min="1" value={pointsCost} onChange={(e) => setPointsCost(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does the fan get? Any conditions?" />
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowCreate(false); resetForm(); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rally-btn rally-btn--primary" style={{ padding: "8px 20px", fontSize: "13px" }}>
                {saving ? "Saving..." : editingId ? "Update Reward" : "Create Reward"}
              </button>
            </div>
          </div>
        )}

        {/* Rewards List */}
        {loading ? (
          <div className="rally-admin-loading">Loading rewards...</div>
        ) : rewards.length === 0 ? (
          <p className="rally-admin-empty">No rewards yet. Create your first reward to motivate fans.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {rewards.sort((a, b) => a.pointsCost - b.pointsCost).map((reward) => {
              const tier = tierForPoints(reward.pointsCost);
              return (
                <div key={reward.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600, color: "#F5F7FA", fontSize: "15px" }}>{reward.name}</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px", background: `${tier.color}22`, color: tier.color, whiteSpace: "nowrap" }}>
                      {tier.name}
                    </span>
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#FF6B35", marginBottom: "4px" }}>
                    {reward.pointsCost.toLocaleString()} <span style={{ fontSize: "12px", fontWeight: 500 }}>pts</span>
                  </div>
                  {reward.description && (
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: "0 0 12px", flex: 1 }}>{reward.description}</p>
                  )}
                  <div style={{ display: "flex", gap: "6px", marginTop: "auto" }}>
                    <button onClick={() => openEdit(reward)} style={smallBtnStyle}>Edit</button>
                    <button onClick={() => handleDelete(reward.id)} style={{ ...smallBtnStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "4px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#F5F7FA", fontSize: "13px", outline: "none" };
const smallBtnStyle: React.CSSProperties = { padding: "4px 10px", fontSize: "11px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "rgba(255,255,255,0.6)", cursor: "pointer" };
