"use client";

import { useState, useEffect } from "react";
import { rallyNotifications } from "@/lib/rally-api";
import type { RallyNotification } from "@/lib/rally-api";
import { useRallyAuth } from "@/lib/rally-auth";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All Fans" },
  { value: "tier_gold", label: "Gold+ Tier Only" },
  { value: "tier_platinum", label: "Platinum Tier Only" },
  { value: "event_attendees", label: "Event Attendees" },
];

export default function AdminNotificationsPage() {
  const { user } = useRallyAuth();
  const [notifications, setNotifications] = useState<RallyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [scheduledFor, setScheduledFor] = useState("");

  const schoolId = user?.favoriteSchool || "rally-university";

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const res = await rallyNotifications.list(schoolId);
    if (res.ok && res.data) {
      setNotifications(res.data.notifications);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setTargetAudience("all");
    setScheduledFor("");
    setError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setShowCreate(true);
  };

  const openEdit = (notif: RallyNotification) => {
    setTitle(notif.title);
    setBody(notif.body);
    setTargetAudience(notif.targetAudience);
    setScheduledFor(notif.scheduledFor ? notif.scheduledFor.slice(0, 16) : "");
    setEditingId(notif.id);
    setShowCreate(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!title || !body) {
      setError("Title and body are required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      title,
      body,
      schoolId,
      targetAudience,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
    };

    const res = editingId
      ? await rallyNotifications.update(editingId, payload)
      : await rallyNotifications.create(payload);

    if (res.ok) {
      setShowCreate(false);
      resetForm();
      await loadNotifications();
    } else {
      setError(res.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async (notifId: string) => {
    if (!confirm("Delete this notification?")) return;
    await rallyNotifications.delete(notifId);
    await loadNotifications();
  };

  const handleSend = async (notifId: string) => {
    if (!confirm("Send this notification now? This cannot be undone.")) return;
    const res = await rallyNotifications.send(notifId);
    if (res.ok) {
      await loadNotifications();
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const statusColor = (status: string) => {
    if (status === "sent") return { bg: "rgba(52,199,89,0.2)", color: "#34C759" };
    if (status === "scheduled") return { bg: "rgba(59,130,246,0.2)", color: "#3B82F6" };
    return { bg: "rgba(139,149,165,0.2)", color: "#8B95A5" };
  };

  return (
    <div className="rally-admin-page">
      <div className="rally-admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>Push Notifications ({notifications.length})</h3>
          <button className="rally-btn rally-btn--primary" onClick={openCreate} style={{ padding: "8px 20px", fontSize: "13px" }}>
            + Create Notification
          </button>
        </div>

        {/* Create / Edit Form */}
        {showCreate && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 16px", color: "#FF6B35" }}>{editingId ? "Edit Notification" : "Create Notification"}</h4>
            {error && <div style={{ padding: "8px 12px", marginBottom: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "13px" }}>{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gameday Alert: Rally U vs State" />
              </div>
              <div>
                <label style={labelStyle}>Body *</label>
                <textarea
                  style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="e.g. Don't miss today's game! Check in at the stadium to earn double points."
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Target Audience</label>
                  <select style={inputStyle} value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}>
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Schedule For (optional)</label>
                  <input style={inputStyle} type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowCreate(false); resetForm(); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rally-btn rally-btn--primary" style={{ padding: "8px 20px", fontSize: "13px" }}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="rally-admin-loading">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <p className="rally-admin-empty">No notifications yet. Create your first push notification to engage fans.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {notifications.map((notif) => {
              const sc = statusColor(notif.status);
              return (
                <div key={notif.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, color: "#F5F7FA", fontSize: "15px" }}>{notif.title}</span>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px", background: sc.bg, color: sc.color }}>
                          {notif.status.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 6px", fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{notif.body}</p>
                      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                        <span>Audience: {AUDIENCE_OPTIONS.find((a) => a.value === notif.targetAudience)?.label || notif.targetAudience}</span>
                        {notif.scheduledFor && <span>Scheduled: {formatDate(notif.scheduledFor)}</span>}
                        {notif.sentAt && <span>Sent: {formatDate(notif.sentAt)}</span>}
                        <span>Created: {formatDate(notif.createdAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginLeft: "12px" }}>
                      {notif.status !== "sent" && (
                        <button onClick={() => handleSend(notif.id)} style={{ ...smallBtnStyle, color: "#34C759", borderColor: "rgba(52,199,89,0.3)" }}>Send Now</button>
                      )}
                      {notif.status !== "sent" && (
                        <button onClick={() => openEdit(notif)} style={smallBtnStyle}>Edit</button>
                      )}
                      <button onClick={() => handleDelete(notif.id)} style={{ ...smallBtnStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>Delete</button>
                    </div>
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
