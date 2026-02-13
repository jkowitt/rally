"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const contacts = [
  { id: 1, name: "Sarah Mitchell", company: "Acme Corp", email: "sarah@acme.com", phone: "(512) 555-0101", status: "hot", value: 125000, lastContact: "2 days ago", tags: ["Enterprise", "Decision Maker"], avatar: "SM" },
  { id: 2, name: "James Wilson", company: "TechStart Inc", email: "james@techstart.com", phone: "(512) 555-0102", status: "warm", value: 85000, lastContact: "1 week ago", tags: ["Startup", "Technical"], avatar: "JW" },
  { id: 3, name: "Emily Chen", company: "Design Studio", email: "emily@designstudio.com", phone: "(512) 555-0103", status: "hot", value: 45000, lastContact: "Yesterday", tags: ["Agency", "Creative"], avatar: "EC" },
  { id: 4, name: "Michael Brown", company: "Consulting Group", email: "michael@consulting.com", phone: "(512) 555-0104", status: "cold", value: 200000, lastContact: "3 weeks ago", tags: ["Enterprise", "Consulting"], avatar: "MB" },
  { id: 5, name: "Lisa Rodriguez", company: "Marketing Agency", email: "lisa@marketing.com", phone: "(512) 555-0105", status: "warm", value: 65000, lastContact: "4 days ago", tags: ["Agency", "Marketing"], avatar: "LR" },
  { id: 6, name: "David Park", company: "Innovation Labs", email: "david@innovationlabs.com", phone: "(512) 555-0106", status: "new", value: 150000, lastContact: "Today", tags: ["Startup", "Tech"], avatar: "DP" },
];

const activities = [
  { id: 1, type: "call", contact: "Sarah Mitchell", description: "Discovery call - discussed Q1 needs", date: "Jan 22, 2024", time: "2:30 PM" },
  { id: 2, type: "email", contact: "James Wilson", description: "Sent proposal follow-up", date: "Jan 22, 2024", time: "10:15 AM" },
  { id: 3, type: "meeting", contact: "Emily Chen", description: "Product demo scheduled", date: "Jan 21, 2024", time: "3:00 PM" },
  { id: 4, type: "note", contact: "David Park", description: "New lead from conference", date: "Jan 20, 2024", time: "4:45 PM" },
];

