"use client";

import Link from "next/link";
import { useState } from "react";

interface PageInfo {
  path: string;
  title: string;
  status: "published" | "draft" | "scheduled";
  lastModified: string;
  platform?: string;
}

const sitePages: PageInfo[] = [
  { path: "/", title: "Homepage", status: "published", lastModified: "2024-01-15", platform: "main" },
  { path: "/about", title: "About Us", status: "published", lastModified: "2024-01-10", platform: "main" },
  { path: "/contact", title: "Contact", status: "published", lastModified: "2024-01-08", platform: "main" },
  { path: "/business-now", title: "Business Now", status: "published", lastModified: "2024-01-18", platform: "business-now" },
  { path: "/business-now/resources", title: "Business Now Resources", status: "published", lastModified: "2024-01-17", platform: "business-now" },
  { path: "/legacy-crm", title: "Legacy CRM", status: "published", lastModified: "2024-01-19", platform: "legacy-crm" },
  { path: "/legacy-crm/demo", title: "Legacy CRM Demo", status: "published", lastModified: "2024-01-19", platform: "legacy-crm" },
  { path: "/sportify", title: "Sportify", status: "draft", lastModified: "2024-01-05", platform: "sportify" },
  { path: "/valora", title: "Legacy RE", status: "draft", lastModified: "2024-01-05", platform: "valora" },
];

const platformColors: Record<string, string> = {
  main: "#1B365D",
  "business-now": "#2D9CDB",
  "legacy-crm": "#27AE60",
  sportify: "#E74C3C",
  valora: "#9B59B6",
};

export default function AdminPagesPage() {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPages = sitePages.filter((page) => {
    const matchesFilter = filter === "all" || page.platform === filter || page.status === filter;
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      {/* Header Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-form-input"
              style={{ width: "280px", paddingLeft: "2.5rem" }}
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "18px",
                height: "18px",
                color: "var(--admin-text-secondary)",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="admin-form-select"
            style={{ width: "160px" }}
          >
            <option value="all">All Pages</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="main">Main Site</option>
            <option value="business-now">Business Now</option>
            <option value="legacy-crm">Legacy CRM</option>
            <option value="sportify">Sportify</option>
            <option value="valora">Legacy RE</option>
          </select>
        </div>
      </div>

      {/* Pages Table */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Path</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Last Modified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => (
                <tr key={page.path}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{page.title}</div>
                  </td>
                  <td>
                    <code style={{ fontSize: "0.8125rem", background: "var(--admin-bg)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
                      {page.path}
                    </code>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: platformColors[page.platform || "main"],
                        }}
                      />
                      {page.platform === "main" ? "Main Site" : page.platform?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${page.status === "published" ? "success" : page.status === "draft" ? "warning" : "info"}`}>
                      {page.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--admin-text-secondary)" }}>
                    {new Date(page.lastModified).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Link
                        href={`/admin/pages/edit?path=${encodeURIComponent(page.path)}`}
                        className="admin-btn admin-btn-primary"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem" }}
                      >
                        <span className="admin-btn-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </span>
                        Edit
                      </Link>
                      <Link
                        href={`${page.path}?preview=true`}
                        target="_blank"
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem" }}
                      >
                        <span className="admin-btn-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </span>
                        Preview
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
