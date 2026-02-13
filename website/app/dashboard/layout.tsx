"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useRallyAuth } from "@/lib/rally-auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, isAdmin, signOut, trackPage } = useRallyAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Track page visits
  useEffect(() => {
    if (isAuthenticated) {
      trackPage(pathname);
    }
  }, [pathname, isAuthenticated, trackPage]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="rally-loading-screen">
        <div className="rally-spinner-large" />
        <p>Loading Rally...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navItems = [
    { href: "/dashboard", label: "Home", icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    )},
    { href: "/dashboard/gameday", label: "Gameday", icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )},
    { href: "/dashboard/rewards", label: "Rewards", icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    )},
    { href: "/dashboard/profile", label: "Profile", icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )},
  ];

  return (
    <div className="rally-dashboard-layout">
      <aside className="rally-sidebar">
        <div className="rally-sidebar-header">
          <Link href="/" className="rally-sidebar-logo">
            <Image src="/logos/rally-logo-transparent-white.png" alt="Rally" width={110} height={28} />
          </Link>
        </div>

        <nav className="rally-sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rally-sidebar-item ${pathname === item.href ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="rally-sidebar-divider" />
              <Link
                href="/admin"
                className={`rally-sidebar-item rally-sidebar-item--admin ${pathname.startsWith('/admin') ? 'active' : ''}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                <span>Admin</span>
              </Link>
            </>
          )}
        </nav>

        <div className="rally-sidebar-footer">
          <div className="rally-sidebar-user">
            <div className="rally-sidebar-avatar">{user?.name?.substring(0, 2).toUpperCase()}</div>
            <div className="rally-sidebar-user-info">
              <span className="rally-sidebar-user-name">{user?.name}</span>
              <span className="rally-sidebar-user-role">{user?.role}</span>
            </div>
          </div>
          <button className="rally-sidebar-signout" onClick={signOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="rally-dashboard-main">
        {children}
      </main>
    </div>
  );
}
