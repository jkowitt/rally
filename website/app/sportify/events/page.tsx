"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const events = [
  {
    id: 1,
    name: "Championship Finals",
    sport: "Basketball",
    date: "Jan 25, 2024",
    time: "7:00 PM",
    venue: "Main Arena",
    ticketsSold: 8500,
    capacity: 10000,
    revenue: 382500,
    status: "on-sale",
    type: "playoff",
    sponsorActivations: 12,
    staffAssigned: 45
  },
  {
    id: 2,
    name: "Regional Playoffs",
    sport: "Football",
    date: "Jan 27, 2024",
    time: "3:00 PM",
    venue: "Stadium East",
    ticketsSold: 22000,
    capacity: 25000,
    revenue: 1100000,
    status: "on-sale",
    type: "playoff",
    sponsorActivations: 18,
    staffAssigned: 120
  },
  {
    id: 3,
    name: "Spring Tournament",
    sport: "Soccer",
    date: "Feb 3, 2024",
    time: "1:00 PM",
    venue: "Sports Complex",
    ticketsSold: 4200,
    capacity: 8000,
    revenue: 126000,
    status: "on-sale",
    type: "tournament",
    sponsorActivations: 8,
    staffAssigned: 32
  },
  {
    id: 4,
    name: "Invitational Meet",
    sport: "Track & Field",
    date: "Feb 10, 2024",
    time: "9:00 AM",
    venue: "Athletic Center",
    ticketsSold: 1800,
    capacity: 5000,
    revenue: 36000,
    status: "upcoming",
    type: "invitational",
    sponsorActivations: 5,
    staffAssigned: 25
  },
  {
    id: 5,
    name: "Rivalry Game",
    sport: "Basketball",
    date: "Feb 15, 2024",
    time: "8:00 PM",
    venue: "Main Arena",
    ticketsSold: 9800,
    capacity: 10000,
    revenue: 490000,
    status: "sold-out",
    type: "regular",
    sponsorActivations: 15,
    staffAssigned: 50
  },
  {
    id: 6,
    name: "Alumni Weekend",
    sport: "Multiple",
    date: "Feb 24, 2024",
    time: "All Day",
    venue: "Campus Wide",
    ticketsSold: 3500,
    capacity: 5000,
    revenue: 87500,
    status: "on-sale",
    type: "special",
    sponsorActivations: 20,
    staffAssigned: 80
  },
];

const sponsors = [
  { id: 1, name: "Nike", activations: 45, value: 250000, status: "active" },
  { id: 2, name: "Gatorade", activations: 38, value: 150000, status: "active" },
  { id: 3, name: "State Farm", activations: 22, value: 180000, status: "active" },
  { id: 4, name: "Local Bank Corp", activations: 15, value: 75000, status: "active" },
];

