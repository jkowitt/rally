"use client";

import { useState, useEffect } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed?: string;
  createdAt: string;
  isActive: boolean;
}

interface DatabaseTable {
  name: string;
  rowCount: number;
  size: string;
}

interface ColumnInfo {
  name: string;
  type: string;
}

interface BrowseState {
  table: string;
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
  sort: string;
  dir: "asc" | "desc";
  loading: boolean;
}

type DbView = "browse" | "query";

interface PlatformSettings {
  id: string;
  name: string;
  slug: string;
  color: string;
  paymentRequired: boolean;
  trialDays: number;
  betaEnabled: boolean;
}

interface BetaTester {
  id: string;
  email: string;
  name: string;
  signupDate: string;
  platforms: string[];
  status: "active" | "invited" | "churned";
}

const demoLogs: LogEntry[] = [];
const demoAPIKeys: APIKey[] = [];

const FALLBACK_TABLES: DatabaseTable[] = [];

const demoPlatformSettings: PlatformSettings[] = [];
const demoBetaTesters: BetaTester[] = [];

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<"database" | "api" | "logs" | "env" | "webhooks" | "settings">("settings");
  const [logs, setLogs] = useState<LogEntry[]>(demoLogs);
  const [apiKeys, setApiKeys] = useState<APIKey[]>(demoAPIKeys);
  const [tables, setTables] = useState<DatabaseTable[]>(FALLBACK_TABLES);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM \"User\" LIMIT 10;");
  const [isQuerying, setIsQuerying] = useState(false);
  const [dbView, setDbView] = useState<DbView>("browse");
  const [browse, setBrowse] = useState<BrowseState>({
    table: "",
    columns: [],
    rows: [],
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
    search: "",
    sort: "id",
    dir: "desc",
    loading: false,
  });
  const [logFilter, setLogFilter] = useState<string>("all");
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["read"]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings[]>(demoPlatformSettings);
  const [betaTesters, setBetaTesters] = useState<BetaTester[]>(demoBetaTesters);
  const [globalBetaMode, setGlobalBetaMode] = useState(true);
  const [requirePaymentGlobally, setRequirePaymentGlobally] = useState(false);

  // Environment variables (safe to display)
  const envVars = [
    { key: "NODE_ENV", value: process.env.NODE_ENV || "development", sensitive: false },
    { key: "NEXTAUTH_URL", value: "https://loud-legacy.com", sensitive: false },
    { key: "DATABASE_URL", value: "postgresql://****:****@****:5432/loud_legacy", sensitive: true },
    { key: "NEXTAUTH_SECRET", value: "••••••••••••••••", sensitive: true },
    { key: "GOOGLE_CLIENT_ID", value: "******.apps.googleusercontent.com", sensitive: true },
    { key: "STRIPE_SECRET_KEY", value: "sk_live_••••••••••••", sensitive: true },
    { key: "ADMIN_SETUP_SECRET", value: "••••••••••••••••", sensitive: true },
  ];

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch live table list from database
  const fetchTables = async () => {
    setTablesLoading(true);
    try {
      const res = await fetch("/api/admin/database/tables");
      const data = await res.json();
      if (data.success) {
        setTables(data.tables);
        setDbConnected(true);
      } else {
        setDbConnected(false);
        setTables(FALLBACK_TABLES);
      }
    } catch {
      setDbConnected(false);
      setTables(FALLBACK_TABLES);
    } finally {
      setTablesLoading(false);
    }
  };

  // Browse a table with pagination
  const browseTable = async (
    table: string,
    page = 1,
    search = "",
    sort = "id",
    dir: "asc" | "desc" = "desc"
  ) => {
    setBrowse((prev) => ({ ...prev, loading: true, table }));
    try {
      const params = new URLSearchParams({
        table,
        page: String(page),
        pageSize: String(browse.pageSize),
        sort,
        dir,
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/admin/database/browse?${params}`);
      const data = await res.json();
      if (data.success) {
        setBrowse({
          table,
          columns: data.columns,
          rows: data.rows,
          page: data.pagination.page,
          pageSize: data.pagination.pageSize,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
          search,
          sort,
          dir,
          loading: false,
        });
      } else {
        setToast({ message: data.error || "Failed to browse table", type: "error" });
        setBrowse((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setToast({ message: "Network error loading table data", type: "error" });
      setBrowse((prev) => ({ ...prev, loading: false }));
    }
  };

  // Execute SQL query via API
  const runQuery = async () => {
    setIsQuerying(true);
    setQueryError(null);
    try {
      const res = await fetch("/api/admin/database/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlQuery }),
      });
      const data = await res.json();
      if (data.success) {
        setQueryResult(data.rows);
        setToast({ message: `Query returned ${data.rowCount} row${data.rowCount !== 1 ? "s" : ""}`, type: "success" });
      } else {
        setQueryError(data.detail || data.error || "Query failed");
        setQueryResult(null);
      }
    } catch {
      setQueryError("Network error executing query");
      setQueryResult(null);
    } finally {
      setIsQuerying(false);
    }
  };

  // Load tables when database tab is first opened
  useEffect(() => {
    if (activeTab === "database" && dbConnected === null) {
      fetchTables();
    }
  }, [activeTab]);

  const createAPIKey = () => {
    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      permissions: newKeyPermissions,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    setApiKeys([newKey, ...apiKeys]);
    setShowNewKeyModal(false);
    setNewKeyName("");
    setNewKeyPermissions(["read"]);
    setToast({ message: "API key created successfully", type: "success" });
  };

  const toggleKeyStatus = (id: string) => {
    setApiKeys(apiKeys.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k));
  };

  const deleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
    setToast({ message: "API key deleted", type: "success" });
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredLogs = logFilter === "all" ? logs : logs.filter(l => l.level === logFilter);

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error": return "#EF4444";
      case "warn": return "#F59E0B";
      case "info": return "#3B82F6";
      case "debug": return "#8B5CF6";
      default: return "#6B7280";
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="admin-tabs">
        {[
          { id: "settings", label: "Platform Settings", icon: "⚡" },
          { id: "database", label: "Database", icon: "🗄️" },
          { id: "api", label: "API Keys", icon: "🔑" },
          { id: "logs", label: "System Logs", icon: "📋" },
          { id: "env", label: "Environment", icon: "⚙️" },
          { id: "webhooks", label: "Webhooks", icon: "🔗" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <span style={{ marginRight: "0.5rem" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Global Settings Card */}
          <div className="admin-card">
            <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.125rem", fontWeight: 700 }}>Global Settings</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* BETA Mode Toggle */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.25rem",
                background: globalBetaMode ? "rgba(34, 197, 94, 0.1)" : "var(--admin-bg)",
                borderRadius: "12px",
                border: globalBetaMode ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid var(--admin-border)",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                    <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>BETA Mode</h4>
                    {globalBetaMode && (
                      <span className="admin-badge admin-badge-success">Active</span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: "var(--admin-text-secondary)", fontSize: "0.875rem" }}>
                    When enabled, all new signups are marked as BETA testers with free access to all platforms.
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={globalBetaMode}
                    onChange={(e) => {
                      setGlobalBetaMode(e.target.checked);
                      setToast({ message: e.target.checked ? "BETA mode enabled" : "BETA mode disabled", type: "success" });
                    }}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Payment Required Toggle */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.25rem",
                background: requirePaymentGlobally ? "rgba(239, 68, 68, 0.1)" : "var(--admin-bg)",
                borderRadius: "12px",
                border: requirePaymentGlobally ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--admin-border)",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                    <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Require Payment Globally</h4>
                    {requirePaymentGlobally && (
                      <span className="admin-badge admin-badge-error">Payments Required</span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: "var(--admin-text-secondary)", fontSize: "0.875rem" }}>
                    Override individual platform settings and require payment for all platforms.
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={requirePaymentGlobally}
                    onChange={(e) => {
                      setRequirePaymentGlobally(e.target.checked);
                      if (e.target.checked) {
                        setPlatformSettings(platformSettings.map(p => ({ ...p, paymentRequired: true })));
                      }
                      setToast({ message: e.target.checked ? "Payment now required for all platforms" : "Payment requirement removed", type: "success" });
                    }}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Platform Payment Settings */}
          <div className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>Platform Payment Settings</h3>
                <p style={{ margin: "0.25rem 0 0", color: "var(--admin-text-secondary)", fontSize: "0.875rem" }}>
                  Configure payment requirements and trial periods for each platform
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {platformSettings.map((platform) => (
                <div
                  key={platform.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "200px 1fr 150px 150px",
                    gap: "1.5rem",
                    alignItems: "center",
                    padding: "1.25rem",
                    background: "var(--admin-bg)",
                    borderRadius: "12px",
                    border: "1px solid var(--admin-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: platform.color,
                    }} />
                    <span style={{ fontWeight: 600, color: "var(--admin-text)" }}>{platform.name}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <label style={{ fontSize: "0.875rem", color: "var(--admin-text-secondary)" }}>Trial Days:</label>
                    <select
                      value={platform.trialDays}
                      onChange={(e) => {
                        setPlatformSettings(platformSettings.map(p =>
                          p.id === platform.id ? { ...p, trialDays: parseInt(e.target.value) } : p
                        ));
                        setToast({ message: `${platform.name} trial updated to ${e.target.value} days`, type: "success" });
                      }}
                      className="admin-form-select"
                      style={{ width: "100px" }}
                    >
                      <option value="0">No trial</option>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label className="toggle-switch toggle-switch-small">
                      <input
                        type="checkbox"
                        checked={platform.paymentRequired}
                        disabled={requirePaymentGlobally}
                        onChange={(e) => {
                          setPlatformSettings(platformSettings.map(p =>
                            p.id === platform.id ? { ...p, paymentRequired: e.target.checked } : p
                          ));
                          setToast({ message: `${platform.name} payment ${e.target.checked ? "required" : "not required"}`, type: "success" });
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span style={{ fontSize: "0.8125rem", color: platform.paymentRequired ? "#EF4444" : "#22c55e" }}>
                      {platform.paymentRequired ? "Payment Required" : "Free Access"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label className="toggle-switch toggle-switch-small">
                      <input
                        type="checkbox"
                        checked={platform.betaEnabled}
                        onChange={(e) => {
                          setPlatformSettings(platformSettings.map(p =>
                            p.id === platform.id ? { ...p, betaEnabled: e.target.checked } : p
                          ));
                          setToast({ message: `${platform.name} BETA ${e.target.checked ? "enabled" : "disabled"}`, type: "success" });
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span style={{ fontSize: "0.8125rem", color: platform.betaEnabled ? "#22c55e" : "var(--admin-text-secondary)" }}>
                      {platform.betaEnabled ? "BETA On" : "BETA Off"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "8px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" width="20" height="20" style={{ flexShrink: 0, marginTop: "2px" }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div>
                  <strong style={{ color: "#3B82F6" }}>Current Status</strong>
                  <p style={{ margin: "0.25rem 0 0", color: "var(--admin-text)", fontSize: "0.875rem" }}>
                    {globalBetaMode
                      ? "BETA mode is active. All new signups get free access without payment."
                      : requirePaymentGlobally
                        ? "Payment is required for all platforms."
                        : "Mixed mode: Check individual platform settings above."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BETA Testers */}
          <div className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>BETA Testers</h3>
                <p style={{ margin: "0.25rem 0 0", color: "var(--admin-text-secondary)", fontSize: "0.875rem" }}>
                  {betaTesters.filter(b => b.status === "active").length} active BETA testers
                </p>
              </div>
              <button className="admin-btn admin-btn-secondary">
                Export List
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="admin-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Signup Date</th>
                    <th>Platforms</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {betaTesters.map((tester) => (
                    <tr key={tester.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{tester.name}</div>
                          <div style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>{tester.email}</div>
                        </div>
                      </td>
                      <td>{new Date(tester.signupDate).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          {tester.platforms.length > 0 ? tester.platforms.map(p => (
                            <span key={p} style={{
                              padding: "0.125rem 0.375rem",
                              background: "var(--admin-bg)",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              textTransform: "capitalize",
                            }}>
                              {p.replace("-", " ")}
                            </span>
                          )) : <span style={{ color: "var(--admin-text-secondary)", fontSize: "0.8125rem" }}>None yet</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge ${
                          tester.status === "active" ? "admin-badge-success" :
                          tester.status === "invited" ? "admin-badge-warning" :
                          "admin-badge-error"
                        }`}>
                          {tester.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="admin-btn admin-btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                            View
                          </button>
                          <button
                            className="admin-btn admin-btn-danger"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => {
                              setBetaTesters(betaTesters.filter(b => b.id !== tester.id));
                              setToast({ message: "BETA tester removed", type: "success" });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Database Tab */}
      {activeTab === "database" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Connection status bar */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            background: dbConnected === true ? "rgba(34, 197, 94, 0.1)" : dbConnected === false ? "rgba(239, 68, 68, 0.1)" : "var(--admin-bg)",
            border: `1px solid ${dbConnected === true ? "rgba(34, 197, 94, 0.3)" : dbConnected === false ? "rgba(239, 68, 68, 0.3)" : "var(--admin-border)"}`,
            borderRadius: "8px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: dbConnected === true ? "#22c55e" : dbConnected === false ? "#ef4444" : "#94a3b8",
                boxShadow: dbConnected === true ? "0 0 6px rgba(34, 197, 94, 0.5)" : "none",
              }} />
              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--admin-text)" }}>
                {dbConnected === null ? "Checking connection..." : dbConnected ? "Connected to PostgreSQL" : "Database not connected"}
              </span>
              {dbConnected && (
                <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>
                  {tables.length} table{tables.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className={`admin-btn ${dbView === "browse" ? "admin-btn-primary" : "admin-btn-secondary"}`}
                style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                onClick={() => setDbView("browse")}
              >
                Browse
              </button>
              <button
                className={`admin-btn ${dbView === "query" ? "admin-btn-primary" : "admin-btn-secondary"}`}
                style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                onClick={() => setDbView("query")}
              >
                SQL Query
              </button>
              <button
                className="admin-btn admin-btn-secondary"
                style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                onClick={fetchTables}
                disabled={tablesLoading}
              >
                {tablesLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem" }}>
            {/* Tables sidebar */}
            <div className="admin-card" style={{ maxHeight: "75vh", overflowY: "auto" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 600 }}>Tables</h3>
              {tablesLoading ? (
                <div style={{ padding: "2rem 0", textAlign: "center", color: "var(--admin-text-secondary)", fontSize: "0.875rem" }}>
                  Loading tables...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {tables.map((table) => (
                    <button
                      key={table.name}
                      onClick={() => {
                        setSelectedTable(table.name);
                        if (dbView === "browse") {
                          browseTable(table.name);
                        } else {
                          setSqlQuery(`SELECT * FROM "${table.name}" LIMIT 25;`);
                        }
                      }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.625rem 0.75rem",
                        background: selectedTable === table.name ? "rgba(27, 42, 74, 0.1)" : "transparent",
                        border: selectedTable === table.name ? "1px solid rgba(27, 42, 74, 0.25)" : "1px solid transparent",
                        borderRadius: "6px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                        color: "var(--admin-text)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: selectedTable === table.name ? 600 : 500, fontSize: "0.875rem" }}>{table.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>
                          {table.rowCount.toLocaleString()} rows
                        </div>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--admin-text-secondary)", fontFamily: "monospace" }}>{table.size}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main content area */}
            <div className="admin-card" style={{ minHeight: "400px" }}>
              {dbView === "browse" ? (
                /* ── Browse Mode ────────────────────────────────── */
                browse.table ? (
                  <div>
                    {/* Table header with search and pagination */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>{browse.table}</h3>
                        <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>
                          {browse.total.toLocaleString()} total row{browse.total !== 1 ? "s" : ""}
                          {browse.columns.length > 0 && ` · ${browse.columns.length} columns`}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="Search rows..."
                          value={browse.search}
                          onChange={(e) => setBrowse((prev) => ({ ...prev, search: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") browseTable(browse.table, 1, browse.search, browse.sort, browse.dir);
                          }}
                          style={{
                            padding: "0.375rem 0.75rem",
                            border: "1px solid var(--admin-border)",
                            borderRadius: "6px",
                            fontSize: "0.8125rem",
                            background: "var(--admin-bg)",
                            color: "var(--admin-text)",
                            width: "200px",
                          }}
                        />
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                          onClick={() => browseTable(browse.table, 1, browse.search, browse.sort, browse.dir)}
                        >
                          Search
                        </button>
                      </div>
                    </div>

                    {browse.loading ? (
                      <div style={{ padding: "3rem 0", textAlign: "center", color: "var(--admin-text-secondary)" }}>
                        Loading rows...
                      </div>
                    ) : browse.rows.length === 0 ? (
                      <div style={{ padding: "3rem 0", textAlign: "center", color: "var(--admin-text-secondary)" }}>
                        No rows found{browse.search ? ` matching "${browse.search}"` : ""}
                      </div>
                    ) : (
                      <>
                        {/* Data table */}
                        <div style={{ overflowX: "auto", border: "1px solid var(--admin-border)", borderRadius: "8px", marginBottom: "1rem" }}>
                          <table className="admin-table" style={{ margin: 0, fontSize: "0.8125rem" }}>
                            <thead>
                              <tr>
                                {browse.columns.map((col) => (
                                  <th
                                    key={col.name}
                                    style={{ whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}
                                    onClick={() => {
                                      const newDir = browse.sort === col.name && browse.dir === "asc" ? "desc" : "asc";
                                      browseTable(browse.table, browse.page, browse.search, col.name, newDir);
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                      {col.name}
                                      {browse.sort === col.name && (
                                        <span style={{ fontSize: "0.7rem" }}>{browse.dir === "asc" ? " \u25B2" : " \u25BC"}</span>
                                      )}
                                      <span style={{
                                        fontSize: "0.65rem",
                                        color: "var(--admin-text-secondary)",
                                        fontWeight: 400,
                                        marginLeft: "0.25rem",
                                      }}>
                                        {col.type}
                                      </span>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {browse.rows.map((row, i) => (
                                <tr key={i}>
                                  {browse.columns.map((col) => {
                                    const val = row[col.name];
                                    let display: string;
                                    if (val === null || val === undefined) {
                                      display = "NULL";
                                    } else if (typeof val === "object") {
                                      display = JSON.stringify(val);
                                    } else {
                                      display = String(val);
                                    }
                                    // Truncate long values
                                    const truncated = display.length > 80 ? display.slice(0, 77) + "..." : display;
                                    return (
                                      <td
                                        key={col.name}
                                        title={display.length > 80 ? display : undefined}
                                        style={{
                                          fontFamily: "monospace",
                                          fontSize: "0.8125rem",
                                          maxWidth: "300px",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          color: val === null || val === undefined ? "#94a3b8" : "var(--admin-text)",
                                          fontStyle: val === null || val === undefined ? "italic" : "normal",
                                        }}
                                      >
                                        {truncated}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>
                            Showing {((browse.page - 1) * browse.pageSize) + 1}–{Math.min(browse.page * browse.pageSize, browse.total)} of {browse.total.toLocaleString()}
                          </span>
                          <div style={{ display: "flex", gap: "0.375rem" }}>
                            <button
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
                              disabled={browse.page <= 1}
                              onClick={() => browseTable(browse.table, 1, browse.search, browse.sort, browse.dir)}
                            >
                              First
                            </button>
                            <button
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
                              disabled={browse.page <= 1}
                              onClick={() => browseTable(browse.table, browse.page - 1, browse.search, browse.sort, browse.dir)}
                            >
                              Prev
                            </button>
                            <span style={{
                              padding: "0.25rem 0.75rem",
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              color: "var(--admin-text)",
                              display: "flex",
                              alignItems: "center",
                            }}>
                              {browse.page} / {browse.totalPages}
                            </span>
                            <button
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
                              disabled={browse.page >= browse.totalPages}
                              onClick={() => browseTable(browse.table, browse.page + 1, browse.search, browse.sort, browse.dir)}
                            >
                              Next
                            </button>
                            <button
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
                              disabled={browse.page >= browse.totalPages}
                              onClick={() => browseTable(browse.table, browse.totalPages, browse.search, browse.sort, browse.dir)}
                            >
                              Last
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "300px", color: "var(--admin-text-secondary)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ marginBottom: "1rem", opacity: 0.5 }}>
                      <ellipse cx="12" cy="6" rx="8" ry="3" />
                      <path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" />
                      <path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" />
                    </svg>
                    <p style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 500 }}>Select a table to browse</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem" }}>Click any table on the left to view its rows</p>
                  </div>
                )
              ) : (
                /* ── Query Mode ─────────────────────────────────── */
                <div>
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <label style={{ fontWeight: 600, color: "var(--admin-text)" }}>SQL Query</label>
                      <span style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>
                        Read-only (SELECT only) · PostgreSQL · SUPER_ADMIN required
                      </span>
                    </div>
                    <textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runQuery();
                      }}
                      style={{
                        width: "100%",
                        minHeight: "140px",
                        padding: "1rem",
                        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                        fontSize: "0.875rem",
                        lineHeight: 1.5,
                        border: "1px solid var(--admin-border)",
                        borderRadius: "8px",
                        background: "#1E293B",
                        color: "#E2E8F0",
                        resize: "vertical",
                        tabSize: 2,
                      }}
                      placeholder="SELECT * FROM &quot;User&quot; LIMIT 10;"
                    />
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "center" }}>
                    <button onClick={runQuery} className="admin-btn admin-btn-primary" disabled={isQuerying || !sqlQuery.trim()}>
                      {isQuerying ? "Running..." : "Run Query"}
                    </button>
                    <button onClick={() => { setQueryResult(null); setQueryError(null); }} className="admin-btn admin-btn-secondary">
                      Clear
                    </button>
                    <span style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)", marginLeft: "auto" }}>
                      Ctrl+Enter to run
                    </span>
                  </div>

                  {/* Query Error */}
                  {queryError && (
                    <div style={{
                      padding: "0.75rem 1rem",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "8px",
                      marginBottom: "1rem",
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                      color: "#ef4444",
                      whiteSpace: "pre-wrap",
                    }}>
                      {queryError}
                    </div>
                  )}

                  {/* Query Results */}
                  {queryResult && queryResult.length > 0 && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <h4 style={{ margin: 0, fontSize: "0.9375rem" }}>Results ({queryResult.length} row{queryResult.length !== 1 ? "s" : ""})</h4>
                      </div>
                      <div style={{ overflowX: "auto", border: "1px solid var(--admin-border)", borderRadius: "8px" }}>
                        <table className="admin-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              {Object.keys(queryResult[0] || {}).map((key) => (
                                <th key={key} style={{ whiteSpace: "nowrap" }}>{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResult.map((row, i) => (
                              <tr key={i}>
                                {Object.entries(row).map(([, val]: [string, any], j) => {
                                  const display = val === null ? "NULL" : typeof val === "object" ? JSON.stringify(val) : String(val);
                                  const truncated = display.length > 100 ? display.slice(0, 97) + "..." : display;
                                  return (
                                    <td
                                      key={j}
                                      title={display.length > 100 ? display : undefined}
                                      style={{
                                        fontFamily: "monospace",
                                        fontSize: "0.8125rem",
                                        maxWidth: "300px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        color: val === null ? "#94a3b8" : "var(--admin-text)",
                                        fontStyle: val === null ? "italic" : "normal",
                                      }}
                                    >
                                      {truncated}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {queryResult && queryResult.length === 0 && (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--admin-text-secondary)", fontSize: "0.875rem" }}>
                      Query returned 0 rows
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === "api" && (
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem" }}>API Keys</h3>
              <p style={{ margin: "0.25rem 0 0", color: "var(--admin-text-secondary)", fontSize: "0.875rem" }}>
                Manage API keys for programmatic access to Loud Legacy APIs
              </p>
            </div>
            <button onClick={() => setShowNewKeyModal(true)} className="admin-btn admin-btn-primary">
              Create New Key
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {apiKeys.map((key) => (
              <div
                key={key.id}
                style={{
                  padding: "1.25rem",
                  background: "var(--admin-bg)",
                  borderRadius: "8px",
                  border: "1px solid var(--admin-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <h4 style={{ margin: 0, fontSize: "1rem" }}>{key.name}</h4>
                      <span className={`admin-badge ${key.isActive ? "admin-badge-success" : "admin-badge-warning"}`}>
                        {key.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <code style={{
                        padding: "0.375rem 0.75rem",
                        background: "#1E293B",
                        color: "#E2E8F0",
                        borderRadius: "4px",
                        fontSize: "0.8125rem",
                        fontFamily: "monospace",
                      }}>
                        {key.key.substring(0, 20)}••••••••
                      </code>
                      <button
                        onClick={() => copyToClipboard(key.key, key.id)}
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      >
                        {copiedKey === key.id ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>
                      <span>Permissions: {key.permissions.join(", ")}</span>
                      <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsed && <span>Last used: {new Date(key.lastUsed).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => toggleKeyStatus(key.id)}
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                    >
                      {key.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteKey(key.id)}
                      className="admin-btn admin-btn-danger"
                      style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* API Documentation Link */}
          <div style={{
            marginTop: "2rem",
            padding: "1.5rem",
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
            borderRadius: "12px",
            border: "1px solid rgba(59, 130, 246, 0.2)",
          }}>
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>API Documentation</h4>
            <p style={{ margin: "0 0 1rem", color: "var(--admin-text-secondary)", fontSize: "0.9375rem" }}>
              Access the full API documentation to integrate Loud Legacy into your applications.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="admin-btn admin-btn-primary">View API Docs</button>
              <button className="admin-btn admin-btn-secondary">Download OpenAPI Spec</button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.125rem" }}>System Logs</h3>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="admin-form-select"
                style={{ width: "140px" }}
              >
                <option value="all">All Levels</option>
                <option value="error">Errors</option>
                <option value="warn">Warnings</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
              <button className="admin-btn admin-btn-secondary">
                Download Logs
              </button>
              <button className="admin-btn admin-btn-secondary" onClick={() => setLogs([...demoLogs])}>
                Refresh
              </button>
            </div>
          </div>

          <div style={{
            background: "#1E293B",
            borderRadius: "8px",
            padding: "1rem",
            maxHeight: "500px",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "0.8125rem",
          }}>
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <span style={{ color: "#64748B", whiteSpace: "nowrap" }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={{
                  color: getLevelColor(log.level),
                  fontWeight: 600,
                  textTransform: "uppercase",
                  width: "50px",
                }}>
                  {log.level}
                </span>
                <span style={{ color: "#94A3B8" }}>[{log.source}]</span>
                <span style={{ color: "#E2E8F0" }}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment Tab */}
      {activeTab === "env" && (
        <div className="admin-card">
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem" }}>Environment Variables</h3>
            <p style={{ margin: 0, color: "var(--admin-text-secondary)", fontSize: "0.875rem" }}>
              Sensitive values are masked. Edit in Netlify dashboard or .env file.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {envVars.map((env) => (
              <div
                key={env.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  background: "var(--admin-bg)",
                  borderRadius: "6px",
                  gap: "1rem",
                }}
              >
                <code style={{ fontWeight: 600, color: "var(--admin-accent)", minWidth: "200px" }}>{env.key}</code>
                <code style={{
                  flex: 1,
                  color: env.sensitive ? "var(--admin-text-secondary)" : "var(--admin-text)",
                  fontFamily: "monospace",
                }}>
                  {env.value}
                </code>
                {env.sensitive && (
                  <span className="admin-badge admin-badge-warning">Sensitive</span>
                )}
              </div>
            ))}
          </div>

          <div style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "8px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" width="20" height="20" style={{ flexShrink: 0, marginTop: "2px" }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <strong style={{ color: "#F59E0B" }}>Security Notice</strong>
                <p style={{ margin: "0.25rem 0 0", color: "var(--admin-text)", fontSize: "0.875rem" }}>
                  Never expose sensitive environment variables in client-side code. Use server-side API routes to access protected resources.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === "webhooks" && (
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem" }}>Webhooks</h3>
              <p style={{ margin: "0.25rem 0 0", color: "var(--admin-text-secondary)", fontSize: "0.875rem" }}>
                Configure webhooks to receive real-time notifications about events
              </p>
            </div>
            <button className="admin-btn admin-btn-primary">Add Webhook</button>
          </div>

          <div style={{
            padding: "3rem",
            textAlign: "center",
            background: "var(--admin-bg)",
            borderRadius: "12px",
            border: "2px dashed var(--admin-border)",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48" style={{ color: "var(--admin-text-secondary)", margin: "0 auto 1rem" }}>
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            <h4 style={{ margin: "0 0 0.5rem", color: "var(--admin-text)" }}>No webhooks configured</h4>
            <p style={{ margin: "0 0 1.5rem", color: "var(--admin-text-secondary)", fontSize: "0.9375rem" }}>
              Create a webhook to receive POST requests when events occur
            </p>
            <button className="admin-btn admin-btn-primary">Create First Webhook</button>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <h4 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Available Events</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              {[
                "user.created", "user.updated", "user.deleted",
                "subscription.created", "subscription.updated", "subscription.canceled",
                "payment.succeeded", "payment.failed",
                "content.published", "content.updated",
              ].map((event) => (
                <div
                  key={event}
                  style={{
                    padding: "0.5rem 0.75rem",
                    background: "var(--admin-bg)",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "0.8125rem",
                    color: "var(--admin-text)",
                  }}
                >
                  {event}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New API Key Modal */}
      {showNewKeyModal && (
        <div className="admin-modal-overlay" onClick={() => setShowNewKeyModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Create API Key</h3>
              <button className="admin-modal-close" onClick={() => setShowNewKeyModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-form-label">Key Name</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Development Key"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Permissions</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {["read", "write", "admin"].map((perm) => (
                    <label key={perm} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes(perm)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKeyPermissions([...newKeyPermissions, perm]);
                          } else {
                            setNewKeyPermissions(newKeyPermissions.filter(p => p !== perm));
                          }
                        }}
                        style={{ width: "18px", height: "18px" }}
                      />
                      <span style={{ textTransform: "capitalize" }}>{perm}</span>
                      <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)" }}>
                        {perm === "read" && "- View data"}
                        {perm === "write" && "- Create and update data"}
                        {perm === "admin" && "- Full administrative access"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setShowNewKeyModal(false)} className="admin-btn admin-btn-secondary">
                Cancel
              </button>
              <button onClick={createAPIKey} className="admin-btn admin-btn-primary" disabled={!newKeyName}>
                Create Key
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
