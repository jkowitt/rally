import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzePropertyImage } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/analyze-image
 * Analyze property image for condition, wear and tear
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { imageUrl, propertyId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Analyze image with AI
    const analysis = await analyzePropertyImage(imageUrl);

    // If authenticated and propertyId is provided, save the image and analysis
    if (session && session.user && propertyId) {
      await prisma.propertyImage.create({
        data: {
          propertyId,
          url: imageUrl,
          type: 'EXTERIOR',
          aiAnalysis: JSON.stringify(analysis),
          aiTags: analysis.tags || [],
        },
      });

      // Update property with AI condition score if better than existing
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });

      if (property) {
        const updateData: any = {};

        if (!property.aiConditionScore || analysis.conditionScore > property.aiConditionScore) {
          updateData.aiConditionScore = analysis.conditionScore;
        }

        if (analysis.issues && analysis.issues.length > 0) {
          updateData.aiWearTearNotes = JSON.stringify(analysis.issues);
        }

        if (analysis.recommendations && analysis.recommendations.length > 0) {
          updateData.aiRecommendations = JSON.stringify(analysis.recommendations);
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.property.update({
            where: { id: propertyId },
            data: updateData,
          });
        }
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'analyzed_property_image',
          entityType: 'property',
          entityId: propertyId,
          details: {
            conditionScore: analysis.conditionScore,
            issuesFound: analysis.issues?.length || 0,
          },
        },
      });
    }

    // Return analysis for both authenticated and demo users
    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
