"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

// AI Growth Optimization Types
interface GrowthGoal {
  id: string;
  title: string;
  category: "skill" | "leadership" | "certification" | "career";
  priority: "high" | "medium" | "low";
  targetDate: string;
}

interface AIRecommendedCourse {
  id: string;
  title: string;
  provider: string;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  relevanceScore: number;
  link: string;
  description: string;
}

interface AIActionItem {
  id: string;
  task: string;
  timeframe: string;
  impact: "high" | "medium" | "low";
  relatedGoal: string;
  completed: boolean;
}

interface CertificateUpload {
  id: string;
  trainingName: string;
  fileName: string;
  uploadDate: string;
  status: "pending" | "verified" | "rejected";
  assignedBy: string;
}

interface AIGrowthAnalysis {
  overallProgress: number;
  strengthAreas: string[];
  growthOpportunities: string[];
  recommendedCourses: AIRecommendedCourse[];
  actionItems: AIActionItem[];
  careerPathInsight: string;
  skillGaps: string[];
}

// Workforce data - starts empty for user to add their own
const teamMembers: { id: number; name: string; role: string; department: string; status: string; certifications: number; hireDate: string; avatar: string }[] = [];

const openPositions: { id: number; title: string; department: string; applicants: number; posted: string; priority: string }[] = [];

const upcomingTrainings: { id: number; name: string; date: string; attendees: number; type: string }[] = [];

const recentActivity: { id: number; action: string; person: string; time: string; type: string }[] = [];

const scheduleToday: { id: number; shift: string; time: string; staffed: number; required: number; status: string }[] = [];

