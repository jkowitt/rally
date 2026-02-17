"use client";

import { useState, useEffect } from "react";
import { rallyCaptures } from "@/lib/rally-api";

interface SponsoredData {
  totalCaptures: number;
  totalRallies: number;
  totalCheckedInFans: number;
  engagementRate: number;
  avgRalliesPerCapture: number;
  eventBreakdown: Array<{ title: string; sport: string; captures: number; rallies: number; fanCount: number }>;
}

interface OverallData {
  totalCaptures: number;
  totalRallies: number;
  momentDistribution: Array<{ type: string; captures: number; rallies: number }>;
}

export default function AttributionPage() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [sponsored, setSponsored] = useState<SponsoredData | null>(null);
  const [overall, setOverall] = useState<OverallData | null>(null);

  useEffect(() => {
    setLoading(true);
    rallyCaptures.getAttribution(days).then((res) => {
      if (res.ok && res.data) {
        setSponsored((res.data as { sponsored: SponsoredData }).sponsored);
        setOverall((res.data as { overall: OverallData }).overall);
      }
      setLoading(false);
    });
  }, [days]);

  if (loading) {
    return (
      <div className="rally-admin-page">
        <div className="rally-admin-loading">Loading attribution data...</div>
      </div>
    );
  }

  const momentColors: Record<string, string> = {
    STANDARD: "#8B95A5",
    SPONSORED: "#FFD700",
    EMOTIONAL: "#E74C3C",
    HISTORIC: "#AF52DE",
  };

  return (
    <div className="rally-admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Sponsor Attribution</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
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
        </div>
      </div>

      {/* Sponsored KPIs */}
      {sponsored && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Sponsored Captures", value: sponsored.totalCaptures, color: "#FFD700" },
              { label: "Sponsored Rallies", value: sponsored.totalRallies, color: "#FF6B35" },
              { label: "Checked-in Fans", value: sponsored.totalCheckedInFans, color: "#2D9CDB" },
              { label: "Engagement Rate", value: `${sponsored.engagementRate}%`, color: "#34C759" },
              { label: "Avg Rallies/Capture", value: sponsored.avgRalliesPerCapture, color: "#AF52DE" },
            ].map((kpi) => (
              <div key={kpi.label} className="admin-card" style={{ padding: "1.25rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>{kpi.label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: kpi.color }}>{typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Sponsor pitch card */}
          <div className="admin-card" style={{
            padding: "1.5rem", marginBottom: "1.5rem",
            background: "linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 107, 53, 0.05))",
            border: "1px solid rgba(255, 215, 0, 0.2)",
          }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Sponsor Attribution Summary</h3>
            <p style={{ margin: 0, fontSize: "0.9375rem", lineHeight: 1.6 }}>
              Over the last {days} days, sponsored activations were captured <strong>{sponsored.totalCaptures} times</strong> and
              received <strong>{sponsored.totalRallies} rallies</strong> from <strong>{sponsored.totalCheckedInFans.toLocaleString()} checked-in fans</strong>.
              That&apos;s a <strong>{sponsored.engagementRate}% engagement rate</strong> among verified attendees.
            </p>
          </div>

          {/* Per-event breakdown */}
          {sponsored.eventBreakdown.length > 0 && (
            <div className="admin-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Sponsored Captures by Event</h3>
              <table className="admin-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Sport</th>
                    <th>Captures</th>
                    <th>Rallies</th>
                    <th>Checked-in Fans</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsored.eventBreakdown.map((ev, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{ev.title}</td>
                      <td>{ev.sport}</td>
                      <td>{ev.captures}</td>
                      <td style={{ fontWeight: 600, color: "#FF6B35" }}>{ev.rallies}</td>
                      <td>{ev.fanCount}</td>
                      <td style={{ fontWeight: 600, color: "#34C759" }}>
                        {ev.fanCount > 0 ? `${Math.round((ev.rallies / ev.fanCount) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Overall moment distribution */}
      {overall && (
        <div className="admin-card" style={{ padding: "1.25rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Capture Distribution by Moment Type</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {overall.momentDistribution.map((m) => {
              const maxCap = Math.max(...overall.momentDistribution.map(d => d.captures), 1);
              return (
                <div key={m.type} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{m.type}</span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>{m.captures} captures</span>
                  </div>
                  <div style={{ background: "var(--admin-bg)", borderRadius: "6px", height: "24px", overflow: "hidden" }}>
                    <div style={{
                      width: `${(m.captures / maxCap) * 100}%`,
                      height: "100%",
                      background: momentColors[m.type] || "#8B95A5",
                      borderRadius: "6px",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>{m.rallies} rallies received</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "var(--admin-text-secondary)" }}>
            Total: {overall.totalCaptures} captures, {overall.totalRallies} rallies
          </div>
        </div>
      )}
    </div>
  );
}
