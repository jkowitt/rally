"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const candidates = [
  { id: 1, name: "Robert Taylor", role: "Equipment Operator", status: "new", experience: "5 years", certifications: ["CDL-A", "OSHA 10"], source: "Indeed", appliedDate: "Jan 20, 2024", phone: "(512) 555-0201", email: "robert.t@email.com", avatar: "RT", rating: null, notes: "Strong experience with excavators" },
  { id: 2, name: "Jennifer Martinez", role: "Project Coordinator", status: "screening", experience: "3 years", certifications: ["PMP"], source: "LinkedIn", appliedDate: "Jan 18, 2024", phone: "(512) 555-0202", email: "jennifer.m@email.com", avatar: "JM", rating: 4, notes: "Previous construction PM experience" },
  { id: 3, name: "Kevin Lee", role: "Welder", status: "interview", experience: "8 years", certifications: ["AWS D1.1", "6G Pipe", "OSHA 30"], source: "Referral", appliedDate: "Jan 15, 2024", phone: "(512) 555-0203", email: "kevin.l@email.com", avatar: "KL", rating: 5, notes: "Excellent technical skills, highly recommended" },
  { id: 4, name: "Amanda White", role: "Safety Coordinator", status: "offer", experience: "6 years", certifications: ["OSHA 500", "First Aid", "CSP"], source: "Company Website", appliedDate: "Jan 10, 2024", phone: "(512) 555-0204", email: "amanda.w@email.com", avatar: "AW", rating: 5, notes: "Offer extended $65K + benefits" },
  { id: 5, name: "Carlos Hernandez", role: "Crane Operator", status: "new", experience: "4 years", certifications: ["NCCCO", "OSHA 10"], source: "Indeed", appliedDate: "Jan 21, 2024", phone: "(512) 555-0205", email: "carlos.h@email.com", avatar: "CH", rating: null, notes: "" },
  { id: 6, name: "Michelle Davis", role: "Equipment Operator", status: "rejected", experience: "2 years", certifications: ["CDL-B"], source: "Indeed", appliedDate: "Jan 8, 2024", phone: "(512) 555-0206", email: "michelle.d@email.com", avatar: "MD", rating: 2, notes: "Insufficient experience for senior role" },
  { id: 7, name: "Daniel Kim", role: "Apprentice", status: "screening", experience: "0 years", certifications: ["OSHA 10"], source: "Trade School", appliedDate: "Jan 19, 2024", phone: "(512) 555-0207", email: "daniel.k@email.com", avatar: "DK", rating: 3, notes: "Recent graduate, eager to learn" },
  { id: 8, name: "Rachel Green", role: "Fleet Manager", status: "interview", experience: "7 years", certifications: ["CDL-A", "DOT Compliance"], source: "LinkedIn", appliedDate: "Jan 12, 2024", phone: "(512) 555-0208", email: "rachel.g@email.com", avatar: "RG", rating: 4, notes: "Interview scheduled for Jan 25" },
];

const openPositions = [
  { id: 1, title: "Senior Equipment Operator", department: "Field Operations", type: "Full-time", posted: "Jan 5, 2024", applicants: 12, urgent: true },
  { id: 2, title: "Project Coordinator", department: "Management", type: "Full-time", posted: "Jan 10, 2024", applicants: 8, urgent: false },
  { id: 3, title: "Welder", department: "Fabrication", type: "Full-time", posted: "Jan 12, 2024", applicants: 5, urgent: true },
  { id: 4, title: "Apprentice", department: "Field Operations", type: "Full-time", posted: "Jan 15, 2024", applicants: 15, urgent: false },
];

const pipelineStages = [
  { id: "new", name: "New", color: "#6B7280" },
  { id: "screening", name: "Screening", color: "#3B82F6" },
  { id: "interview", name: "Interview", color: "#8B5CF6" },
  { id: "offer", name: "Offer", color: "#F59E0B" },
  { id: "hired", name: "Hired", color: "#10B981" },
  { id: "rejected", name: "Rejected", color: "#EF4444" },
];

