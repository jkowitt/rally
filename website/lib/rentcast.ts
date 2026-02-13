/**
 * RentCast API utility for fetching real comparable sales in an area.
 *
 * Uses the v1/sale-listings endpoint which supports:
 *   - Radius-based search (0.5–3 miles)
 *   - Date range filtering (saleDateRange in days)
 *   - Property type filtering
 *   - Pagination (limit/offset)
 *
 * Docs: https://developers.rentcast.io/reference/sale-listings
 */

const RENTCAST_BASE = "https://api.rentcast.io/v1";

export interface RentCastComp {
  id: string;
  address: string;
  formattedAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  distance: number | null;       // miles from subject
  pricePerSqft: number | null;
  daysOnMarket: number | null;
  status: string | null;
  source: "rentcast";
}

export interface RealCompsResult {
  comps: RentCastComp[];
  radiusUsed: number;           // miles
  lookbackDays: number;
  totalFound: number;
  expanded: boolean;            // whether radius was expanded to find enough comps
}

/**
 * Map user-friendly property types to RentCast API property types.
 * RentCast uses: Single Family, Multi-Family, Condo, Townhouse, etc.
 */
function mapPropertyType(type: string): string | undefined {
  const map: Record<string, string> = {
    "single-family": "Single Family",
    "multifamily": "Multi-Family",
    "commercial": "Commercial",
    "industrial": "Industrial",
    "retail": "Commercial",
    "office": "Commercial",
    "mixed-use": "Multi-Family",
    "land": "Land",
    "hospitality": "Commercial",
    "self-storage": "Commercial",
    "condo": "Condo",
    "townhouse": "Townhouse",
  };
  return map[type.toLowerCase()] || undefined;
}

/**
 * Convert lookback period label to days.
 */
export function lookbackToDays(period: "6" | "9" | "12"): number {
  switch (period) {
    case "6": return 183;
    case "9": return 274;
    case "12": return 365;
    default: return 183;
  }
}

/**
 * Fetch recent sales from RentCast's sale-listings endpoint.
 *
 * Strategy:
 *   1. Search at the initial radius (default 0.5 mi)
 *   2. If fewer than `minComps` results, expand to 1 mile
 *   3. Return whatever we find (caller decides if it's enough)
 */
export async function fetchRecentSales(params: {
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  lookbackMonths?: "6" | "9" | "12";
  limit?: number;
  minComps?: number;
}): Promise<RealCompsResult | null> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;

  const {
    address, city, state, zipCode,
    latitude, longitude,
    propertyType,
    lookbackMonths = "6",
    limit = 6,
    minComps = 4,
  } = params;

  const lookbackDays = lookbackToDays(lookbackMonths);
  const rcPropertyType = propertyType ? mapPropertyType(propertyType) : undefined;

  // Try narrow radius first, then expand incrementally
  const radii = [0.5, 1.0, 1.5, 2.0, 3.0];
  let allComps: RentCastComp[] = [];
  let radiusUsed = radii[0];
  let expanded = false;

  for (const radius of radii) {
    radiusUsed = radius;

    const query = new URLSearchParams();

    // Use coordinates if available (more accurate), otherwise address
    if (latitude && longitude) {
      query.set("latitude", latitude.toString());
      query.set("longitude", longitude.toString());
    } else {
      const fullAddress = `${address}, ${city}, ${state}${zipCode ? ` ${zipCode}` : ""}`;
      query.set("address", fullAddress);
    }

    query.set("radius", radius.toString());
    query.set("saleDateRange", lookbackDays.toString());
    query.set("limit", limit.toString());
    query.set("status", "Sold");

    if (rcPropertyType) {
      query.set("propertyType", rcPropertyType);
    }

    try {
      const res = await fetch(`${RENTCAST_BASE}/sale-listings?${query.toString()}`, {
        headers: {
          "Accept": "application/json",
          "X-Api-Key": apiKey,
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`RentCast sale-listings returned ${res.status}: ${text}`);
        // If this radius failed, try next
        continue;
      }

      const data = await res.json();
      const listings = Array.isArray(data) ? data : [];

      allComps = listings
        .filter((p: Record<string, unknown>) => p.lastSalePrice && p.lastSaleDate)
        .map((p: Record<string, unknown>, i: number): RentCastComp => {
          const sqft = (p.squareFeet as number) || null;
          const price = (p.lastSalePrice as number) || 0;
          return {
            id: `rc_${i}_${Date.now()}`,
            address: (p.addressLine1 as string) || (p.formattedAddress as string) || `Comp ${i + 1}`,
            formattedAddress: (p.formattedAddress as string) || `${p.addressLine1 || ""}, ${p.city || ""}, ${p.state || ""}`,
            city: (p.city as string) || city,
            state: (p.state as string) || state,
            zipCode: (p.zipCode as string) || zipCode || "",
            latitude: (p.latitude as number) || null,
            longitude: (p.longitude as number) || null,
            propertyType: (p.propertyType as string) || propertyType || "Unknown",
            bedrooms: (p.bedrooms as number) || null,
            bathrooms: (p.bathrooms as number) || null,
            squareFeet: sqft,
            lotSize: (p.lotSize as number) || null,
            yearBuilt: (p.yearBuilt as number) || null,
            lastSaleDate: (p.lastSaleDate as string) || null,
            lastSalePrice: price,
            distance: (p.distance as number) || null,
            pricePerSqft: sqft && price ? Math.round(price / sqft) : null,
            daysOnMarket: (p.daysOnMarket as number) || null,
            status: (p.status as string) || "Sold",
            source: "rentcast",
          };
        });

      // If we have enough comps, stop expanding
      if (allComps.length >= minComps) break;

      // Not enough — will try next radius
      expanded = true;
    } catch (err) {
      console.error(`RentCast sale-listings error at ${radius}mi:`, err);
      continue;
    }
  }

  if (allComps.length === 0) return null;

  // Sort by distance (closest first), then by recency
  allComps.sort((a, b) => {
    if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
    if (a.distance !== null) return -1;
    if (b.distance !== null) return 1;
    // Fallback: sort by sale date (most recent first)
    const dateA = a.lastSaleDate ? new Date(a.lastSaleDate).getTime() : 0;
    const dateB = b.lastSaleDate ? new Date(b.lastSaleDate).getTime() : 0;
    return dateB - dateA;
  });

  return {
    comps: allComps.slice(0, limit),
    radiusUsed,
    lookbackDays,
    totalFound: allComps.length,
    expanded,
  };
}
