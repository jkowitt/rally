import { NextRequest, NextResponse } from "next/server";
import { analyzeMarketTrends } from "@/lib/openai";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      city, state, zipCode, propertyType, address, sqft,
      saleHistory, saleHistorySource, comps, currentEstimatedValue,
    } = body;

    if (!city || !state || !propertyType) {
      return NextResponse.json(
        { error: "city, state, and propertyType are required" },
        { status: 400 }
      );
    }

    // Build recent sales from comps if available
    const recentSales = Array.isArray(comps)
      ? comps
          .filter((c: Record<string, unknown>) => c.salePrice && c.saleDate)
          .map((c: Record<string, unknown>) => ({
            price: c.salePrice as number,
            date: c.saleDate as string,
            sqft: (c.sqft as number) || undefined,
          }))
      : undefined;

    // Calculate average $/sqft from comps
    const compsWithPpsf = Array.isArray(comps)
      ? comps.filter((c: Record<string, unknown>) => typeof c.pricePerSqft === "number" && (c.pricePerSqft as number) > 0)
      : [];
    const compsAvgPricePerSqft = compsWithPpsf.length > 0
      ? Math.round(compsWithPpsf.reduce((sum: number, c: Record<string, unknown>) => sum + (c.pricePerSqft as number), 0) / compsWithPpsf.length)
      : undefined;

    if (!process.env.OPENAI_API_KEY) {
      // Return neutral fallback when OpenAI is not configured
      return NextResponse.json({
        success: true,
        source: "fallback",
        marketTrends: {
          marketTemperature: "neutral",
          temperatureScore: 50,
          annualAppreciationRate: 3.0,
          trendDirection: "stable",
          trendVelocity: "moderate",
          valueAdjustmentPercent: 0,
          medianDaysOnMarket: 30,
          inventoryLevel: "balanced",
          buyerDemand: "moderate",
          pricePerSqftTrend: {
            current: compsAvgPricePerSqft || 200,
            sixMonthsAgo: compsAvgPricePerSqft ? Math.round(compsAvgPricePerSqft * 0.985) : 197,
            oneYearAgo: compsAvgPricePerSqft ? Math.round(compsAvgPricePerSqft * 0.97) : 194,
            changePercent: 3.0,
          },
          keyDrivers: [
            "Market data unavailable — using neutral defaults",
            "Configure OPENAI_API_KEY for real-time market trend analysis",
          ],
          areaHighlights: [],
          outlook12Month: "Unable to generate forecast without AI analysis configured.",
          confidenceInTrend: 10,
        },
      });
    }

    const trends = await analyzeMarketTrends({
      city,
      state,
      zipCode,
      propertyType,
      address,
      sqft: sqft ? parseInt(sqft) : undefined,
      recentSales,
      saleHistory: Array.isArray(saleHistory) ? saleHistory : undefined,
      saleHistorySource,
      compsAvgPricePerSqft,
      currentEstimatedValue: currentEstimatedValue ? parseFloat(currentEstimatedValue) : undefined,
    });

    // Clamp the adjustment to a safe range
    if (typeof trends.valueAdjustmentPercent === "number") {
      trends.valueAdjustmentPercent = Math.max(-10, Math.min(15, trends.valueAdjustmentPercent));
    }

    return NextResponse.json({
      success: true,
      source: "openai",
      marketTrends: trends,
    });
  } catch (error) {
    console.error("Error in market-trends API:", error);
    return NextResponse.json(
      { error: "Failed to analyze market trends" },
      { status: 500 }
    );
  }
}
