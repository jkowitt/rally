"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { rallyAuth } from "@/lib/rally-api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email"); return; }
    setLoading(true);
    const res = await rallyAuth.forgotPassword(email.trim());
    setLoading(false);
    if (res.ok) {
      if (res.data?.resetCode) {
        alert(`Demo Mode: Your reset code is ${res.data.resetCode}`);
      }
      setStep(2);
    } else {
      setError(res.error || "Failed to send reset code");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length !== 6) { setError("Enter the 6-digit code"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    const res = await rallyAuth.resetPassword(email.trim(), code.trim(), newPassword);
    setLoading(false);
    if (res.ok) {
      setStep(3);
    } else {
      setError(res.error || "Failed to reset password");
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
              <h1 className="rally-auth-heading">Forgot Password?</h1>
              <p className="rally-auth-subheading">Enter your email and we&apos;ll send a reset code</p>
              {error && <div className="rally-auth-error">{error}</div>}
              <form onSubmit={handleSendCode} className="rally-auth-form">
                <div className="rally-auth-field">
                  <label htmlFor="email">Email</label>
                  <div className="rally-auth-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4l-10 8L2 4" />
                    </svg>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required disabled={loading} />
                  </div>
                </div>
                <button type="submit" className="rally-btn rally-btn--primary rally-btn--full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Code"}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="rally-auth-heading">Reset Password</h1>
              <p className="rally-auth-subheading">Enter the 6-digit code sent to {email}</p>
              {error && <div className="rally-auth-error">{error}</div>}
              <form onSubmit={handleReset} className="rally-auth-form">
                <div className="rally-auth-field">
                  <label htmlFor="code">Reset Code</label>
                  <div className="rally-auth-input-wrap">
                    <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" maxLength={6} required disabled={loading} />
                  </div>
                </div>
                <div className="rally-auth-field">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="rally-auth-input-wrap">
                    <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required disabled={loading} />
                  </div>
                </div>
                <div className="rally-auth-field">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="rally-auth-input-wrap">
                    <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" required disabled={loading} />
                  </div>
                </div>
                <button type="submit" className="rally-btn rally-btn--primary rally-btn--full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <div className="rally-auth-success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2" width="64" height="64">
                  <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="rally-auth-heading">Password Reset!</h1>
              <p className="rally-auth-subheading">Your password has been successfully reset.</p>
              <button className="rally-btn rally-btn--primary rally-btn--full" onClick={() => router.push("/auth/signin")}>
                Back to Sign In
              </button>
            </>
          )}

          <div className="rally-auth-footer">
            <p><Link href="/auth/signin">Back to Sign In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
