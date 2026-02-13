"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

// AI Account Research Types
interface AIAccountResearch {
  contactId: number;
  companyOverview: string;
  industry: string;
  employeeCount: string;
  founded: string;
  headquarters: string;
  recentNews: {
    title: string;
    date: string;
    sentiment: "positive" | "neutral" | "negative";
  }[];
  socialActivity: {
    platform: string;
    followers: string;
    engagement: string;
  }[];
  talkingPoints: string[];
  relationshipSuggestions: string[];
  riskFactors: string[];
  opportunityScore: number;
  buyingSignals: string[];
  competitorInfo: string;
}

// CRM data - starts empty for user to add their own
const contacts: { id: number; name: string; company: string; email: string; phone: string; status: string; lastContact: string; value: number; avatar: string }[] = [];

const pipeline = [
  { stage: "Lead", count: 0, value: 0, color: "#64748B" },
  { stage: "Qualified", count: 0, value: 0, color: "#3B82F6" },
  { stage: "Proposal", count: 0, value: 0, color: "#8B5CF6" },
  { stage: "Negotiation", count: 0, value: 0, color: "#F59E0B" },
  { stage: "Closed", count: 0, value: 0, color: "#10B981" },
];

const activities: { id: number; type: string; contact: string; description: string; time: string }[] = [];

const upcomingTasks: { id: number; title: string; type: string; dueDate: string; priority: string }[] = [];

