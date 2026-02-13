"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const activities = [
  { id: 1, type: "call", contact: "Sarah Mitchell", company: "Acme Corp", description: "Discovery call - discussed Q1 budget and implementation timeline", duration: "32 min", date: "Jan 22, 2024", time: "2:30 PM", user: "Sarah M." },
  { id: 2, type: "email", contact: "James Wilson", company: "TechStart Inc", description: "Sent detailed proposal with pricing options and implementation roadmap", duration: null, date: "Jan 22, 2024", time: "10:15 AM", user: "James W." },
  { id: 3, type: "meeting", contact: "Emily Chen", company: "Design Studio", description: "Product demo - showcased key features, very positive feedback", duration: "45 min", date: "Jan 21, 2024", time: "3:00 PM", user: "Emily C." },
  { id: 4, type: "note", contact: "David Park", company: "Innovation Labs", description: "New lead from tech conference - expressed interest in enterprise plan", duration: null, date: "Jan 20, 2024", time: "4:45 PM", user: "David P." },
  { id: 5, type: "task", contact: "Michael Brown", company: "Consulting Group", description: "Follow up on outstanding proposal - needs executive approval", duration: null, date: "Jan 20, 2024", time: "9:00 AM", user: "Michael B." },
  { id: 6, type: "call", contact: "Lisa Rodriguez", company: "Marketing Agency", description: "Check-in call - discussed expansion to additional team members", duration: "18 min", date: "Jan 19, 2024", time: "11:30 AM", user: "Lisa R." },
  { id: 7, type: "meeting", contact: "James Wilson", company: "TechStart Inc", description: "Technical deep-dive with their engineering team", duration: "1 hr", date: "Jan 18, 2024", time: "2:00 PM", user: "James W." },
  { id: 8, type: "email", contact: "Sarah Mitchell", company: "Acme Corp", description: "Sent case studies and customer references as requested", duration: null, date: "Jan 18, 2024", time: "9:45 AM", user: "Sarah M." },
];

const upcomingTasks = [
  { id: 1, description: "Follow up with Acme Corp on contract terms", contact: "Sarah Mitchell", dueDate: "Jan 25", priority: "high" },
  { id: 2, description: "Send revised proposal to TechStart", contact: "James Wilson", dueDate: "Jan 26", priority: "high" },
  { id: 3, description: "Schedule demo for Innovation Labs", contact: "David Park", dueDate: "Jan 28", priority: "medium" },
  { id: 4, description: "Quarterly check-in call", contact: "Current Client", dueDate: "Jan 30", priority: "low" },
];

