"use client";
import { useEffect } from "react";
import "../../styles/redirect.css";

const target =
  (process.env.NEXT_PUBLIC_VENUEVR_URL || "https://events.loud-legacy.com").trim();

export default function VenueVRRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace(target);
    }
  }, []);

  return (
    <section className="redirect">
      <div className="redirect-card">
        <div className="spinner" />
        <h1>Redirecting to VenueVR…</h1>
        <p>
          If not redirected, <a href={target}>click here</a>.
        </p>
      </div>
    </section>
  );
}
