import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Professional Sports Solutions - Rally | Fan Engagement for Pro Teams",
  description:
    "Rally helps professional sports teams across NBA, NFL, MLB, NHL, MLS, and UWSL drive fan loyalty, activate sponsors, and capture actionable fan data.",
};

const leagues = [
  { name: "NBA", teams: "30 Teams", description: "Drive arena attendance and engage fans on broadcast nights with real-time trivia, predictions, and sponsor activations." },
  { name: "NFL", teams: "32 Teams", description: "Maximize gameday ROI across 8+ home games with check-ins, tailgate engagement, and season-long loyalty programs." },
  { name: "MLB", teams: "30 Teams", description: "Keep fans engaged across 81 home games with daily trivia, attendance streaks, and progressive reward tiers." },
  { name: "NHL", teams: "32 Teams", description: "Rally arena crowds and remote viewers with live predictions, intermission content, and sponsor-branded challenges." },
  { name: "MLS", teams: "29 Teams", description: "Build supporter culture with group leaderboards, match-day check-ins, and community-driven engagement." },
  { name: "UWSL", teams: "14 Teams", description: "Grow a new fanbase from the ground up with loyalty incentives, social engagement, and founding-fan reward programs." },
];

const challenges = [
  {
    problem: "Fan engagement drops between games",
    solution: "Push trivia, predictions, content, and reward milestones between games. Keep your brand in fans' hands year-round.",
  },
  {
    problem: "Sponsors want measurable ROI, not estimates",
    solution: "Every sponsor activation is tracked — impressions, interactions, demographics. Deliver reports with real data.",
  },
  {
    problem: "You don't truly know your fanbase",
    solution: "Rally captures demographics, behavior, attendance patterns, and engagement trends. Know your fans as individuals, not ticket numbers.",
  },
  {
    problem: "Remote fans are invisible",
    solution: "Tune-in verification, second-screen engagement, and remote rewards let you reach and measure the 90% of fans watching from home.",
  },
];

const features = [
  {
    title: "Arena & Stadium Check-In",
    description: "Geo-verified attendance tracking at every home event. Pre-check-in, auto-verify on arrival, and track attendance streaks across seasons.",
  },
  {
    title: "Second Screen Engagement",
    description: "Reach fans watching at home with real-time trivia, predictions, and polls synced to the live broadcast. Every remote interaction counts.",
  },
  {
    title: "Sponsor Activation Suite",
    description: "Branded engagement modules, targeted impressions, and post-game reporting. Give sponsors the data they need to renew and expand.",
  },
  {
    title: "Tiered Loyalty Programs",
    description: "Season-long progression through Bronze, Silver, Gold, and Platinum. Reward your most loyal fans with experiences money can't buy.",
  },
  {
    title: "Fan Intelligence Dashboard",
    description: "Real-time analytics on attendance, engagement, demographics, and behavior. Segment your fanbase and make data-driven decisions.",
  },
  {
    title: "Full Brand Control",
    description: "Your team colors, your logo, your content. Rally is invisible — fans experience your brand, powered by our platform.",
  },
];

export default function ProfessionalSolutionsPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero solutions-hero">
        <div className="container">
          <div className="rally-badge">Professional Sports</div>
          <h1 className="rally-hero-headline">
            Deepen Fan Loyalty.<br />Activate Sponsors. Own Your Data.
          </h1>
          <p className="rally-tagline">
            Rally gives professional sports teams across NBA, NFL, MLB, NHL, MLS, and UWSL
            the tools to engage fans at the arena and at home, deliver measurable
            sponsor activations, and capture the fan data that drives decisions.
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
              <span className="rally-stat-value">6</span>
              <span className="rally-stat-label">Major Leagues</span>
            </div>
            <div className="rally-stat">
              <span className="rally-stat-value">167</span>
              <span className="rally-stat-label">Professional Teams</span>
            </div>
            <div className="rally-stat">
              <span className="rally-stat-value">In-Venue</span>
              <span className="rally-stat-label">+ Remote Engagement</span>
            </div>
            <div className="rally-stat">
              <span className="rally-stat-value">100%</span>
              <span className="rally-stat-label">Team-Branded</span>
            </div>
          </div>
        </div>
      </section>

      {/* League Breakdown */}
      <section className="solutions-leagues">
        <div className="container">
          <h2>Rally Across Every Major League</h2>
          <p className="rally-section-subtitle">
            Each league has its own rhythm, schedule, and fan culture. Rally adapts to all of them.
          </p>
          <div className="solutions-leagues-grid">
            {leagues.map((league) => (
              <div key={league.name} className="solutions-league-card">
                <div className="solutions-league-header">
                  <h3>{league.name}</h3>
                  <span className="solutions-league-count">{league.teams}</span>
                </div>
                <p>{league.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Challenges */}
      <section className="solutions-challenges">
        <div className="container">
          <h2>The Challenges Pro Teams Face</h2>
          <p className="rally-section-subtitle">
            Rally was built to solve the real problems professional sports organizations deal with every season.
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
          <h2>Built for Professional Sports</h2>
          <p className="rally-section-subtitle">
            Every feature designed for the scale, speed, and sponsor expectations of professional sports.
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

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>Ready to Rally Your Fanbase?</h2>
          <p>See how Rally drives loyalty, engagement, and sponsor ROI for professional sports teams across every major league.</p>
          <div className="rally-cta-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Schedule a Demo
            </Link>
            <Link href="/solutions/college" className="rally-btn rally-btn--secondary rally-btn--large">
              See College Solutions
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
