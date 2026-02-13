"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

interface Property {
  id: number;
  name: string;
  type: string;
  address: string;
  sqft: number;
  units: number;
  occupancy: number;
  noi: number;
  capRate: number;
  value: number;
  acquired: string;
  status: string;
  image: string;
}

const properties: Property[] = [];

interface Tenant {
  id: number;
  name: string;
  property: string;
  sqft: number;
  rent: number;
  lease_end: string;
  status: string;
}

const tenants: Tenant[] = [];

export default function VALORAPropertiesPage() {
  const [selectedType, setSelectedType] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState<typeof properties[0] | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const filteredProperties = selectedType === "all"
    ? properties
    : properties.filter(p => p.type.toLowerCase().includes(selectedType.toLowerCase()));

  const totalValue = properties.reduce((sum, p) => sum + p.value, 0);
  const totalSqft = properties.reduce((sum, p) => sum + p.sqft, 0);
  const totalNOI = properties.reduce((sum, p) => sum + p.noi, 0);
  const avgOccupancy = properties.length > 0
    ? Math.round(properties.reduce((sum, p) => sum + p.occupancy, 0) / properties.length)
    : 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <main className="valora-page val-properties-page">
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
                <span>Properties</span>
              </div>
              <h1>Property Portfolio</h1>
              <p>Manage and analyze your real estate holdings</p>
            </div>
            <div className="val-page-actions">
              <button className="val-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Export
              </button>
              <button className="val-btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Property
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Stats */}
      <section className="val-portfolio-stats">
        <div className="container">
          <div className="val-stats-grid">
            <div className="val-stat-card">
              <span className="val-stat-label">Total Portfolio Value</span>
              <span className="val-stat-value">{formatCurrency(totalValue)}</span>
              <span className="val-stat-change positive">+12.4% YoY</span>
            </div>
            <div className="val-stat-card">
              <span className="val-stat-label">Total Square Feet</span>
              <span className="val-stat-value">{(totalSqft / 1000).toFixed(0)}K SF</span>
              <span className="val-stat-sub">Across {properties.length} properties</span>
            </div>
            <div className="val-stat-card">
              <span className="val-stat-label">Annual NOI</span>
              <span className="val-stat-value">{formatCurrency(totalNOI)}</span>
              <span className="val-stat-change positive">+8.2% YoY</span>
            </div>
            <div className="val-stat-card">
              <span className="val-stat-label">Avg Occupancy</span>
              <span className="val-stat-value">{avgOccupancy}%</span>
              <span className="val-stat-sub">Portfolio-wide</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and View Toggle */}
      <section className="val-filters-section">
        <div className="container">
          <div className="val-filters-bar">
            <div className="val-type-filters">
              {["all", "office", "multifamily", "industrial", "retail", "medical"].map((type) => (
                <button
                  key={type}
                  className={`val-filter-btn ${selectedType === type ? "active" : ""}`}
                  onClick={() => setSelectedType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <div className="val-view-toggle">
              <button
                className={`val-view-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                className={`val-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Properties Grid/Table */}
      <section className="val-properties-section">
        <div className="container">
          {filteredProperties.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>No Properties in Portfolio</h3>
              <p style={{ color: "#888", marginTop: "0.5rem" }}>
                Properties will appear here as you add them to your portfolio.
              </p>
              <Link
                href="/valora/dashboard"
                className="val-btn primary"
                style={{ marginTop: "1.5rem", display: "inline-block" }}
              >
                Analyze a Property
              </Link>
            </div>
          ) : viewMode === "grid" ? (
            <div className="val-properties-grid">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="val-property-card"
                  onClick={() => setSelectedProperty(property)}
                >
                  <div className="val-property-image">
                    <span>{property.image}</span>
                    <span className={`val-property-status ${property.status}`}>
                      {property.status === "stabilized" ? "Stabilized" : "Lease-Up"}
                    </span>
                  </div>
                  <div className="val-property-content">
                    <h3>{property.name}</h3>
                    <p className="val-property-address">{property.address}</p>
                    <div className="val-property-type-badge">{property.type}</div>
                    <div className="val-property-metrics">
                      <div className="val-metric">
                        <span className="val-metric-value">{formatCurrency(property.value)}</span>
                        <span className="val-metric-label">Value</span>
                      </div>
                      <div className="val-metric">
                        <span className="val-metric-value">{property.occupancy}%</span>
                        <span className="val-metric-label">Occupied</span>
                      </div>
                      <div className="val-metric">
                        <span className="val-metric-value">{property.capRate}%</span>
                        <span className="val-metric-label">Cap Rate</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="val-properties-table">
              <div className="val-table-header">
                <span>Property</span>
                <span>Type</span>
                <span>Sq Ft</span>
                <span>Occupancy</span>
                <span>NOI</span>
                <span>Cap Rate</span>
                <span>Value</span>
              </div>
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="val-table-row"
                  onClick={() => setSelectedProperty(property)}
                >
                  <div className="val-table-property">
                    <span className="val-table-icon">{property.image}</span>
                    <div>
                      <span className="val-table-name">{property.name}</span>
                      <span className="val-table-address">{property.address}</span>
                    </div>
                  </div>
                  <span className="val-table-type">{property.type}</span>
                  <span>{(property.sqft / 1000).toFixed(0)}K</span>
                  <span className={property.occupancy >= 95 ? "positive" : property.occupancy >= 85 ? "" : "warning"}>
                    {property.occupancy}%
                  </span>
                  <span>{formatCurrency(property.noi)}</span>
                  <span>{property.capRate}%</span>
                  <span className="val-table-value">{formatCurrency(property.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tenant Overview */}
      <section className="val-tenants-section">
        <div className="container">
          <div className="val-section-card">
            <div className="val-section-header">
              <h2>Top Tenants</h2>
              <Link href="/valora/tenants" className="val-link">View All Tenants</Link>
            </div>
            <div className="val-tenants-table">
              <div className="val-tenants-header">
                <span>Tenant</span>
                <span>Property</span>
                <span>Sq Ft</span>
                <span>Rent/SF</span>
                <span>Lease End</span>
                <span>Status</span>
              </div>
              {tenants.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <p style={{ color: "#888" }}>No tenants to display. Tenants will appear here once properties are added.</p>
                </div>
              ) : tenants.map((tenant) => (
                <div key={tenant.id} className="val-tenant-row">
                  <span className="val-tenant-name">{tenant.name}</span>
                  <span className="val-tenant-property">{tenant.property}</span>
                  <span>{(tenant.sqft / 1000).toFixed(0)}K</span>
                  <span>${tenant.rent}</span>
                  <span>{tenant.lease_end}</span>
                  <span className={`val-tenant-status ${tenant.status}`}>
                    {tenant.status === "current" ? "Current" : "Expiring Soon"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <div className="val-modal-overlay" onClick={() => setSelectedProperty(null)}>
          <div className="val-modal" onClick={(e) => e.stopPropagation()}>
            <button className="val-modal-close" onClick={() => setSelectedProperty(null)}>×</button>
            <div className="val-modal-header">
              <span className="val-modal-icon">{selectedProperty.image}</span>
              <div>
                <h2>{selectedProperty.name}</h2>
                <p>{selectedProperty.address}</p>
              </div>
            </div>
            <div className="val-modal-stats">
              <div className="val-modal-stat">
                <span className="val-modal-stat-value">{formatCurrency(selectedProperty.value)}</span>
                <span className="val-modal-stat-label">Current Value</span>
              </div>
              <div className="val-modal-stat">
                <span className="val-modal-stat-value">{formatCurrency(selectedProperty.noi)}</span>
                <span className="val-modal-stat-label">Annual NOI</span>
              </div>
              <div className="val-modal-stat">
                <span className="val-modal-stat-value">{selectedProperty.capRate}%</span>
                <span className="val-modal-stat-label">Cap Rate</span>
              </div>
              <div className="val-modal-stat">
                <span className="val-modal-stat-value">{selectedProperty.occupancy}%</span>
                <span className="val-modal-stat-label">Occupancy</span>
              </div>
            </div>
            <div className="val-modal-details">
              <div className="val-modal-detail">
                <span className="val-modal-detail-label">Property Type</span>
                <span className="val-modal-detail-value">{selectedProperty.type}</span>
              </div>
              <div className="val-modal-detail">
                <span className="val-modal-detail-label">Square Feet</span>
                <span className="val-modal-detail-value">{selectedProperty.sqft.toLocaleString()} SF</span>
              </div>
              <div className="val-modal-detail">
                <span className="val-modal-detail-label">Units/Suites</span>
                <span className="val-modal-detail-value">{selectedProperty.units}</span>
              </div>
              <div className="val-modal-detail">
                <span className="val-modal-detail-label">Acquired</span>
                <span className="val-modal-detail-value">{selectedProperty.acquired}</span>
              </div>
            </div>
            <div className="val-modal-actions">
              <button className="val-btn secondary">Run Valuation</button>
              <button className="val-btn secondary">View Comps</button>
              <button className="val-btn primary">Edit Property</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
