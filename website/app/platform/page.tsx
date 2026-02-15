import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Platform - Rally | Fan Engagement & Loyalty for Sports Properties",
  description:
    "Explore Rally's full platform: gameday check-ins, live engagement, loyalty tiers, sponsor activations, fan analytics, white-label branding, and more.",
};

const platformSections = [
  {
    id: "check-in",
    title: "Gameday Check-In & Attendance",
    subtitle: "Know exactly who shows up — and reward them for it.",
    description: "Rally uses geolocation-verified check-ins to track real attendance across every event. Fans can pre-check-in before arriving and auto-verify when they enter the venue zone. You get verified attendance data by event, sport, and season.",
    capabilities: [
      "Geofence and GPS-based venue verification",
      "Pre-check-in with automatic confirmation on arrival",
      "Multi-venue support for properties with multiple facilities",
      "Attendance analytics by event, sport, demographic, and season",
      "Check-in streaks and bonus incentives for repeat attendance",
      "Remote tune-in tracking for broadcast and streaming audiences",
    ],
  },
  {
    id: "engagement",
    title: "Live Fan Engagement",
    subtitle: "Turn passive spectators into active participants.",
    description: "Push interactive content to fans in real time — at the venue or watching from home. Trivia, predictions, polls, and sponsor-branded activations drive engagement and capture valuable interaction data.",
    capabilities: [
      "Real-time trivia challenges tied to live game moments",
      "Score and outcome predictions with leaderboard rankings",
      "Live polls and fan voting during events",
      "Photo challenges and user-generated content campaigns",
      "Sponsor-branded engagement modules with impression tracking",
      "Push notifications and in-app alerts for live content",
    ],
  },
  {
    id: "loyalty",
    title: "Loyalty Tiers & Rewards",
    subtitle: "Build a loyalty program your fans actually care about.",
    description: "A fully configurable points and tier engine. Define your own reward catalog, set point values for every action, and control how fans progress through Bronze, Silver, Gold, and Platinum tiers. Every property runs its own program.",
    capabilities: [
      "Four-tier loyalty system: Bronze, Silver, Gold, Platinum",
      "Configurable point values for check-ins, interactions, and actions",
      "Custom reward catalog managed by your team",
      "Reward categories: merch, experiences, concessions, digital, VIP access",
      "Automated tier progression with milestone notifications",
      "Redemption verification and fulfillment tracking",
    ],
  },
  {
    id: "sponsors",
    title: "Sponsorship Activation",
    subtitle: "Give your sponsors data they can actually use.",
    description: "Rally turns every fan interaction into a measurable touchpoint for sponsors. Brand partners get targeted impressions at the venue and on second screens, with real interaction data and demographic breakdowns they can take to their own stakeholders.",
    capabilities: [
      "Sponsor-branded trivia, polls, and engagement modules",
      "Impression tracking with demographic breakdowns",
      "In-venue and remote audience activation",
      "Custom sponsor reward placements in the loyalty catalog",
      "Post-event activation reports with fan interaction metrics",
      "Multi-sponsor support with separate tracking per brand partner",
    ],
  },
  {
    id: "analytics",
    title: "Fan Analytics & Insights",
    subtitle: "Make decisions backed by real fan data.",
    description: "Rally captures engagement, attendance, demographics, and behavioral data across every event. Your admin dashboard surfaces actionable insights that help you understand your fanbase, improve gameday experiences, and prove ROI to stakeholders.",
    capabilities: [
      "Real-time attendance and engagement dashboards",
      "Fan demographics: age, location, gender, affiliation",
      "Behavioral patterns: engagement frequency, check-in streaks, reward preferences",
      "Event-level analytics with comparison across seasons",
      "Sponsor activation reporting with impression and interaction metrics",
      "Exportable reports for stakeholder presentations",
    ],
  },
  {
    id: "branding",
    title: "White-Label Branding",
    subtitle: "Your brand. Your colors. Your experience.",
    description: "Every property on Rally gets a fully branded fan experience. Your colors, your logo, your content — automatically applied across the entire app. Fans see your brand, not ours. Multi-team fans get seamless transitions between their favorite properties.",
    capabilities: [
      "Automatic brand theming: colors, logo, and visual identity",
      "Property-specific content feeds and event calendars",
      "Branded push notifications and engagement modules",
      "Custom reward catalog with your branding",
      "Multi-property support: fans follow up to 20 teams across leagues",
      "Consistent brand experience across iOS, Android, and web",
    ],
  },
  {
    id: "admin",
    title: "Admin Dashboard & Content Management",
    subtitle: "Run your entire fan engagement program from one place.",
    description: "The Rally admin dashboard gives your team full control over events, engagement content, rewards, sponsor activations, notifications, and analytics. No technical expertise required — everything is designed for marketing and operations teams.",
    capabilities: [
      "Event creation and calendar management",
      "Engagement content authoring: trivia, polls, predictions",
      "Reward catalog management with redemption tracking",
      "Push notification scheduling and targeting",
      "User management with role-based permissions",
      "Sponsor activation setup and reporting",
    ],
  },
  {
    id: "remote",
    title: "Remote Tune-In & Second Screen",
    subtitle: "Engage fans whether they are in the arena or on the couch.",
    description: "Not every fan can make it to the venue. Rally's remote tune-in mode lets fans watching on TV or streaming platforms earn points, interact with live content, and receive sponsor touchpoints from anywhere. Your reach extends far beyond the stadium walls.",
    capabilities: [
      "Remote tune-in verification for broadcast and streaming",
      "Full engagement access for remote fans: trivia, predictions, polls",
      "Point earning for remote interactions and tune-in streaks",
      "Sponsor activation delivery to at-home audiences",
      "Separate analytics for in-venue vs. remote engagement",
      "Push notifications synced with live broadcast moments",
    ],
  },
];

export default function PlatformPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero">
        <div className="container">
          <div className="rally-badge">Platform Overview</div>
          <h1 className="rally-hero-headline">
            Everything Your Property Needs<br />to Engage, Reward, and Understand Fans
          </h1>
          <p className="rally-tagline">
            Rally is a complete fan engagement and loyalty platform — from gameday check-ins
            and live interactions to sponsor activations, rewards, and deep fan analytics.
            All white-labeled to your brand.
          </p>
          <div className="hero-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Schedule a Demo
            </Link>
            <Link href="#check-in" className="rally-btn rally-btn--secondary rally-btn--large">
              Explore Capabilities
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Navigation */}
      <section className="platform-nav-bar">
        <div className="container">
          <div className="platform-nav-scroll">
            {platformSections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="platform-nav-link">
                {section.title.split(" & ")[0].split(" ").slice(0, 2).join(" ")}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Sections */}
      {platformSections.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={`platform-section ${index % 2 === 0 ? '' : 'platform-section--alt'}`}
        >
          <div className="container">
            <div className="platform-section-header">
              <h2>{section.title}</h2>
              <p className="platform-section-subtitle">{section.subtitle}</p>
              <p className="platform-section-desc">{section.description}</p>
            </div>
            <div className="platform-capabilities">
              {section.capabilities.map((cap, i) => (
                <div key={i} className="platform-capability">
                  <div className="platform-capability-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  </div>
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>See Rally in Action</h2>
          <p>Schedule a walkthrough and see how Rally can drive attendance, engagement, and sponsor ROI for your property.</p>
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
