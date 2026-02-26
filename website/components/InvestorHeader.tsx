"use client";

import { useState, useEffect } from "react";

export function InvestorHeader() {
  const [scrolled, setScrolled] = useState(false);

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
        <div className="logo investor-logo" aria-label="Loud Legacy Ventures Home">
          <span className="investor-logo-text">LOUD LEGACY</span>
          <span className="investor-logo-sub">VENTURES</span>
        </div>

        <nav className="nav">
          <span className="nav-link">Ecosystem</span>
          <span className="nav-link">Investment</span>
          <span className="nav-link">Rally App</span>
          <span className="nav-link">Contact</span>
        </nav>
      </div>
    </header>
  );
}
