/// <reference types="@types/google.maps" />
"use client";

import { useEffect, useState } from "react";
import {
  getStreetViewUrl,
  hasStreetView,
  isGoogleMapsConfigured,
  loadGoogleMaps,
} from "@/lib/google-maps";

interface StreetViewProps {
  address?: string;
  location?: { lat: number; lng: number };
  width?: number;
  height?: number;
  heading?: number;
  pitch?: number;
  className?: string;
  showControls?: boolean;
  /** Render multiple angles (front, left, right) */
  multiAngle?: boolean;
}

/**
 * Displays a Google Street View static image of a property.
 * Checks availability first and shows a placeholder if Street View
 * is not available at the given location.
 */
export default function StreetView({
  address,
  location,
  width = 600,
  height = 400,
  heading,
  pitch = 10,
  className = "",
  showControls = true,
  multiAngle = false,
}: StreetViewProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState(location);
  const [activeAngle, setActiveAngle] = useState(0);
  const [imageError, setImageError] = useState(false);

  const configured = isGoogleMapsConfigured();

  // Resolve address → coordinates and check Street View availability
  useEffect(() => {
    if (!configured) return;

    let mounted = true;

    async function check() {
      try {
        await loadGoogleMaps();

        let loc = location;

        // If we only have an address, geocode it first
        if (!loc && address) {
          const geocoder = new google.maps.Geocoder();
          const result = await new Promise<google.maps.GeocoderResult | null>(
            (resolve) => {
              geocoder.geocode({ address }, (results, status) => {
                if (status === "OK" && results?.[0]) resolve(results[0]);
                else resolve(null);
              });
            }
          );

          if (result) {
            loc = {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
            };
          }
        }

        if (!mounted || !loc) {
          if (mounted) setAvailable(false);
          return;
        }

        setResolvedLocation(loc);
        const ok = await hasStreetView(loc);
        if (mounted) setAvailable(ok);
      } catch {
        if (mounted) setAvailable(false);
      }
    }

    check();
    return () => {
      mounted = false;
    };
  }, [address, location, configured]);

  // Not configured
  if (!configured) {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: `${height}px`,
          background: "#f1f5f9",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: "0.875rem",
        }}
      >
        Street View requires Google Maps API key
      </div>
    );
  }

  // Still checking
  if (available === null) {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: `${height}px`,
          background: "#f8fafc",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          color: "#64748b",
          fontSize: "0.875rem",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ animation: "spin 1s linear infinite" }}
        >
          <path d="M21 12a9 9 0 11-6.22-8.56" />
        </svg>
        Loading Street View...
      </div>
    );
  }

  // Not available for this location
  if (!available || !resolvedLocation || imageError) {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: `${height}px`,
          background: "linear-gradient(135deg, #1B2A4A 0%, #2C3E5A 100%)",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#D4A843",
          gap: "0.5rem",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
          <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: "0.8rem" }}>
          Street View not available
        </span>
      </div>
    );
  }

  // Multi-angle headings (front, left-oblique, right-oblique)
  const angles =
    heading !== undefined
      ? [heading, (heading + 90) % 360, (heading + 270) % 360]
      : [0, 90, 270];

  const currentHeading = multiAngle ? angles[activeAngle] : heading;

  const target = address || resolvedLocation;
  const imgUrl = getStreetViewUrl(target!, {
    width,
    height,
    heading: currentHeading,
    pitch,
  });

  return (
    <div className={className} style={{ position: "relative" }}>
      <img
        src={imgUrl}
        alt={`Street View of ${address || "property"}`}
        onError={() => setImageError(true)}
        style={{
          width: "100%",
          height: `${height}px`,
          objectFit: "cover",
          borderRadius: "8px",
          display: "block",
        }}
      />

      {/* Multi-angle controls */}
      {multiAngle && showControls && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "6px",
            background: "rgba(0,0,0,0.6)",
            borderRadius: "20px",
            padding: "4px 8px",
          }}
        >
          {["Front", "Left", "Right"].map((label, i) => (
            <button
              key={label}
              onClick={() => setActiveAngle(i)}
              style={{
                padding: "4px 10px",
                borderRadius: "12px",
                border: "none",
                fontSize: "0.7rem",
                fontWeight: 600,
                cursor: "pointer",
                color: activeAngle === i ? "#1B2A4A" : "#fff",
                background: activeAngle === i ? "#D4A843" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Street View badge */}
      {showControls && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            borderRadius: "4px",
            padding: "3px 8px",
            fontSize: "0.65rem",
            fontWeight: 500,
          }}
        >
          Google Street View
        </div>
      )}
    </div>
  );
}
