"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const teamMembers = [
  { id: 1, name: "Marcus Johnson", role: "Senior Operator", department: "Field Operations", status: "active", certifications: ["OSHA 30", "Forklift", "CDL-A"], rating: 4.9, hoursThisWeek: 42, totalHours: 2150, phone: "(512) 555-0101", email: "marcus.j@example.com", avatar: "MJ", hireDate: "Mar 2022", skills: ["Heavy Equipment", "Safety Lead", "Training"] },
  { id: 2, name: "Sarah Chen", role: "Project Coordinator", department: "Management", status: "active", certifications: ["PMP", "OSHA 10"], rating: 4.8, hoursThisWeek: 45, totalHours: 1890, phone: "(512) 555-0102", email: "sarah.c@example.com", avatar: "SC", hireDate: "Jun 2022", skills: ["Scheduling", "Client Relations", "Reporting"] },
  { id: 3, name: "David Rodriguez", role: "Equipment Operator", department: "Field Operations", status: "active", certifications: ["CDL-B", "Crane Operator"], rating: 4.7, hoursThisWeek: 38, totalHours: 1650, phone: "(512) 555-0103", email: "david.r@example.com", avatar: "DR", hireDate: "Sep 2022", skills: ["Crane Operation", "Rigging", "Excavation"] },
  { id: 4, name: "Emily Watson", role: "Safety Coordinator", department: "Safety", status: "active", certifications: ["OSHA 500", "First Aid", "CPR"], rating: 5.0, hoursThisWeek: 40, totalHours: 2300, phone: "(512) 555-0104", email: "emily.w@example.com", avatar: "EW", hireDate: "Jan 2021", skills: ["Safety Training", "Compliance", "Incident Investigation"] },
  { id: 5, name: "James Wilson", role: "Apprentice", department: "Field Operations", status: "training", certifications: ["OSHA 10"], rating: 4.3, hoursThisWeek: 32, totalHours: 480, phone: "(512) 555-0105", email: "james.w@example.com", avatar: "JW", hireDate: "Nov 2023", skills: ["General Labor", "Tool Maintenance"] },
  { id: 6, name: "Lisa Thompson", role: "Fleet Manager", department: "Logistics", status: "active", certifications: ["CDL-A", "DOT Compliance"], rating: 4.6, hoursThisWeek: 44, totalHours: 1920, phone: "(512) 555-0106", email: "lisa.t@example.com", avatar: "LT", hireDate: "Apr 2022", skills: ["Fleet Management", "Maintenance Planning", "Route Optimization"] },
  { id: 7, name: "Michael Brown", role: "Senior Welder", department: "Fabrication", status: "on-leave", certifications: ["AWS D1.1", "6G Pipe"], rating: 4.9, hoursThisWeek: 0, totalHours: 3200, phone: "(512) 555-0107", email: "michael.b@example.com", avatar: "MB", hireDate: "Aug 2019", skills: ["MIG Welding", "TIG Welding", "Blueprint Reading"] },
  { id: 8, name: "Amanda Garcia", role: "HR Specialist", department: "Human Resources", status: "active", certifications: ["PHR", "SHRM-CP"], rating: 4.8, hoursThisWeek: 40, totalHours: 1560, phone: "(512) 555-0108", email: "amanda.g@example.com", avatar: "AG", hireDate: "Feb 2023", skills: ["Recruiting", "Onboarding", "Benefits Admin"] },
];

const departments = ["All", "Field Operations", "Management", "Safety", "Logistics", "Fabrication", "Human Resources"];

