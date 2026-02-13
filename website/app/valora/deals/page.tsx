"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const deals: { id: number; name: string; type: string; propertyType: string; address: string; askingPrice: number; targetPrice: number; sqft: number; capRate: number; stage: string; probability: number; closeDate: string; assignee: string; priority: string }[] = [];

const stages = [
  { id: "prospect", label: "Prospect", color: "#94A3B8" },
  { id: "loi", label: "LOI", color: "#F59E0B" },
  { id: "underwriting", label: "Underwriting", color: "#3B82F6" },
  { id: "due-diligence", label: "Due Diligence", color: "#8B5CF6" },
  { id: "negotiation", label: "Negotiation", color: "#EC4899" },
  { id: "closing", label: "Closing", color: "#10B981" },
];

export default function VALORADealsPage() {
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [viewMode, setViewMode] = useState<"pipeline" | "table">("pipeline");

  const filteredDeals = deals.filter(deal => {
    if (selectedStage !== "all" && deal.stage !== selectedStage) return false;
    if (selectedType !== "all" && deal.type.toLowerCase() !== selectedType) return false;
    return true;
  });

  const totalPipelineValue = deals.reduce((sum, d) => sum + d.targetPrice, 0);
  const weightedValue = deals.reduce((sum, d) => sum + (d.targetPrice * d.probability / 100), 0);
  const activeDeals = deals.length;
  const closingDeals = deals.filter(d => d.stage === "closing").length;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const getStageColor = (stage: string) => {
    return stages.find(s => s.id === stage)?.color || "#94A3B8";
  };

  return (
    <main className="valora-page val-deals-page">
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
                <span>Deal Pipeline</span>
              </div>
              <h1>Deal Pipeline</h1>
              <p>Track acquisitions, dispositions, and refinances</p>
            </div>
            <div className="val-page-actions">
              <button className="val-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Export Pipeline
              </button>
              <button className="val-btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Deal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Stats */}
      <section className="val-portfolio-stats">
        <div className="container">
          <div className="val-stats-grid">
            <div className="val-stat-card">
              <span className="val-stat-label">Total Pipeline</span>
              <span className="val-stat-value">{formatCurrency(totalPipelineValue)}</span>
              <span className="val-stat-sub">{activeDeals} active deals</span>
            </div>
            <div className="val-stat-card">
              <span className="val-stat-label">Weighted Value</span>
              <span className="val-stat-value">{formatCurrency(weightedValue)}</span>
              <span className="val-stat-sub">Probability-adjusted</span>
            </div>
            <div className="val-stat-card">
              <span className="val-stat-label">Closing Soon</span>
              <span className="val-stat-value">{closingDeals}</span>
              <span className="val-stat-change positive">In final stage</span>
            </div>
            <div className="val-stat-card">
              <span className="val-stat-label">Avg Deal Size</span>
              <span className="val-stat-value">{formatCurrency(activeDeals > 0 ? totalPipelineValue / activeDeals : 0)}</span>
              <span className="val-stat-sub">Across pipeline</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="val-filters-section">
        <div className="container">
          <div className="val-filters-bar">
            <div className="val-type-filters">
              <select
                className="val-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="acquisition">Acquisitions</option>
                <option value="disposition">Dispositions</option>
                <option value="refinance">Refinances</option>
              </select>
              <select
                className="val-select"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
              >
                <option value="all">All Stages</option>
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.label}</option>
                ))}
              </select>
            </div>
            <div className="val-view-toggle">
              <button
                className={`val-view-btn ${viewMode === "pipeline" ? "active" : ""}`}
                onClick={() => setViewMode("pipeline")}
              >
                Pipeline
              </button>
              <button
                className={`val-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline View */}
      <section className="val-pipeline-section">
        <div className="container">
          {deals.length === 0 ? (
            <div className="val-empty-state" style={{ textAlign: "center", padding: "4rem 2rem" }}>
              <h2>No Active Deals</h2>
              <p style={{ color: "#64748B", marginTop: "0.5rem" }}>Deals will appear here as you track acquisitions, dispositions, and refinances.</p>
              <Link href="/valora/dashboard" className="val-btn primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
                Start Analyzing
              </Link>
            </div>
          ) : viewMode === "pipeline" ? (
            <div className="val-pipeline-board">
              {stages.map(stage => {
                const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
                const stageValue = stageDeals.reduce((sum, d) => sum + d.targetPrice, 0);
                return (
                  <div key={stage.id} className="val-pipeline-column">
                    <div className="val-pipeline-column-header" style={{ borderTopColor: stage.color }}>
                      <div className="val-pipeline-column-title">
                        <span>{stage.label}</span>
                        <span className="val-pipeline-count">{stageDeals.length}</span>
                      </div>
                      <span className="val-pipeline-value">{formatCurrency(stageValue)}</span>
                    </div>
                    <div className="val-pipeline-cards">
                      {stageDeals.map(deal => (
                        <div key={deal.id} className="val-deal-card">
                          <div className="val-deal-header">
                            <span className={`val-deal-type ${deal.type.toLowerCase()}`}>{deal.type}</span>
                            <span className={`val-deal-priority ${deal.priority}`}>{deal.priority}</span>
                          </div>
                          <h4>{deal.name}</h4>
                          <p className="val-deal-address">{deal.address}</p>
                          <div className="val-deal-metrics">
                            <div>
                              <span className="val-deal-metric-value">{formatCurrency(deal.targetPrice)}</span>
                              <span className="val-deal-metric-label">Target</span>
                            </div>
                            <div>
                              <span className="val-deal-metric-value">{deal.probability}%</span>
                              <span className="val-deal-metric-label">Probability</span>
                            </div>
                          </div>
                          <div className="val-deal-footer">
                            <span className="val-deal-assignee">{deal.assignee}</span>
                            <span className="val-deal-date">{deal.closeDate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="val-deals-table">
              <div className="val-table-header">
                <span>Deal</span>
                <span>Type</span>
                <span>Stage</span>
                <span>Target Price</span>
                <span>Probability</span>
                <span>Close Date</span>
                <span>Assignee</span>
              </div>
              {filteredDeals.map(deal => (
                <div key={deal.id} className="val-table-row">
                  <div className="val-table-property">
                    <span className="val-table-name">{deal.name}</span>
                    <span className="val-table-address">{deal.propertyType}</span>
                  </div>
                  <span className={`val-deal-type-badge ${deal.type.toLowerCase()}`}>{deal.type}</span>
                  <span className="val-stage-badge" style={{ background: getStageColor(deal.stage) }}>
                    {stages.find(s => s.id === deal.stage)?.label}
                  </span>
                  <span className="val-table-value">{formatCurrency(deal.targetPrice)}</span>
                  <span>{deal.probability}%</span>
                  <span>{deal.closeDate}</span>
                  <span>{deal.assignee}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
