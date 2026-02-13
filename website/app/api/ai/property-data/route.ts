import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Property Data Enrichment API
 * Uses OpenAI to estimate tax rates, insurance costs, closing costs,
 * maintenance reserves, and area statistics for a given property.
 */

interface PropertyDataRequest {
  address?: string;
  city: string;
  state: string;
  zipCode?: string;
  propertyType: string;
  sqft?: number;
  yearBuilt?: number;
  purchasePrice?: number;
  units?: number;
  lotSizeAcres?: number;
  saleHistory?: Array<{ date: string; price: number; type?: string }>;
  saleHistorySource?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PropertyDataRequest = await request.json();
    const { city, state, zipCode, propertyType, sqft, yearBuilt, purchasePrice, units, lotSizeAcres, saleHistory, saleHistorySource } = body;

    if (!city || !state) {
      return NextResponse.json({ error: "City and state are required" }, { status: 400 });
    }

    // Try OpenAI-powered enrichment
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const today = new Date().toISOString().split('T')[0];

        // Use most recent public sale record for value estimate when available
        const lastSalePrice = saleHistory && saleHistory.length > 0 ? saleHistory[0].price : null;
        const estimatedValue = purchasePrice || lastSalePrice || (sqft ? sqft * 200 : 400000);
        const hasRealSaleData = lastSalePrice && saleHistorySource === "rentcast";