export default function LegacyCRMContactsPage() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedContact, setSelectedContact] = useState<typeof contacts[0] | null>(null);
  const [showNewContact, setShowNewContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = contacts.filter(contact => {
    if (selectedStatus !== "all" && contact.status !== selectedStatus) return false;
    if (searchQuery && !contact.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !contact.company.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalContacts = contacts.length;
  const hotLeads = contacts.filter(c => c.status === "hot").length;
  const totalValue = contacts.reduce((sum, c) => sum + c.value, 0);

  const formatCurrency = (value: number) => `$${(value / 1000).toFixed(0)}K`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot": return "#EF4444";
      case "warm": return "#F59E0B";
      case "cold": return "#6B7280";
      case "new": return "#10B981";
      default: return "#6B7280";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return "📞";
      case "email": return "📧";
      case "meeting": return "📅";
      case "note": return "📝";
      default: return "📌";
    }
  };

  return (
    <main className="legacy-crm-page lcrm-contacts-page">
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
                <span>Contacts</span>
              </div>
              <h1>Contact Management</h1>
              <p>Build and nurture your business relationships</p>
            </div>
            <div className="lcrm-page-actions">
              <button className="lcrm-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import
              </button>
              <button className="lcrm-btn primary" onClick={() => setShowNewContact(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Add Contact
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="lcrm-stats-section">
        <div className="container">
          <div className="lcrm-stats-grid">
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-value">{totalContacts}</span>
              <span className="lcrm-stat-label">Total Contacts</span>
            </div>
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-value" style={{ color: "#EF4444" }}>{hotLeads}</span>
              <span className="lcrm-stat-label">Hot Leads</span>
            </div>
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-value">{formatCurrency(totalValue)}</span>
              <span className="lcrm-stat-label">Pipeline Value</span>
            </div>
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-value">85%</span>
              <span className="lcrm-stat-label">Contact Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="lcrm-filters-section">
        <div className="container">
          <div className="lcrm-filters-bar">
            <div className="lcrm-status-filters">
              {["all", "hot", "warm", "cold", "new"].map(status => (
                <button
                  key={status}
                  className={`lcrm-filter-btn ${selectedStatus === status ? "active" : ""}`}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="lcrm-search">
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
          </div>
        </div>
      </section>

      {/* Contacts Grid */}
      <section className="lcrm-contacts-section">
        <div className="container">
          <div className="lcrm-contacts-grid">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className="lcrm-contact-card"
                onClick={() => setSelectedContact(contact)}
              >
                <div className="lcrm-contact-header">
                  <div className="lcrm-contact-avatar">{contact.avatar}</div>
                  <div className="lcrm-contact-info">
                    <h4>{contact.name}</h4>
                    <p>{contact.company}</p>
                  </div>
                  <span
                    className="lcrm-contact-status"
                    style={{ background: getStatusColor(contact.status) }}
                  >
                    {contact.status}
                  </span>
                </div>
                <div className="lcrm-contact-details">
                  <div className="lcrm-contact-detail">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span>{contact.email}</span>
                  </div>
                  <div className="lcrm-contact-detail">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                    </svg>
                    <span>{contact.phone}</span>
                  </div>
                </div>
                <div className="lcrm-contact-tags">
                  {contact.tags.map((tag, i) => (
                    <span key={i} className="lcrm-tag">{tag}</span>
                  ))}
                </div>
                <div className="lcrm-contact-footer">
                  <span className="lcrm-contact-value">{formatCurrency(contact.value)}</span>
                  <span className="lcrm-contact-last">{contact.lastContact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="lcrm-activity-section">
        <div className="container">
          <div className="lcrm-section-card">
            <div className="lcrm-section-header">
              <h3>Recent Activity</h3>
              <Link href="/legacy-crm/activities" className="lcrm-link">View All</Link>
            </div>
            <div className="lcrm-activity-list">
              {activities.map(activity => (
                <div key={activity.id} className="lcrm-activity-item">
                  <span className="lcrm-activity-icon">{getActivityIcon(activity.type)}</span>
                  <div className="lcrm-activity-content">
                    <span className="lcrm-activity-contact">{activity.contact}</span>
                    <span className="lcrm-activity-desc">{activity.description}</span>
                  </div>
                  <div className="lcrm-activity-time">
                    <span>{activity.date}</span>
                    <span>{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="lcrm-modal-overlay" onClick={() => setSelectedContact(null)}>
          <div className="lcrm-modal lcrm-modal-lg" onClick={(e) => e.stopPropagation()}>
            <button className="lcrm-modal-close" onClick={() => setSelectedContact(null)}>×</button>
            <div className="lcrm-modal-header">
              <div className="lcrm-modal-avatar">{selectedContact.avatar}</div>
              <div>
                <h2>{selectedContact.name}</h2>
                <p>{selectedContact.company}</p>
              </div>
              <span
                className="lcrm-modal-status"
                style={{ background: getStatusColor(selectedContact.status) }}
              >
                {selectedContact.status}
              </span>
            </div>
            <div className="lcrm-modal-details">
              <div className="lcrm-modal-detail">
                <span className="lcrm-detail-label">Email</span>
                <span className="lcrm-detail-value">{selectedContact.email}</span>
              </div>
              <div className="lcrm-modal-detail">
                <span className="lcrm-detail-label">Phone</span>
                <span className="lcrm-detail-value">{selectedContact.phone}</span>
              </div>
              <div className="lcrm-modal-detail">
                <span className="lcrm-detail-label">Deal Value</span>
                <span className="lcrm-detail-value">{formatCurrency(selectedContact.value)}</span>
              </div>
              <div className="lcrm-modal-detail">
                <span className="lcrm-detail-label">Last Contact</span>
                <span className="lcrm-detail-value">{selectedContact.lastContact}</span>
              </div>
            </div>
            <div className="lcrm-modal-tags">
              {selectedContact.tags.map((tag, i) => (
                <span key={i} className="lcrm-tag">{tag}</span>
              ))}
            </div>
            <div className="lcrm-modal-actions">
              <button className="lcrm-btn secondary">📞 Call</button>
              <button className="lcrm-btn secondary">📧 Email</button>
              <button className="lcrm-btn secondary">📅 Meeting</button>
              <button className="lcrm-btn primary">Edit Contact</button>
            </div>
          </div>
        </div>
      )}

      {/* New Contact Modal */}
      {showNewContact && (
        <div className="lcrm-modal-overlay" onClick={() => setShowNewContact(false)}>
          <div className="lcrm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lcrm-modal-close" onClick={() => setShowNewContact(false)}>×</button>
            <h2>Add New Contact</h2>
            <form className="lcrm-form">
              <div className="lcrm-form-row">
                <div className="lcrm-form-group">
                  <label>First Name</label>
                  <input type="text" placeholder="John" />
                </div>
                <div className="lcrm-form-group">
                  <label>Last Name</label>
                  <input type="text" placeholder="Doe" />
                </div>
              </div>
              <div className="lcrm-form-group">
                <label>Company</label>
                <input type="text" placeholder="Acme Corp" />
              </div>
              <div className="lcrm-form-row">
                <div className="lcrm-form-group">
                  <label>Email</label>
                  <input type="email" placeholder="john@acme.com" />
                </div>
                <div className="lcrm-form-group">
                  <label>Phone</label>
                  <input type="tel" placeholder="(512) 555-0100" />
                </div>
              </div>
              <div className="lcrm-form-row">
                <div className="lcrm-form-group">
                  <label>Status</label>
                  <select>
                    <option value="new">New</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>
                <div className="lcrm-form-group">
                  <label>Deal Value</label>
                  <input type="number" placeholder="50000" />
                </div>
              </div>
              <div className="lcrm-form-group">
                <label>Notes</label>
                <textarea placeholder="Initial notes about this contact..." rows={3}></textarea>
              </div>
              <div className="lcrm-form-actions">
                <button type="button" className="lcrm-btn ghost" onClick={() => setShowNewContact(false)}>Cancel</button>
                <button type="submit" className="lcrm-btn primary">Add Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
