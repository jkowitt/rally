import prisma from '../lib/prisma';

// ─────────────────────────────────────────────
// ESPN API Configuration
// ─────────────────────────────────────────────
// ESPN exposes public scoreboard/schedule endpoints per sport.
// We fetch upcoming games, map them into Rally's Event model, and upsert.

interface ESPNEvent {
  id: string;
  name: string;
  date: string; // ISO date
  status: { type: { state: string } }; // pre, in, post
  competitions: Array<{
    venue?: { fullName?: string; address?: { city?: string; state?: string } };
    competitors: Array<{
      homeAway: 'home' | 'away';
      team: { displayName: string; abbreviation: string };
    }>;
  }>;
}

interface ESPNResponse {
  events: ESPNEvent[];
}

interface LeagueConfig {
  league: string;
  sport: string;
  espnPath: string;       // e.g. "football/nfl"
  teamPrefix: string;     // e.g. "nfl" → used for school ID lookup
  rallyLabel: string;     // e.g. "NFL"
}

const LEAGUE_CONFIGS: LeagueConfig[] = [
  // Pro leagues
  { league: 'MLB',  sport: 'Baseball',   espnPath: 'baseball/mlb',       teamPrefix: 'mlb',  rallyLabel: 'MLB' },
  { league: 'NBA',  sport: 'Basketball', espnPath: 'basketball/nba',     teamPrefix: 'nba',  rallyLabel: 'NBA' },
  { league: 'NHL',  sport: 'Hockey',     espnPath: 'hockey/nhl',         teamPrefix: 'nhl',  rallyLabel: 'NHL' },
  { league: 'WNBA', sport: 'Basketball', espnPath: 'basketball/wnba',    teamPrefix: 'wnba', rallyLabel: 'WNBA' },
  { league: 'MLS',  sport: 'Soccer',     espnPath: 'soccer/usa.1',       teamPrefix: 'mls',  rallyLabel: 'MLS' },
  { league: 'NFL',  sport: 'Football',   espnPath: 'football/nfl',       teamPrefix: 'nfl',  rallyLabel: 'NFL' },
  // College
  { league: 'NCAAF', sport: 'Football',   espnPath: 'football/college-football', teamPrefix: 'sch', rallyLabel: 'College Football' },
  { league: 'NCAAM', sport: 'Basketball', espnPath: 'basketball/mens-college-basketball', teamPrefix: 'sch', rallyLabel: 'College Basketball' },
];

// Map ESPN team abbreviations → Rally school IDs
// Built lazily from the database on first run
let teamIdCache: Map<string, string> | null = null;

