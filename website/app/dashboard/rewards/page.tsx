"use client";

import { useState, useEffect } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyRewards, rallyPoints } from "@/lib/rally-api";
import type { Reward } from "@/lib/rally-api";

const tiers = [
  { name: "Bronze", min: 0, max: 999, color: "#D97706" },
  { name: "Silver", min: 1000, max: 2499, color: "#94A3B8" },
  { name: "Gold", min: 2500, max: 4999, color: "#F59E0B" },
  { name: "Platinum", min: 5000, max: Infinity, color: "#A78BFA" },
];

export default function RewardsPage() {
  const { user, isAuthenticated, trackEvent } = useRallyAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [userTier, setUserTier] = useState("Bronze");

  const schoolId = user?.favoriteSchool || user?.schoolId || "rally-university";

  useEffect(() => {
    rallyRewards.list(schoolId).then((res) => {
      if (res.ok && res.data) setRewards(res.data.rewards);
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

  return (
    <div className="rally-dash-page">
      <div className="rally-dash-welcome">
        <h1>Rewards</h1>
        <p className="rally-dash-subtitle">Earn points, climb tiers, redeem rewards</p>
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

      {/* Rewards */}
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
    </div>
  );
}
