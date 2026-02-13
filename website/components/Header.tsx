"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useRallyAuth } from "@/lib/rally-auth";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, signOut } = useRallyAuth();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  return (
    <header className={`header rally-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container header-content">
        <Link href="/" className="logo" aria-label="Rally Home">
          <Image
            src="/logos/rally-logo-transparent-white.png"
            alt="Rally"
            width={140}
            height={36}
            className="logo-image"
            priority
          />
        </Link>

        <nav className={`nav ${isOpen ? 'open' : ''}`}>
          {!isDashboard && (
            <>
              <Link href="/#features" className="nav-link">Features</Link>
              <Link href="/#schools" className="nav-link">Schools</Link>
              <Link href="/#how-it-works" className="nav-link">How It Works</Link>
            </>
          )}
          {isDashboard && (
            <>
              <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>Home</Link>
              <Link href="/dashboard/gameday" className={`nav-link ${pathname === '/dashboard/gameday' ? 'active' : ''}`}>Gameday</Link>
              <Link href="/dashboard/rewards" className={`nav-link ${pathname === '/dashboard/rewards' ? 'active' : ''}`}>Rewards</Link>
              <Link href="/dashboard/profile" className={`nav-link ${pathname === '/dashboard/profile' ? 'active' : ''}`}>Profile</Link>
              {isAdmin && (
                <Link href="/admin" className={`nav-link nav-link--admin ${pathname.startsWith('/admin') ? 'active' : ''}`}>Admin</Link>
              )}
            </>
          )}
        </nav>

        <div className="header-actions">
          {isAuthenticated && user ? (
            <div className="header-user-menu" ref={menuRef}>
              <button
                className="header-user-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <span className="header-user-avatar">{user.name.substring(0, 2).toUpperCase()}</span>
                <span className="header-user-name">{user.name}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className={`header-chevron ${userMenuOpen ? "open" : ""}`}>
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
              {userMenuOpen && (
                <div className="header-user-dropdown">
                  <div className="header-dropdown-info">
                    <span className="header-dropdown-name">{user.name}</span>
                    <span className="header-dropdown-email">{user.email}</span>
                    <span className="header-dropdown-role">{user.role}</span>
                  </div>
                  <div className="header-dropdown-divider" />
                  <Link href="/dashboard" className="header-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Dashboard
                  </Link>
                  <Link href="/dashboard/profile" className="header-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="header-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                      </svg>
                      Admin Panel
                    </Link>
                  )}
                  <div className="header-dropdown-divider" />
                  <button className="header-dropdown-item header-dropdown-signout" onClick={() => { signOut(); setUserMenuOpen(false); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                      <polyline points="16,17 21,12 16,7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/signin" className="nav-link">Sign In</Link>
              <Link href="/auth/signup" className="rally-btn rally-btn--primary rally-btn--small">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="menu-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${isOpen ? 'open' : ''}`}></span>
        </button>
      </div>
    </header>
  );
}