export default function SportifyEventsPage() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showNewEventModal, setShowNewEventModal] = useState(false);

  const filteredEvents = events.filter(event => {
    if (selectedSport !== "all" && event.sport.toLowerCase() !== selectedSport) return false;
    if (selectedStatus !== "all" && event.status !== selectedStatus) return false;
    return true;
  });

  const totalRevenue = events.reduce((sum, e) => sum + e.revenue, 0);
  const totalTickets = events.reduce((sum, e) => sum + e.ticketsSold, 0);
  const totalCapacity = events.reduce((sum, e) => sum + e.capacity, 0);
  const avgOccupancy = Math.round((totalTickets / totalCapacity) * 100);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case "basketball": return "🏀";
      case "football": return "🏈";
      case "soccer": return "⚽";
      case "track & field": return "🏃";
      case "multiple": return "🏆";
      default: return "🎯";
    }
  };

  return (
    <main className="sportify-page sp-events-page">
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
                <span>Events</span>
              </div>
              <h1>Event Management</h1>
              <p>Schedule, manage, and track all athletic events</p>
            </div>
            <div className="sp-page-actions">
              <button className="sp-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Calendar View
              </button>
              <button className="sp-btn primary" onClick={() => setShowNewEventModal(true)}>
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

      {/* Event Stats */}
      <section className="sp-stats-section">
        <div className="container">
          <div className="sp-stats-grid">
            <div className="sp-stat-card">
              <div className="sp-stat-icon orange">🎫</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">{(totalTickets / 1000).toFixed(1)}K</span>
                <span className="sp-stat-label">Tickets Sold</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon green">💰</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">{formatCurrency(totalRevenue)}</span>
                <span className="sp-stat-label">Ticket Revenue</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon blue">📊</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">{avgOccupancy}%</span>
                <span className="sp-stat-label">Avg Occupancy</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon purple">📅</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">{events.length}</span>
                <span className="sp-stat-label">Upcoming Events</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sp-filters-section">
        <div className="container">
          <div className="sp-filters-bar">
            <div className="sp-filter-group">
              <select
                className="sp-select"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
              >
                <option value="all">All Sports</option>
                <option value="basketball">Basketball</option>
                <option value="football">Football</option>
                <option value="soccer">Soccer</option>
                <option value="track & field">Track & Field</option>
              </select>
              <select
                className="sp-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="on-sale">On Sale</option>
                <option value="sold-out">Sold Out</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
            <div className="sp-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search events..." />
            </div>
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="sp-events-section">
        <div className="container">
          <div className="sp-events-grid">
            {filteredEvents.map(event => (
              <div key={event.id} className="sp-event-card">
                <div className="sp-event-header">
                  <span className="sp-event-sport">{getSportIcon(event.sport)}</span>
                  <span className={`sp-event-status ${event.status}`}>
                    {event.status === "on-sale" ? "On Sale" : event.status === "sold-out" ? "Sold Out" : "Upcoming"}
                  </span>
                </div>
                <h3>{event.name}</h3>
                <p className="sp-event-venue">{event.venue}</p>
                <div className="sp-event-datetime">
                  <span>{event.date}</span>
                  <span>{event.time}</span>
                </div>
                <div className="sp-event-progress">
                  <div className="sp-progress-bar">
                    <div
                      className="sp-progress-fill"
                      style={{ width: `${(event.ticketsSold / event.capacity) * 100}%` }}
                    />
                  </div>
                  <span className="sp-progress-text">
                    {(event.ticketsSold / 1000).toFixed(1)}K / {(event.capacity / 1000).toFixed(0)}K tickets
                  </span>
                </div>
                <div className="sp-event-metrics">
                  <div className="sp-event-metric">
                    <span className="sp-metric-value">{formatCurrency(event.revenue)}</span>
                    <span className="sp-metric-label">Revenue</span>
                  </div>
                  <div className="sp-event-metric">
                    <span className="sp-metric-value">{event.sponsorActivations}</span>
                    <span className="sp-metric-label">Activations</span>
                  </div>
                  <div className="sp-event-metric">
                    <span className="sp-metric-value">{event.staffAssigned}</span>
                    <span className="sp-metric-label">Staff</span>
                  </div>
                </div>
                <div className="sp-event-actions">
                  <button className="sp-btn-sm secondary">Edit</button>
                  <button className="sp-btn-sm primary">Manage</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsor Overview */}
      <section className="sp-sponsors-section">
        <div className="container">
          <div className="sp-section-card">
            <div className="sp-section-header">
              <h2>Sponsor Activations</h2>
              <Link href="/sportify/sponsors" className="sp-link">Manage Sponsors</Link>
            </div>
            <div className="sp-sponsors-grid">
              {sponsors.map(sponsor => (
                <div key={sponsor.id} className="sp-sponsor-card">
                  <div className="sp-sponsor-header">
                    <h4>{sponsor.name}</h4>
                    <span className={`sp-sponsor-status ${sponsor.status}`}>{sponsor.status}</span>
                  </div>
                  <div className="sp-sponsor-metrics">
                    <div>
                      <span className="sp-sponsor-value">{sponsor.activations}</span>
                      <span className="sp-sponsor-label">Activations</span>
                    </div>
                    <div>
                      <span className="sp-sponsor-value">{formatCurrency(sponsor.value)}</span>
                      <span className="sp-sponsor-label">Value</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="sp-modal-overlay" onClick={() => setShowNewEventModal(false)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <button className="sp-modal-close" onClick={() => setShowNewEventModal(false)}>×</button>
            <h2>Create New Event</h2>
            <form className="sp-form">
              <div className="sp-form-group">
                <label>Event Name</label>
                <input type="text" placeholder="Enter event name" />
              </div>
              <div className="sp-form-row">
                <div className="sp-form-group">
                  <label>Sport</label>
                  <select>
                    <option>Basketball</option>
                    <option>Football</option>
                    <option>Soccer</option>
                    <option>Track & Field</option>
                  </select>
                </div>
                <div className="sp-form-group">
                  <label>Event Type</label>
                  <select>
                    <option>Regular Season</option>
                    <option>Playoff</option>
                    <option>Tournament</option>
                    <option>Special Event</option>
                  </select>
                </div>
              </div>
              <div className="sp-form-row">
                <div className="sp-form-group">
                  <label>Date</label>
                  <input type="date" />
                </div>
                <div className="sp-form-group">
                  <label>Time</label>
                  <input type="time" />
                </div>
              </div>
              <div className="sp-form-row">
                <div className="sp-form-group">
                  <label>Venue</label>
                  <select>
                    <option>Main Arena</option>
                    <option>Stadium East</option>
                    <option>Sports Complex</option>
                    <option>Athletic Center</option>
                  </select>
                </div>
                <div className="sp-form-group">
                  <label>Capacity</label>
                  <input type="number" placeholder="10000" />
                </div>
              </div>
              <div className="sp-form-actions">
                <button type="button" className="sp-btn secondary" onClick={() => setShowNewEventModal(false)}>Cancel</button>
                <button type="submit" className="sp-btn primary">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
