"use client";

import { useState, useEffect } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyRewards, rallyPoints, rallyAffiliates, rallyMonetization } from "@/lib/rally-api";
import type { Reward, AffiliateOffer, MonetizationConfig } from "@/lib/rally-api";

const tiers = [
  { name: "Bronze", min: 0, max: 999, color: "#D97706" },
  { name: "Silver", min: 1000, max: 2499, color: "#94A3B8" },
  { name: "Gold", min: 2500, max: 4999, color: "#F59E0B" },
  { name: "Platinum", min: 5000, max: Infinity, color: "#A78BFA" },
];

const categoryLabels: Record<string, string> = {
  MERCHANDISE: "Team Gear",
  TICKETS: "Tickets",
  BETTING: "Sportsbooks",
  STREAMING: "Streaming",
  FOOD_DELIVERY: "Food & Delivery",
  SPORTS_EQUIPMENT: "Equipment",
  TRAVEL: "Travel",
  OTHER: "More",
};

export default function RewardsPage() {
  const { user, isAuthenticated, trackEvent } = useRallyAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateOffer[]>([]);
  const [config, setConfig] = useState<MonetizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [userTier, setUserTier] = useState("Bronze");
  const [activeTab, setActiveTab] = useState<"rewards" | "deals">("deals");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [claiming, setClaiming] = useState(false);

  const schoolId = user?.favoriteSchool || user?.schoolId || "rally-university";

  useEffect(() => {
    Promise.all([
      rallyRewards.list(schoolId),
      rallyAffiliates.list(),
      rallyMonetization.getConfig(),
    ]).then(([rwRes, afRes, cfRes]) => {
      if (rwRes.ok && rwRes.data) setRewards(rwRes.data.rewards);
      if (afRes.ok && afRes.data) setAffiliates(afRes.data.offers);
      if (cfRes.ok && cfRes.data) setConfig(cfRes.data);
      setLoading(false);
    });
  }, [schoolId]);

  useEffect(() => {
    if (isAuthenticated) {
      rallyPoints.me().then((res) => {
        if (res.ok && res.data) {
          setUserPoints(res.data.totalPoints);
          setUserTier(res.data.tier);
        }
      });
    }
  }, [isAuthenticated]);

  const currentTier = tiers.find((t) => t.name === userTier) || tiers[0];
  const nextTier = tiers[tiers.indexOf(currentTier) + 1];
  const progress = nextTier
    ? ((userPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  const tierForPoints = (pts: number) => {
    if (pts >= 5000) return tiers[3];
    if (pts >= 2500) return tiers[2];
    if (pts >= 1000) return tiers[1];
    return tiers[0];
  };

  const handleAffiliateClick = async (offer: AffiliateOffer) => {
    trackEvent("affiliate_click", { brand: offer.brand, category: offer.category });
    const res = await rallyAffiliates.trackClick(offer.id);
    if (res.ok && res.data) {
      window.open(res.data.affiliateUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleRewardedVideo = async () => {
    if (claiming) return;
    setClaiming(true);
    trackEvent("rewarded_video_start", {});
    const res = await rallyMonetization.claimRewardedVideo();
    if (res.ok && res.data) {
      setUserPoints(res.data.totalPoints);
    }
    setClaiming(false);
  };

  const categories = Array.from(new Set(affiliates.map((a) => a.category)));
  const filteredAffiliates =
    categoryFilter === "all" ? affiliates : affiliates.filter((a) => a.category === categoryFilter);

  return (
    <div className="rally-dash-page">
      <div className="rally-dash-welcome">
        <h1>Rewards</h1>
        <p className="rally-dash-subtitle">Earn points, climb tiers, redeem rewards & deals</p>
      </div>

      {/* Tier Progress */}
      <div className="rally-dash-tier-card">
        <div className="rally-dash-tier-header">
          <div>
            <span className="rally-dash-tier-name" style={{ color: currentTier.color }}>{userTier}</span>
            <span className="rally-dash-tier-points">{userPoints.toLocaleString()} points</span>
          </div>
          {nextTier && (
            <span className="rally-dash-tier-next">
              {(nextTier.min - userPoints).toLocaleString()} to {nextTier.name}
            </span>
          )}
        </div>
        <div className="rally-dash-tier-bar">
          <div className="rally-dash-tier-bar-fill" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: currentTier.color }} />
        </div>
        <div className="rally-dash-tier-labels">
          {tiers.map((tier) => (
            <span key={tier.name} className={`rally-dash-tier-label ${tier.name === userTier ? "active" : ""}`} style={{ color: tier.name === userTier ? tier.color : undefined }}>
              {tier.name}
            </span>
          ))}
        </div>
      </div>

      {/* Rewarded Video — Earn Bonus Points */}
      {config?.admobRewardedVideoEnabled && (
        <div className="rally-dash-section">
          <div className="rally-rewarded-card" onClick={handleRewardedVideo} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,107,53,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <polygon points="5 3 19 12 5 21 5 3" fill="#FF6B35" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--rally-off-white)" }}>
                  {claiming ? "Watching..." : "Watch & Earn Bonus Points"}
                </div>
                <div style={{ fontSize: "13px", color: "var(--rally-gray)", marginTop: "2px" }}>
                  Watch a short video to earn +{config.admobRewardedPoints} bonus points
                </div>
              </div>
            </div>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#FF6B35", whiteSpace: "nowrap" }}>
              +{config.admobRewardedPoints}
            </span>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: "0", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => setActiveTab("deals")}
          style={{
            padding: "10px 20px", background: "none", border: "none", color: activeTab === "deals" ? "#FF6B35" : "rgba(255,255,255,0.5)",
            fontSize: "14px", fontWeight: 600, cursor: "pointer",
            borderBottom: activeTab === "deals" ? "2px solid #FF6B35" : "2px solid transparent",
          }}
        >
          Deals & Offers ({affiliates.length})
        </button>
        <button
          onClick={() => setActiveTab("rewards")}
          style={{
            padding: "10px 20px", background: "none", border: "none", color: activeTab === "rewards" ? "#FF6B35" : "rgba(255,255,255,0.5)",
            fontSize: "14px", fontWeight: 600, cursor: "pointer",
            borderBottom: activeTab === "rewards" ? "2px solid #FF6B35" : "2px solid transparent",
          }}
        >
          Team Rewards ({rewards.length})
        </button>
      </div>

      {/* Deals & Offers Tab */}
      {activeTab === "deals" && (
        <div className="rally-dash-section">
          {loading ? (
            <div className="rally-admin-loading">Loading offers...</div>
          ) : affiliates.length === 0 ? (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", padding: "12px 0" }}>
              No offers available right now. Check back soon!
            </p>
          ) : (
            <>
              {/* Category Filters */}
              <div className="rally-events-filters" style={{ justifyContent: "flex-start", marginTop: 0, marginBottom: "16px" }}>
                <button
                  className={`rally-events-chip ${categoryFilter === "all" ? "rally-events-chip--active" : ""}`}
                  onClick={() => setCategoryFilter("all")}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`rally-events-chip ${categoryFilter === cat ? "rally-events-chip--active" : ""}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {categoryLabels[cat] || cat}
                  </button>
                ))}
              </div>

              {/* Offers Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                {filteredAffiliates.map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => handleAffiliateClick(offer)}
                    style={{
                      background: "var(--rally-navy)", border: "1px solid var(--rally-navy-light)", borderRadius: "14px",
                      padding: "16px", cursor: "pointer", transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,107,53,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rally-navy-light)"; e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#FF6B35", textTransform: "uppercase", letterSpacing: "0.5px" }}>{offer.brand}</span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                        {categoryLabels[offer.category] || offer.category}
                      </span>
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--rally-off-white)", marginBottom: "6px", lineHeight: 1.3 }}>
                      {offer.title}
                    </div>
                    {offer.description && (
                      <p style={{ fontSize: "13px", color: "var(--rally-gray)", lineHeight: 1.5, margin: "0 0 12px" }}>
                        {offer.description}
                      </p>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                      {offer.pointsCost > 0 ? (
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--rally-gray)" }}>{offer.pointsCost.toLocaleString()} pts</span>
                      ) : (
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#22c55e" }}>FREE</span>
                      )}
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#FF6B35" }}>
                        Get Deal &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Team Rewards Tab */}
      {activeTab === "rewards" && (
        <div className="rally-dash-section">
          <h3>Available Rewards</h3>
          {loading ? (
            <div className="rally-admin-loading">Loading rewards...</div>
          ) : rewards.length === 0 ? (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", padding: "12px 0" }}>
              No rewards available yet. Check back soon!
            </p>
          ) : (
            <div className="rally-dash-rewards-grid">
              {rewards.sort((a, b) => a.pointsCost - b.pointsCost).map((reward) => {
                const canAfford = userPoints >= reward.pointsCost;
                const rewardTier = tierForPoints(reward.pointsCost);
                return (
                  <div key={reward.id} className="rally-dash-reward-card">
                    <div className="rally-dash-reward-header">
                      <span className="rally-dash-reward-name">{reward.name}</span>
                      <span className="rally-dash-reward-tier" style={{ color: rewardTier.color, backgroundColor: `${rewardTier.color}22` }}>
                        {rewardTier.name}
                      </span>
                    </div>
                    <div className="rally-dash-reward-points">
                      {reward.pointsCost.toLocaleString()} pts
                    </div>
                    {reward.description && (
                      <p className="rally-dash-reward-desc">{reward.description}</p>
                    )}
                    <button
                      className={`rally-btn ${canAfford ? "rally-btn--primary" : "rally-btn--disabled"}`}
                      disabled={!canAfford}
                      onClick={() => canAfford && trackEvent("redeem_reward", { reward: reward.name })}
                    >
                      {canAfford ? "Redeem" : `Need ${(reward.pointsCost - userPoints).toLocaleString()} more`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
