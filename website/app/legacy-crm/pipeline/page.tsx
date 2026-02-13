"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const stages = [
  { id: "lead", name: "Lead", color: "#6B7280" },
  { id: "qualified", name: "Qualified", color: "#3B82F6" },
  { id: "proposal", name: "Proposal", color: "#8B5CF6" },
  { id: "negotiation", name: "Negotiation", color: "#F59E0B" },
  { id: "closed", name: "Closed Won", color: "#10B981" },
];

const opportunities = [
  { id: 1, name: "Enterprise Software Deal", company: "Acme Corp", value: 125000, stage: "negotiation", probability: 75, owner: "Sarah M.", closeDate: "Feb 15", daysInStage: 5 },
  { id: 2, name: "Annual Subscription", company: "TechStart Inc", value: 85000, stage: "proposal", probability: 50, owner: "James W.", closeDate: "Feb 28", daysInStage: 8 },
  { id: 3, name: "Consulting Package", company: "Design Studio", value: 45000, stage: "qualified", probability: 30, owner: "Emily C.", closeDate: "Mar 15", daysInStage: 3 },
  { id: 4, name: "Platform Migration", company: "Consulting Group", value: 200000, stage: "lead", probability: 10, owner: "Michael B.", closeDate: "Apr 1", daysInStage: 12 },
  { id: 5, name: "Marketing Automation", company: "Marketing Agency", value: 65000, stage: "proposal", probability: 60, owner: "Lisa R.", closeDate: "Feb 20", daysInStage: 6 },
  { id: 6, name: "Data Analytics Suite", company: "Innovation Labs", value: 150000, stage: "qualified", probability: 40, owner: "David P.", closeDate: "Mar 30", daysInStage: 2 },
  { id: 7, name: "Q1 Expansion", company: "Current Client", value: 75000, stage: "closed", probability: 100, owner: "Sarah M.", closeDate: "Jan 20", daysInStage: 0 },
  { id: 8, name: "Training Program", company: "EdTech Co", value: 35000, stage: "negotiation", probability: 80, owner: "James W.", closeDate: "Feb 10", daysInStage: 4 },
];