export default function LoudWorksTeamPage() {
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedMember, setSelectedMember] = useState<typeof teamMembers[0] | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = teamMembers.filter(member => {
    if (selectedDepartment !== "All" && member.department !== selectedDepartment) return false;
    if (searchQuery && !member.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !member.role.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeCount = teamMembers.filter(m => m.status === "active").length;
  const trainingCount = teamMembers.filter(m => m.status === "training").length;
  const onLeaveCount = teamMembers.filter(m => m.status === "on-leave").length;
  const totalHoursThisWeek = teamMembers.reduce((sum, m) => sum + m.hoursThisWeek, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "#10B981";
      case "training": return "#3B82F6";
      case "on-leave": return "#F59E0B";
      case "inactive": return "#6B7280";
      default: return "#6B7280";
    }
  };

  return (
    <main className="loud-works-page lw-team-page">
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
                <span>Team</span>
              </div>
              <h1>Team Management</h1>
              <p>Manage your workforce and track team performance</p>
            </div>
            <div className="lw-page-actions">
              <button className="lw-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
              <button className="lw-btn primary" onClick={() => setShowAddMember(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Add Team Member
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
              <span className="lw-stat-value">{teamMembers.length}</span>
              <span className="lw-stat-label">Total Team Members</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: "#10B981" }}>{activeCount}</span>
              <span className="lw-stat-label">Active</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: "#3B82F6" }}>{trainingCount}</span>
              <span className="lw-stat-label">In Training</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value">{totalHoursThisWeek}</span>
              <span className="lw-stat-label">Hours This Week</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="lw-filters-section">
        <div className="container">
          <div className="lw-filters-bar">
            <div className="lw-department-filters">
              {departments.map(dept => (
                <button
                  key={dept}
                  className={`lw-filter-btn ${selectedDepartment === dept ? "active" : ""}`}
                  onClick={() => setSelectedDepartment(dept)}
                >
                  {dept}
                </button>
              ))}
            </div>
            <div className="lw-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Team Grid */}
      <section className="lw-team-section">
        <div className="container">
          <div className="lw-team-grid">
            {filteredMembers.map(member => (
              <div
                key={member.id}
                className="lw-team-card"
                onClick={() => setSelectedMember(member)}
              >
                <div className="lw-team-card-header">
                  <div className="lw-team-avatar">{member.avatar}</div>
                  <div className="lw-team-info">
                    <h4>{member.name}</h4>
                    <p>{member.role}</p>
                  </div>
                  <span
                    className="lw-team-status"
                    style={{ background: getStatusColor(member.status) }}
                  >
                    {member.status}
                  </span>
                </div>
                <div className="lw-team-details">
                  <div className="lw-team-detail">
                    <span className="lw-detail-label">Department</span>
                    <span className="lw-detail-value">{member.department}</span>
                  </div>
                  <div className="lw-team-detail">
                    <span className="lw-detail-label">Rating</span>
                    <span className="lw-detail-value">
                      <span className="lw-rating">{"★".repeat(Math.round(member.rating))}</span>
                      {member.rating}
                    </span>
                  </div>
                </div>
                <div className="lw-team-certifications">
                  {member.certifications.slice(0, 3).map((cert, i) => (
                    <span key={i} className="lw-cert-badge">{cert}</span>
                  ))}
                  {member.certifications.length > 3 && (
                    <span className="lw-cert-more">+{member.certifications.length - 3}</span>
                  )}
                </div>
                <div className="lw-team-footer">
                  <span className="lw-hours">{member.hoursThisWeek}h this week</span>
                  <span className="lw-total-hours">{member.totalHours}h total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="lw-modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="lw-modal lw-modal-lg" onClick={(e) => e.stopPropagation()}>
            <button className="lw-modal-close" onClick={() => setSelectedMember(null)}>×</button>
            <div className="lw-modal-header">
              <div className="lw-modal-avatar">{selectedMember.avatar}</div>
              <div>
                <h2>{selectedMember.name}</h2>
                <p>{selectedMember.role} • {selectedMember.department}</p>
              </div>
              <span
                className="lw-modal-status"
                style={{ background: getStatusColor(selectedMember.status) }}
              >
                {selectedMember.status}
              </span>
            </div>
            <div className="lw-modal-stats">
              <div className="lw-modal-stat">
                <span className="lw-modal-stat-value">{selectedMember.rating}</span>
                <span className="lw-modal-stat-label">Rating</span>
              </div>
              <div className="lw-modal-stat">
                <span className="lw-modal-stat-value">{selectedMember.hoursThisWeek}h</span>
                <span className="lw-modal-stat-label">This Week</span>
              </div>
              <div className="lw-modal-stat">
                <span className="lw-modal-stat-value">{selectedMember.totalHours}</span>
                <span className="lw-modal-stat-label">Total Hours</span>
              </div>
            </div>
            <div className="lw-modal-details">
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Email</span>
                <span className="lw-detail-value">{selectedMember.email}</span>
              </div>
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Phone</span>
                <span className="lw-detail-value">{selectedMember.phone}</span>
              </div>
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Hire Date</span>
                <span className="lw-detail-value">{selectedMember.hireDate}</span>
              </div>
            </div>
            <div className="lw-modal-section">
              <h4>Certifications</h4>
              <div className="lw-modal-certs">
                {selectedMember.certifications.map((cert, i) => (
                  <span key={i} className="lw-cert-badge">{cert}</span>
                ))}
              </div>
            </div>
            <div className="lw-modal-section">
              <h4>Skills</h4>
              <div className="lw-modal-skills">
                {selectedMember.skills.map((skill, i) => (
                  <span key={i} className="lw-skill-badge">{skill}</span>
                ))}
              </div>
            </div>
            <div className="lw-modal-actions">
              <button className="lw-btn secondary">View Schedule</button>
              <button className="lw-btn secondary">Training Records</button>
              <button className="lw-btn primary">Edit Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="lw-modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="lw-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lw-modal-close" onClick={() => setShowAddMember(false)}>×</button>
            <h2>Add Team Member</h2>
            <form className="lw-form">
              <div className="lw-form-row">
                <div className="lw-form-group">
                  <label>First Name</label>
                  <input type="text" placeholder="John" />
                </div>
                <div className="lw-form-group">
                  <label>Last Name</label>
                  <input type="text" placeholder="Doe" />
                </div>
              </div>
              <div className="lw-form-row">
                <div className="lw-form-group">
                  <label>Email</label>
                  <input type="email" placeholder="john.doe@example.com" />
                </div>
                <div className="lw-form-group">
                  <label>Phone</label>
                  <input type="tel" placeholder="(512) 555-0100" />
                </div>
              </div>
              <div className="lw-form-row">
                <div className="lw-form-group">
                  <label>Role</label>
                  <input type="text" placeholder="Equipment Operator" />
                </div>
                <div className="lw-form-group">
                  <label>Department</label>
                  <select>
                    {departments.filter(d => d !== "All").map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="lw-form-group">
                <label>Start Date</label>
                <input type="date" />
              </div>
              <div className="lw-form-group">
                <label>Certifications</label>
                <input type="text" placeholder="OSHA 10, CDL-A (comma separated)" />
              </div>
              <div className="lw-form-group">
                <label>Notes</label>
                <textarea placeholder="Additional information..." rows={3}></textarea>
              </div>
              <div className="lw-form-actions">
                <button type="button" className="lw-btn ghost" onClick={() => setShowAddMember(false)}>Cancel</button>
                <button type="submit" className="lw-btn primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