export default function LegacyCRMDashboard() {
  const [contactFilter, setContactFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Actions State
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionSuccess, setActionSuccess] = useState(false);

  // AI Account Research State
  const [showAIResearch, setShowAIResearch] = useState(false);
  const [selectedContact, setSelectedContact] = useState<typeof contacts[0] | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<AIAccountResearch | null>(null);

  const handleQuickAction = () => {
    setActionSuccess(true);
    setActionNote("");
    setTimeout(() => setActionSuccess(false), 2000);
  };

  const runAIResearch = async (contact: typeof contacts[0]) => {
    setSelectedContact(contact);
    setShowAIResearch(true);
    setIsResearching(true);
    setResearchResult(null);

    // Simulate AI research
    await new Promise(resolve => setTimeout(resolve, 2000));

    const research: AIAccountResearch = {
      contactId: contact.id,
      companyOverview: `${contact.company} is a dynamic organization in the technology sector, known for innovative solutions and strong market presence. They have shown consistent growth over the past 3 years with a focus on digital transformation initiatives.`,
      industry: "Technology / Enterprise Software",
      employeeCount: "250-500",
      founded: "2015",
      headquarters: "San Francisco, CA",
      recentNews: [
        { title: `${contact.company} announces Q4 expansion plans`, date: "Jan 15, 2024", sentiment: "positive" },
        { title: "New partnership with major cloud provider", date: "Jan 10, 2024", sentiment: "positive" },
        { title: "Industry award for innovation", date: "Dec 28, 2023", sentiment: "positive" }
      ],
      socialActivity: [
        { platform: "LinkedIn", followers: "12.5K", engagement: "High" },
        { platform: "Twitter", followers: "8.2K", engagement: "Medium" },
        { platform: "Facebook", followers: "5.1K", engagement: "Low" }
      ],
      talkingPoints: [
        `Congratulate on recent ${contact.company} expansion announcement`,
        "Discuss how your solution aligns with their digital transformation goals",
        "Reference their recent industry award as proof of innovation culture",
        "Ask about challenges in scaling their current infrastructure"
      ],
      relationshipSuggestions: [
        "Schedule a quarterly business review to strengthen relationship",
        "Connect with their VP of Engineering who recently joined",
        "Invite to upcoming industry webinar as a speaker opportunity",
        "Share relevant case study from similar company in their sector"
      ],
      riskFactors: [
        "Competitor actively targeting this account",
        "Budget decisions typically made in Q1 - timing sensitive",
        "Key stakeholder may be transitioning roles"
      ],
      opportunityScore: 78,
      buyingSignals: [
        "Recently posted job listings for technical roles",
        "Increased activity on your product pages",
        "Engaged with 3 marketing emails in past month",
        "Requested pricing information last week"
      ],
      competitorInfo: "Currently evaluating 2 competitors. Main competitor is offering aggressive discounts. Key differentiator needed on integration capabilities."
    };

    setResearchResult(research);
    setIsResearching(false);
  };

  const closeResearchPanel = () => {
    setShowAIResearch(false);
    setSelectedContact(null);
    setResearchResult(null);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "#22C55E";
      case "negative": return "#EF4444";
      default: return "#64748B";
    }
  };

  const totalPipelineValue = pipeline.reduce((sum, p) => sum + p.value, 0);
  const totalContacts = contacts.length;
  const hotLeads = contacts.filter(c => c.status === "hot").length;
  const avgDealValue = Math.round(totalPipelineValue / pipeline.reduce((sum, p) => sum + p.count, 0));

  const filteredContacts = contacts.filter(c => {
    const matchesFilter = contactFilter === "all" || c.status === contactFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot": return "#EF4444";
      case "warm": return "#F59E0B";
      case "cold": return "#64748B";
      default: return "#64748B";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return "📞";
      case "email": return "✉️";
      case "meeting": return "🤝";
      case "note": return "📝";
      case "task": return "✅";
      default: return "📋";
    }
  };

  return (
    <main className="lcrm-dashboard-page">
      <Header />

      {/* Dashboard Header */}
      <section className="lcrm-dash-header">
        <div className="container">
          <div className="lcrm-dash-header-content">
            <div>
              <div className="lcrm-breadcrumb">
                <Link href="/legacy-crm">Legacy CRM</Link>
                <span>/</span>
                <span>Dashboard</span>
              </div>
              <h1>Relationship Dashboard</h1>
              <p>Nurture relationships that drive your success.</p>
            </div>
            <div className="lcrm-dash-actions">
              <button className="lcrm-dash-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import
              </button>
              <button className="lcrm-dash-btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Contact
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="lcrm-dash-stats">
        <div className="container">
          <div className="lcrm-dash-stats-grid">
            <div className="lcrm-dash-stat">
              <div className="lcrm-dash-stat-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div className="lcrm-dash-stat-content">
                <span className="lcrm-dash-stat-value">${(totalPipelineValue / 1000000).toFixed(1)}M</span>
                <span className="lcrm-dash-stat-label">Pipeline Value</span>
              </div>
            </div>

            <div className="lcrm-dash-stat">
              <div className="lcrm-dash-stat-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="lcrm-dash-stat-content">
                <span className="lcrm-dash-stat-value">{totalContacts}</span>
                <span className="lcrm-dash-stat-label">Total Contacts</span>
              </div>
            </div>

            <div className="lcrm-dash-stat">
              <div className="lcrm-dash-stat-icon red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </div>
              <div className="lcrm-dash-stat-content">
                <span className="lcrm-dash-stat-value">{hotLeads}</span>
                <span className="lcrm-dash-stat-label">Hot Leads</span>
              </div>
            </div>

            <div className="lcrm-dash-stat">
              <div className="lcrm-dash-stat-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div className="lcrm-dash-stat-content">
                <span className="lcrm-dash-stat-value">${(avgDealValue / 1000).toFixed(0)}K</span>
                <span className="lcrm-dash-stat-label">Avg Deal Value</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="lcrm-dash-main">
        <div className="container">
          <div className="lcrm-dash-layout">
            {/* Pipeline */}
            <div className="lcrm-dash-card full-width">
              <div className="lcrm-dash-card-header">
                <h3>Sales Pipeline</h3>
                <Link href="/legacy-crm/pipeline" className="lcrm-dash-link">View Full Pipeline</Link>
              </div>
              <div className="lcrm-pipeline-visual">
                {pipeline.map((stage, index) => (
                  <div key={stage.stage} className="lcrm-pipeline-stage">
                    <div
                      className="lcrm-pipeline-bar"
                      style={{
                        background: stage.color,
                        width: `${(stage.value / totalPipelineValue) * 100}%`,
                        minWidth: "80px"
                      }}
                    >
                      <span className="lcrm-pipeline-count">{stage.count}</span>
                    </div>
                    <div className="lcrm-pipeline-info">
                      <span className="lcrm-pipeline-name">{stage.stage}</span>
                      <span className="lcrm-pipeline-value">${(stage.value / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contacts List */}
            <div className="lcrm-dash-card">
              <div className="lcrm-dash-card-header">
                <h3>Recent Contacts</h3>
                <div className="lcrm-contact-filters">
                  {["all", "hot", "warm", "cold"].map((filter) => (
                    <button
                      key={filter}
                      className={`lcrm-filter-btn ${contactFilter === filter ? "active" : ""}`}
                      onClick={() => setContactFilter(filter)}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="lcrm-contact-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="lcrm-contacts-list">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <div key={contact.id} className="lcrm-contact-row">
                      <div className="lcrm-contact-avatar" style={{ background: `linear-gradient(135deg, ${getStatusColor(contact.status)} 0%, ${getStatusColor(contact.status)}99 100%)` }}>
                        {contact.avatar}
                      </div>
                      <div className="lcrm-contact-info">
                        <span className="lcrm-contact-name">{contact.name}</span>
                        <span className="lcrm-contact-company">{contact.company}</span>
                      </div>
                      <div className="lcrm-contact-meta">
                        <span className="lcrm-contact-value">${(contact.value / 1000).toFixed(0)}K</span>
                        <span className={`lcrm-contact-status ${contact.status}`}>{contact.status}</span>
                      </div>
                      <button
                        className="lcrm-ai-research-btn"
                        onClick={() => runAIResearch(contact)}
                        title="AI Account Research"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="lcrm-empty-state-sm">
                    <p>No contacts yet</p>
                    <span>Add your first contact to get started</span>
                  </div>
                )}
              </div>
              <Link href="/legacy-crm/contacts" className="lcrm-view-all-btn">
                View All Contacts
              </Link>
            </div>

            {/* Activity Feed */}
            <div className="lcrm-dash-card">
              <div className="lcrm-dash-card-header">
                <h3>Recent Activity</h3>
                <Link href="/legacy-crm/activities" className="lcrm-dash-link">View All</Link>
              </div>
              <div className="lcrm-activity-feed">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="lcrm-activity-item">
                      <span className="lcrm-activity-icon">{getActivityIcon(activity.type)}</span>
                      <div className="lcrm-activity-content">
                        <span className="lcrm-activity-contact">{activity.contact}</span>
                        <span className="lcrm-activity-desc">{activity.description}</span>
                        <span className="lcrm-activity-time">{activity.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="lcrm-empty-state-sm">
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="lcrm-dash-card">
              <div className="lcrm-dash-card-header">
                <h3>Upcoming Tasks</h3>
                <button className="lcrm-add-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
              <div className="lcrm-upcoming-tasks">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.map((task) => (
                    <div key={task.id} className="lcrm-upcoming-task">
                      <div className="lcrm-task-checkbox">
                        <input type="checkbox" />
                      </div>
                      <div className="lcrm-task-info">
                        <span className="lcrm-task-title">{task.title}</span>
                        <span className="lcrm-task-due">{task.dueDate}</span>
                      </div>
                      <span className={`lcrm-task-priority ${task.priority}`}>{task.priority}</span>
                    </div>
                  ))
                ) : (
                  <div className="lcrm-empty-state-sm">
                    <p>No upcoming tasks</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lcrm-dash-card">
              <div className="lcrm-dash-card-header">
                <h3>Quick Actions</h3>
              </div>
              <div className="lcrm-quick-actions">
                <button
                  className={`lcrm-quick-action ${activeQuickAction === "call" ? "active" : ""}`}
                  onClick={() => setActiveQuickAction(activeQuickAction === "call" ? null : "call")}
                >
                  <span className="lcrm-qa-icon">📞</span>
                  <span>Log Call</span>
                </button>
                <button
                  className={`lcrm-quick-action ${activeQuickAction === "email" ? "active" : ""}`}
                  onClick={() => setActiveQuickAction(activeQuickAction === "email" ? null : "email")}
                >
                  <span className="lcrm-qa-icon">✉️</span>
                  <span>Send Email</span>
                </button>
                <button
                  className={`lcrm-quick-action ${activeQuickAction === "meeting" ? "active" : ""}`}
                  onClick={() => setActiveQuickAction(activeQuickAction === "meeting" ? null : "meeting")}
                >
                  <span className="lcrm-qa-icon">📅</span>
                  <span>Schedule Meeting</span>
                </button>
                <button
                  className={`lcrm-quick-action ${activeQuickAction === "note" ? "active" : ""}`}
                  onClick={() => setActiveQuickAction(activeQuickAction === "note" ? null : "note")}
                >
                  <span className="lcrm-qa-icon">📝</span>
                  <span>Add Note</span>
                </button>
              </div>
              {activeQuickAction && (
                <div className="lcrm-action-panel">
                  {activeQuickAction === "call" && (
                    <div className="lcrm-action-content">
                      <h4>Log Call</h4>
                      <select className="lcrm-action-select">
                        <option>Select Contact</option>
                        <option>Add new contact...</option>
                      </select>
                      <input type="text" placeholder="Call duration (mins)" className="lcrm-action-input" />
                      <textarea
                        placeholder="Call notes..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        className="lcrm-action-textarea"
                        rows={2}
                      />
                      <button className="lcrm-action-submit" onClick={handleQuickAction}>
                        {actionSuccess ? "Logged!" : "Log Call"}
                      </button>
                    </div>
                  )}
                  {activeQuickAction === "email" && (
                    <div className="lcrm-action-content">
                      <h4>Send Email</h4>
                      <input type="email" placeholder="Recipient email" className="lcrm-action-input" />
                      <input type="text" placeholder="Subject" className="lcrm-action-input" />
                      <textarea
                        placeholder="Message..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        className="lcrm-action-textarea"
                        rows={3}
                      />
                      <button className="lcrm-action-submit" onClick={handleQuickAction}>
                        {actionSuccess ? "Sent!" : "Send Email"}
                      </button>
                    </div>
                  )}
                  {activeQuickAction === "meeting" && (
                    <div className="lcrm-action-content">
                      <h4>Schedule Meeting</h4>
                      <select className="lcrm-action-select">
                        <option>Select Contact</option>
                        <option>Add new contact...</option>
                      </select>
                      <input type="datetime-local" className="lcrm-action-input" />
                      <input type="text" placeholder="Meeting title" className="lcrm-action-input" />
                      <button className="lcrm-action-submit" onClick={handleQuickAction}>
                        {actionSuccess ? "Scheduled!" : "Schedule"}
                      </button>
                    </div>
                  )}
                  {activeQuickAction === "note" && (
                    <div className="lcrm-action-content">
                      <h4>Add Note</h4>
                      <select className="lcrm-action-select">
                        <option>Select Contact</option>
                        <option>General note...</option>
                      </select>
                      <textarea
                        placeholder="Your note..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        className="lcrm-action-textarea"
                        rows={4}
                      />
                      <button className="lcrm-action-submit" onClick={handleQuickAction}>
                        {actionSuccess ? "Saved!" : "Save Note"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AI Research Panel */}
      {showAIResearch && (
        <div className="lcrm-ai-overlay" onClick={closeResearchPanel}>
          <div className="lcrm-ai-panel" onClick={(e) => e.stopPropagation()}>
            <div className="lcrm-ai-panel-header">
              <div className="lcrm-ai-panel-title">
                <div className="lcrm-ai-panel-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <div>
                  <h3>AI Account Research</h3>
                  {selectedContact && (
                    <p>{selectedContact.name} - {selectedContact.company}</p>
                  )}
                </div>
              </div>
              <button className="lcrm-ai-close" onClick={closeResearchPanel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="lcrm-ai-panel-body">
              {isResearching ? (
                <div className="lcrm-ai-loading">
                  <div className="lcrm-ai-loading-spinner" />
                  <h4>Researching account...</h4>
                  <p>Gathering company intelligence, news, and insights</p>
                </div>
              ) : researchResult ? (
                <div className="lcrm-ai-results">
                  {/* Opportunity Score */}
                  <div className="lcrm-ai-score-banner">
                    <div className="lcrm-ai-score-ring">
                      <svg viewBox="0 0 100 100" width="80" height="80">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="url(#scoreGradient)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(researchResult.opportunityScore / 100) * 283} 283`}
                          transform="rotate(-90 50 50)"
                        />
                        <defs>
                          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#A78BFA" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="lcrm-ai-score-value">{researchResult.opportunityScore}</span>
                    </div>
                    <div className="lcrm-ai-score-info">
                      <h4>Opportunity Score</h4>
                      <p>Based on engagement signals, company health, and buying indicators</p>
                    </div>
                  </div>

                  {/* Company Overview */}
                  <div className="lcrm-ai-section">
                    <h4>Company Overview</h4>
                    <p className="lcrm-ai-overview">{researchResult.companyOverview}</p>
                    <div className="lcrm-ai-company-meta">
                      <span><strong>Industry:</strong> {researchResult.industry}</span>
                      <span><strong>Employees:</strong> {researchResult.employeeCount}</span>
                      <span><strong>Founded:</strong> {researchResult.founded}</span>
                      <span><strong>HQ:</strong> {researchResult.headquarters}</span>
                    </div>
                  </div>

                  {/* Buying Signals */}
                  <div className="lcrm-ai-section">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" width="18" height="18">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Buying Signals
                    </h4>
                    <ul className="lcrm-ai-signals">
                      {researchResult.buyingSignals.map((signal, idx) => (
                        <li key={idx}>{signal}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Recent News */}
                  <div className="lcrm-ai-section">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" width="18" height="18">
                        <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                      </svg>
                      Recent News
                    </h4>
                    <div className="lcrm-ai-news-list">
                      {researchResult.recentNews.map((news, idx) => (
                        <div key={idx} className="lcrm-ai-news-item">
                          <span className="lcrm-ai-news-title">{news.title}</span>
                          <div className="lcrm-ai-news-meta">
                            <span className="lcrm-ai-news-date">{news.date}</span>
                            <span
                              className="lcrm-ai-news-sentiment"
                              style={{ color: getSentimentColor(news.sentiment) }}
                            >
                              {news.sentiment}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Talking Points */}
                  <div className="lcrm-ai-section">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" width="18" height="18">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      Talking Points
                    </h4>
                    <ul className="lcrm-ai-points">
                      {researchResult.talkingPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Relationship Suggestions */}
                  <div className="lcrm-ai-section">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" width="18" height="18">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                      Relationship Suggestions
                    </h4>
                    <ul className="lcrm-ai-suggestions">
                      {researchResult.relationshipSuggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Risk Factors */}
                  <div className="lcrm-ai-section lcrm-ai-risks">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" width="18" height="18">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      Risk Factors
                    </h4>
                    <ul>
                      {researchResult.riskFactors.map((risk, idx) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Competitor Info */}
                  <div className="lcrm-ai-section lcrm-ai-competitor">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" width="18" height="18">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      Competitive Intelligence
                    </h4>
                    <p>{researchResult.competitorInfo}</p>
                  </div>

                  {/* Actions */}
                  <div className="lcrm-ai-panel-actions">
                    <button className="lcrm-ai-action-btn secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export Research
                    </button>
                    <button className="lcrm-ai-action-btn primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Schedule Follow-up
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
