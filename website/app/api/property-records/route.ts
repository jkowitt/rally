import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPropertyRecordAccess, recordPropertyRecordUsage, OVERAGE_PRICE_CENTS, hasPaidAccess } from "@/lib/usage";
import { getCachedRecord, cachePropertyRecord } from "@/lib/property-cache";

export const dynamic = 'force-dynamic';

/**
 * Property Records API
 * Fetches public property records (lot size, sale history) from RentCast API.
 * Falls back to OpenAI estimation when RentCast is unavailable.
 *
 * Usage is tracked per user per billing period.
 * After the plan's included lookups are exhausted, each additional
 * request is charged $2.00 automatically.
 */

interface PropertyRecordsRequest {
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  propertyType?: string;
}

interface SaleRecord {
  date: string;
  price: number;
  buyer?: string;
  seller?: string;
  type?: string;
}

interface PropertyRecordsResponse {
  success: boolean;
  source: "rentcast" | "openai" | "fallback";
  lotSizeAcres: number | null;
  lotSizeSqft: number | null;
  saleHistory: SaleRecord[];
  propertyDetails?: {
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    yearBuilt?: number;
    propertyType?: string;
    lastSaleDate?: string;
    lastSalePrice?: number;
  };
  disclaimer?: string;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
    plan: string;
    overageCount: number;
    overageCostCents: number;
    wasOverage: boolean;
  };
}

