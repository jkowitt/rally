"use client";

import { useState, useEffect } from "react";
import { rallyCaptures, rallyEvents, type CaptureData, type CaptureFeed, type RallyEvent, type SeasonLeaderboardEntry } from "@/lib/rally-api";

const MOMENT_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  STANDARD: { label: "Moment", emoji: "", color: "#8B95A5" },
  SPONSORED: { label: "Sponsored", emoji: "", color: "#FFD700" },
  EMOTIONAL: { label: "Tribute", emoji: "", color: "#E74C3C" },
  HISTORIC: { label: "Historic", emoji: "", color: "#AF52DE" },
};

export default function CapturePage() {
  const [tab, setTab] = useState<"feed" | "leaderboard" | "season">("feed");
  const [events, setEvents] = useState<RallyEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [feed, setFeed] = useState<CaptureFeed | null>(null);
  const [sort, setSort] = useState<"latest" | "top">("latest");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [seasonBoard, setSeasonBoard] = useState<SeasonLeaderboardEntry[]>([]);

  // New capture form
  const [showForm, setShowForm] = useState(false);
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureCaption, setCaptureCaption] = useState("");
  const [captureMoment, setCaptureMoment] = useState("STANDARD");
  const [captureInStadium, setCaptureInStadium] = useState(true);

  // Load live/upcoming events
  useEffect(() => {
    rallyEvents.list().then((res) => {
      if (res.ok && res.data) {
        const evts = (res.data as { events: RallyEvent[] }).events || [];
        const liveOrUpcoming = evts.filter((e) => e.status === "live" || e.status === "upcoming");
        setEvents(liveOrUpcoming);
        if (liveOrUpcoming.length > 0 && !selectedEventId) {
          const live = liveOrUpcoming.find(e => e.status === "live");
          setSelectedEventId(live?.id || liveOrUpcoming[0].id);
        }
      }
      setLoading(false);
    });
  }, []);

  // Load feed when event or sort changes
  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    rallyCaptures.getFeed(selectedEventId, sort).then((res) => {
      if (res.ok && res.data) setFeed(res.data);
      setLoading(false);
    });
  }, [selectedEventId, sort]);

  // Load season leaderboard
  useEffect(() => {
    if (tab === "season") {
      rallyCaptures.seasonLeaderboard().then((res) => {
        if (res.ok && res.data) setSeasonBoard(res.data.leaderboard);
      });
    }
  }, [tab]);

  const handlePost = async () => {
    if (!selectedEventId || !captureUrl.trim()) return;
    setPosting(true);
    const res = await rallyCaptures.postCapture(selectedEventId, {
      imageUrl: captureUrl.trim(),
      caption: captureCaption.trim() || undefined,
      momentType: captureMoment,
      isInStadium: captureInStadium,
    });
    if (res.ok) {
      setCaptureUrl("");
      setCaptureCaption("");
      setShowForm(false);
      // Reload feed
      const feedRes = await rallyCaptures.getFeed(selectedEventId, sort);
      if (feedRes.ok && feedRes.data) setFeed(feedRes.data);
    }
    setPosting(false);
  };

  const handleRally = async (captureId: string) => {
    const res = await rallyCaptures.rally(captureId);
    if (res.ok && feed) {
      setFeed({
        ...feed,
        ralliesRemaining: res.data?.ralliesRemaining ?? feed.ralliesRemaining,
        feed: feed.feed.map((c) =>
          c.id === captureId ? { ...c, rallyCount: res.data?.newRallyCount ?? c.rallyCount + 1, hasRallied: true } : c
        ),
      });
    }
  };

  const liveEvent = events.find(e => e.id === selectedEventId);
  const isLive = liveEvent?.status === "live";

  return (
    <div className="rally-dashboard-page">
      <div className="rally-page-header">
        <h2>Rally Capture</h2>
        <p className="rally-page-subtitle">Capture game moments, rally the best ones</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[
          { id: "feed" as const, label: "Moment Feed" },
          { id: "leaderboard" as const, label: "Game Board" },
          { id: "season" as const, label: "Season Leaders" },
        ].map((t) => (
          <button
            key={t.id}
            className={`rally-tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
            style={{
              padding: "0.5rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer",
              background: tab === t.id ? "var(--rally-orange)" : "var(--card-bg)",
              color: tab === t.id ? "#fff" : "var(--text-secondary)",
              fontWeight: tab === t.id ? 600 : 400, fontSize: "0.875rem",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── MOMENT FEED ──────────────────────────────── */}
      {(tab === "feed" || tab === "leaderboard") && (
        <>
          {/* Game selector */}
          <div style={{ marginBottom: "1rem" }}>
            <select
              value={selectedEventId || ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{
                width: "100%", padding: "0.75rem 1rem", borderRadius: "10px",
                border: "1px solid var(--border-color)", background: "var(--card-bg)",
                color: "var(--text-primary)", fontSize: "0.9375rem",
              }}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.status === "live" ? "LIVE " : ""}{ev.title} - {new Date(ev.dateTime).toLocaleDateString()}
                </option>
              ))}
              {events.length === 0 && <option value="">No live or upcoming events</option>}
            </select>
          </div>

          {/* Feed controls */}
          {tab === "feed" && feed && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  onClick={() => setSort("latest")}
                  style={{
                    padding: "0.375rem 0.75rem", borderRadius: "6px", border: "none", cursor: "pointer",
                    background: sort === "latest" ? "var(--rally-blue)" : "var(--card-bg)",
                    color: sort === "latest" ? "#fff" : "var(--text-secondary)", fontSize: "0.8125rem",
                  }}
                >Latest</button>
                <button
                  onClick={() => setSort("top")}
                  style={{
                    padding: "0.375rem 0.75rem", borderRadius: "6px", border: "none", cursor: "pointer",
                    background: sort === "top" ? "var(--rally-blue)" : "var(--card-bg)",
                    color: sort === "top" ? "#fff" : "var(--text-secondary)", fontSize: "0.8125rem",
                  }}
                >Top Rallied</button>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
                  {feed.totalCaptures} captures | {feed.ralliesRemaining}/{feed.ralliesPerGame} rallies left
                </span>
              </div>
              {isLive && !feed.isLocked && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  style={{
                    padding: "0.5rem 1rem", borderRadius: "8px", border: "none",
                    background: "var(--rally-orange)", color: "#fff", fontWeight: 600,
                    cursor: "pointer", fontSize: "0.875rem",
                  }}
                >
                  + Capture Moment
                </button>
              )}
            </div>
          )}

          {/* Moment of the Game banner */}
          {feed?.momentOfGame && (
            <div style={{
              padding: "1rem 1.25rem", marginBottom: "1rem",
              background: "linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 107, 53, 0.1))",
              border: "1px solid rgba(255, 215, 0, 0.3)", borderRadius: "12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.25rem" }}>&#127942;</span>
                <span style={{ fontWeight: 700, fontSize: "1rem" }}>Moment of the Game</span>
              </div>
              <div style={{ fontSize: "0.9375rem" }}>
                <strong>@{feed.momentOfGame.user.handle}</strong> - {feed.momentOfGame.rallyCount} rallies
                {feed.momentOfGame.caption && <span style={{ color: "var(--text-secondary)" }}> &mdash; &ldquo;{feed.momentOfGame.caption}&rdquo;</span>}
              </div>
            </div>
          )}

          {/* Capture form */}
          {showForm && isLive && (
            <div style={{
              padding: "1.25rem", marginBottom: "1rem",
              background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)",
            }}>
              <h4 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Post a Capture</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <input
                  type="text" placeholder="Image URL..."
                  value={captureUrl} onChange={(e) => setCaptureUrl(e.target.value)}
                  style={{
                    padding: "0.625rem 1rem", borderRadius: "8px",
                    border: "1px solid var(--border-color)", background: "var(--bg-primary)",
                    color: "var(--text-primary)", fontSize: "0.875rem",
                  }}
                />
                <input
                  type="text" placeholder="Caption (optional)" maxLength={280}
                  value={captureCaption} onChange={(e) => setCaptureCaption(e.target.value)}
                  style={{
                    padding: "0.625rem 1rem", borderRadius: "8px",
                    border: "1px solid var(--border-color)", background: "var(--bg-primary)",
                    color: "var(--text-primary)", fontSize: "0.875rem",
                  }}
                />
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                  <select value={captureMoment} onChange={(e) => setCaptureMoment(e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem", borderRadius: "8px",
                      border: "1px solid var(--border-color)", background: "var(--bg-primary)",
                      color: "var(--text-primary)", fontSize: "0.875rem",
                    }}
                  >
                    <option value="STANDARD">Standard Moment (1x)</option>
                    <option value="SPONSORED">Sponsored Activation (2.5x)</option>
                    <option value="EMOTIONAL">Emotional / Tribute (2x)</option>
                    <option value="HISTORIC">Historic Moment (4x)</option>
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={captureInStadium} onChange={(e) => setCaptureInStadium(e.target.checked)} />
                    In-stadium
                  </label>
                </div>
                <button
                  onClick={handlePost} disabled={posting || !captureUrl.trim()}
                  style={{
                    padding: "0.625rem 1.25rem", borderRadius: "8px", border: "none",
                    background: "var(--rally-orange)", color: "#fff", fontWeight: 600,
                    cursor: "pointer", fontSize: "0.875rem", opacity: posting ? 0.7 : 1,
                    alignSelf: "flex-start",
                  }}
                >
                  {posting ? "Posting..." : "Post Capture"}
                </button>
              </div>
            </div>
          )}

          {/* Feed locked banner */}
          {feed?.isLocked && (
            <div style={{
              padding: "0.75rem 1rem", marginBottom: "1rem", textAlign: "center",
              background: "rgba(139, 149, 165, 0.1)", borderRadius: "8px",
              fontSize: "0.875rem", color: "var(--text-secondary)",
            }}>
              Game over &mdash; feed is locked. Final standings are set.
            </div>
          )}

          {/* Feed items */}
          {tab === "feed" && feed && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {feed.feed.map((capture) => (
                <CaptureCard
                  key={capture.id}
                  capture={capture}
                  onRally={() => handleRally(capture.id)}
                  isLocked={feed.isLocked}
                  noRalliesLeft={feed.ralliesRemaining <= 0}
                />
              ))}
              {feed.feed.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                  No captures yet. Be the first to capture a moment!
                </div>
              )}
            </div>
          )}

          {/* Game leaderboard */}
          {tab === "leaderboard" && feed && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[...feed.feed]
                .sort((a, b) => b.rallyCount - a.rallyCount)
                .slice(0, 25)
                .map((c, i) => (
                  <div key={c.id} style={{
                    display: "flex", alignItems: "center", gap: "1rem",
                    padding: "0.75rem 1rem", background: "var(--card-bg)",
                    borderRadius: "10px", border: c.isMomentOfGame ? "2px solid #FFD700" : "1px solid var(--border-color)",
                  }}>
                    <span style={{
                      fontWeight: 700, fontSize: "1.125rem", width: "28px", textAlign: "center",
                      color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--text-secondary)",
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>@{c.user.handle}</span>
                      {c.caption && <span style={{ color: "var(--text-secondary)", marginLeft: "0.5rem", fontSize: "0.8125rem" }}>{c.caption}</span>}
                      {c.isMomentOfGame && <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem" }}>&#127942; MOTG</span>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "var(--rally-orange)" }}>{c.rallyCount} rallies</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{c.totalPoints} pts</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* ─── SEASON LEADERBOARD ───────────────────────── */}
      {tab === "season" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1.125rem" }}>Season Rally Leaderboard</h3>
          {seasonBoard.map((entry) => (
            <div key={entry.user.id} style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "0.75rem 1rem", background: "var(--card-bg)",
              borderRadius: "10px", border: "1px solid var(--border-color)",
            }}>
              <span style={{
                fontWeight: 700, fontSize: "1.125rem", width: "28px", textAlign: "center",
                color: entry.rank === 1 ? "#FFD700" : entry.rank === 2 ? "#C0C0C0" : entry.rank === 3 ? "#CD7F32" : "var(--text-secondary)",
              }}>
                {entry.rank}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>@{entry.user.handle}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {entry.captureCount} captures | {entry.momentOfGameCount} MOTGs
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, color: "var(--rally-orange)", fontSize: "1.125rem" }}>
                  {entry.totalRallies.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>total rallies</div>
              </div>
            </div>
          ))}
          {seasonBoard.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
              No captures yet this season.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CaptureCard({ capture, onRally, isLocked, noRalliesLeft }: {
  capture: CaptureData;
  onRally: () => void;
  isLocked: boolean;
  noRalliesLeft: boolean;
}) {
  const moment = MOMENT_LABELS[capture.momentType] || MOMENT_LABELS.STANDARD;
  const canRally = !isLocked && !capture.hasRallied && !noRalliesLeft;

  return (
    <div style={{
      background: "var(--card-bg)", borderRadius: "12px",
      border: capture.isMomentOfGame ? "2px solid #FFD700" : "1px solid var(--border-color)",
      overflow: "hidden",
    }}>
      {/* Image */}
      <div style={{
        height: "200px", background: "#1a1a2e",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <img
          src={capture.imageUrl}
          alt={capture.caption || "Game capture"}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        {/* Badges */}
        <div style={{ position: "absolute", top: "8px", left: "8px", display: "flex", gap: "4px" }}>
          {capture.momentType !== "STANDARD" && (
            <span style={{
              padding: "2px 8px", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 600,
              background: moment.color, color: "#fff",
            }}>
              {moment.emoji} {moment.label}
            </span>
          )}
          <span style={{
            padding: "2px 8px", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 600,
            background: capture.isInStadium ? "rgba(34, 197, 94, 0.9)" : "rgba(45, 156, 219, 0.9)",
            color: "#fff",
          }}>
            {capture.isInStadium ? "In-Stadium" : "At Home"}
          </span>
        </div>
        {capture.isMomentOfGame && (
          <div style={{
            position: "absolute", top: "8px", right: "8px",
            padding: "2px 8px", borderRadius: "4px",
            background: "rgba(255, 215, 0, 0.95)", color: "#333",
            fontSize: "0.6875rem", fontWeight: 700,
          }}>
            &#127942; MOTG
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "0.75rem 1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 600 }}>@{capture.user.handle}</span>
            <span style={{
              marginLeft: "0.5rem", fontSize: "0.6875rem", padding: "1px 6px",
              borderRadius: "4px", background: "rgba(139, 149, 165, 0.2)",
              color: "var(--text-secondary)",
            }}>
              {capture.user.tier}
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {new Date(capture.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {capture.caption && (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", color: "var(--text-primary)" }}>
            {capture.caption}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
          <button
            onClick={onRally}
            disabled={!canRally}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 1rem", borderRadius: "20px", border: "none",
              background: capture.hasRallied ? "rgba(255, 107, 53, 0.2)" : canRally ? "var(--rally-orange)" : "rgba(139, 149, 165, 0.2)",
              color: capture.hasRallied ? "var(--rally-orange)" : canRally ? "#fff" : "var(--text-secondary)",
              fontWeight: 600, fontSize: "0.875rem", cursor: canRally ? "pointer" : "default",
            }}
          >
            <span style={{ fontSize: "1rem" }}>&#128293;</span>
            {capture.hasRallied ? "Rallied" : "Rally"} ({capture.rallyCount})
          </button>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            {capture.totalPoints} pts
          </span>
        </div>
      </div>
    </div>
  );
}
