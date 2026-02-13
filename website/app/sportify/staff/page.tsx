"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const staff = [
  {
    id: 1,
    name: "Coach Williams",
    role: "Head Basketball Coach",
    department: "Athletics",
    email: "williams@university.edu",
    phone: "(512) 555-0101",
    hireDate: "Aug 2018",
    status: "active",
    certifications: ["NCAA Certified", "CPR/AED"],
    avatar: "CW"
  },
  {
    id: 2,
    name: "Coach Martinez",
    role: "Head Football Coach",
    department: "Athletics",
    email: "martinez@university.edu",
    phone: "(512) 555-0102",
    hireDate: "Jan 2020",
    status: "active",
    certifications: ["NCAA Certified", "CPR/AED", "Strength Training"],
    avatar: "CM"
  },
  {
    id: 3,
    name: "Sarah Johnson",
    role: "Athletic Director",
    department: "Administration",
    email: "sjohnson@university.edu",
    phone: "(512) 555-0103",
    hireDate: "Mar 2017",
    status: "active",
    certifications: ["NCAA Compliance", "Title IX Coordinator"],
    avatar: "SJ"
  },
  {
    id: 4,
    name: "Mike Chen",
    role: "Equipment Manager",
    department: "Operations",
    email: "mchen@university.edu",
    phone: "(512) 555-0104",
    hireDate: "Jun 2019",
    status: "active",
    certifications: ["Inventory Management"],
    avatar: "MC"
  },
  {
    id: 5,
    name: "Emily Rodriguez",
    role: "Sports Medicine Director",
    department: "Medical",
    email: "erodriguez@university.edu",
    phone: "(512) 555-0105",
    hireDate: "Aug 2016",
    status: "active",
    certifications: ["ATC Certified", "CPR/AED", "Emergency Response"],
    avatar: "ER"
  },
  {
    id: 6,
    name: "David Thompson",
    role: "Event Coordinator",
    department: "Events",
    email: "dthompson@university.edu",
    phone: "(512) 555-0106",
    hireDate: "Sep 2021",
    status: "active",
    certifications: ["Event Management", "Crowd Control"],
    avatar: "DT"
  },
  {
    id: 7,
    name: "Jennifer Lee",
    role: "Marketing Manager",
    department: "Marketing",
    email: "jlee@university.edu",
    phone: "(512) 555-0107",
    hireDate: "Feb 2022",
    status: "active",
    certifications: ["Digital Marketing"],
    avatar: "JL"
  },
  {
    id: 8,
    name: "Robert Wilson",
    role: "Facilities Manager",
    department: "Operations",
    email: "rwilson@university.edu",
    phone: "(512) 555-0108",
    hireDate: "Nov 2018",
    status: "active",
    certifications: ["OSHA Safety", "Building Management"],
    avatar: "RW"
  },
];

const gameStaff = [
  { id: 1, name: "Tom Baker", role: "Security Lead", events: 45, rating: 4.8, status: "active" },
  { id: 2, name: "Lisa Garcia", role: "Ticket Operations", events: 52, rating: 4.9, status: "active" },
  { id: 3, name: "James Parker", role: "Concessions Manager", events: 38, rating: 4.6, status: "active" },
  { id: 4, name: "Amy Wilson", role: "Guest Services", events: 41, rating: 4.7, status: "active" },
  { id: 5, name: "Chris Davis", role: "Parking Coordinator", events: 35, rating: 4.5, status: "active" },
];

