"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

interface Resource {
  id: string;
  title: string;
  description: string;
  type: "guide" | "template";
  format: "PDF" | "Excel";
  fileName: string;
  filePath: string;
  isFree: boolean;
  category: string;
  hasAccess?: boolean;
  requiresSubscription?: boolean;
}

interface ResourcesResponse {
  success: boolean;
  data: {
    resources: Resource[];
    meta: {
      total: number;
      freeCount: number;
      premiumCount: number;
      isSubscribed: boolean;
    };
  };
}

export default function BusinessNowResourcesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "guides" | "templates">("all");
  const [resources, setResources] = useState<Resource[]>([]);
  const [meta, setMeta] = useState<ResourcesResponse["data"]["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch resources from API
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const typeParam = activeTab === "all" ? "" : activeTab === "guides" ? "guide" : "template";
      const url = `/api/business-now/resources${typeParam ? `?type=${typeParam}` : ""}`;

      const response = await fetch(url);
      const data: ResourcesResponse = await response.json();

      if (data.success) {
        setResources(data.data.resources);
        setMeta(data.data.meta);
      }
    } catch (error) {
      console.error("Failed to fetch resources:", error);
      showToast("Failed to load resources", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Show toast notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle download
  const handleDownload = async (resource: Resource) => {
    if (!resource.hasAccess) {
      setSelectedResource(resource);
      setShowSubscribeModal(true);
      return;
    }

    try {
      setDownloading(resource.id);

      // Request download URL from API
      const response = await fetch("/api/business-now/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.requiresSubscription) {
          setSelectedResource(resource);
          setShowSubscribeModal(true);
          return;
        }
        throw new Error(data.error || "Download failed");
      }

      // Trigger download
      const link = document.createElement("a");
      link.href = data.data.downloadUrl;
      link.download = data.data.resource.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Downloading ${resource.title}`, "success");
    } catch (error) {
      console.error("Download error:", error);
      showToast("Download failed. Please try again.", "error");
    } finally {
      setDownloading(null);
    }
  };

  // Filter counts
  const guidesCount = resources.filter(r => r.type === "guide").length;
  const templatesCount = resources.filter(r => r.type === "template").length;

  return (
    <main className="business-now-page">
      <Header />

      {/* Toast Notification */}
      {toast && (
        <div className={`bn-toast bn-toast--${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="bn-toast-close">×</button>
        </div>
      )}

      {/* Hero Section */}
      <section className="bn-resources-hero">
        <div className="container">
          <Link href="/business-now" className="bn-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Business Now
          </Link>
          <div className="bn-resources-header">
            <span className="bn-section-label">Resources</span>
            <h1>Tools for Structured Execution</h1>
            <p>
              Download our how-to guides and financial templates to implement the Business Now
              framework in your business. Free resources available—premium content with subscription.
            </p>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="bn-resources-filters">
        <div className="container">
          <div className="bn-filter-tabs">
            <button
              className={`bn-filter-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Resources ({meta?.total || resources.length})
            </button>
            <button
              className={`bn-filter-tab ${activeTab === "guides" ? "active" : ""}`}
              onClick={() => setActiveTab("guides")}
            >
              How-To Guides ({guidesCount})
            </button>
            <button
              className={`bn-filter-tab ${activeTab === "templates" ? "active" : ""}`}
              onClick={() => setActiveTab("templates")}
            >
              Excel Templates ({templatesCount})
            </button>
          </div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="bn-resources-grid-section">
        <div className="container">
          {loading ? (
            <div className="bn-loading-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bn-resource-card bn-resource-card--skeleton">
                  <div className="bn-skeleton bn-skeleton--icon"></div>
                  <div className="bn-skeleton bn-skeleton--title"></div>
                  <div className="bn-skeleton bn-skeleton--text"></div>
                  <div className="bn-skeleton bn-skeleton--text"></div>
                  <div className="bn-skeleton bn-skeleton--button"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bn-resources-grid">
              {resources.map((resource) => (
                <div key={resource.id} className="bn-resource-card">
                  <div className="bn-resource-header">
                    <div className="bn-resource-icon">
                      {resource.format === "PDF" ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10,9 9,9 8,9"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <line x1="3" y1="9" x2="21" y2="9"/>
                          <line x1="3" y1="15" x2="21" y2="15"/>
                          <line x1="9" y1="3" x2="9" y2="21"/>
                          <line x1="15" y1="3" x2="15" y2="21"/>
                        </svg>
                      )}
                    </div>
                    <div className="bn-resource-badges">
                      <span className={`bn-format-badge ${resource.format.toLowerCase()}`}>
                        {resource.format}
                      </span>
                      {resource.isFree ? (
                        <span className="bn-free-badge">Free</span>
                      ) : (
                        <span className="bn-premium-badge">Premium</span>
                      )}
                    </div>
                  </div>
                  <h3>{resource.title}</h3>
                  <p>{resource.description}</p>
                  <span className="bn-resource-category">{resource.category}</span>
                  <button
                    className={`bn-download-btn ${!resource.hasAccess ? "locked" : ""} ${downloading === resource.id ? "loading" : ""}`}
                    onClick={() => handleDownload(resource)}
                    disabled={downloading === resource.id}
                  >
                    {downloading === resource.id ? (
                      <>
                        <span className="bn-spinner"></span>
                        Preparing...
                      </>
                    ) : resource.hasAccess ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download {resource.format}
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                        Unlock with Subscription
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Subscription CTA */}
      {!meta?.isSubscribed && (
        <section className="bn-subscription-cta">
          <div className="container">
            <div className="bn-subscription-card">
              <div className="bn-subscription-content">
                <h2>Unlock All Resources</h2>
                <p>
                  Get access to all how-to guides, Excel templates, and future resources
                  with a Business Now subscription. New content added monthly.
                </p>
                <ul className="bn-subscription-benefits">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    All {meta?.total || 14} Resources
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    Monthly New Additions
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    Priority Email Support
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    Early Access to Features
                  </li>
                </ul>
              </div>
              <div className="bn-subscription-pricing">
                <div className="bn-price">
                  <span className="bn-price-amount">$19</span>
                  <span className="bn-price-period">/month</span>
                </div>
                <p className="bn-price-note">or $149/year (save 35%)</p>
                <Link href="/pricing" className="button bn-button-primary bn-button-large">
                  Subscribe Now
                </Link>
                <p className="bn-guarantee">30-day money-back guarantee</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Subscribe Modal */}
      {showSubscribeModal && selectedResource && (
        <div className="bn-modal-overlay" onClick={() => setShowSubscribeModal(false)}>
          <div className="bn-modal" onClick={(e) => e.stopPropagation()}>
            <button className="bn-modal-close" onClick={() => setShowSubscribeModal(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="bn-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <h3>Unlock "{selectedResource.title}"</h3>
            <p>
              This resource is available to Business Now subscribers. Get instant access
              to this and all other premium resources.
            </p>
            <div className="bn-modal-pricing">
              <span className="bn-modal-price">$19/month</span>
              <span className="bn-modal-price-note">Cancel anytime</span>
            </div>
            <div className="bn-modal-actions">
              <Link href="/pricing" className="button bn-button-primary">
                View Subscription Plans
              </Link>
              <button
                className="button bn-button-ghost"
                onClick={() => setShowSubscribeModal(false)}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
