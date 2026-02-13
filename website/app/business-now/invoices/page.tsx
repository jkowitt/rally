"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const invoices = [
  { id: "INV-001", client: "Acme Corp", amount: 5200, date: "Jan 15, 2024", due: "Feb 15, 2024", status: "paid", items: 3 },
  { id: "INV-002", client: "TechStart Inc", amount: 8750, date: "Jan 18, 2024", due: "Feb 18, 2024", status: "pending", items: 5 },
  { id: "INV-003", client: "Local Restaurant", amount: 1250, date: "Jan 20, 2024", due: "Feb 20, 2024", status: "pending", items: 2 },
  { id: "INV-004", client: "Design Studio", amount: 3400, date: "Jan 10, 2024", due: "Feb 10, 2024", status: "overdue", items: 4 },
  { id: "INV-005", client: "Marketing Agency", amount: 12500, date: "Jan 5, 2024", due: "Feb 5, 2024", status: "paid", items: 8 },
  { id: "INV-006", client: "Consulting Group", amount: 6800, date: "Jan 22, 2024", due: "Feb 22, 2024", status: "draft", items: 3 },
];

const clients = [
  { id: 1, name: "Acme Corp", email: "billing@acme.com", outstanding: 0 },
  { id: 2, name: "TechStart Inc", email: "ap@techstart.com", outstanding: 8750 },
  { id: 3, name: "Local Restaurant", email: "owner@localrestaurant.com", outstanding: 1250 },
  { id: 4, name: "Design Studio", email: "finance@designstudio.com", outstanding: 3400 },
  { id: 5, name: "Marketing Agency", email: "accounts@marketingagency.com", outstanding: 0 },
];

