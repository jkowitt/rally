"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const expenses = [
  { id: 1, description: "Office Supplies", category: "Operations", amount: 245, date: "Jan 22, 2024", vendor: "Staples", receipt: true, status: "approved" },
  { id: 2, description: "Software Subscription", category: "Technology", amount: 199, date: "Jan 20, 2024", vendor: "Adobe", receipt: true, status: "approved" },
  { id: 3, description: "Client Lunch Meeting", category: "Meals & Entertainment", amount: 125, date: "Jan 19, 2024", vendor: "Restaurant XYZ", receipt: true, status: "pending" },
  { id: 4, description: "Web Hosting", category: "Technology", amount: 89, date: "Jan 15, 2024", vendor: "AWS", receipt: true, status: "approved" },
  { id: 5, description: "Marketing Materials", category: "Marketing", amount: 450, date: "Jan 12, 2024", vendor: "PrintShop Pro", receipt: true, status: "approved" },
  { id: 6, description: "Professional Development", category: "Training", amount: 299, date: "Jan 10, 2024", vendor: "Udemy", receipt: false, status: "pending" },
  { id: 7, description: "Travel - Client Visit", category: "Travel", amount: 680, date: "Jan 8, 2024", vendor: "United Airlines", receipt: true, status: "approved" },
  { id: 8, description: "Insurance Premium", category: "Insurance", amount: 425, date: "Jan 5, 2024", vendor: "State Farm", receipt: true, status: "approved" },
];

const categories = [
  { name: "Operations", budget: 2000, spent: 1245 },
  { name: "Technology", budget: 1500, spent: 988 },
  { name: "Marketing", budget: 3000, spent: 1850 },
  { name: "Travel", budget: 2500, spent: 1680 },
  { name: "Meals & Entertainment", budget: 500, spent: 325 },
  { name: "Training", budget: 1000, spent: 299 },
];

export default function BusinessNowExpensesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showNewExpense, setShowNewExpense] = useState(false);

  const filteredExpenses = selectedCategory === "all"
    ? expenses
    : expenses.filter(exp => exp.category.toLowerCase() === selectedCategory.toLowerCase());

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);
  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
  const budgetUsed = Math.round((totalExpenses / totalBudget) * 100);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <main className="business-now-page bn-expenses-page">
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
                <span>Expenses</span>
              </div>
              <h1>Expense Tracker</h1>
              <p>Track and categorize business expenses</p>
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
              <button className="button bn-button-primary" onClick={() => setShowNewExpense(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Expense
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
              <span className="bn-stat-label">Total Expenses</span>
              <span className="bn-stat-value">{formatCurrency(totalExpenses)}</span>
              <span className="bn-stat-sub">This month</span>
            </div>
            <div className="bn-stat-card">
              <span className="bn-stat-label">Pending Approval</span>
              <span className="bn-stat-value">{formatCurrency(pendingExpenses)}</span>
              <span className="bn-stat-sub">{expenses.filter(e => e.status === "pending").length} expenses</span>
            </div>
            <div className="bn-stat-card">
              <span className="bn-stat-label">Budget Used</span>
              <span className="bn-stat-value">{budgetUsed}%</span>
              <div className="bn-budget-bar">
                <div className="bn-budget-fill" style={{ width: `${budgetUsed}%` }}></div>
              </div>
            </div>
            <div className="bn-stat-card">
              <span className="bn-stat-label">Budget Remaining</span>
              <span className="bn-stat-value">{formatCurrency(totalBudget - totalExpenses)}</span>
              <span className="bn-stat-sub">of {formatCurrency(totalBudget)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Budget by Category */}
      <section className="bn-budget-section">
        <div className="container">
          <div className="bn-section-card">
            <h3>Budget by Category</h3>
            <div className="bn-budget-grid">
              {categories.map(cat => {
                const percent = Math.round((cat.spent / cat.budget) * 100);
                return (
                  <div key={cat.name} className="bn-budget-item">
                    <div className="bn-budget-header">
                      <span className="bn-budget-name">{cat.name}</span>
                      <span className="bn-budget-amount">{formatCurrency(cat.spent)} / {formatCurrency(cat.budget)}</span>
                    </div>
                    <div className="bn-budget-bar-container">
                      <div
                        className="bn-budget-bar-fill"
                        style={{
                          width: `${Math.min(percent, 100)}%`,
                          background: percent > 90 ? "#EF4444" : percent > 75 ? "#F59E0B" : "#10B981"
                        }}
                      ></div>
                    </div>
                    <span className="bn-budget-percent">{percent}% used</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bn-filters-section">
        <div className="container">
          <div className="bn-filters-bar">
            <div className="bn-category-filters">
              <button
                className={`bn-filter-btn ${selectedCategory === "all" ? "active" : ""}`}
                onClick={() => setSelectedCategory("all")}
              >
                All Categories
              </button>
              {categories.map(cat => (
                <button
                  key={cat.name}
                  className={`bn-filter-btn ${selectedCategory === cat.name.toLowerCase() ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat.name.toLowerCase())}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Expenses Table */}
      <section className="bn-expenses-section">
        <div className="container">
          <div className="bn-expenses-table">
            <div className="bn-expenses-header">
              <span>Description</span>
              <span>Category</span>
              <span>Vendor</span>
              <span>Date</span>
              <span>Amount</span>
              <span>Receipt</span>
              <span>Status</span>
            </div>
            {filteredExpenses.map(expense => (
              <div key={expense.id} className="bn-expense-row">
                <span className="bn-expense-desc">{expense.description}</span>
                <span className="bn-expense-category">{expense.category}</span>
                <span>{expense.vendor}</span>
                <span>{expense.date}</span>
                <span className="bn-expense-amount">{formatCurrency(expense.amount)}</span>
                <span className={`bn-expense-receipt ${expense.receipt ? "has-receipt" : ""}`}>
                  {expense.receipt ? "✓" : "—"}
                </span>
                <span className={`bn-expense-status ${expense.status}`}>
                  {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New Expense Modal */}
      {showNewExpense && (
        <div className="bn-modal-overlay" onClick={() => setShowNewExpense(false)}>
          <div className="bn-modal" onClick={(e) => e.stopPropagation()}>
            <button className="bn-modal-close" onClick={() => setShowNewExpense(false)}>×</button>
            <h2>Add New Expense</h2>
            <form className="bn-form">
              <div className="bn-form-group">
                <label>Description</label>
                <input type="text" placeholder="What was this expense for?" />
              </div>
              <div className="bn-form-row">
                <div className="bn-form-group">
                  <label>Category</label>
                  <select>
                    {categories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="bn-form-group">
                  <label>Amount</label>
                  <input type="number" placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div className="bn-form-row">
                <div className="bn-form-group">
                  <label>Date</label>
                  <input type="date" />
                </div>
                <div className="bn-form-group">
                  <label>Vendor</label>
                  <input type="text" placeholder="Who did you pay?" />
                </div>
              </div>
              <div className="bn-form-group">
                <label>Receipt</label>
                <div className="bn-file-upload">
                  <input type="file" accept="image/*,.pdf" />
                  <span>Drop file here or click to upload</span>
                </div>
              </div>
              <div className="bn-form-group">
                <label>Notes</label>
                <textarea placeholder="Additional details..." rows={2}></textarea>
              </div>
              <div className="bn-form-actions">
                <button type="button" className="button bn-button-ghost" onClick={() => setShowNewExpense(false)}>Cancel</button>
                <button type="submit" className="button bn-button-primary">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
