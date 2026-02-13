"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const marketData = {
  regions: [
    { name: "Austin", capRate: 5.8, rentGrowth: 8.2, vacancy: 6.5, absorption: 2.1, trend: "up" },
    { name: "Dallas-Fort Worth", capRate: 6.2, rentGrowth: 5.4, vacancy: 8.2, absorption: 1.8, trend: "up" },
    { name: "Houston", capRate: 6.5, rentGrowth: 3.8, vacancy: 9.1, absorption: 0.9, trend: "flat" },
    { name: "San Antonio", capRate: 6.8, rentGrowth: 4.2, vacancy: 7.8, absorption: 1.2, trend: "up" },
  ],
  sectors: [
    { name: "Multifamily", capRate: 5.2, rentGrowth: 6.8, vacancy: 5.4, volume: 18500000000, trend: "up" },
    { name: "Industrial", capRate: 5.8, rentGrowth: 9.2, vacancy: 4.1, volume: 22300000000, trend: "up" },
    { name: "Office", capRate: 7.2, rentGrowth: -1.2, vacancy: 18.5, volume: 8700000000, trend: "down" },
    { name: "Retail", capRate: 6.8, rentGrowth: 2.4, vacancy: 6.2, volume: 9200000000, trend: "flat" },
    { name: "Medical Office", capRate: 6.0, rentGrowth: 4.5, vacancy: 8.8, volume: 5400000000, trend: "up" },
  ],
  recentTransactions: [
    { property: "Domain Tower II", type: "Office", location: "Austin, TX", price: 285000000, sqft: 450000, buyer: "Blackstone", date: "Jan 2024" },
    { property: "Lakeline Industrial", type: "Industrial", location: "Austin, TX", price: 125000000, sqft: 680000, buyer: "Prologis", date: "Jan 2024" },
    { property: "The Vue Apartments", type: "Multifamily", location: "Dallas, TX", price: 95000000, sqft: 320000, buyer: "Greystar", date: "Dec 2023" },
    { property: "Memorial City Medical", type: "Medical Office", location: "Houston, TX", price: 68000000, sqft: 145000, buyer: "Welltower", date: "Dec 2023" },
    { property: "Galleria Retail Plaza", type: "Retail", location: "Houston, TX", price: 42000000, sqft: 185000, buyer: "Regency Centers", date: "Nov 2023" },
  ],
};

