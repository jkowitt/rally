import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Business Now - Structured Execution | Loud Legacy Ventures",
  description: "Practical business operating toolkit. Move from reaction to intention with structure for execution. Not education for education's sake—structure for results.",
};

export default function BusinessNowPage() {
  return (
    <main className="business-now-page">
      <Header />

      {/* Hero Section */}
      <section className="bn-hero">
        <div className="bn-hero-bg"></div>
        <div className="container bn-hero-content">
          <Link href="/business-now" className="bn-logo-link" aria-label="Business Now Home">
            <Image
              src="/logos/business-now.svg"
              alt="Business Now"
              width={220}
              height={70}
              priority
              className="bn-hero-logo"
            />
          </Link>
          <div className="bn-badge">Structured Execution Platform</div>
          <h1>From chaos to clarity.<br/>From reaction to intention.</h1>
          <p className="bn-tagline">
            Business Now is a practical operating toolkit that helps individuals and small businesses
            build the discipline of execution. Not education for education's sake—structure for results.
          </p>
          <div className="bn-hero-actions">
            <Link href="#features" className="button bn-button-primary">
              Explore Features
            </Link>
            <Link href="#audience" className="button bn-button-secondary">
              Who It's For
            </Link>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="bn-philosophy">
        <div className="container">
          <div className="bn-philosophy-grid">
            <div className="bn-philosophy-content">
              <span className="bn-section-label">Our Philosophy</span>
              <h2>Structure over chaos.<br/>Consistency over intensity.</h2>
              <p>
                Business Now is the entry point to the Loud Legacy ecosystem. It teaches the
                operating philosophy that separates sustainable businesses from chaotic ones.
              </p>
              <p>
                Most business tools overwhelm you with features. We start with fundamentals—
                the daily, weekly, and monthly rhythms that turn good intentions into real results.
              </p>
            </div>
            <div className="bn-philosophy-stats">
              <div className="bn-stat-card">
                <span className="bn-stat-number">85%</span>
                <span className="bn-stat-label">of small businesses fail from operational chaos</span>
              </div>
              <div className="bn-stat-card">
                <span className="bn-stat-number">3x</span>
                <span className="bn-stat-label">more likely to succeed with structured planning</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bn-features">
        <div className="container">
          <div className="bn-section-header">
            <span className="bn-section-label">Core Capabilities</span>
            <h2>Everything you need to operate with intention</h2>
            <p>Six fundamental tools that create clarity, accountability, and momentum.</p>
          </div>
          <div className="bn-features-grid">
            <div className="bn-feature-card">
              <div className="bn-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3>Business Overview Framework</h3>
              <p>A clear snapshot of what your business is, who it serves, and how it makes money. Clarity before complexity.</p>
            </div>
            <div className="bn-feature-card">
              <div className="bn-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
              </div>
              <h3>Goal & Priority Tracking</h3>
              <p>Short and medium-term goals with defined actions—not vague ambitions. What matters this week, this month, this quarter.</p>
            </div>
            <div className="bn-feature-card">
              <div className="bn-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <h3>Income & Expense Visibility</h3>
              <p>Simple financial tracking to understand cash flow without accounting complexity. Know your numbers.</p>
            </div>
            <div className="bn-feature-card">
              <div className="bn-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <h3>Weekly Planning System</h3>
              <p>A structured way to plan time, priorities, and execution consistently. The rhythm that builds momentum.</p>
            </div>
            <div className="bn-feature-card">
              <div className="bn-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
              </div>
              <h3>Basic KPI Tracking</h3>
              <p>Focus on a small number of meaningful metrics rather than vanity data. Measure what moves the needle.</p>
            </div>
            <div className="bn-feature-card">
              <div className="bn-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <h3>Execution Discipline</h3>
              <p>Systems that reinforce consistent action over sporadic intensity. Small steps, every day, that compound.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section id="audience" className="bn-audience">
        <div className="container">
          <div className="bn-section-header">
            <span className="bn-section-label">Who It's For</span>
            <h2>Built for operators who want structure, not noise</h2>
          </div>
          <div className="bn-audience-grid">
            <div className="bn-audience-card">
              <div className="bn-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h4>Solo Operators</h4>
              <p>Build discipline and consistency into your one-person business. Stop reinventing the wheel every week.</p>
            </div>
            <div className="bn-audience-card">
              <div className="bn-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <h4>Small Business Owners</h4>
              <p>Get structure for operations, finances, and planning without complexity. Run your business, don't let it run you.</p>
            </div>
            <div className="bn-audience-card">
              <div className="bn-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 2,7 12,12 22,7"/>
                  <polyline points="2,17 12,22 22,17"/>
                  <polyline points="2,12 12,17 22,12"/>
                </svg>
              </div>
              <h4>Early-Stage Founders</h4>
              <p>Establish operational fundamentals before you scale. Build habits now that serve you at 10x.</p>
            </div>
            <div className="bn-audience-card">
              <div className="bn-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10,8 16,12 10,16 10,8"/>
                </svg>
              </div>
              <h4>Side Venture Builders</h4>
              <p>Structure your side business for sustainable growth alongside your full-time work. Make every hour count.</p>
            </div>
            <div className="bn-audience-card">
              <div className="bn-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <h4>Professionals in Transition</h4>
              <p>Build the foundation for your next chapter with clarity and intention. Know where you're going.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="bn-problems">
        <div className="container">
          <div className="bn-section-header">
            <span className="bn-section-label">The Problems We Solve</span>
            <h2>From overwhelm to ownership</h2>
          </div>
          <div className="bn-problems-grid">
            <div className="bn-problem-card">
              <div className="bn-problem-header">
                <span className="bn-problem-icon">!</span>
                <h4>Lack of Planning Discipline</h4>
              </div>
              <p className="bn-problem-desc">Operating reactively without clear goals or priorities. Every day feels different.</p>
              <div className="bn-solution">
                <span className="bn-solution-arrow">→</span>
                <span>Structured planning system with weekly execution rhythm</span>
              </div>
            </div>
            <div className="bn-problem-card">
              <div className="bn-problem-header">
                <span className="bn-problem-icon">!</span>
                <h4>No Visibility Into Numbers</h4>
              </div>
              <p className="bn-problem-desc">Can't answer basic questions about cash flow or profitability without digging.</p>
              <div className="bn-solution">
                <span className="bn-solution-arrow">→</span>
                <span>Simple financial tracking without accounting complexity</span>
              </div>
            </div>
            <div className="bn-problem-card">
              <div className="bn-problem-header">
                <span className="bn-problem-icon">!</span>
                <h4>Overwhelm From Too Many Ideas</h4>
              </div>
              <p className="bn-problem-desc">Chasing every opportunity without focus or completion. Nothing gets finished.</p>
              <div className="bn-solution">
                <span className="bn-solution-arrow">→</span>
                <span>Priority framework that forces focus and follow-through</span>
              </div>
            </div>
            <div className="bn-problem-card">
              <div className="bn-problem-header">
                <span className="bn-problem-icon">!</span>
                <h4>Inconsistent Follow-Through</h4>
              </div>
              <p className="bn-problem-desc">Start strong but fade when motivation dips. Intensity without consistency.</p>
              <div className="bn-solution">
                <span className="bn-solution-arrow">→</span>
                <span>Systems that build consistency over intensity</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="bn-resources-preview">
        <div className="container">
          <div className="bn-section-header">
            <span className="bn-section-label">Free Resources</span>
            <h2>Download the tools to get started</h2>
            <p>How-to guides and Excel templates to implement Business Now in your operations.</p>
          </div>
          <div className="bn-resources-preview-grid">
            <div className="bn-resource-preview-card">
              <div className="bn-resource-preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h4>6 How-To Guides</h4>
              <p>Step-by-step frameworks for business planning, goal setting, and financial management.</p>
            </div>
            <div className="bn-resource-preview-card">
              <div className="bn-resource-preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              </div>
              <h4>8 Excel Templates</h4>
              <p>Ready-to-use spreadsheets for tracking income, expenses, goals, KPIs, and cash flow.</p>
            </div>
            <div className="bn-resource-preview-card">
              <div className="bn-resource-preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <h4>Free Downloads</h4>
              <p>Start with our free Business Overview Framework and Income Tracker—no signup required.</p>
            </div>
          </div>
          <div className="bn-resources-preview-cta">
            <Link href="/business-now/resources" className="button bn-button-primary">
              Browse All Resources
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bn-cta">
        <div className="container">
          <div className="bn-cta-content">
            <h2>Build with structure, not shortcuts</h2>
            <p>Business Now is your entry point to operational excellence. Start with structure, scale with systems.</p>
            <div className="bn-cta-actions">
              <Link href="/contact" className="button bn-button-primary bn-button-large">
                Get Started
              </Link>
              <Link href="/business-now/resources" className="button bn-button-ghost">
                Download Resources
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
