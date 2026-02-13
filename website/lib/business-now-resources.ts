// Business Now Resources Configuration
// Centralized data for all downloadable resources

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: "guide" | "template";
  format: "PDF" | "HTML" | "Excel" | "CSV";
  fileName: string;
  filePath: string;
  isFree: boolean;
  category: string;
  downloadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const guides: Resource[] = [
  {
    id: "business-overview",
    title: "Business Overview Framework",
    description: "Define what your business is, who it serves, and how it makes money. A foundational document every operator needs.",
    type: "guide",
    format: "HTML",
    fileName: "business-overview-framework.html",
    filePath: "/downloads/business-now/guides/business-overview-framework.html",
    isFree: true,
    category: "Planning",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "goal-setting",
    title: "Goal Setting & Priority Framework",
    description: "Learn how to set meaningful goals and prioritize ruthlessly. Stop chasing everything and start finishing what matters.",
    type: "guide",
    format: "HTML",
    fileName: "goal-setting-framework.html",
    filePath: "/downloads/business-now/guides/goal-setting-framework.html",
    isFree: false,
    category: "Planning",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "weekly-planning",
    title: "Weekly Planning System Guide",
    description: "The complete system for planning your week with intention. Includes the exact process we use to maintain consistency.",
    type: "guide",
    format: "HTML",
    fileName: "weekly-planning-system.html",
    filePath: "/downloads/business-now/guides/weekly-planning-system.html",
    isFree: false,
    category: "Planning",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "cash-flow",
    title: "Cash Flow Management Guide",
    description: "Understand your numbers without being an accountant. Simple frameworks for tracking money in and money out.",
    type: "guide",
    format: "HTML",
    fileName: "cash-flow-management.html",
    filePath: "/downloads/business-now/guides/cash-flow-management.html",
    isFree: false,
    category: "Finance",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "kpi-selection",
    title: "KPI Selection Guide",
    description: "How to choose the 3-5 metrics that actually matter for your business. Avoid vanity metrics and focus on drivers.",
    type: "guide",
    format: "HTML",
    fileName: "kpi-selection-guide.html",
    filePath: "/downloads/business-now/guides/kpi-selection-guide.html",
    isFree: false,
    category: "Metrics",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "execution-playbook",
    title: "Execution Discipline Playbook",
    description: "Build systems for consistent action. This playbook covers habits, routines, and accountability structures.",
    type: "guide",
    format: "HTML",
    fileName: "execution-discipline-playbook.html",
    filePath: "/downloads/business-now/guides/execution-discipline-playbook.html",
    isFree: false,
    category: "Execution",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
];

export const templates: Resource[] = [
  {
    id: "business-canvas",
    title: "Business Overview Canvas",
    description: "One-page template to document your business model, value proposition, and revenue streams.",
    type: "template",
    format: "CSV",
    fileName: "business-overview-canvas.csv",
    filePath: "/downloads/business-now/templates/business-overview-canvas.csv",
    isFree: true,
    category: "Planning",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "goal-tracker",
    title: "Goal & Priority Tracker",
    description: "Track quarterly, monthly, and weekly goals with built-in progress indicators and priority scoring.",
    type: "template",
    format: "CSV",
    fileName: "goal-priority-tracker.csv",
    filePath: "/downloads/business-now/templates/goal-priority-tracker.csv",
    isFree: false,
    category: "Planning",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "weekly-planner",
    title: "Weekly Planning Template",
    description: "Plan your week with time blocks, priorities, and reflection sections. Print or use digitally.",
    type: "template",
    format: "CSV",
    fileName: "weekly-planning-template.csv",
    filePath: "/downloads/business-now/templates/weekly-planning-template.csv",
    isFree: false,
    category: "Planning",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "income-expense",
    title: "Income & Expense Tracker",
    description: "Simple monthly tracker for all income and expenses with automatic categorization and totals.",
    type: "template",
    format: "CSV",
    fileName: "income-expense-tracker.csv",
    filePath: "/downloads/business-now/templates/income-expense-tracker.csv",
    isFree: true,
    category: "Finance",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "cash-flow-projector",
    title: "12-Month Cash Flow Projector",
    description: "Project your cash flow for the next 12 months. Includes scenarios for best, expected, and worst cases.",
    type: "template",
    format: "CSV",
    fileName: "cash-flow-projector.csv",
    filePath: "/downloads/business-now/templates/cash-flow-projector.csv",
    isFree: false,
    category: "Finance",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "kpi-dashboard",
    title: "KPI Dashboard Template",
    description: "Track up to 10 KPIs with weekly/monthly views, trend indicators, and target comparisons.",
    type: "template",
    format: "CSV",
    fileName: "kpi-dashboard.csv",
    filePath: "/downloads/business-now/templates/kpi-dashboard.csv",
    isFree: false,
    category: "Metrics",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "monthly-review",
    title: "Monthly Financial Review",
    description: "End-of-month review template covering revenue, expenses, profitability, and key insights.",
    type: "template",
    format: "CSV",
    fileName: "monthly-financial-review.csv",
    filePath: "/downloads/business-now/templates/monthly-financial-review.csv",
    isFree: false,
    category: "Finance",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "pricing-calculator",
    title: "Pricing & Margins Calculator",
    description: "Calculate optimal pricing based on costs, desired margins, and market positioning.",
    type: "template",
    format: "CSV",
    fileName: "pricing-calculator.csv",
    filePath: "/downloads/business-now/templates/pricing-calculator.csv",
    isFree: false,
    category: "Finance",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
];

export const allResources: Resource[] = [...guides, ...templates];

export function getResourceById(id: string): Resource | undefined {
  return allResources.find(r => r.id === id);
}

export function getResourcesByType(type: "guide" | "template"): Resource[] {
  return allResources.filter(r => r.type === type);
}

export function getFreeResources(): Resource[] {
  return allResources.filter(r => r.isFree);
}

export function getPremiumResources(): Resource[] {
  return allResources.filter(r => !r.isFree);
}