export default function VALORAMarketPage() {
  const [selectedRegion, setSelectedRegion] = useState("Austin");
  const [selectedSector, setSelectedSector] = useState("all");

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
    return `$${value}`;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    return "→";
  };

  const getTrendColor = (trend: string) => {
    if (trend === "up") return "#10B981";
    if (trend === "down") return "#EF4444";
    return "#F59E0B";
  };

  const filteredSectors = selectedSector === "all"
    ? marketData.sectors
    : marketData.sectors.filter(s => s.name.toLowerCase() === selectedSector.toLowerCase());

  return (
    <main className="valora-page val-market-page">
      <Header />

      {/* Page Header */}
      <section className="val-page-header">
        <div className="container">
          <div className="val-page-header-content">
            <div>
              <div className="val-breadcrumb">
                <Link href="/valora">Legacy RE</Link>
                <span>/</span>
                <Link href="/valora/dashboard">Dashboard</Link>
                <span>/</span>
                <span>Market Analysis</span>
              </div>
              <h1>Market Intelligence</h1>
              <p>Texas commercial real estate market data and trends</p>
            </div>
            <div className="val-page-actions">
              <button className="val-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Report
              </button>
              <button className="val-btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Search Comps
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Region Overview */}
      <section className="val-market-regions">
        <div className="container">
          <h2 className="val-section-title">Regional Overview</h2>
          <div className="val-regions-grid">
            {marketData.regions.map(region => (
              <div
                key={region.name}
                className={`val-region-card ${selectedRegion === region.name ? "active" : ""}`}
                onClick={() => setSelectedRegion(region.name)}
              >
                <div className="val-region-header">
                  <h3>{region.name}</h3>
                  <span
                    className="val-region-trend"
                    style={{ color: getTrendColor(region.trend) }}
                  >
                    {getTrendIcon(region.trend)}
                  </span>
                </div>
                <div className="val-region-metrics">
                  <div className="val-region-metric">
                    <span className="val-region-metric-value">{region.capRate}%</span>
                    <span className="val-region-metric-label">Cap Rate</span>
                  </div>
                  <div className="val-region-metric">
                    <span className="val-region-metric-value" style={{ color: region.rentGrowth > 0 ? "#10B981" : "#EF4444" }}>
                      {region.rentGrowth > 0 ? "+" : ""}{region.rentGrowth}%
                    </span>
                    <span className="val-region-metric-label">Rent Growth</span>
                  </div>
                  <div className="val-region-metric">
                    <span className="val-region-metric-value">{region.vacancy}%</span>
                    <span className="val-region-metric-label">Vacancy</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sector Analysis */}
      <section className="val-market-sectors">
        <div className="container">
          <div className="val-section-header">
            <h2 className="val-section-title">Sector Analysis</h2>
            <div className="val-sector-filters">
              {["all", "multifamily", "industrial", "office", "retail"].map(sector => (
                <button
                  key={sector}
                  className={`val-filter-btn ${selectedSector === sector ? "active" : ""}`}
                  onClick={() => setSelectedSector(sector)}
                >
                  {sector.charAt(0).toUpperCase() + sector.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="val-sectors-table">
            <div className="val-sectors-header">
              <span>Sector</span>
              <span>Cap Rate</span>
              <span>Rent Growth</span>
              <span>Vacancy</span>
              <span>Transaction Volume</span>
              <span>Trend</span>
            </div>
            {filteredSectors.map(sector => (
              <div key={sector.name} className="val-sector-row">
                <span className="val-sector-name">{sector.name}</span>
                <span>{sector.capRate}%</span>
                <span style={{ color: sector.rentGrowth > 0 ? "#10B981" : "#EF4444" }}>
                  {sector.rentGrowth > 0 ? "+" : ""}{sector.rentGrowth}%
                </span>
                <span>{sector.vacancy}%</span>
                <span>{formatCurrency(sector.volume)}</span>
                <span style={{ color: getTrendColor(sector.trend) }}>
                  {getTrendIcon(sector.trend)} {sector.trend.charAt(0).toUpperCase() + sector.trend.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="val-market-transactions">
        <div className="container">
          <div className="val-section-header">
            <h2 className="val-section-title">Recent Transactions</h2>
            <Link href="/valora/comps" className="val-link">View All Comps</Link>
          </div>
          <div className="val-transactions-grid">
            {marketData.recentTransactions.map((tx, index) => (
              <div key={index} className="val-transaction-card">
                <div className="val-transaction-header">
                  <span className="val-transaction-type">{tx.type}</span>
                  <span className="val-transaction-date">{tx.date}</span>
                </div>
                <h4>{tx.property}</h4>
                <p className="val-transaction-location">{tx.location}</p>
                <div className="val-transaction-metrics">
                  <div>
                    <span className="val-transaction-value">{formatCurrency(tx.price)}</span>
                    <span className="val-transaction-label">Sale Price</span>
                  </div>
                  <div>
                    <span className="val-transaction-value">{(tx.sqft / 1000).toFixed(0)}K SF</span>
                    <span className="val-transaction-label">Size</span>
                  </div>
                  <div>
                    <span className="val-transaction-value">${Math.round(tx.price / tx.sqft)}/SF</span>
                    <span className="val-transaction-label">Price/SF</span>
                  </div>
                </div>
                <div className="val-transaction-buyer">
                  <span>Buyer:</span> {tx.buyer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Insights */}
      <section className="val-market-insights">
        <div className="container">
          <h2 className="val-section-title">Market Insights</h2>
          <div className="val-insights-grid">
            <div className="val-insight-card">
              <div className="val-insight-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                  <polyline points="17,6 23,6 23,12" />
                </svg>
              </div>
              <h4>Industrial Outperforming</h4>
              <p>Industrial properties continue to see strong rent growth at 9.2% YoY, driven by e-commerce and nearshoring trends.</p>
            </div>
            <div className="val-insight-card">
              <div className="val-insight-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h4>Office Market Headwinds</h4>
              <p>Office vacancy remains elevated at 18.5% as hybrid work persists. Class A assets showing resilience vs. Class B/C.</p>
            </div>
            <div className="val-insight-card">
              <div className="val-insight-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h4>Multifamily Demand Strong</h4>
              <p>Austin continues to lead Texas in multifamily rent growth at 6.8%, though pace is moderating from 2022 highs.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
