"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

// AI Business Insights Types
interface AIInsight {
  id: string;
  category: "financial" | "growth" | "risk" | "opportunity";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionable: boolean;
  action?: string;
}

interface AIBusinessAnalysis {
  healthScore: number;
  healthLabel: string;
  insights: AIInsight[];
  cashFlowForecast: {
    month: string;
    projected: number;
    trend: "up" | "down" | "stable";
  }[];
  marketOpportunities: {
    title: string;
    potential: string;
    difficulty: string;
  }[];
  recommendations: string[];
  riskFactors: string[];
}

// Business data - starts empty for user to add their own
const revenueData: { month: string; revenue: number; expenses: number }[] = [];

const recentTransactions: { id: number; description: string; amount: number; type: string; date: string }[] = [];

const tasks: { id: number; title: string; priority: string; dueDate: string; completed: boolean }[] = [];

// Quick Tools - now as action buttons with modal functionality
interface QuickTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export default function BusinessNowDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [taskFilter, setTaskFilter] = useState("all");

  // AI Business Insights State
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIBusinessAnalysis | null>(null);

  // Quick Tools State
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [localTasks, setLocalTasks] = useState(tasks);

  const quickTools: QuickTool[] = [
    {
      id: "invoice",
      name: "New Invoice",
      description: "Create invoice",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    },
    {
      id: "expense",
      name: "Add Expense",
      description: "Track expense",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      )
    },
    {
      id: "report",
      name: "Quick Report",
      description: "View summary",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      )
    },
    {
      id: "calculator",
      name: "Calculator",
      description: "Quick math",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="8" y1="10" x2="16" y2="10" />
          <line x1="8" y1="14" x2="12" y2="14" />
        </svg>
      )
    },
  ];

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now(),
      title: newTaskTitle,
      priority: newTaskPriority,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      completed: false
    };
    setLocalTasks(prev => [newTask, ...prev]);
    setNewTaskTitle("");
    setNewTaskPriority("medium");
  };

  const toggleTaskComplete = (id: number) => {
    setLocalTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2200));

    const analysis: AIBusinessAnalysis = {
      healthScore: 78,
      healthLabel: "Strong",
      insights: [
        {
          id: "1",
          category: "financial",
          title: "Cash Flow Improvement Opportunity",
          description: "Your receivables aging shows 23% of invoices are 30+ days overdue. Implementing automated payment reminders could improve cash flow by ~$15K monthly.",
          impact: "high",
          actionable: true,
          action: "Set up automated reminders"
        },
        {
          id: "2",
          category: "growth",
          title: "Revenue Growth Trend Detected",
          description: "Month-over-month revenue is growing at 8.5%. At this rate, you're on track to exceed annual projections by 12%.",
          impact: "high",
          actionable: false
        },
        {
          id: "3",
          category: "risk",
          title: "Expense Category Alert",
          description: "Software subscriptions have increased 34% QoQ. Consider auditing unused subscriptions to optimize costs.",
          impact: "medium",
          actionable: true,
          action: "Audit subscriptions"
        },
        {
          id: "4",
          category: "opportunity",
          title: "Seasonal Opportunity Window",
          description: "Historical data shows Q2 typically brings 20% higher client acquisition. Prepare marketing campaigns now.",
          impact: "medium",
          actionable: true,
          action: "Plan Q2 campaigns"
        }
      ],
      cashFlowForecast: [
        { month: "Jul", projected: 72000, trend: "up" },
        { month: "Aug", projected: 68000, trend: "down" },
        { month: "Sep", projected: 75000, trend: "up" },
        { month: "Oct", projected: 82000, trend: "up" },
        { month: "Nov", projected: 78000, trend: "stable" },
        { month: "Dec", projected: 85000, trend: "up" }
      ],
      marketOpportunities: [
        { title: "Digital Service Expansion", potential: "+$25K/mo", difficulty: "Medium" },
        { title: "Strategic Partnership", potential: "+$40K/mo", difficulty: "High" },
        { title: "Subscription Model", potential: "+$15K/mo", difficulty: "Low" }
      ],
      recommendations: [
        "Negotiate longer payment terms with suppliers to improve working capital",
        "Consider offering early payment discounts to accelerate receivables",
        "Diversify revenue streams to reduce dependency on top 3 clients",
        "Build 3-month emergency reserve based on current burn rate"
      ],
      riskFactors: [
        "Top 3 clients represent 45% of revenue - high concentration risk",
        "Operating expenses growing faster than revenue (8.2% vs 12.5%)",
        "No formal contracts with 2 major ongoing projects"
      ]
    };

    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "financial":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        );
      case "growth":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        );
      case "risk":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case "opportunity":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "financial": return "#3B82F6";
      case "growth": return "#22C55E";
      case "risk": return "#F59E0B";
      case "opportunity": return "#8B5CF6";
      default: return "#64748B";
    }
  };

  const getImpactBadge = (impact: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      high: { bg: "#FEE2E2", text: "#DC2626" },
      medium: { bg: "#FEF3C7", text: "#D97706" },
      low: { bg: "#D1FAE5", text: "#059669" }
    };
    return colors[impact] || colors.low;
  };

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = revenueData.reduce((sum, d) => sum + d.expenses, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(1);

  const maxValue = Math.max(...revenueData.map(d => Math.max(d.revenue, d.expenses)));

  const filteredTasks = taskFilter === "all"
    ? localTasks
    : taskFilter === "completed"
      ? localTasks.filter(t => t.completed)
      : localTasks.filter(t => !t.completed);

  return (
    <main className="bn-dashboard">
      <Header />

      {/* Dashboard Header */}
      <section className="bn-dash-header">
        <div className="container">
          <div className="bn-dash-header-content">
            <div>
              <div className="bn-breadcrumb">
                <Link href="/business-now">Business Now</Link>
                <span>/</span>
                <span>Dashboard</span>
              </div>
              <h1>Welcome back, Partner</h1>
              <p>Here's what's happening with your business today.</p>
            </div>
            <div className="bn-dash-header-actions">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bn-select"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <Link href="/business-now/resources" className="bn-btn bn-btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Resources
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="bn-dash-stats">
        <div className="container">
          <div className="bn-stats-grid">
            <div className="bn-stat-card">
              <div className="bn-stat-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div className="bn-stat-content">
                <span className="bn-stat-label">Total Revenue</span>
                <span className="bn-stat-value">${(totalRevenue / 1000).toFixed(0)}K</span>
                <span className="bn-stat-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                  </svg>
                  +12.5% from last period
                </span>
              </div>
            </div>

            <div className="bn-stat-card">
              <div className="bn-stat-icon red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div className="bn-stat-content">
                <span className="bn-stat-label">Total Expenses</span>
                <span className="bn-stat-value">${(totalExpenses / 1000).toFixed(0)}K</span>
                <span className="bn-stat-change negative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
                  </svg>
                  +8.2% from last period
                </span>
              </div>
            </div>

            <div className="bn-stat-card">
              <div className="bn-stat-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
              </div>
              <div className="bn-stat-content">
                <span className="bn-stat-label">Net Profit</span>
                <span className="bn-stat-value">${(netProfit / 1000).toFixed(0)}K</span>
                <span className="bn-stat-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                  </svg>
                  +18.3% from last period
                </span>
              </div>
            </div>

            <div className="bn-stat-card">
              <div className="bn-stat-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
              </div>
              <div className="bn-stat-content">
                <span className="bn-stat-label">Profit Margin</span>
                <span className="bn-stat-value">{profitMargin}%</span>
                <span className="bn-stat-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                  </svg>
                  +2.1% from last period
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="bn-dash-content">
        <div className="container">
          <div className="bn-dash-grid">
            {/* Revenue Chart */}
            <div className="bn-card bn-chart-card">
              <div className="bn-card-header">
                <h3>Revenue vs Expenses</h3>
                <div className="bn-chart-legend">
                  <span className="bn-legend-item"><span className="bn-legend-dot blue"></span> Revenue</span>
                  <span className="bn-legend-item"><span className="bn-legend-dot red"></span> Expenses</span>
                </div>
              </div>
              <div className="bn-chart">
                {revenueData.length > 0 ? (
                  <div className="bn-bar-chart">
                    {revenueData.map((data, index) => (
                      <div key={index} className="bn-bar-group">
                        <div className="bn-bars">
                          <div
                            className="bn-bar revenue"
                            style={{ height: `${(data.revenue / maxValue) * 100}%` }}
                            title={`Revenue: $${data.revenue.toLocaleString()}`}
                          />
                          <div
                            className="bn-bar expenses"
                            style={{ height: `${(data.expenses / maxValue) * 100}%` }}
                            title={`Expenses: $${data.expenses.toLocaleString()}`}
                          />
                        </div>
                        <span className="bn-bar-label">{data.month}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bn-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <path d="M18 20V10M12 20V4M6 20v-6" />
                    </svg>
                    <p>No financial data yet</p>
                    <span>Add transactions to see your revenue chart</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bn-card">
              <div className="bn-card-header">
                <h3>Recent Transactions</h3>
                <Link href="/business-now/expenses" className="bn-link">View All</Link>
              </div>
              <div className="bn-transactions">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <div key={tx.id} className="bn-transaction">
                      <div className="bn-transaction-icon" data-type={tx.type}>
                        {tx.type === "income" ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
                          </svg>
                        )}
                      </div>
                      <div className="bn-transaction-details">
                        <span className="bn-transaction-desc">{tx.description}</span>
                        <span className="bn-transaction-date">{new Date(tx.date).toLocaleDateString()}</span>
                      </div>
                      <span className={`bn-transaction-amount ${tx.type}`}>
                        {tx.type === "income" ? "+" : ""}{tx.amount < 0 ? "-" : ""}${Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="bn-empty-state-sm">
                    <p>No transactions yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className="bn-card">
              <div className="bn-card-header">
                <h3>Tasks & To-Dos</h3>
                <div className="bn-task-filters">
                  {["all", "pending", "completed"].map((filter) => (
                    <button
                      key={filter}
                      className={`bn-filter-btn ${taskFilter === filter ? "active" : ""}`}
                      onClick={() => setTaskFilter(filter)}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bn-tasks">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <div key={task.id} className={`bn-task ${task.completed ? "completed" : ""}`}>
                      <label className="bn-task-checkbox">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskComplete(task.id)}
                        />
                        <span className="bn-checkmark"></span>
                      </label>
                      <div className="bn-task-content">
                        <span className="bn-task-title">{task.title}</span>
                        <span className="bn-task-due">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                      <span className={`bn-task-priority ${task.priority}`}>{task.priority}</span>
                    </div>
                  ))
                ) : (
                  <div className="bn-empty-state-sm">
                    <p>No tasks yet</p>
                  </div>
                )}
              </div>
              <div className="bn-add-task-form">
                <input
                  type="text"
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  className="bn-task-input"
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="bn-task-priority-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button className="bn-add-task-btn" onClick={addTask}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick Tools */}
            <div className="bn-card">
              <div className="bn-card-header">
                <h3>Quick Tools</h3>
              </div>
              <div className="bn-quick-tools-row">
                {quickTools.map((tool) => (
                  <button
                    key={tool.id}
                    className={`bn-quick-tool-btn ${activeTool === tool.id ? "active" : ""}`}
                    onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                  >
                    <div className="bn-qt-icon">{tool.icon}</div>
                    <span className="bn-qt-name">{tool.name}</span>
                  </button>
                ))}
              </div>
              {activeTool && (
                <div className="bn-tool-panel">
                  {activeTool === "invoice" && (
                    <div className="bn-tool-content">
                      <h4>Create Invoice</h4>
                      <div className="bn-tool-form">
                        <input type="text" placeholder="Client name" className="bn-tool-input" />
                        <input type="number" placeholder="Amount" className="bn-tool-input" />
                        <textarea placeholder="Description" className="bn-tool-textarea" rows={2} />
                        <button className="bn-tool-submit">Generate Invoice</button>
                      </div>
                    </div>
                  )}
                  {activeTool === "expense" && (
                    <div className="bn-tool-content">
                      <h4>Add Expense</h4>
                      <div className="bn-tool-form">
                        <input type="text" placeholder="Expense description" className="bn-tool-input" />
                        <input type="number" placeholder="Amount" className="bn-tool-input" />
                        <select className="bn-tool-select">
                          <option>Select category</option>
                          <option>Software</option>
                          <option>Office</option>
                          <option>Travel</option>
                          <option>Marketing</option>
                        </select>
                        <button className="bn-tool-submit">Add Expense</button>
                      </div>
                    </div>
                  )}
                  {activeTool === "report" && (
                    <div className="bn-tool-content">
                      <h4>Quick Summary</h4>
                      <div className="bn-quick-summary">
                        <div className="bn-summary-row">
                          <span>Total Revenue</span>
                          <strong>${(totalRevenue / 1000).toFixed(0)}K</strong>
                        </div>
                        <div className="bn-summary-row">
                          <span>Total Expenses</span>
                          <strong>${(totalExpenses / 1000).toFixed(0)}K</strong>
                        </div>
                        <div className="bn-summary-row highlight">
                          <span>Net Profit</span>
                          <strong>${(netProfit / 1000).toFixed(0)}K</strong>
                        </div>
                        <div className="bn-summary-row">
                          <span>Profit Margin</span>
                          <strong>{profitMargin}%</strong>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTool === "calculator" && (
                    <div className="bn-tool-content">
                      <h4>Quick Calculator</h4>
                      <div className="bn-calculator">
                        <input type="number" placeholder="Enter amount" className="bn-tool-input" id="calc-input" />
                        <div className="bn-calc-row">
                          <button className="bn-calc-btn" onClick={() => {
                            const input = document.getElementById('calc-input') as HTMLInputElement;
                            if (input) input.value = (parseFloat(input.value || '0') * 1.1).toFixed(2);
                          }}>+10%</button>
                          <button className="bn-calc-btn" onClick={() => {
                            const input = document.getElementById('calc-input') as HTMLInputElement;
                            if (input) input.value = (parseFloat(input.value || '0') * 0.9).toFixed(2);
                          }}>-10%</button>
                          <button className="bn-calc-btn" onClick={() => {
                            const input = document.getElementById('calc-input') as HTMLInputElement;
                            if (input) input.value = (parseFloat(input.value || '0') * 2).toFixed(2);
                          }}>x2</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AI Business Insights Section */}
      <section className="bn-ai-section">
        <div className="container">
          <div className="bn-ai-toggle-card" onClick={() => setShowAIInsights(!showAIInsights)}>
            <div className="bn-ai-toggle-left">
              <div className="bn-ai-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                  <path d="M12 2a10 10 0 00-6.88 17.23l-.45 2.27a1 1 0 001.21 1.16l2.5-.62A10 10 0 1012 2z" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 6v.01M12 18v.01M6 12h.01M18 12h.01" />
                </svg>
              </div>
              <div>
                <h3>AI Business Insights</h3>
                <p>Get intelligent analysis, predictions, and recommendations for your business</p>
              </div>
            </div>
            <div className={`bn-ai-chevron ${showAIInsights ? "open" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {showAIInsights && (
            <div className="bn-ai-panel">
              {!aiAnalysis && !isAnalyzing ? (
                <div className="bn-ai-start">
                  <div className="bn-ai-start-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <h4>Analyze Your Business Performance</h4>
                    <p>Let our AI analyze your financial data, identify trends, and provide actionable insights to help grow your business.</p>
                    <button className="bn-ai-start-btn" onClick={runAIAnalysis}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Run AI Analysis
                    </button>
                  </div>
                </div>
              ) : isAnalyzing ? (
                <div className="bn-ai-loading">
                  <div className="bn-ai-loading-spinner" />
                  <h4>Analyzing your business data...</h4>
                  <p>Our AI is reviewing your financials, identifying patterns, and generating insights</p>
                </div>
              ) : aiAnalysis ? (
                <div className="bn-ai-results">
                  {/* Health Score */}
                  <div className="bn-ai-health-section">
                    <div className="bn-ai-health-score">
                      <svg viewBox="0 0 120 120" className="bn-ai-health-ring">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="url(#healthGradient)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${(aiAnalysis.healthScore / 100) * 339.292} 339.292`}
                          transform="rotate(-90 60 60)"
                        />
                        <defs>
                          <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#22C55E" />
                            <stop offset="100%" stopColor="#10B981" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="bn-ai-health-value">
                        <span className="bn-ai-health-num">{aiAnalysis.healthScore}</span>
                        <span className="bn-ai-health-label">{aiAnalysis.healthLabel}</span>
                      </div>
                    </div>
                    <div className="bn-ai-health-info">
                      <h4>Business Health Score</h4>
                      <p>Based on analysis of your revenue trends, expense ratios, cash flow patterns, and market conditions.</p>
                      <div className="bn-ai-health-factors">
                        <span className="bn-ai-factor positive">Revenue Trend: Growing</span>
                        <span className="bn-ai-factor warning">Expense Ratio: Monitor</span>
                        <span className="bn-ai-factor positive">Profit Margin: Healthy</span>
                      </div>
                    </div>
                  </div>

                  {/* Key Insights */}
                  <div className="bn-ai-insights-section">
                    <h4>Key Insights</h4>
                    <div className="bn-ai-insights-grid">
                      {aiAnalysis.insights.map((insight) => (
                        <div key={insight.id} className="bn-ai-insight-card">
                          <div className="bn-ai-insight-header">
                            <div className="bn-ai-insight-icon" style={{ color: getCategoryColor(insight.category) }}>
                              {getCategoryIcon(insight.category)}
                            </div>
                            <span className="bn-ai-insight-category">{insight.category}</span>
                            <span
                              className="bn-ai-insight-impact"
                              style={{
                                background: getImpactBadge(insight.impact).bg,
                                color: getImpactBadge(insight.impact).text
                              }}
                            >
                              {insight.impact} impact
                            </span>
                          </div>
                          <h5>{insight.title}</h5>
                          <p>{insight.description}</p>
                          {insight.actionable && insight.action && (
                            <button className="bn-ai-insight-action">
                              {insight.action}
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cash Flow Forecast & Opportunities */}
                  <div className="bn-ai-forecast-grid">
                    <div className="bn-ai-forecast-card">
                      <h4>Cash Flow Forecast (6 Months)</h4>
                      <div className="bn-ai-forecast-chart">
                        {aiAnalysis.cashFlowForecast.map((month, idx) => (
                          <div key={idx} className="bn-ai-forecast-bar">
                            <div
                              className="bn-ai-forecast-fill"
                              style={{
                                height: `${(month.projected / 90000) * 100}%`,
                                background: month.trend === "up" ? "#22C55E" : month.trend === "down" ? "#F59E0B" : "#3B82F6"
                              }}
                            />
                            <span className="bn-ai-forecast-value">${(month.projected / 1000).toFixed(0)}K</span>
                            <span className="bn-ai-forecast-month">{month.month}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bn-ai-opportunities-card">
                      <h4>Market Opportunities</h4>
                      <div className="bn-ai-opportunities-list">
                        {aiAnalysis.marketOpportunities.map((opp, idx) => (
                          <div key={idx} className="bn-ai-opportunity-item">
                            <div className="bn-ai-opp-info">
                              <span className="bn-ai-opp-title">{opp.title}</span>
                              <span className="bn-ai-opp-potential">{opp.potential}</span>
                            </div>
                            <span className={`bn-ai-opp-difficulty ${opp.difficulty.toLowerCase()}`}>
                              {opp.difficulty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendations & Risks */}
                  <div className="bn-ai-rec-risk-grid">
                    <div className="bn-ai-recommendations-card">
                      <h4>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" width="20" height="20">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Recommendations
                      </h4>
                      <ul>
                        {aiAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bn-ai-risks-card">
                      <h4>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" width="20" height="20">
                          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Risk Factors
                      </h4>
                      <ul>
                        {aiAnalysis.riskFactors.map((risk, idx) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bn-ai-actions">
                    <button className="bn-ai-action-btn secondary" onClick={runAIAnalysis}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M23 4v6h-6M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                      </svg>
                      Refresh Analysis
                    </button>
                    <button className="bn-ai-action-btn primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export Full Report
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bn-dash-cta">
        <div className="container">
          <div className="bn-cta-content">
            <div className="bn-cta-text">
              <h2>Need help growing your business?</h2>
              <p>Access our library of guides, templates, and resources designed to help you succeed.</p>
            </div>
            <Link href="/business-now/resources" className="bn-btn bn-btn-light">
              Explore Resources
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
