"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="error-page">
      <div className="error-container">
        <div className="error-icon" aria-hidden="true">⚠️</div>
        <h1>Something went wrong</h1>
        <p>We apologize for the inconvenience. An unexpected error has occurred.</p>

        {process.env.NODE_ENV === "development" && (
          <details className="error-details">
            <summary>Error details (dev only)</summary>
            <pre>{error.message}</pre>
            {error.digest && <p>Error ID: {error.digest}</p>}
          </details>
        )}

        <div className="error-actions">
          <button
            onClick={() => reset()}
            className="button button--primary"
          >
            Try again
          </button>
          <Link href="/" className="button button--secondary">
            Go home
          </Link>
        </div>

        <p className="error-support">
          If this problem persists, please{" "}
          <Link href="/contact">contact support</Link>.
        </p>
      </div>
    </main>
  );
}
