import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const features = [
  {
    title: "Check In on Gameday",
    description: "Show up, check in, earn points. Rally uses your location to verify you're at the game — then rewards you for being there.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Trivia & Predictions",
    description: "Test your knowledge with live trivia, predict game outcomes, and vote in real-time polls. Every answer earns you points.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Earn Points & Level Up",
    description: "Every check-in, every trivia answer, every prediction earns points. Climb from Bronze to Silver to Gold to Platinum across all your teams.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "Redeem Real Rewards",
    description: "Cash in your points for merch, concessions, VIP experiences, meet-and-greets, and exclusive perks from your favorite teams.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a4 4 0 00-8 0v2" />
      </svg>
    ),
  },
  {
    title: "Watch from Anywhere",
    description: "Can't make the game? Tune in remotely and still earn points, play trivia, make predictions, and compete on leaderboards from the couch.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Your Team, Your Colors",
    description: "Rally transforms to match your team's brand — colors, logo, and content. Follow up to 20 teams across any league.",
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
  { value: "15+", label: "Ways to Earn" },
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

const communityTypes = [
  {
    title: "Students & Student Sections",
    description: "Compete with your section, rep your dorm or org on leaderboards, and earn exclusive rewards just for showing up and being loud.",
  },
  {
    title: "Season Ticket Holders",
    description: "Get more from every game. Check-in streaks, tier progression, and VIP rewards that recognize your loyalty all season long.",
  },
  {
    title: "Die-Hard Fans",
    description: "Follow multiple teams across any league. Earn points everywhere, track your stats, and prove you're the biggest fan in your crew.",
  },
  {
    title: "Casual & Remote Fans",
    description: "Watching from the couch counts. Tune in, play trivia, make predictions, and earn rewards even when you can't be at the venue.",
  },
  {
    title: "Alumni & Boosters",
    description: "Stay connected to your school's athletics long after graduation. Check in at away games, compete with fellow alumni, and support your program.",
  },
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
          <div className="rally-badge">The Sports Community App</div>
          <h1 className="rally-hero-headline">
            Your Teams. Your Rewards.<br />Your Community.
          </h1>
          <p className="rally-tagline">
            Rally is the gameday experience app for sports fans. Check in at games,
            compete in trivia, earn points, climb loyalty tiers, and redeem real
            rewards — across College, NBA, NFL, MLB, NHL, MLS, UWSL, and live events.
          </p>
          <div className="hero-actions">
            <Link href="/auth/signup" className="rally-btn rally-btn--primary rally-btn--large">
              Join Rally Free
            </Link>
            <Link href="/how-it-works" className="rally-btn rally-btn--secondary rally-btn--large">
              See How It Works
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
          <h2>One App. Every Team. Every Gameday.</h2>
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
                  <div className="rally-screen-stat"><span className="rally-accent">2,450</span><small>Points</small></div>
                  <div className="rally-screen-stat"><span className="rally-tier-pill">Gold</span><small>Tier</small></div>
                  <div className="rally-screen-stat"><span className="rally-accent">#12</span><small>Rank</small></div>
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
          <h2>Follow Your Favorite Teams</h2>
          <p className="rally-section-subtitle">
            520+ teams and schools across 7 leagues. Find your team, follow them in Rally,
            and start earning.
          </p>
          <div className="rally-conference-tags">
            {leagues.map((league) => (
              <Link
                key={league.name}
                href="/leagues"
                className="rally-conf-tag"
                style={{ borderColor: league.color, color: league.color }}
              >
                {league.name} &middot; {league.count}
              </Link>
            ))}
          </div>
          <div className="rally-features-cta" style={{ marginTop: '2rem' }}>
            <Link href="/leagues" className="rally-btn rally-btn--secondary">
              Browse All Leagues &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="rally-features">
        <div className="container">
          <h2>Everything You Need on Gameday</h2>
          <p className="rally-section-subtitle">
            Rally gives you more reasons to show up, more ways to engage,
            and real rewards for being a fan.
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

      {/* Who Rally Is For */}
      <section className="rally-audience">
        <div className="container">
          <h2>Rally Is for Every Kind of Fan</h2>
          <div className="rally-audience-grid">
            {communityTypes.map((ct) => (
              <div key={ct.title} className="rally-audience-card">
                <h4>{ct.title}</h4>
                <p>{ct.description}</p>
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
              <p>Pick your favorites across College, NBA, NFL, MLB, NHL, MLS, and UWSL — follow up to 20 teams from any league.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">2</div>
              <h3>Show Up & Engage</h3>
              <p>Check in at the venue or tune in from home. Play trivia, make predictions, vote in polls, and interact with live content.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">3</div>
              <h3>Earn Points & Climb</h3>
              <p>Every action earns points. Level up through Bronze, Silver, Gold, and Platinum tiers across all your teams.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">4</div>
              <h3>Redeem Rewards</h3>
              <p>Cash in points for merch, VIP access, concessions, meet-and-greets, and exclusive experiences from your teams.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>Ready to Rally?</h2>
          <p>Join the community of fans earning rewards across every league. Free to join, free to play.</p>
          <div className="rally-cta-actions">
            <Link href="/auth/signup" className="rally-btn rally-btn--primary rally-btn--large">
              Get Started Free
            </Link>
            <Link href="/rewards" className="rally-btn rally-btn--secondary rally-btn--large">
              See Rewards
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
