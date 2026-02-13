"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  // Setup form state
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupSecretKey, setSetupSecretKey] = useState("");
  const [setupSuccess, setSetupSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: setupEmail,
          password: setupPassword,
          name: setupName,
          secretKey: setupSecretKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSetupSuccess(true);
        // Auto-fill login form
        setEmail(setupEmail);
        setPassword(setupPassword);
        setTimeout(() => {
          setShowSetup(false);
        }, 2000);
      } else {
        setError(data.error || "Failed to create account");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "2.5rem",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="32" height="32">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1E293B", margin: 0 }}>
            Admin Login
          </h1>
          <p style={{ color: "#64748B", marginTop: "0.5rem", fontSize: "0.9375rem" }}>
            Sign in to access the dashboard
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#FEE2E2",
              color: "#DC2626",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {setupSuccess && (
          <div
            style={{
              background: "#D1FAE5",
              color: "#059669",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="10" />
              <polyline points="16,8 10,14 8,12" />
            </svg>
            Account created! You can now log in.
          </div>
        )}

        {!showSetup ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                placeholder="admin@loud-legacy.com"
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>

            <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setShowSetup(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3B82F6",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Create Admin Account
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSetup}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Name
              </label>
              <input
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
                placeholder="Your name"
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
                placeholder="admin@loud-legacy.com"
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
                placeholder="Min. 8 characters"
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Setup Secret Key
              </label>
              <input
                type="password"
                value={setupSecretKey}
                onChange={(e) => setSetupSecretKey(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
                placeholder="Enter setup key"
              />
              <p style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: "0.25rem" }}>
                Default: loud-legacy-admin-setup-2024
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Creating..." : "Create Admin Account"}
            </button>

            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setShowSetup(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6B7280",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #E5E7EB",
            textAlign: "center",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#6B7280",
              fontSize: "0.875rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Back to Site
          </Link>
        </div>
      </div>
    </div>
  );
}
