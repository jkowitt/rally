import OpenAI from 'openai';

// Lazy initialization - only create client when needed
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30-second request timeout
      maxRetries: 1,
    });
  }

  return openaiClient;
}

/**
 * Safely parse JSON from OpenAI responses.
 * Strips markdown fences and handles common formatting issues.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJsonParse(content: string): any {
  let cleaned = content.trim();
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

/**
 * Analyze property image for condition, wear and tear
 */
export async function analyzePropertyImage(imageUrl: string) {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this property image and provide:
1. Overall condition score (0-100)
2. Identified issues (wear and tear, damage, maintenance needs)
3. Recommendations for improvements
4. Estimated severity of any issues (low, medium, high)

Format the response as JSON with keys: conditionScore, issues, recommendations, tags`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const analysis = safeJsonParse(content);
    return analysis;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

/**
 * Generate property improvement recommendations
 */
export async function generatePropertyRecommendations(propertyData: {
  propertyType: string;
  condition: number;
  yearBuilt?: number;
  squareFeet?: number;
  issues?: string[];
}) {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a real estate expert specializing in property improvements and value enhancement.",
        },
        {
          role: "user",
          content: `Given a ${propertyData.propertyType} property with:
- Condition Score: ${propertyData.condition}/100
- Year Built: ${propertyData.yearBuilt || 'Unknown'}
- Square Feet: ${propertyData.squareFeet || 'Unknown'}
- Known Issues: ${propertyData.issues?.join(', ') || 'None reported'}

Provide 5-7 actionable recommendations to increase property value. For each recommendation include:
1. Priority (High/Medium/Low)
2. Estimated cost (dollar amount)
3. Potential value increase (dollar amount)
4. Timeline
5. costBasis: Explain how the cost estimate was calculated (e.g., material costs, labor rates, scope of work)
6. valueRationale: Explain how the value increase was determined (e.g., industry data, comparable sales impact, buyer demand factors)
7. specificChanges: An array of 3-7 specific, actionable changes to make. Each should be a concrete task a contractor or homeowner could execute with specific materials and actions. For example: ["Replace countertops with white quartz", "Install new brushed nickel cabinet hardware", "Add subway tile backsplash in herringbone pattern", "Replace kitchen faucet with pull-down sprayer in matte black"]

Format as JSON array with keys: priority, recommendation, estimatedCost, valueIncrease, timeline, costBasis, valueRationale, specificChanges`,
        },
      ],
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return safeJsonParse(content);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
}

/**
 * Extract property information from image using geocoding
 */
export async function geocodePropertyFromImage(imageUrl: string) {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and identify:
1. Any visible address numbers or street signs
2. Property type (commercial, residential, etc.)
3. Architectural style
4. Visible landmarks or identifying features
5. Approximate location indicators

Format as JSON with keys: visibleAddress, propertyType, features, locationClues`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return safeJsonParse(content);
  } catch (error) {
    console.error('Error geocoding image:', error);
    throw error;
  }
}

/**
 * Analyze property image and return specific improvement recommendations
 * Uses GPT-4 Vision to examine the actual photo
 */
