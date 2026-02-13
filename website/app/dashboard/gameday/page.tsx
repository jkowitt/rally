"use client";

import { useState, useEffect } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyEvents } from "@/lib/rally-api";
import type { RallyEvent } from "@/lib/rally-api";

export default function GamedayPage() {
  const { trackEvent } = useRallyAuth();
  const [liveEvents, setLiveEvents] = useState<RallyEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<RallyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      rallyEvents.list({ status: "live" }),
      rallyEvents.list({ status: "upcoming" }),
    ]).then(([liveRes, upRes]) => {
      if (liveRes.ok && liveRes.data) setLiveEvents(liveRes.data.events);
      if (upRes.ok && upRes.data) setUpcomingEvents(upRes.data.events);
      setLoading(false);
    });
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="rally-dash-page">
        <div className="rally-dash-welcome"><h1>Gameday</h1></div>
        <div className="rally-admin-loading">Loading events...</div>
      </div>
    );
  }

  const noEvents = liveEvents.length === 0 && upcomingEvents.length === 0;

  return (
    <div className="rally-dash-page">
      <div className="rally-dash-welcome">
        <h1>Gameday</h1>
        <p className="rally-dash-subtitle">Games, activations, and ways to earn points</p>
      </div>

      {noEvents && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.4)" }}>
          <p style={{ fontSize: "15px", marginBottom: "8px" }}>No events scheduled yet.</p>
          <p style={{ fontSize: "13px" }}>Events created by admins will appear here with earn opportunities.</p>
        </div>
      )}

      {/* Live Events */}
      {liveEvents.map((event) => (
        <div key={event.id} className="rally-dash-section">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444", animation: "pulse 2s infinite" }} />
            <h3 style={{ margin: 0 }}>Live Now</h3>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{event.sport}</span>
          </div>
          <div className="rally-dash-game-card" style={{ border: "1px solid rgba(255,107,53,0.4)", background: "rgba(255,107,53,0.08)" }}>
            <div className="rally-dash-game-teams" style={{ fontSize: "18px", fontWeight: 600 }}>
              <span className="rally-dash-team">{event.homeTeam || event.title}</span>
              <span className="rally-dash-vs">vs</span>
              <span className="rally-dash-team">{event.awayTeam}</span>
            </div>
            <div className="rally-dash-game-details">
              <span>{event.venue}</span>
            </div>
            {/* Earn Opportunities */}
            {event.activations?.length > 0 && (
              <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#FF6B35", display: "block", marginBottom: "8px" }}>EARN OPPORTUNITIES</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {event.activations.map((a) => (
                    <span key={a.id} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "8px", background: "rgba(255,107,53,0.12)", color: "#FF6B35", fontWeight: 500 }}>
                      {a.name} +{a.points}pts
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="rally-dash-section">
          <h3>Upcoming Events</h3>
          <div className="rally-dash-games-list">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="rally-dash-game-card">
                <div className="rally-dash-game-teams">
                  <span className="rally-dash-team">{event.homeTeam || event.title}</span>
                  {event.awayTeam && (
                    <>
                      <span className="rally-dash-vs">vs</span>
                      <span className="rally-dash-team">{event.awayTeam}</span>
                    </>
                  )}
                </div>
                <div className="rally-dash-game-details">
                  <span>{event.sport} &middot; {formatDate(event.dateTime)} &middot; {formatTime(event.dateTime)}</span>
                  {event.venue && <span>{event.venue}</span>}
                </div>
                {/* Earn opportunities for this event */}
                {event.activations?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                    {event.activations.map((a) => (
                      <span key={a.id} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(255,107,53,0.08)", color: "#FF6B35" }}>
                        {a.name} +{a.points}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile-only Features Notice */}
      <div className="rally-dash-mobile-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div>
          <h4>More features on the Rally mobile app</h4>
          <p>Check-in, noise meter, live polls, and photo challenges are available exclusively on the mobile app.</p>
        </div>
      </div>
    </div>
  );
}
