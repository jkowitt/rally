import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePropertyRecommendations } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/recommendations
 * Generate AI-powered property improvement recommendations
 * Supports both authenticated (saves to DB) and demo mode
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { propertyId, propertyType, condition, yearBuilt, squareFeet, issues: directIssues } = body;

    let recIssues: string[] = directIssues || [];
    let recPropertyType = propertyType || 'residential';
    let recCondition = condition || 75;
    let recYearBuilt = yearBuilt;
    let recSquareFeet = squareFeet;

    // If propertyId provided and user is authenticated, fetch from DB
    if (propertyId && session?.user) {
      const userId = (session.user as { id?: string }).id;
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { images: true },
      });

      // Verify the authenticated user has a valuation for this property
      // (Property model has no direct userId — ownership is through Valuation)
      if (property && userId) {
        const ownsProperty = await prisma.valuation.findFirst({
          where: { propertyId, userId },
          select: { id: true },
        });
        if (!ownsProperty) {
          return NextResponse.json({ error: 'Not authorized to access this property' }, { status: 403 });
        }
      }

      if (property) {
        recPropertyType = property.propertyType || recPropertyType;
        recCondition = property.aiConditionScore || recCondition;
        recYearBuilt = property.yearBuilt || recYearBuilt;
        recSquareFeet = property.squareFeet || recSquareFeet;

        if (property.aiWearTearNotes) {
          try {
            const parsed = JSON.parse(property.aiWearTearNotes);
            recIssues = Array.isArray(parsed) ? parsed : recIssues;
          } catch {
            // keep directIssues
          }
        }
      }
    }

    // Generate recommendations
    const recommendations = await generatePropertyRecommendations({
      propertyType: recPropertyType,
      condition: recCondition,
      yearBuilt: recYearBuilt || undefined,
      squareFeet: recSquareFeet || undefined,
      issues: recIssues,
    });

    // Save to DB if authenticated and propertyId provided
    if (session?.user && propertyId) {
      try {
        await prisma.property.update({
          where: { id: propertyId },
          data: { aiRecommendations: JSON.stringify(recommendations) },
        });
        await prisma.activityLog.create({
          data: {
            userId: (session.user as { id?: string }).id || 'unknown',
            action: 'generated_property_recommendations',
            entityType: 'property',
            entityId: propertyId,
            details: { recommendationsCount: recommendations.length },
          },
        });
      } catch {
        // DB save is optional, don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
