"use client";

import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export default function LegacyCRMPage() {
  return (
    <main className="legacy-crm-page">
      <Header />

      {/* Hero Section */}
      <section className="lcrm-hero">
        <div className="lcrm-hero-bg"></div>
        <div className="container lcrm-hero-content">
          <Link href="/legacy-crm" className="lcrm-logo-link" aria-label="Legacy CRM Home">
            <Image
              src="/logos/legacy-crm.svg"
              alt="Legacy CRM"
              width={220}
              height={70}
              priority
              className="lcrm-hero-logo"
            />
          </Link>
          <div className="lcrm-badge">Relationship Discipline Platform</div>
          <h1>Relationships are built.<br/>Not collected.</h1>
          <p className="lcrm-tagline">
            Legacy CRM is a relationship management system for professionals whose success depends
            on follow-up, trust, and long-term connection. Not another contact dump—a discipline system.
          </p>
          <div className="lcrm-hero-actions">
            <Link href="/auth/signin" className="button lcrm-button-primary">
              Get Started Free
            </Link>
            <Link href="/legacy-crm/dashboard" className="button lcrm-button-secondary">
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="lcrm-philosophy">
        <div className="container">
          <div className="lcrm-philosophy-grid">
            <div className="lcrm-philosophy-content">
              <span className="lcrm-section-label">Our Philosophy</span>
              <h2>Depth over breadth.<br/>Consistency over intensity.</h2>
              <p>
                Most CRMs are designed to manage thousands of contacts. Legacy CRM is designed
                to manage the relationships that actually matter—with intention and discipline.
              </p>
              <p>
                Success in business comes from trust. Trust comes from consistency. Legacy CRM
                is the system that ensures you never let an important relationship go cold.
              </p>
            </div>
            <div className="lcrm-philosophy-stats">
              <div className="lcrm-stat-card">
                <span className="lcrm-stat-number">80%</span>
                <span className="lcrm-stat-label">of deals come from existing relationships</span>
              </div>
              <div className="lcrm-stat-card">
                <span className="lcrm-stat-number">5x</span>
                <span className="lcrm-stat-label">cheaper to retain than acquire</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="lcrm-features">
        <div className="container">
          <div className="lcrm-section-header">
            <span className="lcrm-section-label">Core Capabilities</span>
            <h2>Everything you need to manage relationships with intention</h2>
            <p>Six fundamental tools that create accountability, context, and follow-through.</p>
          </div>
          <div className="lcrm-features-grid">
            <div className="lcrm-feature-card">
              <div className="lcrm-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <h3>Relationship Records</h3>
              <p>Complete profiles with notes, history, context, and next actions. Everything you need to stay meaningfully connected.</p>
            </div>
            <div className="lcrm-feature-card">
              <div className="lcrm-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <h3>Follow-Up Discipline</h3>
              <p>Smart reminders that adapt to relationship importance. Never let a valuable connection go cold again.</p>
            </div>
            <div className="lcrm-feature-card">
              <div className="lcrm-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <h3>Opportunity Pipeline</h3>
              <p>Deals, partnerships, and potential collaborations—visible and organized. Know where every opportunity stands.</p>
            </div>
            <div className="lcrm-feature-card">
              <div className="lcrm-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <h3>Pipeline Visualization</h3>
              <p>See what's active, warm, cold, or stalled at a glance. Kanban and list views that match how you think.</p>
            </div>
            <div className="lcrm-feature-card">
              <div className="lcrm-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h3>Context Preservation</h3>
              <p>Capture the why behind every interaction. Notes, meeting summaries, and commitments—never lose context.</p>
            </div>
            <div className="lcrm-feature-card">
              <div className="lcrm-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
              </div>
              <h3>Activity Tracking</h3>
              <p>Measure your relationship-building effort, not just outcomes. Reflect consistency, not just wins.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section id="audience" className="lcrm-audience">
        <div className="container">
          <div className="lcrm-section-header">
            <span className="lcrm-section-label">Who It's For</span>
            <h2>Built for professionals who win through relationships</h2>
          </div>
          <div className="lcrm-audience-grid">
            <div className="lcrm-audience-card">
              <div className="lcrm-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
              <h4>Sales Professionals</h4>
              <p>Manage your pipeline with discipline. Follow up at the right time, every time. Build trust that converts.</p>
            </div>
            <div className="lcrm-audience-card">
              <div className="lcrm-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <h4>Partnership Leaders</h4>
              <p>Track sponsors, collaborators, and strategic relationships. Never drop the ball on a key partnership.</p>
            </div>
            <div className="lcrm-audience-card">
              <div className="lcrm-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                </svg>
              </div>
              <h4>Consultants & Advisors</h4>
              <p>Maintain client relationships across engagements. Track project opportunities and referral potential.</p>
            </div>
            <div className="lcrm-audience-card">
              <div className="lcrm-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 2,7 12,12 22,7"/>
                  <polyline points="2,17 12,22 22,17"/>
                  <polyline points="2,12 12,17 22,12"/>
                </svg>
              </div>
              <h4>Founders & Executives</h4>
              <p>Manage investor relations, board contacts, and strategic connections with structure and intention.</p>
            </div>
            <div className="lcrm-audience-card">
              <div className="lcrm-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <h4>Relationship Builders</h4>
              <p>For anyone whose career depends on their network—community builders, fundraisers, and connectors.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="lcrm-problems">
        <div className="container">
          <div className="lcrm-section-header">
            <span className="lcrm-section-label">Problems We Solve</span>
            <h2>From reactive to proactive relationships</h2>
          </div>
          <div className="lcrm-problems-grid">
            <div className="lcrm-problem-card">
              <div className="lcrm-problem-header">
                <span className="lcrm-problem-icon">!</span>
                <h4>Forgotten Follow-Ups</h4>
              </div>
              <p className="lcrm-problem-desc">Relationships fade because you lost track of when to reach out. Opportunities slip away silently.</p>
              <div className="lcrm-solution">
                <span className="lcrm-solution-arrow">→</span>
                <span>Smart reminders based on relationship importance and last contact</span>
              </div>
            </div>
            <div className="lcrm-problem-card">
              <div className="lcrm-problem-header">
                <span className="lcrm-problem-icon">!</span>
                <h4>Lost Context</h4>
              </div>
              <p className="lcrm-problem-desc">You can't remember what you discussed or promised. Every conversation starts from scratch.</p>
              <div className="lcrm-solution">
                <span className="lcrm-solution-arrow">→</span>
                <span>Complete interaction history with notes and commitments</span>
              </div>
            </div>
            <div className="lcrm-problem-card">
              <div className="lcrm-problem-header">
                <span className="lcrm-problem-icon">!</span>
                <h4>Scattered Information</h4>
              </div>
              <p className="lcrm-problem-desc">Contact info in your phone, notes in documents, deals in your head. Nothing is centralized.</p>
              <div className="lcrm-solution">
                <span className="lcrm-solution-arrow">→</span>
                <span>Single source of truth for all relationship data</span>
              </div>
            </div>
            <div className="lcrm-problem-card">
              <div className="lcrm-problem-header">
                <span className="lcrm-problem-icon">!</span>
                <h4>Reactive Outreach</h4>
              </div>
              <p className="lcrm-problem-desc">You only reach out when you need something. Relationships feel transactional, not genuine.</p>
              <div className="lcrm-solution">
                <span className="lcrm-solution-arrow">→</span>
                <span>Proactive touchpoint system for consistent relationship nurturing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="lcrm-integration">
        <div className="container">
          <div className="lcrm-integration-content">
            <span className="lcrm-section-label">Ecosystem Integration</span>
            <h2>Works with the tools you already use</h2>
            <p>Legacy CRM connects with your existing workflow—email, calendar, and the Loud Legacy ecosystem.</p>
            <div className="lcrm-integration-features">
              <div className="lcrm-integration-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>Email Integration</span>
              </div>
              <div className="lcrm-integration-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Calendar Sync</span>
              </div>
              <div className="lcrm-integration-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <span>Business Now Sync</span>
              </div>
              <div className="lcrm-integration-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <span>API Access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section id="get-started" className="lcrm-waitlist">
        <div className="container">
          <div className="lcrm-waitlist-content">
            <div className="lcrm-waitlist-info">
              <span className="lcrm-section-label">Start Building Relationships</span>
              <h2>Get started today</h2>
              <p>
                Legacy CRM is ready to help you manage relationships with intention.
                Start free and upgrade as your network grows.
              </p>
              <div className="lcrm-waitlist-benefits">
                <div className="lcrm-benefit-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  <span>Free tier with up to 100 contacts</span>
                </div>
                <div className="lcrm-benefit-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  <span>Full access to all core features</span>
                </div>
                <div className="lcrm-benefit-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  <span>No credit card required</span>
                </div>
                <div className="lcrm-benefit-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  <span>Part of the Loud Legacy ecosystem</span>
                </div>
              </div>
            </div>

            <div className="lcrm-waitlist-form-container">
              <div className="lcrm-get-started-card">
                <h3>Ready to transform your relationships?</h3>
                <p>Sign in with your Loud Legacy account to access Legacy CRM and all our business tools.</p>
                <div className="lcrm-get-started-actions">
                  <Link href="/auth/signin" className="button lcrm-button-primary lcrm-button-full">
                    Sign In to Get Started
                  </Link>
                  <Link href="/auth/signup" className="button lcrm-button-secondary lcrm-button-full">
                    Create Free Account
                  </Link>
                </div>
                <p className="lcrm-form-note">
                  Already have a Loud Legacy account? Your Legacy CRM is waiting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="lcrm-demo-cta-section">
        <div className="container">
          <div className="lcrm-demo-cta-box">
            <div className="lcrm-demo-cta-content">
              <h3>One platform. All your business tools.</h3>
              <p>Legacy CRM works seamlessly with Legacy RE, Business Now, Sportify, and Loud Works.</p>
            </div>
            <Link href="/dashboard" className="button lcrm-button-secondary lcrm-button-large">
              View All Platforms
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
