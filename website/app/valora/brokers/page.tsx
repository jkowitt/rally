"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

interface BrokerLead {
  id: string;
  propertyType: string;
  location: string;
  estimatedValue: number;
  leadType: "seller" | "buyer" | "refinance";
  status: "available" | "claimed" | "closed";
  postedDate: string;
  details: string;
  contactPreference: string;
}

interface BidPackage {
  id: string;
  name: string;
  leadsPerMonth: number;
  price: number;
  features: string[];
  popular?: boolean;
}

const SAMPLE_LEADS: BrokerLead[] = [];

const BID_PACKAGES: BidPackage[] = [
  {
    id: "starter",
    name: "Starter",
    leadsPerMonth: 5,
    price: 299,
    features: [
      "5 qualified leads per month",
      "Basic property data",
      "Email notifications",
      "Lead claiming (24hr window)",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    leadsPerMonth: 15,
    price: 699,
    features: [
      "15 qualified leads per month",
      "Full property analytics",
      "Email + SMS notifications",
      "Priority lead claiming (12hr window)",
      "Legacy RE valuation reports",
      "Dedicated support",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    leadsPerMonth: 50,
    price: 1499,
    features: [
      "50 qualified leads per month",
      "Full property analytics",
      "Real-time notifications",
      "Instant lead claiming",
      "Premium Legacy RE reports",
      "Account manager",
      "Custom territory",
      "API access",
    ],
  },
];

export default function BrokerPortalPage() {
  const [leads] = useState(SAMPLE_LEADS);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLeadType, setFilterLeadType] = useState<string>("all");
  const [showBidModal, setShowBidModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [claimedLeads, setClaimedLeads] = useState<string[]>([]);

  const filteredLeads = leads.filter(lead => {
    if (filterType !== "all" && lead.propertyType.toLowerCase() !== filterType) return false;
    if (filterLeadType !== "all" && lead.leadType !== filterLeadType) return false;
    return true;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const handleClaimLead = (leadId: string) => {
    if (!isSubscribed) {
      setShowSubscribeModal(true);
      return;
    }
    setClaimedLeads(prev => [...prev, leadId]);
    alert("Lead claimed successfully! Contact details have been sent to your email.");
  };

  const handleSubscribe = () => {
    if (!selectedPackage) return;
    setIsSubscribed(true);
    setShowSubscribeModal(false);
    alert(`Successfully subscribed to ${BID_PACKAGES.find(p => p.id === selectedPackage)?.name} plan!`);
  };

  return (
    <main className="valora-dashboard-page">
      <Header />

      {/* Page Header */}
      <section className="val-dash-header">
        <div className="container">
          <div className="val-dash-header-content">
            <div>
              <div className="val-breadcrumb">
                <Link href="/valora">Legacy RE</Link>
                <span>/</span>
                <span>Broker Portal</span>
              </div>
              <h1>Broker Lead Portal</h1>
              <p>Access qualified buyer, seller, and refinance leads with monthly subscriptions</p>
            </div>
            <div className="val-dash-actions">
              <Link href="/valora/dashboard" className="val-dash-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </Link>
              {isSubscribed ? (
                <div className="val-dash-btn primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Subscribed
                </div>
              ) : (
                <button className="val-dash-btn primary" onClick={() => setShowBidModal(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Subscribe for Leads
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="val-broker-main">
        <div className="container">
          {/* Stats */}
          <div className="val-broker-stats">
            <div className="val-broker-stat">
              <span className="stat-value">{leads.filter(l => l.status === "available").length}</span>
              <span className="stat-label">Available Leads</span>
            </div>
            <div className="val-broker-stat">
              <span className="stat-value">{formatCurrency(leads.length > 0 ? leads.reduce((sum, l) => sum + l.estimatedValue, 0) / leads.length : 0)}</span>
              <span className="stat-label">Avg. Deal Size</span>
            </div>
            <div className="val-broker-stat">
              <span className="stat-value">{leads.filter(l => l.leadType === "seller").length}</span>
              <span className="stat-label">Seller Leads</span>
            </div>
            <div className="val-broker-stat">
              <span className="stat-value">{leads.filter(l => l.leadType === "buyer").length}</span>
              <span className="stat-label">Buyer Leads</span>
            </div>
          </div>

          {/* Filters */}
          <div className="val-broker-filters">
            <div className="val-broker-filter-group">
              <label>Property Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="multifamily">Multifamily</option>
                <option value="office">Office</option>
                <option value="industrial">Industrial</option>
                <option value="retail">Retail</option>
              </select>
            </div>
            <div className="val-broker-filter-group">
              <label>Lead Type</label>
              <select value={filterLeadType} onChange={(e) => setFilterLeadType(e.target.value)}>
                <option value="all">All Leads</option>
                <option value="seller">Sellers</option>
                <option value="buyer">Buyers</option>
                <option value="refinance">Refinance</option>
              </select>
            </div>
          </div>

          {/* Leads List */}
          <div className="val-broker-leads">
            <div className="val-broker-leads-header">
              <h3>Available Leads</h3>
              <span>{filteredLeads.length} leads matching filters</span>
            </div>
            <div className="val-broker-leads-list">
              {filteredLeads.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem" }}>No Broker Leads Available</h4>
                  <p style={{ margin: 0, color: "#6b7280" }}>Leads will appear here as property owners submit listings.</p>
                </div>
              )}
              {filteredLeads.map(lead => (
                <div key={lead.id} className={`val-broker-lead-card ${lead.status === "claimed" || claimedLeads.includes(lead.id) ? "claimed" : ""}`}>
                  <div className="lead-header">
                    <div className="lead-type-badge" data-type={lead.leadType}>
                      {lead.leadType === "seller" ? "Seller" : lead.leadType === "buyer" ? "Buyer" : "Refinance"}
                    </div>
                    <span className="lead-date">Posted {new Date(lead.postedDate).toLocaleDateString()}</span>
                  </div>
                  <div className="lead-content">
                    <div className="lead-main">
                      <h4>{lead.propertyType}</h4>
                      <p className="lead-location">{lead.location}</p>
                      <p className="lead-value">{formatCurrency(lead.estimatedValue)}</p>
                    </div>
                    <div className="lead-details">
                      <p>{lead.details}</p>
                      <span className="contact-pref">Prefers: {lead.contactPreference}</span>
                    </div>
                  </div>
                  <div className="lead-actions">
                    {lead.status === "claimed" || claimedLeads.includes(lead.id) ? (
                      <span className="lead-claimed-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        {claimedLeads.includes(lead.id) ? "Claimed by You" : "Claimed"}
                      </span>
                    ) : (
                      <button className="val-broker-claim-btn" onClick={() => handleClaimLead(lead.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                        Claim Lead
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Plans */}
          {!isSubscribed && (
            <div className="val-broker-plans-section">
              <div className="val-broker-plans-header">
                <h3>Lead Subscription Plans</h3>
                <p>Choose a plan to access qualified real estate leads each month</p>
              </div>
              <div className="val-broker-plans-grid">
                {BID_PACKAGES.map(pkg => (
                  <div key={pkg.id} className={`val-broker-plan-card ${pkg.popular ? "popular" : ""} ${selectedPackage === pkg.id ? "selected" : ""}`} onClick={() => setSelectedPackage(pkg.id)}>
                    {pkg.popular && <span className="popular-badge">Most Popular</span>}
                    <h4>{pkg.name}</h4>
                    <div className="plan-price">
                      <span className="price">${pkg.price}</span>
                      <span className="period">/month</span>
                    </div>
                    <div className="plan-leads">
                      <span className="leads-count">{pkg.leadsPerMonth}</span>
                      <span>leads per month</span>
                    </div>
                    <ul className="plan-features">
                      {pkg.features.map((feature, i) => (
                        <li key={i}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button className={`plan-select-btn ${selectedPackage === pkg.id ? "selected" : ""}`} onClick={(e) => { e.stopPropagation(); setSelectedPackage(pkg.id); setShowSubscribeModal(true); }}>
                      {selectedPackage === pkg.id ? "Selected" : "Select Plan"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="val-broker-how-it-works">
            <h3>How It Works</h3>
            <div className="val-broker-steps">
              <div className="step">
                <div className="step-number">1</div>
                <h4>Choose a Plan</h4>
                <p>Select a subscription plan based on your lead volume needs</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <h4>Browse Leads</h4>
                <p>Access our curated list of qualified buyer, seller, and refinance leads</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <h4>Claim Leads</h4>
                <p>Use your monthly credits to claim leads and get full contact details</p>
              </div>
              <div className="step">
                <div className="step-number">4</div>
                <h4>Close Deals</h4>
                <p>Connect with clients and close more transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bid/Subscribe Modal */}
      {showBidModal && (
        <div className="val-modal-overlay" onClick={() => setShowBidModal(false)}>
          <div className="val-modal val-broker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="val-modal-header">
              <h3>Choose Your Plan</h3>
              <button onClick={() => setShowBidModal(false)}>×</button>
            </div>
            <div className="val-modal-content">
              <div className="val-broker-modal-plans">
                {BID_PACKAGES.map(pkg => (
                  <div key={pkg.id} className={`modal-plan-option ${selectedPackage === pkg.id ? "selected" : ""}`} onClick={() => setSelectedPackage(pkg.id)}>
                    <div className="plan-radio">
                      <div className={`radio-dot ${selectedPackage === pkg.id ? "active" : ""}`}></div>
                    </div>
                    <div className="plan-info">
                      <span className="plan-name">{pkg.name}</span>
                      <span className="plan-details">{pkg.leadsPerMonth} leads/mo</span>
                    </div>
                    <span className="plan-price">${pkg.price}/mo</span>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="cancel" onClick={() => setShowBidModal(false)}>Cancel</button>
                <button className="subscribe" onClick={handleSubscribe} disabled={!selectedPackage}>Subscribe Now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscribe Prompt Modal */}
      {showSubscribeModal && !isSubscribed && (
        <div className="val-modal-overlay" onClick={() => setShowSubscribeModal(false)}>
          <div className="val-modal" onClick={(e) => e.stopPropagation()}>
            <div className="val-modal-header">
              <h3>Subscribe to Claim Leads</h3>
              <button onClick={() => setShowSubscribeModal(false)}>×</button>
            </div>
            <div className="val-modal-content">
              <p>You need an active subscription to claim leads. Choose a plan to get started:</p>
              <div className="val-broker-modal-plans">
                {BID_PACKAGES.map(pkg => (
                  <div key={pkg.id} className={`modal-plan-option ${selectedPackage === pkg.id ? "selected" : ""}`} onClick={() => setSelectedPackage(pkg.id)}>
                    <div className="plan-radio">
                      <div className={`radio-dot ${selectedPackage === pkg.id ? "active" : ""}`}></div>
                    </div>
                    <div className="plan-info">
                      <span className="plan-name">{pkg.name}</span>
                      <span className="plan-details">{pkg.leadsPerMonth} leads/mo</span>
                    </div>
                    <span className="plan-price">${pkg.price}/mo</span>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="cancel" onClick={() => setShowSubscribeModal(false)}>Cancel</button>
                <button className="subscribe" onClick={handleSubscribe} disabled={!selectedPackage}>Subscribe Now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
