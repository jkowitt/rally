/**
 * Demo Authentication System
 *
 * Provides a complete auth flow using localStorage when no database is available.
 * Falls through to NextAuth when a real DB is connected.
 *
 * Demo Account:
 *   Email: demo@legacyre.com
 *   Password: demo123
 *   Role: SUPER_ADMIN (full access to all platforms + inline editing)
 */

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  avatar: string;
  platforms: string[];
  createdAt: string;
}

export interface DemoSession {
  user: DemoUser;
  expires: string;
  isDemo: true;
}

const DEMO_USER: DemoUser = {
  id: "demo-user-001",
  email: "demo@legacyre.com",
  name: "Demo Admin",
  role: "SUPER_ADMIN",
  avatar: "DA",
  platforms: ["LEGACY_RE", "SPORTIFY", "BUSINESS_NOW", "LEGACY_CRM", "LOUD_WORKS"],
  createdAt: new Date().toISOString(),
};

const DEMO_CREDENTIALS = {
  email: "demo@legacyre.com",
  password: "demo123",
};

const SESSION_KEY = "loud-legacy-session";

export function demoSignIn(email: string, password: string): DemoSession | null {
  if (
    email.toLowerCase() === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password
  ) {
    const session: DemoSession = {
      user: DEMO_USER,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isDemo: true,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    return session;
  }
  return null;
}

export function demoSignOut(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session: DemoSession = JSON.parse(stored);
    if (new Date(session.expires) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isDemoAuthenticated(): boolean {
  return getDemoSession() !== null;
}

export function getDemoUser(): DemoUser | null {
  const session = getDemoSession();
  return session?.user ?? null;
}