// Simple in-memory cache (5-minute TTL, max 200 entries)
const recordsCache = new Map<string, { data: PropertyRecordsResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 200;

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Beta / free users cannot use property record lookups — must upgrade to a paid plan
    const { allowed, plan } = await hasPaidAccess(userId);
    if (!allowed) {
      return NextResponse.json({
        error: "Property record lookups require a paid plan. Please upgrade to access public records, comps, and property data.",
        plan,
        upgradeRequired: true,
      }, { status: 403 });
    }

    const body: PropertyRecordsRequest = await request.json();
    const { address, city, state, zipCode } = body;

    if (!address || !city || !state) {
      return NextResponse.json({ error: "Address, city, and state are required" }, { status: 400 });
    }

    // Check cache first (cached results don't count against usage)
    const cacheKey = `${address}|${city}|${state}`.toLowerCase();
    const cached = recordsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Return cached data with fresh usage info (no new charge)
      const { usage: currentUsage } = await checkPropertyRecordAccess(userId);
      return NextResponse.json({
        ...cached.data,
        usage: {
          used: currentUsage.used,
          limit: currentUsage.limit,
          remaining: currentUsage.remaining,
          plan: currentUsage.plan,
          overageCount: currentUsage.overageCount,
          overageCostCents: currentUsage.overageCostCents,
          wasOverage: false,
        },
      });
    }

    // Check persistent database cache (no charge, no RentCast call)
    const dbCached = await getCachedRecord(address, city, state);
    if (dbCached && dbCached.lastSalePrice) {
      const { usage: currentUsage } = await checkPropertyRecordAccess(userId);
      const cachedResponse: PropertyRecordsResponse = {
        success: true,
        source: "rentcast",
        lotSizeAcres: dbCached.lotSizeSqft ? Math.round((dbCached.lotSizeSqft / 43560) * 1000) / 1000 : null,
        lotSizeSqft: dbCached.lotSizeSqft,
        saleHistory: Array.isArray(dbCached.saleHistory) ? (dbCached.saleHistory as unknown as SaleRecord[]) : [],
        propertyDetails: {
          bedrooms: dbCached.bedrooms ?? undefined,
          bathrooms: dbCached.bathrooms ?? undefined,
          squareFeet: dbCached.squareFeet ?? undefined,
          yearBuilt: dbCached.yearBuilt ?? undefined,
          propertyType: dbCached.propertyType ?? undefined,
          lastSaleDate: dbCached.lastSaleDate ?? undefined,
          lastSalePrice: dbCached.lastSalePrice ?? undefined,
        },
        disclaimer: "Data served from Legacy RE cache (originally from public records). No lookup charged.",
        usage: {
          used: currentUsage.used,
          limit: currentUsage.limit,
          remaining: currentUsage.remaining,
          plan: currentUsage.plan,
          overageCount: currentUsage.overageCount,
          overageCostCents: currentUsage.overageCostCents,
          wasOverage: false,
        },
      };
      // Also update the in-memory cache
      recordsCache.set(cacheKey, { data: cachedResponse, timestamp: Date.now() });
      return NextResponse.json(cachedResponse);
    }

    // Check usage limits (always allowed, but may be flagged as overage)
    const { willBeOverage, usage } = await checkPropertyRecordAccess(userId);
    // Evict stale and excess entries to prevent unbounded memory growth
    if (recordsCache.size >= CACHE_MAX_SIZE) {
      const now = Date.now();
      for (const [key, entry] of recordsCache) {
        if (now - entry.timestamp > CACHE_TTL) recordsCache.delete(key);
      }
      // If still at limit, remove oldest entries
      if (recordsCache.size >= CACHE_MAX_SIZE) {
        const oldest = [...recordsCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
        for (let i = 0; i < Math.ceil(CACHE_MAX_SIZE / 4); i++) recordsCache.delete(oldest[i][0]);
      }
    }

    // Build usage info for response
    const buildUsage = (wasOverage: boolean) => ({
      used: usage.used + 1,
      limit: usage.limit,
      remaining: Math.max(0, usage.remaining - 1),
      plan: usage.plan,
      overageCount: wasOverage ? usage.overageCount + 1 : usage.overageCount,
      overageCostCents: wasOverage ? usage.overageCostCents + OVERAGE_PRICE_CENTS : usage.overageCostCents,
      wasOverage,
    });

    // Try RentCast API first
    if (process.env.RENTCAST_API_KEY) {
      try {
        const result = await fetchFromRentCast(address, city, state, zipCode);
        if (result) {
          // Record usage (counts against quota)
          await recordPropertyRecordUsage(userId, {
            address: `${address}, ${city}, ${state}`,
            source: 'rentcast',
            wasOverage: willBeOverage,
          });

          const responseData = {
            ...result,
            usage: buildUsage(willBeOverage),
          };

          if (willBeOverage) {
            responseData.disclaimer = `${result.disclaimer || ""} Note: This lookup exceeded your ${usage.plan} plan limit of ${usage.limit}/month. An additional charge of $${(OVERAGE_PRICE_CENTS / 100).toFixed(2)} applies.`.trim();
          }

          recordsCache.set(cacheKey, { data: result, timestamp: Date.now() });

          // Persist to database cache for future users
          cachePropertyRecord({
            address, city, state, zipCode,
            propertyType: result.propertyDetails?.propertyType,
            bedrooms: result.propertyDetails?.bedrooms,
            bathrooms: result.propertyDetails?.bathrooms,
            squareFeet: result.propertyDetails?.squareFeet,
            yearBuilt: result.propertyDetails?.yearBuilt,
            lotSizeSqft: result.lotSizeSqft ?? undefined,
            lastSaleDate: result.propertyDetails?.lastSaleDate,
            lastSalePrice: result.propertyDetails?.lastSalePrice,
            saleHistory: result.saleHistory,
            source: "rentcast",
          }).catch(() => {});

          return NextResponse.json(responseData);
        }
      } catch (err) {
        console.error("RentCast API error, falling back:", err);
      }
    }

    // Fall back to OpenAI estimation
    if (process.env.OPENAI_API_KEY) {
      try {
        const result = await estimateFromOpenAI(address, city, state, zipCode, body.propertyType);
        if (result) {
          // Record usage (counts against quota)
          await recordPropertyRecordUsage(userId, {
            address: `${address}, ${city}, ${state}`,
            source: 'openai',
            wasOverage: willBeOverage,
          });

          const responseData = {
            ...result,
            usage: buildUsage(willBeOverage),
          };

          if (willBeOverage) {
            responseData.disclaimer = `${result.disclaimer || ""} Note: This lookup exceeded your ${usage.plan} plan limit of ${usage.limit}/month. An additional charge of $${(OVERAGE_PRICE_CENTS / 100).toFixed(2)} applies.`.trim();
          }

          recordsCache.set(cacheKey, { data: result, timestamp: Date.now() });
          return NextResponse.json(responseData);
        }
      } catch (err) {
        console.error("OpenAI property records fallback error:", err);
      }
    }

    // Static fallback (no external call — doesn't count against usage)
    const fallback: PropertyRecordsResponse = {
      success: true,
      source: "fallback",
      lotSizeAcres: null,
      lotSizeSqft: null,
      saleHistory: [],
      disclaimer: "No property records API configured. Add a RENTCAST_API_KEY for real public records data.",
      usage: {
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
        plan: usage.plan,
        overageCount: usage.overageCount,
        overageCostCents: usage.overageCostCents,
        wasOverage: false,
      },
    };
    return NextResponse.json(fallback);

  } catch (error) {
    console.error("Error in property-records API:", error);
    return NextResponse.json({ error: "Failed to fetch property records" }, { status: 500 });
  }
}

/**
 * Fetch property records from RentCast API
 * Docs: https://developers.rentcast.io/reference/property-records
 */
