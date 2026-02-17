"use client";

import { useState, useEffect } from "react";
import { rallyEvents, rallyGameLobby, RallyEvent, GameLobbyData } from "@/lib/rally-api";

const REACTION_MAP: Record<string, { emoji: string; label: string }> = {
  FIRE: { emoji: "🔥", label: "Hype" },
  CLAP: { emoji: "👏", label: "Great Play" },
  CRY: { emoji: "😭", label: "Pain" },
  HORN: { emoji: "📯", label: "Rally" },
  WAVE: { emoji: "👋", label: "Wave" },
  HUNDRED: { emoji: "💯", label: "Clutch" },
};

export default function GameLobbyPage() {
  const [events, setEvents] = useState<RallyEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [lobby, setLobby] = useState<GameLobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [reacting, setReacting] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    const res = await rallyEvents.list({ status: "LIVE" });
    let liveEvents: RallyEvent[] = [];
    if (res.ok && res.data) {
      liveEvents = res.data.events;
    }
    // Also load upcoming events if no live events
    if (liveEvents.length === 0) {
      const upRes = await rallyEvents.list({ status: "UPCOMING" });
      if (upRes.ok && upRes.data) {
        liveEvents = upRes.data.events.slice(0, 10);
      }
    }
    setEvents(liveEvents);
    setLoading(false);
  }

  async function loadLobby(eventId: string) {
    setLobbyLoading(true);
    setSelectedEvent(eventId);
    const res = await rallyGameLobby.get(eventId);
    if (res.ok && res.data) {
      setLobby(res.data);
    }
    setLobbyLoading(false);
  }

  async function handleCheckin() {
    if (!selectedEvent) return;
    const res = await rallyGameLobby.checkin(selectedEvent);
    if (res.ok) {
      loadLobby(selectedEvent);
    }
  }

  async function handleCheckout() {
    if (!selectedEvent) return;
    const res = await rallyGameLobby.checkout(selectedEvent);
    if (res.ok) {
      loadLobby(selectedEvent);
    }
  }

  async function handleReact(type: string) {
    if (!selectedEvent || reacting) return;
    setReacting(type);
    await rallyGameLobby.react(selectedEvent, type as any);
    // Refresh lobby to get updated reactions
    setTimeout(() => {
      loadLobby(selectedEvent);
      setReacting(null);
    }, 500);
  }

  if (loading) {
    return (
      <div className="rally-dash-page">
        <div className="rally-dash-welcome"><h1>Game Lobby</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>Loading events...</div>
      </div>
    );
  }

  return (
    <div className="rally-dash-page">
      <div className="rally-dash-welcome">
        <h1>Game Lobby</h1>
        <p className="rally-dash-subtitle">See who&apos;s at the game. React together. No comments, just presence.</p>
      </div>

      {/* Event selector */}
      {!selectedEvent && (
        <div className="rally-social-card">
          <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
            {events.length > 0 ? "Select a Game" : "No Active Games"}
          </h3>
          {events.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
              Check back when games are live to join the lobby.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => loadLobby(event.id)}
                className="rally-social-event-btn"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#fff", fontSize: "15px" }}>{event.title}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                      {event.venue} &middot; {new Date(event.dateTime).toLocaleDateString()}
                    </div>
                  </div>
                  {event.status === "live" && (
                    <span className="rally-social-live-badge">LIVE</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lobby View */}
      {selectedEvent && (
        <>
          <button
            className="rally-social-btn-sm"
            onClick={() => { setSelectedEvent(null); setLobby(null); }}
            style={{ marginBottom: "12px" }}
          >
            &larr; Back to games
          </button>

          {lobbyLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>Loading lobby...</div>
          ) : lobby && (
            <>
              {/* Fan Count */}
              <div className="rally-social-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "48px", fontWeight: 800, color: "var(--rally-orange)" }}>{lobby.fanCount}</div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>fans checked in</div>

                {/* Checkin / Checkout */}
                <div style={{ marginTop: "16px" }}>
                  {lobby.isCheckedIn ? (
                    <button className="rally-btn rally-btn--secondary" onClick={handleCheckout} style={{ width: "100%" }}>
                      Leave Lobby
                    </button>
                  ) : (
                    <button className="rally-btn rally-btn--primary" onClick={handleCheckin} style={{ width: "100%" }}>
                      I&apos;m Here — Check In
                    </button>
                  )}
                </div>
              </div>

              {/* Reactions */}
              <div className="rally-social-card">
                <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>Send a Reaction</h3>
                <div className="rally-social-reactions-grid">
                  {Object.entries(REACTION_MAP).map(([type, { emoji, label }]) => {
                    const count = lobby.recentReactions[type] || 0;
                    return (
                      <button
                        key={type}
                        className={`rally-social-reaction-btn ${reacting === type ? "rally-social-reaction-active" : ""}`}
                        onClick={() => handleReact(type)}
                        disabled={!!reacting}
                      >
                        <span style={{ fontSize: "28px" }}>{emoji}</span>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{label}</span>
                        {count > 0 && (
                          <span className="rally-social-reaction-count">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Who's Here */}
              <div className="rally-social-card">
                <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                  Who&apos;s Here ({lobby.fans.length})
                </h3>
                {lobby.fans.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                    No fans checked in yet. Be the first!
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {lobby.fans.map((fan) => (
                      <div key={fan.id} className="rally-social-fan-row">
                        <div className="rally-social-fan-avatar">
                          {fan.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: "#fff", fontSize: "14px" }}>{fan.name}</div>
                          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                            @{fan.handle} &middot; {fan.tier}
                            {fan.fanProfile?.verifiedLevel && fan.fanProfile.verifiedLevel !== "ROOKIE" && (
                              <span style={{ marginLeft: "4px" }}>
                                &middot; {fan.fanProfile.verifiedLevel === "LEGEND" ? "🌟" : fan.fanProfile.verifiedLevel === "SUPERFAN" ? "⭐" : "💪"}
                              </span>
                            )}
                          </div>
                        </div>
                        {fan.fanProfile?.currentStreak && fan.fanProfile.currentStreak >= 3 && (
                          <span style={{ fontSize: "12px", color: "var(--rally-orange)" }}>
                            🔥 {fan.fanProfile.currentStreak}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
