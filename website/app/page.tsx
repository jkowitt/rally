import Link from "next/link";
import Image from "next/image";
import { InvestorHeader } from "@/components/InvestorHeader";
import InvestorFooter from "@/components/InvestorFooter";

const products = [
  {
    name: "Rally",
    tagline: "Fan Engagement Platform",
    description:
      "Direct-to-consumer app where fans prove fandom through geofenced stadium check-ins, earning status across a four-tier loyalty system while building persistent identity profiles validated by actual behavior.",
    stats: ["520+ Teams", "7 Leagues", "4 Loyalty Tiers"],
    color: "#FF6B35",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    name: "Business Now",
    tagline: "Commerce Layer",
    description:
      "Connects verified fan audiences to local and national businesses through targeted offers, real-time attribution, and transaction data that closes the loop between fan presence and commercial activity.",
    stats: ["Real-Time Attribution", "Closed-Loop Data", "Targeted Offers"],
    color: "#2D9CDB",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <path d="M2 9h20M8 9v12" />
      </svg>
    ),
  },
  {
    name: "Valora",
    tagline: "Real Estate Intelligence",
    description:
      "Transforms behavioral data into real estate intelligence — giving developers, REITs, and municipalities the first-ever verified picture of how fans actually move around venues and what it means for stadium-adjacent development.",
    stats: ["Behavioral Heatmaps", "Development Insights", "REIT-Ready Data"],
    color: "#34C759",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    name: "Legacy CRM",
    tagline: "Intelligence Engine",
    description:
      "The connective tissue — a relationship management backbone where every fan interaction, business transaction, property data point, and sponsor engagement flows through a single intelligence engine.",
    stats: ["Unified Data Layer", "Cross-Product Intelligence", "Predictive Insights"],
    color: "#AF52DE",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
];

const marketOpportunity = [
  {
    label: "Global Sports Market",
    value: "$620B",
    description: "Annual global sports industry revenue",
  },
  {
    label: "Fan Data & Analytics",
    value: "$8.4B",
    description: "Sports analytics market by 2028",
  },
  {
    label: "Stadium-Adjacent RE",
    value: "$25B+",
    description: "Active stadium district developments in the U.S.",
  },
  {
    label: "Sports Sponsorship",
    value: "$97B",
    description: "Global sponsorship spending with limited attribution",
  },
];

const investmentBreakdown = [
  { category: "Engineering Team (10 engineers, 12 months)", amount: "$1,330,000", pct: 62 },
  { category: "Product & Design", amount: "$310,000", pct: 14 },
  { category: "Infrastructure & DevOps", amount: "$132,000", pct: 6 },
  { category: "Quality Assurance", amount: "$130,000", pct: 6 },
  { category: "Legal, Security & Compliance", amount: "$100,000", pct: 5 },
  { category: "Contingency & Buffer", amount: "$148,000", pct: 7 },
];

const competitiveAdvantages = [
  {
    title: "Verified Behavioral Data",
    description: "Not surveys. Not self-reported preferences. Geofenced, timestamped proof of physical presence.",
  },
  {
    title: "Cross-Product Network Effects",
    description: "Every product feeds the others. More fans means better data means more value for businesses, sponsors, and developers.",
  },
  {
    title: "Viral Growth Engine",
    description: "Fan rivalry is the growth engine. 50 fans from one side start proving dedication, and the other side shows up on their own.",
  },
  {
    title: "First-Mover Advantage",
    description: "No one owns the identity layer for the physical world. Sports is the most passionate, tribal, viral place to start.",
  },
];

const timeline = [
  {
    phase: "Phase 1",
    title: "Iowa Beachhead",
    description: "Prove the model in a contained, passionate college sports market. Campus ambassadors, rivalry activation, initial data collection.",
    status: "active",
  },
  {
    phase: "Phase 2",
    title: "Power Five Expansion",
    description: "Roll out across Power Five conferences. Activate Business Now partnerships and Valora pilot projects.",
    status: "upcoming",
  },
  {
    phase: "Phase 3",
    title: "Professional Sports",
    description: "Expand into NFL, NBA, MLB, NHL, MLS stadiums. Launch Legacy CRM for enterprise sponsors and properties.",
    status: "upcoming",
  },
  {
    phase: "Phase 4",
    title: "Beyond Sports",
    description: "Concerts, festivals, conferences, theme parks, retail districts. Rally becomes the credit score for real-world engagement.",
    status: "future",
  },
];

