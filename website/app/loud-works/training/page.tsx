"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const trainingCourses = [
  { id: 1, name: "OSHA 30-Hour Construction", category: "Safety", duration: "30 hours", format: "Online + In-Person", required: true, enrolled: 8, completed: 45, nextSession: "Feb 1, 2024", instructor: "Emily Watson" },
  { id: 2, name: "Forklift Certification", category: "Equipment", duration: "8 hours", format: "In-Person", required: true, enrolled: 4, completed: 32, nextSession: "Jan 28, 2024", instructor: "Marcus Johnson" },
  { id: 3, name: "CDL-A Preparation", category: "Licensing", duration: "40 hours", format: "In-Person", required: false, enrolled: 2, completed: 15, nextSession: "Feb 15, 2024", instructor: "External" },
  { id: 4, name: "First Aid & CPR", category: "Safety", duration: "4 hours", format: "In-Person", required: true, enrolled: 12, completed: 58, nextSession: "Jan 30, 2024", instructor: "External" },
  { id: 5, name: "Heavy Equipment Operation", category: "Equipment", duration: "24 hours", format: "In-Person", required: false, enrolled: 3, completed: 22, nextSession: "Feb 10, 2024", instructor: "David Rodriguez" },
  { id: 6, name: "AWS Welding Certification", category: "Technical", duration: "60 hours", format: "In-Person", required: false, enrolled: 2, completed: 8, nextSession: "Mar 1, 2024", instructor: "Michael Brown" },
];

const trainingRecords = [
  { id: 1, worker: "Marcus Johnson", course: "OSHA 30-Hour Construction", status: "completed", completedDate: "Dec 15, 2023", expiresDate: "Dec 15, 2028", score: 94 },
  { id: 2, worker: "James Wilson", course: "OSHA 10-Hour Construction", status: "completed", completedDate: "Nov 20, 2023", expiresDate: "Nov 20, 2028", score: 88 },
  { id: 3, worker: "David Rodriguez", course: "Forklift Certification", status: "in-progress", completedDate: null, expiresDate: null, score: null },
  { id: 4, worker: "Sarah Chen", course: "First Aid & CPR", status: "completed", completedDate: "Jan 10, 2024", expiresDate: "Jan 10, 2026", score: 100 },
  { id: 5, worker: "Lisa Thompson", course: "CDL-A Preparation", status: "enrolled", completedDate: null, expiresDate: null, score: null },
  { id: 6, worker: "Emily Watson", course: "OSHA 500 Trainer", status: "completed", completedDate: "Oct 5, 2023", expiresDate: "Oct 5, 2027", score: 98 },
  { id: 7, worker: "Marcus Johnson", course: "Heavy Equipment Operation", status: "completed", completedDate: "Aug 20, 2023", expiresDate: null, score: 92 },
  { id: 8, worker: "James Wilson", course: "Forklift Certification", status: "enrolled", completedDate: null, expiresDate: null, score: null },
];

const upcomingSessions = [
  { id: 1, course: "Forklift Certification", date: "Jan 28, 2024", time: "8:00 AM - 4:00 PM", location: "Training Center A", enrolled: 4, capacity: 8 },
  { id: 2, course: "First Aid & CPR", date: "Jan 30, 2024", time: "9:00 AM - 1:00 PM", location: "Main Office", enrolled: 12, capacity: 15 },
  { id: 3, course: "OSHA 30-Hour Construction", date: "Feb 1, 2024", time: "8:00 AM - 5:00 PM", location: "Online + Training Center B", enrolled: 8, capacity: 20 },
];

const categories = ["All", "Safety", "Equipment", "Technical", "Licensing"];

