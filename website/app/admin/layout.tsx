"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import "./admin.css";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  permission?: string;
  adminOnly?: boolean;
  developerOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/admin", label: "Analytics", icon: "dashboard", permission: "analytics" },
    ],
  },
  {
    label: "Fan Engagement",
    items: [
      { href: "/admin/events", label: "Events", icon: "events", permission: "events" },
      { href: "/admin/rewards", label: "Rewards", icon: "rewards", permission: "rewards" },
      { href: "/admin/bonus-offers", label: "Bonus Offers", icon: "bonus", permission: "bonusOffers" },
      { href: "/admin/notifications", label: "Notifications", icon: "notifications", permission: "notifications" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: "pages", permission: "content" },
      { href: "/admin/media", label: "Media", icon: "media", permission: "content" },
      { href: "/admin/banners", label: "Banners", icon: "banners", permission: "content" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/demographics", label: "Demographics", icon: "demographics", permission: "analytics" },
      { href: "/admin/users", label: "Users", icon: "users", developerOnly: true },
      { href: "/admin/teammates", label: "Teammates", icon: "teammates", adminOnly: true },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/schools", label: "Schools", icon: "schools", adminOnly: true },
      { href: "/admin/settings", label: "Settings", icon: "settings", adminOnly: true },
      { href: "/admin/developer", label: "Developer", icon: "developer", developerOnly: true },
    ],
  },
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
  demographics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
    </svg>
  ),
  teammates: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  pages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  ),
  media: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21,15 16,10 5,21" />
    </svg>
  ),
  banners: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  developer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16,18 22,12 16,6" />
      <polyline points="8,6 2,12 8,18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </svg>
  ),
};

const viewAsOptions = [
  { value: 'developer' as const, label: 'Developer', color: '#A78BFA' },
  { value: 'admin' as const, label: 'Admin', color: '#2D9CDB' },
  { value: 'user' as const, label: 'User', color: '#8B95A5' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isAdmin, isDeveloper, viewAs, setViewAs, effectiveRole, signOut, trackPage } = useRallyAuth();

  useEffect(() => {
    if (isAuthenticated) trackPage(pathname);
  }, [pathname, isAuthenticated, trackPage]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (!isAdmin && !isDeveloper))) {
      router.push("/auth/signin");
    }
  }, [isLoading, isAuthenticated, isAdmin, isDeveloper, router]);

  // Filter a single nav item based on effective role
  const isItemVisible = (item: NavItem) => {
    if (!user) return false;
    if (effectiveRole === 'developer') return true;
    if (item.developerOnly) return false;
    if (item.adminOnly) return effectiveRole === 'admin';
    if (effectiveRole === 'user') return false;
    if (effectiveRole === 'teammate' && item.permission) {
      const perms = (user as { teammatePermissions?: Record<string, boolean> }).teammatePermissions || {};
      return !!perms[item.permission];
    }
    return true;
  };

  // Filter groups — only show groups that have visible items
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(isItemVisible),
    }))
    .filter((group) => group.items.length > 0);

  // Flat list for header title lookup
  const allItems = navGroups.flatMap((g) => g.items);

  if (isLoading) {
    return (
      <div className="rally-loading-screen">
        <div className="rally-spinner-large" />
        <p>Loading Admin...</p>
      </div>
    );
  }

  if (!isAuthenticated || (!isAdmin && !isDeveloper)) return null;

  return (
    <div className="rally-admin-layout">
      <aside className="rally-admin-sidebar">
        <div className="rally-admin-sidebar-header">
          <Link href="/admin" className="rally-admin-logo">
            <Image src="/logos/rally-logo-transparent-white.png" alt="Rally Admin" width={100} height={24} />
            <span className="rally-admin-badge">Admin</span>
          </Link>
        </div>

        {/* View Switcher — prominent at top, developer only */}
        {isDeveloper && (
          <div className="rally-view-switcher rally-view-switcher--top">
            <span className="rally-view-switcher-label">View as</span>
            <div className="rally-view-switcher-buttons">
              {viewAsOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`rally-view-btn ${viewAs === opt.value ? 'active' : ''}`}
                  style={{ '--view-color': opt.color } as React.CSSProperties}
                  onClick={() => setViewAs(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="rally-admin-nav">
          <Link href="/dashboard" className="rally-admin-nav-item rally-admin-nav-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>

          {visibleGroups.map((group, gi) => (
            <div key={gi}>
              {group.label ? (
                <div className="rally-admin-nav-group-label">{group.label}</div>
              ) : (
                <div className="rally-admin-nav-divider" />
              )}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rally-admin-nav-item ${pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href)) ? "active" : ""}`}
                >
                  <span className="rally-admin-nav-icon">{icons[item.icon]}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}

          {/* User view message */}
          {effectiveRole === 'user' && (
            <>
              <div className="rally-admin-nav-divider" />
              <div className="rally-view-message">
                No admin access in User view. Switch back to Admin or Developer to see navigation.
              </div>
            </>
          )}
        </nav>

        <div className="rally-admin-sidebar-footer">
          <div className="rally-admin-user">
            <span className="rally-admin-avatar">{user?.name?.substring(0, 2).toUpperCase()}</span>
            <div>
              <span className="rally-admin-user-name">{user?.name}</span>
              <span className="rally-admin-user-role">
                {user?.role}
                {isDeveloper && viewAs !== 'developer' && (
                  <span className="rally-view-indicator"> (viewing as {viewAs})</span>
                )}
              </span>
            </div>
          </div>
          <button className="rally-admin-signout" onClick={signOut}>Sign Out</button>
        </div>
      </aside>

      <main className="rally-admin-main">
        <header className="rally-admin-header">
          <h1>{allItems.find((n) => n.href === pathname)?.label || "Admin"}</h1>
          {isDeveloper && viewAs !== 'developer' && (
            <span className="rally-view-banner">
              Previewing as {viewAs}
              <button className="rally-view-banner-reset" onClick={() => setViewAs('developer')}>
                Reset
              </button>
            </span>
          )}
        </header>
        <div className="rally-admin-content">{children}</div>
      </main>
    </div>
  );
}
