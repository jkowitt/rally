// Common types for VALORA platform

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum PropertyType {
  COMMERCIAL = 'COMMERCIAL',
  RESIDENTIAL = 'RESIDENTIAL',
  MULTIFAMILY = 'MULTIFAMILY',
  INDUSTRIAL = 'INDUSTRIAL',
  MIXED_USE = 'MIXED_USE',
  LAND = 'LAND',
}

export interface Property {
  id: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  propertyType: PropertyType;
  squareFeet?: number;
  units?: number;
  yearBuilt?: number;
  aiConditionScore?: number;
  latitude?: number;
  longitude?: number;
}

export interface Valuation {
  id: string;
  propertyId: string;
  userId: string;
  organizationId?: string;
  name: string;
  status: ValuationStatus;
  visibility: Visibility;
  purchasePrice?: number;
  currentValue?: number;
  estimatedValue?: number;
  noi?: number;
  capRate?: number;
  irr?: number;
  cashOnCash?: number;
  incomeData?: Record<string, number>;
  expenseData?: Record<string, number>;
  financingData?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ValuationStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum Visibility {
  PRIVATE = 'PRIVATE',
  ORGANIZATION = 'ORGANIZATION',
  PUBLIC = 'PUBLIC',
}

export interface AIAnalysisResult {
  conditionScore: number;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    estimatedCost: string;
    valueIncrease: string;
    timeline: string;
  }>;
  tags: string[];
}

export interface APIResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
