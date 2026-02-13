import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/geocode
 * Reverse geocode coordinates to get a human-readable address
 *
 * Query params:
 * - lat: latitude
 * - lng: longitude
 *
 * Uses Google Maps Geocoding API in production
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Missing latitude or longitude parameters' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Get Google Maps API key
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      // Mock geocoding for demo purposes
      const mockAddress = getMockAddressFromCoordinates(latitude, longitude);
      return NextResponse.json({
        success: true,
        address: mockAddress,
        coordinates: { lat: latitude, lng: longitude },
        source: 'Mock Data (Configure GOOGLE_MAPS_API_KEY for real geocoding)',
      });
    }

    // Use Google Maps Geocoding API
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const formattedAddress = data.results[0].formatted_address;

        return NextResponse.json({
          success: true,
          address: formattedAddress,
          coordinates: { lat: latitude, lng: longitude },
          fullResponse: data.results[0], // Include full data for advanced use
          source: 'Google Maps Geocoding API',
        });
      } else {
        return NextResponse.json(
          { error: `Geocoding failed: ${data.status}` },
          { status: 400 }
        );
      }
    } catch (apiError) {
      console.error('Google Maps API error:', apiError);
      // Fallback to mock
      const mockAddress = getMockAddressFromCoordinates(latitude, longitude);
      return NextResponse.json({
        success: true,
        address: mockAddress,
        coordinates: { lat: latitude, lng: longitude },
        source: 'Mock Data (API error fallback)',
      });
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode coordinates' },
      { status: 500 }
    );
  }
}

/**
 * Mock geocoding function for demo purposes
 * Generates plausible addresses based on coordinates
 */
function getMockAddressFromCoordinates(lat: number, lng: number): string {
  // Simple hashing to generate consistent addresses for same coordinates
  const hash = Math.abs(Math.round((lat * 1000 + lng * 1000) * 100));

  const streets = [
    'Main Street',
    'Oak Avenue',
    'Maple Drive',
    'Pine Road',
    'Elm Street',
    'Cedar Lane',
    'Birch Boulevard',
    'Willow Way',
    'Spruce Court',
    'Ash Place',
  ];

  const cities = [
    { name: 'San Francisco', state: 'CA', latRange: [37.7, 37.8], lngRange: [-122.5, -122.4] },
    { name: 'New York', state: 'NY', latRange: [40.7, 40.8], lngRange: [-74.0, -73.9] },
    { name: 'Los Angeles', state: 'CA', latRange: [34.0, 34.1], lngRange: [-118.3, -118.2] },
    { name: 'Chicago', state: 'IL', latRange: [41.8, 41.9], lngRange: [-87.7, -87.6] },
    { name: 'Austin', state: 'TX', latRange: [30.2, 30.3], lngRange: [-97.8, -97.7] },
    { name: 'Seattle', state: 'WA', latRange: [47.6, 47.7], lngRange: [-122.4, -122.3] },
    { name: 'Denver', state: 'CO', latRange: [39.7, 39.8], lngRange: [-105.0, -104.9] },
    { name: 'Boston', state: 'MA', latRange: [42.3, 42.4], lngRange: [-71.1, -71.0] },
  ];

  // Find closest city based on coordinates
  let closestCity = cities[0];
  let minDistance = Number.MAX_VALUE;

  for (const city of cities) {
    const cityLat = (city.latRange[0] + city.latRange[1]) / 2;
    const cityLng = (city.lngRange[0] + city.lngRange[1]) / 2;
    const distance = Math.sqrt(Math.pow(lat - cityLat, 2) + Math.pow(lng - cityLng, 2));

    if (distance < minDistance) {
      minDistance = distance;
      closestCity = city;
    }
  }

  const streetNumber = (hash % 9999) + 100;
  const streetName = streets[hash % streets.length];
  const zipCode = 10000 + (hash % 90000);

  return `${streetNumber} ${streetName}, ${closestCity.name}, ${closestCity.state} ${zipCode}`;
}
