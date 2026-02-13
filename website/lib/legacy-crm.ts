// Legacy CRM Types and Configuration

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  relationship: "hot" | "warm" | "cold" | "new";
  importance: "high" | "medium" | "low";
  lastContact?: string;
  nextFollowUp?: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  contactId: string;
  type: "call" | "email" | "meeting" | "note" | "task";
  title: string;
  description: string;
  date: string;
  outcome?: string;
  nextAction?: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  contactId: string;
  title: string;
  value?: number;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "closed-won" | "closed-lost";
  probability: number;
  expectedCloseDate?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string;
  company?: string;
  role?: string;
  useCase?: string;
  referralSource?: string;
  createdAt: string;
  status: "pending" | "invited" | "active";
}

export interface CRMStats {
  totalContacts: number;
  hotRelationships: number;
  warmRelationships: number;
  coldRelationships: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  openOpportunities: number;
  pipelineValue: number;
}

// Demo data for showcasing the CRM — starts empty for beta accounts (blank slate)
export const demoContacts: Contact[] = [];

export const demoInteractions: Interaction[] = [];

export const demoOpportunities: Opportunity[] = [];

// Helper functions
export function calculateCRMStats(
  contacts: Contact[],
  opportunities: Opportunity[]
): CRMStats {
  const today = new Date().toISOString().split("T")[0];

  return {
    totalContacts: contacts.length,
    hotRelationships: contacts.filter((c) => c.relationship === "hot").length,
    warmRelationships: contacts.filter((c) => c.relationship === "warm").length,
    coldRelationships: contacts.filter((c) => c.relationship === "cold").length,
    pendingFollowUps: contacts.filter(
      (c) => c.nextFollowUp && c.nextFollowUp >= today
    ).length,
    overdueFollowUps: contacts.filter(
      (c) => c.nextFollowUp && c.nextFollowUp < today
    ).length,
    openOpportunities: opportunities.filter(
      (o) => !["closed-won", "closed-lost"].includes(o.stage)
    ).length,
    pipelineValue: opportunities
      .filter((o) => !["closed-won", "closed-lost"].includes(o.stage))
      .reduce((sum, o) => sum + (o.value || 0) * (o.probability / 100), 0),
  };
}

export function getRelationshipColor(relationship: Contact["relationship"]): string {
  switch (relationship) {
    case "hot":
      return "#27AE60";
    case "warm":
      return "#F59E0B";
    case "cold":
      return "#6B7280";
    case "new":
      return "#3B82F6";
    default:
      return "#6B7280";
  }
}

export function getStageColor(stage: Opportunity["stage"]): string {
  switch (stage) {
    case "lead":
      return "#6B7280";
    case "qualified":
      return "#3B82F6";
    case "proposal":
      return "#8B5CF6";
    case "negotiation":
      return "#F59E0B";
    case "closed-won":
      return "#27AE60";
    case "closed-lost":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDaysSinceContact(lastContact?: string): number | null {
  if (!lastContact) return null;
  const last = new Date(lastContact);
  const now = new Date();
  const diff = now.getTime() - last.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
