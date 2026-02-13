import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/nearby
 *
 * Find nearby points of interest around a property using Google Places API.
 * Useful for neighbourhood analytics in valuation reports.
 *
 * Query params:
 *   lat      – latitude of the subject property
 *   lng      – longitude of the subject property
 *   radius   – search radius in meters (default 1600 ≈ 1 mile)
 *   types    – comma-separated place types (default: school,transit_station,
 *              supermarket,hospital,park,shopping_mall)
 */

const DEFAULT_TYPES =
  "school,transit_station,supermarket,hospital,park,shopping_mall";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius") || "1600";
    const types = searchParams.get("types") || DEFAULT_TYPES;

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Missing lat or lng parameter" },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      // Mock response
      return NextResponse.json({
        success: true,
        location: { lat: latitude, lng: longitude },
        categories: getMockNearby(latitude, longitude),
        source: "Mock Data (configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for real results)",
      });
    }

    // Fetch each type in parallel
    const typeList = types.split(",").map((t) => t.trim());
    const fetches = typeList.map(async (type) => {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
      );
      url.searchParams.set("location", `${latitude},${longitude}`);
      url.searchParams.set("radius", radius);
      url.searchParams.set("type", type);
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.warn(`Places API warning for type ${type}: ${data.status}`);
      }

      const results = (data.results || []).slice(0, 5).map(
        (place: {
          name: string;
          vicinity: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          user_ratings_total?: number;
          opening_hours?: { open_now: boolean };
        }) => ({
          name: place.name,
          address: place.vicinity,
          location: place.geometry.location,
          rating: place.rating || null,
          totalRatings: place.user_ratings_total || 0,
          openNow: place.opening_hours?.open_now ?? null,
        })
      );

      return { type, count: results.length, places: results };
    });

    const categories = await Promise.all(fetches);

    return NextResponse.json({
      success: true,
      location: { lat: latitude, lng: longitude },
      radius: parseInt(radius, 10),
      categories,
      source: "Google Places API",
    });
  } catch (error) {
    console.error("Nearby places error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby places" },
      { status: 500 }
    );
  }
}

/**
 * Mock nearby data for demo mode.
 */
function getMockNearby(lat: number, lng: number) {
  const hash = Math.abs(Math.round((lat * 1000 + lng * 1000) * 10));
  const mockPlaces = (type: string, names: string[]) => ({
    type,
    count: names.length,
    places: names.map((name, i) => ({
      name,
      address: `${100 + hash + i * 10} ${type === "school" ? "Education" : "Commerce"} Blvd`,
      location: {
        lat: lat + (i * 0.002 - 0.003),
        lng: lng + (i * 0.002 - 0.003),
      },
      rating: 3.5 + ((hash + i) % 15) / 10,
      totalRatings: 50 + ((hash + i) % 200),
      openNow: i % 2 === 0,
    })),
  });

  return [
    mockPlaces("school", ["Lincoln Elementary", "Jefferson High School", "Westside Academy"]),
    mockPlaces("transit_station", ["Central Station", "Park Avenue Stop"]),
    mockPlaces("supermarket", ["Fresh Mart", "Valley Grocery", "Whole Choice Market"]),
    mockPlaces("hospital", ["Regional Medical Center"]),
    mockPlaces("park", ["Heritage Park", "Riverside Green"]),
    mockPlaces("shopping_mall", ["Town Center Plaza"]),
  ];
}
