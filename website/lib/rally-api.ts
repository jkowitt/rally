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

  updateProfile: (fields: Partial<Pick<RallyUser, 'name' | 'handle' | 'favoriteSchool' | 'supportingSchools' | 'emailUpdates' | 'pushNotifications' | 'userType' | 'birthYear' | 'residingCity' | 'residingState'>>) =>
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
  list: () => rallyFetch<RallyUser[]>('/users'),

  getById: (id: string) => rallyFetch<RallyUser>(`/users/${id}`),

  update: (id: string, fields: Partial<RallyUser>) =>
    rallyFetch<RallyUser>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),
};

// Teammates (admin)
export const rallyTeammates = {
  list: (propertyId?: string) => {
    const qs = propertyId ? `?propertyId=${propertyId}` : '';
    return rallyFetch<TeammateListResponse>(`/teammates${qs}`);
  },

  invite: (email: string, name?: string, permissions?: TeammatePermissions) =>
    rallyFetch<{ invitation: TeammateInvitation; message: string; teammate?: RallyUser; converted?: boolean }>('/teammates/invite', {
      method: 'POST',
      body: JSON.stringify({ email, name, permissions }),
    }),

  updatePermissions: (teammateId: string, permissions: Partial<TeammatePermissions>) =>
    rallyFetch<{ teammate: RallyUser; message: string }>(`/teammates/${teammateId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),

  remove: (teammateId: string) =>
    rallyFetch<{ message: string }>(`/teammates/${teammateId}`, { method: 'DELETE' }),

  cancelInvitation: (invitationId: string) =>
    rallyFetch<{ message: string }>(`/teammates/invitations/${invitationId}`, { method: 'DELETE' }),
};

// Affiliate Offers
export const rallyAffiliates = {
  list: (params?: { category?: string; sport?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.sport) qs.set('sport', params.sport);
    const query = qs.toString();
    return rallyFetch<{ offers: AffiliateOffer[]; total: number; enabled: boolean }>(`/affiliates${query ? `?${query}` : ''}`);
  },
  listAll: () => rallyFetch<{ offers: AffiliateOffer[]; total: number }>('/affiliates/all'),
  create: (offer: CreateAffiliateParams) =>
    rallyFetch<AffiliateOffer>('/affiliates', { method: 'POST', body: JSON.stringify(offer) }),
  update: (offerId: string, fields: Partial<CreateAffiliateParams & { isActive: boolean }>) =>
    rallyFetch<AffiliateOffer>(`/affiliates/${offerId}`, { method: 'PUT', body: JSON.stringify(fields) }),
  delete: (offerId: string) =>
    rallyFetch<{ message: string }>(`/affiliates/${offerId}`, { method: 'DELETE' }),
  trackClick: (offerId: string) =>
    rallyFetch<{ affiliateUrl: string }>(`/affiliates/${offerId}/click`, { method: 'POST' }),
  redeem: (offerId: string) =>
    rallyFetch<{ affiliateUrl: string; pointsDeducted: number }>(`/affiliates/${offerId}/redeem`, { method: 'POST' }),
};

// Monetization
export const rallyMonetization = {
  getSettings: () => rallyFetch<MonetizationSettingsData>('/monetization/settings'),
  updateSettings: (fields: Partial<MonetizationSettingsData>) =>
    rallyFetch<MonetizationSettingsData>('/monetization/settings', { method: 'PUT', body: JSON.stringify(fields) }),
  getConfig: () => rallyFetch<MonetizationConfig>('/monetization/config'),
  trackAdImpression: () => rallyFetch('/monetization/ad-impression', { method: 'POST' }),
  claimRewardedVideo: () =>
    rallyFetch<{ pointsAwarded: number; totalPoints: number }>('/monetization/rewarded-video', { method: 'POST' }),
};

// Demographics (admin — aggregate only)
export const rallyDemographics = {
  get: (propertyId: string) =>
    rallyFetch<DemographicsData>(`/demographics/${propertyId}`),
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
  role: 'developer' | 'admin' | 'teammate' | 'user';
  schoolId: string | null;
  propertyId?: string | null;
  propertyLeague?: string;
  favoriteSchool: string | null;
  favoriteTeams?: Array<{ propertyId: string; league: string }>;
  favoriteSports?: string[];
  supportingSchools: string[];
  emailVerified: boolean;
  emailUpdates: boolean;
  pushNotifications: boolean;
  acceptedTerms: boolean;
  // Demographics
  userType?: 'student' | 'alumni' | 'general_fan' | null;
  birthYear?: number | null;
  residingCity?: string | null;
  residingState?: string | null;
  // Teammate-specific
  teammatePermissions?: TeammatePermissions;
  invitedBy?: string | null;
  points?: number;
  tier?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface TeammatePermissions {
  events: boolean;
  engagements: boolean;
  rewards: boolean;
  redemptions: boolean;
  notifications: boolean;
  bonusOffers: boolean;
  content: boolean;
  analytics: boolean;
}

export interface TeammateInvitation {
  id: string;
  email: string;
  name: string;
  propertyId: string;
  propertyLeague: string;
  permissions: TeammatePermissions;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  userId: string | null;
}

export interface TeammateListResponse {
  teammates: RallyUser[];
  pendingInvitations: TeammateInvitation[];
  total: number;
  pending: number;
}

export interface DemographicsData {
  propertyId: string;
  totalFans: number;
  age: {
    average: number | null;
    min: number | null;
    max: number | null;
    distribution: Record<string, number>;
  };
  userType: Record<string, number>;
  cities: Array<{ city: string; count: number; percentage: number }>;
  states: Array<{ state: string; count: number; percentage: number }>;
  interests: Record<string, number>;
  engagement?: {
    totalCheckins: number;
    atVenue: number;
    remote: number;
    totalPointsEarned: number;
    avgPointsPerFan: number;
  };
  tiers?: Record<string, number>;
  preferences?: {
    emailOptIn: number;
    pushOptIn: number;
  };
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
  // Demographics (optional)
  userType?: string;
  birthYear?: number;
  residingCity?: string;
  residingState?: string;
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

export interface AffiliateOffer {
  id: string;
  brand: string;
  title: string;
  description: string | null;
  category: string;
  affiliateUrl: string;
  imageUrl: string | null;
  pointsCost: number;
  sport: string | null;
  priority: number;
  isActive: boolean;
  clickCount: number;
  redeemCount: number;
  createdAt: string;
}

export interface CreateAffiliateParams {
  brand: string;
  title: string;
  description?: string;
  category: string;
  affiliateUrl: string;
  imageUrl?: string;
  pointsCost?: number;
  commissionType?: string;
  commissionValue?: string;
  sport?: string;
  priority?: number;
}

export interface MonetizationSettingsData {
  affiliatesEnabled: boolean;
  affiliateMaxPerPage: number;
  admobEnabled: boolean;
  admobBannerId: string | null;
  admobInterstitialId: string | null;
  admobRewardedVideoId: string | null;
  admobBannerEnabled: boolean;
  admobInterstitialEnabled: boolean;
  admobRewardedVideoEnabled: boolean;
  admobRewardedPoints: number;
  totalAffiliateClicks: number;
  totalAffiliateRedemptions: number;
  totalAdImpressions: number;
  updatedAt: string;
}

export interface MonetizationConfig {
  affiliatesEnabled: boolean;
  admobEnabled: boolean;
  admobBannerEnabled: boolean;
  admobInterstitialEnabled: boolean;
  admobRewardedVideoEnabled: boolean;
  admobRewardedPoints: number;
  admobBannerId: string | null;
  admobInterstitialId: string | null;
  admobRewardedVideoId: string | null;
}

// ==========================================
// SOCIAL IDENTITY — Types
// ==========================================

export interface FanProfile {
  id: string;
  userId: string;
  totalCheckins: number;
  totalPredictions: number;
  correctPredictions: number;
  totalTrivia: number;
  correctTrivia: number;
  totalPhotos: number;
  totalPolls: number;
  totalNoiseMeter: number;
  eventsAttended: number;
  uniqueVenues: number;
  currentStreak: number;
  longestStreak: number;
  sportBreakdown: Record<string, number> | null;
  verifiedLevel: 'ROOKIE' | 'CASUAL' | 'DEDICATED' | 'SUPERFAN' | 'LEGEND';
  isPublic: boolean;
  profileSlug: string | null;
  tagline: string | null;
  user?: {
    name: string;
    handle: string;
    tier: string;
    points: number;
    favoriteSchool: string | null;
    favoriteSports: string[];
    createdAt: string;
  };
}

export interface FanMilestone {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string | null;
  icon: string;
  sport: string | null;
  stat: string | null;
  earnedAt: string;
}

export interface CrewData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  schoolId: string | null;
  sport: string | null;
  avatarEmoji: string;
  color: string;
  memberCount: number;
  totalPoints: number;
  totalCheckins: number;
  totalEvents: number;
  isPublic: boolean;
  maxMembers: number;
  myRole?: string | null;
}

export interface CrewMemberData {
  id: string;
  name: string;
  handle: string;
  points: number;
  tier: string;
  profile: { eventsAttended: number; currentStreak: number; verifiedLevel: string } | null;
  role: string;
  joinedAt: string;
}

export interface GameLobbyData {
  lobbyId: string;
  eventId: string;
  isActive: boolean;
  fanCount: number;
  fans: Array<{
    id: string;
    name: string;
    handle: string;
    tier: string;
    favoriteSchool: string | null;
    fanProfile: { verifiedLevel: string; currentStreak: number; tagline: string | null } | null;
    checkedInAt: string;
  }>;
  recentReactions: Record<string, number>;
  isCheckedIn: boolean;
}

export interface ShareCardData {
  id: string;
  userId: string;
  type: string;
  title: string;
  data: Record<string, unknown>;
  viewCount: number;
  shareCount: number;
  createdAt: string;
  user?: { name: string; handle: string; tier: string; favoriteSchool: string | null };
}

export interface HeadToHeadComparison {
  fanA: { name: string; handle: string; points: number; tier: string; profile: FanProfile | null; milestoneCount: number };
  fanB: { name: string; handle: string; points: number; tier: string; profile: FanProfile | null; milestoneCount: number };
  categories: Array<{ label: string; a: number; b: number }>;
  winner: 'A' | 'B' | 'TIE';
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  handle: string;
  points: number;
  tier: string;
  favoriteSchool: string | null;
  fanProfile: {
    eventsAttended: number;
    currentStreak: number;
    verifiedLevel: string;
    tagline: string | null;
  } | null;
}

// ==========================================
// SOCIAL IDENTITY — API Client
// ==========================================

// Fan Profile
export const rallyFanProfile = {
  me: () => rallyFetch<FanProfile>('/fan-profile/me'),

  getByHandle: (handle: string) =>
    rallyFetch<{ user: RallyUser; profile: FanProfile; milestones: FanMilestone[]; crews: Array<CrewData & { role: string }> }>(`/fan-profile/by-handle/${handle}`),

  update: (fields: { tagline?: string; isPublic?: boolean; profileSlug?: string }) =>
    rallyFetch<FanProfile>('/fan-profile/me', { method: 'PUT', body: JSON.stringify(fields) }),

  refresh: () =>
    rallyFetch<FanProfile>('/fan-profile/refresh', { method: 'POST' }),

  leaderboard: () =>
    rallyFetch<{ leaderboard: LeaderboardEntry[] }>('/fan-profile/leaderboard'),

  compare: (handleA: string, handleB: string) =>
    rallyFetch<HeadToHeadComparison>(`/fan-profile/compare/${handleA}/${handleB}`),
};

// Game Lobby
export const rallyGameLobby = {
  get: (eventId: string) =>
    rallyFetch<GameLobbyData>(`/game-lobby/${eventId}`),

  checkin: (eventId: string) =>
    rallyFetch<{ success: boolean; fanCount: number }>(`/game-lobby/${eventId}/checkin`, { method: 'POST' }),

  checkout: (eventId: string) =>
    rallyFetch<{ success: boolean; fanCount: number }>(`/game-lobby/${eventId}/checkout`, { method: 'POST' }),

  react: (eventId: string, type: 'FIRE' | 'CLAP' | 'CRY' | 'HORN' | 'WAVE' | 'HUNDRED') =>
    rallyFetch<{ success: boolean; type: string }>(`/game-lobby/${eventId}/react`, { method: 'POST', body: JSON.stringify({ type }) }),
};

// Crews
export const rallyCrews = {
  list: (params?: { schoolId?: string; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.schoolId) qs.set('schoolId', params.schoolId);
    if (params?.sort) qs.set('sort', params.sort);
    const query = qs.toString();
    return rallyFetch<{ crews: Array<CrewData & { previewMembers: Array<{ id: string; name: string; handle: string; tier: string; role: string }> }> }>(`/crews${query ? `?${query}` : ''}`);
  },

  mine: () =>
    rallyFetch<{ crews: Array<CrewData & { myRole: string; joinedAt: string }> }>('/crews/mine'),

  get: (slug: string) =>
    rallyFetch<CrewData & { members: CrewMemberData[]; myRole: string | null }>(`/crews/${slug}`),

  create: (params: { name: string; description?: string; schoolId?: string; sport?: string; avatarEmoji?: string; color?: string; isPublic?: boolean }) =>
    rallyFetch<CrewData>('/crews', { method: 'POST', body: JSON.stringify(params) }),

  join: (slug: string) =>
    rallyFetch<{ success: boolean; message: string }>(`/crews/${slug}/join`, { method: 'POST' }),

  leave: (slug: string) =>
    rallyFetch<{ success: boolean; message: string }>(`/crews/${slug}/leave`, { method: 'POST' }),

  promote: (slug: string, memberId: string, role: string) =>
    rallyFetch<{ success: boolean }>(`/crews/${slug}/members/${memberId}/promote`, { method: 'PUT', body: JSON.stringify({ role }) }),

  leaderboard: (schoolId?: string) => {
    const qs = schoolId ? `?schoolId=${schoolId}` : '';
    return rallyFetch<{ leaderboard: CrewData[] }>(`/crews/leaderboard${qs}`);
  },
};

// Share Cards & Milestones
export const rallyShareCards = {
  mine: () => rallyFetch<{ cards: ShareCardData[] }>('/share-cards/mine'),

  get: (id: string) => rallyFetch<ShareCardData>(`/share-cards/${id}`),

  createFanResume: () =>
    rallyFetch<ShareCardData>('/share-cards/fan-resume', { method: 'POST' }),

  createMilestoneCard: (milestoneId: string) =>
    rallyFetch<ShareCardData>(`/share-cards/milestone/${milestoneId}`, { method: 'POST' }),

  createHeadToHead: (opponentHandle: string) =>
    rallyFetch<ShareCardData>('/share-cards/head-to-head', { method: 'POST', body: JSON.stringify({ opponentHandle }) }),

  trackShare: (cardId: string) =>
    rallyFetch<{ success: boolean }>(`/share-cards/${cardId}/shared`, { method: 'POST' }),

  myMilestones: () =>
    rallyFetch<{ milestones: FanMilestone[] }>('/share-cards/milestones/mine'),
};
