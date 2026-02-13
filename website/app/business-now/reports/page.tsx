"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const reportTypes = [
  {
    id: "profit-loss",
    name: "Profit & Loss Statement",
    description: "Income and expenses summary for a period",
    icon: "📊",
    lastGenerated: "Jan 22, 2024"
  },
  {
    id: "cash-flow",
    name: "Cash Flow Statement",
    description: "Track money in and out of your business",
    icon: "💰",
    lastGenerated: "Jan 20, 2024"
  },
  {
    id: "balance-sheet",
    name: "Balance Sheet",
    description: "Assets, liabilities, and equity snapshot",
    icon: "⚖️",
    lastGenerated: "Jan 15, 2024"
  },
  {
    id: "accounts-receivable",
    name: "Accounts Receivable Aging",
    description: "Outstanding invoices by age",
    icon: "📋",
    lastGenerated: "Jan 22, 2024"
  },
  {
    id: "expense-report",
    name: "Expense Report",
    description: "Detailed expense breakdown by category",
    icon: "🧾",
    lastGenerated: "Jan 21, 2024"
  },
  {
    id: "tax-summary",
    name: "Tax Summary",
    description: "Quarterly tax obligations estimate",
    icon: "🏛️",
    lastGenerated: "Jan 1, 2024"
  },
];

const recentReports = [
  { id: 1, name: "P&L January 2024", type: "Profit & Loss", date: "Jan 22, 2024", format: "PDF" },
  { id: 2, name: "Q4 2023 Cash Flow", type: "Cash Flow", date: "Jan 20, 2024", format: "Excel" },
  { id: 3, name: "AR Aging Report", type: "Accounts Receivable", date: "Jan 22, 2024", format: "PDF" },
  { id: 4, name: "December Expenses", type: "Expense Report", date: "Jan 5, 2024", format: "PDF" },
];

const metrics = {
  revenue: 328500,
  expenses: 215200,
  netProfit: 113300,
  profitMargin: 34.5,
  cashOnHand: 89500,
  accountsReceivable: 45200,
  accountsPayable: 18700,
};

export default function BusinessNowReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<typeof reportTypes[0] | null>(null);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <main className="business-now-page bn-reports-page">
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
                <span>Reports</span>
              </div>
              <h1>Financial Reports</h1>
              <p>Generate and download financial reports</p>
            </div>
            <div className="bn-page-actions">
              <select
                className="bn-period-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="bn-metrics-section">
        <div className="container">
          <div className="bn-metrics-grid">
            <div className="bn-metric-card bn-metric-large">
              <span className="bn-metric-label">Revenue</span>
              <span className="bn-metric-value">{formatCurrency(metrics.revenue)}</span>
              <span className="bn-metric-change positive">+12.4% vs last period</span>
            </div>
            <div className="bn-metric-card bn-metric-large">
              <span className="bn-metric-label">Expenses</span>
              <span className="bn-metric-value">{formatCurrency(metrics.expenses)}</span>
              <span className="bn-metric-change negative">+8.2% vs last period</span>
            </div>
            <div className="bn-metric-card bn-metric-large bn-metric-highlight">
              <span className="bn-metric-label">Net Profit</span>
              <span className="bn-metric-value">{formatCurrency(metrics.netProfit)}</span>
              <span className="bn-metric-sub">{metrics.profitMargin}% margin</span>
            </div>
          </div>
          <div className="bn-metrics-row">
            <div className="bn-metric-card">
              <span className="bn-metric-label">Cash on Hand</span>
              <span className="bn-metric-value">{formatCurrency(metrics.cashOnHand)}</span>
            </div>
            <div className="bn-metric-card">
              <span className="bn-metric-label">Accounts Receivable</span>
              <span className="bn-metric-value">{formatCurrency(metrics.accountsReceivable)}</span>
            </div>
            <div className="bn-metric-card">
              <span className="bn-metric-label">Accounts Payable</span>
              <span className="bn-metric-value">{formatCurrency(metrics.accountsPayable)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Report Types */}
      <section className="bn-report-types-section">
        <div className="container">
          <h2 className="bn-section-title">Generate Reports</h2>
          <div className="bn-report-types-grid">
            {reportTypes.map(report => (
              <div
                key={report.id}
                className="bn-report-type-card"
                onClick={() => {
                  setSelectedReport(report);
                  setShowGenerateModal(true);
                }}
              >
                <span className="bn-report-icon">{report.icon}</span>
                <div className="bn-report-info">
                  <h4>{report.name}</h4>
                  <p>{report.description}</p>
                  <span className="bn-report-last">Last generated: {report.lastGenerated}</span>
                </div>
                <button className="bn-generate-btn">
                  Generate
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Reports */}
      <section className="bn-recent-reports-section">
        <div className="container">
          <div className="bn-section-card">
            <div className="bn-section-header">
              <h3>Recent Reports</h3>
              <Link href="/business-now/reports/history" className="bn-link">View All</Link>
            </div>
            <div className="bn-recent-reports-table">
              <div className="bn-recent-reports-header">
                <span>Report Name</span>
                <span>Type</span>
                <span>Generated</span>
                <span>Format</span>
                <span>Actions</span>
              </div>
              {recentReports.map(report => (
                <div key={report.id} className="bn-recent-report-row">
                  <span className="bn-report-name">{report.name}</span>
                  <span>{report.type}</span>
                  <span>{report.date}</span>
                  <span className="bn-report-format">{report.format}</span>
                  <div className="bn-report-actions">
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
                    <button className="bn-btn-icon" title="Share">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Generate Report Modal */}
      {showGenerateModal && selectedReport && (
        <div className="bn-modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="bn-modal" onClick={(e) => e.stopPropagation()}>
            <button className="bn-modal-close" onClick={() => setShowGenerateModal(false)}>×</button>
            <div className="bn-modal-header">
              <span className="bn-modal-icon">{selectedReport.icon}</span>
              <div>
                <h2>{selectedReport.name}</h2>
                <p>{selectedReport.description}</p>
              </div>
            </div>
            <form className="bn-form">
              <div className="bn-form-row">
                <div className="bn-form-group">
                  <label>Start Date</label>
                  <input type="date" />
                </div>
                <div className="bn-form-group">
                  <label>End Date</label>
                  <input type="date" />
                </div>
              </div>
              <div className="bn-form-group">
                <label>Format</label>
                <div className="bn-format-options">
                  <label className="bn-format-option">
                    <input type="radio" name="format" value="pdf" defaultChecked />
                    <span>PDF</span>
                  </label>
                  <label className="bn-format-option">
                    <input type="radio" name="format" value="excel" />
                    <span>Excel</span>
                  </label>
                  <label className="bn-format-option">
                    <input type="radio" name="format" value="csv" />
                    <span>CSV</span>
                  </label>
                </div>
              </div>
              <div className="bn-form-group">
                <label className="bn-checkbox-label">
                  <input type="checkbox" />
                  <span>Include comparison to previous period</span>
                </label>
              </div>
              <div className="bn-form-actions">
                <button type="button" className="button bn-button-ghost" onClick={() => setShowGenerateModal(false)}>Cancel</button>
                <button type="submit" className="button bn-button-primary">Generate Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
