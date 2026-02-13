"use client";

import { useState, useEffect } from "react";
import { rallyEvents } from "@/lib/rally-api";
import type { RallyEvent, EventActivation } from "@/lib/rally-api";
import { useRallyAuth } from "@/lib/rally-auth";

const ACTIVATION_TYPES = [
  { value: "checkin", label: "Check-In" },
  { value: "trivia", label: "Trivia" },
  { value: "prediction", label: "Prediction" },
  { value: "noise_meter", label: "Noise Meter" },
  { value: "photo", label: "Photo Challenge" },
  { value: "poll", label: "Poll" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS = ["upcoming", "live", "completed"];

interface ActivationDraft {
  type: string;
  name: string;
  points: number;
  description: string;
}

export default function AdminEventsPage() {
  const { user } = useRallyAuth();
  const [events, setEvents] = useState<RallyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("Football");
  const [homeSchoolId, setHomeSchoolId] = useState("rally-university");
  const [homeTeam, setHomeTeam] = useState("Rally University Ralliers");
  const [awayTeam, setAwayTeam] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [activations, setActivations] = useState<ActivationDraft[]>([]);

  const schoolId = user?.favoriteSchool || "rally-university";

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const res = await rallyEvents.list();
    if (res.ok && res.data) {
      setEvents(res.data.events);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setSport("Football");
    setHomeSchoolId("rally-university");
    setHomeTeam("Rally University Ralliers");
    setAwayTeam("");
    setVenue("");
    setCity("");
    setDateTime("");
    setStatus("upcoming");
    setActivations([]);
    setError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setShowCreate(true);
  };

  const openEdit = (event: RallyEvent) => {
    setTitle(event.title);
    setSport(event.sport);
    setHomeSchoolId(event.homeSchoolId);
    setHomeTeam(event.homeTeam);
    setAwayTeam(event.awayTeam || "");
    setVenue(event.venue);
    setCity(event.city);
    setDateTime(event.dateTime.slice(0, 16)); // for datetime-local input
    setStatus(event.status);
    setActivations((event.activations || []).map((a) => ({
      type: a.type,
      name: a.name,
      points: a.points,
      description: a.description,
    })));
    setEditingId(event.id);
    setShowCreate(true);
    setError(null);
  };

  const addActivation = () => {
    setActivations([...activations, { type: "custom", name: "", points: 50, description: "" }]);
  };

  const updateActivation = (index: number, field: keyof ActivationDraft, value: string | number) => {
    const updated = [...activations];
    (updated[index] as unknown as Record<string, string | number>)[field] = value;
    if (field === "type") {
      const label = ACTIVATION_TYPES.find((t) => t.value === value)?.label || "";
      if (!updated[index].name) updated[index].name = label;
    }
    setActivations(updated);
  };

  const removeActivation = (index: number) => {
    setActivations(activations.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title || !dateTime) {
      setError("Title and date/time are required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      title,
      sport,
      homeSchoolId,
      homeTeam,
      awayTeam,
      venue,
      city,
      dateTime: new Date(dateTime).toISOString(),
      status,
      activations: activations.filter((a) => a.name),
    };

    const res = editingId
      ? await rallyEvents.update(editingId, payload)
      : await rallyEvents.create(payload);

    if (res.ok) {
      setShowCreate(false);
      resetForm();
      await loadEvents();
    } else {
      setError(res.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    await rallyEvents.delete(eventId);
    await loadEvents();
  };

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    await rallyEvents.update(eventId, { status: newStatus });
    await loadEvents();
  };

  const totalPoints = activations.reduce((sum, a) => sum + (a.points || 0), 0);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="rally-admin-page">
      <div className="rally-admin-section">
        <div className="rally-admin-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>Events ({events.length})</h3>
          <button className="rally-btn rally-btn--primary" onClick={openCreate} style={{ padding: "8px 20px", fontSize: "13px" }}>
            + Create Event
          </button>
        </div>

        {/* Create / Edit Form */}
        {showCreate && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 16px", color: "#FF6B35" }}>{editingId ? "Edit Event" : "Create Event"}</h4>
            {error && <div style={{ padding: "8px 12px", marginBottom: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "13px" }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rally U vs Kent State" />
              </div>
              <div>
                <label style={labelStyle}>Sport</label>
                <select style={inputStyle} value={sport} onChange={(e) => setSport(e.target.value)}>
                  <option>Football</option><option>Basketball</option><option>Baseball</option>
                  <option>Soccer</option><option>Volleyball</option><option>Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Home Team</label>
                <input style={inputStyle} value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Away Team</label>
                <input style={inputStyle} value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} placeholder="e.g. Kent State Golden Flashes" />
              </div>
              <div>
                <label style={labelStyle}>Venue</label>
                <input style={inputStyle} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Rally Stadium" />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Rally City" />
              </div>
              <div>
                <label style={labelStyle}>Date & Time *</label>
                <input style={inputStyle} type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Activations / Earn Opportunities */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ ...labelStyle, margin: 0 }}>Earn Opportunities ({activations.length}){totalPoints > 0 && <span style={{ color: "#FF6B35", marginLeft: "8px" }}>{totalPoints} pts total</span>}</label>
                <button onClick={addActivation} style={{ background: "rgba(255,107,53,0.15)", color: "#FF6B35", border: "none", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>
                  + Add
                </button>
              </div>

              {activations.length === 0 && (
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: "8px 0" }}>No earn opportunities yet. Add check-ins, trivia, predictions, and more.</p>
              )}

              {activations.map((a, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 80px 1fr 30px", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <select style={{ ...inputStyle, padding: "6px 8px", fontSize: "12px" }} value={a.type} onChange={(e) => updateActivation(i, "type", e.target.value)}>
                    {ACTIVATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input style={{ ...inputStyle, padding: "6px 8px", fontSize: "12px" }} value={a.name} onChange={(e) => updateActivation(i, "name", e.target.value)} placeholder="Name" />
                  <input style={{ ...inputStyle, padding: "6px 8px", fontSize: "12px", textAlign: "right" }} type="number" value={a.points} onChange={(e) => updateActivation(i, "points", parseInt(e.target.value) || 0)} />
                  <input style={{ ...inputStyle, padding: "6px 8px", fontSize: "12px" }} value={a.description} onChange={(e) => updateActivation(i, "description", e.target.value)} placeholder="Description" />
                  <button onClick={() => removeActivation(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px" }}>x</button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowCreate(false); resetForm(); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rally-btn rally-btn--primary" style={{ padding: "8px 20px", fontSize: "13px" }}>
                {saving ? "Saving..." : editingId ? "Update Event" : "Create Event"}
              </button>
            </div>
          </div>
        )}

        {/* Events List */}
        {loading ? (
          <div className="rally-admin-loading">Loading events...</div>
        ) : events.length === 0 ? (
          <p className="rally-admin-empty">No events yet. Create your first event to get started.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {events.map((event) => (
              <div key={event.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, color: "#F5F7FA", fontSize: "15px" }}>{event.title}</span>
                      <span style={{
                        fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px",
                        background: event.status === "live" ? "rgba(239,68,68,0.2)" : event.status === "completed" ? "rgba(139,149,165,0.2)" : "rgba(52,199,89,0.2)",
                        color: event.status === "live" ? "#ef4444" : event.status === "completed" ? "#8B95A5" : "#34C759",
                      }}>
                        {event.status === "live" && "● "}{event.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "12px" }}>{event.sport}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                      {formatDate(event.dateTime)} {event.venue && `· ${event.venue}`} {event.city && `· ${event.city}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    {event.status === "upcoming" && (
                      <button onClick={() => handleStatusChange(event.id, "live")} style={{ ...smallBtnStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>Go Live</button>
                    )}
                    {event.status === "live" && (
                      <button onClick={() => handleStatusChange(event.id, "completed")} style={{ ...smallBtnStyle, color: "#8B95A5", borderColor: "rgba(139,149,165,0.3)" }}>End</button>
                    )}
                    <button onClick={() => openEdit(event)} style={smallBtnStyle}>Edit</button>
                    <button onClick={() => handleDelete(event.id)} style={{ ...smallBtnStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>Delete</button>
                  </div>
                </div>

                {/* Activations summary */}
                {event.activations && event.activations.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {event.activations.map((a) => (
                      <span key={a.id} style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,107,53,0.1)", color: "#FF6B35", fontWeight: 500 }}>
                        {a.name} ({a.points}pts)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "4px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#F5F7FA", fontSize: "13px", outline: "none" };
const smallBtnStyle: React.CSSProperties = { padding: "4px 10px", fontSize: "11px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "rgba(255,255,255,0.6)", cursor: "pointer" };
