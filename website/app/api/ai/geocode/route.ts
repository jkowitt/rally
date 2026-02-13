import { NextRequest, NextResponse } from 'next/server';
import { geocodePropertyFromImage } from '@/lib/openai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/geocode
 * Extract property information and location from image
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Analyze image for location clues
    const locationData = await geocodePropertyFromImage(imageUrl);

    return NextResponse.json({
      success: true,
      data: locationData,
    });
  } catch (error) {
    console.error('Error geocoding image:', error);
    return NextResponse.json(
      {
        error: 'Failed to geocode image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
