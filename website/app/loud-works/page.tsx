import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Loud Works - Workforce Intelligence Platform | Loud Legacy Ventures",
  description: "Build, develop, and retain exceptional teams. Loud Works connects talent development with business outcomes through structured workforce management.",
};

export default function LoudWorksPage() {
  return (
    <main className="loud-works-page">
      <Header />

      {/* Hero Section */}
      <section className="lw-hero">
        <div className="lw-hero-bg"></div>
        <div className="lw-hero-pattern"></div>
        <div className="container lw-hero-content">
          <Link href="/loud-works" className="lw-logo-link" aria-label="Loud Works Home">
            <Image
              src="/logos/loud-works.svg"
              alt="Loud Works"
              width={240}
              height={80}
              priority
              className="lw-hero-logo"
            />
          </Link>
          <div className="lw-badge">Workforce Intelligence Platform</div>
          <h1>Your team is your advantage.<br/>Build it with intention.</h1>
          <p className="lw-tagline">
            Loud Works connects talent development with business outcomes. Hire smarter,
            develop faster, retain longer. From emerging talent to seasoned professionals.
          </p>
          <div className="lw-hero-actions">
            <Link href="#features" className="button lw-button-primary">
              Explore Platform
            </Link>
            <Link href="#workforce" className="button lw-button-secondary">
              See How It Works
            </Link>
          </div>
          <div className="lw-hero-stats">
            <div className="lw-hero-stat">
              <span className="lw-hero-stat-value">2,400+</span>
              <span className="lw-hero-stat-label">Talent Profiles</span>
            </div>
            <div className="lw-hero-stat">
              <span className="lw-hero-stat-value">89%</span>
              <span className="lw-hero-stat-label">Retention Rate</span>
            </div>
            <div className="lw-hero-stat">
              <span className="lw-hero-stat-value">156</span>
              <span className="lw-hero-stat-label">Partner Organizations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="lw-value">
        <div className="container">
          <div className="lw-value-grid">
            <div className="lw-value-content">
              <span className="lw-section-label">The Challenge</span>
              <h2>Great teams don't happen by accident</h2>
              <p>
                Finding talent is hard. Developing talent is harder. Keeping talent?
                That's where most organizations fail. The cost of turnover isn't just
                financial—it's the lost momentum, institutional knowledge, and team cohesion.
              </p>
              <p>
                Loud Works gives you the infrastructure to build workforce development
                into your operations—not as an afterthought, but as a competitive advantage.
              </p>
            </div>
            <div className="lw-value-cards">
              <div className="lw-value-card">
                <div className="lw-value-icon lw-value-icon--orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                    <path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <h4>Talent Pipeline</h4>
                <p>Build relationships with emerging talent before you need them.</p>
              </div>
              <div className="lw-value-card">
                <div className="lw-value-icon lw-value-icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                </div>
                <h4>Skills Development</h4>
                <p>Track certifications, training, and growth pathways.</p>
              </div>
              <div className="lw-value-card">
                <div className="lw-value-icon lw-value-icon--blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                </div>
                <h4>Performance Insights</h4>
                <p>Connect development to outcomes that matter.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="lw-features">
        <div className="container">
          <div className="lw-section-header">
            <span className="lw-section-label">Platform Capabilities</span>
            <h2>Everything you need to build exceptional teams</h2>
            <p>Six integrated modules that transform how you find, develop, and retain talent.</p>
          </div>
          <div className="lw-features-grid">
            <div className="lw-feature-card lw-feature-card--highlight">
              <div className="lw-feature-number">01</div>
              <div className="lw-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                  <path d="M11 8v6M8 11h6"/>
                </svg>
              </div>
              <h3>Talent Discovery</h3>
              <p>Build and manage a pipeline of candidates across experience levels. Connect with universities, bootcamps, and professional networks to identify talent before positions open.</p>
              <ul className="lw-feature-list">
                <li>University partnership portal</li>
                <li>Skills-based matching</li>
                <li>Proactive talent engagement</li>
              </ul>
            </div>
            <div className="lw-feature-card">
              <div className="lw-feature-number">02</div>
              <div className="lw-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <h3>Structured Onboarding</h3>
              <p>Reduce time-to-productivity with customized onboarding tracks. Define clear milestones and check-ins for every role.</p>
              <ul className="lw-feature-list">
                <li>Role-specific pathways</li>
                <li>Mentor assignment</li>
                <li>30/60/90 day tracking</li>
              </ul>
            </div>
            <div className="lw-feature-card">
              <div className="lw-feature-number">03</div>
              <div className="lw-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 2,7 12,12 22,7"/>
                  <polyline points="2,17 12,22 22,17"/>
                  <polyline points="2,12 12,17 22,12"/>
                </svg>
              </div>
              <h3>Skills & Certifications</h3>
              <p>Track competencies, certifications, and training completion across your workforce. Identify skill gaps before they become problems.</p>
              <ul className="lw-feature-list">
                <li>Certification tracking</li>
                <li>Skill gap analysis</li>
                <li>Training recommendations</li>
              </ul>
            </div>
            <div className="lw-feature-card">
              <div className="lw-feature-number">04</div>
              <div className="lw-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20V10M18 20V4M6 20v-4"/>
                  <path d="M2 20h20"/>
                </svg>
              </div>
              <h3>Performance Development</h3>
              <p>Connect individual growth to team outcomes. Set goals, track progress, and provide feedback that actually develops people.</p>
              <ul className="lw-feature-list">
                <li>OKR alignment</li>
                <li>Continuous feedback</li>
                <li>Growth trajectory mapping</li>
              </ul>
            </div>
            <div className="lw-feature-card">
              <div className="lw-feature-number">05</div>
              <div className="lw-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
                </svg>
              </div>
              <h3>Scheduling & Availability</h3>
              <p>Manage shift scheduling, availability, and coverage with ease. Built for operations that need reliable staffing.</p>
              <ul className="lw-feature-list">
                <li>Shift management</li>
                <li>Availability tracking</li>
                <li>Coverage alerts</li>
              </ul>
            </div>
            <div className="lw-feature-card">
              <div className="lw-feature-number">06</div>
              <div className="lw-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.21 15.89A10 10 0 118 2.83"/>
                  <path d="M22 12A10 10 0 0012 2v10z"/>
                </svg>
              </div>
              <h3>Workforce Analytics</h3>
              <p>Understand your workforce with data that matters. Track retention, development velocity, and team health metrics.</p>
              <ul className="lw-feature-list">
                <li>Retention predictors</li>
                <li>Team composition analysis</li>
                <li>Development ROI</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Workforce Flow Section */}
      <section id="workforce" className="lw-workflow">
        <div className="container">
          <div className="lw-section-header">
            <span className="lw-section-label">The Loud Works Flow</span>
            <h2>From discovery to development</h2>
            <p>A connected system that manages the full talent lifecycle.</p>
          </div>
          <div className="lw-workflow-timeline">
            <div className="lw-workflow-step">
              <div className="lw-workflow-step-number">1</div>
              <div className="lw-workflow-step-content">
                <h4>Discover</h4>
                <p>Build relationships with talent pools through university partnerships and professional networks.</p>
              </div>
            </div>
            <div className="lw-workflow-connector"></div>
            <div className="lw-workflow-step">
              <div className="lw-workflow-step-number">2</div>
              <div className="lw-workflow-step-content">
                <h4>Evaluate</h4>
                <p>Assess skills, potential, and fit through structured evaluation frameworks.</p>
              </div>
            </div>
            <div className="lw-workflow-connector"></div>
            <div className="lw-workflow-step">
              <div className="lw-workflow-step-number">3</div>
              <div className="lw-workflow-step-content">
                <h4>Onboard</h4>
                <p>Accelerate time-to-productivity with role-specific onboarding pathways.</p>
              </div>
            </div>
            <div className="lw-workflow-connector"></div>
            <div className="lw-workflow-step">
              <div className="lw-workflow-step-number">4</div>
              <div className="lw-workflow-step-content">
                <h4>Develop</h4>
                <p>Track certifications, skills, and growth with continuous feedback loops.</p>
              </div>
            </div>
            <div className="lw-workflow-connector"></div>
            <div className="lw-workflow-step">
              <div className="lw-workflow-step-number">5</div>
              <div className="lw-workflow-step-content">
                <h4>Retain</h4>
                <p>Identify flight risks early and create pathways for advancement.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section id="audience" className="lw-audience">
        <div className="container">
          <div className="lw-section-header">
            <span className="lw-section-label">Who It's For</span>
            <h2>Built for organizations that invest in people</h2>
          </div>
          <div className="lw-audience-grid">
            <div className="lw-audience-card">
              <div className="lw-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                </svg>
              </div>
              <h4>Athletic Departments</h4>
              <p>Manage student workers, game day staff, and operations teams. Track certifications and schedule coverage for events.</p>
              <span className="lw-audience-tag">Sports & Entertainment</span>
            </div>
            <div className="lw-audience-card">
              <div className="lw-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <h4>Property Management</h4>
              <p>Coordinate maintenance teams, leasing agents, and on-site staff across multiple properties. Never miss coverage.</p>
              <span className="lw-audience-tag">Real Estate</span>
            </div>
            <div className="lw-audience-card">
              <div className="lw-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <h4>Growing Agencies</h4>
              <p>Scale your team without losing culture. Track skills, manage contractors, and develop junior talent into leaders.</p>
              <span className="lw-audience-tag">Professional Services</span>
            </div>
            <div className="lw-audience-card">
              <div className="lw-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 2,7 12,12 22,7 12,2"/>
                  <polyline points="2,17 12,22 22,17"/>
                  <polyline points="2,12 12,17 22,12"/>
                </svg>
              </div>
              <h4>Training Organizations</h4>
              <p>Track cohorts, certifications, and placement rates. Connect learning outcomes to career advancement.</p>
              <span className="lw-audience-tag">Education</span>
            </div>
            <div className="lw-audience-card">
              <div className="lw-audience-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
              </div>
              <h4>Multi-Site Operations</h4>
              <p>Standardize workforce management across locations. Ensure consistent training and coverage everywhere.</p>
              <span className="lw-audience-tag">Operations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="lw-integration">
        <div className="container">
          <div className="lw-integration-content">
            <div className="lw-integration-text">
              <span className="lw-section-label">Loud Legacy Ecosystem</span>
              <h2>Better together</h2>
              <p>
                Loud Works integrates seamlessly with the Loud Legacy ecosystem. Connect
                workforce data to Sportify events, Legacy RE properties, and Legacy CRM relationships.
              </p>
              <div className="lw-integration-features">
                <div className="lw-integration-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  <span>Sync event staff with Sportify schedules</span>
                </div>
                <div className="lw-integration-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  <span>Connect property teams to Legacy RE portfolios</span>
                </div>
                <div className="lw-integration-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  <span>Link talent relationships in Legacy CRM</span>
                </div>
                <div className="lw-integration-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  <span>Track operational metrics in Business Now</span>
                </div>
              </div>
            </div>
            <div className="lw-integration-visual">
              <div className="lw-integration-hub">
                <div className="lw-hub-center">
                  <Image src="/logos/loud-works.svg" alt="Loud Works" width={60} height={60} />
                </div>
                <div className="lw-hub-orbit">
                  <div className="lw-hub-item lw-hub-item--1">
                    <Image src="/logos/sportify.svg" alt="Sportify" width={40} height={40} />
                  </div>
                  <div className="lw-hub-item lw-hub-item--2">
                    <Image src="/logos/legacy-re.svg" alt="Legacy RE" width={40} height={40} />
                  </div>
                  <div className="lw-hub-item lw-hub-item--3">
                    <Image src="/logos/legacy-crm.svg" alt="Legacy CRM" width={40} height={40} />
                  </div>
                  <div className="lw-hub-item lw-hub-item--4">
                    <Image src="/logos/business-now.svg" alt="Business Now" width={40} height={40} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="lw-testimonial">
        <div className="container">
          <div className="lw-testimonial-card">
            <blockquote>
              "We went from scrambling to find event staff to having a trained, reliable
              team ready for every game day. Loud Works gave us the structure to actually
              develop our student workers instead of just scheduling them."
            </blockquote>
            <div className="lw-testimonial-author">
              <div className="lw-testimonial-info">
                <span className="lw-testimonial-name">Operations Director</span>
                <span className="lw-testimonial-org">D1 Athletic Department</span>
              </div>
              <div className="lw-testimonial-metric">
                <span className="lw-testimonial-metric-value">40%</span>
                <span className="lw-testimonial-metric-label">reduction in turnover</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="lw-cta">
        <div className="container">
          <div className="lw-cta-content">
            <h2>Ready to build a team that stays?</h2>
            <p>See how Loud Works can transform your workforce management with a personalized demo.</p>
            <div className="lw-cta-actions">
              <Link href="/contact" className="button lw-button-primary lw-button-large">
                Request Demo
              </Link>
              <Link href="#features" className="button lw-button-ghost">
                Explore Features
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
