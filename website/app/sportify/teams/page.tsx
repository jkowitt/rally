"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const teams = [
  {
    id: 1,
    name: "Eagles",
    sport: "Basketball",
    record: "18-4",
    conference: "12-2",
    standing: 1,
    coach: "Coach Williams",
    rosterSize: 15,
    homeVenue: "Main Arena",
    nextGame: "Jan 25 vs Panthers",
    logo: "🦅",
    color: "#8B5CF6"
  },
  {
    id: 2,
    name: "Lions",
    sport: "Football",
    record: "12-2",
    conference: "8-1",
    standing: 1,
    coach: "Coach Martinez",
    rosterSize: 85,
    homeVenue: "Stadium East",
    nextGame: "Jan 27 vs Bears",
    logo: "🦁",
    color: "#F59E0B"
  },
  {
    id: 3,
    name: "Wolves",
    sport: "Soccer",
    record: "14-6-2",
    conference: "9-3-1",
    standing: 2,
    coach: "Coach Thompson",
    rosterSize: 28,
    homeVenue: "Sports Complex",
    nextGame: "Feb 3 vs United",
    logo: "🐺",
    color: "#6366F1"
  },
  {
    id: 4,
    name: "Hawks",
    sport: "Baseball",
    record: "0-0",
    conference: "-",
    standing: "-",
    coach: "Coach Anderson",
    rosterSize: 35,
    homeVenue: "Baseball Stadium",
    nextGame: "Mar 15 vs Cardinals",
    logo: "🦅",
    color: "#EF4444"
  },
  {
    id: 5,
    name: "Tigers",
    sport: "Hockey",
    record: "20-8",
    conference: "14-4",
    standing: 3,
    coach: "Coach Peterson",
    rosterSize: 25,
    homeVenue: "Ice Arena",
    nextGame: "Jan 28 vs Bruins",
    logo: "🐯",
    color: "#F97316"
  },
  {
    id: 6,
    name: "Thunderbolts",
    sport: "Track & Field",
    record: "N/A",
    conference: "N/A",
    standing: "-",
    coach: "Coach Davis",
    rosterSize: 42,
    homeVenue: "Athletic Center",
    nextGame: "Feb 10 Invitational",
    logo: "⚡",
    color: "#3B82F6"
  },
];

const roster = [
  { id: 1, name: "James Mitchell", number: 23, position: "Point Guard", year: "Senior", status: "active" },
  { id: 2, name: "Marcus Johnson", number: 15, position: "Shooting Guard", year: "Junior", status: "active" },
  { id: 3, name: "David Williams", number: 34, position: "Small Forward", year: "Senior", status: "active" },
  { id: 4, name: "Chris Brown", number: 42, position: "Power Forward", year: "Sophomore", status: "injured" },
  { id: 5, name: "Mike Davis", number: 5, position: "Center", year: "Junior", status: "active" },
];

