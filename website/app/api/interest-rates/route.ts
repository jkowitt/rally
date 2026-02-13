import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/interest-rates
 * Fetches real-time interest rates from multiple sources:
 *   1. FRED API (Federal Reserve Economic Data) - gold standard
 *   2. OpenAI estimation (uses OPENAI_API_KEY)
 *   3. Hardcoded fallback with reasonable current estimates
 *
 * Returns: conventional30, conventional15, commercial, bridge, sba504,
 *          fedFundsRate, prime, treasury10yr, lastUpdated, source
 *
 * Caches results server-side for 1 hour to avoid rate-limiting.
 */

interface RateData {
  conventional30: number;
  conventional15: number;
  commercial: number;
  bridge: number;
  sba504: number;
  fedFundsRate: number | null;
  prime: number | null;
  treasury10yr: number | null;
  lastUpdated: string;
  source: string;
}

// Simple server-side cache (survives across requests within the same process)
let cachedRates: RateData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  try {
    // Return cached rates if still fresh
    if (cachedRates && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      return NextResponse.json({
        success: true,
        ...cachedRates,
        cached: true,
      });
    }

    let rates: RateData | null = null;

    // Layer 1: Try FRED API (Federal Reserve Economic Data)
    if (process.env.FRED_API_KEY) {
      rates = await fetchFromFRED(process.env.FRED_API_KEY);
    }

    // Layer 2: Try OpenAI estimation
    if (!rates && process.env.OPENAI_API_KEY) {
      rates = await fetchFromOpenAI(process.env.OPENAI_API_KEY);
    }

    // Layer 3: Hardcoded fallback
    if (!rates) {
      rates = getFallbackRates();
    }

    // Cache the result
    cachedRates = rates;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      success: true,
      ...rates,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching interest rates:', error);

    // If we have stale cache, return it rather than failing
    if (cachedRates) {
      return NextResponse.json({
        success: true,
        ...cachedRates,
        cached: true,
        stale: true,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch interest rates', ...getFallbackRates() },
      { status: 200 } // Still 200 so the client can use fallback data
    );
  }
}

/**
 * Fetch mortgage rates from the FRED API (Federal Reserve Economic Data).
 * Free API key from https://fred.stlouisfed.org/docs/api/api_key.html
 *
 * Series used:
 *   MORTGAGE30US - 30-Year Fixed Rate Mortgage Average (Freddie Mac PMMS)
 *   MORTGAGE15US - 15-Year Fixed Rate Mortgage Average
 *   DFF          - Federal Funds Effective Rate
 *   DPRIME       - Bank Prime Loan Rate
 *   DGS10        - 10-Year Treasury Constant Maturity Rate
 */
async function fetchFromFRED(apiKey: string): Promise<RateData | null> {
  try {
    const seriesIds = ['MORTGAGE30US', 'MORTGAGE15US', 'DFF', 'DPRIME', 'DGS10'];

    const results = await Promise.allSettled(
      seriesIds.map(async (id) => {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`FRED ${id}: ${res.status}`);
        const json = await res.json();
        // Find the most recent non-"." observation
        const obs = json.observations?.find((o: { value: string }) => o.value !== '.');
        return { id, value: obs ? parseFloat(obs.value) : null, date: obs?.date || null };
      })
    );

    const data: Record<string, { value: number | null; date: string | null }> = {};
    let latestDate = '';

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.value !== null) {
        data[result.value.id] = { value: result.value.value, date: result.value.date };
        if (result.value.date && result.value.date > latestDate) {
          latestDate = result.value.date;
        }
      }
    }

    const mortgage30 = data['MORTGAGE30US']?.value;
    const mortgage15 = data['MORTGAGE15US']?.value;

    // Need at least the 30-year rate to consider this a success
    if (!mortgage30) return null;

    const fedFunds = data['DFF']?.value ?? null;
    const prime = data['DPRIME']?.value ?? null;
    const treasury10yr = data['DGS10']?.value ?? null;

    // Derive commercial and bridge rates from base rates + typical spreads
    // Commercial: typically 150-250bps above 10-year Treasury, or ~50-100bps above 30yr residential
    const commercial = treasury10yr
      ? Math.round((treasury10yr + 2.75) * 100) / 100
      : Math.round((mortgage30 + 0.75) * 100) / 100;

    // Bridge: typically 300-400bps above prime, or ~250-350bps above 30yr
    const bridge = prime
      ? Math.round((prime + 3.25) * 100) / 100
      : Math.round((mortgage30 + 3.0) * 100) / 100;

    // SBA 504: typically tied to 10-year Treasury + ~200-275bps
    const sba504 = treasury10yr
      ? Math.round((treasury10yr + 2.40) * 100) / 100
      : Math.round((mortgage30 - 0.25) * 100) / 100;

    return {
      conventional30: mortgage30,
      conventional15: mortgage15 || Math.round((mortgage30 - 0.60) * 100) / 100,
      commercial,
      bridge,
      sba504,
      fedFundsRate: fedFunds,
      prime,
      treasury10yr,
      lastUpdated: latestDate || new Date().toISOString().split('T')[0],
      source: 'FRED (Federal Reserve)',
    };
  } catch (error) {
    console.error('FRED API fetch failed:', error);
    return null;
  }
}

/**
 * Use OpenAI to estimate current mortgage rates.
 * Less precise than FRED but works without a FRED API key.
 */
async function fetchFromOpenAI(apiKey: string): Promise<RateData | null> {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });

    const today = new Date().toISOString().split('T')[0];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a financial data assistant. Provide your best estimate of current US mortgage and lending interest rates as of ${today}. Use your most recent training data. Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `What are the current US interest rates as of ${today}? Provide your best estimate for each:

1. conventional30: Average 30-year fixed mortgage rate (Freddie Mac PMMS)
2. conventional15: Average 15-year fixed mortgage rate
3. commercial: Average commercial real estate loan rate
4. bridge: Average bridge/hard money loan rate
5. sba504: Average SBA 504 loan rate
6. fedFundsRate: Federal funds effective rate
7. prime: Bank prime rate
8. treasury10yr: 10-year Treasury yield

Return ONLY a JSON object with these keys and numeric values (percentages, e.g. 6.875 for 6.875%).`,
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    if (!parsed.conventional30 || typeof parsed.conventional30 !== 'number') return null;

    return {
      conventional30: parsed.conventional30,
      conventional15: parsed.conventional15 || parsed.conventional30 - 0.60,
      commercial: parsed.commercial || parsed.conventional30 + 0.75,
      bridge: parsed.bridge || parsed.conventional30 + 3.0,
      sba504: parsed.sba504 || parsed.conventional30 - 0.25,
      fedFundsRate: parsed.fedFundsRate ?? null,
      prime: parsed.prime ?? null,
      treasury10yr: parsed.treasury10yr ?? null,
      lastUpdated: today,
      source: 'AI estimate',
    };
  } catch (error) {
    console.error('OpenAI rate estimation failed:', error);
    return null;
  }
}

/**
 * Hardcoded fallback rates. Only used when both FRED and OpenAI are unavailable.
 */
function getFallbackRates(): RateData {
  return {
    conventional30: 6.875,
    conventional15: 6.125,
    commercial: 7.50,
    bridge: 10.25,
    sba504: 6.75,
    fedFundsRate: 4.33,
    prime: 7.50,
    treasury10yr: 4.25,
    lastUpdated: new Date().toISOString().split('T')[0],
    source: 'fallback estimates',
  };
}
