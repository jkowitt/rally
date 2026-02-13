"use client";

import { useState, useEffect } from "react";
import { rallyAnalytics } from "@/lib/rally-api";
import type { AnalyticsSummary } from "@/lib/rally-api";

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rallyAnalytics.getSummary().then((res) => {
      if (res.ok && res.data) {
        setAnalytics(res.data);
      }
      setLoading(false);
    });
  }, []);

  const cards = [
    { label: "Total Users", value: analytics?.totalUsers || 0, color: "#FF6B35" },
    { label: "Active Today", value: analytics?.activeToday || 0, color: "#2D9CDB" },
    { label: "Events Tracked", value: analytics?.eventsTracked || 0, color: "#34C759" },
    { label: "Verified Users", value: analytics?.verifiedUsers || 0, color: "#A78BFA" },
  ];

  return (
    <div className="rally-admin-page">
      {/* Stats Cards */}
      <div className="rally-admin-stats">
        {cards.map((card) => (
          <div key={card.label} className="rally-admin-stat-card">
            <span className="rally-admin-stat-label">{card.label}</span>
            <span className="rally-admin-stat-value">{loading ? "-" : card.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Schools Breakdown */}
      <div className="rally-admin-section">
        <h3>Users by School</h3>
        {analytics?.usersBySchool && Object.keys(analytics.usersBySchool).length > 0 ? (
          <div className="rally-admin-school-list">
            {Object.entries(analytics.usersBySchool).slice(0, 10).map(([school, count]) => (
              <div key={school} className="rally-admin-school-row">
                <span>{school}</span>
                <span className="rally-admin-school-count">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rally-admin-empty">No school data available yet. Users will appear here as they sign up.</p>
        )}
      </div>

      {/* Recent Events */}
      <div className="rally-admin-section">
        <h3>Recent Activity</h3>
        {analytics?.recentEvents && analytics.recentEvents.length > 0 ? (
          <div className="rally-admin-events-list">
            {analytics.recentEvents.slice(0, 20).map((event, i) => (
              <div key={i} className="rally-admin-event-row">
                <span className="rally-admin-event-type">{event.event}</span>
                <span className="rally-admin-event-page">{event.page}</span>
                <span className="rally-admin-event-time">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rally-admin-empty">No activity tracked yet. User interactions will appear here.</p>
        )}
      </div>
    </div>
  );
}
