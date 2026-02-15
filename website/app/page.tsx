import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const platformCapabilities = [
  {
    title: "Gameday Check-In",
    description: "Geolocation-verified attendance tracking gives you real data on who shows up, how often, and when — across every event, every sport, every season.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Live Fan Engagement",
    description: "Push trivia, predictions, polls, and sponsor activations to fans in real time — at the venue or watching from home. Every interaction is a data point.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
        <path d="M12 2v1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Loyalty & Rewards Engine",
    description: "A fully configurable points and tier system. You define the rewards, set redemption rules, and control the fan journey from Bronze to Platinum.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "Sponsorship Activation",
    description: "Give sponsors measurable impressions, targeted fan touchpoints, and real ROI data. Activate brand partners at the venue and on second screens.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a4 4 0 00-8 0v2" />
      </svg>
    ),
  },
  {
    title: "Fan Analytics & Insights",
    description: "Demographics, behavior, engagement trends, and attendance patterns — all in one dashboard. Know your fanbase better than ever before.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "White-Label Branding",
    description: "Every property gets its own branded experience — your colors, your logo, your content. Fans see your brand, not ours.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
];

const stats = [
  { value: "520+", label: "Properties Supported" },
  { value: "7", label: "Major Leagues" },
  { value: "15+", label: "Engagement Tools" },
  { value: "100%", label: "White-Label" },
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

const propertyTypes = [
  {
    title: "Professional Sports Teams",
    description: "NBA, NFL, MLB, NHL, MLS, and UWSL teams use Rally to deepen fan loyalty, drive in-app engagement, and deliver measurable sponsor activations across every home game and road broadcast.",
    link: "/solutions/professional",
    linkText: "Pro Sports Solutions",
  },
  {
    title: "College Athletic Departments",
    description: "Drive student section attendance, grow multi-sport engagement, generate actionable fan data, and give sponsors measurable gameday impressions across every sport on campus.",
    link: "/solutions/college",
    linkText: "College Solutions",
  },
  {
    title: "Leagues & Conferences",
    description: "Unified analytics across member teams with cross-property engagement tracking, league-wide reward programs, and centralized sponsor activation reporting.",
    link: "/contact",
    linkText: "Talk to Sales",
  },
  {
    title: "Entertainment & Live Events",
    description: "Concerts, festivals, and live entertainment properties leverage Rally for check-ins, audience engagement, sponsor activations, and loyalty programs that bring fans back.",
    link: "/solutions/entertainment",
    linkText: "Entertainment Solutions",
  },
];

const valueProps = [
  {
    metric: "Attendance",
    headline: "Drive Attendance & Retention",
    description: "Reward fans for showing up. Check-in incentives, loyalty tiers, and exclusive gameday rewards give fans a reason to come back — and come early.",
  },
  {
    metric: "Engagement",
    headline: "Engage Fans Beyond the Scoreboard",
    description: "Trivia, predictions, polls, and live content keep fans engaged before, during, and after the game — whether they're in the arena or watching from the couch.",
  },
  {
    metric: "Revenue",
    headline: "Unlock New Revenue Streams",
    description: "Sponsor activations with real impression data. Targeted fan offers. Reward redemptions that drive concession and merch sales. Rally turns engagement into revenue.",
  },
  {
    metric: "Data",
    headline: "Know Your Fanbase",
    description: "Demographic insights, behavioral analytics, attendance patterns, and engagement trends — all in one place. Make decisions backed by real fan data, not guesswork.",
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
          <div className="rally-badge">Fan Engagement & Loyalty Platform for Sports Properties</div>
          <h1 className="rally-hero-headline">
            Turn Every Gameday Into a<br />Revenue-Driving Experience
          </h1>
          <p className="rally-tagline">
            Rally gives sports properties the tools to engage fans, activate sponsors,
            and capture real data — across College, NBA, NFL, MLB, NHL, MLS, UWSL,
            and live entertainment.
          </p>
          <div className="hero-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Schedule a Demo
            </Link>
            <Link href="/platform" className="rally-btn rally-btn--secondary rally-btn--large">
              Explore the Platform
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

      {/* Value Propositions */}
      <section className="rally-value-props">
        <div className="container">
          <h2>What Rally Does for Your Property</h2>
          <p className="rally-section-subtitle">
            Rally isn&apos;t just a fan app — it&apos;s a platform that drives measurable outcomes for sports properties and entertainment brands.
          </p>
          <div className="rally-value-grid">
            {valueProps.map((vp) => (
              <div key={vp.metric} className="rally-value-card">
                <div className="rally-value-metric">{vp.metric}</div>
                <h3>{vp.headline}</h3>
                <p>{vp.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leagues */}
      <section id="leagues" className="rally-conferences">
        <div className="container">
          <h2>Built for Every League</h2>
          <p className="rally-section-subtitle">
            From NCAA Division I athletics to every major professional league and women&apos;s soccer —
            Rally supports 520+ properties across 7 leagues.
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

      {/* Platform Capabilities */}
      <section id="platform" className="rally-features">
        <div className="container">
          <h2>Platform Capabilities</h2>
          <p className="rally-section-subtitle">
            Everything your property needs to engage fans, activate sponsors,
            and generate actionable data — before, during, and after gameday.
          </p>
          <div className="rally-feature-grid">
            {platformCapabilities.map((feature) => (
              <div key={feature.title} className="rally-feature-card">
                <div className="rally-feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="rally-features-cta">
            <Link href="/platform" className="rally-btn rally-btn--secondary">
              See Full Platform Details
            </Link>
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section id="solutions" className="rally-audience">
        <div className="container">
          <h2>Built for Sports Properties of Every Size</h2>
          <p className="rally-section-subtitle">
            Whether you&apos;re a Power 5 program, a mid-market pro team, or a live entertainment brand —
            Rally scales to your audience.
          </p>
          <div className="rally-audience-grid">
            {propertyTypes.map((pt) => (
              <div key={pt.title} className="rally-audience-card rally-audience-card--linked">
                <h4>{pt.title}</h4>
                <p>{pt.description}</p>
                <Link href={pt.link} className="rally-audience-link">
                  {pt.linkText} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Properties Use Rally */}
      <section id="how-it-works" className="rally-how">
        <div className="container">
          <h2>How Properties Use Rally</h2>
          <div className="rally-steps">
            <div className="rally-step">
              <div className="rally-step-num">1</div>
              <h3>Set Up Your Property</h3>
              <p>We configure Rally with your branding, sports, events calendar, and reward catalog. Your property is live in days, not months.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">2</div>
              <h3>Engage Fans on Gameday</h3>
              <p>Push check-ins, trivia, predictions, polls, and sponsor activations to fans at the venue and watching at home — all from your admin dashboard.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">3</div>
              <h3>Capture Data & Insights</h3>
              <p>Track attendance, engagement, demographics, and behavior patterns in real time. See exactly how fans interact with your property.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">4</div>
              <h3>Prove ROI to Sponsors</h3>
              <p>Deliver impression reports, interaction metrics, and audience demographics to sponsors and brand partners with real, verifiable data.</p>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="rally-preview">
        <div className="container">
          <h2>One Platform. Your Brand. Every Gameday.</h2>
          <p className="rally-section-subtitle">
            Rally adapts to every property&apos;s brand — your colors, your logo, your content —
            creating a unique branded experience for your fanbase.
          </p>
          <div className="rally-phone-mockup">
            <div className="rally-phone">
              <div className="rally-screen">
                <div className="rally-screen-header">
                  <div className="rally-screen-logo-text">RALLY</div>
                  <div className="rally-screen-avatar" />
                </div>
                <div className="rally-screen-card">
                  <div className="rally-screen-label">YOUR BRAND</div>
                  <div className="rally-screen-title">Your Gameday Experience</div>
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

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>Ready to Rally Your Fanbase?</h2>
          <p>See how Rally drives attendance, engagement, and sponsor ROI for sports properties across every league. Built by Loud Legacy.</p>
          <div className="rally-cta-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Schedule a Demo
            </Link>
            <Link href="/use-cases" className="rally-btn rally-btn--secondary rally-btn--large">
              See Use Cases
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
