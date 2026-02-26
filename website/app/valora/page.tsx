import { InvestorHeader } from "@/components/InvestorHeader";
import InvestorFooter from "@/components/InvestorFooter";

export const metadata = {
  title: "Valora - Smart Property Analysis for Real Estate Pros",
  description: "Analyze any property in minutes. Get AI-powered valuations, real comparable sales, financial projections, and improvement recommendations.",
};

const PropertyTypeIcons = {
  commercial: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
      <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  residential: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  multifamily: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  industrial: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <path d="M3 21h18M9 21V12l-6 3V8l6-3v4l6-3v4l6-3v14" />
    </svg>
  ),
};

const UserTypeIcons = {
  brokers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
      <path d="M12 11v2M9 11h6" strokeLinecap="round" />
    </svg>
  ),
  owners: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      <path d="M12 9v2" strokeLinecap="round" />
    </svg>
  ),
  investors: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      <path d="M12 11v4M10 13h4" strokeLinecap="round" />
    </svg>
  ),
  lenders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
    </svg>
  ),
};

export default function ValoraPage() {
  return (
    <main className="product-page">
      <InvestorHeader />

      <section className="product-hero" style={{ background: "linear-gradient(160deg, #F0F4F8 0%, #E2E8F0 40%, #CBD5E1 100%)" }}>
        <div className="container">
          <h1 className="valora-hero-text-logo" style={{ color: '#1B2A4A' }}>Valora</h1>
          <p style={{ fontStyle: 'italic', color: '#1B2A4A', fontSize: '1.1rem', letterSpacing: '0.05em', marginTop: '0.25rem', marginBottom: '0' }}>Built to Last</p>
          <p className="tagline" style={{ color: '#1E293B' }}>
            Know what a property is worth, what it costs to own, and how to make it worth more — all from one place.
          </p>
        </div>
      </section>

      {/* Property Types Supported */}
      <section className="product-section" style={{ background: 'var(--bg-secondary)', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Supporting All Property Types
            </h3>
            <div className="valora-property-types">
              <span className="valora-property-type">{PropertyTypeIcons.commercial} Commercial</span>
              <span className="valora-property-type">{PropertyTypeIcons.residential} Residential</span>
              <span className="valora-property-type">{PropertyTypeIcons.multifamily} Multifamily</span>
              <span className="valora-property-type">{PropertyTypeIcons.industrial} Industrial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section id="features" className="product-section">
        <div className="container">
          <h2 style={{ marginBottom: '2rem' }}>What You Can Do</h2>

          <div className="valora-feature-section">
            <h3 className="valora-feature-section-title">AI-Powered Property Intelligence</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
              Upload photos or enter an address — our AI does the rest. Get property condition scores, value estimates, and improvement ideas automatically.
            </p>
            <div className="features-grid">
              <div className="feature-card">
                <h3>AI Image Recognition</h3>
                <p>Upload a photo of any property. AI spots issues, rates condition, and suggests improvements with cost estimates.</p>
              </div>
              <div className="feature-card">
                <h3>Smart Geocoding</h3>
                <p>Snap a photo on-site and Valora figures out where you are and starts the analysis for you.</p>
              </div>
              <div className="feature-card">
                <h3>Address Input &amp; Validation</h3>
                <p>Type in any address. We pull in tax rates, insurance estimates, comparable sales, and market data for that area.</p>
              </div>
              <div className="feature-card">
                <h3>AI Recommendations</h3>
                <p>Get a list of specific upgrades that add value — with cost breakdowns, ROI projections, and contractor-ready action items.</p>
              </div>
            </div>
          </div>

          <div className="valora-feature-section">
            <h3 className="valora-feature-section-title">Financial Analysis &amp; Underwriting</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
              Run the numbers on any deal. See your cash flow, returns, and risk — updated in real time as you adjust assumptions.
            </p>
            <div className="features-grid">
              <div className="feature-card">
                <h3>Customizable P&amp;L Models</h3>
                <p>Build a profit and loss statement with every expense category pre-filled from local area data. Edit anything to match your deal.</p>
              </div>
              <div className="feature-card">
                <h3>Dynamic Financial Modeling</h3>
                <p>Change the rent, vacancy, or interest rate and watch your cash flow, cap rate, and returns update instantly.</p>
              </div>
              <div className="feature-card">
                <h3>Scenario Analysis</h3>
                <p>Compare conservative, base, and optimistic scenarios side by side. See how different assumptions change your bottom line.</p>
              </div>
              <div className="feature-card">
                <h3>Sensitivity Testing</h3>
                <p>Find out which numbers matter most. See how a 1% rate change or 5% rent increase impacts your returns.</p>
              </div>
            </div>
          </div>

          <div className="valora-feature-section">
            <h3 className="valora-feature-section-title">Market Intelligence &amp; Comparables</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
              See what similar properties actually sold for, how far away they are, and how fresh the data is. Real comps, not guesses.
            </p>
            <div className="features-grid">
              <div className="feature-card">
                <h3>On-Market Valuations</h3>
                <p>Browse properties listed for sale with asking prices, days on market, and seller details.</p>
              </div>
              <div className="feature-card">
                <h3>Comparable Sales Database</h3>
                <p>Find recent sales near your property — filtered by type, size, and date. Each comp shows distance, recency score, and price adjustments.</p>
              </div>
              <div className="feature-card">
                <h3>Market Reports</h3>
                <p>Track cap rates, rent trends, vacancy rates, and population growth for any area. Data updates automatically.</p>
              </div>
            </div>
          </div>

          <div className="valora-feature-section">
            <h3 className="valora-feature-section-title">Portfolio &amp; Valuation Management</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
              Save every analysis you run. Come back to compare, update, or share with your team.
            </p>
            <div className="features-grid">
              <div className="feature-card">
                <h3>Valuation History Database</h3>
                <p>Every property you analyze is saved automatically. Go back to any analysis to review, update, or export.</p>
              </div>
              <div className="feature-card">
                <h3>Private Valuations</h3>
                <p>Keep your work private or share it when you&apos;re ready. You control who sees what.</p>
              </div>
              <div className="feature-card">
                <h3>Portfolio Dashboard</h3>
                <p>See all your properties in one view — total value, returns, and performance at a glance.</p>
              </div>
              <div className="feature-card">
                <h3>Search &amp; Filter</h3>
                <p>Find any past analysis by address, date, property type, or custom tags.</p>
              </div>
            </div>
          </div>

          <div className="valora-feature-section">
            <h3 className="valora-feature-section-title">Team Collaboration &amp; Admin Controls</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
              Invite your team, control who can view or edit, and set up approval workflows for quality control.
            </p>
            <div className="features-grid">
              <div className="feature-card">
                <h3>Team Management</h3>
                <p>Add team members and assign roles — Admin, Analyst, or Viewer. Everyone sees only what they should.</p>
              </div>
              <div className="feature-card">
                <h3>Account Access</h3>
                <p>Sign up with email or Google. Enterprise teams can use single sign-on.</p>
              </div>
              <div className="feature-card">
                <h3>Admin Controls</h3>
                <p>Manage your team, review activity, and adjust permissions from one place.</p>
              </div>
              <div className="feature-card">
                <h3>Workflow Approval</h3>
                <p>Junior analysts create valuations, seniors review and approve. Keep quality consistent across your team.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Types */}
      <section className="product-section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Who It&apos;s For</h2>
          <div className="features-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="feature-card valora-user-card">
              <div className="valora-user-icon">{UserTypeIcons.brokers}</div>
              <h3>Brokers</h3>
              <p>Build valuations for client meetings, back up your pricing, and win more listings.</p>
            </div>
            <div className="feature-card valora-user-card">
              <div className="valora-user-icon">{UserTypeIcons.owners}</div>
              <h3>Property Owners</h3>
              <p>Understand what your property is worth, track changes over time, and find ways to add value.</p>
            </div>
            <div className="feature-card valora-user-card">
              <div className="valora-user-icon">{UserTypeIcons.investors}</div>
              <h3>Investors</h3>
              <p>Analyze deals faster, compare scenarios, and find the best opportunities in your pipeline.</p>
            </div>
            <div className="feature-card valora-user-card">
              <div className="valora-user-icon">{UserTypeIcons.lenders}</div>
              <h3>Lenders</h3>
              <p>Standardize how you review deals, verify borrower assumptions, and make confident lending decisions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="product-section">
        <div className="container" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>
            Smarter Property Decisions
          </h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Valora helps brokers, investors, and lenders make smarter property decisions with AI-powered analysis and real comparable data.
          </p>
          <p style={{ fontSize: '1.0625rem', color: 'var(--text-secondary)' }}>
            Contact jason@loud-legacy.com for more information.
          </p>
        </div>
      </section>

      <InvestorFooter />
    </main>
  );
}