export default function SportifyStaffPage() {
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<typeof staff[0] | null>(null);
  const [viewTab, setViewTab] = useState<"full-time" | "game-day">("full-time");

  const filteredStaff = selectedDepartment === "all"
    ? staff
    : staff.filter(s => s.department.toLowerCase() === selectedDepartment);

  const departments = [...new Set(staff.map(s => s.department))];

  return (
    <main className="sportify-page sp-staff-page">
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
                <span>Staff</span>
              </div>
              <h1>Staff Management</h1>
              <p>Manage full-time staff and game day operations teams</p>
            </div>
            <div className="sp-page-actions">
              <button className="sp-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Schedule
              </button>
              <button className="sp-btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Add Staff
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Staff Stats */}
      <section className="sp-stats-section">
        <div className="container">
          <div className="sp-stats-grid">
            <div className="sp-stat-card">
              <div className="sp-stat-icon blue">👥</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">{staff.length}</span>
                <span className="sp-stat-label">Full-Time Staff</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon green">🎫</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">{gameStaff.length * 8}</span>
                <span className="sp-stat-label">Game Day Staff</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon purple">📜</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">98%</span>
                <span className="sp-stat-label">Certified</span>
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-icon orange">⭐</div>
              <div className="sp-stat-content">
                <span className="sp-stat-value">4.7</span>
                <span className="sp-stat-label">Avg Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* View Tabs */}
      <section className="sp-tabs-section">
        <div className="container">
          <div className="sp-view-tabs">
            <button
              className={`sp-view-tab ${viewTab === "full-time" ? "active" : ""}`}
              onClick={() => setViewTab("full-time")}
            >
              Full-Time Staff
            </button>
            <button
              className={`sp-view-tab ${viewTab === "game-day" ? "active" : ""}`}
              onClick={() => setViewTab("game-day")}
            >
              Game Day Operations
            </button>
          </div>
        </div>
      </section>

      {viewTab === "full-time" ? (
        <>
          {/* Filters */}
          <section className="sp-filters-section">
            <div className="container">
              <div className="sp-filters-bar">
                <div className="sp-dept-filters">
                  <button
                    className={`sp-filter-btn ${selectedDepartment === "all" ? "active" : ""}`}
                    onClick={() => setSelectedDepartment("all")}
                  >
                    All Departments
                  </button>
                  {departments.map(dept => (
                    <button
                      key={dept}
                      className={`sp-filter-btn ${selectedDepartment === dept.toLowerCase() ? "active" : ""}`}
                      onClick={() => setSelectedDepartment(dept.toLowerCase())}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
                <div className="sp-search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input type="text" placeholder="Search staff..." />
                </div>
              </div>
            </div>
          </section>

          {/* Staff Grid */}
          <section className="sp-staff-section">
            <div className="container">
              <div className="sp-staff-grid">
                {filteredStaff.map(member => (
                  <div
                    key={member.id}
                    className="sp-staff-card"
                    onClick={() => setSelectedStaff(member)}
                  >
                    <div className="sp-staff-avatar">{member.avatar}</div>
                    <div className="sp-staff-info">
                      <h4>{member.name}</h4>
                      <p className="sp-staff-role">{member.role}</p>
                      <span className="sp-staff-dept">{member.department}</span>
                    </div>
                    <div className="sp-staff-certs">
                      {member.certifications.slice(0, 2).map((cert, i) => (
                        <span key={i} className="sp-cert-badge">{cert}</span>
                      ))}
                      {member.certifications.length > 2 && (
                        <span className="sp-cert-more">+{member.certifications.length - 2}</span>
                      )}
                    </div>
                    <div className="sp-staff-contact">
                      <span>{member.email}</span>
                      <span>{member.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        /* Game Day Staff */
        <section className="sp-gameday-section">
          <div className="container">
            <div className="sp-section-card">
              <div className="sp-section-header">
                <h2>Game Day Operations Team</h2>
                <button className="sp-btn secondary">Assign Staff</button>
              </div>
              <div className="sp-gameday-table">
                <div className="sp-gameday-header">
                  <span>Name</span>
                  <span>Role</span>
                  <span>Events Worked</span>
                  <span>Rating</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {gameStaff.map(member => (
                  <div key={member.id} className="sp-gameday-row">
                    <span className="sp-gameday-name">{member.name}</span>
                    <span>{member.role}</span>
                    <span>{member.events}</span>
                    <span className="sp-gameday-rating">
                      ⭐ {member.rating}
                    </span>
                    <span className={`sp-gameday-status ${member.status}`}>{member.status}</span>
                    <div className="sp-gameday-actions">
                      <button className="sp-btn-sm secondary">Schedule</button>
                      <button className="sp-btn-sm primary">View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <div className="sp-modal-overlay" onClick={() => setSelectedStaff(null)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <button className="sp-modal-close" onClick={() => setSelectedStaff(null)}>×</button>
            <div className="sp-modal-header">
              <div className="sp-modal-avatar">{selectedStaff.avatar}</div>
              <div>
                <h2>{selectedStaff.name}</h2>
                <p>{selectedStaff.role}</p>
              </div>
            </div>
            <div className="sp-modal-details">
              <div className="sp-modal-detail">
                <span className="sp-detail-label">Department</span>
                <span className="sp-detail-value">{selectedStaff.department}</span>
              </div>
              <div className="sp-modal-detail">
                <span className="sp-detail-label">Email</span>
                <span className="sp-detail-value">{selectedStaff.email}</span>
              </div>
              <div className="sp-modal-detail">
                <span className="sp-detail-label">Phone</span>
                <span className="sp-detail-value">{selectedStaff.phone}</span>
              </div>
              <div className="sp-modal-detail">
                <span className="sp-detail-label">Hire Date</span>
                <span className="sp-detail-value">{selectedStaff.hireDate}</span>
              </div>
            </div>
            <div className="sp-modal-section">
              <h4>Certifications</h4>
              <div className="sp-certs-list">
                {selectedStaff.certifications.map((cert, i) => (
                  <span key={i} className="sp-cert-badge">{cert}</span>
                ))}
              </div>
            </div>
            <div className="sp-modal-actions">
              <button className="sp-btn secondary">View Schedule</button>
              <button className="sp-btn primary">Edit Profile</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
