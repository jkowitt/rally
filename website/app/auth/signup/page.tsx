"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useRallyAuth } from "@/lib/rally-auth";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useRallyAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    handle: "",
    password: "",
    confirmPassword: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) { setError("Please enter your name"); return; }
    if (!formData.email.trim()) { setError("Please enter your email"); return; }
    if (!formData.handle.trim()) { setError("Please enter a handle"); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }
    if (!agreedToTerms) { setError("You must agree to the Terms of Service"); return; }

    setStep(2);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const handle = formData.handle.startsWith("@") ? formData.handle : `@${formData.handle}`;
      const result = await signUp({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        handle,
        acceptedTerms: agreedToTerms,
      });

      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Failed to create account");
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

          {step === 1 && (
            <>
              <div className="rally-auth-badge">Early Access</div>
              <h1 className="rally-auth-heading">Join Rally</h1>
              <p className="rally-auth-subheading">Create your account and start engaging with your favorite teams</p>

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

              <form onSubmit={handleStep1} className="rally-auth-form">
                <div className="rally-auth-field">
                  <label htmlFor="name">Full Name</label>
                  <div className="rally-auth-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

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
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@school.edu"
                      required
                    />
                  </div>
                </div>

                <div className="rally-auth-field">
                  <label htmlFor="handle">Handle</label>
                  <div className="rally-auth-input-wrap">
                    <span className="rally-auth-at">@</span>
                    <input
                      id="handle"
                      type="text"
                      value={formData.handle.replace(/^@/, '')}
                      onChange={(e) => setFormData({ ...formData, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                      placeholder="yourhandle"
                      required
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
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                    />
                    <button type="button" className="rally-auth-eye" onClick={() => setShowPassword(!showPassword)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="rally-auth-field">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="rally-auth-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </div>

                <div className="rally-auth-terms">
                  <input
                    id="agreeTerms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  />
                  <label htmlFor="agreeTerms">
                    I agree to the{" "}
                    <Link href="/terms" target="_blank">Terms of Service</Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank">Privacy Policy</Link>
                  </label>
                </div>

                <button type="submit" className="rally-btn rally-btn--primary rally-btn--full">
                  Continue
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="rally-auth-heading">Almost There!</h1>
              <p className="rally-auth-subheading">
                You can select your favorite school later from your profile.
                Ready to create your account?
              </p>

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

              <div className="rally-auth-summary">
                <div className="rally-auth-summary-row">
                  <span>Name</span>
                  <span>{formData.name}</span>
                </div>
                <div className="rally-auth-summary-row">
                  <span>Email</span>
                  <span>{formData.email}</span>
                </div>
                <div className="rally-auth-summary-row">
                  <span>Handle</span>
                  <span>@{formData.handle.replace(/^@/, '')}</span>
                </div>
              </div>

              <div className="rally-auth-form" style={{ gap: "12px" }}>
                <button
                  className="rally-btn rally-btn--primary rally-btn--full"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? <span className="rally-spinner" /> : null}
                  {loading ? "Creating account..." : "Create Account"}
                </button>
                <button
                  className="rally-btn rally-btn--secondary rally-btn--full"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Go Back
                </button>
              </div>
            </>
          )}

          <div className="rally-auth-footer">
            <p>
              Already have an account?{" "}
              <Link href="/auth/signin">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
