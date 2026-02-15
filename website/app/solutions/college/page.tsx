import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "College Athletics Solutions - Rally | Fan Engagement for NCAA Programs",
  description:
    "Rally helps college athletic departments drive student section attendance, grow multi-sport engagement, generate fan data, and deliver measurable sponsor activations.",
};

const challenges = [
  {
    problem: "Student section attendance is inconsistent",
    solution: "Check-in incentives with loyalty points, tier rewards, and leaderboards turn showing up into a competition students want to win.",
  },
  {
    problem: "Non-revenue sports struggle for fan engagement",
    solution: "One platform across every sport — fans earn points at football, basketball, baseball, soccer, volleyball, and beyond.",
  },
  {
    problem: "Sponsors want data but you don't have it",
    solution: "Every check-in, interaction, and impression is tracked. Deliver sponsor reports with real fan data, not estimates.",
  },
  {
    problem: "Fan engagement ends when the game does",
    solution: "Push content, trivia, polls, and rewards to fans between games. Keep your program top-of-mind year-round.",
  },
];

const features = [
  {
    title: "Gameday Check-In",
    description: "Geo-verified attendance tracking across all venues — football stadiums, basketball arenas, baseball diamonds, and more.",
  },
  {
    title: "Multi-Sport Engagement",
    description: "One loyalty program across every sport on campus. Fans earn points whether they're at football, soccer, volleyball, or swimming.",
  },
  {
    title: "Student Section Leaderboards",
    description: "Gamify attendance with individual and group leaderboards. Residence halls, Greek life, and student orgs compete for top spots.",
  },
  {
    title: "Sponsor Activations",
    description: "Give local and national sponsors branded trivia, polls, and reward placements with real impression and interaction data.",
  },
  {
    title: "Loyalty Tiers & Rewards",
    description: "Four-tier system with rewards your students actually want — merch, priority seating, meet-and-greets, VIP experiences.",
  },
  {
    title: "Fan Demographics & Analytics",
    description: "Understand who your fans are, how often they attend, and what engages them — broken down by sport, event, and demographic.",
  },
];

const conferences = [
  "ACC", "Big Ten", "Big 12", "SEC", "Pac-12", "Big East",
  "AAC", "Mountain West", "Sun Belt", "Conference USA", "MAC",
  "A-10", "WCC", "Missouri Valley", "Ivy League", "SWAC",
];

const audienceTypes = [
  {
    title: "Athletic Directors",
    description: "Get a unified view of fan engagement across every sport. Rally gives you data to make decisions, not guesses.",
  },
  {
    title: "Marketing & Sponsorship Teams",
    description: "Activate sponsors with measurable impressions and deliver post-event reports with real interaction data.",
  },
  {
    title: "Student Engagement Staff",
    description: "Drive student section attendance with gamified check-ins, leaderboards, and rewards students actually care about.",
  },
  {
    title: "Conference Offices",
    description: "Unified analytics across member schools. See engagement trends, compare programs, and manage league-wide initiatives.",
  },
];

export default function CollegeSolutionsPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero solutions-hero">
        <div className="container">
          <div className="rally-badge">College Athletics</div>
          <h1 className="rally-hero-headline">
            Fill Student Sections.<br />Engage Every Sport. Prove Sponsor ROI.
          </h1>
          <p className="rally-tagline">
            Rally gives college athletic departments the tools to drive attendance,
            engage fans across every sport on campus, and deliver measurable
            sponsor activations — all from one platform.
          </p>
          <div className="hero-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Schedule a Demo
            </Link>
            <Link href="/platform" className="rally-btn rally-btn--secondary rally-btn--large">
              See Full Platform
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="rally-stats">
        <div className="container">
          <div className="rally-stats-grid">
            <div className="rally-stat">
              <span className="rally-stat-value">353+</span>
              <span className="rally-stat-label">NCAA D1 Schools</span>
            </div>
            <div className="rally-stat">
              <span className="rally-stat-value">31</span>
              <span className="rally-stat-label">Conferences</span>
            </div>
            <div className="rally-stat">
              <span className="rally-stat-value">20+</span>
              <span className="rally-stat-label">Sports Per School</span>
            </div>
            <div className="rally-stat">
              <span className="rally-stat-value">100%</span>
              <span className="rally-stat-label">School-Branded</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problems & Solutions */}
      <section className="solutions-challenges">
        <div className="container">
          <h2>The Challenges College Athletics Face</h2>
          <p className="rally-section-subtitle">
            Rally was built to solve the real problems athletic departments deal with every season.
          </p>
          <div className="solutions-challenges-grid">
            {challenges.map((c) => (
              <div key={c.problem} className="solutions-challenge-card">
                <div className="solutions-challenge-problem">
                  <span className="solutions-challenge-label">Challenge</span>
                  <p>{c.problem}</p>
                </div>
                <div className="solutions-challenge-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="solutions-challenge-solution">
                  <span className="solutions-challenge-label solutions-challenge-label--solution">Rally&apos;s Solution</span>
                  <p>{c.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="rally-features">
        <div className="container">
          <h2>Built for College Athletics</h2>
          <p className="rally-section-subtitle">
            Every feature designed with athletic departments, marketing teams, and student engagement in mind.
          </p>
          <div className="rally-feature-grid">
            {features.map((feature) => (
              <div key={feature.title} className="rally-feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conferences */}
      <section className="rally-conferences">
        <div className="container">
          <h2>353+ Schools Across 31 Conferences</h2>
          <p className="rally-section-subtitle">
            Rally supports every NCAA Division I school — from power conferences to mid-majors.
          </p>
          <div className="rally-conference-tags">
            {conferences.map((conf) => (
              <span key={conf} className="rally-conf-tag">{conf}</span>
            ))}
            <span className="rally-conf-tag rally-conf-tag--more">+15 more</span>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="rally-audience">
        <div className="container">
          <h2>Who Uses Rally in College Athletics</h2>
          <div className="rally-audience-grid">
            {audienceTypes.map((a) => (
              <div key={a.title} className="rally-audience-card">
                <h4>{a.title}</h4>
                <p>{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>Ready to Rally Your Campus?</h2>
          <p>See how Rally drives attendance, multi-sport engagement, and sponsor ROI for college athletic departments.</p>
          <div className="rally-cta-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Schedule a Demo
            </Link>
            <Link href="/solutions/professional" className="rally-btn rally-btn--secondary rally-btn--large">
              See Pro Sports Solutions
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