export default function BusinessNowInvoicesPage() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  const filteredInvoices = selectedStatus === "all"
    ? invoices
    : invoices.filter(inv => inv.status === selectedStatus);

  const totalOutstanding = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
  const overdueCount = invoices.filter(i => i.status === "overdue").length;

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "#10B981";
      case "pending": return "#F59E0B";
      case "overdue": return "#EF4444";
      case "draft": return "#6B7280";
      default: return "#6B7280";
    }
  };

  return (
    <main className="business-now-page bn-invoices-page">
      <Header />

      {/* Page Header */}
      <section className="bn-page-header">
        <div className="container">
          <div className="bn-page-header-content">
            <div>
              <div className="bn-breadcrumb">
                <Link href="/business-now">Business Now</Link>
                <span>/</span>
                <Link href="/business-now/dashboard">Dashboard</Link>
                <span>/</span>
                <span>Invoices</span>
              </div>
              <h1>Invoice Management</h1>
              <p>Create, send, and track invoices</p>
            </div>
            <div className="bn-page-actions">
              <button className="button bn-button-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
              <button className="button bn-button-primary" onClick={() => setShowNewInvoice(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Invoice
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bn-stats-section">
        <div className="container">
          <div className="bn-stats-grid">
            <div className="bn-stat-card">
              <span className="bn-stat-label">Outstanding</span>
              <span className="bn-stat-value">{formatCurrency(totalOutstanding)}</span>
              <span className="bn-stat-sub">{invoices.filter(i => i.status === "pending").length} pending invoices</span>
            </div>
            <div className="bn-stat-card">
              <span className="bn-stat-label">Paid This Month</span>
              <span className="bn-stat-value">{formatCurrency(totalPaid)}</span>
              <span className="bn-stat-change positive">+18% vs last month</span>
            </div>
            <div className="bn-stat-card">
              <span className="bn-stat-label">Overdue</span>
              <span className="bn-stat-value" style={{ color: "#EF4444" }}>{overdueCount}</span>
              <span className="bn-stat-sub">Needs attention</span>
            </div>
            <div className="bn-stat-card">
              <span className="bn-stat-label">Avg Days to Pay</span>
              <span className="bn-stat-value">12</span>
              <span className="bn-stat-change positive">-3 days vs avg</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bn-filters-section">
        <div className="container">
          <div className="bn-filters-bar">
            <div className="bn-status-filters">
              {["all", "draft", "pending", "paid", "overdue"].map(status => (
                <button
                  key={status}
                  className={`bn-filter-btn ${selectedStatus === status ? "active" : ""}`}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="bn-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search invoices..." />
            </div>
          </div>
        </div>
      </section>

      {/* Invoices Table */}
      <section className="bn-invoices-section">
        <div className="container">
          <div className="bn-invoices-table">
            <div className="bn-invoices-header">
              <span>Invoice</span>
              <span>Client</span>
              <span>Amount</span>
              <span>Date</span>
              <span>Due Date</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {filteredInvoices.map(invoice => (
              <div key={invoice.id} className="bn-invoice-row">
                <span className="bn-invoice-id">{invoice.id}</span>
                <span className="bn-invoice-client">{invoice.client}</span>
                <span className="bn-invoice-amount">{formatCurrency(invoice.amount)}</span>
                <span>{invoice.date}</span>
                <span>{invoice.due}</span>
                <span
                  className="bn-invoice-status"
                  style={{ color: getStatusColor(invoice.status) }}
                >
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
                <div className="bn-invoice-actions">
                  <button className="bn-btn-icon" title="View">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button className="bn-btn-icon" title="Download">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <button className="bn-btn-icon" title="Send">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22,2 15,22 11,13 2,9" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New Invoice Modal */}
      {showNewInvoice && (
        <div className="bn-modal-overlay" onClick={() => setShowNewInvoice(false)}>
          <div className="bn-modal bn-modal-lg" onClick={(e) => e.stopPropagation()}>
            <button className="bn-modal-close" onClick={() => setShowNewInvoice(false)}>×</button>
            <h2>Create New Invoice</h2>
            <form className="bn-form">
              <div className="bn-form-row">
                <div className="bn-form-group">
                  <label>Client</label>
                  <select>
                    <option value="">Select client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div className="bn-form-group">
                  <label>Invoice Number</label>
                  <input type="text" value="INV-007" readOnly />
                </div>
              </div>
              <div className="bn-form-row">
                <div className="bn-form-group">
                  <label>Invoice Date</label>
                  <input type="date" />
                </div>
                <div className="bn-form-group">
                  <label>Due Date</label>
                  <input type="date" />
                </div>
              </div>
              <div className="bn-form-section">
                <h4>Line Items</h4>
                <div className="bn-line-items">
                  <div className="bn-line-item-header">
                    <span>Description</span>
                    <span>Qty</span>
                    <span>Rate</span>
                    <span>Amount</span>
                  </div>
                  <div className="bn-line-item">
                    <input type="text" placeholder="Service or product description" />
                    <input type="number" placeholder="1" />
                    <input type="number" placeholder="0.00" />
                    <span>$0.00</span>
                  </div>
                  <button type="button" className="bn-add-line">+ Add Line Item</button>
                </div>
              </div>
              <div className="bn-form-totals">
                <div className="bn-total-row">
                  <span>Subtotal</span>
                  <span>$0.00</span>
                </div>
                <div className="bn-total-row">
                  <span>Tax (0%)</span>
                  <span>$0.00</span>
                </div>
                <div className="bn-total-row bn-total-final">
                  <span>Total</span>
                  <span>$0.00</span>
                </div>
              </div>
              <div className="bn-form-group">
                <label>Notes</label>
                <textarea placeholder="Additional notes or payment instructions..." rows={3}></textarea>
              </div>
              <div className="bn-form-actions">
                <button type="button" className="button bn-button-ghost" onClick={() => setShowNewInvoice(false)}>Cancel</button>
                <button type="button" className="button bn-button-secondary">Save as Draft</button>
                <button type="submit" className="button bn-button-primary">Create & Send</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