export default function LoudWorksDashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Quick Actions State
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeRole, setNewEmployeeRole] = useState("");
  const [actionSuccess, setActionSuccess] = useState(false);

  // AI Growth Optimizer State
  const [showGrowthOptimizer, setShowGrowthOptimizer] = useState(false);
  const [goals, setGoals] = useState<GrowthGoal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState<GrowthGoal["category"]>("skill");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [growthAnalysis, setGrowthAnalysis] = useState<AIGrowthAnalysis | null>(null);
  const [certificates, setCertificates] = useState<CertificateUpload[]>([]);
  const certInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCertId, setUploadingCertId] = useState<string | null>(null);

  const addGoal = () => {
    if (!newGoal.trim()) return;
    const goal: GrowthGoal = {
      id: `goal-${Date.now()}`,
      title: newGoal,
      category: newGoalCategory,
      priority: "medium",
      targetDate: "Q2 2024"
    };
    setGoals([...goals, goal]);
    setNewGoal("");
    if (growthAnalysis) setGrowthAnalysis(null);
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    if (growthAnalysis) setGrowthAnalysis(null);
  };

  const runGrowthAnalysis = async () => {
    if (goals.length === 0) return;
    setIsAnalyzing(true);

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2200));

    const analysis: AIGrowthAnalysis = {
      overallProgress: 65,
      strengthAreas: [
        "Strong technical foundation in operations",
        "Excellent communication and collaboration",
        "Proven track record in event coordination",
        "Adaptable to new tools and processes"
      ],
      growthOpportunities: [
        "Expand strategic planning capabilities",
        "Develop data analytics proficiency",
        "Build cross-functional leadership experience",
        "Strengthen financial management knowledge"
      ],
      recommendedCourses: [
        {
          id: "c1",
          title: "Project Management Professional (PMP) Prep",
          provider: "PMI",
          duration: "35 hours",
          level: "intermediate",
          relevanceScore: 95,
          link: "https://pmi.org/pmp",
          description: "Comprehensive PMP certification prep aligned with your certification goal"
        },
        {
          id: "c2",
          title: "Leadership in Practice",
          provider: "LinkedIn Learning",
          duration: "8 hours",
          level: "intermediate",
          relevanceScore: 88,
          link: "https://linkedin.com/learning",
          description: "Develop essential leadership skills for team management"
        },
        {
          id: "c3",
          title: "Data-Driven Decision Making",
          provider: "Coursera",
          duration: "16 hours",
          level: "beginner",
          relevanceScore: 82,
          link: "https://coursera.org",
          description: "Learn to leverage data analytics for better business decisions"
        },
        {
          id: "c4",
          title: "Agile Methodology Fundamentals",
          provider: "Udemy",
          duration: "12 hours",
          level: "beginner",
          relevanceScore: 78,
          link: "https://udemy.com",
          description: "Master agile practices for modern project management"
        }
      ],
      actionItems: [
        { id: "a1", task: "Complete PMP eligibility requirements documentation", timeframe: "Next 2 weeks", impact: "high", relatedGoal: "PMP Certification", completed: false },
        { id: "a2", task: "Shadow senior manager in Q1 planning meetings", timeframe: "This month", impact: "high", relatedGoal: "Leadership Skills", completed: false },
        { id: "a3", task: "Enroll in recommended leadership course", timeframe: "Next week", impact: "medium", relatedGoal: "Leadership Skills", completed: false },
        { id: "a4", task: "Schedule 1:1 with mentor to discuss career path", timeframe: "This week", impact: "medium", relatedGoal: "Career Growth", completed: false },
        { id: "a5", task: "Complete company-assigned compliance training", timeframe: "Before Feb 1", impact: "high", relatedGoal: "Required Training", completed: false }
      ],
      careerPathInsight: "Based on your goals and current trajectory, you're well-positioned for a Senior Operations Lead role within 12-18 months. Focus on the PMP certification and leadership development to accelerate this timeline.",
      skillGaps: [
        "Strategic planning and budgeting",
        "Advanced data visualization",
        "Conflict resolution techniques",
        "Vendor negotiation skills"
      ]
    };

    setGrowthAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const handleCertificateUpload = (certId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificates(certificates.map(cert =>
        cert.id === certId
          ? { ...cert, fileName: file.name, uploadDate: new Date().toLocaleDateString(), status: "pending" as const }
          : cert
      ));
      setUploadingCertId(null);
    }
  };

  const triggerCertUpload = (certId: string) => {
    setUploadingCertId(certId);
    certInputRef.current?.click();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "skill": return "🎯";
      case "leadership": return "👑";
      case "certification": return "🎓";
      case "career": return "🚀";
      default: return "📌";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "skill": return "#3B82F6";
      case "leadership": return "#8B5CF6";
      case "certification": return "#22C55E";
      case "career": return "#F97316";
      default: return "#64748B";
    }
  };

  const totalEmployees = teamMembers.length;
  const activeEmployees = teamMembers.filter(m => m.status === "active").length;
  const totalCertifications = teamMembers.reduce((sum, m) => sum + m.certifications, 0);
  const retentionRate = 89;

  const filteredMembers = selectedDepartment === "all"
    ? teamMembers
    : teamMembers.filter(m => m.department.toLowerCase() === selectedDepartment.toLowerCase());

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "#22C55E";
      case "onboarding": return "#F97316";
      case "away": return "#EAB308";
      default: return "#6B7280";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "#EF4444";
      case "medium": return "#F97316";
      case "low": return "#22C55E";
      default: return "#6B7280";
    }
  };

  return (
    <main className="loud-works-page lw-dashboard-page">
      <Header />

      {/* Dashboard Header */}
      <section className="lw-dash-header">
        <div className="container">
          <div className="lw-dash-header-content">
            <div>
              <div className="lw-breadcrumb">
                <Link href="/loud-works">Loud Works</Link>
                <span>/</span>
                <span>Dashboard</span>
              </div>
              <h1>Workforce Command Center</h1>
              <p>Manage your team, track development, and optimize scheduling.</p>
            </div>
            <div className="lw-dash-actions">
              <button className="lw-dash-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Export Report
              </button>
              <button className="lw-dash-btn primary">
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
      <section className="lw-dash-stats">
        <div className="container">
          <div className="lw-dash-stats-grid">
            <div className="lw-dash-stat">
              <div className="lw-dash-stat-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="lw-dash-stat-content">
                <span className="lw-dash-stat-value">{totalEmployees}</span>
                <span className="lw-dash-stat-label">Team Members</span>
              </div>
            </div>

            <div className="lw-dash-stat">
              <div className="lw-dash-stat-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
              </div>
              <div className="lw-dash-stat-content">
                <span className="lw-dash-stat-value">{retentionRate}%</span>
                <span className="lw-dash-stat-label">Retention Rate</span>
              </div>
            </div>

            <div className="lw-dash-stat">
              <div className="lw-dash-stat-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 2,7 12,12 22,7" />
                  <polyline points="2,17 12,22 22,17" />
                  <polyline points="2,12 12,17 22,12" />
                </svg>
              </div>
              <div className="lw-dash-stat-content">
                <span className="lw-dash-stat-value">{totalCertifications}</span>
                <span className="lw-dash-stat-label">Certifications</span>
              </div>
            </div>

            <div className="lw-dash-stat">
              <div className="lw-dash-stat-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                </svg>
              </div>
              <div className="lw-dash-stat-content">
                <span className="lw-dash-stat-value">{openPositions.length}</span>
                <span className="lw-dash-stat-label">Open Positions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="lw-dash-main">
        <div className="container">
          <div className="lw-dash-layout">
            {/* Team Members */}
            <div className="lw-dash-card full-width">
              <div className="lw-dash-card-header">
                <h3>Team Directory</h3>
                <div className="lw-dept-filters">
                  {["all", "operations", "finance", "marketing", "technology"].map((dept) => (
                    <button
                      key={dept}
                      className={`lw-filter-btn ${selectedDepartment === dept ? "active" : ""}`}
                      onClick={() => setSelectedDepartment(dept)}
                    >
                      {dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="lw-team-table">
                {filteredMembers.length > 0 ? (
                  <>
                    <div className="lw-team-header">
                      <span>Employee</span>
                      <span>Department</span>
                      <span>Certifications</span>
                      <span>Hire Date</span>
                      <span>Status</span>
                    </div>
                    {filteredMembers.map((member) => (
                      <div key={member.id} className="lw-team-row">
                        <div className="lw-member-info">
                          <div className="lw-member-avatar">{member.avatar}</div>
                          <div>
                            <span className="lw-member-name">{member.name}</span>
                            <span className="lw-member-role">{member.role}</span>
                          </div>
                        </div>
                        <span className="lw-member-dept">{member.department}</span>
                        <div className="lw-member-certs">
                          <span className="lw-cert-count">{member.certifications}</span>
                          <span className="lw-cert-label">earned</span>
                        </div>
                        <span className="lw-member-hire">{member.hireDate}</span>
                        <span
                          className="lw-member-status"
                          style={{ color: getStatusColor(member.status) }}
                        >
                          {member.status}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="lw-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    <p>No team members yet</p>
                    <span>Add your first team member to get started</span>
                  </div>
                )}
              </div>
              <Link href="/loud-works/team" className="lw-view-all-btn">
                View Full Directory
              </Link>
            </div>

            {/* Today's Schedule */}
            <div className="lw-dash-card">
              <div className="lw-dash-card-header">
                <h3>Today&apos;s Coverage</h3>
                <Link href="/loud-works/schedule" className="lw-dash-link">Full Schedule</Link>
              </div>
              <div className="lw-schedule-list">
                {scheduleToday.length > 0 ? (
                  scheduleToday.map((shift) => (
                    <div key={shift.id} className="lw-schedule-row">
                      <div className="lw-shift-info">
                        <span className="lw-shift-name">{shift.shift}</span>
                        <span className="lw-shift-time">{shift.time}</span>
                      </div>
                      <div className="lw-shift-coverage">
                        <div className="lw-coverage-bar">
                          <div
                            className="lw-coverage-fill"
                            style={{
                              width: `${(shift.staffed / shift.required) * 100}%`,
                              background: shift.status === "covered" ? "#22C55E" : "#EF4444"
                            }}
                          />
                        </div>
                        <span className="lw-coverage-text">
                          {shift.staffed}/{shift.required} staffed
                        </span>
                      </div>
                      <span className={`lw-shift-status ${shift.status}`}>
                        {shift.status === "covered" ? "Covered" : "Needs Staff"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="lw-empty-state-sm">
                    <p>No shifts scheduled</p>
                  </div>
                )}
              </div>
            </div>

            {/* Open Positions */}
            <div className="lw-dash-card">
              <div className="lw-dash-card-header">
                <h3>Open Positions</h3>
                <Link href="/loud-works/recruiting" className="lw-dash-link">View All</Link>
              </div>
              <div className="lw-positions-list">
                {openPositions.length > 0 ? (
                  openPositions.map((position) => (
                    <div key={position.id} className="lw-position-row">
                      <div className="lw-position-info">
                        <span className="lw-position-title">{position.title}</span>
                        <span className="lw-position-dept">{position.department}</span>
                      </div>
                      <div className="lw-position-meta">
                        <span className="lw-position-applicants">{position.applicants} applicants</span>
                        <span
                          className="lw-position-priority"
                          style={{ background: getPriorityColor(position.priority) }}
                        >
                          {position.priority}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="lw-empty-state-sm">
                    <p>No open positions</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Training */}
            <div className="lw-dash-card">
              <div className="lw-dash-card-header">
                <h3>Upcoming Training</h3>
                <Link href="/loud-works/training" className="lw-dash-link">Manage</Link>
              </div>
              <div className="lw-training-list">
                {upcomingTrainings.length > 0 ? (
                  upcomingTrainings.map((training) => (
                    <div key={training.id} className="lw-training-row">
                      <div className="lw-training-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="12,2 2,7 12,12 22,7" />
                          <polyline points="2,17 12,22 22,17" />
                          <polyline points="2,12 12,17 22,12" />
                        </svg>
                      </div>
                      <div className="lw-training-info">
                        <span className="lw-training-name">{training.name}</span>
                        <span className="lw-training-meta">{training.date} &middot; {training.attendees} registered</span>
                      </div>
                      <span className={`lw-training-type ${training.type}`}>
                        {training.type}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="lw-empty-state-sm">
                    <p>No upcoming trainings</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lw-dash-card">
              <div className="lw-dash-card-header">
                <h3>Recent Activity</h3>
              </div>
              <div className="lw-activity-list">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="lw-activity-row">
                      <div className={`lw-activity-icon ${activity.type}`}>
                        {activity.type === "onboarding" && "👋"}
                        {activity.type === "certification" && "🎓"}
                        {activity.type === "review" && "📋"}
                        {activity.type === "training" && "📚"}
                      </div>
                      <div className="lw-activity-info">
                        <span className="lw-activity-action">{activity.action}</span>
                        <span className="lw-activity-person">{activity.person}</span>
                      </div>
                      <span className="lw-activity-time">{activity.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="lw-empty-state-sm">
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lw-dash-card">
              <div className="lw-dash-card-header">
                <h3>Quick Actions</h3>
              </div>
              <div className="lw-quick-actions">
                <button
                  className={`lw-quick-action ${activeQuickAction === "employee" ? "active" : ""}`}
                  onClick={() => setActiveQuickAction(activeQuickAction === "employee" ? null : "employee")}
                >
                  <span className="lw-qa-icon">👤</span>
                  <span>Add Employee</span>
                </button>
                <button
                  className={`lw-quick-action ${activeQuickAction === "schedule" ? "active" : ""}`}
                  onClick={() => setActiveQuickAction(activeQuickAction === "schedule" ? null : "schedule")}
                >
                  <span className="lw-qa-icon">📅</span>
                  <span>Edit Schedule</span>
                </button>
                <button
                  className={`lw-quick-action ${activeQuickAction === "reports" ? "active" : ""}`}
                  onClick={() => setActiveQuickAction(activeQuickAction === "reports" ? null : "reports")}
                >
                  <span className="lw-qa-icon">📊</span>
                  <span>Run Reports</span>
                </button>
                <button
                  className={`lw-quick-action ${activeQuickAction === "goals" ? "active" : ""}`}
                  onClick={() => { setActiveQuickAction(null); setShowGrowthOptimizer(true); }}
                >
                  <span className="lw-qa-icon">🎯</span>
                  <span>Set Goals</span>
                </button>
              </div>
              {activeQuickAction && (
                <div className="lw-action-panel">
                  {activeQuickAction === "employee" && (
                    <div className="lw-action-content">
                      <h4>Add New Employee</h4>
                      <input
                        type="text"
                        placeholder="Full name"
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                        className="lw-action-input"
                      />
                      <input
                        type="text"
                        placeholder="Role / Position"
                        value={newEmployeeRole}
                        onChange={(e) => setNewEmployeeRole(e.target.value)}
                        className="lw-action-input"
                      />
                      <select className="lw-action-select">
                        <option>Select Department</option>
                        <option>Operations</option>
                        <option>Finance</option>
                        <option>Marketing</option>
                        <option>Technology</option>
                      </select>
                      <button
                        className="lw-action-submit"
                        onClick={() => { setActionSuccess(true); setNewEmployeeName(""); setNewEmployeeRole(""); setTimeout(() => setActionSuccess(false), 2000); }}
                      >
                        {actionSuccess ? "Added!" : "Add Employee"}
                      </button>
                    </div>
                  )}
                  {activeQuickAction === "schedule" && (
                    <div className="lw-action-content">
                      <h4>Quick Schedule Edit</h4>
                      <select className="lw-action-select">
                        <option>Select Employee</option>
                        <option>All Staff</option>
                      </select>
                      <select className="lw-action-select">
                        <option>Select Shift</option>
                        <option>Morning (6 AM - 2 PM)</option>
                        <option>Afternoon (2 PM - 10 PM)</option>
                        <option>Evening Event</option>
                      </select>
                      <input type="date" className="lw-action-input" />
                      <button
                        className="lw-action-submit"
                        onClick={() => { setActionSuccess(true); setTimeout(() => setActionSuccess(false), 2000); }}
                      >
                        {actionSuccess ? "Updated!" : "Update Schedule"}
                      </button>
                    </div>
                  )}
                  {activeQuickAction === "reports" && (
                    <div className="lw-action-content">
                      <h4>Quick Reports</h4>
                      <div className="lw-report-buttons">
                        <button className="lw-report-btn">Attendance Report</button>
                        <button className="lw-report-btn">Payroll Summary</button>
                        <button className="lw-report-btn">Training Status</button>
                        <button className="lw-report-btn">Performance Review</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AI Growth Optimizer Section */}
      <section className="lw-ai-section">
        <div className="container">
          <div className="lw-ai-toggle-card" onClick={() => setShowGrowthOptimizer(!showGrowthOptimizer)}>
            <div className="lw-ai-toggle-left">
              <div className="lw-ai-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div>
                <h3>AI Growth Optimizer</h3>
                <p>Set goals, get personalized learning paths, and track your professional development</p>
              </div>
            </div>
            <div className={`lw-ai-chevron ${showGrowthOptimizer ? "open" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {showGrowthOptimizer && (
            <div className="lw-ai-panel">
              {/* Goals Section */}
              <div className="lw-ai-goals-section">
                <h4>Your Growth Goals</h4>
                <div className="lw-ai-add-goal">
                  <input
                    type="text"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Enter a new goal (e.g., 'Complete AWS certification')"
                    onKeyDown={(e) => e.key === "Enter" && addGoal()}
                  />
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value as GrowthGoal["category"])}
                  >
                    <option value="skill">Skill</option>
                    <option value="leadership">Leadership</option>
                    <option value="certification">Certification</option>
                    <option value="career">Career</option>
                  </select>
                  <button onClick={addGoal} disabled={!newGoal.trim()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Goal
                  </button>
                </div>

                {goals.length > 0 && (
                  <div className="lw-ai-goals-list">
                    {goals.map((goal) => (
                      <div key={goal.id} className="lw-ai-goal-item">
                        <span className="lw-ai-goal-icon" style={{ background: getCategoryColor(goal.category) }}>
                          {getCategoryIcon(goal.category)}
                        </span>
                        <div className="lw-ai-goal-info">
                          <span className="lw-ai-goal-title">{goal.title}</span>
                          <span className="lw-ai-goal-meta">
                            {goal.category} &middot; Target: {goal.targetDate}
                          </span>
                        </div>
                        <button className="lw-ai-goal-remove" onClick={() => removeGoal(goal.id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="lw-ai-analyze-btn"
                  onClick={runGrowthAnalysis}
                  disabled={goals.length === 0 || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="lw-ai-spinner" />
                      Analyzing Growth Path...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Optimize My Growth Path
                    </>
                  )}
                </button>
              </div>

              {/* AI Analysis Results */}
              {growthAnalysis && (
                <div className="lw-ai-results">
                  {/* Progress Overview */}
                  <div className="lw-ai-progress-section">
                    <div className="lw-ai-progress-ring">
                      <svg viewBox="0 0 120 120" width="100" height="100">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="url(#progressGradient)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${(growthAnalysis.overallProgress / 100) * 339.292} 339.292`}
                          transform="rotate(-90 60 60)"
                        />
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#F97316" />
                            <stop offset="100%" stopColor="#FB923C" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="lw-ai-progress-value">
                        <span className="lw-ai-progress-num">{growthAnalysis.overallProgress}%</span>
                        <span className="lw-ai-progress-label">Progress</span>
                      </div>
                    </div>
                    <div className="lw-ai-progress-info">
                      <h4>Career Growth Trajectory</h4>
                      <p>{growthAnalysis.careerPathInsight}</p>
                    </div>
                  </div>

                  {/* Strengths & Opportunities */}
                  <div className="lw-ai-strengths-grid">
                    <div className="lw-ai-strengths-card">
                      <h5>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" width="18" height="18">
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Strength Areas
                      </h5>
                      <ul>
                        {growthAnalysis.strengthAreas.map((strength, idx) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="lw-ai-opportunities-card">
                      <h5>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" width="18" height="18">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                        Growth Opportunities
                      </h5>
                      <ul>
                        {growthAnalysis.growthOpportunities.map((opp, idx) => (
                          <li key={idx}>{opp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommended Courses */}
                  <div className="lw-ai-courses-section">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                      Recommended Learning
                    </h4>
                    <div className="lw-ai-courses-grid">
                      {growthAnalysis.recommendedCourses.map((course) => (
                        <div key={course.id} className="lw-ai-course-card">
                          <div className="lw-ai-course-header">
                            <span className="lw-ai-course-level" data-level={course.level}>
                              {course.level}
                            </span>
                            <span className="lw-ai-course-relevance">
                              {course.relevanceScore}% match
                            </span>
                          </div>
                          <h5>{course.title}</h5>
                          <p>{course.description}</p>
                          <div className="lw-ai-course-meta">
                            <span>{course.provider}</span>
                            <span>{course.duration}</span>
                          </div>
                          <a
                            href={course.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lw-ai-course-link"
                          >
                            Start Learning
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Items */}
                  <div className="lw-ai-actions-section">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                      </svg>
                      Action Items
                    </h4>
                    <div className="lw-ai-actions-list">
                      {growthAnalysis.actionItems.map((item) => (
                        <div key={item.id} className="lw-ai-action-item">
                          <label className="lw-ai-action-checkbox">
                            <input type="checkbox" defaultChecked={item.completed} />
                            <span className="lw-ai-checkmark"></span>
                          </label>
                          <div className="lw-ai-action-content">
                            <span className="lw-ai-action-task">{item.task}</span>
                            <span className="lw-ai-action-meta">
                              {item.timeframe} &middot; Related to: {item.relatedGoal}
                            </span>
                          </div>
                          <span className={`lw-ai-action-impact ${item.impact}`}>
                            {item.impact} impact
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skill Gaps */}
                  <div className="lw-ai-gaps-section">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      Skills to Develop
                    </h4>
                    <div className="lw-ai-gaps-list">
                      {growthAnalysis.skillGaps.map((gap, idx) => (
                        <span key={idx} className="lw-ai-gap-tag">{gap}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Certificate Upload Section */}
              <div className="lw-ai-certs-section">
                <h4>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <path d="M8 11h8M8 15h5" />
                  </svg>
                  Training Certificates
                </h4>
                <p className="lw-ai-certs-desc">Upload completion certificates for trainings assigned by your admin.</p>

                <input
                  ref={certInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  onChange={(e) => uploadingCertId && handleCertificateUpload(uploadingCertId, e)}
                />

                <div className="lw-ai-certs-list">
                  {certificates.length > 0 ? (
                    certificates.map((cert) => (
                      <div key={cert.id} className="lw-ai-cert-item">
                        <div className="lw-ai-cert-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <polygon points="12 2 2 7 12 12 22 7 12 2" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                          </svg>
                        </div>
                        <div className="lw-ai-cert-info">
                          <span className="lw-ai-cert-name">{cert.trainingName}</span>
                          <span className="lw-ai-cert-meta">
                            Assigned by: {cert.assignedBy}
                            {cert.fileName && ` • ${cert.fileName}`}
                          </span>
                        </div>
                        <div className="lw-ai-cert-actions">
                          {cert.fileName ? (
                            <span className={`lw-ai-cert-status ${cert.status}`}>
                              {cert.status === "verified" && "✓ Verified"}
                              {cert.status === "pending" && "Pending Review"}
                              {cert.status === "rejected" && "Rejected"}
                            </span>
                          ) : (
                            <button
                              className="lw-ai-cert-upload-btn"
                              onClick={() => triggerCertUpload(cert.id)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              Upload Certificate
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="lw-empty-state-sm">
                      <p>No training certificates assigned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
