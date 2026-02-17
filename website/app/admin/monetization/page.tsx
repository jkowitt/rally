"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { rallyMonetization, rallyAffiliates } from "@/lib/rally-api";
import type { MonetizationSettingsData, AffiliateOffer } from "@/lib/rally-api";

const categoryLabels: Record<string, string> = {
  MERCHANDISE: "Merchandise",
  TICKETS: "Tickets",
  BETTING: "Betting",
  STREAMING: "Streaming",
  FOOD_DELIVERY: "Food & Delivery",
  SPORTS_EQUIPMENT: "Sports Equipment",
  TRAVEL: "Travel",
  OTHER: "Other",
};

export default function MonetizationPage() {
  const [settings, setSettings] = useState<MonetizationSettingsData | null>(null);
  const [offers, setOffers] = useState<AffiliateOffer[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "affiliates" | "admob">("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      rallyMonetization.getSettings(),
      rallyAffiliates.listAll(),
    ]).then(([sRes, aRes]) => {
      if (sRes.ok && sRes.data) setSettings(sRes.data);
      if (aRes.ok && aRes.data) setOffers(aRes.data.offers);
      setLoading(false);
    });
  }, []);

  const saveSettings = async (updates: Partial<MonetizationSettingsData>) => {
    setSaving(true);
    setSaved(false);
    const res = await rallyMonetization.updateSettings(updates);
    if (res.ok && res.data) {
      setSettings(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const toggleAffiliate = async (offerId: string, isActive: boolean) => {
    const res = await rallyAffiliates.update(offerId, { isActive });
    if (res.ok) {
      setOffers(offers.map(o => o.id === offerId ? { ...o, isActive } : o));
    }
  };

  const deleteAffiliate = async (offerId: string) => {
    const res = await rallyAffiliates.delete(offerId);
    if (res.ok) {
      setOffers(offers.filter(o => o.id !== offerId));
    }
  };

  if (loading) {
    return (
      <div className="rally-admin-page">
        <div className="rally-admin-header"><h1>Monetization</h1></div>
        <div className="rally-admin-loading">Loading monetization settings...</div>
      </div>
    );
  }

  const activeOffers = offers.filter(o => o.isActive).length;
  const totalClicks = settings?.totalAffiliateClicks || 0;
  const totalRedemptions = settings?.totalAffiliateRedemptions || 0;
  const totalImpressions = settings?.totalAdImpressions || 0;

  return (
    <div className="rally-admin-page">
      <div className="rally-admin-header">
        <div>
          <h1>Monetization</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginTop: "4px" }}>
            Manage affiliate offers, ad placements, and revenue streams
          </p>
        </div>
        <Link href="/admin" style={{ fontSize: "13px", color: "#FF6B35" }}>&larr; Back to Admin</Link>
      </div>

      {/* Revenue Stats */}
      <div className="rally-admin-stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Active Offers", value: activeOffers, color: "#FF6B35" },
          { label: "Affiliate Clicks", value: totalClicks.toLocaleString(), color: "#3B82F6" },
          { label: "Redemptions", value: totalRedemptions.toLocaleString(), color: "#22C55E" },
          { label: "Ad Impressions", value: totalImpressions.toLocaleString(), color: "#A78BFA" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "var(--rally-navy)", border: "1px solid var(--rally-navy-light)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: stat.color, marginTop: "4px" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {(["overview", "affiliates", "admob"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px", background: "none", border: "none",
              color: activeTab === tab ? "#FF6B35" : "rgba(255,255,255,0.5)",
              fontSize: "14px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
              borderBottom: activeTab === tab ? "2px solid #FF6B35" : "2px solid transparent",
            }}
          >
            {tab === "admob" ? "AdMob / Ads" : tab === "affiliates" ? "Affiliate Offers" : "Overview"}
          </button>
        ))}
      </div>

      {saved && (
        <div style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>
          Settings saved successfully
        </div>
      )}

      {/* ──── OVERVIEW TAB ──── */}
      {activeTab === "overview" && settings && (
        <div style={{ display: "grid", gap: "16px" }}>
          {/* Master Toggles */}
          <div style={{ background: "var(--rally-navy)", border: "1px solid var(--rally-navy-light)", borderRadius: "14px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>Master Controls</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <ToggleRow
                label="Affiliate Offers"
                description="Show affiliate deals from Fanatics, SeatGeek, DraftKings, etc. in the Rewards page"
                checked={settings.affiliatesEnabled}
                onChange={(v) => saveSettings({ affiliatesEnabled: v })}
              />
              <ToggleRow
                label="Google AdMob"
                description="Enable ad placements (banners, interstitials, rewarded videos). Requires ad unit IDs."
                checked={settings.admobEnabled}
                onChange={(v) => saveSettings({ admobEnabled: v })}
              />
            </div>
          </div>

          {/* Quick Setup Guide */}
          <div style={{ background: "var(--rally-navy)", border: "1px solid var(--rally-navy-light)", borderRadius: "14px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>Setup Guide</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "var(--rally-gray)" }}>
              <StepRow step={1} done={activeOffers > 0} text="Affiliate offers are pre-populated. Replace placeholder URLs with your actual affiliate links." />
              <StepRow step={2} done={!!settings.admobBannerId || !!settings.admobRewardedVideoId} text="Create a Google AdMob account, generate ad unit IDs, and paste them in the AdMob tab." />
              <StepRow step={3} done={settings.admobRewardedVideoEnabled} text="Enable rewarded videos — fans watch a 15-30s ad to earn bonus points. Best value exchange." />
              <StepRow step={4} done={totalClicks > 0} text="Once live, track clicks, redemptions, and ad impressions in the stats above." />
            </div>
          </div>

          {/* Revenue Projections */}
          <div style={{ background: "var(--rally-navy)", border: "1px solid var(--rally-navy-light)", borderRadius: "14px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>Affiliate Programs — Self-Serve Signup</h3>
            <div style={{ fontSize: "13px", color: "var(--rally-gray)", lineHeight: 1.8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
                <span>Platform</span><span>Commission</span><span>Signup</span>
              </div>
              {[
                { name: "Fanatics", commission: "8% rev share", url: "fanatics.com/affiliates" },
                { name: "SeatGeek", commission: "$5 CPA", url: "seatgeek.com/partners" },
                { name: "StubHub", commission: "6% rev share", url: "stubhub.com/affiliates" },
                { name: "DraftKings", commission: "$50-100 CPA", url: "draftkings.com/affiliates" },
                { name: "FanDuel", commission: "$50-100 CPA", url: "fanduel.com/affiliates" },
                { name: "ESPN+", commission: "$8 CPA", url: "disneyplus.com/affiliates" },
                { name: "Nike", commission: "7% rev share", url: "nike.com/affiliates" },
                { name: "Amazon Prime", commission: "$3 CPA", url: "affiliate-program.amazon.com" },
              ].map((p) => (
                <div key={p.name} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "var(--rally-off-white)", fontWeight: 500 }}>{p.name}</span>
                  <span>{p.commission}</span>
                  <span style={{ color: "#FF6B35" }}>{p.url}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──── AFFILIATES TAB ──── */}
      {activeTab === "affiliates" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", color: "var(--rally-gray)" }}>
              {offers.length} total offers ({activeOffers} active)
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ fontSize: "13px", color: "var(--rally-gray)" }}>Max per page:</label>
              <input
                type="number"
                value={settings?.affiliateMaxPerPage || 6}
                onChange={(e) => saveSettings({ affiliateMaxPerPage: parseInt(e.target.value) || 6 })}
                style={{ width: "60px", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--rally-navy-light)", background: "var(--rally-navy)", color: "var(--rally-off-white)", fontSize: "13px" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {offers.map((offer) => (
              <div
                key={offer.id}
                style={{
                  background: "var(--rally-navy)", border: "1px solid var(--rally-navy-light)", borderRadius: "12px",
                  padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px",
                  opacity: offer.isActive ? 1 : 0.5,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--rally-off-white)" }}>{offer.brand}</span>
                    <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                      {categoryLabels[offer.category] || offer.category}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--rally-gray)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {offer.title}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, fontSize: "12px", color: "var(--rally-gray)" }}>
                  <div>{offer.clickCount} clicks</div>
                  <div>{offer.redeemCount} redeems</div>
                </div>
                <button
                  onClick={() => toggleAffiliate(offer.id, !offer.isActive)}
                  style={{
                    padding: "5px 12px", borderRadius: "6px", border: "1px solid var(--rally-navy-light)",
                    background: offer.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                    color: offer.isActive ? "#22C55E" : "#EF4444",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {offer.isActive ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => deleteAffiliate(offer.id)}
                  style={{
                    padding: "5px 8px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.3)",
                    background: "transparent", color: "#EF4444", fontSize: "12px", cursor: "pointer",
                  }}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── ADMOB TAB ──── */}
      {activeTab === "admob" && settings && (
        <div style={{ display: "grid", gap: "16px" }}>
          {/* Global Enable */}
          <div style={{ background: "var(--rally-navy)", border: "1px solid var(--rally-navy-light)", borderRadius: "14px", padding: "20px" }}>
            <ToggleRow
              label="Enable Google AdMob"
              description="Master switch for all ad placements. When off, no ads are shown anywhere."
              checked={settings.admobEnabled}
              onChange={(v) => saveSettings({ admobEnabled: v })}
            />
          </div>

          {/* Rewarded Video */}
          <div style={{ background: "var(--rally-navy)", border: settings.admobEnabled ? "1px solid rgba(255,107,53,0.3)" : "1px solid var(--rally-navy-light)", borderRadius: "14px", padding: "20px", opacity: settings.admobEnabled ? 1 : 0.5 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "15px" }}>Rewarded Video Ads</h3>
            <p style={{ fontSize: "13px", color: "var(--rally-gray)", margin: "0 0 16px" }}>
              Fans watch a 15-30 second ad to earn bonus points. Best monetization format — high engagement, positive user sentiment.
            </p>
            <ToggleRow
              label="Enabled"
              description={`"Watch this ad, earn ${settings.admobRewardedPoints} bonus points" — shown on the Rewards page`}
              checked={settings.admobRewardedVideoEnabled}
              onChange={(v) => saveSettings({ admobRewardedVideoEnabled: v })}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
              <InputField
                label="Ad Unit ID"
                placeholder="ca-app-pub-XXXX/YYYY"
                value={settings.admobRewardedVideoId || ""}
                onChange={(v) => saveSettings({ admobRewardedVideoId: v || null } as any)}
              />
              <InputField
                label="Points per video"
                placeholder="50"
                type="number"
                value={String(settings.admobRewardedPoints)}
                onChange={(v) => saveSettings({ admobRewardedPoints: parseInt(v) || 50 })}
              />
            </div>
          </div>

          {/* Interstitial Ads */}
          <div style={{ background: "var(--rally-navy)", border: "1px solid var(--rally-navy-light)", borderRadius: "14px", padding: "20px", opacity: settings.admobEnabled ? 1 : 0.5 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "15px" }}>Interstitial Ads</h3>
            <p style={{ fontSize: "13px", color: "var(--rally-gray)", margin: "0 0 16px" }}>
              Full-screen ads between trivia rounds or after earning points. Use sparingly.
            </p>
            <ToggleRow
              label="Enabled"
              description="Show between trivia rounds and after point-earning actions"
              checked={settings.admobInterstitialEnabled}
              onChange={(v) => saveSettings({ admobInterstitialEnabled: v })}
            />
            <div style={{ marginTop: "16px" }}>
              <InputField
                label="Ad Unit ID"
                placeholder="ca-app-pub-XXXX/YYYY"
                value={settings.admobInterstitialId || ""}
                onChange={(v) => saveSettings({ admobInterstitialId: v || null } as any)}
              />
            </div>
          </div>

          {/* Banner Ads */}
          <div style={{ background: "var(--rally-navy)", border: "1px solid var(--rally-navy-light)", borderRadius: "14px", padding: "20px", opacity: settings.admobEnabled ? 1 : 0.5 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "15px" }}>Banner Ads</h3>
            <p style={{ fontSize: "13px", color: "var(--rally-gray)", margin: "0 0 16px" }}>
              Small banner at the bottom of leaderboard and scores screens. Lowest CPM but always visible.
            </p>
            <ToggleRow
              label="Enabled"
              description="Show banner on leaderboard and scores screens"
              checked={settings.admobBannerEnabled}
              onChange={(v) => saveSettings({ admobBannerEnabled: v })}
            />
            <div style={{ marginTop: "16px" }}>
              <InputField
                label="Ad Unit ID"
                placeholder="ca-app-pub-XXXX/YYYY"
                value={settings.admobBannerId || ""}
                onChange={(v) => saveSettings({ admobBannerId: v || null } as any)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable sub-components ───

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--rally-off-white)" }}>{label}</div>
        <div style={{ fontSize: "12px", color: "var(--rally-gray)", marginTop: "2px" }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: "44px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer",
          background: checked ? "#FF6B35" : "rgba(255,255,255,0.1)",
          position: "relative", flexShrink: 0, transition: "background 0.2s",
        }}
      >
        <div style={{
          width: "18px", height: "18px", borderRadius: "50%", background: "#fff",
          position: "absolute", top: "3px",
          left: checked ? "23px" : "3px",
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

function InputField({ label, placeholder, value, onChange, type = "text" }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={{ fontSize: "12px", color: "var(--rally-gray)", display: "block", marginBottom: "4px" }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "8px 12px", borderRadius: "8px",
          border: "1px solid var(--rally-navy-light)", background: "rgba(255,255,255,0.04)",
          color: "var(--rally-off-white)", fontSize: "13px", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function StepRow({ step, done, text }: { step: number; done: boolean; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
      <div style={{
        width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "11px", fontWeight: 700,
        background: done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
        color: done ? "#22C55E" : "rgba(255,255,255,0.4)",
      }}>
        {done ? "\u2713" : step}
      </div>
      <span style={{ color: done ? "var(--rally-off-white)" : undefined }}>{text}</span>
    </div>
  );
}
