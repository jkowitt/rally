"use client";

import Link from "next/link";
import Image from "next/image";

const features = [
  {
    name: "AI-Powered Valuations",
    icon: "🤖",
    description: "Upload property photos or enter an address. AI scores the condition, estimates value, and suggests improvements — with cost breakdowns and ROI for each.",
    color: "#1B2A4A",
    gradient: "linear-gradient(135deg, #1B2A4A 0%, #2C3E5A 100%)",
  },
  {
    name: "Underwriting Engine",
    icon: "📊",
    description: "See your cash flow, cap rate, and returns instantly. Expenses auto-fill from local area data. Change any assumption and watch the numbers update in real time.",
    color: "#D4A843",
    gradient: "linear-gradient(135deg, #D4A843 0%, #B8922E 100%)",
  },
  {
    name: "Market Intelligence",
    icon: "🏘️",
    description: "Find real comparable sales near your property with distance, recency scores, and price adjustments. Track cap rates, vacancy, and rent trends for any area.",
    color: "#1B2A4A",
    gradient: "linear-gradient(135deg, #1B2A4A 0%, #2C3E5A 100%)",
  },
  {
    name: "Portfolio Management",
    icon: "📚",
    description: "Save every analysis. Come back to review, update, or share with your team. See all your properties in one dashboard.",
    color: "#D4A843",
    gradient: "linear-gradient(135deg, #D4A843 0%, #B8922E 100%)",
  },
];

export function BrandShowcase() {
  return (
    <section id="products" className="brand-showcase">
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <Image
            src="/logos/legacy-re-icon.svg"
            alt="Legacy RE"
            width={64}
            height={64}
            style={{ borderRadius: "12px" }}
          />
        </div>
        <h2>Legacy RE. Built to Last.</h2>
        <p className="section-intro">
          One platform to analyze properties, run the numbers, and find what adds value.
        </p>
        <div className="brands-grid">
          {features.map((feature, index) => (
            <Link
              key={feature.name}
              href="/valora"
              className="brand-card"
              style={{
                borderTopColor: feature.color,
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className="brand-icon-wrapper" style={{ background: feature.gradient }}>
                <span style={{ fontSize: "2rem" }}>{feature.icon}</span>
              </div>
              <h3>{feature.name}</h3>
              <p>{feature.description}</p>
              <span className="explore-link" style={{ color: feature.color }}>
                Learn More →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
