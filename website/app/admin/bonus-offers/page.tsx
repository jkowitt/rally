"use client";

import { useState, useEffect } from "react";
import { rallyBonusOffers } from "@/lib/rally-api";
import type { BonusOffer } from "@/lib/rally-api";
import { useRallyAuth } from "@/lib/rally-auth";

const ACTIVATION_TYPES = [
  { value: "", label: "All Activities" },
  { value: "checkin", label: "Check-In" },
  { value: "trivia", label: "Trivia" },
  { value: "prediction", label: "Prediction" },
  { value: "noise_meter", label: "Noise Meter" },
  { value: "photo", label: "Photo Challenge" },
  { value: "poll", label: "Poll" },
];

export default function AdminBonusOffersPage() {
  const { user } = useRallyAuth();
  const [offers, setOffers] = useState<BonusOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bonusType, setBonusType] = useState<"multiplier" | "flat">("multiplier");
  const [bonusMultiplier, setBonusMultiplier] = useState(2);
  const [bonusPoints, setBonusPoints] = useState(50);
  const [activationType, setActivationType] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const schoolId = user?.favoriteSchool || "rally-university";

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    const res = await rallyBonusOffers.list(schoolId);
    if (res.ok && res.data) {
      setOffers(res.data.bonusOffers);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setBonusType("multiplier");
    setBonusMultiplier(2);
    setBonusPoints(50);
    setActivationType("");
    setStartsAt("");
    setExpiresAt("");
    setError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setShowCreate(true);
  };

  const openEdit = (offer: BonusOffer) => {
    setName(offer.name);
    setDescription(offer.description || "");
    if (offer.bonusMultiplier && offer.bonusMultiplier > 1) {
      setBonusType("multiplier");
      setBonusMultiplier(offer.bonusMultiplier);
    } else {
      setBonusType("flat");
      setBonusPoints(offer.bonusPoints || 50);
    }
    setActivationType(offer.activationType || "");
    setStartsAt(offer.startsAt ? offer.startsAt.slice(0, 16) : "");
    setExpiresAt(offer.expiresAt ? offer.expiresAt.slice(0, 16) : "");
    setEditingId(offer.id);
    setShowCreate(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!name || !expiresAt) {
      setError("Name and expiration date are required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name,
      description,
      bonusMultiplier: bonusType === "multiplier" ? bonusMultiplier : undefined,
      bonusPoints: bonusType === "flat" ? bonusPoints : undefined,
      activationType: activationType || undefined,
      startsAt: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    };

    const res = editingId
      ? await rallyBonusOffers.update(schoolId, editingId, payload)
      : await rallyBonusOffers.create(schoolId, payload);

    if (res.ok) {
      setShowCreate(false);
      resetForm();
      await loadOffers();
    } else {
      setError(res.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm("Delete this bonus offer?")) return;
    await rallyBonusOffers.delete(schoolId, offerId);
    await loadOffers();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const activeOffers = offers.filter((o) => o.isActive);
  const expiredOffers = offers.filter((o) => !o.isActive);

  return (
    <div className="rally-admin-page">
      <div className="rally-admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0 }}>Bonus Offers ({offers.length})</h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              Create limited-time bonus point multipliers and flat bonuses to drive engagement
            </p>
          </div>
          <button className="rally-btn rally-btn--primary" onClick={openCreate} style={{ padding: "8px 20px", fontSize: "13px" }}>
            + Create Bonus Offer
          </button>
        </div>

        {/* Create / Edit Form */}
        {showCreate && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 16px", color: "#FF6B35" }}>{editingId ? "Edit Bonus Offer" : "Create Bonus Offer"}</h4>
            {error && <div style={{ padding: "8px 12px", marginBottom: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "13px" }}>{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Offer Name *</label>
                  <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Double Points Weekend" />
                </div>
                <div>
                  <label style={labelStyle}>Applies To</label>
                  <select style={inputStyle} value={activationType} onChange={(e) => setActivationType(e.target.value)}>
                    {ACTIVATION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Earn double points on all check-ins this weekend!" />
              </div>

              {/* Bonus Type Toggle */}
              <div>
                <label style={labelStyle}>Bonus Type</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <button
                    onClick={() => setBonusType("multiplier")}
                    style={{
                      padding: "8px 16px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 600,
                      background: bonusType === "multiplier" ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.05)",
                      color: bonusType === "multiplier" ? "#FF6B35" : "rgba(255,255,255,0.5)",
                      border: bonusType === "multiplier" ? "1px solid rgba(255,107,53,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Multiplier (e.g. 2x)
                  </button>
                  <button
                    onClick={() => setBonusType("flat")}
                    style={{
                      padding: "8px 16px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 600,
                      background: bonusType === "flat" ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.05)",
                      color: bonusType === "flat" ? "#FF6B35" : "rgba(255,255,255,0.5)",
                      border: bonusType === "flat" ? "1px solid rgba(255,107,53,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Flat Bonus (e.g. +50pts)
                  </button>
                </div>
                {bonusType === "multiplier" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      style={{ ...inputStyle, width: "80px", textAlign: "right" }}
                      type="number"
                      min="1.5"
                      max="10"
                      step="0.5"
                      value={bonusMultiplier}
                      onChange={(e) => setBonusMultiplier(parseFloat(e.target.value) || 2)}
                    />
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>x points multiplier</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>+</span>
                    <input
                      style={{ ...inputStyle, width: "80px", textAlign: "right" }}
                      type="number"
                      min="1"
                      value={bonusPoints}
                      onChange={(e) => setBonusPoints(parseInt(e.target.value) || 50)}
                    />
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>bonus points per activity</span>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Starts At</label>
                  <input style={inputStyle} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Expires At *</label>
                  <input style={inputStyle} type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowCreate(false); resetForm(); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rally-btn rally-btn--primary" style={{ padding: "8px 20px", fontSize: "13px" }}>
                {saving ? "Saving..." : editingId ? "Update Offer" : "Create Offer"}
              </button>
            </div>
          </div>
        )}

        {/* Offers List */}
        {loading ? (
          <div className="rally-admin-loading">Loading bonus offers...</div>
        ) : offers.length === 0 ? (
          <p className="rally-admin-empty">No bonus offers yet. Create one to boost fan engagement with limited-time point multipliers.</p>
        ) : (
          <>
            {/* Active Offers */}
            {activeOffers.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#34C759", marginBottom: "8px" }}>ACTIVE ({activeOffers.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {activeOffers.map((offer) => (
                    <OfferCard key={offer.id} offer={offer} onEdit={openEdit} onDelete={handleDelete} formatDate={formatDate} />
                  ))}
                </div>
              </div>
            )}

            {/* Expired Offers */}
            {expiredOffers.length > 0 && (
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#8B95A5", marginBottom: "8px" }}>EXPIRED ({expiredOffers.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {expiredOffers.map((offer) => (
                    <OfferCard key={offer.id} offer={offer} onEdit={openEdit} onDelete={handleDelete} formatDate={formatDate} expired />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OfferCard({ offer, onEdit, onDelete, formatDate, expired }: {
  offer: BonusOffer;
  onEdit: (o: BonusOffer) => void;
  onDelete: (id: string) => void;
  formatDate: (iso: string) => string;
  expired?: boolean;
}) {
  const bonusLabel = offer.bonusMultiplier && offer.bonusMultiplier > 1
    ? `${offer.bonusMultiplier}x Points`
    : `+${offer.bonusPoints || 0} Bonus Points`;

  const actLabel = ACTIVATION_TYPES.find((t) => t.value === (offer.activationType || ""))?.label || "All Activities";

  return (
    <div style={{
      background: expired ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)",
      border: expired ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,107,53,0.15)",
      borderRadius: "10px",
      padding: "16px",
      opacity: expired ? 0.6 : 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontWeight: 600, color: "#F5F7FA", fontSize: "15px" }}>{offer.name}</span>
            <span style={{
              fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px",
              background: "rgba(255,107,53,0.15)", color: "#FF6B35",
            }}>
              {bonusLabel}
            </span>
            {!expired && (
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px", background: "rgba(52,199,89,0.2)", color: "#34C759" }}>ACTIVE</span>
            )}
          </div>
          {offer.description && (
            <p style={{ margin: "0 0 6px", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{offer.description}</p>
          )}
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
            <span>Applies to: {actLabel}</span>
            <span>Starts: {formatDate(offer.startsAt)}</span>
            <span>Expires: {formatDate(offer.expiresAt)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginLeft: "12px" }}>
          {!expired && <button onClick={() => onEdit(offer)} style={smallBtnStyle}>Edit</button>}
          <button onClick={() => onDelete(offer.id)} style={{ ...smallBtnStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "4px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#F5F7FA", fontSize: "13px", outline: "none" };
const smallBtnStyle: React.CSSProperties = { padding: "4px 10px", fontSize: "11px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "rgba(255,255,255,0.6)", cursor: "pointer" };