        // Build sale history context
        let saleHistoryContext = "";
        if (saleHistory && saleHistory.length > 0) {
          const label = saleHistorySource === "rentcast" ? "PUBLIC RECORDS (verified)" : "estimated";
          saleHistoryContext = `\n\nSale History (${label}):\n${saleHistory.map(s => `  - ${s.date}: $${s.price.toLocaleString()}`).join("\n")}`;
          if (hasRealSaleData) {
            saleHistoryContext += `\nThe most recent recorded sale price ($${lastSalePrice.toLocaleString()}) is the best available basis for property tax assessment calculations.`;
          }
        }

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a real estate data analyst providing ESTIMATES of property costs and area statistics. ${hasRealSaleData
                ? "You have been given REAL public records data including verified sale history. Use the most recent sale price as a strong basis for tax assessments, insurance valuations, and operating cost calculations."
                : "You do NOT have access to live county assessor databases, MLS, or insurance quote systems. Your estimates are based on your training data about typical costs for specific locations and property types."}

RULES:
- Be CONSERVATIVE. Underestimates are better than overestimates.
- Property tax rates by state are relatively well-known public data — use accurate state-level rates. County-level variation exists, so note this.
- Insurance and maintenance costs should use industry benchmarks, not guesses.
- For area statistics (median prices, cap rates, vacancy), acknowledge these are estimates from your training data, not live market data.
- Today's date is ${today}. Your training data may not reflect the most recent market shifts.${hasRealSaleData ? "\n- Use the real sale price data provided to ground your property tax and insurance estimates." : ""}`,
            },
            {
              role: "user",
              content: `Provide detailed property cost estimates and area statistics for this property:

Location: ${city}, ${state} ${zipCode || ""}
Property Type: ${propertyType}
Square Feet: ${sqft || "Unknown"}
${lotSizeAcres ? `Lot Size: ${lotSizeAcres} acres` : ""}
Year Built: ${yearBuilt || "Unknown"}
Estimated Value: $${estimatedValue.toLocaleString()}${hasRealSaleData ? " (based on recorded sale price)" : ""}
Units: ${units || 1}${saleHistoryContext}

Provide ALL of the following data points with realistic, location-specific values:

1. Property Tax:
   - effectiveTaxRate: Annual property tax rate as a percentage of assessed value for ${city}, ${state} (e.g., 1.25 for 1.25%)
   - annualTaxEstimate: Estimated annual property tax in dollars
   - assessmentRatio: What percentage of market value the property is typically assessed at (e.g., 85 for 85%)
   - taxJurisdiction: Name of the taxing jurisdiction
   - taxTrend: "increasing", "stable", or "decreasing"

2. Insurance:
   - annualPremiumEstimate: Estimated annual insurance premium in dollars
   - perSqftRate: Insurance cost per square foot
   - coverageRecommendation: Brief description of recommended coverage
   - floodZoneRisk: "low", "moderate", or "high"

3. Closing Costs:
   - buyerClosingCostPercent: Typical buyer closing cost as percentage of purchase price
   - sellerClosingCostPercent: Typical seller closing cost as percentage
   - titleInsurance: Estimated title insurance cost
   - transferTax: Estimated transfer/deed tax
   - totalEstimatedClosingCosts: Total estimated closing costs in dollars

4. Maintenance & Reserves:
   - annualMaintenancePerSqft: Annual maintenance cost per square foot
   - annualMaintenanceTotal: Total annual maintenance estimate
   - capexReservePercent: Recommended capital expenditure reserve as % of rental income
   - replacementReservePerUnit: Annual replacement reserve per unit

5. Operating Expense Benchmarks:
   - propertyTaxAnnual: Annual property tax estimate (same as above)
   - insuranceAnnual: Annual insurance estimate (same as above)
   - utilitiesAnnual: Estimated annual utilities (water, sewer, electric for common areas)
   - repairsMaintenanceAnnual: Annual repairs and maintenance estimate
   - propertyManagementPercent: Typical property management fee as % of gross rent
   - propertyManagementAnnual: Estimated annual property management fee
   - landscapingAnnual: Annual landscaping estimate
   - trashRemovalAnnual: Annual trash removal estimate
   - professionalFeesAnnual: Annual professional fees (legal, accounting)
   - reservesAnnual: Recommended annual reserves

6. Area Statistics:
   - medianHomePrice: Median home/property price in the area
   - medianRentPerSqft: Median rent per square foot per month
   - averageCapRate: Average cap rate for this property type in the area
   - populationGrowth: Annual population growth rate percentage
   - employmentGrowthRate: Annual employment growth rate
   - averageDaysOnMarket: Average days on market for this property type
   - vacancyRate: Area vacancy rate percentage
   - rentGrowthRate: Annual rent growth rate percentage

7. currentMortgageRates:
   - conventional30: Current 30-year fixed rate
   - conventional15: Current 15-year fixed rate
   - commercial: Current commercial rate
   - bridge: Current bridge loan rate

Return ONLY valid JSON matching the structure described above. Use realistic values specific to ${city}, ${state}.`,
            },
          ],
          max_tokens: 2500,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("No response from OpenAI");

        const data = JSON.parse(content);

        return NextResponse.json({
          success: true,
          source: "openai",
          ...data,
          meta: {
            location: `${city}, ${state}${zipCode ? ` ${zipCode}` : ""}`,
            propertyType,
            estimatedValue,
            generatedAt: today,
          },
        });
      } catch (aiError) {
        console.error("OpenAI property data enrichment failed, using fallback:", aiError);
      }
    }

    // Fallback estimates when OpenAI is not available
    const fallbackLastSale = saleHistory && saleHistory.length > 0 ? saleHistory[0].price : null;
    const estimatedValue = purchasePrice || fallbackLastSale || (sqft ? sqft * 200 : 400000);
    const estSqft = sqft || 2000;
    const estUnits = units || 1;

    // Tax rate varies by state - use rough averages
    const stateTaxRates: Record<string, number> = {
      NJ: 2.21, IL: 2.07, NH: 1.86, CT: 2.14, WI: 1.68,
      TX: 1.60, NE: 1.63, OH: 1.56, PA: 1.58, IA: 1.57,
      NY: 1.72, MI: 1.54, MN: 1.12, KS: 1.41, SD: 1.28,
      MA: 1.23, FL: 0.86, WA: 0.93, CA: 0.73, GA: 0.92,
      NC: 0.77, TN: 0.64, AZ: 0.62, SC: 0.57, NV: 0.53,
      CO: 0.51, AL: 0.41, HI: 0.28, DEFAULT: 1.07,
    };
    const taxRate = stateTaxRates[state] || stateTaxRates.DEFAULT;
    const annualTax = Math.round(estimatedValue * (taxRate / 100));

    // Insurance estimates
    const insurancePerSqft = propertyType === "commercial" ? 1.50
      : propertyType === "industrial" ? 1.20
      : propertyType === "multifamily" ? 1.10
      : 0.90;
    const annualInsurance = Math.round(estSqft * insurancePerSqft);

    // Closing costs
    const closingCostPct = state === "NY" || state === "NJ" ? 4.5
      : state === "CA" || state === "WA" ? 3.0
      : 3.5;

    // Maintenance
    const maintenancePerSqft = propertyType === "commercial" ? 2.50
      : propertyType === "industrial" ? 1.50
      : 2.00;

    // Operating expenses
    const mgmtPct = propertyType === "single-family" ? 8 : 6;
    const monthlyRentEstimate = estSqft * 1.20;
    const mgmtAnnual = Math.round(monthlyRentEstimate * 12 * (mgmtPct / 100));

    const fallbackData = {
      propertyTax: {
        effectiveTaxRate: taxRate,
        annualTaxEstimate: annualTax,
        assessmentRatio: 85,
        taxJurisdiction: `${city} County`,
        taxTrend: "stable",
      },
      insurance: {
        annualPremiumEstimate: annualInsurance,
        perSqftRate: insurancePerSqft,
        coverageRecommendation: `Standard ${propertyType} property coverage with liability`,
        floodZoneRisk: "low",
      },
      closingCosts: {
        buyerClosingCostPercent: closingCostPct,
        sellerClosingCostPercent: closingCostPct - 0.5,
        titleInsurance: Math.round(estimatedValue * 0.005),
        transferTax: Math.round(estimatedValue * 0.01),
        totalEstimatedClosingCosts: Math.round(estimatedValue * (closingCostPct / 100)),
      },
      maintenanceReserves: {
        annualMaintenancePerSqft: maintenancePerSqft,
        annualMaintenanceTotal: Math.round(estSqft * maintenancePerSqft),
        capexReservePercent: 5,
        replacementReservePerUnit: Math.round(250 * 12 / estUnits),
      },
      operatingExpenseBenchmarks: {
        propertyTaxAnnual: annualTax,
        insuranceAnnual: annualInsurance,
        utilitiesAnnual: Math.round(estSqft * 1.80),
        repairsMaintenanceAnnual: Math.round(estSqft * maintenancePerSqft),
        propertyManagementPercent: mgmtPct,
        propertyManagementAnnual: mgmtAnnual,
        landscapingAnnual: Math.round(estSqft * 0.35),
        trashRemovalAnnual: Math.round(estUnits * 600),
        professionalFeesAnnual: Math.round(2500 + estUnits * 200),
        reservesAnnual: Math.round(estSqft * 0.50),
      },
      areaStatistics: {
        medianHomePrice: Math.round(estimatedValue * 0.95),
        medianRentPerSqft: 1.20,
        averageCapRate: propertyType === "commercial" ? 6.5 : propertyType === "multifamily" ? 5.8 : 5.2,
        populationGrowth: 1.2,
        employmentGrowthRate: 1.8,
        averageDaysOnMarket: 45,
        vacancyRate: 5.5,
        rentGrowthRate: 3.2,
      },
      currentMortgageRates: await getLiveRates(),
    };

    return NextResponse.json({
      success: true,
      source: "fallback",
      ...fallbackData,
      meta: {
        location: `${city}, ${state}`,
        propertyType,
        estimatedValue,
        generatedAt: new Date().toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error("Error in property-data API:", error);
    return NextResponse.json({ error: "Failed to enrich property data" }, { status: 500 });
  }
}

/**
 * Get mortgage rates by querying FRED directly (same logic as /api/interest-rates).
 * Avoids self-referential HTTP calls that fail in serverless environments.
 * Falls back to static defaults if the FRED fetch fails.
 */
async function getLiveRates(): Promise<{ conventional30: number; conventional15: number; commercial: number; bridge: number }> {
  const defaults = { conventional30: 6.875, conventional15: 6.125, commercial: 7.50, bridge: 10.25 };
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) return defaults;

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${fredKey}&file_type=json&sort_order=desc&limit=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return defaults;
    const json = await res.json();
    const obs = json.observations?.find((o: { value: string }) => o.value !== '.');
    const rate30 = obs ? parseFloat(obs.value) : null;
    if (!rate30) return defaults;
    return {
      conventional30: rate30,
      conventional15: Math.round((rate30 - 0.60) * 100) / 100,
      commercial: Math.round((rate30 + 0.75) * 100) / 100,
      bridge: Math.round((rate30 + 3.0) * 100) / 100,
    };
  } catch {
    return defaults;
  }
}
