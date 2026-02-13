"use client";

import { useState, useEffect } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyDemographics, type DemographicsData } from "@/lib/rally-api";

export default function DemographicsPage() {
  const { user } = useRallyAuth();
  const [data, setData] = useState<DemographicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const propertyId = user?.propertyId || user?.schoolId || "rally-university";
      if (!propertyId) return;

      const res = await rallyDemographics.get(propertyId);
      if (res.ok && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load demographics");
      }
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  if (loading) {
    return <div className="admin-loading"><div className="rally-spinner" /> Loading demographics...</div>;
  }

  if (error) {
    return <div className="admin-alert admin-alert--error">{error}</div>;
  }

  if (!data || data.totalFans === 0) {
    return (
      <div className="admin-page">
        <div className="admin-card" style={{ textAlign: "center", padding: "3rem" }}>
          <h3>No Fan Data Yet</h3>
          <p>Demographics will populate as fans register and provide their information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Fan Demographics</h2>
          <p className="admin-subtitle">
            Aggregate insights about your fan base. Individual user data is not visible.
          </p>
        </div>
        <div className="admin-stat-pill">
          <strong>{data.totalFans}</strong> Total Fans
        </div>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{data.age.average ?? "N/A"}</div>
          <div className="admin-stat-label">Avg. Age</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{data.age.min && data.age.max ? `${data.age.min}–${data.age.max}` : "N/A"}</div>
          <div className="admin-stat-label">Age Range</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{data.engagement?.totalCheckins ?? 0}</div>
          <div className="admin-stat-label">Total Check-ins</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{data.engagement?.avgPointsPerFan ?? 0}</div>
          <div className="admin-stat-label">Avg. Points/Fan</div>
        </div>
      </div>

      <div className="admin-grid-2">
        {/* User Type */}
        <div className="admin-card">
          <h3>Fan Type Breakdown</h3>
          <div className="admin-demo-bars">
            {Object.entries(data.userType).map(([type, count]) => {
              const pct = data.totalFans > 0 ? Math.round((count / data.totalFans) * 100) : 0;
              const label = type === 'general_fan' ? 'General Fan' : type === 'alumni' ? 'Alumni' : type === 'student' ? 'Student' : 'Unspecified';
              return (
                <div key={type} className="admin-demo-bar-row">
                  <div className="admin-demo-bar-label">
                    <span>{label}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="admin-demo-bar">
                    <div className="admin-demo-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Age Distribution */}
        <div className="admin-card">
          <h3>Age Distribution</h3>
          {Object.keys(data.age.distribution).length === 0 ? (
            <p className="admin-empty">No age data available yet.</p>
          ) : (
            <div className="admin-demo-bars">
              {Object.entries(data.age.distribution).map(([bucket, count]) => {
                const maxCount = Math.max(...Object.values(data.age.distribution));
                const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                return (
                  <div key={bucket} className="admin-demo-bar-row">
                    <div className="admin-demo-bar-label">
                      <span>{bucket}</span>
                      <span>{count}</span>
                    </div>
                    <div className="admin-demo-bar">
                      <div className="admin-demo-bar-fill admin-demo-bar-fill--blue" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Cities */}
        <div className="admin-card">
          <h3>Top Cities</h3>
          {data.cities.length === 0 ? (
            <p className="admin-empty">No city data available yet.</p>
          ) : (
            <div className="admin-demo-list">
              {data.cities.slice(0, 10).map((c, i) => (
                <div key={c.city} className="admin-demo-list-item">
                  <span className="admin-demo-rank">{i + 1}</span>
                  <span className="admin-demo-city">{c.city}</span>
                  <span className="admin-demo-count">{c.count} ({c.percentage}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interests */}
        <div className="admin-card">
          <h3>Sports Interests</h3>
          {Object.keys(data.interests).length === 0 ? (
            <p className="admin-empty">No interest data available yet.</p>
          ) : (
            <div className="admin-demo-bars">
              {Object.entries(data.interests)
                .sort(([, a], [, b]) => b - a)
                .map(([sport, count]) => {
                  const maxCount = Math.max(...Object.values(data.interests));
                  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                  return (
                    <div key={sport} className="admin-demo-bar-row">
                      <div className="admin-demo-bar-label">
                        <span style={{ textTransform: "capitalize" }}>{sport}</span>
                        <span>{count}</span>
                      </div>
                      <div className="admin-demo-bar">
                        <div className="admin-demo-bar-fill admin-demo-bar-fill--green" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Tier Distribution */}
        {data.tiers && (
          <div className="admin-card">
            <h3>Loyalty Tier Distribution</h3>
            <div className="admin-demo-bars">
              {Object.entries(data.tiers).map(([tier, count]) => {
                const pct = data.totalFans > 0 ? Math.round((count / data.totalFans) * 100) : 0;
                const colorMap: Record<string, string> = {
                  Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#ffd700', Platinum: '#e5e4e2',
                };
                return (
                  <div key={tier} className="admin-demo-bar-row">
                    <div className="admin-demo-bar-label">
                      <span>{tier}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="admin-demo-bar">
                      <div className="admin-demo-bar-fill" style={{ width: `${pct}%`, background: colorMap[tier] || 'var(--rally-primary)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Engagement & Preferences */}
        <div className="admin-card">
          <h3>Engagement Summary</h3>
          <div className="admin-demo-stats">
            <div className="admin-demo-stat">
              <strong>{data.engagement?.atVenue ?? 0}</strong>
              <span>Venue Check-ins</span>
            </div>
            <div className="admin-demo-stat">
              <strong>{data.engagement?.remote ?? 0}</strong>
              <span>Remote Tune-ins</span>
            </div>
            <div className="admin-demo-stat">
              <strong>{data.engagement?.totalPointsEarned?.toLocaleString() ?? 0}</strong>
              <span>Total Points Earned</span>
            </div>
            <div className="admin-demo-stat">
              <strong>{data.preferences?.pushOptIn ?? 0}</strong>
              <span>Push Notifications On</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
