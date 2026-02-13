import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logEvaluation, cachePropertyRecord } from "@/lib/property-cache";

export const dynamic = 'force-dynamic';

/**
 * Log a completed property evaluation for the owner audit trail.
 * Also caches the evaluated property data so it strengthens future comps.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();

    // Log the evaluation
    await logEvaluation({
      userId,
      address: body.address || "",
      city: body.city || "",
      state: body.state || "",
      zipCode: body.zipCode,
      propertyType: body.propertyType || "",
      functionsUsed: {
        publicRecords: body.usedPublicRecords || false,
        realComps: body.usedRealComps || false,
        aiComps: body.usedAiComps || false,
        marketTrends: body.usedMarketTrends || false,
        imageAnalysis: body.usedImageAnalysis || false,
      },
      results: {
        estimatedValue: body.estimatedValue,
        confidence: body.confidence,
        compsCount: body.compsCount,
        realCompsCount: body.realCompsCount,
        marketTemperature: body.marketTemperature,
      },
    });

    // Cache the evaluated property as a future comp source
    if (body.address && body.city && body.state && body.estimatedValue) {
      await cachePropertyRecord({
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        propertyType: body.propertyType,
        squareFeet: body.sqft ? parseInt(body.sqft) : undefined,
        yearBuilt: body.yearBuilt ? parseInt(body.yearBuilt) : undefined,
        lastSalePrice: body.estimatedValue,
        lastSaleDate: new Date().toISOString().split("T")[0],
        latitude: body.latitude,
        longitude: body.longitude,
        source: "evaluation",
        isComp: true,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging evaluation:", error);
    return NextResponse.json({ error: "Failed to log evaluation" }, { status: 500 });
  }
}