async function getTeamIdMap(): Promise<Map<string, string>> {
  if (teamIdCache) return teamIdCache;

  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  const map = new Map<string, string>();

  for (const school of schools) {
    // Index by id directly (e.g. "nba-lakers") and by lowercase name
    map.set(school.id, school.id);
    map.set(school.name.toLowerCase(), school.id);
  }

  teamIdCache = map;
  return map;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Try to resolve an ESPN team name to a Rally school ID.
 * Attempts: prefix-slug, name lookup, prefix-abbreviation
 */
function resolveTeamId(
  teamName: string,
  abbreviation: string,
  prefix: string,
  teamMap: Map<string, string>,
): string | null {
  // 1) prefix-slug: "nba-los-angeles-lakers"
  const slug = `${prefix}-${slugify(teamName)}`;
  if (teamMap.has(slug)) return teamMap.get(slug)!;

  // 2) Exact name match
  if (teamMap.has(teamName.toLowerCase())) return teamMap.get(teamName.toLowerCase())!;

  // 3) prefix-abbreviation: "nba-lal"
  const abbrKey = `${prefix}-${abbreviation.toLowerCase()}`;
  if (teamMap.has(abbrKey)) return teamMap.get(abbrKey)!;

  // 4) Try last word of name as slug: "Los Angeles Lakers" → "nba-lakers"
  const parts = teamName.split(' ');
  if (parts.length > 1) {
    const lastWord = `${prefix}-${slugify(parts[parts.length - 1])}`;
    if (teamMap.has(lastWord)) return teamMap.get(lastWord)!;
  }

  return null;
}

function mapESPNStatus(state: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' {
  switch (state) {
    case 'in': return 'LIVE';
    case 'post': return 'COMPLETED';
    default: return 'UPCOMING';
  }
}

// ─────────────────────────────────────────────
// Core: fetch one league's schedule from ESPN
// ─────────────────────────────────────────────
async function fetchLeagueEvents(config: LeagueConfig, datesParam: string): Promise<number> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${config.espnPath}/scoreboard?dates=${datesParam}&limit=100`;
  let data: ESPNResponse;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Rally-EventUpdater/1.0' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      console.warn(`[EventUpdater] ESPN ${config.league} returned ${resp.status}`);
      return 0;
    }
    data = await resp.json() as ESPNResponse;
  } catch (err) {
    console.warn(`[EventUpdater] Failed to fetch ${config.league}:`, err);
    return 0;
  }

  if (!data.events?.length) return 0;

  const teamMap = await getTeamIdMap();
  let upserted = 0;

  for (const evt of data.events) {
    const comp = evt.competitions?.[0];
    if (!comp) continue;

    const homeComp = comp.competitors.find(c => c.homeAway === 'home');
    const awayComp = comp.competitors.find(c => c.homeAway === 'away');
    if (!homeComp) continue;

    const homeId = resolveTeamId(homeComp.team.displayName, homeComp.team.abbreviation, config.teamPrefix, teamMap);
    if (!homeId) continue; // Skip if we can't map the home team

    const awayId = awayComp
      ? resolveTeamId(awayComp.team.displayName, awayComp.team.abbreviation, config.teamPrefix, teamMap)
      : null;

    const venue = comp.venue?.fullName || null;
    const city = comp.venue?.address
      ? [comp.venue.address.city, comp.venue.address.state].filter(Boolean).join(', ')
      : null;

    const eventId = `espn-${config.league.toLowerCase()}-${evt.id}`;
    const status = mapESPNStatus(evt.status.type.state);

    try {
      await prisma.event.upsert({
        where: { id: eventId },
        update: {
          title: evt.name,
          dateTime: new Date(evt.date),
          status,
          venue,
          city,
          homeTeam: homeComp.team.displayName,
          awayTeam: awayComp?.team.displayName || null,
          awaySchoolId: awayId,
        },
        create: {
          id: eventId,
          title: evt.name,
          sport: config.sport,
          homeSchoolId: homeId,
          homeTeam: homeComp.team.displayName,
          awaySchoolId: awayId,
          awayTeam: awayComp?.team.displayName || null,
          venue,
          city,
          dateTime: new Date(evt.date),
          status,
        },
      });
      upserted++;
    } catch (err) {
      // Foreign key miss, schema mismatch, etc. — skip and continue
      console.warn(`[EventUpdater] Upsert failed for ${eventId}:`, err);
    }
  }

  return upserted;
}

// ─────────────────────────────────────────────
// Build date range strings for ESPN (YYYYMMDD)
// ─────────────────────────────────────────────
function dateRangeStr(start: Date, days: number): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return `${fmt(start)}-${fmt(end)}`;
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export interface UpdateResult {
  startedAt: string;
  finishedAt: string;
  leagues: Record<string, number>;
  totalUpserted: number;
  errors: string[];
}

/**
 * Fetch upcoming events from ESPN for all configured leagues
 * and upsert them into the Rally database.
 *
 * @param lookAheadDays How many days into the future to fetch (default 10)
 */
export async function updateAllEvents(lookAheadDays = 10): Promise<UpdateResult> {
  const startedAt = new Date().toISOString();
  console.log(`[EventUpdater] Starting update — looking ahead ${lookAheadDays} days`);

  // Reset team cache so we pick up any new teams
  teamIdCache = null;

  const now = new Date();
  const dateRange = dateRangeStr(now, lookAheadDays);
  const leagues: Record<string, number> = {};
  const errors: string[] = [];
  let totalUpserted = 0;

  for (const config of LEAGUE_CONFIGS) {
    try {
      const count = await fetchLeagueEvents(config, dateRange);
      leagues[config.league] = count;
      totalUpserted += count;
      console.log(`[EventUpdater] ${config.league}: ${count} events upserted`);
    } catch (err) {
      const msg = `${config.league}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error(`[EventUpdater] ${msg}`);
    }
  }

  // Mark past events as COMPLETED if still UPCOMING
  try {
    const staleCount = await prisma.event.updateMany({
      where: {
        status: 'UPCOMING',
        dateTime: { lt: new Date(Date.now() - 4 * 60 * 60 * 1000) }, // 4h after start
      },
      data: { status: 'COMPLETED' },
    });
    if (staleCount.count > 0) {
      console.log(`[EventUpdater] Marked ${staleCount.count} past events as COMPLETED`);
    }
  } catch (err) {
    errors.push(`status-cleanup: ${err instanceof Error ? err.message : String(err)}`);
  }

  const finishedAt = new Date().toISOString();
  console.log(`[EventUpdater] Done — ${totalUpserted} total events upserted across ${Object.keys(leagues).length} leagues`);

  return { startedAt, finishedAt, leagues, totalUpserted, errors };
}
