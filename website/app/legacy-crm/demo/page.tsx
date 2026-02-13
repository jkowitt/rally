"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  title?: string;
  relationship: "hot" | "warm" | "cold" | "new";
  importance: "high" | "medium" | "low";
  lastContact?: string;
  nextFollowUp?: string;
  notes: string;
  tags: string[];
}

interface Opportunity {
  id: string;
  contactId: string;
  title: string;
  value?: number;
  stage: string;
  probability: number;
}

interface CRMStats {
  totalContacts: number;
  hotRelationships: number;
  warmRelationships: number;
  coldRelationships: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  openOpportunities: number;
  pipelineValue: number;
}

export default function LegacyCRMDemoPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [activeView, setActiveView] = useState<"dashboard" | "contacts" | "pipeline">("dashboard");
  const [showAddContact, setShowAddContact] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch demo data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/legacy-crm/demo");
      const data = await response.json();

      if (data.success) {
        setStats(data.data.stats);
        setContacts(data.data.contacts);
        setOpportunities(data.data.opportunities);
      }
    } catch (error) {
      console.error("Failed to fetch demo data:", error);
      showToast("Failed to load demo data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/legacy-crm/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact",
          data: {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            email: formData.get("email"),
            company: formData.get("company"),
            title: formData.get("title"),
            relationship: "new",
            importance: "medium",
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Contact added successfully!", "success");
        setShowAddContact(false);
        fetchData();
        form.reset();
      }
    } catch (error) {
      showToast("Failed to add contact", "error");
    }
  };

  const handleResetDemo = async () => {
    try {
      await fetch("/api/legacy-crm/demo?type=reset", { method: "DELETE" });
      showToast("Demo data reset!", "success");
      fetchData();
    } catch (error) {
      showToast("Failed to reset demo", "error");
    }
  };

  const getRelationshipColor = (rel: string) => {
    switch (rel) {
      case "hot": return "#27AE60";
      case "warm": return "#F59E0B";
      case "cold": return "#6B7280";
      case "new": return "#3B82F6";
      default: return "#6B7280";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <main className="legacy-crm-page">
      <Header />

      {/* Toast */}
      {toast && (
        <div className={`lcrm-toast lcrm-toast--${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* Demo Header */}
      <section className="lcrm-demo-header">
        <div className="container">
          <div className="lcrm-demo-header-content">
            <div>
              <span className="lcrm-demo-badge">Interactive Demo</span>
              <h1>Experience Legacy CRM</h1>
              <p>Explore the features with sample data. Add contacts, track relationships, and see how discipline drives results.</p>
            </div>
            <div className="lcrm-demo-actions">
              <button onClick={handleResetDemo} className="lcrm-btn-outline">
                Reset Demo Data
              </button>
              <Link href="/legacy-crm" className="lcrm-btn-ghost">
                ← Back to Overview
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="lcrm-demo-nav">
        <div className="container">
          <div className="lcrm-demo-tabs">
            <button
              className={`lcrm-demo-tab ${activeView === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveView("dashboard")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              Dashboard
            </button>
            <button
              className={`lcrm-demo-tab ${activeView === "contacts" ? "active" : ""}`}
              onClick={() => setActiveView("contacts")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              Contacts ({contacts.length})
            </button>
            <button
              className={`lcrm-demo-tab ${activeView === "pipeline" ? "active" : ""}`}
              onClick={() => setActiveView("pipeline")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              Pipeline ({opportunities.length})
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="lcrm-demo-content">
        <div className="container">
          {loading ? (
            <div className="lcrm-loading">
              <div className="lcrm-spinner-large"></div>
              <p>Loading demo data...</p>
            </div>
          ) : (
            <>
              {/* Dashboard View */}
              {activeView === "dashboard" && stats && (
                <div className="lcrm-dashboard">
                  <div className="lcrm-stats-grid">
                    <div className="lcrm-stat-box">
                      <span className="lcrm-stat-value">{stats.totalContacts}</span>
                      <span className="lcrm-stat-title">Total Contacts</span>
                    </div>
                    <div className="lcrm-stat-box lcrm-stat-box--green">
                      <span className="lcrm-stat-value">{stats.hotRelationships}</span>
                      <span className="lcrm-stat-title">Hot Relationships</span>
                    </div>
                    <div className="lcrm-stat-box lcrm-stat-box--yellow">
                      <span className="lcrm-stat-value">{stats.pendingFollowUps}</span>
                      <span className="lcrm-stat-title">Pending Follow-Ups</span>
                    </div>
                    <div className="lcrm-stat-box lcrm-stat-box--blue">
                      <span className="lcrm-stat-value">{formatCurrency(stats.pipelineValue)}</span>
                      <span className="lcrm-stat-title">Weighted Pipeline</span>
                    </div>
                  </div>

                  <div className="lcrm-dashboard-grid">
                    <div className="lcrm-panel">
                      <h3>Recent Contacts</h3>
                      <div className="lcrm-contact-list">
                        {contacts.slice(0, 4).map((contact) => (
                          <div key={contact.id} className="lcrm-contact-item" onClick={() => setSelectedContact(contact)}>
                            <div className="lcrm-contact-avatar" style={{ background: getRelationshipColor(contact.relationship) }}>
                              {contact.firstName[0]}{contact.lastName[0]}
                            </div>
                            <div className="lcrm-contact-info">
                              <span className="lcrm-contact-name">{contact.firstName} {contact.lastName}</span>
                              <span className="lcrm-contact-company">{contact.company}</span>
                            </div>
                            <span className="lcrm-relationship-badge" style={{ background: getRelationshipColor(contact.relationship) }}>
                              {contact.relationship}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lcrm-panel">
                      <h3>Open Opportunities</h3>
                      <div className="lcrm-opportunity-list">
                        {opportunities.filter(o => !["closed-won", "closed-lost"].includes(o.stage)).map((opp) => (
                          <div key={opp.id} className="lcrm-opportunity-item">
                            <div className="lcrm-opp-info">
                              <span className="lcrm-opp-title">{opp.title}</span>
                              <span className="lcrm-opp-stage">{opp.stage}</span>
                            </div>
                            <div className="lcrm-opp-value">
                              <span className="lcrm-opp-amount">{formatCurrency(opp.value || 0)}</span>
                              <span className="lcrm-opp-prob">{opp.probability}% likely</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contacts View */}
              {activeView === "contacts" && (
                <div className="lcrm-contacts-view">
                  <div className="lcrm-contacts-header">
                    <h2>All Contacts</h2>
                    <button className="lcrm-btn-primary" onClick={() => setShowAddContact(true)}>
                      + Add Contact
                    </button>
                  </div>

                  <div className="lcrm-contacts-grid">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="lcrm-contact-card" onClick={() => setSelectedContact(contact)}>
                        <div className="lcrm-contact-card-header">
                          <div className="lcrm-contact-avatar-lg" style={{ background: getRelationshipColor(contact.relationship) }}>
                            {contact.firstName[0]}{contact.lastName[0]}
                          </div>
                          <div>
                            <h4>{contact.firstName} {contact.lastName}</h4>
                            <p>{contact.title} at {contact.company}</p>
                          </div>
                        </div>
                        <div className="lcrm-contact-card-body">
                          <div className="lcrm-contact-meta">
                            <span className="lcrm-relationship-badge" style={{ background: getRelationshipColor(contact.relationship) }}>
                              {contact.relationship}
                            </span>
                            <span className="lcrm-importance-badge">{contact.importance} priority</span>
                          </div>
                          {contact.lastContact && (
                            <p className="lcrm-last-contact">Last contact: {contact.lastContact}</p>
                          )}
                          {contact.nextFollowUp && (
                            <p className="lcrm-follow-up">Follow up: {contact.nextFollowUp}</p>
                          )}
                        </div>
                        <div className="lcrm-contact-card-tags">
                          {contact.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="lcrm-tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pipeline View */}
              {activeView === "pipeline" && (
                <div className="lcrm-pipeline-view">
                  <h2>Opportunity Pipeline</h2>
                  <div className="lcrm-pipeline-board">
                    {["lead", "qualified", "proposal", "negotiation"].map((stage) => (
                      <div key={stage} className="lcrm-pipeline-column">
                        <div className="lcrm-pipeline-column-header">
                          <h4>{stage.charAt(0).toUpperCase() + stage.slice(1)}</h4>
                          <span className="lcrm-pipeline-count">
                            {opportunities.filter((o) => o.stage === stage).length}
                          </span>
                        </div>
                        <div className="lcrm-pipeline-cards">
                          {opportunities
                            .filter((o) => o.stage === stage)
                            .map((opp) => (
                              <div key={opp.id} className="lcrm-pipeline-card">
                                <h5>{opp.title}</h5>
                                <p className="lcrm-pipeline-value">{formatCurrency(opp.value || 0)}</p>
                                <div className="lcrm-pipeline-prob">
                                  <div
                                    className="lcrm-pipeline-prob-bar"
                                    style={{ width: `${opp.probability}%` }}
                                  ></div>
                                </div>
                                <span className="lcrm-pipeline-prob-text">{opp.probability}% probability</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="lcrm-modal-overlay" onClick={() => setShowAddContact(false)}>
          <div className="lcrm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lcrm-modal-close" onClick={() => setShowAddContact(false)}>×</button>
            <h3>Add New Contact</h3>
            <form onSubmit={handleAddContact} className="lcrm-form">
              <div className="lcrm-form-row">
                <div className="lcrm-form-group">
                  <label>First Name *</label>
                  <input type="text" name="firstName" required />
                </div>
                <div className="lcrm-form-group">
                  <label>Last Name *</label>
                  <input type="text" name="lastName" required />
                </div>
              </div>
              <div className="lcrm-form-group">
                <label>Email *</label>
                <input type="email" name="email" required />
              </div>
              <div className="lcrm-form-row">
                <div className="lcrm-form-group">
                  <label>Company</label>
                  <input type="text" name="company" />
                </div>
                <div className="lcrm-form-group">
                  <label>Title</label>
                  <input type="text" name="title" />
                </div>
              </div>
              <div className="lcrm-form-actions">
                <button type="button" className="lcrm-btn-outline" onClick={() => setShowAddContact(false)}>
                  Cancel
                </button>
                <button type="submit" className="lcrm-btn-primary">
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="lcrm-modal-overlay" onClick={() => setSelectedContact(null)}>
          <div className="lcrm-modal lcrm-modal--wide" onClick={(e) => e.stopPropagation()}>
            <button className="lcrm-modal-close" onClick={() => setSelectedContact(null)}>×</button>
            <div className="lcrm-contact-detail-header">
              <div className="lcrm-contact-avatar-xl" style={{ background: getRelationshipColor(selectedContact.relationship) }}>
                {selectedContact.firstName[0]}{selectedContact.lastName[0]}
              </div>
              <div>
                <h2>{selectedContact.firstName} {selectedContact.lastName}</h2>
                <p>{selectedContact.title} at {selectedContact.company}</p>
                <div className="lcrm-contact-meta">
                  <span className="lcrm-relationship-badge" style={{ background: getRelationshipColor(selectedContact.relationship) }}>
                    {selectedContact.relationship}
                  </span>
                  <span className="lcrm-importance-badge">{selectedContact.importance} priority</span>
                </div>
              </div>
            </div>
            <div className="lcrm-contact-detail-body">
              <div className="lcrm-detail-section">
                <h4>Contact Information</h4>
                <p><strong>Email:</strong> {selectedContact.email}</p>
                {selectedContact.lastContact && <p><strong>Last Contact:</strong> {selectedContact.lastContact}</p>}
                {selectedContact.nextFollowUp && <p><strong>Next Follow-Up:</strong> {selectedContact.nextFollowUp}</p>}
              </div>
              {selectedContact.notes && (
                <div className="lcrm-detail-section">
                  <h4>Notes</h4>
                  <p>{selectedContact.notes}</p>
                </div>
              )}
              {selectedContact.tags.length > 0 && (
                <div className="lcrm-detail-section">
                  <h4>Tags</h4>
                  <div className="lcrm-tags-list">
                    {selectedContact.tags.map((tag) => (
                      <span key={tag} className="lcrm-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <section className="lcrm-demo-cta">
        <div className="container">
          <div className="lcrm-demo-cta-content">
            <h2>Ready for the full experience?</h2>
            <p>Join the waitlist to get early access when Legacy CRM launches.</p>
            <Link href="/legacy-crm#waitlist" className="lcrm-btn-primary lcrm-btn-large">
              Join the Waitlist
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
