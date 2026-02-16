"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { rallyAnalytics, rallyEvents, rallyUsers, rallyContent } from "@/lib/rally-api";
import type { AnalyticsSummary, RallyUser, RallyEvent, School } from "@/lib/rally-api";

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [users, setUsers] = useState<RallyUser[]>([]);
  const [events, setEvents] = useState<RallyEvent[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      rallyAnalytics.getSummary(),
      rallyUsers.list(),
      rallyEvents.list(),
      rallyContent.getSchools(),
    ]).then(([analyticsRes, usersRes, eventsRes, schoolsRes]) => {
      if (analyticsRes.ok && analyticsRes.data) setAnalytics(analyticsRes.data);
      if (usersRes.ok && usersRes.data) {
        const list = Array.isArray(usersRes.data) ? usersRes.data : [];
        setUsers(list);
      }
      if (eventsRes.ok && eventsRes.data) setEvents(eventsRes.data.events || []);
      if (schoolsRes.ok && schoolsRes.data) setSchools(schoolsRes.data.schools || []);
      setLoading(false);
    });
  }, []);

  const liveEvents = events.filter((e) => e.status === "live");
  const upcomingEvents = events.filter((e) => e.status === "upcoming");
  const totalActivations = events.reduce((sum, e) => sum + (e.activations?.length || 0), 0);

  const roleBreakdown = users.reduce<Record<string, number>>((acc, u) => {
    const r = u.role || "user";
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  const tierBreakdown = users.reduce<Record<string, number>>((acc, u) => {
    const t = u.tier || "None";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const tierColors: Record<string, string> = {
    Bronze: "#CD7F32",
    Silver: "#C0C0C0",
    Gold: "#FFD700",
    Platinum: "#E5E4E2",
    None: "#555",
  };

  const roleColors: Record<string, string> = {
    developer: "#A78BFA",
    admin: "#2D9CDB",
    teammate: "#34C759",
    user: "#8B95A5",
  };

  if (loading) {
    return (
      <div className="rally-admin-page">
        <div className="rally-admin-loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="rally-admin-page">
      {/* Top Stats */}
      <div className="rally-admin-stats">
        <div className="rally-admin-stat-card">
          <span className="rally-admin-stat-label">Total Users</span>
          <span className="rally-admin-stat-value">{users.length}</span>
          <span className="rally-admin-stat-sub">
            {Object.entries(roleBreakdown).map(([role, count]) => (
              <span key={role} className="rally-admin-stat-tag" style={{ color: roleColors[role] || "#8B95A5" }}>
                {count} {role}
              </span>
            ))}
          </span>
        </div>
        <div className="rally-admin-stat-card">
          <span className="rally-admin-stat-label">Events</span>
          <span className="rally-admin-stat-value">{events.length}</span>
          <span className="rally-admin-stat-sub">
            {liveEvents.length > 0 && <span className="rally-admin-stat-tag" style={{ color: "#E74C3C" }}>{liveEvents.length} live</span>}
            {upcomingEvents.length > 0 && <span className="rally-admin-stat-tag" style={{ color: "#34C759" }}>{upcomingEvents.length} upcoming</span>}
          </span>
        </div>
        <div className="rally-admin-stat-card">
          <span className="rally-admin-stat-label">Schools / Teams</span>
          <span className="rally-admin-stat-value">{schools.length}</span>
          <span className="rally-admin-stat-sub">
            <span className="rally-admin-stat-tag" style={{ color: "#2D9CDB" }}>{totalActivations} activations</span>
          </span>
        </div>
        <div className="rally-admin-stat-card">
          <span className="rally-admin-stat-label">Verified Users</span>
          <span className="rally-admin-stat-value">{analytics?.verifiedUsers ?? 0}</span>
          <span className="rally-admin-stat-sub">
            <span className="rally-admin-stat-tag" style={{ color: "#34C759" }}>{analytics?.activeToday ?? 0} active today</span>
          </span>
        </div>
      </div>

      {/* Live Events Banner */}
      {liveEvents.length > 0 && (
        <div className="rally-admin-section">
          <h3>
            <span className="rally-live-dot" /> Live Now
          </h3>
          <div className="rally-admin-live-grid">
            {liveEvents.map((evt) => (
              <div key={evt.id} className="rally-admin-live-card">
                <div className="rally-admin-live-title">{evt.title}</div>
                <div className="rally-admin-live-meta">{evt.sport} &middot; {evt.venue}, {evt.city}</div>
                <div className="rally-admin-live-activations">
                  {evt.activations?.map((a) => (
                    <span key={a.id} className="rally-admin-activation-tag">{a.name} +{a.points}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rally-admin-grid-2">
        {/* Upcoming Events */}
        <div className="rally-admin-section">
          <div className="rally-admin-section-header">
            <h3>Upcoming Events</h3>
            <Link href="/admin/events" className="rally-btn rally-btn--small">Manage</Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="rally-admin-card-list">
              {upcomingEvents.slice(0, 5).map((evt) => (
                <div key={evt.id} className="rally-admin-event-card">
                  <div className="rally-admin-event-card-title">{evt.title}</div>
                  <div className="rally-admin-event-card-meta">
                    {evt.sport} &middot; {new Date(evt.dateTime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="rally-admin-event-card-venue">{evt.venue}, {evt.city}</div>
                  {evt.activations && evt.activations.length > 0 && (
                    <div className="rally-admin-event-card-activations">
                      {evt.activations.map((a) => (
                        <span key={a.id} className="rally-admin-activation-tag">{a.name} +{a.points}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="rally-admin-empty">No upcoming events.</p>
          )}
        </div>

        {/* Users */}
        <div className="rally-admin-section">
          <div className="rally-admin-section-header">
            <h3>Users</h3>
            <Link href="/admin/users" className="rally-btn rally-btn--small">View All</Link>
          </div>
          {users.length > 0 ? (
            <div className="rally-admin-card-list">
              {users.slice(0, 6).map((u) => (
                <div key={u.id} className="rally-admin-user-card">
                  <span className="rally-admin-user-card-avatar" style={{ background: roleColors[u.role] || "#8B95A5" }}>
                    {u.name?.substring(0, 2).toUpperCase()}
                  </span>
                  <div className="rally-admin-user-card-info">
                    <span className="rally-admin-user-card-name">{u.name}</span>
                    <span className="rally-admin-user-card-email">{u.email}</span>
                  </div>
                  <span className={`rally-admin-role rally-admin-role--${u.role}`}>{u.role}</span>
                  {u.tier && (
                    <span className="rally-admin-user-card-tier" style={{ color: tierColors[u.tier] || "#8B95A5" }}>
                      {u.tier}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="rally-admin-empty">No users yet.</p>
          )}

          {/* Tier Breakdown */}
          {Object.keys(tierBreakdown).length > 0 && (
            <div className="rally-admin-tier-bar">
              {Object.entries(tierBreakdown).map(([tier, count]) => (
                <div
                  key={tier}
                  className="rally-admin-tier-segment"
                  style={{
                    flex: count,
                    background: tierColors[tier] || "#555",
                  }}
                  title={`${tier}: ${count}`}
                >
                  <span>{tier}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rally-admin-section">
        <h3>Quick Actions</h3>
        <div className="rally-admin-quick-grid">
          <Link href="/admin/events" className="rally-admin-quick-card">
            <span className="rally-admin-quick-icon" style={{ color: "#FF6B35" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span>Create Event</span>
          </Link>
          <Link href="/admin/rewards" className="rally-admin-quick-card">
            <span className="rally-admin-quick-icon" style={{ color: "#FFD700" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </span>
            <span>Add Reward</span>
          </Link>
          <Link href="/admin/notifications" className="rally-admin-quick-card">
            <span className="rally-admin-quick-icon" style={{ color: "#2D9CDB" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </span>
            <span>Send Notification</span>
          </Link>
          <Link href="/admin/demographics" className="rally-admin-quick-card">
            <span className="rally-admin-quick-icon" style={{ color: "#A78BFA" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
              </svg>
            </span>
            <span>View Demographics</span>
          </Link>
        </div>
      </div>

      {/* Schools by Conference */}
      {schools.length > 0 && (
        <div className="rally-admin-section">
          <div className="rally-admin-section-header">
            <h3>Schools &amp; Teams ({schools.length})</h3>
            <Link href="/admin/schools" className="rally-btn rally-btn--small">View All</Link>
          </div>
          <div className="rally-admin-conf-grid">
            {Object.entries(
              schools.reduce<Record<string, School[]>>((acc, s) => {
                const conf = s.conference || "Other";
                if (!acc[conf]) acc[conf] = [];
                acc[conf].push(s);
                return acc;
              }, {})
            )
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 8)
              .map(([conf, confSchools]) => (
                <div key={conf} className="rally-admin-conf-card">
                  <div className="rally-admin-conf-name">{conf}</div>
                  <div className="rally-admin-conf-count">{confSchools.length}</div>
                  <div className="rally-admin-conf-teams">
                    {confSchools.map((s) => (
                      <span
                        key={s.id}
                        className="rally-admin-conf-dot"
                        style={{ background: s.primaryColor }}
                        title={s.name}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {analytics?.recentEvents && analytics.recentEvents.length > 0 && (
        <div className="rally-admin-section">
          <h3>Recent Activity</h3>
          <div className="rally-admin-events-list">
            {analytics.recentEvents.slice(0, 15).map((event, i) => (
              <div key={i} className="rally-admin-event-row">
                <span className="rally-admin-event-type">{event.event}</span>
                <span className="rally-admin-event-page">{event.page}</span>
                <span className="rally-admin-event-time">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
