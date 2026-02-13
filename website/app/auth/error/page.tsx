"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const errorMessages: Record<string, { title: string; message: string }> = {
  Configuration: {
    title: "Server configuration error",
    message: "There is a problem with the server configuration. Please try again later or contact support.",
  },
  AccessDenied: {
    title: "Access denied",
    message: "You do not have permission to access this resource. Please sign in with an authorized account.",
  },
  Verification: {
    title: "Verification failed",
    message: "The verification link may have expired or already been used. Please request a new verification email.",
  },
  OAuthSignin: {
    title: "Sign in failed",
    message: "Could not start the sign-in process. Please try again.",
  },
  OAuthCallback: {
    title: "Sign in failed",
    message: "Could not complete the sign-in process. Please try again.",
  },
  OAuthCreateAccount: {
    title: "Account creation failed",
    message: "Could not create your account. You may already have an account with this email address.",
  },
  EmailCreateAccount: {
    title: "Account creation failed",
    message: "Could not create your account. Please check your email and try again.",
  },
  Callback: {
    title: "Sign in failed",
    message: "There was a problem with the authentication callback. Please try again.",
  },
  OAuthAccountNotLinked: {
    title: "Email already in use",
    message: "This email is already associated with another account. Please sign in with your original method.",
  },
  EmailSignin: {
    title: "Email not sent",
    message: "Could not send the verification email. Please check your email address and try again.",
  },
  CredentialsSignin: {
    title: "Sign in failed",
    message: "Invalid email or password. Please check your credentials and try again.",
  },
  SessionRequired: {
    title: "Authentication required",
    message: "You must be signed in to access this page.",
  },
  Default: {
    title: "Authentication error",
    message: "An unexpected error occurred. Please try again.",
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error") || "Default";
  const error = errorMessages[errorType] || errorMessages.Default;

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-error-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1>{error.title}</h1>
          <p className="auth-message">{error.message}</p>

          <div className="auth-actions">
            <Link href="/auth/signin" className="button button--primary">
              Try again
            </Link>
            <Link href="/" className="button button--secondary">
              Go home
            </Link>
          </div>

          <p className="auth-help">
            Need help?{" "}
            <Link href="/contact">Contact support</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <main className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <p>Loading...</p>
          </div>
        </div>
      </main>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