export default function LoudWorksTrainingPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCourse, setSelectedCourse] = useState<typeof trainingCourses[0] | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"courses" | "records">("courses");

  const filteredCourses = selectedCategory === "All"
    ? trainingCourses
    : trainingCourses.filter(c => c.category === selectedCategory);

  const totalEnrolled = trainingCourses.reduce((sum, c) => sum + c.enrolled, 0);
  const totalCompleted = trainingRecords.filter(r => r.status === "completed").length;
  const expiringCerts = trainingRecords.filter(r => {
    if (!r.expiresDate) return false;
    const expDate = new Date(r.expiresDate);
    const today = new Date();
    const thirtyDays = new Date(today.setDate(today.getDate() + 30));
    return expDate <= thirtyDays && r.status === "completed";
  }).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "#10B981";
      case "in-progress": return "#F59E0B";
      case "enrolled": return "#3B82F6";
      case "expired": return "#EF4444";
      default: return "#6B7280";
    }
  };

  return (
    <main className="loud-works-page lw-training-page">
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
                <span>Training</span>
              </div>
              <h1>Training & Certifications</h1>
              <p>Manage workforce development and compliance</p>
            </div>
            <div className="lw-page-actions">
              <button className="lw-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Records
              </button>
              <button className="lw-btn primary" onClick={() => setShowEnrollModal(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Enroll Workers
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
              <span className="lw-stat-value">{trainingCourses.length}</span>
              <span className="lw-stat-label">Available Courses</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: "#3B82F6" }}>{totalEnrolled}</span>
              <span className="lw-stat-label">Currently Enrolled</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: "#10B981" }}>{totalCompleted}</span>
              <span className="lw-stat-label">Certifications Earned</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: expiringCerts > 0 ? "#EF4444" : "#6B7280" }}>{expiringCerts}</span>
              <span className="lw-stat-label">Expiring Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Sessions */}
      <section className="lw-sessions-section">
        <div className="container">
          <div className="lw-section-card">
            <div className="lw-section-header">
              <h3>Upcoming Training Sessions</h3>
              <Link href="/loud-works/training/calendar" className="lw-link">View Calendar</Link>
            </div>
            <div className="lw-sessions-grid">
              {upcomingSessions.map(session => (
                <div key={session.id} className="lw-session-card">
                  <div className="lw-session-header">
                    <h4>{session.course}</h4>
                    <span className="lw-session-capacity">{session.enrolled}/{session.capacity}</span>
                  </div>
                  <div className="lw-session-details">
                    <div className="lw-session-detail">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{session.date}</span>
                    </div>
                    <div className="lw-session-detail">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                      <span>{session.time}</span>
                    </div>
                    <div className="lw-session-detail">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{session.location}</span>
                    </div>
                  </div>
                  <button className="lw-btn secondary lw-btn-sm">Enroll Workers</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="lw-tabs-section">
        <div className="container">
          <div className="lw-tabs">
            <button
              className={`lw-tab ${activeTab === "courses" ? "active" : ""}`}
              onClick={() => setActiveTab("courses")}
            >
              Training Courses
            </button>
            <button
              className={`lw-tab ${activeTab === "records" ? "active" : ""}`}
              onClick={() => setActiveTab("records")}
            >
              Training Records
            </button>
          </div>
        </div>
      </section>

      {activeTab === "courses" ? (
        <>
          {/* Category Filters */}
          <section className="lw-filters-section">
            <div className="container">
              <div className="lw-filters-bar">
                <div className="lw-category-filters">
                  {categories.map(category => (
                    <button
                      key={category}
                      className={`lw-filter-btn ${selectedCategory === category ? "active" : ""}`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Courses Grid */}
          <section className="lw-courses-section">
            <div className="container">
              <div className="lw-courses-grid">
                {filteredCourses.map(course => (
                  <div
                    key={course.id}
                    className="lw-course-card"
                    onClick={() => setSelectedCourse(course)}
                  >
                    <div className="lw-course-header">
                      <span className="lw-course-category">{course.category}</span>
                      {course.required && <span className="lw-required-badge">Required</span>}
                    </div>
                    <h4>{course.name}</h4>
                    <div className="lw-course-meta">
                      <span>{course.duration}</span>
                      <span>•</span>
                      <span>{course.format}</span>
                    </div>
                    <div className="lw-course-stats">
                      <div className="lw-course-stat">
                        <span className="lw-stat-num">{course.enrolled}</span>
                        <span className="lw-stat-text">Enrolled</span>
                      </div>
                      <div className="lw-course-stat">
                        <span className="lw-stat-num">{course.completed}</span>
                        <span className="lw-stat-text">Completed</span>
                      </div>
                    </div>
                    <div className="lw-course-footer">
                      <span className="lw-course-next">Next: {course.nextSession}</span>
                      <span className="lw-course-instructor">{course.instructor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        /* Training Records Table */
        <section className="lw-records-section">
          <div className="container">
            <div className="lw-records-table">
              <div className="lw-records-table-header">
                <span>Worker</span>
                <span>Course</span>
                <span>Status</span>
                <span>Completed</span>
                <span>Expires</span>
                <span>Score</span>
              </div>
              {trainingRecords.map(record => (
                <div key={record.id} className="lw-records-table-row">
                  <span className="lw-table-worker">{record.worker}</span>
                  <span>{record.course}</span>
                  <span
                    className="lw-table-status"
                    style={{ background: getStatusColor(record.status) }}
                  >
                    {record.status}
                  </span>
                  <span>{record.completedDate || "—"}</span>
                  <span className={record.expiresDate ? "" : "lw-text-muted"}>
                    {record.expiresDate || "N/A"}
                  </span>
                  <span>{record.score ? `${record.score}%` : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="lw-modal-overlay" onClick={() => setSelectedCourse(null)}>
          <div className="lw-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lw-modal-close" onClick={() => setSelectedCourse(null)}>×</button>
            <div className="lw-modal-header">
              <div>
                <span className="lw-modal-category">{selectedCourse.category}</span>
                <h2>{selectedCourse.name}</h2>
              </div>
              {selectedCourse.required && <span className="lw-required-badge">Required</span>}
            </div>
            <div className="lw-modal-details">
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Duration</span>
                <span className="lw-detail-value">{selectedCourse.duration}</span>
              </div>
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Format</span>
                <span className="lw-detail-value">{selectedCourse.format}</span>
              </div>
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Instructor</span>
                <span className="lw-detail-value">{selectedCourse.instructor}</span>
              </div>
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Next Session</span>
                <span className="lw-detail-value">{selectedCourse.nextSession}</span>
              </div>
            </div>
            <div className="lw-modal-stats">
              <div className="lw-modal-stat">
                <span className="lw-modal-stat-value">{selectedCourse.enrolled}</span>
                <span className="lw-modal-stat-label">Currently Enrolled</span>
              </div>
              <div className="lw-modal-stat">
                <span className="lw-modal-stat-value">{selectedCourse.completed}</span>
                <span className="lw-modal-stat-label">Total Completed</span>
              </div>
            </div>
            <div className="lw-modal-actions">
              <button className="lw-btn secondary">View Enrolled</button>
              <button className="lw-btn primary">Enroll Workers</button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="lw-modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="lw-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lw-modal-close" onClick={() => setShowEnrollModal(false)}>×</button>
            <h2>Enroll Workers in Training</h2>
            <form className="lw-form">
              <div className="lw-form-group">
                <label>Training Course</label>
                <select>
                  {trainingCourses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
              <div className="lw-form-group">
                <label>Session Date</label>
                <select>
                  {upcomingSessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.course} - {session.date}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lw-form-group">
                <label>Select Workers</label>
                <div className="lw-checkbox-list">
                  <label className="lw-checkbox-item">
                    <input type="checkbox" />
                    <span>Marcus Johnson</span>
                  </label>
                  <label className="lw-checkbox-item">
                    <input type="checkbox" />
                    <span>David Rodriguez</span>
                  </label>
                  <label className="lw-checkbox-item">
                    <input type="checkbox" />
                    <span>James Wilson</span>
                  </label>
                  <label className="lw-checkbox-item">
                    <input type="checkbox" />
                    <span>Sarah Chen</span>
                  </label>
                  <label className="lw-checkbox-item">
                    <input type="checkbox" />
                    <span>Lisa Thompson</span>
                  </label>
                </div>
              </div>
              <div className="lw-form-group">
                <label>Notes</label>
                <textarea placeholder="Any special requirements..." rows={2}></textarea>
              </div>
              <div className="lw-form-actions">
                <button type="button" className="lw-btn ghost" onClick={() => setShowEnrollModal(false)}>Cancel</button>
                <button type="submit" className="lw-btn primary">Enroll Workers</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
