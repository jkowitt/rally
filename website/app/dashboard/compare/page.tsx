"use client";

import { useState } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyFanProfile, rallyShareCards, HeadToHeadComparison } from "@/lib/rally-api";

export default function ComparePage() {
  const { user } = useRallyAuth();
  const [opponentHandle, setOpponentHandle] = useState("");
  const [comparison, setComparison] = useState<HeadToHeadComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingCard, setGeneratingCard] = useState(false);

  async function handleCompare() {
    if (!opponentHandle.trim() || !user?.handle) return;
    setLoading(true);
    setError(null);
    setComparison(null);

    const cleanHandle = opponentHandle.trim().replace(/^@/, "");
    const res = await rallyFanProfile.compare(user.handle, cleanHandle);
    if (res.ok && res.data) {
      setComparison(res.data);
    } else {
      setError(res.error || "Fan not found. Check the handle and try again.");
    }
    setLoading(false);
  }

  async function handleCreateShareCard() {
    if (!opponentHandle.trim()) return;
    setGeneratingCard(true);
    const cleanHandle = opponentHandle.trim().replace(/^@/, "");
    const res = await rallyShareCards.createHeadToHead(cleanHandle);
    if (res.ok && res.data) {
      alert(`Head-to-Head card created! Share ID: ${res.data.id}`);
    }
    setGeneratingCard(false);
  }

  const winnerLabel = comparison?.winner === "A" ? comparison.fanA.name : comparison?.winner === "B" ? comparison.fanB.name : "Tie!";

  return (
    <div className="rally-dash-page">
      <div className="rally-dash-welcome">
        <h1>Head-to-Head</h1>
        <p className="rally-dash-subtitle">Who&apos;s the bigger fan? Compare profiles and find out.</p>
      </div>

      {/* Search */}
      <div className="rally-social-card">
        <h3 style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>Challenge a Fan</h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={opponentHandle}
            onChange={(e) => setOpponentHandle(e.target.value)}
            placeholder="Enter their @handle"
            onKeyDown={(e) => e.key === "Enter" && handleCompare()}
            style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px" }}
          />
          <button
            className="rally-btn rally-btn--primary"
            onClick={handleCompare}
            disabled={loading || !opponentHandle.trim()}
          >
            {loading ? "..." : "Compare"}
          </button>
        </div>
        {error && (
          <p style={{ color: "#FF3B30", fontSize: "13px", marginTop: "8px" }}>{error}</p>
        )}
      </div>

      {/* Comparison Result */}
      {comparison && (
        <>
          {/* Winner Banner */}
          <div className="rally-social-card" style={{ textAlign: "center", background: "linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,107,53,0.05))" }}>
            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>
              {comparison.winner === "TIE" ? "It's a" : "Winner"}
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#fff", marginTop: "4px" }}>
              {comparison.winner === "TIE" ? "🤝 Dead Heat!" : `🏆 ${winnerLabel}`}
            </div>
          </div>

          {/* Head-to-Head Names */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px", marginBottom: "4px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "16px" }}>{comparison.fanA.name}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>@{comparison.fanA.handle} &middot; {comparison.fanA.tier}</div>
            </div>
            <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.3)", fontSize: "20px", alignSelf: "center" }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "16px" }}>{comparison.fanB.name}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>@{comparison.fanB.handle} &middot; {comparison.fanB.tier}</div>
            </div>
          </div>

          {/* Category Bars */}
          <div className="rally-social-card">
            {comparison.categories.map((cat) => {
              const total = cat.a + cat.b;
              const pctA = total > 0 ? (cat.a / total) * 100 : 50;
              const aWins = cat.a > cat.b;
              const bWins = cat.b > cat.a;
              return (
                <div key={cat.label} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: aWins ? 700 : 400, color: aWins ? "var(--rally-orange)" : "rgba(255,255,255,0.6)" }}>
                      {cat.a.toLocaleString()}
                    </span>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{cat.label}</span>
                    <span style={{ fontSize: "14px", fontWeight: bWins ? 700 : 400, color: bWins ? "var(--rally-orange)" : "rgba(255,255,255,0.6)" }}>
                      {cat.b.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ width: `${pctA}%`, background: aWins ? "var(--rally-orange)" : "rgba(255,255,255,0.2)", transition: "width 0.5s" }} />
                    <div style={{ width: `${100 - pctA}%`, background: bWins ? "#2D9CDB" : "rgba(255,255,255,0.2)", transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Share Button */}
          <button
            className="rally-btn rally-btn--primary"
            onClick={handleCreateShareCard}
            disabled={generatingCard}
            style={{ width: "100%" }}
          >
            {generatingCard ? "Creating Card..." : "Create Shareable Card"}
          </button>
        </>
      )}
    </div>
  );
}
