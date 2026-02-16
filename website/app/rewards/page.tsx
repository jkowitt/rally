import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Rewards & Tiers - Rally | Earn Real Rewards for Being a Fan",
  description:
    "Climb through Bronze, Silver, Gold, and Platinum tiers. Redeem points for merch, VIP access, concessions, meet-and-greets, and exclusive perks.",
};

const tiers = [
  {
    name: "Bronze",
    color: "#CD7F32",
    description: "You're in. Start earning points by checking in, playing trivia, and engaging on gameday.",
    perks: [
      "Access to all engagement features",
      "Points earning on every action",
      "Basic reward catalog access",
      "Leaderboard participation",
    ],
  },
  {
    name: "Silver",
    color: "#C0C0C0",
    description: "Consistent fans get recognized. Silver unlocks better rewards and bonus point opportunities.",
    perks: [
      "Everything in Bronze",
      "Expanded reward catalog",
      "Bonus point multipliers on select events",
      "Silver-exclusive challenges",
    ],
  },
  {
    name: "Gold",
    color: "#FFD700",
    description: "Dedicated supporters earn Gold. Premium rewards, priority access, and exclusive experiences.",
    perks: [
      "Everything in Silver",
      "Premium reward catalog access",
      "Priority reward redemption",
      "Gold-exclusive events and perks",
      "Enhanced leaderboard badges",
    ],
  },
  {
    name: "Platinum",
    color: "#E5E4E2",
    description: "Elite fan status. Platinum is for the fans who never miss a game. The best rewards, the best access, the best experience.",
    perks: [
      "Everything in Gold",
      "VIP reward catalog — meet-and-greets, behind-the-scenes",
      "Maximum point multipliers",
      "Platinum-only experiences and access",
      "Priority support and early feature access",
      "Founding fan recognition",
    ],
  },
];

const rewardCategories = [
  {
    title: "Team Merch & Apparel",
    description: "Jerseys, hats, hoodies, and gear from your favorite teams. Redeem points for the merch you actually want.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M20.38 3.46L16 2 12 5.5 8 2l-4.38 1.46A2 2 0 002 5.33V20a2 2 0 002 2h16a2 2 0 002-2V5.33a2 2 0 00-1.62-1.87z" />
      </svg>
    ),
  },
  {
    title: "Concessions & Food",
    description: "Free drinks, food credits, and concession deals. Fuel your gameday experience without opening your wallet.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
      </svg>
    ),
  },
  {
    title: "VIP Experiences",
    description: "Courtside seats, field passes, press box access, and premium upgrades. Experiences money can't buy.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "Meet-and-Greets",
    description: "Meet players, coaches, and staff. Behind-the-scenes access and personal interactions with the people behind your team.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    title: "Digital Perks",
    description: "Exclusive digital content, wallpapers, early access to team announcements, and in-app badges that show off your status.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12" y2="18.01" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Partner Offers",
    description: "Exclusive deals and perks from team partners and local businesses. Discounts, freebies, and special offers just for Rally fans.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a4 4 0 00-8 0v2" />
      </svg>
    ),
  },
];

export default function RewardsPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero">
        <div className="container">
          <div className="rally-badge">Rewards & Tiers</div>
          <h1 className="rally-hero-headline">
            Real Rewards for Real Fans
          </h1>
          <p className="rally-tagline">
            Every check-in, every trivia answer, every prediction earns points.
            Climb four loyalty tiers and redeem your points for merch, experiences,
            VIP access, and more from your favorite teams.
          </p>
          <div className="hero-actions">
            <Link href="/auth/signup" className="rally-btn rally-btn--primary rally-btn--large">
              Start Earning Free
            </Link>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="rewards-tiers">
        <div className="container">
          <h2>Four Tiers. Better Rewards at Every Level.</h2>
          <p className="rally-section-subtitle">
            The more you engage, the higher you climb. Each tier unlocks new rewards and exclusive perks.
          </p>
          <div className="rewards-tiers-grid">
            {tiers.map((tier) => (
              <div key={tier.name} className="rewards-tier-card" style={{ borderTopColor: tier.color }}>
                <div className="rewards-tier-name" style={{ color: tier.color }}>{tier.name}</div>
                <p className="rewards-tier-desc">{tier.description}</p>
                <ul className="rewards-tier-perks">
                  {tier.perks.map((perk) => (
                    <li key={perk}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={tier.color} strokeWidth="2.5" width="14" height="14">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reward Categories */}
      <section className="rally-features">
        <div className="container">
          <h2>What You Can Earn</h2>
          <p className="rally-section-subtitle">
            Every team has its own reward catalog. Here are the types of rewards you can redeem across Rally.
          </p>
          <div className="rally-feature-grid">
            {rewardCategories.map((rc) => (
              <div key={rc.title} className="rally-feature-card">
                <div className="rally-feature-icon">{rc.icon}</div>
                <h3>{rc.title}</h3>
                <p>{rc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>Start Earning Today</h2>
          <p>Join Rally, follow your teams, and start earning points toward real rewards on your very next gameday.</p>
          <div className="rally-cta-actions">
            <Link href="/auth/signup" className="rally-btn rally-btn--primary rally-btn--large">
              Join Rally Free
            </Link>
            <Link href="/how-it-works" className="rally-btn rally-btn--secondary rally-btn--large">
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
