"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { rallyAuth, rallyAnalytics, type RallyUser } from "./rally-api";

interface RallyAuthContextType {
  user: RallyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (params: {
    email: string;
    password: string;
    name: string;
    handle: string;
    favoriteSchool?: string | null;
    supportingSchools?: string[];
    acceptedTerms?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (fields: Partial<Pick<RallyUser, 'name' | 'handle' | 'favoriteSchool' | 'supportingSchools' | 'emailUpdates' | 'pushNotifications'>>) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  trackPage: (page: string) => void;
  trackEvent: (event: string, metadata?: Record<string, string>) => void;
}

const RallyAuthContext = createContext<RallyAuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
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
  }) => {
    const res = await rallyAuth.register(params);
    if (res.ok && res.data) {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to create account" };
  }, []);

  const updateProfile = useCallback(async (fields: Partial<Pick<RallyUser, 'name' | 'handle' | 'favoriteSchool' | 'supportingSchools' | 'emailUpdates' | 'pushNotifications'>>) => {
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
  }, []);

  const trackPage = useCallback((page: string) => {
    rallyAnalytics.trackPageVisit(page).catch(() => {});
  }, []);

  const trackEvent = useCallback((event: string, metadata?: Record<string, string>) => {
    rallyAnalytics.trackEvent(event, metadata).catch(() => {});
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  return (
    <RallyAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAdmin,
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
