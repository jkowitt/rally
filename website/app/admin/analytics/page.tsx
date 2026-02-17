"use client";

import { useState, useEffect } from "react";
import { rallyAnalytics } from "@/lib/rally-api";

interface GrowthPoint { date: string; signups: number }
interface CumulativePoint { date: string; total: number }
interface EngagementPoint { date: string; points: number }
interface RetentionPoint { date: string; activeUsers: number }
interface FunnelStep { step: string; count: number; rate: number }
interface TopEvent { id: string; title: string; sport: string; participations: number }

export default function AnalyticsDashboardPage() {
  const [tab, setTab] = useState<"overview" | "growth" | "engagement" | "retention" | "funnel" | "monetization" | "pages">("overview");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  interface SummaryData {
    totalUsers: number; dau: number; wau: number; mau: number;
    dauMauRatio: number; eventsTracked: number; totalPointsEarned: number;
    totalCrews: number; tierBreakdown: Record<string, number> | null;
    [key: string]: unknown;
  }
  interface EngagementData {
    totals: { pointsEarned: number; interactions: number; uniqueEvents: number };
    dailyPoints: Array<{ date: string; points: number }>;
    activationTypes: Record<string, { count: number; totalPoints: number }>;
    topEvents: TopEvent[];
    [key: string]: unknown;
  }
  interface MonetizationData {
    adMetrics: { totalImpressions: number; admobEnabled: boolean; rewardedPoints: number };
    affiliateMetrics: {
      activeOffers: number; totalClicks: number; totalRedemptions: number;
      conversionRate: number;
      topOffers: Array<{ brand: string; title: string; clicks: number; redemptions: number }>;
    } | null;
  }
  interface PagesData {
    totalPageViews: number;
    topPages: Array<{ page: string; views: number }>;
    topEventTypes: Array<{ event: string; count: number }>;
  }

  // Data state
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [growth, setGrowth] = useState<{ series: GrowthPoint[]; cumulative: CumulativePoint[] } | null>(null);
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [retention, setRetention] = useState<{ dauSeries: RetentionPoint[]; cohort: { newUsers: number; retainedUsers: number; retentionRate: number; activatedUsers: number; activationRate: number } } | null>(null);
  const [funnel, setFunnel] = useState<{ funnel: FunnelStep[] } | null>(null);
  const [monetization, setMonetization] = useState<MonetizationData | null>(null);
  const [pages, setPages] = useState<PagesData | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      rallyAnalytics.getSummary(),
      rallyAnalytics.getGrowth(days),
      rallyAnalytics.getEngagement(days),
      rallyAnalytics.getRetention(),
      rallyAnalytics.getFunnel(),
      rallyAnalytics.getMonetization(),
      rallyAnalytics.getPages(days),
    ]).then(([sumRes, growRes, engRes, retRes, funRes, monRes, pagRes]) => {
      if (sumRes.ok) setSummary(sumRes.data as unknown as SummaryData);
      if (growRes.ok) setGrowth(growRes.data as { series: GrowthPoint[]; cumulative: CumulativePoint[] });
      if (engRes.ok) setEngagement(engRes.data as unknown as EngagementData);
      if (retRes.ok) setRetention(retRes.data as unknown as { dauSeries: RetentionPoint[]; cohort: { newUsers: number; retainedUsers: number; retentionRate: number; activatedUsers: number; activationRate: number } });
      if (funRes.ok) setFunnel(funRes.data as { funnel: FunnelStep[] });
      if (monRes.ok) setMonetization(monRes.data as unknown as MonetizationData);
      if (pagRes.ok) setPages(pagRes.data as unknown as PagesData);
      setLoading(false);
    });
  }, [days]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "growth", label: "Growth" },
    { id: "engagement", label: "Engagement" },
    { id: "retention", label: "Retention" },
    { id: "funnel", label: "Funnel" },
    { id: "monetization", label: "Monetization" },
    { id: "pages", label: "Pages" },
  ] as const;

  if (loading) {
    return (
      <div className="rally-admin-page">
        <div className="rally-admin-loading">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="rally-admin-page">
      {/* Tab bar + period selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div className="admin-tabs" style={{ marginBottom: 0 }}>
          {tabs.map((t) => (
            <button key={t.id} className={`admin-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>Period:</label>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className={`admin-btn ${days === d ? "admin-btn-primary" : "admin-btn-secondary"}`}
              style={{ padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
          <a
            href={`${process.env.NEXT_PUBLIC_RALLY_API_URL || "http://localhost:3001/api"}/analytics/export?type=users`}
            className="admin-btn admin-btn-secondary"
            style={{ padding: "0.25rem 0.75rem", fontSize: "0.8125rem", textDecoration: "none" }}
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* ─── OVERVIEW ─────────────────────────────────── */}
      {tab === "overview" && summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            {[
              { label: "Total Users", value: fmtNum(summary.totalUsers), color: "#2D9CDB" },
              { label: "DAU", value: fmtNum(summary.dau), color: "#34C759" },
              { label: "WAU", value: fmtNum(summary.wau), color: "#FF9500" },
              { label: "MAU", value: fmtNum(summary.mau), color: "#AF52DE" },
              { label: "DAU/MAU", value: `${summary.dauMauRatio}%`, color: "#FF6B35" },
              { label: "Events", value: fmtNum(summary.eventsTracked), color: "#E74C3C" },
              { label: "Total Points", value: fmtNum(summary.totalPointsEarned), color: "#FFD700" },
              { label: "Crews", value: fmtNum(summary.totalCrews), color: "#5856D6" },
            ].map((kpi) => (
              <div key={kpi.label} className="admin-card" style={{ padding: "1.25rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)", marginBottom: "0.25rem" }}>{kpi.label}</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Tier breakdown bar */}
          {summary.tierBreakdown != null && (
            <div className="admin-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Tier Distribution</h3>
              <div style={{ display: "flex", height: "32px", borderRadius: "8px", overflow: "hidden" }}>
                {Object.entries(summary.tierBreakdown).map(([tier, count]) => (
                  <div key={tier} style={{
                    flex: count,
                    background: tier === "Platinum" ? "#E5E4E2" : tier === "Gold" ? "#FFD700" : tier === "Silver" ? "#C0C0C0" : "#CD7F32",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 600, color: "#333", minWidth: count > 0 ? "40px" : "0",
                  }}>
                    {count > 0 && `${tier} (${count})`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── GROWTH ───────────────────────────────────── */}
      {tab === "growth" && growth && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="admin-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Daily Signups ({days}d)</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "200px" }}>
              {growth.series.map((d) => {
                const max = Math.max(...growth.series.map(s => s.signups), 1);
                const pct = (d.signups / max) * 100;
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.signups} signups`}
                    style={{
                      flex: 1, background: "#2D9CDB", borderRadius: "2px 2px 0 0",
                      height: `${Math.max(pct, 2)}%`, minWidth: "3px", cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>
              <span>{growth.series[0]?.date}</span>
              <span>{growth.series[growth.series.length - 1]?.date}</span>
            </div>
          </div>

          <div className="admin-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Cumulative Users</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "160px" }}>
              {growth.cumulative.map((d) => {
                const min = growth.cumulative[0]?.total || 0;
                const max = Math.max(growth.cumulative[growth.cumulative.length - 1]?.total || 1, min + 1);
                const pct = ((d.total - min) / (max - min)) * 100;
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.total} total`}
                    style={{
                      flex: 1, background: "#34C759", borderRadius: "2px 2px 0 0",
                      height: `${Math.max(pct, 2)}%`, minWidth: "3px",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── ENGAGEMENT ───────────────────────────────── */}
      {tab === "engagement" && engagement && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Totals */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {[
              { label: "Points Earned", value: fmtNum(engagement.totals?.pointsEarned || 0), color: "#FFD700" },
              { label: "Interactions", value: fmtNum(engagement.totals?.interactions || 0), color: "#2D9CDB" },
              { label: "Unique Events", value: fmtNum(engagement.totals?.uniqueEvents || 0), color: "#FF6B35" },
            ].map((s) => (
              <div key={s.label} className="admin-card" style={{ padding: "1.25rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>{s.label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Daily points chart */}
          <div className="admin-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Daily Points Earned ({days}d)</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "180px" }}>
              {(engagement.dailyPoints || []).map((d) => {
                const max = Math.max(...(engagement.dailyPoints || []).map(s => s.points), 1);
                const pct = (d.points / max) * 100;
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.points} pts`}
                    style={{
                      flex: 1, background: "#FFD700", borderRadius: "2px 2px 0 0",
                      height: `${Math.max(pct, 2)}%`, minWidth: "3px",
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Activation types */}
          {engagement.activationTypes != null && (
            <div className="admin-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Activation Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {Object.entries(engagement.activationTypes)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([name, data]) => {
                    const maxCount = Math.max(...Object.values(engagement.activationTypes).map(d => d.count), 1);
                    return (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ width: "160px", fontSize: "0.875rem", fontWeight: 500, flexShrink: 0 }}>{name}</span>
                        <div style={{ flex: 1, background: "var(--admin-bg)", borderRadius: "4px", height: "24px", overflow: "hidden" }}>
                          <div style={{
                            width: `${(data.count / maxCount) * 100}%`,
                            height: "100%",
                            background: "#FF6B35",
                            borderRadius: "4px",
                            display: "flex", alignItems: "center", paddingLeft: "0.5rem",
                            fontSize: "0.75rem", fontWeight: 600, color: "#fff",
                          }}>
                            {data.count}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)", width: "80px", textAlign: "right" }}>
                          {fmtNum(data.totalPoints)} pts
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Top events */}
          {engagement.topEvents?.length > 0 && (
            <div className="admin-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Top Events by Participation</h3>
              <table className="admin-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Sport</th>
                    <th>Participations</th>
                  </tr>
                </thead>
                <tbody>
                  {engagement.topEvents.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>{e.title}</td>
                      <td>{e.sport}</td>
                      <td style={{ fontWeight: 600, color: "#2D9CDB" }}>{e.participations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── RETENTION ────────────────────────────────── */}
      {tab === "retention" && retention && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Cohort metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            {[
              { label: "New Users (30d)", value: fmtNum(retention.cohort.newUsers), color: "#2D9CDB" },
              { label: "Retained (7d)", value: fmtNum(retention.cohort.retainedUsers), color: "#34C759" },
              { label: "Retention Rate", value: `${retention.cohort.retentionRate}%`, color: "#FF6B35" },
              { label: "Activated", value: fmtNum(retention.cohort.activatedUsers), color: "#AF52DE" },
              { label: "Activation Rate", value: `${retention.cohort.activationRate}%`, color: "#FFD700" },
            ].map((m) => (
              <div key={m.label} className="admin-card" style={{ padding: "1.25rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>{m.label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* DAU chart */}
          <div className="admin-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Daily Active Users (30d)</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "200px" }}>
              {retention.dauSeries.map((d) => {
                const max = Math.max(...retention.dauSeries.map(s => s.activeUsers), 1);
                const pct = (d.activeUsers / max) * 100;
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.activeUsers} active`}
                    style={{
                      flex: 1, background: "#34C759", borderRadius: "2px 2px 0 0",
                      height: `${Math.max(pct, 2)}%`, minWidth: "3px",
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>
              <span>{retention.dauSeries[0]?.date}</span>
              <span>{retention.dauSeries[retention.dauSeries.length - 1]?.date}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── FUNNEL ───────────────────────────────────── */}
      {tab === "funnel" && funnel && (
        <div className="admin-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.125rem" }}>User Activation Funnel</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {funnel.funnel.map((step, i) => {
              const maxCount = funnel.funnel[0]?.count || 1;
              const pct = (step.count / maxCount) * 100;
              const colors = ["#2D9CDB", "#34C759", "#FF9500", "#AF52DE", "#FFD700", "#FF6B35"];
              return (
                <div key={step.step} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ width: "180px", fontSize: "0.875rem", fontWeight: 500, flexShrink: 0 }}>
                    {step.step}
                  </span>
                  <div style={{ flex: 1, background: "var(--admin-bg)", borderRadius: "6px", height: "36px", overflow: "hidden", position: "relative" }}>
                    <div style={{
                      width: `${Math.max(pct, 2)}%`,
                      height: "100%",
                      background: colors[i % colors.length],
                      borderRadius: "6px",
                      display: "flex", alignItems: "center", paddingLeft: "0.75rem",
                      fontSize: "0.8125rem", fontWeight: 600, color: "#fff",
                      transition: "width 0.5s ease",
                    }}>
                      {step.count > 0 && step.count.toLocaleString()}
                    </div>
                  </div>
                  <span style={{ width: "60px", textAlign: "right", fontWeight: 600, fontSize: "0.875rem", color: colors[i % colors.length] }}>
                    {step.rate}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MONETIZATION ─────────────────────────────── */}
      {tab === "monetization" && monetization && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Ad metrics */}
          <div className="admin-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Ad Metrics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              {[
                { label: "Total Impressions", value: fmtNum(monetization.adMetrics.totalImpressions) },
                { label: "AdMob", value: monetization.adMetrics.admobEnabled ? "Enabled" : "Disabled" },
                { label: "Rewarded Pts/Video", value: String(monetization.adMetrics.rewardedPoints) },
              ].map((m) => (
                <div key={m.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>{m.label}</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Affiliate metrics */}
          {monetization.affiliateMetrics && (
            <div className="admin-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Affiliate Performance</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {[
                  { label: "Active Offers", value: fmtNum(monetization.affiliateMetrics.activeOffers), color: "#34C759" },
                  { label: "Total Clicks", value: fmtNum(monetization.affiliateMetrics.totalClicks), color: "#2D9CDB" },
                  { label: "Redemptions", value: fmtNum(monetization.affiliateMetrics.totalRedemptions), color: "#FF6B35" },
                  { label: "Conversion", value: `${monetization.affiliateMetrics.conversionRate}%`, color: "#AF52DE" },
                ].map((m) => (
                  <div key={m.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>{m.label}</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Top offers table */}
              {monetization.affiliateMetrics.topOffers?.length > 0 && (
                <>
                  <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9375rem" }}>Top Offers</h4>
                  <table className="admin-table" style={{ margin: 0 }}>
                    <thead>
                      <tr><th>Brand</th><th>Title</th><th>Clicks</th><th>Redemptions</th></tr>
                    </thead>
                    <tbody>
                      {monetization.affiliateMetrics.topOffers.map((o, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{o.brand}</td>
                          <td>{o.title}</td>
                          <td>{o.clicks}</td>
                          <td>{o.redemptions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── PAGES ────────────────────────────────────── */}
      {tab === "pages" && pages && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div className="admin-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Top Pages</h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>
              {fmtNum(pages.totalPageViews)} total page views ({days}d)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {(pages.topPages || []).map((p) => {
                const max = Math.max(...(pages.topPages || []).map(x => x.views), 1);
                return (
                  <div key={p.page} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ width: "200px", fontSize: "0.8125rem", fontFamily: "monospace", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.page}
                    </span>
                    <div style={{ flex: 1, background: "var(--admin-bg)", borderRadius: "4px", height: "20px", overflow: "hidden" }}>
                      <div style={{ width: `${(p.views / max) * 100}%`, height: "100%", background: "#2D9CDB", borderRadius: "4px" }} />
                    </div>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, width: "50px", textAlign: "right" }}>{p.views}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="admin-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Top Event Types</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {(pages.topEventTypes || []).map((e) => {
                const max = Math.max(...(pages.topEventTypes || []).map(x => x.count), 1);
                return (
                  <div key={e.event} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ width: "200px", fontSize: "0.8125rem", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.event}
                    </span>
                    <div style={{ flex: 1, background: "var(--admin-bg)", borderRadius: "4px", height: "20px", overflow: "hidden" }}>
                      <div style={{ width: `${(e.count / max) * 100}%`, height: "100%", background: "#FF6B35", borderRadius: "4px" }} />
                    </div>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, width: "50px", textAlign: "right" }}>{e.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}
