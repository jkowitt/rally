"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyAuth, type HandleModerationResult } from "@/lib/rally-api";

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
    userType: "",
    birthYear: "",
    residingCity: "",
    residingState: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle moderation state
  const [handleWarnings, setHandleWarnings] = useState(0);
  const [handleWarning, setHandleWarning] = useState<string | null>(null);
  const [handleForced, setHandleForced] = useState<HandleModerationResult | null>(null);
  const [handleAcknowledged, setHandleAcknowledged] = useState(false);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setHandleWarning(null);

    if (!formData.name.trim()) { setError("Please enter your name"); return; }
    if (!formData.email.trim()) { setError("Please enter your email"); return; }
    if (!formData.handle.trim()) { setError("Please enter a handle"); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }
    if (!agreedToTerms) { setError("You must agree to the Terms of Service"); return; }

    // Pre-check handle for inappropriate content
    const handle = formData.handle.startsWith("@") ? formData.handle : `@${formData.handle}`;
    const res = await rallyAuth.checkHandle(handle, formData.name.trim());

    if (res.ok && res.data) {
      if (res.data.allowed) {
        // Handle is clean — proceed
        setStep(2);
      } else if (res.data.forced) {
        // 3rd strike — handle was force-assigned
        setHandleForced(res.data);
        setHandleWarnings(3);
        setStep(3); // go to forced-handle acknowledgment
      } else {
        // Warning 1 or 2
        setHandleWarnings(res.data.warningNumber);
        setHandleWarning(res.data.message);
        setFormData({ ...formData, handle: "" });
      }
    } else {
      // API error — let them through (server will validate on register)
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      // Use forced handle if it was assigned, otherwise use their chosen handle
      const handle = handleForced?.forcedHandle
        ? handleForced.forcedHandle
        : formData.handle.startsWith("@") ? formData.handle : `@${formData.handle}`;
      const birthYearNum = formData.birthYear ? parseInt(formData.birthYear, 10) : undefined;
      const result = await signUp({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        handle,
        acceptedTerms: agreedToTerms,
        userType: formData.userType || undefined,
        birthYear: birthYearNum && !isNaN(birthYearNum) ? birthYearNum : undefined,
        residingCity: formData.residingCity.trim() || undefined,
        residingState: formData.residingState.trim() || undefined,
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

              {handleWarning && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: handleWarnings >= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(255,165,0,0.15)',
                  border: `1px solid ${handleWarnings >= 2 ? 'rgba(239,68,68,0.3)' : 'rgba(255,165,0,0.3)'}`,
                  fontSize: '13px',
                  color: handleWarnings >= 2 ? '#ff6b6b' : '#ffaa33',
                  marginBottom: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <strong>Warning {handleWarnings} of 2</strong>
                  </div>
                  {handleWarning}
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
              <h1 className="rally-auth-heading">Tell Us About You</h1>
              <p className="rally-auth-subheading">
                Help us personalize your experience. All fields are optional.
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

              <div className="rally-auth-form">
                <div className="rally-auth-field">
                  <label htmlFor="userType">I am a...</label>
                  <div className="rally-auth-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <select
                      id="userType"
                      value={formData.userType}
                      onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                      className="rally-auth-select"
                    >
                      <option value="">Select one (optional)</option>
                      <option value="student">Current Student</option>
                      <option value="alumni">Alumni</option>
                      <option value="general_fan">General Fan</option>
                    </select>
                  </div>
                </div>

                <div className="rally-auth-field">
                  <label htmlFor="birthYear">Birth Year</label>
                  <div className="rally-auth-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <input
                      id="birthYear"
                      type="number"
                      value={formData.birthYear}
                      onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                      placeholder="e.g. 2002"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>
                </div>

                <div className="rally-auth-field">
                  <label htmlFor="residingCity">City</label>
                  <div className="rally-auth-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <input
                      id="residingCity"
                      type="text"
                      value={formData.residingCity}
                      onChange={(e) => setFormData({ ...formData, residingCity: e.target.value })}
                      placeholder="Your city (optional)"
                    />
                  </div>
                </div>

                <div className="rally-auth-field">
                  <label htmlFor="residingState">State</label>
                  <div className="rally-auth-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <input
                      id="residingState"
                      type="text"
                      value={formData.residingState}
                      onChange={(e) => setFormData({ ...formData, residingState: e.target.value })}
                      placeholder="Your state (optional)"
                    />
                  </div>
                </div>
              </div>

              <div className="rally-auth-form" style={{ gap: "12px", marginTop: "8px" }}>
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

          {step === 3 && handleForced && (
            <>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" width="32" height="32">
                  <path d="M12 9v4m0 4h.01M3.6 20h16.8c.8 0 1.3-.9.9-1.6L13 4c-.4-.7-1.5-.7-1.9 0L3.6 18.4c-.4.7.1 1.6.9 1.6z" />
                </svg>
              </div>
              <h1 className="rally-auth-heading" style={{ fontSize: '20px' }}>Handle Auto-Assigned</h1>
              <p className="rally-auth-subheading" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Due to repeated inappropriate language, your handle has been set to:
              </p>
              <div style={{
                padding: '16px', borderRadius: '12px', textAlign: 'center',
                background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)',
                margin: '12px 0',
              }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#FF6B35' }}>
                  {handleForced.forcedHandle}
                </span>
              </div>
              {handleForced.lockedUntil && (
                <p style={{
                  fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center',
                  lineHeight: 1.5, margin: '8px 0 16px',
                }}>
                  You can change your handle after{" "}
                  <strong style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {new Date(handleForced.lockedUntil).toLocaleDateString()} at{" "}
                    {new Date(handleForced.lockedUntil).toLocaleTimeString()}
                  </strong>
                  . A 72-hour cooldown has been applied.
                </p>
              )}

              <div className="rally-auth-form" style={{ gap: '12px', marginTop: '8px' }}>
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
                  fontSize: '13px', color: 'rgba(255,255,255,0.6)',
                }}>
                  <input
                    type="checkbox"
                    checked={handleAcknowledged}
                    onChange={(e) => setHandleAcknowledged(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  I understand my handle has been auto-assigned and I can change it after the 72-hour cooldown period.
                </label>
                <button
                  className="rally-btn rally-btn--primary rally-btn--full"
                  disabled={!handleAcknowledged}
                  onClick={() => setStep(2)}
                  style={{ opacity: handleAcknowledged ? 1 : 0.5 }}
                >
                  Continue to Profile Setup
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
