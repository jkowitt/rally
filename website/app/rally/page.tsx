import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Rally - Fan Engagement & Loyalty Platform | Loud Legacy",
  description:
    "The fan engagement and loyalty platform built for collegiate athletics. Check-ins, predictions, trivia, rewards, and real-time gameday experiences for 353+ NCAA D1 schools.",
};

const features = [
  {
    title: "Gameday Check-In",
    description:
      "Fans earn points for attending games via geofence, Bluetooth beacons, or QR codes. Auto-detects presence at the venue.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Predictions & Trivia",
    description:
      "Engage fans with score predictions, trivia challenges, and live polls tied to real game moments.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Loyalty Tiers & Rewards",
    description:
      "Points engine with Bronze, Silver, Gold, and Platinum tiers. Redeem for merch, priority seating, meet-and-greets, and more.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "Live Activity & Push",
    description:
      "Real-time score updates, gameday countdowns, and targeted push notifications that keep fans in the loop.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
        <path d="M12 2v1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Fan Content Feed",
    description:
      "Photo challenges, video highlights, polls, and articles curated per school. User-generated content drives engagement.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "School-Branded Theming",
    description:
      "Every school gets its own branded experience — colors, mascot, and content automatically adapt to the user's favorite team.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
];

const stats = [
  { value: "353+", label: "NCAA D1 Schools" },
  { value: "31", label: "Conferences" },
  { value: "4", label: "Loyalty Tiers" },
  { value: "10+", label: "Engagement Features" },
];

const audiences = [
  {
    title: "Athletic Departments",
    description:
      "Drive attendance, deepen fan loyalty, and generate actionable engagement data across every sport.",
  },
  {
    title: "Marketing & Sponsorship Teams",
    description:
      "Activate sponsor impressions during gameday, track fan interaction metrics, and prove ROI.",
  },
  {
    title: "Student Sections & Fan Groups",
    description:
      "Compete on leaderboards, unlock exclusive rewards, and rally your section to the top.",
  },
  {
    title: "Conference & NCAA Partners",
    description:
      "Unified analytics across member schools with cross-school engagement tracking.",
  },
  {
    title: "Brand & Merchandise Partners",
    description:
      "Reach highly engaged fans with targeted reward redemptions and sponsor activations.",
  },
];

const conferences = [
  "ACC", "Big Ten", "Big 12", "SEC", "Pac-12", "Big East",
  "AAC", "Mountain West", "Sun Belt", "Conference USA", "MAC",
  "A-10", "WCC", "Missouri Valley", "Ivy League", "SWAC",
];

export default function RallyPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero">
        <div className="container">
          <Image
            src="/logos/rally-logo-transparent-white.png"
            alt="Rally"
            width={240}
            height={60}
            className="rally-hero-logo"
            priority
          />
          <div className="rally-badge">Fan Engagement & Loyalty Platform</div>
          <p className="rally-tagline">
            The gameday experience platform built for collegiate athletics.
            Check-ins, predictions, trivia, rewards, and real-time engagement for 353+ NCAA D1 schools.
          </p>
          <div className="hero-actions">
            <Link href="#features" className="rally-btn rally-btn--primary">
              Explore Features
            </Link>
            <Link href="/contact" className="rally-btn rally-btn--secondary">
              Request Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="rally-stats">
        <div className="container">
          <div className="rally-stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="rally-stat">
                <span className="rally-stat-value">{stat.value}</span>
                <span className="rally-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="rally-preview">
        <div className="container">
          <h2>One App. Every School. Every Gameday.</h2>
          <p className="rally-section-subtitle">
            Rally adapts to each school's brand — colors, mascot, and content —
            creating a unique experience for every fanbase.
          </p>

          <div className="rally-phone-mockup">
            <div className="rally-phone">
              {/* Simulated App Screen */}
              <div className="rally-screen">
                <div className="rally-screen-header">
                  <div className="rally-screen-logo-text">RALLY</div>
                  <div className="rally-screen-avatar" />
                </div>
                <div className="rally-screen-card">
                  <div className="rally-screen-label">NEXT GAME</div>
                  <div className="rally-screen-title">Eagles vs Tigers</div>
                  <div className="rally-screen-date">Sat, Feb 15 · 7:00 PM</div>
                  <div className="rally-screen-countdown">
                    <div className="rally-cd-box"><span>02</span><small>D</small></div>
                    <div className="rally-cd-box"><span>14</span><small>H</small></div>
                    <div className="rally-cd-box"><span>32</span><small>M</small></div>
                    <div className="rally-cd-box"><span>08</span><small>S</small></div>
                  </div>
                </div>
                <div className="rally-screen-stats-row">
                  <div className="rally-screen-stat"><span className="rally-accent">2,450</span><small>Points</small></div>
                  <div className="rally-screen-stat"><span className="rally-tier-pill">Gold</span><small>Tier</small></div>
                  <div className="rally-screen-stat"><span className="rally-accent">#12</span><small>Rank</small></div>
                </div>
                <div className="rally-screen-actions">
                  <div className="rally-screen-action"><div className="rally-sa-icon rally-sa-icon--orange" /><small>Check In</small></div>
                  <div className="rally-screen-action"><div className="rally-sa-icon rally-sa-icon--blue" /><small>Trivia</small></div>
                  <div className="rally-screen-action"><div className="rally-sa-icon rally-sa-icon--purple" /><small>Predict</small></div>
                  <div className="rally-screen-action"><div className="rally-sa-icon rally-sa-icon--pink" /><small>Photo</small></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="rally-features">
        <div className="container">
          <h2>Core Capabilities</h2>
          <p className="rally-section-subtitle">
            Everything a collegiate athletics program needs to engage fans before, during, and after gameday.
          </p>
          <div className="rally-feature-grid">
            {features.map((feature) => (
              <div key={feature.title} className="rally-feature-card">
                <div className="rally-feature-icon">{feature.icon}</div>
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

      {/* Audience */}
      <section className="rally-audience">
        <div className="container">
          <h2>Who Rally Is For</h2>
          <div className="rally-audience-grid">
            {audiences.map((a) => (
              <div key={a.title} className="rally-audience-card">
                <h4>{a.title}</h4>
                <p>{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="rally-how">
        <div className="container">
          <h2>How It Works</h2>
          <div className="rally-steps">
            <div className="rally-step">
              <div className="rally-step-num">1</div>
              <h3>Choose Your School</h3>
              <p>Select one favorite and up to two supporting teams from 353+ NCAA D1 schools.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">2</div>
              <h3>Engage on Gameday</h3>
              <p>Check in at the venue, answer trivia, make predictions, submit photos, and vote in polls.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">3</div>
              <h3>Earn Points & Climb</h3>
              <p>Every action earns points. Level up through Bronze, Silver, Gold, and Platinum tiers.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">4</div>
              <h3>Redeem Rewards</h3>
              <p>Cash in points for exclusive merch, priority seating, meet-and-greets, and VIP perks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>Ready to Rally Your Fanbase?</h2>
          <p>The next generation of fan engagement, built by Loud Legacy.</p>
          <div className="rally-cta-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Request a Demo
            </Link>
            <Link href="/auth/signup" className="rally-btn rally-btn--secondary rally-btn--large">
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
