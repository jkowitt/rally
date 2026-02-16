import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Leagues - Rally | Follow Your Favorite Teams",
  description:
    "Browse 520+ teams and schools across 7 leagues on Rally. College, NBA, NFL, MLB, NHL, MLS, and UWSL — find your teams and start earning.",
};

const leagues = [
  {
    name: "College",
    count: "353+ Schools",
    color: "#FF6B35",
    description: "NCAA Division I athletics — from Power 5 football to mid-major basketball and everything in between. Follow your alma mater or your future school.",
    highlights: ["31 conferences", "Every D1 school", "All sports — football, basketball, baseball, soccer, volleyball, and more"],
    conferences: ["ACC", "Big Ten", "Big 12", "SEC", "Pac-12", "Big East", "AAC", "Mountain West", "Sun Belt", "Conference USA", "MAC", "A-10", "WCC", "Missouri Valley", "Ivy League", "SWAC"],
  },
  {
    name: "NBA",
    count: "30 Teams",
    color: "#1D428A",
    description: "Follow your favorite NBA team through the regular season, playoffs, and into the Finals. Check in at arenas, play trivia, and earn rewards all season long.",
    highlights: ["82-game season", "Home & away engagement", "Playoff bonus events"],
  },
  {
    name: "NFL",
    count: "32 Teams",
    color: "#013369",
    description: "Every Sunday (and Monday and Thursday) counts. Check in at the stadium or tune in from the couch — Rally makes every NFL gameday more rewarding.",
    highlights: ["17-game season", "Tailgate check-ins", "Playoff & Super Bowl events"],
  },
  {
    name: "MLB",
    count: "30 Teams",
    color: "#002D72",
    description: "162 games means 162 chances to earn. Rally rewards the fans who show up game after game — whether you're in the bleachers or watching from the backyard.",
    highlights: ["162-game season", "Attendance streaks rewarded", "Postseason bonus content"],
  },
  {
    name: "NHL",
    count: "32 Teams",
    color: "#A2AAAD",
    description: "Hockey fans are the most loyal fans in sports. Rally makes sure that loyalty is rewarded — from puck drop to the Stanley Cup Playoffs.",
    highlights: ["82-game season", "Arena atmosphere events", "Playoff prediction challenges"],
  },
  {
    name: "MLS",
    count: "29 Teams",
    color: "#6CC24A",
    description: "The beautiful game, with rewards. Rally brings supporter culture into the digital age with check-ins, match predictions, and community leaderboards.",
    highlights: ["34-game season", "Supporter group leaderboards", "MLS Cup engagement"],
  },
  {
    name: "UWSL",
    count: "14 Teams",
    color: "#B31942",
    description: "Be part of the growth of women's professional soccer. Rally rewards early supporters and founding fans as the league builds its community.",
    highlights: ["Founding fan rewards", "Growing community", "Season-long loyalty tiers"],
  },
];

export default function LeaguesPage() {
  return (
    <main className="rally-landing">
      <Header />

      {/* Hero */}
      <section className="rally-hero">
        <div className="container">
          <div className="rally-badge">Browse Leagues</div>
          <h1 className="rally-hero-headline">
            Find Your Teams. Start Earning.
          </h1>
          <p className="rally-tagline">
            520+ teams and schools across 7 leagues. Follow up to 20 teams from
            any league and earn points every time you show up or tune in.
          </p>
          <div className="hero-actions">
            <Link href="/auth/signup" className="rally-btn rally-btn--primary rally-btn--large">
              Join Rally Free
            </Link>
          </div>
        </div>
      </section>

      {/* League Cards */}
      {leagues.map((league, index) => (
        <section
          key={league.name}
          className={`league-detail-section ${index % 2 === 0 ? '' : 'league-detail-section--alt'}`}
        >
          <div className="container">
            <div className="league-detail-header">
              <div className="league-detail-name" style={{ color: league.color }}>{league.name}</div>
              <span className="league-detail-count" style={{ borderColor: league.color, color: league.color }}>{league.count}</span>
            </div>
            <p className="league-detail-desc">{league.description}</p>
            <div className="league-detail-highlights">
              {league.highlights.map((h) => (
                <div key={h} className="league-detail-highlight">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" style={{ color: league.color }}>
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  <span>{h}</span>
                </div>
              ))}
            </div>
            {league.conferences && (
              <div className="league-detail-conferences">
                {league.conferences.map((conf) => (
                  <span key={conf} className="rally-conf-tag">{conf}</span>
                ))}
                <span className="rally-conf-tag rally-conf-tag--more">+15 more</span>
              </div>
            )}
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="rally-cta">
        <div className="container">
          <h2>Follow Your Teams Today</h2>
          <p>Join Rally, pick your favorites, and start earning points on your very next gameday.</p>
          <div className="rally-cta-actions">
            <Link href="/auth/signup" className="rally-btn rally-btn--primary rally-btn--large">
              Get Started Free
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
