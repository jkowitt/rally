/// <reference types="@types/google.maps" />
"use client";

/**
 * Google Maps Script Loader
 * Singleton that ensures the Google Maps JS API is loaded exactly once.
 * Supports Maps, Places, Geocoding, and Geometry libraries.
 */

type LoadStatus = "idle" | "loading" | "loaded" | "error";

let loadStatus: LoadStatus = "idle";
let loadPromise: Promise<void> | null = null;

const REQUIRED_LIBRARIES = ["places", "geometry"];

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

export function isGoogleMapsConfigured(): boolean {
  return !!getGoogleMapsApiKey();
}

export function getLoadStatus(): LoadStatus {
  return loadStatus;
}

/**
 * Load the Google Maps JavaScript API.
 * Safe to call multiple times — will only load once.
 */
export function loadGoogleMaps(): Promise<void> {
  if (loadStatus === "loaded") return Promise.resolve();
  if (loadPromise) return loadPromise;

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    loadStatus = "error";
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured")
    );
  }

  // Already loaded by another script tag
  if (typeof window !== "undefined" && window.google?.maps) {
    loadStatus = "loaded";
    return Promise.resolve();
  }

  loadStatus = "loading";

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${REQUIRED_LIBRARIES.join(",")}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      loadStatus = "loaded";
      resolve();
    };

    script.onerror = () => {
      loadStatus = "error";
      loadPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Forward-geocode an address to coordinates.
 * Uses Google Geocoding API via the loaded Maps JS SDK.
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  await loadGoogleMaps();
  const geocoder = new google.maps.Geocoder();

  return new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        resolve({
          lat: loc.lat(),
          lng: loc.lng(),
          formattedAddress: results[0].formatted_address,
        });
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Build a static Street View image URL for a given location.
 * Uses the Street View Static API (requires same API key).
 */
export function getStreetViewUrl(
  location: string | { lat: number; lng: number },
  options: {
    width?: number;
    height?: number;
    heading?: number;
    pitch?: number;
    fov?: number;
  } = {}
): string {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return "";

  const { width = 600, height = 400, heading, pitch = 10, fov = 90 } = options;

  const locationParam =
    typeof location === "string"
      ? `location=${encodeURIComponent(location)}`
      : `location=${location.lat},${location.lng}`;

  let url = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&${locationParam}&pitch=${pitch}&fov=${fov}&key=${apiKey}`;

  if (heading !== undefined) {
    url += `&heading=${heading}`;
  }

  return url;
}

/**
 * Check whether Street View imagery is available for a location.
 * Uses the StreetViewService from the Maps JS SDK.
 */
export async function hasStreetView(
  location: { lat: number; lng: number },
  radius = 50
): Promise<boolean> {
  await loadGoogleMaps();
  const sv = new google.maps.StreetViewService();

  return new Promise((resolve) => {
    sv.getPanorama(
      { location, radius, source: google.maps.StreetViewSource.OUTDOOR },
      (_data, status) => {
        resolve(status === google.maps.StreetViewStatus.OK);
      }
    );
  });
}

// Re-export window type declaration
declare global {
  interface Window {
    google: typeof google;
  }
}
