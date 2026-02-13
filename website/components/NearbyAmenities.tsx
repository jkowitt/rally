"use client";

import { useEffect, useState } from "react";

interface Place {
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating: number | null;
  totalRatings: number;
  openNow: boolean | null;
}

interface Category {
  type: string;
  count: number;
  places: Place[];
}

interface NearbyAmenitiesProps {
  lat: number;
  lng: number;
  radius?: number;
  className?: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  school: { label: "Schools", icon: "🎓" },
  transit_station: { label: "Transit", icon: "🚇" },
  supermarket: { label: "Grocery", icon: "🛒" },
  hospital: { label: "Healthcare", icon: "🏥" },
  park: { label: "Parks", icon: "🌳" },
  shopping_mall: { label: "Shopping", icon: "🛍️" },
};

/**
 * Displays nearby amenities for a property location.
 * Calls /api/nearby which uses the Google Places API.
 */
export default function NearbyAmenities({
  lat,
  lng,
  radius = 1600,
  className = "",
}: NearbyAmenitiesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;
    let mounted = true;

    async function fetchNearby() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
        );
        const data = await res.json();
        if (mounted && data.success) {
          setCategories(data.categories);
        } else if (mounted) {
          setError(data.error || "Failed to load");
        }
      } catch {
        if (mounted) setError("Network error");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchNearby();
    return () => {
      mounted = false;
    };
  }, [lat, lng, radius]);

  if (loading) {
    return (
      <div className={className} style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>
        Loading nearby amenities...
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={{ padding: "1rem", textAlign: "center", color: "#ef4444", fontSize: "0.875rem" }}>
        {error}
      </div>
    );
  }

  return (
    <div className={className}>
      <h4
        style={{
          margin: "0 0 0.75rem",
          fontSize: "0.9375rem",
          fontWeight: 600,
          color: "var(--text-primary, #1a202c)",
        }}
      >
        Nearby Amenities
      </h4>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px" }}>
        {categories.map((cat) => {
          const meta = TYPE_LABELS[cat.type] || {
            label: cat.type,
            icon: "📍",
          };
          const isExpanded = expandedType === cat.type;

          return (
            <div key={cat.type}>
              <button
                onClick={() =>
                  setExpandedType(isExpanded ? null : cat.type)
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  border: isExpanded
                    ? "1px solid #1B2A4A"
                    : "1px solid var(--border-color, #e2e8f0)",
                  borderRadius: "8px",
                  background: isExpanded ? "#f0f4ff" : "var(--bg-primary, #fff)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "var(--text-primary, #1a202c)",
                  transition: "all 0.15s",
                }}
              >
                <span>{meta.icon}</span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  {meta.label}
                </span>
                <span
                  style={{
                    background: cat.count > 0 ? "#1B2A4A" : "#94a3b8",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "1px 7px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  {cat.count}
                </span>
              </button>

              {isExpanded && cat.places.length > 0 && (
                <div
                  style={{
                    marginTop: "4px",
                    padding: "6px 8px",
                    background: "#f8fafc",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    lineHeight: 1.6,
                  }}
                >
                  {cat.places.map((place, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        padding: "2px 0",
                        borderBottom:
                          i < cat.places.length - 1
                            ? "1px solid #e2e8f0"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "70%",
                        }}
                      >
                        {place.name}
                      </span>
                      {place.rating && (
                        <span style={{ color: "#D4A843", fontWeight: 600 }}>
                          {place.rating.toFixed(1)} ★
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