export default function LoudWorksRecruitingPage() {
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [selectedCandidate, setSelectedCandidate] = useState<typeof candidates[0] | null>(null);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredCandidates = selectedStatus === "all"
    ? candidates
    : candidates.filter(c => c.status === selectedStatus);

  const newCount = candidates.filter(c => c.status === "new").length;
  const interviewCount = candidates.filter(c => c.status === "interview").length;
  const offerCount = candidates.filter(c => c.status === "offer").length;
  const totalApplicants = candidates.length;

  const getStatusColor = (status: string) => {
    return pipelineStages.find(s => s.id === status)?.color || "#6B7280";
  };

  return (
    <main className="loud-works-page lw-recruiting-page">
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
                <span>Recruiting</span>
              </div>
              <h1>Recruiting Pipeline</h1>
              <p>Track candidates through your hiring process</p>
            </div>
            <div className="lw-page-actions">
              <div className="lw-view-toggle">
                <button
                  className={`lw-view-btn ${viewMode === "pipeline" ? "active" : ""}`}
                  onClick={() => setViewMode("pipeline")}
                >
                  Pipeline
                </button>
                <button
                  className={`lw-view-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  List
                </button>
              </div>
              <button className="lw-btn primary" onClick={() => setShowAddCandidate(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Add Candidate
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
              <span className="lw-stat-value">{totalApplicants}</span>
              <span className="lw-stat-label">Total Applicants</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: "#6B7280" }}>{newCount}</span>
              <span className="lw-stat-label">New Applications</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: "#8B5CF6" }}>{interviewCount}</span>
              <span className="lw-stat-label">In Interview</span>
            </div>
            <div className="lw-stat-card">
              <span className="lw-stat-value" style={{ color: "#F59E0B" }}>{offerCount}</span>
              <span className="lw-stat-label">Offers Extended</span>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="lw-positions-section">
        <div className="container">
          <div className="lw-section-card">
            <div className="lw-section-header">
              <h3>Open Positions</h3>
              <button className="lw-btn secondary">+ New Position</button>
            </div>
            <div className="lw-positions-grid">
              {openPositions.map(position => (
                <div key={position.id} className="lw-position-card">
                  <div className="lw-position-header">
                    <h4>{position.title}</h4>
                    {position.urgent && <span className="lw-urgent-badge">Urgent</span>}
                  </div>
                  <p className="lw-position-dept">{position.department} • {position.type}</p>
                  <div className="lw-position-footer">
                    <span className="lw-position-applicants">{position.applicants} applicants</span>
                    <span className="lw-position-posted">Posted {position.posted}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Candidate Pipeline/List */}
      <section className="lw-candidates-section">
        <div className="container">
          {viewMode === "pipeline" ? (
            <div className="lw-pipeline-board">
              {pipelineStages.filter(s => s.id !== "hired" && s.id !== "rejected").map(stage => {
                const stageCandidates = candidates.filter(c => c.status === stage.id);
                return (
                  <div key={stage.id} className="lw-pipeline-column">
                    <div className="lw-pipeline-column-header" style={{ borderTopColor: stage.color }}>
                      <div className="lw-pipeline-column-title">
                        <span>{stage.name}</span>
                        <span className="lw-pipeline-count">{stageCandidates.length}</span>
                      </div>
                    </div>
                    <div className="lw-pipeline-cards">
                      {stageCandidates.map(candidate => (
                        <div
                          key={candidate.id}
                          className="lw-candidate-card"
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          <div className="lw-candidate-header">
                            <div className="lw-candidate-avatar">{candidate.avatar}</div>
                            <div className="lw-candidate-info">
                              <h4>{candidate.name}</h4>
                              <p>{candidate.role}</p>
                            </div>
                          </div>
                          <div className="lw-candidate-details">
                            <span className="lw-candidate-exp">{candidate.experience} exp</span>
                            <span className="lw-candidate-source">{candidate.source}</span>
                          </div>
                          <div className="lw-candidate-certs">
                            {candidate.certifications.slice(0, 2).map((cert, i) => (
                              <span key={i} className="lw-cert-badge-sm">{cert}</span>
                            ))}
                          </div>
                          <div className="lw-candidate-footer">
                            <span className="lw-candidate-date">Applied {candidate.appliedDate}</span>
                            {candidate.rating && (
                              <span className="lw-candidate-rating">
                                {"★".repeat(candidate.rating)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="lw-candidates-table">
              <div className="lw-candidates-table-header">
                <span>Candidate</span>
                <span>Position</span>
                <span>Experience</span>
                <span>Source</span>
                <span>Applied</span>
                <span>Status</span>
                <span>Rating</span>
              </div>
              {filteredCandidates.map(candidate => (
                <div
                  key={candidate.id}
                  className="lw-candidates-table-row"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <div className="lw-table-candidate">
                    <span className="lw-table-avatar">{candidate.avatar}</span>
                    <span>{candidate.name}</span>
                  </div>
                  <span>{candidate.role}</span>
                  <span>{candidate.experience}</span>
                  <span>{candidate.source}</span>
                  <span>{candidate.appliedDate}</span>
                  <span
                    className="lw-table-status"
                    style={{ background: getStatusColor(candidate.status) }}
                  >
                    {candidate.status}
                  </span>
                  <span className="lw-table-rating">
                    {candidate.rating ? "★".repeat(candidate.rating) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="lw-modal-overlay" onClick={() => setSelectedCandidate(null)}>
          <div className="lw-modal lw-modal-lg" onClick={(e) => e.stopPropagation()}>
            <button className="lw-modal-close" onClick={() => setSelectedCandidate(null)}>×</button>
            <div className="lw-modal-header">
              <div className="lw-modal-avatar">{selectedCandidate.avatar}</div>
              <div>
                <h2>{selectedCandidate.name}</h2>
                <p>{selectedCandidate.role}</p>
              </div>
              <span
                className="lw-modal-status"
                style={{ background: getStatusColor(selectedCandidate.status) }}
              >
                {selectedCandidate.status}
              </span>
            </div>
            <div className="lw-modal-details">
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Email</span>
                <span className="lw-detail-value">{selectedCandidate.email}</span>
              </div>
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Phone</span>
                <span className="lw-detail-value">{selectedCandidate.phone}</span>
              </div>
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Experience</span>
                <span className="lw-detail-value">{selectedCandidate.experience}</span>
              </div>
              <div className="lw-modal-detail">
                <span className="lw-detail-label">Source</span>
                <span className="lw-detail-value">{selectedCandidate.source}</span>
              </div>
            </div>
            <div className="lw-modal-section">
              <h4>Certifications</h4>
              <div className="lw-modal-certs">
                {selectedCandidate.certifications.map((cert, i) => (
                  <span key={i} className="lw-cert-badge">{cert}</span>
                ))}
              </div>
            </div>
            {selectedCandidate.notes && (
              <div className="lw-modal-section">
                <h4>Notes</h4>
                <p className="lw-modal-notes">{selectedCandidate.notes}</p>
              </div>
            )}
            <div className="lw-modal-section">
              <h4>Move to Stage</h4>
              <div className="lw-stage-buttons">
                {pipelineStages.map(stage => (
                  <button
                    key={stage.id}
                    className={`lw-stage-btn ${selectedCandidate.status === stage.id ? "active" : ""}`}
                    style={{ borderColor: stage.color }}
                  >
                    {stage.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="lw-modal-actions">
              <button className="lw-btn secondary">Schedule Interview</button>
              <button className="lw-btn secondary">Send Message</button>
              <button className="lw-btn primary">Edit Candidate</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddCandidate && (
        <div className="lw-modal-overlay" onClick={() => setShowAddCandidate(false)}>
          <div className="lw-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lw-modal-close" onClick={() => setShowAddCandidate(false)}>×</button>
            <h2>Add Candidate</h2>
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
                  <input type="email" placeholder="john.doe@email.com" />
                </div>
                <div className="lw-form-group">
                  <label>Phone</label>
                  <input type="tel" placeholder="(512) 555-0100" />
                </div>
              </div>
              <div className="lw-form-group">
                <label>Position</label>
                <select>
                  {openPositions.map(pos => (
                    <option key={pos.id} value={pos.title}>{pos.title}</option>
                  ))}
                </select>
              </div>
              <div className="lw-form-row">
                <div className="lw-form-group">
                  <label>Experience</label>
                  <input type="text" placeholder="5 years" />
                </div>
                <div className="lw-form-group">
                  <label>Source</label>
                  <select>
                    <option>Indeed</option>
                    <option>LinkedIn</option>
                    <option>Referral</option>
                    <option>Company Website</option>
                    <option>Trade School</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="lw-form-group">
                <label>Certifications</label>
                <input type="text" placeholder="CDL-A, OSHA 10 (comma separated)" />
              </div>
              <div className="lw-form-group">
                <label>Resume</label>
                <div className="lw-file-upload">
                  <input type="file" accept=".pdf,.doc,.docx" />
                  <span>Drop file here or click to upload</span>
                </div>
              </div>
              <div className="lw-form-group">
                <label>Notes</label>
                <textarea placeholder="Initial notes about this candidate..." rows={3}></textarea>
              </div>
              <div className="lw-form-actions">
                <button type="button" className="lw-btn ghost" onClick={() => setShowAddCandidate(false)}>Cancel</button>
                <button type="submit" className="lw-btn primary">Add Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