async function fetchFromRentCast(
  address: string,
  city: string,
  state: string,
  zipCode?: string
): Promise<PropertyRecordsResponse | null> {
  const apiKey = process.env.RENTCAST_API_KEY!;

  // Build query - RentCast accepts address as a single string
  const fullAddress = `${address}, ${city}, ${state}${zipCode ? ` ${zipCode}` : ""}`;
  const params = new URLSearchParams({ address: fullAddress });

  const res = await fetch(`https://api.rentcast.io/v1/properties?${params.toString()}`, {
    headers: {
      "Accept": "application/json",
      "X-Api-Key": apiKey,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`RentCast API returned ${res.status}: ${text}`);
    return null;
  }

  const data = await res.json();

  // RentCast returns an array of matching properties
  const property = Array.isArray(data) ? data[0] : data;
  if (!property) return null;

  // Extract lot size (RentCast returns lotSize in sqft)
  const lotSizeSqft = property.lotSize || null;
  const lotSizeAcres = lotSizeSqft ? Math.round((lotSizeSqft / 43560) * 1000) / 1000 : null;

  // Build sale history from RentCast's sale data
  const saleHistory: SaleRecord[] = [];

  // Last sale is typically in the property record
  if (property.lastSaleDate && property.lastSalePrice) {
    saleHistory.push({
      date: property.lastSaleDate,
      price: property.lastSalePrice,
      type: "Closed Sale",
    });
  }

  // If RentCast provides a price history array
  if (Array.isArray(property.priceHistory)) {
    for (const sale of property.priceHistory) {
      if (sale.date && sale.price) {
        saleHistory.push({
          date: sale.date,
          price: sale.price,
          type: sale.event || "Sale",
        });
      }
    }
  }

  // If RentCast provides saleHistory directly
  if (Array.isArray(property.saleHistory)) {
    for (const sale of property.saleHistory) {
      if (sale.saleDate && sale.salePrice) {
        saleHistory.push({
          date: sale.saleDate,
          price: sale.salePrice,
          buyer: sale.buyerName,
          seller: sale.sellerName,
          type: sale.documentType || "Deed Transfer",
        });
      }
    }
  }

  // Deduplicate by date+price
  const seen = new Set<string>();
  const uniqueHistory = saleHistory.filter(s => {
    const key = `${s.date}|${s.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date descending (most recent first)
  uniqueHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    success: true,
    source: "rentcast",
    lotSizeAcres,
    lotSizeSqft,
    saleHistory: uniqueHistory,
    propertyDetails: {
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFeet: property.squareFeet,
      yearBuilt: property.yearBuilt,
      propertyType: property.propertyType,
      lastSaleDate: property.lastSaleDate,
      lastSalePrice: property.lastSalePrice,
    },
  };
}

/**
 * Estimate property records using OpenAI when RentCast is unavailable.
 * Clearly marked as AI estimates.
 */
async function estimateFromOpenAI(
  address: string,
  city: string,
  state: string,
  zipCode?: string,
  propertyType?: string
): Promise<PropertyRecordsResponse | null> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a real estate data analyst. You do NOT have access to MLS, county assessor databases, or live public records. Provide conservative ESTIMATES based on your training data about typical lot sizes and property values for the given location.

RULES:
- Lot size estimates should be based on typical lot sizes for the property type and area.
- Sale history should only include 1-2 entries representing what a TYPICAL property at this location might have sold for. Clearly mark these as estimates.
- Be conservative. Underestimates are better than overestimates.
- Sale dates should be plausible (not in the future).`,
      },
      {
        role: "user",
        content: `Estimate the lot size and likely sale history for:

Address: ${address}, ${city}, ${state}${zipCode ? ` ${zipCode}` : ""}
Property Type: ${propertyType || "residential"}

Return ONLY valid JSON:
{
  "lotSizeAcres": <number or null>,
  "lotSizeSqft": <number or null>,
  "saleHistory": [
    { "date": "YYYY-MM-DD", "price": <number>, "type": "Estimated Sale" }
  ]
}

Provide 1-3 estimated historical sale records with realistic prices for this area. Use dates within the last 10 years.`,
      },
    ],
    max_tokens: 800,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content);

  return {
    success: true,
    source: "openai",
    lotSizeAcres: parsed.lotSizeAcres || null,
    lotSizeSqft: parsed.lotSizeSqft || null,
    saleHistory: (parsed.saleHistory || []).map((s: { date: string; price: number; type?: string }) => ({
      ...s,
      type: s.type || "AI Estimate",
    })),
    disclaimer: "These are AI-generated estimates, not actual public records. Add a RENTCAST_API_KEY for real county assessor and deed data.",
  };
}
