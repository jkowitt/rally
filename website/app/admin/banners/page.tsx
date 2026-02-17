"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { rallyBanners, type BannerData } from "@/lib/rally-api";

const BANNER_SIZES: Record<string, { width: number; height: number; label: string }> = {
  leaderboard: { width: 728, height: 90, label: "Leaderboard (728x90)" },
  rectangle: { width: 300, height: 250, label: "Rectangle (300x250)" },
  skyscraper: { width: 160, height: 600, label: "Skyscraper (160x600)" },
  banner: { width: 468, height: 60, label: "Banner (468x60)" },
  custom: { width: 0, height: 0, label: "Custom Size" },
};

const availablePages = [
  { value: "/", label: "Homepage" },
  { value: "/about", label: "About Us" },
  { value: "/contact", label: "Contact" },
  { value: "/dashboard", label: "Dashboard" },
  { value: "/dashboard/gameday", label: "Gameday" },
  { value: "/dashboard/rewards", label: "Rewards" },
  { value: "/dashboard/capture", label: "Rally Capture" },
  { value: "/dashboard/game-lobby", label: "Game Lobby" },
  { value: "/dashboard/profile", label: "Profile" },
];

interface FormState {
  name: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
  position: string;
  size: string;
  customWidth?: number;
  customHeight?: number;
  pages: string[];
  isActive: boolean;
  startDate: string;
  endDate: string;
}

