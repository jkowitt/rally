/**
 * API Client for VALORA Platform
 * Provides easy-to-use functions for all backend endpoints
 */

import type {
  Property,
  Valuation,
  APIResponse,
  PaginatedResponse,
  AIAnalysisResult
} from './types';

const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007';

// Generic fetch wrapper
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseURL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==========================================
// VALUATIONS
// ==========================================

export const valuations = {
  /**
   * List all valuations
   */
  list: async (params?: {
    status?: string;
    organizationId?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.organizationId) searchParams.set('organizationId', params.organizationId);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    return fetchAPI<{
      valuations: Valuation[];
      pagination: any;
    }>(`/api/valuations?${searchParams}`);
  },

  /**
   * Get single valuation by ID
   */
  get: async (id: string) => {
    return fetchAPI<Valuation>(`/api/valuations/${id}`);
  },

  /**
   * Create new valuation
   */
  create: async (data: Partial<Valuation>) => {
    return fetchAPI<Valuation>('/api/valuations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update valuation
   */
  update: async (id: string, data: Partial<Valuation>) => {
    return fetchAPI<Valuation>(`/api/valuations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete valuation
   */
  delete: async (id: string) => {
    return fetchAPI<{ success: boolean }>(`/api/valuations/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==========================================
// PROPERTIES
// ==========================================

export const properties = {
  /**
   * Search properties
   */
  search: async (params?: {
    search?: string;
    propertyType?: string;
    city?: string;
    state?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.propertyType) searchParams.set('propertyType', params.propertyType);
    if (params?.city) searchParams.set('city', params.city);
    if (params?.state) searchParams.set('state', params.state);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    return fetchAPI<{
      properties: Property[];
      pagination: any;
    }>(`/api/properties?${searchParams}`);
  },

  /**
   * Create new property
   */
  create: async (data: Partial<Property>) => {
    return fetchAPI<Property>('/api/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ==========================================
// AI FEATURES
// ==========================================

export const ai = {
  /**
   * Analyze property image for condition
   */
  analyzeImage: async (imageUrl: string, propertyId?: string) => {
    return fetchAPI<{
      success: boolean;
      analysis: AIAnalysisResult;
    }>('/api/ai/analyze-image', {
      method: 'POST',
      body: JSON.stringify({ imageUrl, propertyId }),
    });
  },

  /**
   * Generate property improvement recommendations
   */
  generateRecommendations: async (propertyId: string) => {
    return fetchAPI<{
      success: boolean;
      recommendations: any[];
    }>('/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ propertyId }),
    });
  },

  /**
   * Extract location from image
   */
  geocodeImage: async (imageUrl: string) => {
    return fetchAPI<{
      success: boolean;
      data: any;
    }>('/api/ai/geocode', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  },
};

// ==========================================
// FILE UPLOAD
// ==========================================

export const upload = {
  /**
   * Upload file
   */
  uploadFile: async (file: File, folder?: string, metadata?: { alt?: string; caption?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    if (metadata?.alt) formData.append('alt', metadata.alt);
    if (metadata?.caption) formData.append('caption', metadata.caption);

    const response = await fetch(`${baseURL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  },
};

// ==========================================
// ADMIN - CMS
// ==========================================

export const cms = {
  /**
   * Get all CMS content
   */
  getContent: async (section?: string) => {
    const params = section ? `?section=${section}` : '';
    return fetchAPI<{
      content: any[];
      grouped: Record<string, any[]>;
    }>(`/api/admin/cms${params}`);
  },

  /**
   * Update CMS content
   */
  updateContent: async (data: {
    key: string;
    value: string;
    type?: string;
    section?: string;
  }) => {
    return fetchAPI<any>('/api/admin/cms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete CMS content
   */
  deleteContent: async (key: string) => {
    return fetchAPI<{ success: boolean }>(`/api/admin/cms?key=${key}`, {
      method: 'DELETE',
    });
  },
};

// ==========================================
// ADMIN - ANALYTICS
// ==========================================

export const analytics = {
  /**
   * Get platform analytics
   */
  getAnalytics: async (period: number = 30) => {
    return fetchAPI<any>(`/api/admin/analytics?period=${period}`);
  },
};

// Export all as default
export default {
  valuations,
  properties,
  ai,
  upload,
  cms,
  analytics,
};
