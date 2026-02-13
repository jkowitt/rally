"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import {
  DemoUser,
  DemoSession,
  demoSignIn,
  demoSignOut as demoClearSession,
  getDemoSession,
} from "@/lib/demo-auth";

interface AuthContextType {
  user: DemoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isDemo: false,
  signIn: async () => ({ success: false }),
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: nextAuthSession, status } = useSession();
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for demo session on mount
  useEffect(() => {
    const session = getDemoSession();
    if (session) {
      setDemoSession(session);
    }
    setIsLoading(false);
  }, []);

  // Determine active user - prefer NextAuth, fall back to demo
  const nextAuthUser = nextAuthSession?.user
    ? {
        id: (nextAuthSession.user as any).id || "nextauth-user",
        email: nextAuthSession.user.email || "",
        name: nextAuthSession.user.name || "User",
        role: ((nextAuthSession.user as any).role || "USER") as DemoUser["role"],
        avatar: (nextAuthSession.user.name || "U").substring(0, 2).toUpperCase(),
        platforms: ["LEGACY_RE"],
        createdAt: new Date().toISOString(),
      }
    : null;

  const user = nextAuthUser || demoSession?.user || null;
  const isAuthenticated = !!user;
  const isDemo = !nextAuthUser && !!demoSession;

  const signIn = useCallback(async (email: string, password: string) => {
    const session = demoSignIn(email, password);
    if (session) {
      setDemoSession(session);
      return { success: true };
    }
    return { success: false, error: "Invalid email or password" };
  }, []);

  const signOut = useCallback(() => {
    if (isDemo) {
      demoClearSession();
      setDemoSession(null);
    } else {
      nextAuthSignOut({ callbackUrl: "/" });
    }
  }, [isDemo]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading: isLoading && status === "loading",
        isDemo,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