export default function LegacyCRMActivitiesPage() {
  const [selectedType, setSelectedType] = useState("all");
  const [showNewActivity, setShowNewActivity] = useState(false);

  const filteredActivities = selectedType === "all"
    ? activities
    : activities.filter(a => a.type === selectedType);

  const activityCounts = {
    calls: activities.filter(a => a.type === "call").length,
    emails: activities.filter(a => a.type === "email").length,
    meetings: activities.filter(a => a.type === "meeting").length,
    tasks: upcomingTasks.length,
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return "📞";
      case "email": return "📧";
      case "meeting": return "📅";
      case "note": return "📝";
      case "task": return "✅";
      default: return "📌";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "call": return "#10B981";
      case "email": return "#3B82F6";
      case "meeting": return "#8B5CF6";
      case "note": return "#F59E0B";
      case "task": return "#EF4444";
      default: return "#6B7280";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "#EF4444";
      case "medium": return "#F59E0B";
      case "low": return "#10B981";
      default: return "#6B7280";
    }
  };

  return (
    <main className="legacy-crm-page lcrm-activities-page">
      <Header />

      {/* Page Header */}
      <section className="lcrm-page-header">
        <div className="container">
          <div className="lcrm-page-header-content">
            <div>
              <div className="lcrm-breadcrumb">
                <Link href="/legacy-crm">Legacy CRM</Link>
                <span>/</span>
                <Link href="/legacy-crm/dashboard">Dashboard</Link>
                <span>/</span>
                <span>Activities</span>
              </div>
              <h1>Activity Log</h1>
              <p>Track all customer interactions and tasks</p>
            </div>
            <div className="lcrm-page-actions">
              <button className="lcrm-btn primary" onClick={() => setShowNewActivity(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Log Activity
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Activity Stats */}
      <section className="lcrm-stats-section">
        <div className="container">
          <div className="lcrm-stats-grid">
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-icon">📞</span>
              <div>
                <span className="lcrm-stat-value">{activityCounts.calls}</span>
                <span className="lcrm-stat-label">Calls This Week</span>
              </div>
            </div>
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-icon">📧</span>
              <div>
                <span className="lcrm-stat-value">{activityCounts.emails}</span>
                <span className="lcrm-stat-label">Emails Sent</span>
              </div>
            </div>
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-icon">📅</span>
              <div>
                <span className="lcrm-stat-value">{activityCounts.meetings}</span>
                <span className="lcrm-stat-label">Meetings Held</span>
              </div>
            </div>
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-icon">✅</span>
              <div>
                <span className="lcrm-stat-value">{activityCounts.tasks}</span>
                <span className="lcrm-stat-label">Tasks Due</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="lcrm-filters-section">
        <div className="container">
          <div className="lcrm-filters-bar">
            <div className="lcrm-type-filters">
              {["all", "call", "email", "meeting", "note", "task"].map(type => (
                <button
                  key={type}
                  className={`lcrm-filter-btn ${selectedType === type ? "active" : ""}`}
                  onClick={() => setSelectedType(type)}
                >
                  {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
                </button>
              ))}
            </div>
            <div className="lcrm-date-filter">
              <select>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>This Month</option>
                <option>Last Quarter</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="lcrm-activities-layout">
          {/* Activity Timeline */}
          <section className="lcrm-timeline-section">
            <div className="lcrm-timeline">
              {filteredActivities.map(activity => (
                <div key={activity.id} className="lcrm-timeline-item">
                  <div
                    className="lcrm-timeline-icon"
                    style={{ background: getActivityColor(activity.type) }}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="lcrm-timeline-content">
                    <div className="lcrm-timeline-header">
                      <span className="lcrm-timeline-type">{activity.type}</span>
                      <span className="lcrm-timeline-time">{activity.date} at {activity.time}</span>
                    </div>
                    <div className="lcrm-timeline-contact">
                      <strong>{activity.contact}</strong> • {activity.company}
                    </div>
                    <p className="lcrm-timeline-desc">{activity.description}</p>
                    <div className="lcrm-timeline-footer">
                      {activity.duration && <span className="lcrm-timeline-duration">⏱ {activity.duration}</span>}
                      <span className="lcrm-timeline-user">by {activity.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming Tasks Sidebar */}
          <aside className="lcrm-tasks-sidebar">
            <div className="lcrm-section-card">
              <h3>Upcoming Tasks</h3>
              <div className="lcrm-tasks-list">
                {upcomingTasks.map(task => (
                  <div key={task.id} className="lcrm-task-item">
                    <div className="lcrm-task-checkbox">
                      <input type="checkbox" />
                    </div>
                    <div className="lcrm-task-content">
                      <p className="lcrm-task-desc">{task.description}</p>
                      <span className="lcrm-task-contact">{task.contact}</span>
                    </div>
                    <div className="lcrm-task-meta">
                      <span className="lcrm-task-date">{task.dueDate}</span>
                      <span
                        className="lcrm-task-priority"
                        style={{ background: getPriorityColor(task.priority) }}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="lcrm-btn secondary lcrm-btn-full">+ Add Task</button>
            </div>
          </aside>
        </div>
      </div>

      {/* New Activity Modal */}
      {showNewActivity && (
        <div className="lcrm-modal-overlay" onClick={() => setShowNewActivity(false)}>
          <div className="lcrm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lcrm-modal-close" onClick={() => setShowNewActivity(false)}>×</button>
            <h2>Log Activity</h2>
            <form className="lcrm-form">
              <div className="lcrm-form-group">
                <label>Activity Type</label>
                <div className="lcrm-activity-types">
                  {["call", "email", "meeting", "note", "task"].map(type => (
                    <label key={type} className="lcrm-activity-type-option">
                      <input type="radio" name="type" value={type} />
                      <span className="lcrm-activity-type-icon">{getActivityIcon(type)}</span>
                      <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="lcrm-form-group">
                <label>Contact</label>
                <select>
                  <option value="">Select contact...</option>
                  <option>Sarah Mitchell - Acme Corp</option>
                  <option>James Wilson - TechStart Inc</option>
                  <option>Emily Chen - Design Studio</option>
                  <option>David Park - Innovation Labs</option>
                </select>
              </div>
              <div className="lcrm-form-row">
                <div className="lcrm-form-group">
                  <label>Date</label>
                  <input type="date" />
                </div>
                <div className="lcrm-form-group">
                  <label>Time</label>
                  <input type="time" />
                </div>
              </div>
              <div className="lcrm-form-group">
                <label>Description</label>
                <textarea placeholder="What happened during this activity?" rows={4}></textarea>
              </div>
              <div className="lcrm-form-group">
                <label>Duration (optional)</label>
                <input type="text" placeholder="e.g., 30 min" />
              </div>
              <div className="lcrm-form-actions">
                <button type="button" className="lcrm-btn ghost" onClick={() => setShowNewActivity(false)}>Cancel</button>
                <button type="submit" className="lcrm-btn primary">Log Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
