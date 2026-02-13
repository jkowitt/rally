"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import "./admin.css";

const navItems = [
  { href: "/admin", label: "Analytics", icon: "dashboard" },
  { href: "/admin/events", label: "Events", icon: "events" },
  { href: "/admin/rewards", label: "Rewards", icon: "rewards" },
  { href: "/admin/bonus-offers", label: "Bonus Offers", icon: "bonus" },
  { href: "/admin/notifications", label: "Notifications", icon: "notifications" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/schools", label: "Schools", icon: "schools" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

const icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  schools: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  events: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  rewards: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  bonus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isAdmin, signOut, trackPage } = useRallyAuth();

  useEffect(() => {
    if (isAuthenticated) trackPage(pathname);
  }, [pathname, isAuthenticated, trackPage]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.push("/auth/signin");
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="rally-loading-screen">
        <div className="rally-spinner-large" />
        <p>Loading Admin...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="rally-admin-layout">
      <aside className="rally-admin-sidebar">
        <div className="rally-admin-sidebar-header">
          <Link href="/admin" className="rally-admin-logo">
            <Image src="/logos/rally-logo-transparent-white.png" alt="Rally Admin" width={100} height={24} />
            <span className="rally-admin-badge">Admin</span>
          </Link>
        </div>

        <nav className="rally-admin-nav">
          <Link href="/dashboard" className="rally-admin-nav-item rally-admin-nav-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
          <div className="rally-admin-nav-divider" />
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rally-admin-nav-item ${pathname === item.href ? "active" : ""}`}
            >
              <span className="rally-admin-nav-icon">{icons[item.icon]}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="rally-admin-sidebar-footer">
          <div className="rally-admin-user">
            <span className="rally-admin-avatar">{user?.name?.substring(0, 2).toUpperCase()}</span>
            <div>
              <span className="rally-admin-user-name">{user?.name}</span>
              <span className="rally-admin-user-role">{user?.role}</span>
            </div>
          </div>
          <button className="rally-admin-signout" onClick={signOut}>Sign Out</button>
        </div>
      </aside>

      <main className="rally-admin-main">
        <header className="rally-admin-header">
          <h1>{navItems.find((n) => n.href === pathname)?.label || "Admin"}</h1>
        </header>
        <div className="rally-admin-content">{children}</div>
      </main>
    </div>
  );
}
