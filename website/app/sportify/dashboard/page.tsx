"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

// AI Asset Analysis Types
interface AssetItem {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  category: string;
  estimatedValue: number;
}

interface AIAssetRecommendation {
  assetId: string;
  assetName: string;
  priority: number;
  optimalTiming: string;
  reasoning: string;
  projectedROI: number;
  riskLevel: "low" | "medium" | "high";
}

interface AIAssetAnalysis {
  recommendations: AIAssetRecommendation[];
  overallStrategy: string;
  marketConditions: string[];
  timePeriodInsights: string;
  projectedTotalROI: number;
  confidence: number;
}

// Athletics data - starts empty for user to add their own
const upcomingEvents: { id: number; name: string; sport: string; date: string; time: string; venue: string; ticketsSold: number; capacity: number; status: string }[] = [];

const teams: { id: number; name: string; sport: string; record: string; standing: number | string; nextGame: string; logo: string }[] = [];

const recentResults: { id: number; event: string; result: string; date: string; attendance: number }[] = [];

const staffMembers: { id: number; name: string; role: string; status: string }[] = [];

export default function SportifyDashboard() {
  const [selectedSport, setSelectedSport] = useState("all");

  // Quick Action Modal State
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSent, setAlertSent] = useState(false);

  // AI Asset Optimizer State
  const [showAIOptimizer, setShowAIOptimizer] = useState(false);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetDescription, setNewAssetDescription] = useState("");
  const [newAssetCategory, setNewAssetCategory] = useState("merchandise");
  const [newAssetValue, setNewAssetValue] = useState("");
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "quarter" | "season">("month");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAssetAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assetImagePreview, setAssetImagePreview] = useState<string | null>(null);

  const handleAssetImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAssetImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addAsset = () => {
    if (!newAssetName.trim() || !newAssetDescription.trim()) return;

    const newAsset: AssetItem = {
      id: `asset-${Date.now()}`,
      name: newAssetName,
      description: newAssetDescription,
      category: newAssetCategory,
      estimatedValue: parseFloat(newAssetValue) || 0,
      imageUrl: assetImagePreview || undefined,
    };

    setAssets([...assets, newAsset]);
    setNewAssetName("");
    setNewAssetDescription("");
    setNewAssetValue("");
    setAssetImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
    if (analysisResult) setAnalysisResult(null);
  };

  const runAIAssetAnalysis = async () => {
    if (assets.length < 2) return;

    setIsAnalyzing(true);

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2500));

    const timePeriodLabels = {
      week: "This Week",
      month: "This Month",
      quarter: "This Quarter",
      season: "This Season"
    };

    const recommendations: AIAssetRecommendation[] = assets
      .map((asset, index) => ({
        assetId: asset.id,
        assetName: asset.name,
        priority: index + 1,
        optimalTiming: getOptimalTiming(index, timePeriod),
        reasoning: generateReasoning(asset, index, timePeriod),
        projectedROI: Math.round(15 + Math.random() * 35),
        riskLevel: (["low", "medium", "high"] as const)[Math.floor(Math.random() * 3)],
      }))
      .sort((a, b) => b.projectedROI - a.projectedROI)
      .map((rec, idx) => ({ ...rec, priority: idx + 1 }));

    const result: AIAssetAnalysis = {
      recommendations,
      overallStrategy: `Based on current market conditions and ${timePeriodLabels[timePeriod].toLowerCase()} projections, we recommend prioritizing high-ROI merchandise and promotional items early in the period, followed by equipment investments that support upcoming events.`,
      marketConditions: [
        "Sports merchandise demand is up 12% YoY",
        "Fan engagement peaks during championship season",
        "Equipment costs stabilizing after supply chain improvements",
        "Digital asset opportunities expanding in sports sector"
      ],
      timePeriodInsights: `${timePeriodLabels[timePeriod]} shows optimal conditions for asset deployment with ${recommendations.length} items analyzed. Peak engagement expected during mid-period events.`,
      projectedTotalROI: recommendations.reduce((sum, r) => sum + r.projectedROI, 0) / recommendations.length,
      confidence: 78 + Math.floor(Math.random() * 15),
    };

    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const getOptimalTiming = (index: number, period: string) => {
    const timings: Record<string, string[]> = {
      week: ["Monday-Tuesday", "Wednesday", "Thursday-Friday", "Weekend"],
      month: ["Week 1", "Week 2", "Week 3", "Week 4"],
      quarter: ["Month 1", "Month 2", "Month 3", "End of Quarter"],
      season: ["Pre-season", "Early Season", "Mid-season", "Playoffs"],
    };
    return timings[period][index % timings[period].length];
  };

  const generateReasoning = (asset: AssetItem, index: number, period: string) => {
    const reasonings = [
      `High demand patterns align with ${asset.category} investments during this ${period}. Early deployment maximizes fan engagement opportunities.`,
      `Market analysis shows ${asset.category} performs best with strategic timing. Current conditions favor immediate action.`,
      `Historical data suggests ${asset.category} assets yield optimal returns when positioned mid-${period}. Recommend careful monitoring.`,
      `AI models indicate strong potential for ${asset.category} with moderate timing flexibility. Best deployed after initial high-priority items.`,
    ];
    return reasonings[index % reasonings.length];
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "#22C55E";
      case "medium": return "#F59E0B";
      case "high": return "#EF4444";
      default: return "#64748B";
    }
  };

  const totalTicketsSold = upcomingEvents.reduce((sum, e) => sum + e.ticketsSold, 0);
  const totalCapacity = upcomingEvents.reduce((sum, e) => sum + e.capacity, 0);
  const ticketRevenue = totalTicketsSold * 45; // avg $45/ticket
  const occupancyRate = Math.round((totalTicketsSold / totalCapacity) * 100);

  const filteredTeams = selectedSport === "all"
    ? teams
    : teams.filter(t => t.sport.toLowerCase() === selectedSport.toLowerCase());

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case "basketball":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sp-sport-svg">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z" />
            <path d="M2 12h20" />
          </svg>
        );
      case "football":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sp-sport-svg">
            <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(45 12 12)" />
            <path d="M7 12l10 0M9.5 9.5l5 5M14.5 9.5l-5 5" />
          </svg>
        );
      case "soccer":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sp-sport-svg">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2l3 5h-6l3-5M12 22l-3-5h6l-3 5M2 12l5 3v-6l-5 3M22 12l-5-3v6l5-3" />
          </svg>
        );
      case "baseball":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sp-sport-svg">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2c-1.5 2.5-1.5 7-1.5 10s0 7.5 1.5 10M12 2c1.5 2.5 1.5 7 1.5 10s0 7.5-1.5 10" />
          </svg>
        );
      case "hockey":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sp-sport-svg">
            <path d="M4 20h4v-6a4 4 0 014-4 4 4 0 014 4v6h4" />
            <circle cx="12" cy="5" r="3" />
          </svg>
        );
      case "track & field":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sp-sport-svg">
            <circle cx="12" cy="5" r="3" />
            <path d="M6.5 22l3.5-5 4.5 1.5 3-3.5" />
            <path d="M14 14l-2-2-4.5 5" />
            <path d="M7 8l5 3 4-3" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sp-sport-svg">
            <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7" />
            <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 20M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 20" />
            <path d="M18 2H6v7a6 6 0 1012 0V2z" />
          </svg>
        );
    }
  };

  const getResultColor = (result: string) => {
    if (result.startsWith("W")) return "#10B981";
    if (result.startsWith("L")) return "#EF4444";
    return "#F59E0B";
  };

  return (
    <main className="sportify-dashboard-page">
      <Header />

      {/* Dashboard Header */}
      <section className="sp-dash-header">
        <div className="container">
          <div className="sp-dash-header-content">
            <div>
              <div className="sp-breadcrumb">
                <Link href="/sportify">Sportify</Link>
                <span>/</span>
                <span>Dashboard</span>
              </div>
              <h1>Athletics Command Center</h1>
              <p>Manage events, teams, and gameday operations.</p>
            </div>
            <div className="sp-dash-actions">
              <button className="sp-dash-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Schedule
              </button>
              <button className="sp-dash-btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Event
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="sp-dash-stats">
        <div className="container">
          <div className="sp-dash-stats-grid">
            <div className="sp-dash-stat">
              <div className="sp-dash-stat-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="sp-dash-stat-content">
                <span className="sp-dash-stat-value">{upcomingEvents.length}</span>
                <span className="sp-dash-stat-label">Upcoming Events</span>
              </div>
            </div>

            <div className="sp-dash-stat">
              <div className="sp-dash-stat-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </div>
              <div className="sp-dash-stat-content">
                <span className="sp-dash-stat-value">{(totalTicketsSold / 1000).toFixed(1)}K</span>
                <span className="sp-dash-stat-label">Tickets Sold</span>
              </div>
            </div>

            <div className="sp-dash-stat">
              <div className="sp-dash-stat-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div className="sp-dash-stat-content">
                <span className="sp-dash-stat-value">${(ticketRevenue / 1000000).toFixed(2)}M</span>
                <span className="sp-dash-stat-label">Ticket Revenue</span>
              </div>
            </div>

            <div className="sp-dash-stat">
              <div className="sp-dash-stat-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div className="sp-dash-stat-content">
                <span className="sp-dash-stat-value">{occupancyRate}%</span>
                <span className="sp-dash-stat-label">Avg Occupancy</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="sp-dash-main">
        <div className="container">
          <div className="sp-dash-layout">
            {/* Upcoming Events */}
            <div className="sp-dash-card full-width">
              <div className="sp-dash-card-header">
                <h3>Upcoming Events</h3>
                <Link href="/sportify/events" className="sp-dash-link">View All Events</Link>
              </div>
              <div className="sp-events-table">
                {upcomingEvents.length > 0 ? (
                  <>
                    <div className="sp-events-header">
                      <span>Event</span>
                      <span>Date & Time</span>
                      <span>Venue</span>
                      <span>Ticket Sales</span>
                      <span>Status</span>
                    </div>
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="sp-event-row">
                        <div className="sp-event-info">
                          <div className="sp-event-sport">{getSportIcon(event.sport)}</div>
                          <div>
                            <span className="sp-event-name">{event.name}</span>
                            <span className="sp-event-type">{event.sport}</span>
                          </div>
                        </div>
                        <div className="sp-event-datetime">
                          <span className="sp-event-date">{event.date}</span>
                          <span className="sp-event-time">{event.time}</span>
                        </div>
                        <span className="sp-event-venue">{event.venue}</span>
                        <div className="sp-event-tickets">
                          <div className="sp-tickets-bar">
                            <div
                              className="sp-tickets-fill"
                              style={{ width: `${(event.ticketsSold / event.capacity) * 100}%` }}
                            />
                          </div>
                          <span className="sp-tickets-text">
                            {(event.ticketsSold / 1000).toFixed(1)}K / {(event.capacity / 1000).toFixed(0)}K
                          </span>
                        </div>
                        <span className={`sp-event-status ${event.status}`}>
                          {event.status === "on-sale" ? "On Sale" : "Upcoming"}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="sp-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <p>No upcoming events</p>
                    <span>Create your first event to get started</span>
                  </div>
                )}
              </div>
            </div>

            {/* Teams */}
            <div className="sp-dash-card">
              <div className="sp-dash-card-header">
                <h3>Teams</h3>
                <div className="sp-sport-filters">
                  {["all", "basketball", "football", "soccer"].map((sport) => (
                    <button
                      key={sport}
                      className={`sp-filter-btn ${selectedSport === sport ? "active" : ""}`}
                      onClick={() => setSelectedSport(sport)}
                    >
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sp-teams-list">
                {filteredTeams.length > 0 ? (
                  filteredTeams.map((team) => (
                    <div key={team.id} className="sp-team-row">
                      <div className="sp-team-logo">{team.logo}</div>
                      <div className="sp-team-info">
                        <span className="sp-team-name">{team.name}</span>
                        <span className="sp-team-sport">{team.sport}</span>
                      </div>
                      <div className="sp-team-record">
                        <span className="sp-record-value">{team.record}</span>
                        <span className="sp-record-label">Record</span>
                      </div>
                      <div className="sp-team-standing">
                        <span className="sp-standing-value">#{team.standing}</span>
                        <span className="sp-standing-label">Standing</span>
                      </div>
                      <div className="sp-team-next">
                        <span className="sp-next-value">{team.nextGame}</span>
                        <span className="sp-next-label">Next Game</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="sp-empty-state-sm">
                    <p>No teams added</p>
                  </div>
                )}
              </div>
              <Link href="/sportify/teams" className="sp-view-all-btn">
                View All Teams
              </Link>
            </div>

            {/* Recent Results */}
            <div className="sp-dash-card">
              <div className="sp-dash-card-header">
                <h3>Recent Results</h3>
                <Link href="/sportify/events" className="sp-dash-link">View All</Link>
              </div>
              <div className="sp-results-list">
                {recentResults.length > 0 ? (
                  recentResults.map((result) => (
                    <div key={result.id} className="sp-result-row">
                      <div className="sp-result-info">
                        <span className="sp-result-event">{result.event}</span>
                        <span className="sp-result-date">{result.date}</span>
                      </div>
                      <div className="sp-result-meta">
                        <span
                          className="sp-result-score"
                          style={{ color: getResultColor(result.result) }}
                        >
                          {result.result}
                        </span>
                        <span className="sp-result-attendance">
                          {(result.attendance / 1000).toFixed(1)}K attended
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="sp-empty-state-sm">
                    <p>No results yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Staff */}
            <div className="sp-dash-card">
              <div className="sp-dash-card-header">
                <h3>Key Staff</h3>
                <Link href="/sportify/staff" className="sp-dash-link">Manage Staff</Link>
              </div>
              <div className="sp-staff-list">
                {staffMembers.length > 0 ? (
                  staffMembers.map((staff) => (
                    <div key={staff.id} className="sp-staff-row">
                      <div className="sp-staff-avatar">
                        {staff.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="sp-staff-info">
                        <span className="sp-staff-name">{staff.name}</span>
                        <span className="sp-staff-role">{staff.role}</span>
                      </div>
                      <span className={`sp-staff-status ${staff.status}`}>
                        {staff.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="sp-empty-state-sm">
                    <p>No staff members</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="sp-dash-card">
              <div className="sp-dash-card-header">
                <h3>Quick Actions</h3>
              </div>
              <div className="sp-quick-actions">
                <button
                  className={`sp-quick-action ${activeAction === "tickets" ? "active" : ""}`}
                  onClick={() => setActiveAction(activeAction === "tickets" ? null : "tickets")}
                >
                  <div className="sp-qa-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <path d="M2 10h20" />
                      <circle cx="17" cy="14" r="2" />
                    </svg>
                  </div>
                  <span>Sell Tickets</span>
                </button>
                <button
                  className={`sp-quick-action ${activeAction === "reports" ? "active" : ""}`}
                  onClick={() => setActiveAction(activeAction === "reports" ? null : "reports")}
                >
                  <div className="sp-qa-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 20V10M12 20V4M6 20v-6" />
                    </svg>
                  </div>
                  <span>View Reports</span>
                </button>
                <button
                  className={`sp-quick-action ${activeAction === "alert" ? "active" : ""}`}
                  onClick={() => setActiveAction(activeAction === "alert" ? null : "alert")}
                >
                  <div className="sp-qa-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M19 10v4M12 3v18M5 10v4" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </div>
                  <span>Send Alert</span>
                </button>
                <button
                  className={`sp-quick-action ${activeAction === "venue" ? "active" : ""}`}
                  onClick={() => setActiveAction(activeAction === "venue" ? null : "venue")}
                >
                  <div className="sp-qa-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 21h18M5 21V7l7-4 7 4v14" />
                      <path d="M9 21v-8h6v8" />
                    </svg>
                  </div>
                  <span>Venue Setup</span>
                </button>
              </div>
              {activeAction && (
                <div className="sp-action-panel">
                  {activeAction === "tickets" && (
                    <div className="sp-action-content">
                      <h4>Quick Ticket Sale</h4>
                      <div className="sp-action-form">
                        <select className="sp-action-select">
                          <option>Select Event</option>
                          <option>Championship Finals</option>
                          <option>Regional Playoffs</option>
                          <option>Spring Tournament</option>
                        </select>
                        <div className="sp-ticket-qty">
                          <button onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}>-</button>
                          <span>{ticketQuantity}</span>
                          <button onClick={() => setTicketQuantity(ticketQuantity + 1)}>+</button>
                        </div>
                        <button className="sp-action-submit">Process Sale</button>
                      </div>
                    </div>
                  )}
                  {activeAction === "reports" && (
                    <div className="sp-action-content">
                      <h4>Quick Reports</h4>
                      <div className="sp-report-links">
                        <button className="sp-report-btn">Attendance Report</button>
                        <button className="sp-report-btn">Revenue Summary</button>
                        <button className="sp-report-btn">Team Performance</button>
                      </div>
                    </div>
                  )}
                  {activeAction === "alert" && (
                    <div className="sp-action-content">
                      <h4>Send Alert</h4>
                      <div className="sp-action-form">
                        <input
                          type="text"
                          placeholder="Alert message..."
                          value={alertMessage}
                          onChange={(e) => setAlertMessage(e.target.value)}
                          className="sp-action-input"
                        />
                        <button
                          className="sp-action-submit"
                          onClick={() => { setAlertSent(true); setAlertMessage(""); setTimeout(() => setAlertSent(false), 2000); }}
                        >
                          {alertSent ? "Sent!" : "Send to All Staff"}
                        </button>
                      </div>
                    </div>
                  )}
                  {activeAction === "venue" && (
                    <div className="sp-action-content">
                      <h4>Venue Quick Setup</h4>
                      <div className="sp-venue-options">
                        <label className="sp-venue-option">
                          <input type="checkbox" defaultChecked /> Lighting System
                        </label>
                        <label className="sp-venue-option">
                          <input type="checkbox" defaultChecked /> Sound System
                        </label>
                        <label className="sp-venue-option">
                          <input type="checkbox" /> Scoreboard Active
                        </label>
                        <label className="sp-venue-option">
                          <input type="checkbox" /> Concessions Open
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AI Asset Optimizer Section */}
      <section className="sp-ai-section">
        <div className="container">
          <div className="sp-ai-toggle-card" onClick={() => setShowAIOptimizer(!showAIOptimizer)}>
            <div className="sp-ai-toggle-left">
              <div className="sp-ai-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h3>AI Asset Optimizer</h3>
                <p>Upload assets and let AI determine optimal ordering for your time period</p>
              </div>
            </div>
            <div className={`sp-ai-chevron ${showAIOptimizer ? "open" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {showAIOptimizer && (
            <div className="sp-ai-panel">
              <div className="sp-ai-grid">
                {/* Add Asset Form */}
                <div className="sp-ai-form-section">
                  <h4>Add Assets</h4>
                  <div className="sp-ai-form">
                    <div className="sp-ai-form-row">
                      <div className="sp-ai-input-group">
                        <label>Asset Name</label>
                        <input
                          type="text"
                          value={newAssetName}
                          onChange={(e) => setNewAssetName(e.target.value)}
                          placeholder="e.g., Championship Merchandise"
                        />
                      </div>
                      <div className="sp-ai-input-group">
                        <label>Category</label>
                        <select
                          value={newAssetCategory}
                          onChange={(e) => setNewAssetCategory(e.target.value)}
                        >
                          <option value="merchandise">Merchandise</option>
                          <option value="equipment">Equipment</option>
                          <option value="sponsorship">Sponsorship</option>
                          <option value="media">Media Rights</option>
                          <option value="facilities">Facilities</option>
                          <option value="digital">Digital Assets</option>
                        </select>
                      </div>
                    </div>

                    <div className="sp-ai-input-group full">
                      <label>Description</label>
                      <textarea
                        value={newAssetDescription}
                        onChange={(e) => setNewAssetDescription(e.target.value)}
                        placeholder="Describe the asset, its purpose, and any relevant details for AI analysis..."
                        rows={3}
                      />
                    </div>

                    <div className="sp-ai-form-row">
                      <div className="sp-ai-input-group">
                        <label>Estimated Value ($)</label>
                        <input
                          type="number"
                          value={newAssetValue}
                          onChange={(e) => setNewAssetValue(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="sp-ai-input-group">
                        <label>Asset Image (Optional)</label>
                        <div className="sp-ai-file-upload" onClick={() => fileInputRef.current?.click()}>
                          {assetImagePreview ? (
                            <img src={assetImagePreview} alt="Preview" className="sp-ai-preview-thumb" />
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              <span>Upload</span>
                            </>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAssetImageUpload}
                          style={{ display: "none" }}
                        />
                      </div>
                    </div>

                    <button
                      className="sp-ai-add-btn"
                      onClick={addAsset}
                      disabled={!newAssetName.trim() || !newAssetDescription.trim()}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Asset
                    </button>
                  </div>
                </div>

                {/* Asset List */}
                <div className="sp-ai-assets-section">
                  <h4>Assets ({assets.length})</h4>
                  {assets.length === 0 ? (
                    <div className="sp-ai-empty">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                      <p>No assets added yet</p>
                      <span>Add at least 2 assets to run AI optimization</span>
                    </div>
                  ) : (
                    <div className="sp-ai-asset-list">
                      {assets.map((asset) => (
                        <div key={asset.id} className="sp-ai-asset-item">
                          {asset.imageUrl && (
                            <img src={asset.imageUrl} alt={asset.name} className="sp-ai-asset-thumb" />
                          )}
                          <div className="sp-ai-asset-info">
                            <span className="sp-ai-asset-name">{asset.name}</span>
                            <span className="sp-ai-asset-category">{asset.category}</span>
                            <span className="sp-ai-asset-desc">{asset.description.substring(0, 60)}...</span>
                          </div>
                          {asset.estimatedValue > 0 && (
                            <span className="sp-ai-asset-value">
                              ${asset.estimatedValue.toLocaleString()}
                            </span>
                          )}
                          <button
                            className="sp-ai-remove-btn"
                            onClick={() => removeAsset(asset.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Time Period & Analyze */}
              <div className="sp-ai-analyze-section">
                <div className="sp-ai-time-period">
                  <label>Optimization Time Period</label>
                  <div className="sp-ai-period-options">
                    {(["week", "month", "quarter", "season"] as const).map((period) => (
                      <button
                        key={period}
                        className={`sp-ai-period-btn ${timePeriod === period ? "active" : ""}`}
                        onClick={() => setTimePeriod(period)}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="sp-ai-analyze-btn"
                  onClick={runAIAssetAnalysis}
                  disabled={assets.length < 2 || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="sp-ai-spinner" />
                      Analyzing Assets...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Optimize Asset Order
                    </>
                  )}
                </button>
              </div>

              {/* AI Results */}
              {analysisResult && (
                <div className="sp-ai-results">
                  <div className="sp-ai-results-header">
                    <h4>AI Optimization Results</h4>
                    <div className="sp-ai-confidence">
                      <span>Confidence</span>
                      <div className="sp-ai-confidence-bar">
                        <div
                          className="sp-ai-confidence-fill"
                          style={{ width: `${analysisResult.confidence}%` }}
                        />
                      </div>
                      <span className="sp-ai-confidence-value">{analysisResult.confidence}%</span>
                    </div>
                  </div>

                  <div className="sp-ai-strategy-card">
                    <h5>Overall Strategy</h5>
                    <p>{analysisResult.overallStrategy}</p>
                    <div className="sp-ai-roi-badge">
                      <span>Projected Avg ROI</span>
                      <strong>{analysisResult.projectedTotalROI.toFixed(1)}%</strong>
                    </div>
                  </div>

                  <div className="sp-ai-recommendations">
                    <h5>Recommended Asset Order</h5>
                    <div className="sp-ai-rec-list">
                      {analysisResult.recommendations.map((rec) => (
                        <div key={rec.assetId} className="sp-ai-rec-item">
                          <div className="sp-ai-rec-priority">
                            <span className="sp-ai-priority-num">{rec.priority}</span>
                          </div>
                          <div className="sp-ai-rec-content">
                            <div className="sp-ai-rec-header">
                              <span className="sp-ai-rec-name">{rec.assetName}</span>
                              <span className="sp-ai-rec-timing">{rec.optimalTiming}</span>
                            </div>
                            <p className="sp-ai-rec-reasoning">{rec.reasoning}</p>
                            <div className="sp-ai-rec-meta">
                              <span className="sp-ai-rec-roi">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                  <polyline points="17 6 23 6 23 12" />
                                </svg>
                                {rec.projectedROI}% ROI
                              </span>
                              <span
                                className="sp-ai-rec-risk"
                                style={{ color: getRiskColor(rec.riskLevel) }}
                              >
                                {rec.riskLevel.charAt(0).toUpperCase() + rec.riskLevel.slice(1)} Risk
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sp-ai-market-grid">
                    <div className="sp-ai-market-card">
                      <h5>Market Conditions</h5>
                      <ul>
                        {analysisResult.marketConditions.map((condition, idx) => (
                          <li key={idx}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" width="16" height="16">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                            {condition}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="sp-ai-insights-card">
                      <h5>Time Period Insights</h5>
                      <p>{analysisResult.timePeriodInsights}</p>
                    </div>
                  </div>

                  <div className="sp-ai-actions">
                    <button className="sp-ai-action-btn secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export Report
                    </button>
                    <button className="sp-ai-action-btn primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" />
                        <circle cx="12" cy="12" r="4" />
                      </svg>
                      Apply Recommendations
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
