import Link from "next/link";

export const metadata = {
  title: "Check your email - Loud Legacy",
  description: "We've sent you a verification link",
};

export default function VerifyRequestPage() {
  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          <h1>Check your email</h1>
          <p className="auth-message">
            We've sent a sign-in link to your email address. Click the link to complete your sign-in.
          </p>

          <div className="auth-tips">
            <h2>Didn't receive the email?</h2>
            <ul>
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email</li>
              <li>Wait a few minutes and check again</li>
            </ul>
          </div>

          <div className="auth-actions">
            <Link href="/auth/signin" className="button button--secondary">
              Try different email
            </Link>
          </div>

          <p className="auth-help">
            Still having trouble?{" "}
            <Link href="/contact">Contact support</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
