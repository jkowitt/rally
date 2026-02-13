import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Determine media type
    const mediaType = image.type || 'image/jpeg';

    // Check if Anthropic API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Return mock analysis if no API key
      return NextResponse.json({
        success: true,
        analysis: {
          propertyType: 'SINGLE_FAMILY',
          estimatedYearBuilt: 1995,
          stories: 2,
          condition: 'Good',
          conditionScore: 7.5,
          architecturalStyle: 'Traditional',
          features: ['Two-car garage', 'Front porch', 'Landscaping'],
          wearTearNotes: 'Unable to perform AI analysis - API key not configured. This is mock data.',
          recommendations: 'Configure ANTHROPIC_API_KEY environment variable to enable AI building analysis.',
          rawDescription: 'AI analysis not available - using mock data for demonstration.',
        },
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
      timeout: 30000,
    });

    // Analyze the building image
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Analyze this building/property image for a real estate valuation platform. Provide a detailed analysis in JSON format with the following fields:

{
  "propertyType": "SINGLE_FAMILY" | "MULTIFAMILY" | "COMMERCIAL" | "MIXED_USE" | "INDUSTRIAL" | "LAND",
  "estimatedYearBuilt": <number or null>,
  "stories": <number of floors/stories>,
  "condition": "Excellent" | "Good" | "Fair" | "Poor",
  "conditionScore": <number 1-10>,
  "architecturalStyle": <string describing style>,
  "features": [<array of notable features like "garage", "pool", "balcony", etc>],
  "estimatedSquareFeet": <number or null>,
  "visibleUnits": <number for multifamily, or null>,
  "wearTearNotes": <string describing visible maintenance issues, damage, or wear>,
  "recommendations": <string with recommendations for repairs or improvements>,
  "rawDescription": <detailed description of what you see>
}

Important:
- Only return the JSON object, no markdown formatting
- If you cannot determine a field, use null
- Be specific and detailed in descriptions
- Focus on observable facts from the image
- For conditionScore, 10 is pristine/new, 1 is severely deteriorated`,
            },
          ],
        },
      ],
    });

    // Extract the text response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the JSON response
    let analysis;
    try {
      // Remove any markdown code blocks if present
      const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse AI analysis. Please try again.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error) {
    console.error('Building analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze building image',
      },
      { status: 500 }
    );
  }
}