const emptyForm: FormState = {
  name: "",
  imageUrl: "",
  linkUrl: "",
  altText: "",
  position: "top",
  size: "leaderboard",
  pages: [],
  isActive: true,
  startDate: "",
  endDate: "",
};

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load banners
  useEffect(() => {
    rallyBanners.list().then((res) => {
      if (res.ok && res.data) setBanners(res.data.banners);
      setLoading(false);
    });
  }, []);

  const getCTR = (b: BannerData): string => {
    if (b.impressions === 0) return "0.00%";
    return ((b.clicks / b.impressions) * 100).toFixed(2) + "%";
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (banner: BannerData) => {
    setEditingId(banner.id);
    setFormData({
      name: banner.name,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      altText: banner.altText || "",
      position: banner.position,
      size: banner.size,
      customWidth: banner.customWidth || undefined,
      customHeight: banner.customHeight || undefined,
      pages: banner.pages,
      isActive: banner.isActive,
      startDate: banner.startDate?.split("T")[0] || "",
      endDate: banner.endDate?.split("T")[0] || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.imageUrl || !formData.linkUrl) {
      showToast("Name, image URL, and link URL are required", "error");
      return;
    }
    setSaving(true);

    const payload = {
      name: formData.name,
      imageUrl: formData.imageUrl,
      linkUrl: formData.linkUrl,
      altText: formData.altText || undefined,
      position: formData.position,
      size: formData.size,
      customWidth: formData.size === "custom" ? formData.customWidth : undefined,
      customHeight: formData.size === "custom" ? formData.customHeight : undefined,
      pages: formData.pages,
      isActive: formData.isActive,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    };

    if (editingId) {
      const res = await rallyBanners.update(editingId, payload);
      if (res.ok && res.data) {
        setBanners(banners.map((b) => (b.id === editingId ? res.data! : b)));
        showToast("Banner updated successfully");
      } else {
        showToast("Failed to update banner", "error");
      }
    } else {
      const res = await rallyBanners.create(payload as Parameters<typeof rallyBanners.create>[0]);
      if (res.ok && res.data) {
        setBanners([res.data, ...banners]);
        showToast("Banner created successfully");
      } else {
        showToast("Failed to create banner", "error");
      }
    }

    setSaving(false);
    setShowModal(false);
  };

  const toggleBannerStatus = async (id: string) => {
    const banner = banners.find((b) => b.id === id);
    if (!banner) return;
    const res = await rallyBanners.update(id, { isActive: !banner.isActive });
    if (res.ok && res.data) {
      setBanners(banners.map((b) => (b.id === id ? res.data! : b)));
    }
  };

  const deleteBanner = async (id: string) => {
    const res = await rallyBanners.delete(id);
    if (res.ok) {
      setBanners(banners.filter((b) => b.id !== id));
      showToast("Banner deleted");
    }
  };

  const handlePageSelection = (page: string) => {
    const currentPages = formData.pages;
    if (currentPages.includes(page)) {
      setFormData({ ...formData, pages: currentPages.filter((p) => p !== page) });
    } else {
      setFormData({ ...formData, pages: [...currentPages, page] });
    }
  };

  if (loading) {
    return (
      <div>
        <div className="admin-stats-grid" style={{ marginBottom: "1.5rem" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-stat-card">
              <div className="admin-stat-value" style={{ opacity: 0.3 }}>--</div>
              <div className="admin-stat-label">Loading...</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Row */}
      <div className="admin-stats-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{banners.length}</div>
          <div className="admin-stat-label">Total Banners</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{banners.filter((b) => b.isActive).length}</div>
          <div className="admin-stat-label">Active Banners</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">
            {banners.reduce((sum, b) => sum + b.impressions, 0).toLocaleString()}
          </div>
          <div className="admin-stat-label">Total Impressions</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">
            {banners.reduce((sum, b) => sum + b.clicks, 0).toLocaleString()}
          </div>
          <div className="admin-stat-label">Total Clicks</div>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Banner Ads</h2>
        <button onClick={openCreateModal} className="admin-btn admin-btn-primary">
          <span className="admin-btn-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          Create Banner
        </button>
      </div>

      {/* Empty State */}
      {banners.length === 0 && (
        <div className="admin-card" style={{ textAlign: "center", padding: "3rem" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ color: "var(--admin-text-secondary)", margin: "0 auto 1rem" }}>
            <rect x="2" y="7" width="20" height="10" rx="2" />
            <line x1="12" y1="3" x2="12" y2="7" />
            <line x1="8" y1="5" x2="12" y2="3" />
            <line x1="16" y1="5" x2="12" y2="3" />
          </svg>
          <h3 style={{ margin: "0 0 0.5rem" }}>No banners yet</h3>
          <p style={{ color: "var(--admin-text-secondary)", margin: "0 0 1.5rem" }}>
            Create your first banner ad to display across your site pages.
          </p>
          <button onClick={openCreateModal} className="admin-btn admin-btn-primary">
            Create Your First Banner
          </button>
        </div>
      )}

      {/* Banners Table */}
      {banners.length > 0 && (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Size</th>
                  <th>Pages</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id}>
                    <td>
                      <div
                        style={{
                          width: "80px",
                          height: "50px",
                          background: "var(--admin-bg)",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {banner.imageUrl ? (
                          <img
                            src={banner.imageUrl}
                            alt={banner.name}
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24" style={{ color: "var(--admin-text-secondary)" }}>
                            <rect x="2" y="7" width="20" height="10" rx="2" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{banner.name}</td>
                    <td style={{ textTransform: "capitalize" }}>{banner.position}</td>
                    <td>{BANNER_SIZES[banner.size]?.label || banner.size}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {banner.pages.slice(0, 2).map((page) => (
                          <span
                            key={page}
                            style={{
                              fontSize: "0.75rem",
                              background: "var(--admin-bg)",
                              padding: "0.125rem 0.375rem",
                              borderRadius: "4px",
                            }}
                          >
                            {page}
                          </span>
                        ))}
                        {banner.pages.length > 2 && (
                          <span style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>
                            +{banner.pages.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{banner.impressions.toLocaleString()}</td>
                    <td>{banner.clicks.toLocaleString()}</td>
                    <td>{getCTR(banner)}</td>
                    <td>
                      <button
                        onClick={() => toggleBannerStatus(banner.id)}
                        className={`admin-badge ${banner.isActive ? "admin-badge-success" : "admin-badge-warning"}`}
                        style={{ cursor: "pointer", border: "none" }}
                      >
                        {banner.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => openEditModal(banner)}
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: "0.375rem 0.625rem", fontSize: "0.8125rem" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBanner(banner.id)}
                          className="admin-btn admin-btn-danger"
                          style={{ padding: "0.375rem 0.625rem", fontSize: "0.8125rem" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editingId ? "Edit Banner" : "Create Banner"}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-form-label">Banner Name *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Homepage Hero Banner"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Position *</label>
                  <select
                    className="admin-form-select"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  >
                    <option value="top">Top Banner</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="inline">Inline (Within Content)</option>
                    <option value="footer">Footer</option>
                    <option value="popup">Popup</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Size *</label>
                  <select
                    className="admin-form-select"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  >
                    {Object.entries(BANNER_SIZES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.size === "custom" && (
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Width (px)</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={formData.customWidth || ""}
                      onChange={(e) => setFormData({ ...formData, customWidth: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Height (px)</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={formData.customHeight || ""}
                      onChange={(e) => setFormData({ ...formData, customHeight: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              <div className="admin-form-group">
                <label className="admin-form-label">Banner Image URL *</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/banner.jpg"
                  />
                  <Link href="/admin/media" className="admin-btn admin-btn-secondary">
                    Browse
                  </Link>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Link URL *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="/dashboard or https://example.com"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Alt Text</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.altText}
                  onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                  placeholder="Descriptive text for accessibility"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Display on Pages *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {availablePages.map((page) => (
                    <button
                      key={page.value}
                      type="button"
                      onClick={() => handlePageSelection(page.value)}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        border: "1px solid",
                        borderColor: formData.pages.includes(page.value) ? "var(--admin-accent)" : "var(--admin-border)",
                        background: formData.pages.includes(page.value) ? "rgba(59, 130, 246, 0.1)" : "white",
                        color: formData.pages.includes(page.value) ? "var(--admin-accent)" : "var(--admin-text)",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      {page.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Start Date (Optional)</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">End Date (Optional)</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span className="admin-form-label" style={{ margin: 0 }}>
                    Active (banner will be displayed immediately)
                  </span>
                </label>
              </div>

              {/* Preview */}
              {formData.imageUrl && (
                <div className="admin-form-group">
                  <label className="admin-form-label">Preview</label>
                  <div style={{ background: "var(--admin-bg)", padding: "1rem", borderRadius: "8px", textAlign: "center" }}>
                    <img
                      src={formData.imageUrl}
                      alt="Banner preview"
                      style={{ maxWidth: "100%", maxHeight: "200px", border: "1px solid var(--admin-border)", borderRadius: "4px" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)", marginTop: "0.5rem" }}>
                      {formData.size !== "custom"
                        ? `${BANNER_SIZES[formData.size]?.width || 0} x ${BANNER_SIZES[formData.size]?.height || 0}px`
                        : `${formData.customWidth || 0} x ${formData.customHeight || 0}px`}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setShowModal(false)} className="admin-btn admin-btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="admin-btn admin-btn-primary">
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
