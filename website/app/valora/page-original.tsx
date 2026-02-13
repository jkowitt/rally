import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "VALORA - AI-Powered Real Estate Intelligence Platform | Loud Legacy",
  description: "Complete real estate valuation and underwriting platform with AI image recognition, sophisticated financial modeling, and portfolio management. Built for brokers, investors, lenders, and property owners.",
};

export default function ValoraPage() {
  return (
    <main className="product-page">
      <Header />

      <section className="product-hero" style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)" }}>
        <div className="container">
          <div className="badge">Enterprise Intelligence</div>
          <h1>VALORA</h1>
          <p className="tagline">
            AI-powered real estate intelligence platform combining computer vision,
            sophisticated underwriting, and portfolio management in one comprehensive system.
          </p>
          <div className="hero-actions">
            <Link href="#signup" className="button button--primary" style={{ background: 'white', color: '#1E40AF' }}>
              Start Free Trial
            </Link>
            <Link href="#features" className="button button--secondary" style={{ borderColor: 'white', color: 'white' }}>
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* Property Types Supported */}
      <section className="product-section" style={{ background: 'var(--bg-secondary)', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Supporting All Property Types
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>🏢 Commercial</span>
              <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>🏠 Residential</span>
              <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>🏘️ Multifamily</span>
              <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>🏭 Industrial</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI-Powered Features */}
      <section id="features" className="product-section">
        <div className="container">
          <h2>AI-Powered Property Intelligence</h2>
          <p className="section-intro">
            Advanced computer vision and machine learning to accelerate valuations and identify property insights.
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <h3>📸 AI Image Recognition</h3>
              <p>Upload property photos and let AI automatically identify wear and tear, structural issues, and condition ratings for interior and exterior elements.</p>
            </div>
            <div className="feature-card">
              <h3>📍 Smart Geocoding</h3>
              <p>Take a photo with your phone and VALORA automatically identifies the property location, pulls property records, and initiates valuation workflow.</p>
            </div>
            <div className="feature-card">
              <h3>🎯 Address Input & Validation</h3>
              <p>Enter any property address and instantly access property data, tax records, ownership history, and comparable sales in the area.</p>
            </div>
            <div className="feature-card">
              <h3>💡 AI Property Recommendations</h3>
              <p>Get intelligent suggestions on how to improve property value, reduce expenses, and optimize operations based on property type and market conditions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Underwriting Engine */}
      <section className="product-section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <h2>Sophisticated Underwriting Engine</h2>
          <p className="section-intro">
            Build comprehensive financial models with full customization and real-time scenario analysis.
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <h3>📊 Customizable P&L Models</h3>
              <p>Add, remove, or toggle any line item in your profit and loss statements. Create templates for different property types or customize for each unique deal.</p>
            </div>
            <div className="feature-card">
              <h3>💰 Dynamic Financial Modeling</h3>
              <p>Model rent growth, expense escalation, refinancing scenarios, and exit strategies with instant updates to returns and cash flows.</p>
            </div>
            <div className="feature-card">
              <h3>🔬 Scenario Analysis</h3>
              <p>Create multiple scenarios (base case, best case, worst case) and compare side-by-side to understand risk profiles.</p>
            </div>
            <div className="feature-card">
              <h3>📈 Sensitivity Testing</h3>
              <p>Identify which variables have the greatest impact on deal performance with automated sensitivity analysis.</p>
            </div>
            <div className="feature-card">
              <h3>🏦 Financing Options</h3>
              <p>Model multiple financing structures, compare lender terms, and optimize debt/equity splits for maximum returns.</p>
            </div>
            <div className="feature-card">
              <h3>📉 Cap Rate Analysis</h3>
              <p>Compare cap rates across markets, property types, and time periods with integrated market intelligence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Market Intelligence */}
      <section className="product-section">
        <div className="container">
          <h2>Market Intelligence & Comps</h2>
          <p className="section-intro">
            Access real-time market data and comparable sales to ground your valuations in reality.
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <h3>🏘️ On-Market Valuations</h3>
              <p>View properties currently for sale with asking prices, days on market, and seller information to identify opportunities.</p>
            </div>
            <div className="feature-card">
              <h3>📋 Comparable Sales Database</h3>
              <p>Search recent sales by property type, location, size, and sale date to support your valuation assumptions.</p>
            </div>
            <div className="feature-card">
              <h3>🗺️ Market Reports</h3>
              <p>Automated market reports showing trends in cap rates, rent growth, vacancy rates, and absorption by submarket.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio & Database Management */}
      <section className="product-section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <h2>Portfolio & Valuation Management</h2>
          <p className="section-intro">
            Organize, track, and analyze all your property valuations in one centralized system.
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <h3>📚 Valuation History Database</h3>
              <p>Every valuation you create is automatically saved with full version history, assumptions, and supporting documentation.</p>
            </div>
            <div className="feature-card">
              <h3>🔒 Private Valuations</h3>
              <p>Save valuations as drafts or private entries that are only visible to you and your team—never made public until you're ready.</p>
            </div>
            <div className="feature-card">
              <h3>📊 Portfolio Dashboard</h3>
              <p>Roll up all your valuations into a portfolio view showing total value, IRR, cash-on-cash returns, and concentration risk.</p>
            </div>
            <div className="feature-card">
              <h3>🔍 Search & Filter</h3>
              <p>Quickly find past valuations by property address, date, property type, deal status, or custom tags.</p>
            </div>
            <div className="feature-card">
              <h3>📤 Export & Sharing</h3>
              <p>Export valuations to PDF, Excel, or share secure links with partners, lenders, or investors with customizable permissions.</p>
            </div>
            <div className="feature-card">
              <h3>⏱️ Time-Series Analysis</h3>
              <p>Track how property values change over time with automated revaluation reminders and market update notifications.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team & Admin Management */}
      <section className="product-section">
        <div className="container">
          <h2>Team Collaboration & Admin Controls</h2>
          <p className="section-intro">
            Built for teams with enterprise-grade security, permissions, and workflow management.
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <h3>👥 Team Management</h3>
              <p>Invite team members, assign roles (Admin, Analyst, Viewer), and control access to valuations and portfolios.</p>
            </div>
            <div className="feature-card">
              <h3>🔐 Account Signup & SSO</h3>
              <p>Secure account creation with email verification, two-factor authentication, and single sign-on (SSO) integration for enterprises.</p>
            </div>
            <div className="feature-card">
              <h3>⚙️ Admin Dashboard</h3>
              <p>Manage team members, monitor activity, set permissions, and configure organizational settings from one central dashboard.</p>
            </div>
            <div className="feature-card">
              <h3>📋 Workflow Approval</h3>
              <p>Set up approval workflows so junior analysts can create valuations that require senior review before sharing externally.</p>
            </div>
            <div className="feature-card">
              <h3>📊 Activity Logs</h3>
              <p>Full audit trail of who created, edited, or viewed each valuation with timestamps for compliance and accountability.</p>
            </div>
            <div className="feature-card">
              <h3>💼 Multi-Organization Support</h3>
              <p>Switch between multiple organizations or client accounts without logging out—perfect for brokers and consultants.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Developer & Content Management */}
      <section className="product-section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <h2>Developer Backend Access</h2>
          <p className="section-intro">
            Full backend control for platform owners without needing to redeploy code.
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <h3>✏️ Content Management System</h3>
              <p>Edit all text, headlines, descriptions, and marketing copy directly in the admin panel without touching code.</p>
            </div>
            <div className="feature-card">
              <h3>🖼️ Image Management</h3>
              <p>Upload, replace, and organize images, logos, and visual assets through an intuitive media library.</p>
            </div>
            <div className="feature-card">
              <h3>🗄️ Database Access</h3>
              <p>Direct database access for the platform owner with SQL query tools, data export, and backup management.</p>
            </div>
            <div className="feature-card">
              <h3>🔧 Configuration Panel</h3>
              <p>Adjust system settings, feature flags, pricing tiers, and integrations without redeploying the application.</p>
            </div>
            <div className="feature-card">
              <h3>📧 Email Template Editor</h3>
              <p>Customize all automated emails (welcome, notifications, reports) with a visual email editor.</p>
            </div>
            <div className="feature-card">
              <h3>📊 Analytics Dashboard</h3>
              <p>Monitor platform usage, user growth, feature adoption, and system performance from the owner dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* User Types */}
      <section id="audience" className="product-section">
        <div className="container">
          <h2>Built For Real Estate Professionals</h2>
          <p className="section-intro">
            VALORA serves the entire real estate ecosystem with tools tailored to each role.
          </p>
          <div className="features-grid">
            <div className="feature-card" style={{ borderTop: '4px solid #3B82F6' }}>
              <h3>🏢 Brokers & Agents</h3>
              <p>Provide clients with professional valuations, market comps, and investment analysis to win listings and close deals faster.</p>
              <ul style={{ textAlign: 'left', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <li>Generate branded valuation reports</li>
                <li>Access on-market comparables instantly</li>
                <li>Track all client properties in one place</li>
              </ul>
            </div>
            <div className="feature-card" style={{ borderTop: '4px solid #10B981' }}>
              <h3>💼 Property Owners</h3>
              <p>Understand the true value of your properties, track performance over time, and get recommendations to increase value.</p>
              <ul style={{ textAlign: 'left', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <li>AI-powered property improvement suggestions</li>
                <li>Track value changes over time</li>
                <li>Portfolio-level performance metrics</li>
              </ul>
            </div>
            <div className="feature-card" style={{ borderTop: '4px solid #F59E0B' }}>
              <h3>📈 Investors</h3>
              <p>Make confident acquisition decisions with transparent underwriting, scenario modeling, and risk analysis.</p>
              <ul style={{ textAlign: 'left', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <li>Model multiple acquisition scenarios</li>
                <li>Stress test assumptions</li>
                <li>Portfolio-level risk analysis</li>
              </ul>
            </div>
            <div className="feature-card" style={{ borderTop: '4px solid #8B5CF6' }}>
              <h3>🏦 Lenders & Institutions</h3>
              <p>Standardize underwriting, ensure consistency across deals, and maintain full audit trails for compliance.</p>
              <ul style={{ textAlign: 'left', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <li>Standardized underwriting templates</li>
                <li>Full audit trails and compliance logs</li>
                <li>Team collaboration with approval workflows</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Benefits */}
      <section className="product-section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <h2>Why Choose VALORA</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>⚡ Save Time</h3>
              <p>AI-powered automation reduces valuation time from hours to minutes while maintaining accuracy.</p>
            </div>
            <div className="feature-card">
              <h3>🎯 Increase Accuracy</h3>
              <p>Eliminate spreadsheet errors with validated models, integrated data, and automated calculations.</p>
            </div>
            <div className="feature-card">
              <h3>🤝 Win More Deals</h3>
              <p>Professional valuations and fast turnaround times help brokers and investors move quickly on opportunities.</p>
            </div>
            <div className="feature-card">
              <h3>📊 Data-Driven Decisions</h3>
              <p>Access to market comps, AI insights, and scenario analysis ensures every decision is backed by data.</p>
            </div>
            <div className="feature-card">
              <h3>🔒 Enterprise Security</h3>
              <p>Bank-level encryption, SOC 2 compliance, and role-based access control protect your sensitive data.</p>
            </div>
            <div className="feature-card">
              <h3>📈 Scale Operations</h3>
              <p>From individual agents to large institutions, VALORA scales with your business without sacrificing performance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="signup" className="product-section" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)', color: 'white', textAlign: 'center', padding: '5rem 0' }}>
        <div className="container">
          <h2 style={{ color: 'white', fontSize: '3rem', marginBottom: '1.5rem' }}>
            Ready to Transform Your Real Estate Analysis?
          </h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '3rem', color: 'rgba(255,255,255,0.9)', maxWidth: '700px', margin: '0 auto 3rem' }}>
            Join thousands of brokers, investors, and lenders who trust VALORA for accurate,
            AI-powered property valuations.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="mailto:hello@loud-legacy.com?subject=VALORA%20Free%20Trial"
              className="button button--primary"
              style={{ background: 'white', color: '#1E40AF', fontSize: '1.125rem', padding: '1.25rem 2.5rem' }}
            >
              Start Free 14-Day Trial
            </Link>
            <Link
              href="mailto:hello@loud-legacy.com?subject=VALORA%20Demo%20Request"
              className="button button--secondary"
              style={{ borderColor: 'white', color: 'white', fontSize: '1.125rem', padding: '1.25rem 2.5rem' }}
            >
              Schedule Demo
            </Link>
          </div>
          <p style={{ marginTop: '2rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)' }}>
            No credit card required • Full access to all features • Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
