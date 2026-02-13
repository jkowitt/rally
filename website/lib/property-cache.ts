/**
 * Property data cache backed by the PropertyCache database table.
 *
 * Every RentCast lookup and completed evaluation is persisted so that:
 *   1. Future users looking up the same address get instant results
 *      without consuming an API call or billing quota.
 *   2. Comp searches can draw from our own growing database of verified
 *      sales, reducing reliance on RentCast over time.
 *
 * Cache entries expire after 30 days for subject property records and
 * 90 days for area comps, after which a fresh RentCast pull is required.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const SUBJECT_TTL_DAYS = 30;
const COMP_TTL_DAYS = 90;

/** Normalize and hash an address for consistent lookups. */
export function hashAddress(address: string, city: string, state: string): string {
  const normalized = `${address}|${city}|${state}`
    .toLowerCase()
    .replace(/[^a-z0-9|]/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}

/** Look up a cached property record by address. Returns null if missing or expired. */
export async function getCachedRecord(address: string, city: string, state: string) {
  try {
    const hash = hashAddress(address, city, state);
    const cached = await prisma.propertyCache.findUnique({
      where: { addressHash: hash },
    });
    if (!cached) return null;
    if (new Date() > cached.expiresAt) return null; // Expired

    // Increment hit counter (fire-and-forget)
    prisma.propertyCache.update({
      where: { id: cached.id },
      data: { hitCount: { increment: 1 } },
    }).catch(() => {});

    return cached;
  } catch {
    // Table may not exist yet — graceful fallback
    return null;
  }
}

/** Store a property record in the cache. */
export async function cachePropertyRecord(data: {
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  lotSizeSqft?: number;
  latitude?: number;
  longitude?: number;
  lastSaleDate?: string;
  lastSalePrice?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saleHistory?: any;
  source: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData?: any;
  isComp?: boolean;
}) {
  try {
    const hash = hashAddress(data.address, data.city, data.state);
    const ttlDays = data.isComp ? COMP_TTL_DAYS : SUBJECT_TTL_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await prisma.propertyCache.upsert({
      where: { addressHash: hash },
      update: {
        propertyType: data.propertyType ?? undefined,
        bedrooms: data.bedrooms ?? undefined,
        bathrooms: data.bathrooms ?? undefined,
        squareFeet: data.squareFeet ?? undefined,
        yearBuilt: data.yearBuilt ?? undefined,
        lotSizeSqft: data.lotSizeSqft ?? undefined,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        lastSaleDate: data.lastSaleDate ?? undefined,
        lastSalePrice: data.lastSalePrice ?? undefined,
        saleHistory: data.saleHistory ?? undefined,
        source: data.source,
        rawData: data.rawData ?? undefined,
        isComp: data.isComp ?? false,
        fetchedAt: new Date(),
        expiresAt,
      },
      create: {
        addressHash: hash,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        propertyType: data.propertyType,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.squareFeet,
        yearBuilt: data.yearBuilt,
        lotSizeSqft: data.lotSizeSqft,
        latitude: data.latitude,
        longitude: data.longitude,
        lastSaleDate: data.lastSaleDate,
        lastSalePrice: data.lastSalePrice,
        saleHistory: data.saleHistory ?? undefined,
        source: data.source,
        rawData: data.rawData ?? undefined,
        isComp: data.isComp ?? false,
        expiresAt,
      },
    });
  } catch (err) {
    // Table may not exist yet — log and continue
    console.error("PropertyCache write error (table may not exist yet):", err);
  }
}

/**
 * Search the local cache for comps near a given location.
 * Returns cached property records within the specified city/state
 * that have sale data and aren't expired.
 */
export async function getLocalComps(params: {
  city: string;
  state: string;
  propertyType?: string;
  excludeAddress?: string;
  limit?: number;
}): Promise<Array<{
  address: string;
  city: string;
  state: string;
  zipCode: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  yearBuilt: number | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
}>> {
  try {
    const records = await prisma.propertyCache.findMany({
      where: {
        city: { equals: params.city, mode: "insensitive" as const },
        state: { equals: params.state, mode: "insensitive" as const },
        lastSalePrice: { not: null },
        lastSaleDate: { not: null },
        expiresAt: { gt: new Date() },
        propertyType: params.propertyType
          ? { equals: params.propertyType, mode: "insensitive" as const }
          : undefined,
        addressHash: params.excludeAddress
          ? { not: hashAddress(params.excludeAddress, params.city, params.state) }
          : undefined,
      },
      orderBy: { fetchedAt: "desc" },
      take: params.limit || 20,
      select: {
        address: true,
        city: true,
        state: true,
        zipCode: true,
        propertyType: true,
        bedrooms: true,
        bathrooms: true,
        squareFeet: true,
        yearBuilt: true,
        lastSaleDate: true,
        lastSalePrice: true,
        latitude: true,
        longitude: true,
        source: true,
      },
    });

    return records;
  } catch {
    return [];
  }
}

/**
 * Record an evaluation in the ActivityLog for the owner audit trail.
 * Tracks which functions were used and the results.
 */
export async function logEvaluation(params: {
  userId: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  propertyType: string;
  functionsUsed: {
    publicRecords: boolean;
    realComps: boolean;
    aiComps: boolean;
    marketTrends: boolean;
    imageAnalysis: boolean;
  };
  results: {
    estimatedValue?: number;
    confidence?: number;
    compsCount?: number;
    realCompsCount?: number;
    marketTemperature?: string;
  };
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: "evaluation_completed",
        entityType: "evaluation",
        entityId: `eval_${Date.now()}`,
        details: {
          address: params.address,
          city: params.city,
          state: params.state,
          zipCode: params.zipCode,
          propertyType: params.propertyType,
          functionsUsed: params.functionsUsed,
          results: params.results,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error("Failed to log evaluation:", err);
  }
}
