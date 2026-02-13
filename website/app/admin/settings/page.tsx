"use client";

import { useState } from "react";

interface SiteSettings {
  siteName: string;
  tagline: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  socialLinks: { platform: string; url: string }[];
  analytics: {
    googleAnalyticsId: string;
    facebookPixelId: string;
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    defaultImage: string;
  };
}

const defaultSettings: SiteSettings = {
  siteName: "Loud Legacy Ventures",
  tagline: "Building legacies that echo through generations",
  logo: "/logos/loud-legacy.svg",
  favicon: "/favicon.ico",
  primaryColor: "#1B365D",
  secondaryColor: "#0F2440",
  accentColor: "#C9A227",
  fontHeading: "Georgia, serif",
  fontBody: "system-ui, -apple-system, sans-serif",
  socialLinks: [
    { platform: "linkedin", url: "https://linkedin.com/company/loud-legacy" },
    { platform: "twitter", url: "https://twitter.com/loudlegacy" },
    { platform: "instagram", url: "" },
    { platform: "facebook", url: "" },
  ],
  analytics: {
    googleAnalyticsId: "",
    facebookPixelId: "",
  },
  seo: {
    defaultTitle: "Loud Legacy Ventures",
    defaultDescription: "Building legacies that echo through generations. Explore our portfolio of innovative platforms.",
    defaultImage: "/og-image.jpg",
  },
};

