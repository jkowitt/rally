/// <reference types="@types/google.maps" />
"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, isGoogleMapsConfigured } from "@/lib/google-maps";

interface PropertyMapProps {
  address: string;
  /** Pre-resolved coordinates — skips geocoding when provided */
  location?: { lat: number; lng: number };
  propertyValue?: number;
  comparables?: Array<{
    address: string;
    salePrice: number;
    distance: string;
  }>;
  height?: number;
}

export default function PropertyMap({
  address,
  location,
  propertyValue,
  comparables,
  height = 400,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocodedLocation, setGeocodedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(location || null);

  const configured = isGoogleMapsConfigured();

  // ── Load Maps SDK ──────────────────────────────────────────
  useEffect(() => {
    if (!configured) {
      setError("Google Maps API key not configured.");
      return;
    }

    let mounted = true;
    loadGoogleMaps()
      .then(() => {
        if (mounted) setReady(true);
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      });

    return () => {
      mounted = false;
    };
  }, [configured]);

  // ── Real Geocoding ─────────────────────────────────────────
  const geocode = async (addr: string): Promise<{ lat: number; lng: number }> => {
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address: addr }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          reject(new Error(`Geocode failed for "${addr}": ${status}`));
        }
      });
    });
  };

  // ── Initialise Map ─────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || !address) return;

    let cancelled = false;

    async function init() {
      try {
        // Resolve subject property location
        const subjectLoc = location || (await geocode(address));
        if (cancelled) return;
        setGeocodedLocation(subjectLoc);

        const map = new google.maps.Map(mapRef.current!, {
          center: subjectLoc,
          zoom: 14,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });
        mapInstanceRef.current = map;

        // Subject marker (navy with gold outline)
        const subjectMarker = new google.maps.Marker({
          position: subjectLoc,
          map,
          title: address,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#1B2A4A",
            fillOpacity: 1,
            strokeColor: "#D4A843",
            strokeWeight: 3,
            scale: 12,
          },
          animation: google.maps.Animation.DROP,
          zIndex: 10,
        });

        const subjectInfo = new google.maps.InfoWindow({
          content: `
            <div style="padding:8px;max-width:220px;font-family:system-ui,sans-serif">
              <h3 style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1B2A4A">Subject Property</h3>
              <p style="margin:0 0 4px;font-size:12px;color:#475569">${address}</p>
              ${propertyValue ? `<p style="margin:0;font-size:12px;font-weight:700;color:#D4A843">$${propertyValue.toLocaleString()}</p>` : ""}
            </div>
          `,
        });
        subjectMarker.addListener("click", () =>
          subjectInfo.open(map, subjectMarker)
        );

        // Comp markers
        if (comparables && comparables.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(subjectLoc);

          for (let i = 0; i < comparables.length; i++) {
            const comp = comparables[i];
            try {
              const compLoc = await geocode(comp.address);
              if (cancelled) return;
              bounds.extend(compLoc);

              const compMarker = new google.maps.Marker({
                position: compLoc,
                map,
                title: comp.address,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: "#3B82F6",
                  fillOpacity: 1,
                  strokeColor: "#fff",
                  strokeWeight: 2,
                  scale: 9,
                },
                label: {
                  text: `${i + 1}`,
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "bold",
                },
              });

              const compInfo = new google.maps.InfoWindow({
                content: `
                  <div style="padding:8px;max-width:220px;font-family:system-ui,sans-serif">
                    <h3 style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1B2A4A">Comp #${i + 1}</h3>
                    <p style="margin:0 0 4px;font-size:12px;color:#475569">${comp.address}</p>
                    <p style="margin:0 0 2px;font-size:12px">Sale: <strong>$${comp.salePrice.toLocaleString()}</strong></p>
                    <p style="margin:0;font-size:11px;color:#64748b">${comp.distance} away</p>
                  </div>
                `,
              });
              compMarker.addListener("click", () =>
                compInfo.open(map, compMarker)
              );
            } catch {
              // skip comps that can't be geocoded
            }
          }

          map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Map init error:", err);
          setError("Failed to initialise map");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [ready, address, location, propertyValue, comparables]);

  // ── Not configured ─────────────────────────────────────────
  if (!configured) {
    return (
      <div
        style={{
          padding: "2rem",
          background: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#856404" }}>
          Google Maps Integration Ready
        </h3>
        <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "#856404" }}>
          Add your Google Maps API key to enable interactive maps:
        </p>
        <code
          style={{
            display: "block",
            padding: "0.5rem",
            background: "white",
            borderRadius: "4px",
            fontSize: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
        </code>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#856404" }}>
          Get your API key at:{" "}
          <a
            href="https://console.cloud.google.com/google/maps-apis"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Cloud Console
          </a>
        </p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          padding: "1.5rem",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "#dc2626", fontSize: "0.875rem" }}>
          {error}
        </p>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────
  if (!ready) {
    return (
      <div
        style={{
          height: `${height}px`,
          background: "var(--bg-tertiary, #f8fafc)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ margin: 0, color: "var(--text-secondary, #64748b)", fontSize: "0.875rem" }}>
          Loading map...
        </p>
      </div>
    );
  }

  // ── Map ────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative" }}>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: `${height}px`,
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid var(--border-color, #e2e8f0)",
        }}
      />
      {geocodedLocation && (
        <div
          style={{
            position: "absolute",
            bottom: "0.75rem",
            left: "0.75rem",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(4px)",
            padding: "4px 10px",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            fontSize: "0.7rem",
            color: "#475569",
          }}
        >
          {geocodedLocation.lat.toFixed(6)}, {geocodedLocation.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}
