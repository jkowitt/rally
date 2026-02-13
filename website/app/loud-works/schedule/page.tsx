"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const shifts = [
  { id: 1, worker: "Marcus Johnson", role: "Senior Operator", project: "Highway 290 Expansion", date: "Mon, Jan 22", startTime: "6:00 AM", endTime: "2:30 PM", hours: 8.5, status: "completed" },
  { id: 2, worker: "David Rodriguez", role: "Equipment Operator", project: "Highway 290 Expansion", date: "Mon, Jan 22", startTime: "6:00 AM", endTime: "2:30 PM", hours: 8.5, status: "completed" },
  { id: 3, worker: "Sarah Chen", role: "Project Coordinator", project: "Downtown Office Complex", date: "Mon, Jan 22", startTime: "8:00 AM", endTime: "5:00 PM", hours: 9, status: "completed" },
  { id: 4, worker: "Marcus Johnson", role: "Senior Operator", project: "Industrial Park Phase 2", date: "Tue, Jan 23", startTime: "6:00 AM", endTime: "2:30 PM", hours: 8.5, status: "scheduled" },
  { id: 5, worker: "Lisa Thompson", role: "Fleet Manager", project: "Equipment Yard", date: "Tue, Jan 23", startTime: "7:00 AM", endTime: "3:30 PM", hours: 8.5, status: "scheduled" },
  { id: 6, worker: "James Wilson", role: "Apprentice", project: "Highway 290 Expansion", date: "Tue, Jan 23", startTime: "6:00 AM", endTime: "2:30 PM", hours: 8.5, status: "scheduled" },
  { id: 7, worker: "Emily Watson", role: "Safety Coordinator", project: "All Sites", date: "Tue, Jan 23", startTime: "7:00 AM", endTime: "4:00 PM", hours: 9, status: "scheduled" },
  { id: 8, worker: "David Rodriguez", role: "Equipment Operator", project: "Downtown Office Complex", date: "Wed, Jan 24", startTime: "6:00 AM", endTime: "4:30 PM", hours: 10.5, status: "scheduled" },
];

