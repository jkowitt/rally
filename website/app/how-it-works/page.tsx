import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "How It Works - Rally | Earn Rewards for Being a Fan",
  description:
    "Follow teams, check in at games, play trivia, earn points, climb loyalty tiers, and redeem real rewards. Here's how Rally works.",
};

const steps = [
  {
    num: "1",
    title: "Sign Up & Follow Your Teams",
    description: "Create your free Rally account and follow up to 20 teams across College, NBA, NFL, MLB, NHL, MLS, and UWSL. Your Rally experience adapts to each team's brand — their colors, their logo, their content.",
    details: [
      "Free to join — no credit card, no subscriptions",
      "Follow teams from any league, any sport",
      "Switch between your teams instantly",
      "Each team has its own branded experience",
    ],
  },
  {
    num: "2",
    title: "Check In on Gameday",
    description: "When it's gameday, Rally knows. Check in at the venue using your phone's location, or tune in from home to activate remote mode. Either way, you start earning points the moment you engage.",
    details: [
      "Geo-verified check-in at the venue",
      "Remote tune-in for broadcast and streaming",
      "Pre-check-in before you arrive for bonus points",
      "Check-in streaks reward consistency",
    ],
  },
  {
    num: "3",
    title: "Play, Predict, and Compete",
    description: "Once you're checked in, the real fun starts. Answer live trivia, make score predictions, vote in polls, and compete on leaderboards against other fans. Every interaction earns you points.",
    details: [
      "Live trivia tied to real game moments",
      "Score and outcome predictions",
      "Real-time polls and fan voting",
      "Leaderboards: individual, group, and team-wide",
    ],
  },
  {
    num: "4",
    title: "Earn Points & Climb Tiers",
    description: "Everything you do in Rally earns points — check-ins, trivia, predictions, polls, streaks. As your points grow, you climb through four loyalty tiers: Bronze, Silver, Gold, and Platinum. Higher tiers unlock better rewards.",
    details: [
      "Bronze — just getting started",
      "Silver — consistent fan",
      "Gold — dedicated supporter",
      "Platinum — elite status with VIP perks",
    ],
  },
  {
    num: "5",
    title: "Redeem Real Rewards",
    description: "Cash in your points for actual rewards from your teams. Merch, concessions, VIP experiences, meet-and-greets, priority seating, digital perks, and exclusive partner offers. Every team has its own reward catalog.",
    details: [
      "Team merch and apparel",
      "Concession credits and food deals",
      "VIP access and premium experiences",
      "Meet-and-greets and behind-the-scenes",
      "Exclusive partner offers and perks",
    ],
  },
];

const earningActions = [
  { action: "Check in at a game", frequency: "Per event" },
  { action: "Remote tune-in", frequency: "Per event" },
  { action: "Answer trivia correctly", frequency: "Per question" },
  { action: "Make a prediction", frequency: "Per event" },
  { action: "Vote in a poll", frequency: "Per poll" },
  { action: "Check-in streak bonus", frequency: "Consecutive games" },
  { action: "Tier milestone bonus", frequency: "On tier up" },
  { action: "Refer a friend", frequency: "Per referral" },
];

export default function HowItWorksPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero">
        <div className="container">
          <div className="rally-badge">How It Works</div>
          <h1 className="rally-hero-headline">
            Show Up. Engage. Earn.<br />It&apos;s That Simple.
          </h1>
          <p className="rally-tagline">
            Rally rewards you for being a fan. Follow your teams, check in on gameday,
            play trivia, earn points, climb loyalty tiers, and redeem real rewards.
            Here&apos;s exactly how it works.
          </p>
          <div className="hero-actions">
            <Link href="/auth/signup" className="rally-btn rally-btn--primary rally-btn--large">
              Join Rally Free
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      {steps.map((step, index) => (
        <section
          key={step.num}
          className={`hiw-step-section ${index % 2 === 0 ? '' : 'hiw-step-section--alt'}`}
        >
          <div className="container">
            <div className="hiw-step-header">
              <div className="hiw-step-num">{step.num}</div>
              <div>
                <h2>{step.title}</h2>
                <p className="hiw-step-desc">{step.description}</p>
              </div>
            </div>
            <div className="hiw-step-details">
              {step.details.map((d) => (
                <div key={d} className="hiw-step-detail">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Ways to Earn */}
      <section className="rally-features">
        <div className="container">
          <h2>Ways to Earn Points</h2>
          <p className="rally-section-subtitle">
            Every fan action in Rally earns points. The more you engage, the faster you climb.
          </p>
          <div className="hiw-earn-grid">
            {earningActions.map((ea) => (
              <div key={ea.action} className="hiw-earn-card">
                <span className="hiw-earn-action">{ea.action}</span>
                <span className="hiw-earn-freq">{ea.frequency}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>Ready to Start Earning?</h2>
          <p>Join Rally, follow your teams, and start earning points on your very next gameday. Free to join.</p>
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
