import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Entertainment & Live Events Solutions - Rally | Fan Engagement for Events",
  description:
    "Rally helps concerts, festivals, and live entertainment properties drive attendance, engage audiences, activate sponsors, and build loyalty programs.",
};

const eventTypes = [
  {
    title: "Concerts & Tours",
    description: "Reward fans for attending shows, create loyalty programs that span entire tours, and give sponsors measurable touchpoints at every venue.",
  },
  {
    title: "Music Festivals",
    description: "Multi-stage check-ins, artist-specific trivia, real-time polls, and sponsor activations across a multi-day experience.",
  },
  {
    title: "Comedy & Theater",
    description: "Drive repeat attendance with loyalty tiers, pre-show engagement, and exclusive rewards for your most dedicated audience members.",
  },
  {
    title: "Esports & Gaming Events",
    description: "Live predictions, match trivia, team loyalty programs, and sponsor-branded challenges designed for digital-native audiences.",
  },
  {
    title: "Recurring Venue Events",
    description: "For venues with weekly or seasonal programming — build long-term audience loyalty with attendance streaks and progressive rewards.",
  },
  {
    title: "Sports Entertainment",
    description: "Wrestling, boxing, MMA, and hybrid sports-entertainment events. Engage fans with predictions, real-time polls, and branded experiences.",
  },
];

const challenges = [
  {
    problem: "You don't know who's in the audience",
    solution: "Geo-verified check-ins capture real attendance data with demographic insights. Know your audience by name, not by ticket count.",
  },
  {
    problem: "Sponsors want more than logo placement",
    solution: "Give sponsors interactive activations — branded trivia, polls, and rewards — with real impression and interaction data.",
  },
  {
    problem: "Fans attend once and never come back",
    solution: "Loyalty tiers and progressive rewards incentivize repeat attendance. Fans earn points, climb tiers, and unlock exclusive perks.",
  },
  {
    problem: "No way to engage fans between events",
    solution: "Push content, announcements, trivia, and reward milestones between events. Stay in your audience's pocket year-round.",
  },
];

const features = [
  {
    title: "Venue Check-In",
    description: "Geo-verified attendance tracking that works at any venue — arenas, amphitheaters, clubs, convention centers, and outdoor stages.",
  },
  {
    title: "Live Audience Engagement",
    description: "Push polls, trivia, and interactive content to attendees in real time. Turn a passive audience into active participants.",
  },
  {
    title: "Event-Based Loyalty",
    description: "Loyalty programs that span single events, multi-event series, or entire seasons. Configurable tiers and rewards for any format.",
  },
  {
    title: "Sponsor Integration",
    description: "Branded engagement modules with full impression tracking. Give sponsors the data they need to measure ROI and renew.",
  },
  {
    title: "Audience Analytics",
    description: "Demographics, attendance patterns, engagement rates, and behavioral data — all in one dashboard built for entertainment operators.",
  },
  {
    title: "Event Branding",
    description: "Each event or venue gets its own branded experience within Rally. Your look, your content, your audience.",
  },
];

export default function EntertainmentSolutionsPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero solutions-hero">
        <div className="container">
          <div className="rally-badge">Entertainment & Live Events</div>
          <h1 className="rally-hero-headline">
            Engage Every Audience.<br />Reward Every Fan. Activate Every Sponsor.
          </h1>
          <p className="rally-tagline">
            Rally brings the same powerful fan engagement and loyalty tools used by major sports
            properties to concerts, festivals, theaters, esports, and live entertainment
            of every kind.
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

      {/* Event Types */}
      <section className="solutions-leagues">
        <div className="container">
          <h2>Rally for Every Type of Live Event</h2>
          <p className="rally-section-subtitle">
            Whether it&apos;s a sold-out arena or an intimate venue, Rally adapts to your audience and your format.
          </p>
          <div className="solutions-leagues-grid">
            {eventTypes.map((et) => (
              <div key={et.title} className="solutions-league-card">
                <h3>{et.title}</h3>
                <p>{et.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Challenges */}
      <section className="solutions-challenges">
        <div className="container">
          <h2>The Challenges Entertainment Properties Face</h2>
          <p className="rally-section-subtitle">
            Rally was built to solve the real problems live entertainment operators deal with every event.
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
          <h2>Built for Live Entertainment</h2>
          <p className="rally-section-subtitle">
            Every feature designed for the pace, scale, and variety of live entertainment.
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
          <h2>Ready to Engage Your Audience?</h2>
          <p>See how Rally drives attendance, audience loyalty, and sponsor ROI for entertainment and live event properties.</p>
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
