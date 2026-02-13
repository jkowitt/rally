/**
 * Rally API Client
 * Connects to the Rally Express server for auth, content, and analytics
 */

const RALLY_API_BASE = process.env.NEXT_PUBLIC_RALLY_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function rallyFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rally-token') : null;

  try {
    const response = await fetch(`${RALLY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error || `HTTP ${response.status}` };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Server unavailable' };
  }
}

// Auth
export const rallyAuth = {
  login: (email: string, password: string) =>
    rallyFetch<{ token: string; user: RallyUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (params: RegisterParams) =>
    rallyFetch<{ token: string; user: RallyUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  me: () => rallyFetch<{ user: RallyUser }>('/auth/me'),

  verifyEmail: (code: string) =>
    rallyFetch<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  resendVerification: () =>
    rallyFetch<{ message: string; resetCode?: string }>('/auth/resend-verification', {
      method: 'POST',
    }),

  forgotPassword: (email: string) =>
    rallyFetch<{ message: string; resetCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    rallyFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  updateProfile: (fields: Partial<Pick<RallyUser, 'name' | 'handle' | 'favoriteSchool' | 'supportingSchools' | 'emailUpdates' | 'pushNotifications'>>) =>
    rallyFetch<RallyUser>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),
};

// Content
export const rallyContent = {
  getFeed: () => rallyFetch<{ content: ContentItem[] }>('/content'),
  getSchools: () => rallyFetch<{ schools: School[] }>('/schools'),
};

// Events
export const rallyEvents = {
  list: (params?: { schoolId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.schoolId) qs.set('schoolId', params.schoolId);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return rallyFetch<{ events: RallyEvent[]; total: number }>(`/events${query ? `?${query}` : ''}`);
  },

  get: (eventId: string) => rallyFetch<RallyEvent>(`/events/${eventId}`),

  create: (event: CreateEventParams) =>
    rallyFetch<RallyEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),

  update: (eventId: string, fields: Partial<CreateEventParams>) =>
    rallyFetch<RallyEvent>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),

  delete: (eventId: string) =>
    rallyFetch<{ message: string }>(`/events/${eventId}`, { method: 'DELETE' }),

  earn: (eventId: string, activationId: string) =>
    rallyFetch<{ earned: PointsEntry; totalPoints: number }>(`/events/${eventId}/earn`, {
      method: 'POST',
      body: JSON.stringify({ activationId }),
    }),
};

// Points
export const rallyPoints = {
  me: () => rallyFetch<{ totalPoints: number; tier: string; history: PointsEntry[] }>('/points/me'),
};

// Rewards
export const rallyRewards = {
  list: (schoolId: string) =>
    rallyFetch<{ rewards: Reward[] }>(`/schools/${schoolId}/rewards`),

  create: (schoolId: string, reward: { name: string; pointsCost: number; description?: string }) =>
    rallyFetch<Reward>(`/schools/${schoolId}/rewards`, {
      method: 'POST',
      body: JSON.stringify(reward),
    }),

  update: (schoolId: string, rewardId: string, fields: Partial<{ name: string; pointsCost: number; description: string }>) =>
    rallyFetch<Reward>(`/schools/${schoolId}/rewards/${rewardId}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),

  delete: (schoolId: string, rewardId: string) =>
    rallyFetch<{ message: string }>(`/schools/${schoolId}/rewards/${rewardId}`, { method: 'DELETE' }),
};

// Notifications (admin)
export const rallyNotifications = {
  list: (schoolId?: string) => {
    const qs = schoolId ? `?schoolId=${schoolId}` : '';
    return rallyFetch<{ notifications: RallyNotification[] }>(`/notifications${qs}`);
  },

  create: (notif: CreateNotificationParams) =>
    rallyFetch<RallyNotification>('/notifications', {
      method: 'POST',
      body: JSON.stringify(notif),
    }),

  update: (notifId: string, fields: Partial<CreateNotificationParams>) =>
    rallyFetch<RallyNotification>(`/notifications/${notifId}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),

  delete: (notifId: string) =>
    rallyFetch<{ message: string }>(`/notifications/${notifId}`, { method: 'DELETE' }),

  send: (notifId: string) =>
    rallyFetch<RallyNotification>(`/notifications/${notifId}/send`, { method: 'POST' }),
};

// Bonus Offers (admin)
export const rallyBonusOffers = {
  list: (schoolId: string) =>
    rallyFetch<{ bonusOffers: BonusOffer[] }>(`/schools/${schoolId}/bonus-offers`),

  create: (schoolId: string, offer: CreateBonusOfferParams) =>
    rallyFetch<BonusOffer>(`/schools/${schoolId}/bonus-offers`, {
      method: 'POST',
      body: JSON.stringify(offer),
    }),

  update: (schoolId: string, offerId: string, fields: Partial<CreateBonusOfferParams>) =>
    rallyFetch<BonusOffer>(`/schools/${schoolId}/bonus-offers/${offerId}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),

  delete: (schoolId: string, offerId: string) =>
    rallyFetch<{ message: string }>(`/schools/${schoolId}/bonus-offers/${offerId}`, { method: 'DELETE' }),
};