export async function analyzeImprovementsFromImage(imageUrl: string, area: string) {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert property inspector and real estate renovation consultant. You analyze property photos to identify specific issues and recommend improvements with accurate cost estimates and ROI projections. Always provide actionable, specific recommendations based on what you can actually see in the image.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this property photo of the "${area}" area. Examine the image carefully and provide:

1. An overall condition score from 0-100
2. A condition rating: "excellent" (80-100), "good" (60-79), "fair" (40-59), or "poor" (0-39)
3. A list of specific issues you can see (be specific about what you observe)
4. A list of recommended improvements based on what you see

For each improvement provide:
- title: Short name of the improvement
- description: Detailed written explanation of what should be done and WHY this improvement increases property value. Reference what you see in the image. Explain the value proposition clearly.
- specificChanges: An array of 3-7 specific, actionable changes to make. Each should be a concrete task a contractor or homeowner could execute. Be very specific about materials, finishes, and actions. For example: ["Replace countertops with white quartz (Calacatta pattern)", "Install brushed nickel cabinet pulls on all doors and drawers", "Add LED under-cabinet strip lighting", "Replace single-basin sink with undermount double-basin stainless"]
- estimatedCost: Object with "low" and "high" dollar amounts
- costBasis: Explain HOW the cost estimate was calculated (e.g., "Based on average exterior painting costs of $2-4 per square foot for a typical 1,500 sqft facade, plus prep work and materials")
- potentialROI: Percentage ROI (e.g., 150 means 150% return)
- valueRationale: Explain HOW the ROI/value increase was determined (e.g., "National Association of Realtors data shows fresh exterior paint recovers 150% of cost at resale. Curb appeal improvements are the #1 driver of first impressions for buyers.")
- priority: "high", "medium", or "low"
- timeframe: Estimated completion time (e.g., "2-3 days")

Also estimate the total potential value impact of all improvements combined.

Return ONLY valid JSON with this structure:
{
  "overallScore": number,
  "condition": "excellent" | "good" | "fair" | "poor",
  "issues": ["string"],
  "improvements": [{ "title": "", "description": "", "specificChanges": [""], "estimatedCost": { "low": 0, "high": 0 }, "costBasis": "", "potentialROI": 0, "valueRationale": "", "priority": "", "timeframe": "" }],
  "estimatedValueImpact": number
}`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');
    return safeJsonParse(content);
  } catch (error) {
    console.error('Error analyzing improvements from image:', error);
    throw error;
  }
}

/**
 * Generate comparable sales using AI market knowledge, grounded by
 * real public records data (sale history, lot size) when available.
 */
export async function analyzeComparables(propertyData: {
  address: string;
  city: string;
  state: string;
  propertyType: string;
  sqft?: number;
  beds?: number;
  baths?: number;
  yearBuilt?: number;
  units?: number;
  purchasePrice?: number;
  lotSizeAcres?: number;
  saleHistory?: Array<{ date: string; price: number; type?: string }>;
  saleHistorySource?: "rentcast" | "openai" | "fallback";
}) {
  try {
    const openai = getOpenAIClient();
    const today = new Date().toISOString().split('T')[0];

    // Build sale history context for the prompt
    const hasSaleRecords = propertyData.saleHistory && propertyData.saleHistory.length > 0;
    const isPublicRecords = propertyData.saleHistorySource === "rentcast";

    let saleHistoryBlock = "";
    if (hasSaleRecords) {
      const records = propertyData.saleHistory!;
      const label = isPublicRecords ? "PUBLIC RECORDS (verified)" : "AI-estimated sale history (lower confidence)";
      saleHistoryBlock = `\n\nSALE HISTORY FOR THIS PROPERTY (${label}):
${records.map(s => `  - ${s.date}: $${s.price.toLocaleString()} (${s.type || "Sale"})`).join("\n")}

${isPublicRecords
  ? "These are REAL recorded transactions from county deed records. Use them to calibrate your $/sqft estimates and value ranges. The most recent sale price is a strong anchor — your comps and suggested value should be consistent with this transaction data."
  : "These are AI-estimated sale records, not verified public records. Use them as approximate context only."
}`;
      // Derive $/sqft from most recent sale if we have sqft
      if (propertyData.sqft && records.length > 0) {
        const mostRecent = records[0];
        const ppsf = Math.round(mostRecent.price / propertyData.sqft);
        saleHistoryBlock += `\nDerived $/sqft from most recent sale: ~$${ppsf}/sqft. Your comp estimates should be in this neighborhood.`;
      }
    }

    // Adjust confidence cap based on data quality
    const confidenceCap = isPublicRecords ? 72 : hasSaleRecords ? 60 : 55;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a real estate market analyst. ${isPublicRecords
            ? "You have been provided with REAL public records data (verified county deed transactions) for this property. Use this data to ground your comparable sales estimates and market analysis. Your estimates should be CONSISTENT with the recorded transaction history."
            : "You do NOT have access to MLS, public records, or live transaction databases. You are providing ESTIMATES based on your training data about real estate pricing patterns, neighborhood values, and market conditions."
          }

RULES YOU MUST FOLLOW:
1. Be CONSERVATIVE. It is far better to underestimate values than to overestimate. Brokers will compare your numbers to real MLS data — if you are too high, you lose all credibility.
2. Use REAL street names that actually exist in ${propertyData.city}, ${propertyData.state}. Do not invent streets.
3. ${isPublicRecords
  ? "You have real sale history data for this property. Use the most recent sale price and $/sqft as a strong calibration point for your comp estimates. Your suggested value and comp prices should be CONSISTENT with the actual recorded transactions — do not deviate wildly from the real $/sqft."
  : "Base $/sqft estimates on your knowledge of median home prices and typical $/sqft for this specific city and property type. Do NOT anchor on any listed price the user provides — analyze the market independently."}
4. Provide meaningful VALUE RANGES (at least +/- 10-15%) to reflect uncertainty.
5. Your confidence score should NEVER exceed ${confidenceCap}. ${isPublicRecords ? "With real sale records you can be somewhat more confident, but still acknowledge that comps are estimates." : "Without real transaction data this is inherently an estimate."}
6. For sale prices: think about what the Zillow/Redfin median is for this zip code, then adjust for property specifics.
7. Today's date is ${today}. Set estimated sale dates within the last 6 months.`,
        },
        {
          role: "user",
          content: `Provide estimated comparable sales for this property:

Address: ${propertyData.address}, ${propertyData.city}, ${propertyData.state}
Property Type: ${propertyData.propertyType}
Square Feet: ${propertyData.sqft || 'Unknown'}
${propertyData.lotSizeAcres ? `Lot Size: ${propertyData.lotSizeAcres} acres` : ''}
Beds: ${propertyData.beds || 'N/A'}
Baths: ${propertyData.baths || 'N/A'}
Year Built: ${propertyData.yearBuilt || 'Unknown'}
Units: ${propertyData.units || '1'}
${propertyData.purchasePrice ? `User-Provided Price Reference: $${propertyData.purchasePrice.toLocaleString()} (provide your own independent estimate, but if sale records are provided, weight those more heavily)` : ''}${saleHistoryBlock}

Generate 4-6 estimated comps. For each:
- address: A REAL street name in ${propertyData.city}, ${propertyData.state} with a plausible house number
- distance: Estimated distance (keep within 1.5 miles)
- salePrice: Your best conservative estimate of a realistic sale price
- salePriceRange: { low: number, high: number } — realistic range (+/- 8-12%)
- saleDate: Within last 6 months from ${today}
- daysAgo: Days between sale date and today
- sqft: Similar to subject (+/- 15%)
- pricePerSqft: Calculated from salePrice / sqft
- propertyType: Same as subject
- yearBuilt: Similar vintage
- beds, baths, units: Similar to subject
- capRate: If income property, estimated area cap rate
- adjustments: What adjustments a real appraiser would make vs. the subject

Market summary:
- avgPricePerSqft: Best estimate of $/sqft for this property type in this market
- pricePerSqftRange: { low: number, high: number }
- medianSalePrice: Estimated median for similar properties
- suggestedValue: Conservative estimate of fair market value
- valueRange: { low: number, high: number } — meaningful range reflecting uncertainty
- confidence: 0-${confidenceCap} MAX.
- marketTrend: "appreciating", "stable", or "declining"
- keyInsights: 3-5 insights about this specific market${isPublicRecords ? " (reference the real sale history when relevant)" : ""}
- disclaimer: "${isPublicRecords ? "Comparable sales are AI-generated estimates informed by real public records for the subject property. Verify all values with local MLS data before making investment decisions." : "These are AI-generated estimates based on market knowledge, not actual MLS transaction records. Verify all values with local MLS data before making investment decisions."}"

Return ONLY valid JSON:
{
  "comps": [{ "address": "", "distance": "", "salePrice": 0, "salePriceRange": { "low": 0, "high": 0 }, "saleDate": "", "daysAgo": 0, "sqft": 0, "pricePerSqft": 0, "propertyType": "", "yearBuilt": 0, "beds": 0, "baths": 0, "units": 0, "capRate": 0, "adjustments": "" }],
  "marketSummary": { "avgPricePerSqft": 0, "pricePerSqftRange": { "low": 0, "high": 0 }, "medianSalePrice": 0, "suggestedValue": 0, "valueRange": { "low": 0, "high": 0 }, "confidence": 0, "marketTrend": "", "keyInsights": [""], "disclaimer": "" }
}`,
        },
      ],
      max_tokens: 3000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');
    return safeJsonParse(content);
  } catch (error) {
    console.error('Error analyzing comparables:', error);
    throw error;
  }
}

