import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Use Cases - Rally | How Sports Properties Use Fan Engagement",
  description:
    "See how sports properties, athletic departments, and entertainment brands use Rally to drive attendance, engage fans, activate sponsors, and capture data.",
};

const useCases = [
  {
    category: "Attendance & Retention",
    items: [
      {
        title: "Drive Student Section Attendance",
        description: "A college athletic department wants to fill student sections consistently across all sports — not just football. Rally gamifies attendance with check-in points, leaderboards, and tier-based rewards. Students compete individually and as groups (dorms, Greek life, clubs), turning attendance into a campus-wide competition.",
        who: "College Athletic Departments",
        outcome: "Consistent student attendance across all sports, not just marquee events.",
      },
      {
        title: "Increase Season Ticket Holder Engagement",
        description: "A professional sports team notices season ticket holders attending fewer games mid-season. Rally's check-in streak rewards and tier progression incentivize consistent attendance. Exclusive rewards for season ticket holders — early access, meet-and-greets, VIP experiences — give loyal fans a reason to use every ticket.",
        who: "Professional Sports Teams",
        outcome: "Higher per-game attendance from season ticket holders and reduced no-shows.",
      },
      {
        title: "Build Repeat Attendance for Concerts & Events",
        description: "A venue operator runs weekly live events and wants to build a loyal audience. Rally's loyalty program rewards repeat attendance with progressive tiers and exclusive perks. Fans earn points for every show, unlock rewards at tier milestones, and receive push notifications about upcoming events.",
        who: "Entertainment & Live Events",
        outcome: "Higher repeat attendance rates and stronger venue loyalty.",
      },
    ],
  },
  {
    category: "Sponsorship & Revenue",
    items: [
      {
        title: "Deliver Measurable Sponsor Activations",
        description: "A property's sponsor partners want more than logo placement — they want interaction data. Rally lets you create sponsor-branded trivia, polls, and reward placements that fans actively engage with. Every impression and interaction is tracked and reported with demographic breakdowns.",
        who: "All Property Types",
        outcome: "Sponsors receive real ROI data, leading to renewals and expanded partnerships.",
      },
      {
        title: "Drive Concession & Merch Revenue",
        description: "A team wants to increase in-venue spending. Rally's reward catalog includes concession credits, merch discounts, and flash offers pushed to fans' phones during the event. Points-for-purchases integrations turn the loyalty program into a direct revenue driver.",
        who: "Professional Sports Teams, Venues",
        outcome: "Increased per-cap spending tied directly to the engagement platform.",
      },
      {
        title: "Justify Sponsorship Value to Partners",
        description: "A conference office needs to demonstrate aggregate fan engagement value to league-level sponsors. Rally provides cross-property analytics showing total impressions, interactions, and fan reach across all member schools or teams — giving sponsors confidence in league-wide deals.",
        who: "Leagues & Conferences",
        outcome: "Data-backed sponsorship packages that command higher value.",
      },
    ],
  },
  {
    category: "Fan Engagement & Experience",
    items: [
      {
        title: "Engage Remote & Broadcast Audiences",
        description: "Most fans experience games through TV or streaming — not at the venue. Rally's remote tune-in mode lets fans watching from home earn points, participate in trivia and predictions, and receive sponsor activations. Your reach extends far beyond the stadium walls.",
        who: "All Property Types",
        outcome: "Engaged remote fanbase with measurable interaction data for sponsors.",
      },
      {
        title: "Engage Fans Across Multiple Sports",
        description: "An athletic department wants fans to attend more than just football and basketball. Rally's unified loyalty program rewards fans for engaging with every sport — soccer, volleyball, baseball, swimming, track. One app, one point balance, one tier progression across the entire athletic program.",
        who: "College Athletic Departments",
        outcome: "Increased attendance and engagement for non-revenue sports.",
      },
      {
        title: "Year-Round Fan Connection",
        description: "A team wants to maintain fan engagement during the offseason. Rally pushes trivia, historical content, predictions for upcoming seasons, and reward milestones to fans between games. The app stays active and relevant even when there's no live event.",
        who: "Professional Sports Teams, College Athletics",
        outcome: "Sustained fan engagement and app retention during the offseason.",
      },
    ],
  },
  {
    category: "Data & Analytics",
    items: [
      {
        title: "Build a Fan Database with Real Profiles",
        description: "A property has ticket sales data but doesn't truly know its fans. Rally creates rich fan profiles with demographics, engagement history, attendance patterns, and reward preferences — turning anonymous ticket buyers into known individuals with actionable data.",
        who: "All Property Types",
        outcome: "First-party fan data that informs marketing, sales, and sponsorship decisions.",
      },
      {
        title: "Compare Engagement Across Events & Seasons",
        description: "An operations team wants to understand which events drive the most engagement and why. Rally's analytics dashboard lets you compare check-in rates, interaction volumes, and demographic breakdowns across events, sports, and seasons — surfacing trends that inform scheduling and marketing.",
        who: "College Athletics, Professional Sports",
        outcome: "Data-driven event planning and marketing strategy.",
      },
      {
        title: "Report Fan Demographics to Stakeholders",
        description: "A marketing team needs to demonstrate the value of their fan engagement program to university leadership or team ownership. Rally provides exportable demographic and engagement reports that show exactly who fans are, how they engage, and what outcomes the platform is driving.",
        who: "All Property Types",
        outcome: "Clear, data-backed presentations for stakeholders and decision-makers.",
      },
    ],
  },
];

export default function UseCasesPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero">
        <div className="container">
          <div className="rally-badge">Use Cases</div>
          <h1 className="rally-hero-headline">
            How Sports Properties Use Rally
          </h1>
          <p className="rally-tagline">
            Real scenarios showing how teams, athletic departments, leagues,
            and entertainment properties use Rally to solve real problems —
            from attendance and sponsorship to fan engagement and data.
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

      {/* Use Case Categories */}
      {useCases.map((category) => (
        <section key={category.category} className="use-cases-section">
          <div className="container">
            <h2>{category.category}</h2>
            <div className="use-cases-grid">
              {category.items.map((uc) => (
                <div key={uc.title} className="use-case-card">
                  <div className="use-case-who">{uc.who}</div>
                  <h3>{uc.title}</h3>
                  <p className="use-case-description">{uc.description}</p>
                  <div className="use-case-outcome">
                    <span className="use-case-outcome-label">Outcome</span>
                    <p>{uc.outcome}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>See Rally in Action for Your Property</h2>
          <p>Every property is different. Schedule a demo and we&apos;ll show you exactly how Rally works for your use case.</p>
          <div className="rally-cta-actions">
            <Link href="/contact" className="rally-btn rally-btn--primary rally-btn--large">
              Schedule a Demo
            </Link>
            <Link href="/platform" className="rally-btn rally-btn--secondary rally-btn--large">
              See Full Platform
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