// Users (admin)
export const rallyUsers = {
  list: () => rallyFetch<{ users: RallyUser[] }>('/users'),

  getById: (id: string) => rallyFetch<{ user: RallyUser }>(`/users/${id}`),

  update: (id: string, fields: Partial<RallyUser>) =>
    rallyFetch<{ user: RallyUser }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),
};

// Analytics
export const rallyAnalytics = {
  getSummary: () => rallyFetch<AnalyticsSummary>('/analytics'),

  trackPageVisit: (page: string, metadata?: Record<string, string>) =>
    rallyFetch('/analytics/track', {
      method: 'POST',
      body: JSON.stringify({ event: 'page_visit', page, metadata, timestamp: new Date().toISOString() }),
    }),

  trackEvent: (event: string, metadata?: Record<string, string>) =>
    rallyFetch('/analytics/track', {
      method: 'POST',
      body: JSON.stringify({ event, metadata, timestamp: new Date().toISOString() }),
    }),
};

// Types
export interface RallyUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: 'developer' | 'admin' | 'user';
  schoolId: string | null;
  favoriteSchool: string | null;
  supportingSchools: string[];
  emailVerified: boolean;
  emailUpdates: boolean;
  pushNotifications: boolean;
  acceptedTerms: boolean;
  points?: number;
  tier?: string;
  createdAt?: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  name: string;
  handle: string;
  favoriteSchool?: string | null;
  supportingSchools?: string[];
  emailUpdates?: boolean;
  pushNotifications?: boolean;
  acceptedTerms?: boolean;
}

export interface ContentItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  imageUrl?: string;
  author?: string;
  createdAt: string;
}

export interface School {
  id: string;
  name: string;
  mascot: string;
  conference: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface EventActivation {
  id: string;
  type: string;
  name: string;
  points: number;
  description: string;
}

export interface RallyEvent {
  id: string;
  title: string;
  sport: string;
  homeSchoolId: string;
  homeTeam: string;
  awaySchoolId?: string | null;
  awayTeam?: string;
  venue: string;
  city: string;
  dateTime: string;
  status: 'upcoming' | 'live' | 'completed';
  activations: EventActivation[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEventParams {
  title: string;
  sport?: string;
  homeSchoolId: string;
  homeTeam?: string;
  awaySchoolId?: string | null;
  awayTeam?: string;
  venue?: string;
  city?: string;
  dateTime: string;
  status?: string;
  activations?: Omit<EventActivation, 'id'>[];
}

export interface PointsEntry {
  id: string;
  userId: string;
  eventId: string;
  activationId: string;
  activationName: string;
  points: number;
  schoolId: string;
  timestamp: string;
}

export interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  description: string;
  createdAt?: string;
}

export interface RallyNotification {
  id: string;
  title: string;
  body: string;
  schoolId: string;
  targetAudience: 'all' | 'tier_gold' | 'tier_platinum' | 'event_attendees';
  status: 'draft' | 'scheduled' | 'sent';
  scheduledFor?: string;
  sentAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationParams {
  title: string;
  body: string;
  schoolId: string;
  targetAudience?: string;
  scheduledFor?: string;
}

export interface BonusOffer {
  id: string;
  name: string;
  description: string;
  bonusMultiplier?: number;
  bonusPoints?: number;
  activationType?: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CreateBonusOfferParams {
  name: string;
  description?: string;
  bonusMultiplier?: number;
  bonusPoints?: number;
  activationType?: string;
  startsAt?: string;
  expiresAt: string;
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeToday: number;
  eventsTracked: number;
  verifiedUsers: number;
  usersBySchool: Record<string, number>;
  recentEvents: Array<{ event: string; page: string; timestamp: string; userId?: string }>;
}