/**
 * Analyze real-time market trends for a specific area and return a value
 * adjustment factor that should be applied to the property valuation.
 *
 * The adjustment factor accounts for whether the local market is hot
 * (appreciating rapidly → higher values) or cold (declining → lower values).
 */
export async function analyzeMarketTrends(marketData: {
  city: string;
  state: string;
  zipCode?: string;
  propertyType: string;
  address?: string;
  sqft?: number;
  recentSales?: Array<{ price: number; date: string; sqft?: number }>;
  saleHistory?: Array<{ date: string; price: number; type?: string }>;
  saleHistorySource?: "rentcast" | "openai" | "fallback";
  compsAvgPricePerSqft?: number;
  currentEstimatedValue?: number;
}) {
  try {
    const openai = getOpenAIClient();
    const today = new Date().toISOString().split('T')[0];

    const hasRealSaleHistory = marketData.saleHistorySource === "rentcast" && marketData.saleHistory && marketData.saleHistory.length > 0;

    let saleContext = "";
    if (marketData.saleHistory && marketData.saleHistory.length > 0) {
      const label = hasRealSaleHistory ? "VERIFIED PUBLIC RECORDS" : "AI-estimated (lower confidence)";
      saleContext = `\n\nSUBJECT PROPERTY SALE HISTORY (${label}):\n${marketData.saleHistory.map(s => `  - ${s.date}: $${s.price.toLocaleString()} (${s.type || "Sale"})`).join("\n")}`;
    }

    let compsContext = "";
    if (marketData.recentSales && marketData.recentSales.length > 0) {
      compsContext = `\n\nRECENT COMPARABLE SALES IN THE AREA:\n${marketData.recentSales.map(s => `  - ${s.date}: $${s.price.toLocaleString()}${s.sqft ? ` ($${Math.round(s.price / s.sqft)}/sqft)` : ""}`).join("\n")}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a senior real estate market analyst specializing in local market trend analysis. Today is ${today}. Your job is to analyze the CURRENT real estate market conditions in a specific area and determine how those conditions should affect property valuations.

You must analyze:
- Whether the area is a "hot market" (high demand, rising prices, low inventory, bidding wars) or "cold market" (declining prices, high inventory, long days on market)
- The annual appreciation/depreciation rate for the area
- Supply and demand dynamics
- How these trends should adjust a property's estimated value

IMPORTANT: Be data-driven and specific to the exact city, zip code, and property type. Different neighborhoods within the same city can have very different trends. ${hasRealSaleHistory ? "You have real sale history data — use the price changes between transactions to gauge actual appreciation." : ""}`,
        },
        {
          role: "user",
          content: `Analyze the current real estate market trends for:

Location: ${marketData.address ? `${marketData.address}, ` : ""}${marketData.city}, ${marketData.state}${marketData.zipCode ? ` ${marketData.zipCode}` : ""}
Property Type: ${marketData.propertyType}
${marketData.sqft ? `Square Feet: ${marketData.sqft}` : ""}
${marketData.compsAvgPricePerSqft ? `Current Area Avg $/sqft: $${marketData.compsAvgPricePerSqft}` : ""}
${marketData.currentEstimatedValue ? `Current Estimated Value: $${marketData.currentEstimatedValue.toLocaleString()}` : ""}${saleContext}${compsContext}

Analyze the market and return ONLY valid JSON:
{
  "marketTemperature": "hot" | "warm" | "neutral" | "cool" | "cold",
  "temperatureScore": <number 0-100, where 100 is the hottest market>,
  "annualAppreciationRate": <number, e.g. 5.2 for 5.2% annual appreciation, negative for declining>,
  "trendDirection": "appreciating" | "stable" | "declining",
  "trendVelocity": "rapid" | "moderate" | "slow",
  "valueAdjustmentPercent": <number, e.g. 3.5 means add 3.5% to estimated value to reflect current market heat. Can be negative for declining markets. Range: -10 to +15>,
  "medianDaysOnMarket": <number>,
  "inventoryLevel": "very_low" | "low" | "balanced" | "high" | "very_high",
  "buyerDemand": "very_high" | "high" | "moderate" | "low" | "very_low",
  "pricePerSqftTrend": {
    "current": <number, current avg $/sqft for this property type in this area>,
    "sixMonthsAgo": <number>,
    "oneYearAgo": <number>,
    "changePercent": <number, percent change over last 12 months>
  },
  "keyDrivers": ["<3-5 specific factors driving the market in this area, e.g. 'New Amazon HQ2 driving employment growth', 'Limited new construction permits', 'Rising mortgage rates cooling demand'>"],
  "areaHighlights": ["<2-3 specific facts about this area's real estate market, e.g. 'Median home price up 8% YoY to $425,000', 'Average 3.2 offers per listing'>"],
  "outlook12Month": "<1-2 sentence forecast for next 12 months>",
  "confidenceInTrend": <number 0-100, how confident you are in this trend assessment>
}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return safeJsonParse(content);
  } catch (error) {
    console.error('Error analyzing market trends:', error);
    throw error;
  }
}