export default function SportifyTeamsPage() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState<typeof teams[0] | null>(null);

  const filteredTeams = selectedSport === "all"
    ? teams
    : teams.filter(t => t.sport.toLowerCase() === selectedSport);

  const totalAthletes = teams.reduce((sum, t) => sum + t.rosterSize, 0);
  const activeTeams = teams.length;

  return (
    <main className="sportify-page sp-teams-page">
      <Header />

      {/* Page Header */}
      <section className="sp-page-header">
        <div className="container">
          <div className="sp-page-header-content">
            <div>
              <div className="sp-breadcrumb">
                <Link href="/sportify">Sportify</Link>
                <span>/</span>
                <Link href="/sportify/dashboard">Dashboard</Link>
                <span>/</span>
                <span>Teams</span>
              </div>
              <h1>Team Management</h1>
              <p>Manage rosters, schedules, and team performance</p>
            </div>
            <div className="sp-page-actions">
              <button className="sp-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Export Rosters
              </button>
              <button className="sp-btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Team
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Team Stats */}
      <section className="sp-stats-section">
        <div className="container">
          <div className="sp-stats-grid">
            <div className="sp-stat-card">
              <div className="sp-stat-icon purple">🏆</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">{activeTeams}</span>
                <span className="sp-stat-label">Active Teams</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon green">👥</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">{totalAthletes}</span>
                <span className="sp-stat-label">Total Athletes</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon blue">🥇</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">3</span>
                <span className="sp-stat-label">Conference Leaders</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon orange">📊</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">78%</span>
                <span className="sp-stat-label">Win Rate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sp-filters-section">
        <div className="container">
          <div className="sp-sport-tabs">
            {["all", "basketball", "football", "soccer", "baseball", "hockey", "track & field"].map((sport) => (
              <button
                key={sport}
                className={`sp-tab ${selectedSport === sport ? "active" : ""}`}
                onClick={() => setSelectedSport(sport)}
              >
                {sport === "all" ? "All Teams" : sport.charAt(0).toUpperCase() + sport.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Teams Grid */}
      <section className="sp-teams-section">
        <div className="container">
          <div className="sp-teams-grid">
            {filteredTeams.map(team => (
              <div
                key={team.id}
                className="sp-team-card"
                style={{ borderTopColor: team.color }}
                onClick={() => setSelectedTeam(team)}
              >
                <div className="sp-team-header">
                  <span className="sp-team-logo">{team.logo}</span>
                  <div className="sp-team-info">
                    <h3>{team.name}</h3>
                    <span className="sp-team-sport">{team.sport}</span>
                  </div>
                  {team.standing !== "-" && (
                    <span className="sp-team-standing">#{team.standing}</span>
                  )}
                </div>
                <div className="sp-team-record">
                  <div className="sp-record-item">
                    <span className="sp-record-value">{team.record}</span>
                    <span className="sp-record-label">Overall</span>
                  </div>
                  <div className="sp-record-item">
                    <span className="sp-record-value">{team.conference}</span>
                    <span className="sp-record-label">Conference</span>
                  </div>
                  <div className="sp-record-item">
                    <span className="sp-record-value">{team.rosterSize}</span>
                    <span className="sp-record-label">Roster</span>
                  </div>
                </div>
                <div className="sp-team-details">
                  <div className="sp-team-detail">
                    <span className="sp-detail-label">Coach</span>
                    <span className="sp-detail-value">{team.coach}</span>
                  </div>
                  <div className="sp-team-detail">
                    <span className="sp-detail-label">Home</span>
                    <span className="sp-detail-value">{team.homeVenue}</span>
                  </div>
                </div>
                <div className="sp-team-next">
                  <span className="sp-next-label">Next:</span>
                  <span className="sp-next-game">{team.nextGame}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Detail Modal */}
      {selectedTeam && (
        <div className="sp-modal-overlay" onClick={() => setSelectedTeam(null)}>
          <div className="sp-modal sp-modal-lg" onClick={(e) => e.stopPropagation()}>
            <button className="sp-modal-close" onClick={() => setSelectedTeam(null)}>×</button>
            <div className="sp-modal-header" style={{ borderLeftColor: selectedTeam.color }}>
              <span className="sp-modal-logo">{selectedTeam.logo}</span>
              <div>
                <h2>{selectedTeam.name}</h2>
                <p>{selectedTeam.sport} • {selectedTeam.coach}</p>
              </div>
            </div>
            <div className="sp-modal-stats">
              <div className="sp-modal-stat">
                <span className="sp-modal-stat-value">{selectedTeam.record}</span>
                <span className="sp-modal-stat-label">Record</span>
              </div>
              <div className="sp-modal-stat">
                <span className="sp-modal-stat-value">{selectedTeam.conference}</span>
                <span className="sp-modal-stat-label">Conference</span>
              </div>
              <div className="sp-modal-stat">
                <span className="sp-modal-stat-value">#{selectedTeam.standing}</span>
                <span className="sp-modal-stat-label">Standing</span>
              </div>
              <div className="sp-modal-stat">
                <span className="sp-modal-stat-value">{selectedTeam.rosterSize}</span>
                <span className="sp-modal-stat-label">Athletes</span>
              </div>
            </div>
            <div className="sp-modal-section">
              <h3>Roster</h3>
              <div className="sp-roster-table">
                <div className="sp-roster-header">
                  <span>#</span>
                  <span>Name</span>
                  <span>Position</span>
                  <span>Year</span>
                  <span>Status</span>
                </div>
                {roster.map(player => (
                  <div key={player.id} className="sp-roster-row">
                    <span className="sp-roster-number">{player.number}</span>
                    <span className="sp-roster-name">{player.name}</span>
                    <span>{player.position}</span>
                    <span>{player.year}</span>
                    <span className={`sp-roster-status ${player.status}`}>{player.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sp-modal-actions">
              <button className="sp-btn secondary">Edit Team</button>
              <button className="sp-btn secondary">Schedule</button>
              <button className="sp-btn primary">Manage Roster</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
