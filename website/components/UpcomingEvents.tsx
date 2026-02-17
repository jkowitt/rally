"use client";

import { useState, useEffect } from "react";
import { rallyEvents } from "@/lib/rally-api";
import type { RallyEvent } from "@/lib/rally-api";

const sportIcons: Record<string, string> = {
  Baseball: "\u26be",
  Basketball: "\ud83c\udfc0",
  Football: "\ud83c\udfc8",
  Hockey: "\ud83c\udfd2",
  Soccer: "\u26bd",
  Golf: "\u26f3",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function UpcomingEvents() {
  const [events, setEvents] = useState<RallyEvent[]>([]);
  const [liveEvents, setLiveEvents] = useState<RallyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      rallyEvents.list({ status: "upcoming" }),
      rallyEvents.list({ status: "live" }),
    ])
      .then(([upRes, liveRes]) => {
        if (upRes.ok && upRes.data?.events) setEvents(upRes.data.events);
        if (liveRes.ok && liveRes.data?.events) setLiveEvents(liveRes.data.events);
      })
      .finally(() => setLoading(false));
  }, []);

  const allEvents = [...liveEvents, ...events];
  const sports = Array.from(new Set(allEvents.map((e) => e.sport).filter(Boolean)));
  const filtered =
    sportFilter === "all" ? allEvents : allEvents.filter((e) => e.sport === sportFilter);
  const displayed = filtered.slice(0, 20);

  if (loading) {
    return (
      <section id="events" className="rally-events-section">
        <div className="container">
          <h2>Upcoming Events</h2>
          <p className="rally-section-subtitle">Loading schedule...</p>
        </div>
      </section>
    );
  }

  if (allEvents.length === 0) {
    return null;
  }

  return (
    <section id="events" className="rally-events-section">
      <div className="container">
        <h2>Upcoming Events</h2>
        <p className="rally-section-subtitle">
          {allEvents.length} upcoming games across {sports.length} sports
        </p>

        {/* Sport Filter Chips */}
        <div className="rally-events-filters">
          <button
            className={`rally-events-chip ${sportFilter === "all" ? "rally-events-chip--active" : ""}`}
            onClick={() => setSportFilter("all")}
          >
            All
          </button>
          {sports.map((sport) => (
            <button
              key={sport}
              className={`rally-events-chip ${sportFilter === sport ? "rally-events-chip--active" : ""}`}
              onClick={() => setSportFilter(sport)}
            >
              {sportIcons[sport] || ""} {sport}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        <div className="rally-events-grid">
          {displayed.map((event) => {
            const isLive = event.status === "live";
            return (
              <div
                key={event.id}
                className={`rally-events-card ${isLive ? "rally-events-card--live" : ""}`}
              >
                {isLive && (
                  <div className="rally-events-live-badge">
                    <span className="rally-events-live-dot" /> LIVE
                  </div>
                )}
                <div className="rally-events-sport">{sportIcons[event.sport] || ""} {event.sport}</div>
                <div className="rally-events-title">{event.title}</div>
                <div className="rally-events-meta">
                  <span>{formatDate(event.dateTime)} &middot; {formatTime(event.dateTime)}</span>
                </div>
                {event.venue && (
                  <div className="rally-events-venue">{event.venue} &middot; {event.city}</div>
                )}
                {event.activations?.length > 0 && (
                  <div className="rally-events-earn">
                    {event.activations.slice(0, 3).map((a) => (
                      <span key={a.id} className="rally-events-earn-tag">
                        {a.name} +{a.points}
                      </span>
                    ))}
                    {event.activations.length > 3 && (
                      <span className="rally-events-earn-tag">+{event.activations.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length > 20 && (
          <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "16px" }}>
            Showing 20 of {filtered.length} events
          </p>
        )}
      </div>
    </section>
  );
}
