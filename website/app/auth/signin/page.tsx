"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useRallyAuth } from "@/lib/rally-auth";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useRallyAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Invalid email or password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rally-auth-page">
      <div className="rally-auth-container">
        <div className="rally-auth-card">
          <Link href="/" className="rally-auth-logo">
            <Image src="/logos/rally-stacked-on-dark.png" alt="Rally" width={100} height={100} className="rally-auth-logo-img" />
          </Link>

          <h1 className="rally-auth-heading">Welcome Back</h1>
          <p className="rally-auth-subheading">Sign in to access your Rally dashboard</p>

          {error && (
            <div className="rally-auth-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="rally-auth-form">
            <div className="rally-auth-field">
              <label htmlFor="email">Email</label>
              <div className="rally-auth-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 4l-10 8L2 4" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="rally-auth-field">
              <label htmlFor="password">Password</label>
              <div className="rally-auth-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button type="button" className="rally-auth-eye" onClick={() => setShowPassword(!showPassword)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div className="rally-auth-forgot">
              <Link href="/auth/forgot-password">Forgot password?</Link>
            </div>

            <button type="submit" className="rally-btn rally-btn--primary rally-btn--full" disabled={loading}>
              {loading ? <span className="rally-spinner" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="rally-auth-demo">
            <p>Demo accounts:</p>
            <div className="rally-auth-demo-accounts">
              <button onClick={() => { setEmail("jason@rally.com"); setPassword("Rally2026!"); }} className="rally-auth-demo-btn">
                Developer
              </button>
              <button onClick={() => { setEmail("admin@rally.com"); setPassword("Rally2026!"); }} className="rally-auth-demo-btn">
                Admin
              </button>
              <button onClick={() => { setEmail("user@rally.com"); setPassword("Rally2026!"); }} className="rally-auth-demo-btn">
                User
              </button>
            </div>
          </div>

          <div className="rally-auth-footer">
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup">Sign up free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