const platformColors = {
  "Business Now": "#2D9CDB",
  "Legacy CRM": "#27AE60",
  Sportify: "#E74C3C",
  VALORA: "#9B59B6",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<"general" | "design" | "social" | "seo" | "analytics">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In production, this would save to API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setToast({ message: "Settings saved successfully", type: "success" });
    } catch {
      setToast({ message: "Failed to save settings", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSocialLink = (platform: string, url: string) => {
    setSettings({
      ...settings,
      socialLinks: settings.socialLinks.map((link) =>
        link.platform === platform ? { ...link, url } : link
      ),
    });
  };

  return (
    <div>
      {/* Tabs */}
      <div className="admin-tabs">
        {(["general", "design", "social", "seo", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            className={`admin-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="admin-card">
        {/* General Settings */}
        {activeTab === "general" && (
          <div>
            <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.125rem" }}>General Settings</h3>

            <div className="admin-form-group">
              <label className="admin-form-label">Site Name</label>
              <input
                type="text"
                className="admin-form-input"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Tagline</label>
              <input
                type="text"
                className="admin-form-input"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Logo URL</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={settings.logo}
                  onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Favicon URL</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={settings.favicon}
                  onChange={(e) => setSettings({ ...settings, favicon: e.target.value })}
                />
              </div>
            </div>

            {settings.logo && (
              <div className="admin-form-group">
                <label className="admin-form-label">Logo Preview</label>
                <div style={{ background: "var(--admin-bg)", padding: "1rem", borderRadius: "8px", display: "inline-block" }}>
                  <img src={settings.logo} alt="Logo preview" style={{ maxHeight: "60px" }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Design Settings */}
        {activeTab === "design" && (
          <div>
            <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.125rem" }}>Design & Branding</h3>

            <div style={{ marginBottom: "2rem" }}>
              <h4 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Main Site Colors</h4>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Primary Color</label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      style={{ width: "50px", height: "38px", padding: "0", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      className="admin-form-input"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Secondary Color</label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      style={{ width: "50px", height: "38px", padding: "0", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      className="admin-form-input"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Accent Color</label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      style={{ width: "50px", height: "38px", padding: "0", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      className="admin-form-input"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <h4 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Platform Colors (Read-only)</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                {Object.entries(platformColors).map(([name, color]) => (
                  <div key={name} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        background: color,
                        borderRadius: "8px",
                        margin: "0 auto 0.5rem",
                      }}
                    />
                    <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>{color}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Typography</h4>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Heading Font</label>
                  <select
                    className="admin-form-select"
                    value={settings.fontHeading}
                    onChange={(e) => setSettings({ ...settings, fontHeading: e.target.value })}
                  >
                    <option value="Georgia, serif">Georgia (Serif)</option>
                    <option value="'Playfair Display', serif">Playfair Display</option>
                    <option value="'Merriweather', serif">Merriweather</option>
                    <option value="system-ui, sans-serif">System UI (Sans-serif)</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Body Font</label>
                  <select
                    className="admin-form-select"
                    value={settings.fontBody}
                    onChange={(e) => setSettings({ ...settings, fontBody: e.target.value })}
                  >
                    <option value="system-ui, -apple-system, sans-serif">System UI</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Open Sans', sans-serif">Open Sans</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "1rem", padding: "1.5rem", background: "var(--admin-bg)", borderRadius: "8px" }}>
                <h2 style={{ fontFamily: settings.fontHeading, marginBottom: "0.5rem" }}>Heading Preview</h2>
                <p style={{ fontFamily: settings.fontBody, margin: 0, color: "var(--admin-text-secondary)" }}>
                  Body text preview. This is how your content will appear on the website.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Social Settings */}
        {activeTab === "social" && (
          <div>
            <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.125rem" }}>Social Media Links</h3>

            {settings.socialLinks.map((link) => (
              <div key={link.platform} className="admin-form-group">
                <label className="admin-form-label" style={{ textTransform: "capitalize" }}>
                  {link.platform}
                </label>
                <input
                  type="url"
                  className="admin-form-input"
                  value={link.url}
                  onChange={(e) => updateSocialLink(link.platform, e.target.value)}
                  placeholder={`https://${link.platform}.com/...`}
                />
              </div>
            ))}
          </div>
        )}

        {/* SEO Settings */}
        {activeTab === "seo" && (
          <div>
            <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.125rem" }}>SEO Settings</h3>

            <div className="admin-form-group">
              <label className="admin-form-label">Default Page Title</label>
              <input
                type="text"
                className="admin-form-input"
                value={settings.seo.defaultTitle}
                onChange={(e) =>
                  setSettings({ ...settings, seo: { ...settings.seo, defaultTitle: e.target.value } })
                }
              />
              <small style={{ color: "var(--admin-text-secondary)", marginTop: "0.25rem", display: "block" }}>
                Used when pages don't have a specific title
              </small>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Default Meta Description</label>
              <textarea
                className="admin-form-textarea"
                value={settings.seo.defaultDescription}
                onChange={(e) =>
                  setSettings({ ...settings, seo: { ...settings.seo, defaultDescription: e.target.value } })
                }
                rows={3}
              />
              <small style={{ color: "var(--admin-text-secondary)", marginTop: "0.25rem", display: "block" }}>
                {settings.seo.defaultDescription.length}/160 characters recommended
              </small>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Default Social Image (OG Image)</label>
              <input
                type="text"
                className="admin-form-input"
                value={settings.seo.defaultImage}
                onChange={(e) =>
                  setSettings({ ...settings, seo: { ...settings.seo, defaultImage: e.target.value } })
                }
                placeholder="/og-image.jpg"
              />
              <small style={{ color: "var(--admin-text-secondary)", marginTop: "0.25rem", display: "block" }}>
                Recommended size: 1200x630 pixels
              </small>
            </div>

            {/* SEO Preview */}
            <div style={{ marginTop: "1.5rem" }}>
              <label className="admin-form-label">Search Result Preview</label>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--admin-border)",
                  borderRadius: "8px",
                  padding: "1rem",
                }}
              >
                <div style={{ color: "#1a0dab", fontSize: "1.125rem", marginBottom: "0.25rem" }}>
                  {settings.seo.defaultTitle}
                </div>
                <div style={{ color: "#006621", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                  https://loud-legacy.com
                </div>
                <div style={{ color: "#545454", fontSize: "0.875rem" }}>
                  {settings.seo.defaultDescription}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Settings */}
        {activeTab === "analytics" && (
          <div>
            <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.125rem" }}>Analytics & Tracking</h3>

            <div className="admin-form-group">
              <label className="admin-form-label">Google Analytics ID</label>
              <input
                type="text"
                className="admin-form-input"
                value={settings.analytics.googleAnalyticsId}
                onChange={(e) =>
                  setSettings({ ...settings, analytics: { ...settings.analytics, googleAnalyticsId: e.target.value } })
                }
                placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Facebook Pixel ID</label>
              <input
                type="text"
                className="admin-form-input"
                value={settings.analytics.facebookPixelId}
                onChange={(e) =>
                  setSettings({ ...settings, analytics: { ...settings.analytics, facebookPixelId: e.target.value } })
                }
                placeholder="XXXXXXXXXXXXXXXX"
              />
            </div>

            <div
              style={{
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "8px",
                padding: "1rem",
                marginTop: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" width="20" height="20" style={{ flexShrink: 0, marginTop: "2px" }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div style={{ fontSize: "0.875rem", color: "var(--admin-text)" }}>
                  Analytics tracking codes will be automatically added to all pages. Make sure to comply with
                  privacy regulations (GDPR, CCPA) by implementing appropriate cookie consent.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--admin-border)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleSave} className="admin-btn admin-btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