export default function InvestorPage() {
  return (
    <main className="investor-landing">
      <InvestorHeader />

      {/* Hero */}
      <section className="investor-hero">
        <div className="container">
          <div className="investor-hero-eyebrow">Loud Legacy Ventures</div>
          <h1 className="investor-hero-headline">
            The Identity Layer<br />for the Physical World
          </h1>
          <p className="investor-hero-sub">
            We&apos;re building the behavioral data infrastructure that proves who actually shows up —
            starting with sports, ending everywhere humans gather.
          </p>
          <div className="investor-hero-tagline">
            Prove you were there.
          </div>
          <div className="investor-hero-actions">
            <Link href="#ecosystem" className="rally-btn rally-btn--primary rally-btn--large">
              Explore the Ecosystem
            </Link>
            <Link href="#investment" className="rally-btn rally-btn--secondary rally-btn--large">
              View Investment Thesis
            </Link>
          </div>
        </div>
        <div className="investor-hero-gradient" />
      </section>

      {/* Problem Statement */}
      <section className="investor-problem">
        <div className="container">
          <div className="investor-section-label">The Problem</div>
          <h2>Billions Spent on Guesswork</h2>
          <div className="investor-problem-grid">
            <div className="investor-problem-card">
              <div className="investor-problem-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" strokeLinecap="round" /><circle cx="12" cy="17" r="0.5" fill="currentColor" /></svg>
              </div>
              <h3>Sports Properties</h3>
              <p>Know almost nothing about who actually shows up, how engaged they are, or what drives them to come back.</p>
            </div>
            <div className="investor-problem-card">
              <div className="investor-problem-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 00-8 0v2" /></svg>
              </div>
              <h3>Sponsors</h3>
              <p>Spend billions on stadium signage and hope it works. No verified attribution between presence and purchase.</p>
            </div>
            <div className="investor-problem-card">
              <div className="investor-problem-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
              </div>
              <h3>Developers & REITs</h3>
              <p>Build billion-dollar mixed-use districts next to venues based on traffic counts and gut feel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="investor-solution">
        <div className="container">
          <div className="investor-section-label">The Solution</div>
          <h2>One Data Asset Solves All of It</h2>
          <p className="investor-solution-sub">
            Verified behavioral proof of fan presence and engagement. Not surveys. Not self-reported preferences.
            Geofenced, timestamped proof of showing up.
          </p>
          <div className="investor-solution-visual">
            <div className="investor-data-flow">
              <div className="investor-data-node investor-data-node--source">
                <span>Fan Shows Up</span>
              </div>
              <div className="investor-data-arrow">&rarr;</div>
              <div className="investor-data-node investor-data-node--core">
                <span>Verified Behavioral Data</span>
              </div>
              <div className="investor-data-arrow">&rarr;</div>
              <div className="investor-data-node investor-data-node--output">
                <span>Identity + Intelligence</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Ecosystem */}
      <section id="ecosystem" className="investor-ecosystem">
        <div className="container">
          <div className="investor-section-label">Product Ecosystem</div>
          <h2>Four Products. One Data Asset.</h2>
          <p className="investor-ecosystem-sub">
            Each product feeds the others, creating compounding network effects and an expanding moat
            with every check-in, transaction, and data point.
          </p>
          <div className="investor-product-grid">
            {products.map((product) => (
              <div key={product.name} className="investor-product-card" style={{ borderTopColor: product.color }}>
                <div className="investor-product-icon" style={{ color: product.color }}>
                  {product.icon}
                </div>
                <div className="investor-product-name" style={{ color: product.color }}>
                  {product.name}
                </div>
                <div className="investor-product-tagline">{product.tagline}</div>
                <p className="investor-product-desc">{product.description}</p>
                <div className="investor-product-stats">
                  {product.stats.map((stat) => (
                    <span key={stat} className="investor-product-stat" style={{ borderColor: product.color, color: product.color }}>
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Ecosystem Diagram */}
          <div className="investor-ecosystem-diagram">
            <div className="investor-ecosystem-center">
              <div className="investor-ecosystem-hub">
                <span>Verified Fan Identity</span>
                <small>The Core Data Asset</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Opportunity */}
      <section className="investor-market">
        <div className="container">
          <div className="investor-section-label">Market Opportunity</div>
          <h2>Massive, Underserved Markets</h2>
          <div className="investor-market-grid">
            {marketOpportunity.map((item) => (
              <div key={item.label} className="investor-market-card">
                <div className="investor-market-value">{item.value}</div>
                <div className="investor-market-label">{item.label}</div>
                <p className="investor-market-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Advantages */}
      <section className="investor-moat">
        <div className="container">
          <div className="investor-section-label">Competitive Moat</div>
          <h2>Why Loud Legacy Wins</h2>
          <div className="investor-moat-grid">
            {competitiveAdvantages.map((advantage, i) => (
              <div key={advantage.title} className="investor-moat-card">
                <div className="investor-moat-num">{String(i + 1).padStart(2, "0")}</div>
                <h3>{advantage.title}</h3>
                <p>{advantage.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Go-to-Market */}
      <section className="investor-gtm">
        <div className="container">
          <div className="investor-section-label">Go-to-Market</div>
          <h2>Iowa First. Then Everywhere.</h2>
          <p className="investor-gtm-sub">
            Leveraging founder Jason&apos;s alma mater connection and campus ambassador network to prove the model
            in a contained, passionate college sports market before expanding nationally.
          </p>
          <div className="investor-timeline">
            {timeline.map((item) => (
              <div key={item.phase} className={`investor-timeline-item investor-timeline-item--${item.status}`}>
                <div className="investor-timeline-marker" />
                <div className="investor-timeline-content">
                  <div className="investor-timeline-phase">{item.phase}</div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="investor-gtm-insight">
            <div className="investor-gtm-insight-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
            <div>
              <strong>The Growth Insight:</strong> Fan rivalry is the growth engine. You don&apos;t need to market to opposing fanbases.
              You need 50 fans from one side to start proving they&apos;re more dedicated, and the other side shows up on their own.
            </div>
          </div>
        </div>
      </section>

      {/* Rally Build-Out Investment */}
      <section id="investment" className="investor-investment">
        <div className="container">
          <div className="investor-section-label">Rally Build-Out Estimate</div>
          <h2>What It Takes to Build Rally</h2>
          <p className="investor-investment-sub">
            Full-stack platform build across web, iOS, Android, API, and data infrastructure.
            12-month timeline with a team of 10 engineers plus product and design.
          </p>

          <div className="investor-investment-total">
            <div className="investor-investment-amount">$2.15M</div>
            <div className="investor-investment-label">Total Rally Build-Out Investment</div>
            <div className="investor-investment-period">12-month full-platform development</div>
          </div>

          <div className="investor-investment-grid">
            {investmentBreakdown.map((item) => (
              <div key={item.category} className="investor-investment-item">
                <div className="investor-investment-item-header">
                  <span className="investor-investment-category">{item.category}</span>
                  <span className="investor-investment-item-amount">{item.amount}</span>
                </div>
                <div className="investor-investment-bar-track">
                  <div
                    className="investor-investment-bar-fill"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="investor-investment-details">
            <div className="investor-investment-detail-card">
              <h4>Return on Investment</h4>
              <ul>
                <li>Full IP ownership of a production-ready behavioral data platform</li>
                <li>Cross-platform ecosystem (web, iOS, Android) built to scale</li>
                <li>First-mover access to verified fan identity — an asset no competitor owns</li>
                <li>Four interlocking revenue streams from a single data asset</li>
                <li>Built-in viral growth through fan rivalry — no paid acquisition needed</li>
                <li>White-label ready for any sports property, league, or venue</li>
                <li>Behavioral data pipeline feeding Business Now, Valora, and Legacy CRM from day one</li>
                <li>12 months of dedicated technical support and knowledge transfer</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="investor-vision">
        <div className="container">
          <div className="investor-section-label">The Long-Term Vision</div>
          <h2>Beyond Sports. Everywhere Humans Gather.</h2>
          <p className="investor-vision-sub">
            The check-in and behavioral verification mechanics that prove fandom apply everywhere.
            Rally&apos;s credit score for fandom is really a credit score for real-world engagement.
          </p>
          <div className="investor-vision-grid">
            <div className="investor-vision-card">
              <span className="investor-vision-emoji-placeholder">Stadiums</span>
              <p>520+ teams across 7 leagues</p>
            </div>
            <div className="investor-vision-card">
              <span className="investor-vision-emoji-placeholder">Concerts</span>
              <p>Live music and festivals</p>
            </div>
            <div className="investor-vision-card">
              <span className="investor-vision-emoji-placeholder">Conferences</span>
              <p>Industry events and expos</p>
            </div>
            <div className="investor-vision-card">
              <span className="investor-vision-emoji-placeholder">Theme Parks</span>
              <p>Attractions and entertainment</p>
            </div>
            <div className="investor-vision-card">
              <span className="investor-vision-emoji-placeholder">Retail</span>
              <p>Shopping districts and malls</p>
            </div>
            <div className="investor-vision-card">
              <span className="investor-vision-emoji-placeholder">Everywhere</span>
              <p>Any physical gathering space</p>
            </div>
          </div>
          <div className="investor-vision-quote">
            <blockquote>
              Sports is the most passionate, tribal, viral place to start.<br />
              The physical world is where it ends up.
            </blockquote>
          </div>
        </div>
      </section>

      {/* Strategic Partner CTA */}
      <section className="investor-cta">
        <div className="container">
          <h2>We&apos;re Looking for a Strategic Partner</h2>
          <p>
            Loud Legacy Ventures needs a partner who understands the behavioral data opportunity,
            the sports engagement space, and the vision to build the identity layer for the physical world.
            This is the ground floor.
          </p>
          <div className="investor-cta-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Request Investor Deck
            </Link>
            <Link href="/contact" className="rally-btn rally-btn--secondary rally-btn--large">
              Schedule a Call
            </Link>
          </div>
          <div className="investor-cta-tagline">
            Loud Legacy Ventures. Prove you were there.
          </div>
        </div>
      </section>

      <InvestorFooter />
    </main>
  );
}
