import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const features = [
  {
    title: "Gameday Check-In",
    description: "Fans earn points for attending games via geolocation verification. Pre-check-in before you arrive; points auto-award when you enter the venue zone.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Predictions & Trivia",
    description: "Engage fans with score predictions, trivia challenges, and live polls tied to real game moments across every league.",
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
    description: "Points engine with Bronze, Silver, Gold, and Platinum tiers. Redeem for merch, experiences, concessions, digital perks, and VIP access.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "Live Engagements & Ads",
    description: "Admins push polls, trivia, sponsor activations, and promotions to fans in real time — at the venue or watching from home.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
        <path d="M12 2v1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Remote Tune-In",
    description: "Fans watching on TV or streaming can tune in remotely — earn points, interact with live content, and get served sponsor touchpoints from anywhere.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Team-Branded Theming",
    description: "Every property gets its own branded experience — colors, logo, and content automatically adapt to the fan's favorite teams.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
];

const stats = [
  { value: "520+", label: "Teams & Schools" },
  { value: "7", label: "Leagues" },
  { value: "4", label: "Loyalty Tiers" },
  { value: "15+", label: "Engagement Features" },
];

const leagues = [
  { name: "College", count: "353+ Schools", color: "#FF6B35" },
  { name: "NBA", count: "30 Teams", color: "#1D428A" },
  { name: "NFL", count: "32 Teams", color: "#013369" },
  { name: "MLB", count: "30 Teams", color: "#002D72" },
  { name: "NHL", count: "32 Teams", color: "#000000" },
  { name: "MLS", count: "29 Teams", color: "#6CC24A" },
  { name: "UWSL", count: "14 Teams", color: "#B31942" },
];

export default function HomePage() {
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
            The fan experience platform built for sports and entertainment.
            Check-ins, live interactions, rewards, and real-time engagement across
            College, NBA, NFL, MLB, NHL, MLS, UWSL, and beyond.
          </p>
          <div className="hero-actions">
            <Link href="/auth/signup" className="rally-btn rally-btn--primary">
              Get Started Free
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
          <h2>One App. Every League. Every Gameday.</h2>
          <p className="rally-section-subtitle">
            Rally adapts to every team&apos;s brand — colors, logo, and content —
            creating a unique experience for every fanbase, from college to the pros.
          </p>

          <div className="rally-phone-mockup">
            <div className="rally-phone">
              <div className="rally-screen">
                <div className="rally-screen-header">
                  <div className="rally-screen-logo-text">RALLY</div>
                  <div className="rally-screen-avatar" />
                </div>
                <div className="rally-screen-card">
                  <div className="rally-screen-label">YOUR TEAM</div>
                  <div className="rally-screen-title">Gameday Experience</div>
                  <div className="rally-screen-date">Events &middot; Points &middot; Rewards</div>
                </div>
                <div className="rally-screen-stats-row">
                  <div className="rally-screen-stat"><span className="rally-accent">---</span><small>Points</small></div>
                  <div className="rally-screen-stat"><span className="rally-tier-pill">Tier</span><small>Level</small></div>
                  <div className="rally-screen-stat"><span className="rally-accent">---</span><small>Rank</small></div>
                </div>
                <div className="rally-screen-actions">
                  <div className="rally-screen-action"><div className="rally-sa-icon rally-sa-icon--orange" /><small>Check In</small></div>
                  <div className="rally-screen-action"><div className="rally-sa-icon rally-sa-icon--blue" /><small>Trivia</small></div>
                  <div className="rally-screen-action"><div className="rally-sa-icon rally-sa-icon--purple" /><small>Predict</small></div>
                  <div className="rally-screen-action"><div className="rally-sa-icon rally-sa-icon--pink" /><small>Rewards</small></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leagues */}
      <section id="leagues" className="rally-conferences">
        <div className="container">
          <h2>520+ Properties Across 7 Leagues</h2>
          <p className="rally-section-subtitle">
            Rally covers the full spectrum of sports — from NCAA Division I athletics
            to every major professional league and women&apos;s soccer.
          </p>
          <div className="rally-conference-tags">
            {leagues.map((league) => (
              <span
                key={league.name}
                className="rally-conf-tag"
                style={{ borderColor: league.color, color: league.color }}
              >
                {league.name} &middot; {league.count}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="rally-features">
        <div className="container">
          <h2>Core Capabilities</h2>
          <p className="rally-section-subtitle">
            Everything sports properties and entertainment brands need to engage
            fans before, during, and after gameday — at the venue or on the couch.
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

      {/* Who It's For */}
      <section className="rally-audience">
        <div className="container">
          <h2>Who Rally Is For</h2>
          <div className="rally-audience-grid">
            {[
              { title: "Professional Sports Teams", description: "NBA, NFL, MLB, NHL, MLS, and UWSL teams use Rally to deepen fan loyalty, drive in-app engagement, and deliver measurable sponsor activations." },
              { title: "College Athletic Departments", description: "Drive attendance, grow student sections, and generate actionable engagement data across every sport on campus." },
              { title: "Leagues & Conferences", description: "Unified analytics across member teams with cross-property engagement tracking, fan insights, and league-wide reward programs." },
              { title: "Sponsors & Brand Partners", description: "Reach highly engaged fans at the venue and at home with targeted activations, impression tracking, and real ROI data." },
              { title: "Entertainment & Live Events", description: "Concerts, festivals, and live entertainment properties can leverage Rally for check-ins, rewards, and audience engagement." },
            ].map((a) => (
              <div key={a.title} className="rally-audience-card">
                <h4>{a.title}</h4>
                <p>{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="rally-how">
        <div className="container">
          <h2>How It Works</h2>
          <div className="rally-steps">
            <div className="rally-step">
              <div className="rally-step-num">1</div>
              <h3>Follow Your Teams</h3>
              <p>Select your favorites across College, NBA, NFL, MLB, NHL, MLS, UWSL — up to 20 teams from any league.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">2</div>
              <h3>Engage on Gameday</h3>
              <p>Check in at the venue or tune in from home. Answer trivia, make predictions, vote in polls, and interact with live content.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">3</div>
              <h3>Earn Points & Climb</h3>
              <p>Every action earns points. Level up through Bronze, Silver, Gold, and Platinum tiers across all your teams.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">4</div>
              <h3>Redeem Rewards</h3>
              <p>Cash in points for merch, VIP access, concessions, digital perks, meet-and-greets — verified and fulfilled by the team.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>Ready to Rally Your Fanbase?</h2>
          <p>The next generation of fan engagement — from college to the pros. Built by Loud Legacy.</p>
          <div className="rally-cta-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Request a Demo
            </Link>
            <Link href="/auth/signup" className="rally-btn rally-btn--secondary rally-btn--large">
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
