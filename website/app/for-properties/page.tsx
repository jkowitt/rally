import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "For Teams & Properties - Rally | Fan Engagement Platform",
  description:
    "Rally helps sports properties drive attendance, engage fans, activate sponsors, and capture actionable data. Schedule a demo for your team or property.",
};

const capabilities = [
  {
    title: "Verified Attendance Tracking",
    description: "Geo-verified check-ins give you real data on who shows up, how often, and when — across every event, every sport, every season.",
  },
  {
    title: "Live Fan Engagement Tools",
    description: "Push trivia, predictions, polls, and interactive content to fans in real time — at the venue or watching from home.",
  },
  {
    title: "Configurable Loyalty Engine",
    description: "Define your own rewards, set point values, control tier progression. Every property runs its own branded loyalty program.",
  },
  {
    title: "Sponsorship Activation",
    description: "Give sponsors measurable impressions, targeted fan touchpoints, and real ROI data with branded engagement modules.",
  },
  {
    title: "Fan Analytics Dashboard",
    description: "Demographics, behavior, engagement trends, and attendance patterns — all in one admin dashboard built for your team.",
  },
  {
    title: "White-Label Branding",
    description: "Your colors, your logo, your content. Fans see your brand, powered by Rally. Consistent across iOS, Android, and web.",
  },
];

const propertyTypes = [
  { title: "Professional Sports Teams", description: "NBA, NFL, MLB, NHL, MLS, and UWSL teams." },
  { title: "College Athletic Departments", description: "NCAA D1 schools across 31 conferences." },
  { title: "Leagues & Conferences", description: "Unified analytics across member properties." },
  { title: "Entertainment & Live Events", description: "Concerts, festivals, and recurring events." },
];

const valueProps = [
  { metric: "Attendance", headline: "Drive Attendance & Retention", description: "Check-in incentives, loyalty tiers, and exclusive rewards give fans a reason to come back every game." },
  { metric: "Engagement", headline: "Engage Fans Beyond the Scoreboard", description: "Keep fans active before, during, and after the game with interactive content and year-round engagement." },
  { metric: "Revenue", headline: "Unlock Sponsor Revenue", description: "Give sponsors measurable activations with real impression data and demographic breakdowns." },
  { metric: "Data", headline: "Know Your Fanbase", description: "First-party fan data — demographics, behavior, attendance patterns — in one actionable dashboard." },
];

export default function ForPropertiesPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero">
        <div className="container">
          <Image
            src="/logos/rally-logo-transparent-white.png"
            alt="Rally"
            width={200}
            height={50}
            className="rally-hero-logo"
            priority
          />
          <div className="rally-badge">For Teams & Properties</div>
          <h1 className="rally-hero-headline">
            The Fan Engagement Platform<br />Built for Sports Properties
          </h1>
          <p className="rally-tagline">
            Rally gives your property the tools to engage fans, activate sponsors,
            capture real data, and drive measurable outcomes — across every league and every gameday.
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

      {/* Value Props */}
      <section className="rally-value-props">
        <div className="container">
          <h2>What Rally Does for Your Property</h2>
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

      {/* Capabilities */}
      <section className="rally-features">
        <div className="container">
          <h2>Platform Capabilities</h2>
          <p className="rally-section-subtitle">
            Everything your property needs to engage fans, activate sponsors, and generate actionable data.
          </p>
          <div className="rally-feature-grid">
            {capabilities.map((cap) => (
              <div key={cap.title} className="rally-feature-card">
                <h3>{cap.title}</h3>
                <p>{cap.description}</p>
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

      {/* Property Types */}
      <section className="rally-audience">
        <div className="container">
          <h2>Built for Properties of Every Size</h2>
          <div className="rally-audience-grid">
            {propertyTypes.map((pt) => (
              <div key={pt.title} className="rally-audience-card">
                <h4>{pt.title}</h4>
                <p>{pt.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works for Properties */}
      <section className="rally-how">
        <div className="container">
          <h2>How It Works for Properties</h2>
          <div className="rally-steps">
            <div className="rally-step">
              <div className="rally-step-num">1</div>
              <h3>Set Up Your Property</h3>
              <p>We configure Rally with your branding, events calendar, and reward catalog. Live in days, not months.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">2</div>
              <h3>Fans Join & Engage</h3>
              <p>Fans follow your team in Rally. They check in, play trivia, earn points, and redeem rewards — all in your brand.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">3</div>
              <h3>Capture Data</h3>
              <p>Track attendance, engagement, demographics, and behavior in real time from your admin dashboard.</p>
            </div>
            <div className="rally-step">
              <div className="rally-step-num">4</div>
              <h3>Activate Sponsors</h3>
              <p>Deliver measurable activations to sponsors with real impression data, interaction metrics, and demographic breakdowns.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>See Rally for Your Property</h2>
          <p>Schedule a personalized walkthrough and see how Rally can drive attendance, engagement, and sponsor ROI for your team.</p>
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
