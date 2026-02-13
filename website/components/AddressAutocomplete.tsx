/// <reference types="@types/google.maps" />
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadGoogleMaps, isGoogleMapsConfigured } from "@/lib/google-maps";

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  components: {
    streetNumber?: string;
    street?: string;
    city?: string;
    county?: string;
    state?: string;
    stateShort?: string;
    zip?: string;
    country?: string;
  };
}

interface AddressAutocompleteProps {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  restrictToUS?: boolean;
}

/**
 * Google Places Autocomplete for address input.
 * Falls back to a plain text input when the API key is not configured.
 */
export default function AddressAutocomplete({
  onSelect,
  placeholder = "Enter a property address...",
  defaultValue = "",
  className = "",
  restrictToUS = true,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [value, setValue] = useState(defaultValue);

  // Parse address_components into a flat object
  const parseComponents = useCallback(
    (components: google.maps.GeocoderAddressComponent[]) => {
      const get = (type: string) =>
        components.find((c) => c.types.includes(type));

      return {
        streetNumber: get("street_number")?.long_name,
        street: get("route")?.long_name,
        city:
          get("locality")?.long_name ||
          get("sublocality_level_1")?.long_name,
        county: get("administrative_area_level_2")?.long_name,
        state: get("administrative_area_level_1")?.long_name,
        stateShort: get("administrative_area_level_1")?.short_name,
        zip: get("postal_code")?.long_name,
        country: get("country")?.short_name,
      };
    },
    []
  );

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setFallback(true);
      return;
    }

    let mounted = true;

    loadGoogleMaps()
      .then(() => {
        if (!mounted || !inputRef.current) return;

        const options: google.maps.places.AutocompleteOptions = {
          types: ["address"],
          fields: [
            "formatted_address",
            "geometry",
            "place_id",
            "address_components",
          ],
        };

        if (restrictToUS) {
          options.componentRestrictions = { country: "us" };
        }

        const ac = new google.maps.places.Autocomplete(
          inputRef.current,
          options
        );

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place.geometry?.location) return;

          const result: PlaceResult = {
            address: place.formatted_address || "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id || "",
            components: place.address_components
              ? parseComponents(place.address_components)
              : {},
          };

          setValue(result.address);
          onSelect(result);
        });

        autocompleteRef.current = ac;
        setReady(true);
      })
      .catch(() => {
        if (mounted) setFallback(true);
      });

    return () => {
      mounted = false;
    };
  }, [onSelect, restrictToUS, parseComponents]);

  // Fallback: plain input with manual submit via Enter key
  const handleFallbackSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      onSelect({
        address: value.trim(),
        lat: 0,
        lng: 0,
        placeId: "",
        components: {},
      });
    }
  };

  return (
    <div className={`address-autocomplete ${className}`}>
      <div style={{ position: "relative" }}>
        <svg
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "18px",
            height: "18px",
            color: "#94a3b8",
            pointerEvents: "none",
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={fallback ? handleFallbackSubmit : undefined}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "0.75rem 0.75rem 0.75rem 2.5rem",
            fontSize: "0.9375rem",
            border: "1px solid var(--border-color, #e2e8f0)",
            borderRadius: "8px",
            background: "var(--bg-primary, #fff)",
            color: "var(--text-primary, #1a202c)",
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#1B2A4A";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,42,74,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-color, #e2e8f0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />

        {!fallback && ready && (
          <span
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.65rem",
              color: "#94a3b8",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            Powered by Google
          </span>
        )}
      </div>
    </div>
  );
}
