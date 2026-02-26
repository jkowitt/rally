"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export function InvestorHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`header investor-header ${scrolled ? "scrolled" : ""}`}>
      <div className="container header-content">
        <Link href="/" className="logo investor-logo" aria-label="Loud Legacy Ventures Home">
          <span className="investor-logo-text">LOUD LEGACY</span>
          <span className="investor-logo-sub">VENTURES</span>
        </Link>

        <nav className={`nav ${isOpen ? "open" : ""}`}>
          <Link href="#ecosystem" className="nav-link" onClick={() => setIsOpen(false)}>Ecosystem</Link>
          <Link href="#investment" className="nav-link" onClick={() => setIsOpen(false)}>Investment</Link>
          <Link href="/rally" className="nav-link" onClick={() => setIsOpen(false)}>Rally App</Link>
          <Link href="/contact" className="nav-link" onClick={() => setIsOpen(false)}>Contact</Link>
        </nav>

        <div className="header-actions">
          <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--small">
            Request Deck
          </Link>
        </div>

        <button
          className="menu-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${isOpen ? "open" : ""}`}></span>
        </button>
      </div>
    </header>
  );
}