const projects = [
  { id: 1, name: "Highway 290 Expansion", location: "Austin, TX", workers: 12, status: "active", startDate: "Jan 15", endDate: "Mar 30" },
  { id: 2, name: "Downtown Office Complex", location: "Austin, TX", workers: 8, status: "active", startDate: "Dec 1", endDate: "Jun 15" },
  { id: 3, name: "Industrial Park Phase 2", location: "Round Rock, TX", workers: 6, status: "active", startDate: "Jan 8", endDate: "Apr 20" },
  { id: 4, name: "Residential Development", location: "Cedar Park, TX", workers: 4, status: "upcoming", startDate: "Feb 1", endDate: "Aug 30" },
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekDates = ["Jan 22", "Jan 23", "Jan 24", "Jan 25", "Jan 26", "Jan 27", "Jan 28"];

export default function LoudWorksSchedulePage() {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedProject, setSelectedProject] = useState("all");

  const filteredShifts = selectedProject === "all"
    ? shifts
    : shifts.filter(s => s.project.toLowerCase().includes(selectedProject.toLowerCase()));

  const totalScheduledHours = shifts.filter(s => s.status === "scheduled").reduce((sum, s) => sum + s.hours, 0);
  const totalCompletedHours = shifts.filter(s => s.status === "completed").reduce((sum, s) => sum + s.hours, 0);
  const activeWorkers = new Set(shifts.map(s => s.worker)).size;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "#10B981";
      case "scheduled": return "#3B82F6";
      case "in-progress": return "#F59E0B";
      case "cancelled": return "#EF4444";
      default: return "#6B7280";
    }
  };

  return (
    <main className="loud-works-page lw-schedule-page">
      <Header />

      {/* Page Header */}
      <section className="lw-page-header">
        <div className="container">
          <div className="lw-page-header-content">
            <div>
              <div className="lw-breadcrumb">
                <Link href="/loud-works">Loud Works</Link>
                <span>/</span>
                <Link href="/loud-works/dashboard">Dashboard</Link>
                <span>/</span>
                <span>Schedule</span>
              </div>
              <h1>Workforce Schedule</h1>
              <p>Plan and manage shift assignments</p>
            </div>
            <div className="lw-page-actions">
              <div className="lw-view-toggle">
                <button
                  className={`lw-view-btn ${viewMode === "calendar" ? "active" : ""}`}
                  onClick={() => setViewMode("calendar")}
                >
                  Calendar
                </button>
                <button
                  className={`lw-view-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  List
                </button>
              </div>
              <button className="lw-btn primary" onClick={() => setShowAddShift(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Shift
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="lw-stats-section">
        <div className="container">
          <div className="lw-stats-grid">
            <div className="lw-stat-card">
              <span className="lw-stat-value">{shifts.length}</span>
              <span className="lw-stat-label">Total Shifts</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value">{activeWorkers}</span>
              <span className="lw-stat-label">Workers Scheduled</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: "#3B82F6" }}>{totalScheduledHours}h</span>
              <span className="lw-stat-label">Scheduled Hours</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: "#10B981" }}>{totalCompletedHours}h</span>
              <span className="lw-stat-label">Completed Hours</span>
            </div>
          </div>
        </div>
      </section>

      {/* Project Filter */}
      <section className="lw-filters-section">
        <div className="container">
          <div className="lw-filters-bar">
            <div className="lw-project-filters">
              <button
                className={`lw-filter-btn ${selectedProject === "all" ? "active" : ""}`}
                onClick={() => setSelectedProject("all")}
              >
                All Projects
              </button>
              {projects.filter(p => p.status === "active").map(project => (
                <button
                  key={project.id}
                  className={`lw-filter-btn ${selectedProject === project.name ? "active" : ""}`}
                  onClick={() => setSelectedProject(project.name)}
                >
                  {project.name}
                </button>
              ))}
            </div>
            <div className="lw-week-nav">
              <button className="lw-nav-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <polyline points="15,18 9,12 15,6" />
                </svg>
              </button>
              <span className="lw-week-label">Week of Jan 22, 2024</span>
              <button className="lw-nav-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <polyline points="9,6 15,12 9,18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule View */}
      <section className="lw-schedule-section">
        <div className="container">
          {viewMode === "calendar" ? (
            <div className="lw-schedule-calendar">
              <div className="lw-calendar-header">
                {weekDays.map((day, i) => (
                  <div key={day} className="lw-calendar-day-header">
                    <span className="lw-day-name">{day}</span>
                    <span className="lw-day-date">{weekDates[i]}</span>
                  </div>
                ))}
              </div>
              <div className="lw-calendar-body">
                {weekDays.map((day, dayIndex) => {
                  const dayShifts = filteredShifts.filter(s => s.date.startsWith(day));
                  return (
                    <div key={day} className="lw-calendar-day">
                      {dayShifts.length > 0 ? (
                        dayShifts.map(shift => (
                          <div
                            key={shift.id}
                            className="lw-calendar-shift"
                            style={{ borderLeftColor: getStatusColor(shift.status) }}
                          >
                            <span className="lw-shift-worker">{shift.worker}</span>
                            <span className="lw-shift-project">{shift.project}</span>
                            <span className="lw-shift-time">{shift.startTime} - {shift.endTime}</span>
                          </div>
                        ))
                      ) : (
                        <div className="lw-calendar-empty">No shifts</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="lw-schedule-table">
              <div className="lw-schedule-table-header">
                <span>Worker</span>
                <span>Role</span>
                <span>Project</span>
                <span>Date</span>
                <span>Time</span>
                <span>Hours</span>
                <span>Status</span>
              </div>
              {filteredShifts.map(shift => (
                <div key={shift.id} className="lw-schedule-table-row">
                  <span className="lw-table-worker">{shift.worker}</span>
                  <span>{shift.role}</span>
                  <span className="lw-table-project">{shift.project}</span>
                  <span>{shift.date}</span>
                  <span>{shift.startTime} - {shift.endTime}</span>
                  <span>{shift.hours}h</span>
                  <span
                    className="lw-table-status"
                    style={{ background: getStatusColor(shift.status) }}
                  >
                    {shift.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Active Projects */}
      <section className="lw-projects-section">
        <div className="container">
          <div className="lw-section-card">
            <div className="lw-section-header">
              <h3>Active Projects</h3>
              <Link href="/loud-works/projects" className="lw-link">View All</Link>
            </div>
            <div className="lw-projects-grid">
              {projects.filter(p => p.status === "active").map(project => (
                <div key={project.id} className="lw-project-card">
                  <div className="lw-project-header">
                    <h4>{project.name}</h4>
                    <span className="lw-project-status">{project.status}</span>
                  </div>
                  <p className="lw-project-location">{project.location}</p>
                  <div className="lw-project-details">
                    <div className="lw-project-detail">
                      <span className="lw-detail-label">Workers</span>
                      <span className="lw-detail-value">{project.workers}</span>
                    </div>
                    <div className="lw-project-detail">
                      <span className="lw-detail-label">Timeline</span>
                      <span className="lw-detail-value">{project.startDate} - {project.endDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Add Shift Modal */}
      {showAddShift && (
        <div className="lw-modal-overlay" onClick={() => setShowAddShift(false)}>
          <div className="lw-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lw-modal-close" onClick={() => setShowAddShift(false)}>×</button>
            <h2>Add Shift</h2>
            <form className="lw-form">
              <div className="lw-form-group">
                <label>Worker</label>
                <select>
                  <option value="">Select worker...</option>
                  <option>Marcus Johnson</option>
                  <option>David Rodriguez</option>
                  <option>Sarah Chen</option>
                  <option>Lisa Thompson</option>
                  <option>James Wilson</option>
                  <option>Emily Watson</option>
                </select>
              </div>
              <div className="lw-form-group">
                <label>Project</label>
                <select>
                  {projects.map(project => (
                    <option key={project.id} value={project.name}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div className="lw-form-group">
                <label>Date</label>
                <input type="date" />
              </div>
              <div className="lw-form-row">
                <div className="lw-form-group">
                  <label>Start Time</label>
                  <input type="time" />
                </div>
                <div className="lw-form-group">
                  <label>End Time</label>
                  <input type="time" />
                </div>
              </div>
              <div className="lw-form-group">
                <label>Notes</label>
                <textarea placeholder="Special instructions or notes..." rows={2}></textarea>
              </div>
              <div className="lw-form-actions">
                <button type="button" className="lw-btn ghost" onClick={() => setShowAddShift(false)}>Cancel</button>
                <button type="submit" className="lw-btn primary">Add Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
