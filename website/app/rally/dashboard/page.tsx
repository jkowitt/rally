import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Rally Dashboard - Admin & Analytics | Loud Legacy",
  description:
    "Manage schools, track fan engagement, view analytics, and configure gameday experiences from the Rally admin dashboard.",
};

const dashboardCards = [
  { label: "Total Users", value: "12,847", change: "+18%", color: "#FF6B35" },
  { label: "Active Today", value: "1,243", change: "+7%", color: "#2D9CDB" },
  { label: "Events Tracked", value: "48,219", change: "+24%", color: "#34C759" },
  { label: "Verified Users", value: "9,621", change: "+12%", color: "#9B59B6" },
];

const recentUsers = [
  { name: "Jordan Mitchell", email: "jordan@school.edu", school: "Duke", tier: "Gold", points: 2450 },
  { name: "Sarah Chen", email: "schen@school.edu", school: "UNC", tier: "Silver", points: 1820 },
  { name: "Marcus Williams", email: "mwill@school.edu", school: "Virginia", tier: "Platinum", points: 5200 },
  { name: "Alex Rivera", email: "arivera@school.edu", school: "Michigan", tier: "Bronze", points: 640 },
  { name: "Taylor Kim", email: "tkim@school.edu", school: "Kentucky", tier: "Gold", points: 3100 },
];

const topSchools = [
  { name: "Duke", fans: 842, engagement: "94%" },
  { name: "UNC", fans: 791, engagement: "91%" },
  { name: "Kentucky", fans: 723, engagement: "89%" },
  { name: "Michigan", fans: 698, engagement: "87%" },
  { name: "Virginia", fans: 654, engagement: "85%" },
];

function getTierColor(tier: string) {
  switch (tier) {
    case "Platinum": return "#A78BFA";
    case "Gold": return "#F59E0B";
    case "Silver": return "#94A3B8";
    case "Bronze": return "#D97706";
    default: return "#8B95A5";
  }
}

export default function RallyDashboardPage() {
  return (
    <main className="rally-landing">
      <Header />

      <section className="rally-dashboard-hero">
        <div className="container">
          <div className="rally-dash-header">
            <div>
              <h1>Rally Dashboard</h1>
              <p>Admin panel and analytics overview</p>
            </div>
            <Link href="/rally" className="rally-btn rally-btn--secondary">
              Back to Rally
            </Link>
          </div>
        </div>
      </section>

      <section className="rally-dashboard-content">
        <div className="container">
          {/* Stats Cards */}
          <div className="rally-dash-cards">
            {dashboardCards.map((card) => (
              <div key={card.label} className="rally-dash-card">
                <div className="rally-dash-card-label">{card.label}</div>
                <div className="rally-dash-card-value">{card.value}</div>
                <div className="rally-dash-card-change" style={{ color: card.color }}>
                  {card.change} this month
                </div>
              </div>
            ))}
          </div>

          <div className="rally-dash-grid">
            {/* Recent Users Table */}
            <div className="rally-dash-panel rally-dash-panel--wide">
              <div className="rally-dash-panel-header">
                <h3>Recent Users</h3>
                <span className="rally-dash-badge">Live</span>
              </div>
              <div className="rally-dash-table-wrap">
                <table className="rally-dash-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>School</th>
                      <th>Tier</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.email}>
                        <td>
                          <div className="rally-dash-user">
                            <div className="rally-dash-user-avatar">{user.name[0]}</div>
                            <div>
                              <div className="rally-dash-user-name">{user.name}</div>
                              <div className="rally-dash-user-email">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{user.school}</td>
                        <td>
                          <span
                            className="rally-dash-tier"
                            style={{ backgroundColor: getTierColor(user.tier) + "20", color: getTierColor(user.tier) }}
                          >
                            {user.tier}
                          </span>
                        </td>
                        <td className="rally-dash-points">{user.points.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Schools */}
            <div className="rally-dash-panel">
              <div className="rally-dash-panel-header">
                <h3>Top Schools</h3>
              </div>
              <div className="rally-dash-school-list">
                {topSchools.map((school, i) => (
                  <div key={school.name} className="rally-dash-school">
                    <div className="rally-dash-school-rank">#{i + 1}</div>
                    <div className="rally-dash-school-info">
                      <div className="rally-dash-school-name">{school.name}</div>
                      <div className="rally-dash-school-fans">{school.fans} fans</div>
                    </div>
                    <div className="rally-dash-school-engagement">{school.engagement}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Engagement Chart Placeholder */}
          <div className="rally-dash-panel rally-dash-chart">
            <div className="rally-dash-panel-header">
              <h3>Fan Engagement (Last 30 Days)</h3>
            </div>
            <div className="rally-dash-chart-bars">
              {Array.from({ length: 30 }).map((_, i) => {
                const height = 20 + Math.random() * 80;
                return (
                  <div
                    key={i}
                    className="rally-dash-chart-bar"
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
