"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-stone-100"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-charcoal uppercase">
              Loud Legacy
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/about"
              className="text-sm font-medium text-warm-gray hover:text-charcoal transition-colors"
            >
              About
            </Link>
            <Link
              href="/the-collective"
              className="text-sm font-medium text-warm-gray hover:text-charcoal transition-colors"
            >
              The Collective
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-warm-gray hover:text-charcoal transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/the-collective"
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-charcoal rounded-sm hover:bg-charcoal-light transition-colors"
            >
              Explore The Collective
            </Link>
          </nav>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-px bg-charcoal transition-all duration-300 ${
                mobileOpen ? "rotate-45 translate-y-[3.5px]" : ""
              }`}
            />
            <span
              className={`block w-5 h-px bg-charcoal transition-all duration-300 ${
                mobileOpen ? "-rotate-45 -translate-y-[3.5px]" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-stone-100"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
              <Link
                href="/about"
                onClick={() => setMobileOpen(false)}
                className="text-base font-medium text-charcoal"
              >
                About
              </Link>
              <Link
                href="/the-collective"
                onClick={() => setMobileOpen(false)}
                className="text-base font-medium text-charcoal"
              >
                The Collective
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="text-base font-medium text-charcoal"
              >
                Contact
              </Link>
              <Link
                href="/the-collective"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-charcoal rounded-sm"
              >
                Explore The Collective
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
