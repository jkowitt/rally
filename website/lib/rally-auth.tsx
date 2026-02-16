"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { rallyAuth, rallyAnalytics, type RallyUser } from "./rally-api";

type ViewAsRole = 'developer' | 'admin' | 'user';

interface RallyAuthContextType {
  user: RallyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isDeveloper: boolean;
  viewAs: ViewAsRole;
  setViewAs: (role: ViewAsRole) => void;
  effectiveRole: string;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (params: {
    email: string;
    password: string;
    name: string;
    handle: string;
    favoriteSchool?: string | null;
    supportingSchools?: string[];
    acceptedTerms?: boolean;
    userType?: string;
    birthYear?: number;
    residingCity?: string;
    residingState?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (fields: Partial<Pick<RallyUser, 'name' | 'handle' | 'favoriteSchool' | 'supportingSchools' | 'emailUpdates' | 'pushNotifications' | 'userType' | 'birthYear' | 'residingCity' | 'residingState'>>) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  trackPage: (page: string) => void;
  trackEvent: (event: string, metadata?: Record<string, string>) => void;
}

const RallyAuthContext = createContext<RallyAuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  isDeveloper: false,
  viewAs: 'developer',
  setViewAs: () => {},
  effectiveRole: 'user',
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  updateProfile: async () => ({ success: false }),
  signOut: () => {},
  trackPage: () => {},
  trackEvent: () => {},
});

export function useRallyAuth() {
  return useContext(RallyAuthContext);
}

const TOKEN_KEY = "rally-token";

export function RallyAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RallyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewAs, setViewAsState] = useState<ViewAsRole>('developer');

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      rallyAuth.me().then((res) => {
        if (res.ok && res.data?.user) {
          setUser(res.data.user);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await rallyAuth.login(email, password);
    if (res.ok && res.data) {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || "Invalid email or password" };
  }, []);

  const signUp = useCallback(async (params: {
    email: string;
    password: string;
    name: string;
    handle: string;
    favoriteSchool?: string | null;
    supportingSchools?: string[];
    acceptedTerms?: boolean;
    userType?: string;
    birthYear?: number;
    residingCity?: string;
    residingState?: string;
  }) => {
    const res = await rallyAuth.register(params);
    if (res.ok && res.data) {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to create account" };
  }, []);

  const updateProfile = useCallback(async (fields: Partial<Pick<RallyUser, 'name' | 'handle' | 'favoriteSchool' | 'supportingSchools' | 'emailUpdates' | 'pushNotifications' | 'userType' | 'birthYear' | 'residingCity' | 'residingState'>>) => {
    const res = await rallyAuth.updateProfile(fields);
    if (res.ok && res.data) {
      setUser(res.data as RallyUser);
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to update profile" };
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setViewAsState('developer');
  }, []);

  const trackPage = useCallback((page: string) => {
    rallyAnalytics.trackPageVisit(page).catch(() => {});
  }, []);

  const trackEvent = useCallback((event: string, metadata?: Record<string, string>) => {
    rallyAnalytics.trackEvent(event, metadata).catch(() => {});
  }, []);

  const actualRole = user?.role || 'user';
  const isDeveloper = actualRole === 'developer';

  // Only developer can switch views — others always see their own role
  const setViewAs = useCallback((role: ViewAsRole) => {
    if (isDeveloper) {
      setViewAsState(role);
    }
  }, [isDeveloper]);

  // The effective role used for UI gating (view switching only affects developer)
  const effectiveRole = isDeveloper ? viewAs : actualRole;

  const isAuthenticated = !!user;
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'developer' || effectiveRole === 'teammate';

  return (
    <RallyAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAdmin,
        isDeveloper,
        viewAs: isDeveloper ? viewAs : (actualRole as ViewAsRole),
        setViewAs,
        effectiveRole,
        signIn,
        signUp,
        updateProfile,
        signOut,
        trackPage,
        trackEvent,
      }}
    >
      {children}
    </RallyAuthContext.Provider>
  );
}