export default function LegacyCRMPipelinePage() {
  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  const [selectedOpp, setSelectedOpp] = useState<typeof opportunities[0] | null>(null);

  const totalPipeline = opportunities.filter(o => o.stage !== "closed").reduce((sum, o) => sum + o.value, 0);
  const weightedPipeline = opportunities.filter(o => o.stage !== "closed").reduce((sum, o) => sum + (o.value * o.probability / 100), 0);
  const wonThisMonth = opportunities.filter(o => o.stage === "closed").reduce((sum, o) => sum + o.value, 0);
  const avgDealSize = Math.round(totalPipeline / opportunities.filter(o => o.stage !== "closed").length);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const getStageColor = (stageId: string) => stages.find(s => s.id === stageId)?.color || "#6B7280";

  return (
    <main className="legacy-crm-page lcrm-pipeline-page">
      <Header />

      {/* Page Header */}
      <section className="lcrm-page-header">
        <div className="container">
          <div className="lcrm-page-header-content">
            <div>
              <div className="lcrm-breadcrumb">
                <Link href="/legacy-crm">Legacy CRM</Link>
                <span>/</span>
                <Link href="/legacy-crm/dashboard">Dashboard</Link>
                <span>/</span>
                <span>Pipeline</span>
              </div>
              <h1>Sales Pipeline</h1>
              <p>Track opportunities through your sales process</p>
            </div>
            <div className="lcrm-page-actions">
              <div className="lcrm-view-toggle">
                <button
                  className={`lcrm-view-btn ${viewMode === "board" ? "active" : ""}`}
                  onClick={() => setViewMode("board")}
                >
                  Board
                </button>
                <button
                  className={`lcrm-view-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                >
                  Table
                </button>
              </div>
              <button className="lcrm-btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Opportunity
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Stats */}
      <section className="lcrm-stats-section">
        <div className="container">
          <div className="lcrm-stats-grid">
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-value">{formatCurrency(totalPipeline)}</span>
              <span className="lcrm-stat-label">Total Pipeline</span>
            </div>
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-value">{formatCurrency(weightedPipeline)}</span>
              <span className="lcrm-stat-label">Weighted Value</span>
            </div>
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-value" style={{ color: "#10B981" }}>{formatCurrency(wonThisMonth)}</span>
              <span className="lcrm-stat-label">Won This Month</span>
            </div>
            <div className="lcrm-stat-card">
              <span className="lcrm-stat-value">{formatCurrency(avgDealSize)}</span>
              <span className="lcrm-stat-label">Avg Deal Size</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline View */}
      <section className="lcrm-pipeline-section">
        <div className="container">
          {viewMode === "board" ? (
            <div className="lcrm-pipeline-board">
              {stages.map(stage => {
                const stageOpps = opportunities.filter(o => o.stage === stage.id);
                const stageValue = stageOpps.reduce((sum, o) => sum + o.value, 0);
                return (
                  <div key={stage.id} className="lcrm-pipeline-column">
                    <div className="lcrm-pipeline-column-header" style={{ borderTopColor: stage.color }}>
                      <div className="lcrm-pipeline-column-title">
                        <span>{stage.name}</span>
                        <span className="lcrm-pipeline-count">{stageOpps.length}</span>
                      </div>
                      <span className="lcrm-pipeline-value">{formatCurrency(stageValue)}</span>
                    </div>
                    <div className="lcrm-pipeline-cards">
                      {stageOpps.map(opp => (
                        <div
                          key={opp.id}
                          className="lcrm-opp-card"
                          onClick={() => setSelectedOpp(opp)}
                        >
                          <h4>{opp.name}</h4>
                          <p className="lcrm-opp-company">{opp.company}</p>
                          <div className="lcrm-opp-metrics">
                            <span className="lcrm-opp-value">{formatCurrency(opp.value)}</span>
                            <span className="lcrm-opp-probability">{opp.probability}%</span>
                          </div>
                          <div className="lcrm-opp-footer">
                            <span className="lcrm-opp-owner">{opp.owner}</span>
                            <span className="lcrm-opp-date">{opp.closeDate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="lcrm-pipeline-table">
              <div className="lcrm-pipeline-table-header">
                <span>Opportunity</span>
                <span>Company</span>
                <span>Value</span>
                <span>Stage</span>
                <span>Probability</span>
                <span>Close Date</span>
                <span>Owner</span>
              </div>
              {opportunities.map(opp => (
                <div
                  key={opp.id}
                  className="lcrm-pipeline-table-row"
                  onClick={() => setSelectedOpp(opp)}
                >
                  <span className="lcrm-table-name">{opp.name}</span>
                  <span>{opp.company}</span>
                  <span className="lcrm-table-value">{formatCurrency(opp.value)}</span>
                  <span
                    className="lcrm-table-stage"
                    style={{ background: getStageColor(opp.stage) }}
                  >
                    {stages.find(s => s.id === opp.stage)?.name}
                  </span>
                  <span>{opp.probability}%</span>
                  <span>{opp.closeDate}</span>
                  <span>{opp.owner}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Opportunity Detail Modal */}
      {selectedOpp && (
        <div className="lcrm-modal-overlay" onClick={() => setSelectedOpp(null)}>
          <div className="lcrm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lcrm-modal-close" onClick={() => setSelectedOpp(null)}>×</button>
            <div className="lcrm-modal-header">
              <div>
                <h2>{selectedOpp.name}</h2>
                <p>{selectedOpp.company}</p>
              </div>
              <span
                className="lcrm-modal-stage"
                style={{ background: getStageColor(selectedOpp.stage) }}
              >
                {stages.find(s => s.id === selectedOpp.stage)?.name}
              </span>
            </div>
            <div className="lcrm-modal-stats">
              <div className="lcrm-modal-stat">
                <span className="lcrm-modal-stat-value">{formatCurrency(selectedOpp.value)}</span>
                <span className="lcrm-modal-stat-label">Deal Value</span>
              </div>
              <div className="lcrm-modal-stat">
                <span className="lcrm-modal-stat-value">{selectedOpp.probability}%</span>
                <span className="lcrm-modal-stat-label">Probability</span>
              </div>
              <div className="lcrm-modal-stat">
                <span className="lcrm-modal-stat-value">{formatCurrency(selectedOpp.value * selectedOpp.probability / 100)}</span>
                <span className="lcrm-modal-stat-label">Weighted</span>
              </div>
            </div>
            <div className="lcrm-modal-details">
              <div className="lcrm-modal-detail">
                <span className="lcrm-detail-label">Owner</span>
                <span className="lcrm-detail-value">{selectedOpp.owner}</span>
              </div>
              <div className="lcrm-modal-detail">
                <span className="lcrm-detail-label">Close Date</span>
                <span className="lcrm-detail-value">{selectedOpp.closeDate}</span>
              </div>
              <div className="lcrm-modal-detail">
                <span className="lcrm-detail-label">Days in Stage</span>
                <span className="lcrm-detail-value">{selectedOpp.daysInStage} days</span>
              </div>
            </div>
            <div className="lcrm-modal-section">
              <h4>Move to Stage</h4>
              <div className="lcrm-stage-buttons">
                {stages.map(stage => (
                  <button
                    key={stage.id}
                    className={`lcrm-stage-btn ${selectedOpp.stage === stage.id ? "active" : ""}`}
                    style={{ borderColor: stage.color }}
                  >
                    {stage.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="lcrm-modal-actions">
              <button className="lcrm-btn secondary">Log Activity</button>
              <button className="lcrm-btn primary">Edit Opportunity</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
