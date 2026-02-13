"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyEvents, rallyPoints } from "@/lib/rally-api";
import type { RallyEvent, PointsEntry } from "@/lib/rally-api";

const quickActions = [
  { label: "Trivia", desc: "Test your knowledge", href: "/dashboard/gameday", icon: "?" },
  { label: "Predictions", desc: "Make your picks", href: "/dashboard/gameday", icon: "P" },
  { label: "Rewards", desc: "Browse rewards", href: "/dashboard/rewards", icon: "R" },
  { label: "Profile", desc: "View your stats", href: "/dashboard/profile", icon: "U" },
];

export default function DashboardPage() {
  const { user, isAuthenticated, trackEvent } = useRallyAuth();
  const firstName = user?.name?.split(" ")[0] || "Fan";

  const [nextEvent, setNextEvent] = useState<RallyEvent | null>(null);
  const [liveEvent, setLiveEvent] = useState<RallyEvent | null>(null);
  const [points, setPoints] = useState({ total: 0, tier: "Bronze", history: [] as PointsEntry[] });

  useEffect(() => {
    rallyEvents.list({ status: "upcoming" }).then((res) => {
      if (res.ok && res.data?.events?.length) setNextEvent(res.data.events[0]);
    });
    rallyEvents.list({ status: "live" }).then((res) => {
      if (res.ok && res.data?.events?.length) setLiveEvent(res.data.events[0]);
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      rallyPoints.me().then((res) => {
        if (res.ok && res.data) setPoints({ total: res.data.totalPoints, tier: res.data.tier, history: res.data.history || [] });
      });
    }
  }, [isAuthenticated]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const displayEvent = liveEvent || nextEvent;

  return (
    <div className="rally-dash-page">
      {/* Welcome */}
      <div className="rally-dash-welcome">
        <div>
          <h1>Welcome back, {firstName}!</h1>
          <p className="rally-dash-subtitle">Here&apos;s what&apos;s happening with Rally today</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="rally-dash-stats">
        <div className="rally-dash-stat-card">
          <span className="rally-dash-stat-label">Points</span>
          <span className="rally-dash-stat-value">{points.total.toLocaleString()}</span>
        </div>
        <div className="rally-dash-stat-card">
          <span className="rally-dash-stat-label">Tier</span>
          <span className="rally-dash-stat-value rally-dash-stat-tier">{points.tier}</span>
        </div>
        <div className="rally-dash-stat-card">
          <span className="rally-dash-stat-label">Activities</span>
          <span className="rally-dash-stat-value">{points.history.length}</span>
        </div>
      </div>

      {/* Next / Live Game Card */}
      {displayEvent && (
        <div className="rally-dash-next-game">
          <div className="rally-dash-next-game-header">
            <span className="rally-dash-label">{liveEvent ? "LIVE NOW" : "NEXT GAME"}</span>
            {liveEvent && <span className="rally-dash-live-dot" />}
          </div>
          <h2>{displayEvent.title}</h2>
          <p>{formatDate(displayEvent.dateTime)}{displayEvent.venue && ` · ${displayEvent.venue}`}</p>
          {displayEvent.activations?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
              {displayEvent.activations.map((a) => (
                <span key={a.id} style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,107,53,0.15)", color: "#FF6B35", fontWeight: 500 }}>
                  {a.name} +{a.points}pts
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!displayEvent && (
        <div className="rally-dash-next-game" style={{ textAlign: "center", padding: "24px" }}>
          <p style={{ color: "rgba(255,255,255,0.5)" }}>No upcoming events. Check back soon!</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rally-dash-section">
        <h3>Quick Actions</h3>
        <div className="rally-dash-quick-grid">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="rally-dash-quick-card"
              onClick={() => trackEvent("quick_action", { action: action.label })}
            >
              <div className="rally-dash-quick-icon">{action.icon}</div>
              <div>
                <span className="rally-dash-quick-label">{action.label}</span>
                <span className="rally-dash-quick-desc">{action.desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity - from points ledger */}
      <div className="rally-dash-section">
        <h3>Recent Activity</h3>
        <div className="rally-dash-activity-list">
          {points.history.length === 0 ? (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", padding: "8px 0" }}>
              No activity yet. Attend an event and earn your first points!
            </p>
          ) : (
            points.history.slice(0, 6).map((entry) => (
              <div key={entry.id} className="rally-dash-activity-item">
                <span className="rally-dash-activity-text">{entry.activationName}</span>
                <span className="rally-dash-activity-points">+{entry.points}</span>
                <span className="rally-dash-activity-time">{timeAgo(entry.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
