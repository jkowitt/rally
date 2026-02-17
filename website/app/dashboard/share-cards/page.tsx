"use client";

import { useState, useEffect } from "react";
import { rallyShareCards, ShareCardData } from "@/lib/rally-api";

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  FAN_RESUME: { label: "Fan Resume", icon: "📋" },
  MILESTONE: { label: "Milestone", icon: "🏆" },
  HEAD_TO_HEAD: { label: "Head-to-Head", icon: "⚔️" },
  SEASON_RECAP: { label: "Season Recap", icon: "📊" },
  EVENT_RECAP: { label: "Event Recap", icon: "🎟️" },
  STREAK: { label: "Streak", icon: "🔥" },
  TIER_UP: { label: "Tier Up", icon: "⬆️" },
  CREW_LEADERBOARD: { label: "Crew Rank", icon: "👥" },
};

export default function ShareCardsPage() {
  const [cards, setCards] = useState<ShareCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingResume, setGeneratingResume] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ShareCardData | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    setLoading(true);
    const res = await rallyShareCards.mine();
    if (res.ok && res.data) {
      setCards(res.data.cards);
    }
    setLoading(false);
  }

  async function handleGenerateResume() {
    setGeneratingResume(true);
    const res = await rallyShareCards.createFanResume();
    if (res.ok) loadCards();
    setGeneratingResume(false);
  }

  async function handleShare(cardId: string) {
    await rallyShareCards.trackShare(cardId);
    // In a real app, this would trigger native share sheet
    const shareUrl = `${window.location.origin}/card/${cardId}`;
    if (navigator.share) {
      navigator.share({ title: "My Rally Fan Card", url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
    loadCards();
  }

  if (loading) {
    return (
      <div className="rally-dash-page">
        <div className="rally-dash-welcome"><h1>Share Cards</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>Loading cards...</div>
      </div>
    );
  }

  // Card Detail View
  if (selectedCard) {
    const data = selectedCard.data as Record<string, any>;
    const typeInfo = TYPE_LABELS[selectedCard.type] || { label: selectedCard.type, icon: "📄" };

    return (
      <div className="rally-dash-page">
        <button className="rally-social-btn-sm" onClick={() => setSelectedCard(null)} style={{ marginBottom: "12px" }}>
          &larr; Back to cards
        </button>

        <div className="rally-social-share-card">
          {/* Card Header */}
          <div style={{ textAlign: "center", padding: "24px", background: "linear-gradient(135deg, rgba(255,107,53,0.2), rgba(45,156,219,0.1))", borderRadius: "12px 12px 0 0" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--rally-orange)", fontWeight: 700 }}>
              {typeInfo.icon} {typeInfo.label}
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", marginTop: "8px" }}>{selectedCard.title}</h2>
          </div>

          {/* Card Content */}
          <div style={{ padding: "20px" }}>
            {selectedCard.type === "FAN_RESUME" && (
              <div>
                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                  <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>@{data.handle}</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--rally-orange)" }}>{data.verifiedLevel} &middot; {data.tier}</div>
                </div>
                <div className="rally-social-stats-grid">
                  <StatBlock label="Events" value={data.eventsAttended} />
                  <StatBlock label="Check-ins" value={data.totalCheckins} />
                  <StatBlock label="Streak" value={data.currentStreak} />
                  <StatBlock label="Venues" value={data.uniqueVenues} />
                  <StatBlock label="Points" value={data.points?.toLocaleString()} />
                  {data.predictionAccuracy && <StatBlock label="Prediction %" value={`${data.predictionAccuracy}%`} />}
                </div>
                {data.topMilestones?.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>Top Badges</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {data.topMilestones.map((m: any, i: number) => (
                        <span key={i} style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(255,255,255,0.08)", fontSize: "13px", color: "#fff" }}>
                          {m.icon} {m.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedCard.type === "HEAD_TO_HEAD" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff" }}>{data.fanA?.name}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{data.fanA?.tier}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.3)", fontSize: "18px", alignSelf: "center" }}>VS</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff" }}>{data.fanB?.name}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{data.fanB?.tier}</div>
                  </div>
                </div>
                <div style={{ textAlign: "center", fontSize: "16px", fontWeight: 700, color: "var(--rally-orange)" }}>
                  {data.winner === "TIE" ? "🤝 Tie!" : `🏆 ${data.winner === "A" ? data.fanA?.name : data.fanB?.name} wins (${data.winner === "A" ? data.winsA : data.winsB}-${data.winner === "A" ? data.winsB : data.winsA})`}
                </div>
              </div>
            )}

            {selectedCard.type === "MILESTONE" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "64px", marginBottom: "8px" }}>{data.icon}</div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>{data.description}</div>
                {data.stat && (
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--rally-orange)", marginTop: "8px" }}>{data.stat}</div>
                )}
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              {selectedCard.viewCount} views &middot; {selectedCard.shareCount} shares
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>rally.com</div>
          </div>
        </div>

        {/* Share Action */}
        <button className="rally-btn rally-btn--primary" onClick={() => handleShare(selectedCard.id)} style={{ width: "100%", marginTop: "12px" }}>
          Share This Card
        </button>
      </div>
    );
  }

  return (
    <div className="rally-dash-page">
      <div className="rally-dash-welcome">
        <h1>Share Cards</h1>
        <p className="rally-dash-subtitle">Your fan identity, designed for sharing. Post to IG Stories, X, TikTok.</p>
      </div>

      {/* Generate Fan Resume */}
      <div className="rally-social-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>📋</div>
        <h3 style={{ fontSize: "16px", color: "#fff", marginBottom: "4px" }}>Fan Resume</h3>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "16px" }}>
          Generate a shareable card with your complete fan identity — stats, badges, crews.
        </p>
        <button
          className="rally-btn rally-btn--primary"
          onClick={handleGenerateResume}
          disabled={generatingResume}
          style={{ width: "100%" }}
        >
          {generatingResume ? "Generating..." : "Generate Fan Resume"}
        </button>
      </div>

      {/* Cards List */}
      {cards.length > 0 && (
        <div className="rally-social-card">
          <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>Your Cards ({cards.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {cards.map((card) => {
              const typeInfo = TYPE_LABELS[card.type] || { label: card.type, icon: "📄" };
              return (
                <button key={card.id} className="rally-social-crew-card" onClick={() => setSelectedCard(card)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>{typeInfo.icon}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: "14px" }}>{card.title}</div>
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                        {typeInfo.label} &middot; {new Date(card.createdAt).toLocaleDateString()} &middot; {card.viewCount} views &middot; {card.shareCount} shares
                      </div>
                    </div>
                    <button
                      className="rally-social-btn-sm rally-social-btn-primary"
                      onClick={(e) => { e.stopPropagation(); handleShare(card.id); }}
                    >
                      Share
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rally-social-stat-cell">
      <div className="rally-social-stat-value">{value}</div>
      <div className="rally-social-stat-label">{label}</div>
    </div>
  );
}
