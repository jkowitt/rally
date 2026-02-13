// ---------------------------------------------------------------------------
// Rally API Client
// ---------------------------------------------------------------------------

export const API_BASE = process.env.EXPO_PUBLIC_RALLY_API_URL || 'http://localhost:3001/api';

// Module-level auth token
let _token: string | null = null;

export function setToken(token: string | null): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface ApiSuccess<T = any> {
  ok: true;
  data: T;
}

interface ApiError {
  ok: false;
  error: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (_token) {
      headers['Authorization'] = `Bearer ${_token}`;
    }

    const options: RequestInit = { method, headers };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error || data.message || 'Request failed' };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Server unavailable' };
  }
}

// ---------------------------------------------------------------------------
// Public API client
// ---------------------------------------------------------------------------

export const apiClient = {
  get<T = any>(path: string): Promise<ApiResponse<T>> {
    return request<T>('GET', path);
  },

  post<T = any>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>('POST', path, body);
  },

  put<T = any>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>('PUT', path, body);
  },

  delete<T = any>(path: string): Promise<ApiResponse<T>> {
    return request<T>('DELETE', path);
  },
};

// ---------------------------------------------------------------------------
// Server health check
// ---------------------------------------------------------------------------

export async function isServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/api/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
