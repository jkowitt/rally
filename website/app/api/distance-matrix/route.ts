import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/distance-matrix
 *
 * Calculate driving distances and durations between a subject property and
 * one or more comparable properties using the Google Distance Matrix API.
 *
 * Query params:
 *   origin     – address or "lat,lng" of the subject property
 *   destinations – pipe-separated list of addresses or "lat,lng" values
 *                  e.g. "123 Main St|456 Oak Ave|37.77,-122.41"
 *   mode       – travel mode: driving (default), walking, transit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get("origin");
    const destinations = searchParams.get("destinations");
    const mode = searchParams.get("mode") || "driving";

    if (!origin || !destinations) {
      return NextResponse.json(
        { error: "Missing origin or destinations parameter" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      // Return mock data when API key is not configured
      const destList = destinations.split("|");
      const mockResults = destList.map((dest, i) => ({
        destination: dest,
        distance: { text: `${(0.5 + i * 0.8).toFixed(1)} mi`, meters: Math.round((0.5 + i * 0.8) * 1609) },
        duration: { text: `${3 + i * 4} mins`, seconds: (3 + i * 4) * 60 },
        status: "OK",
      }));

      return NextResponse.json({
        success: true,
        origin,
        results: mockResults,
        source: "Mock Data (configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for real distances)",
      });
    }

    // Call Google Distance Matrix API
    const url = new URL(
      "https://maps.googleapis.com/maps/api/distancematrix/json"
    );
    url.searchParams.set("origins", origin);
    url.searchParams.set("destinations", destinations.replace(/\|/g, "|"));
    url.searchParams.set("mode", mode);
    url.searchParams.set("units", "imperial");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      return NextResponse.json(
        { error: `Distance Matrix API error: ${data.status}`, detail: data.error_message },
        { status: 400 }
      );
    }

    const destAddresses: string[] = data.destination_addresses || [];
    const elements = data.rows?.[0]?.elements || [];

    const results = elements.map(
      (
        el: {
          status: string;
          distance?: { text: string; value: number };
          duration?: { text: string; value: number };
        },
        i: number
      ) => ({
        destination: destAddresses[i] || destinations.split("|")[i],
        distance: el.distance
          ? { text: el.distance.text, meters: el.distance.value }
          : null,
        duration: el.duration
          ? { text: el.duration.text, seconds: el.duration.value }
          : null,
        status: el.status,
      })
    );

    return NextResponse.json({
      success: true,
      origin: data.origin_addresses?.[0] || origin,
      results,
      source: "Google Distance Matrix API",
    });
  } catch (error) {
    console.error("Distance Matrix error:", error);
    return NextResponse.json(
      { error: "Failed to calculate distances" },
      { status: 500 }
    );
  }
}
