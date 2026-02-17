import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

// Compute verified fan level from stats
function computeVerifiedLevel(eventsAttended: number, correctPredictions: number, totalPredictions: number): string {
  const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  if (eventsAttended >= 250 && accuracy >= 0.7) return 'LEGEND';
  if (eventsAttended >= 100 && accuracy >= 0.6) return 'SUPERFAN';
  if (eventsAttended >= 25) return 'DEDICATED';
  if (eventsAttended >= 5) return 'CASUAL';
  return 'ROOKIE';
}

// GET /fan-profile/me — Get current user's full fan identity
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const profile = await prisma.fanProfile.findUnique({
      where: { userId },
      include: { user: { select: { name: true, handle: true, tier: true, points: true, favoriteSchool: true, favoriteSports: true, createdAt: true } } },
    });

    if (!profile) {
      // Auto-create profile if it doesn't exist
      const newProfile = await prisma.fanProfile.create({
        data: { userId },
        include: { user: { select: { name: true, handle: true, tier: true, points: true, favoriteSchool: true, favoriteSports: true, createdAt: true } } },
      });
      return res.json(newProfile);
    }

    res.json(profile);
  } catch (err) {
    console.error('Fan profile fetch error:', err);
    res.status(500).json({ error: 'Failed to load fan profile' });
  }
});

// GET /fan-profile/:handle — Get a public fan profile by handle
router.get('/by-handle/:handle', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.rallyUser.findUnique({
      where: { handle: req.params.handle as string },
      select: { id: true, name: true, handle: true, tier: true, points: true, favoriteSchool: true, favoriteSports: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Fan not found' });
    }

    const profile = await prisma.fanProfile.findUnique({ where: { userId: user.id } });

    if (!profile || !profile.isPublic) {
      return res.status(404).json({ error: 'Profile is private' });
    }

    // Get milestones
    const milestones = await prisma.fanMilestone.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: 'desc' },
      take: 20,
    });

    // Get crew memberships
    const crewMemberships = await prisma.crewMember.findMany({
      where: { userId: user.id },
      include: { crew: { select: { id: true, name: true, slug: true, avatarEmoji: true, color: true, memberCount: true, totalPoints: true } } },
    });

    res.json({
      user,
      profile,
      milestones,
      crews: crewMemberships.map(m => ({ ...m.crew, role: m.role })),
    });
  } catch (err) {
    console.error('Public profile fetch error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// PUT /fan-profile/me — Update profile settings (tagline, visibility, slug)
router.put('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { tagline, isPublic, profileSlug } = req.body;

    const updateData: Record<string, unknown> = {};
    if (tagline !== undefined) updateData.tagline = tagline;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (profileSlug !== undefined) {
      // Validate slug format
      if (profileSlug && !/^[a-z0-9_-]{3,30}$/.test(profileSlug)) {
        return res.status(400).json({ error: 'Slug must be 3-30 chars, lowercase alphanumeric, hyphens, or underscores' });
      }
      updateData.profileSlug = profileSlug || null;
    }

    const profile = await prisma.fanProfile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });

    res.json(profile);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That profile slug is already taken' });
    }
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /fan-profile/refresh — Recompute stats from points history
router.post('/refresh', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Aggregate stats from points history
    const entries = await prisma.pointsEntry.findMany({
      where: { userId },
      select: { activationName: true, eventId: true, event: { select: { sport: true, venue: true } } },
    });

    let totalCheckins = 0;
    let totalPredictions = 0;
    let totalTrivia = 0;
    let totalPhotos = 0;
    let totalPolls = 0;
    let totalNoiseMeter = 0;
    const eventIds = new Set<string>();
    const venues = new Set<string>();
    const sportCounts: Record<string, number> = {};

    for (const entry of entries) {
      const name = entry.activationName.toLowerCase();
      if (name.includes('check') || name.includes('checkin')) totalCheckins++;
      else if (name.includes('predict')) totalPredictions++;
      else if (name.includes('trivia')) totalTrivia++;
      else if (name.includes('photo')) totalPhotos++;
      else if (name.includes('poll')) totalPolls++;
      else if (name.includes('noise')) totalNoiseMeter++;

      if (entry.eventId) eventIds.add(entry.eventId);
      if (entry.event?.venue) venues.add(entry.event.venue);
      if (entry.event?.sport) {
        sportCounts[entry.event.sport] = (sportCounts[entry.event.sport] || 0) + 1;
      }
    }

    const eventsAttended = eventIds.size;
    const uniqueVenues = venues.size;
    const verifiedLevel = computeVerifiedLevel(eventsAttended, 0, totalPredictions);

    const profile = await prisma.fanProfile.upsert({
      where: { userId },
      update: {
        totalCheckins,
        totalPredictions,
        totalTrivia,
        totalPhotos,
        totalPolls,
        totalNoiseMeter,
        eventsAttended,
        uniqueVenues,
        sportBreakdown: sportCounts,
        verifiedLevel: verifiedLevel as any,
      },
      create: {
        userId,
        totalCheckins,
        totalPredictions,
        totalTrivia,
        totalPhotos,
        totalPolls,
        totalNoiseMeter,
        eventsAttended,
        uniqueVenues,
        sportBreakdown: sportCounts,
        verifiedLevel: verifiedLevel as any,
      },
    });

    // Check and award milestones
    await checkAndAwardMilestones(userId, profile);

    res.json(profile);
  } catch (err) {
    console.error('Profile refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh profile' });
  }
});

// GET /fan-profile/leaderboard — Top fans by points
router.get('/leaderboard', optionalAuth, async (_req, res) => {
  try {
    const topFans = await prisma.rallyUser.findMany({
      orderBy: { points: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        handle: true,
        points: true,
        tier: true,
        favoriteSchool: true,
        fanProfile: {
          select: {
            eventsAttended: true,
            currentStreak: true,
            verifiedLevel: true,
            tagline: true,
          },
        },
      },
    });

    res.json({ leaderboard: topFans });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// HEAD-TO-HEAD: GET /fan-profile/compare/:handleA/:handleB
router.get('/compare/:handleA/:handleB', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const handleA = req.params.handleA as string;
    const handleB = req.params.handleB as string;

    const [userA, userB] = await Promise.all([
      prisma.rallyUser.findUnique({
        where: { handle: handleA },
        select: { id: true, name: true, handle: true, points: true, tier: true, favoriteSchool: true, createdAt: true },
      }),
      prisma.rallyUser.findUnique({
        where: { handle: handleB },
        select: { id: true, name: true, handle: true, points: true, tier: true, favoriteSchool: true, createdAt: true },
      }),
    ]);

    if (!userA || !userB) {
      return res.status(404).json({ error: 'One or both fans not found' });
    }

    const [profileA, profileB, milestonesA, milestonesB] = await Promise.all([
      prisma.fanProfile.findUnique({ where: { userId: userA.id } }),
      prisma.fanProfile.findUnique({ where: { userId: userB.id } }),
      prisma.fanMilestone.count({ where: { userId: userA.id } }),
      prisma.fanMilestone.count({ where: { userId: userB.id } }),
    ]);

    const comparison = {
      fanA: {
        ...userA,
        profile: profileA,
        milestoneCount: milestonesA,
      },
      fanB: {
        ...userB,
        profile: profileB,
        milestoneCount: milestonesB,
      },
      categories: [
        { label: 'Total Points', a: userA.points || 0, b: userB.points || 0 },
        { label: 'Events Attended', a: profileA?.eventsAttended || 0, b: profileB?.eventsAttended || 0 },
        { label: 'Check-ins', a: profileA?.totalCheckins || 0, b: profileB?.totalCheckins || 0 },
        { label: 'Predictions', a: profileA?.totalPredictions || 0, b: profileB?.totalPredictions || 0 },
        { label: 'Current Streak', a: profileA?.currentStreak || 0, b: profileB?.currentStreak || 0 },
        { label: 'Longest Streak', a: profileA?.longestStreak || 0, b: profileB?.longestStreak || 0 },
        { label: 'Unique Venues', a: profileA?.uniqueVenues || 0, b: profileB?.uniqueVenues || 0 },
        { label: 'Badges Earned', a: milestonesA, b: milestonesB },
      ],
      winner: calculateWinner(userA, profileA, milestonesA, userB, profileB, milestonesB),
    };

    res.json(comparison);
  } catch (err) {
    console.error('Comparison error:', err);
    res.status(500).json({ error: 'Failed to compare fans' });
  }
});

function calculateWinner(
  userA: { points: number | null },
  profileA: { eventsAttended: number; currentStreak: number } | null,
  milestonesA: number,
  userB: { points: number | null },
  profileB: { eventsAttended: number; currentStreak: number } | null,
  milestonesB: number,
): 'A' | 'B' | 'TIE' {
  let scoreA = 0;
  let scoreB = 0;

  // Points (weight 3)
  if ((userA.points || 0) > (userB.points || 0)) scoreA += 3;
  else if ((userB.points || 0) > (userA.points || 0)) scoreB += 3;

  // Events (weight 2)
  if ((profileA?.eventsAttended || 0) > (profileB?.eventsAttended || 0)) scoreA += 2;
  else if ((profileB?.eventsAttended || 0) > (profileA?.eventsAttended || 0)) scoreB += 2;

  // Streak (weight 2)
  if ((profileA?.currentStreak || 0) > (profileB?.currentStreak || 0)) scoreA += 2;
  else if ((profileB?.currentStreak || 0) > (profileA?.currentStreak || 0)) scoreB += 2;

  // Milestones (weight 1)
  if (milestonesA > milestonesB) scoreA += 1;
  else if (milestonesB > milestonesA) scoreB += 1;

  if (scoreA > scoreB) return 'A';
  if (scoreB > scoreA) return 'B';
  return 'TIE';
}

async function checkAndAwardMilestones(userId: string, profile: any) {
  const existing = await prisma.fanMilestone.findMany({
    where: { userId },
    select: { type: true },
  });
  const earned = new Set(existing.map((m: { type: string }) => m.type));

  const toAward: Array<{ type: string; title: string; description: string; icon: string; stat: string }> = [];

  // Check-in milestones
  if (profile.totalCheckins >= 1 && !earned.has('FIRST_CHECKIN')) {
    toAward.push({ type: 'FIRST_CHECKIN', title: 'First Check-in', description: 'Checked in to your first event', icon: '📍', stat: '1 check-in' });
  }

  // Events milestones
  const eventMilestones = [
    { threshold: 5, type: 'EVENTS_5', title: '5 Events', icon: '🎟️' },
    { threshold: 25, type: 'EVENTS_25', title: '25 Events', icon: '🏟️' },
    { threshold: 50, type: 'EVENTS_50', title: '50 Events', icon: '🔥' },
    { threshold: 100, type: 'EVENTS_100', title: '100 Events', icon: '💯' },
    { threshold: 250, type: 'EVENTS_250', title: '250 Events', icon: '🏆' },
  ];
  for (const m of eventMilestones) {
    if (profile.eventsAttended >= m.threshold && !earned.has(m.type)) {
      toAward.push({ type: m.type, title: m.title, description: `Attended ${m.threshold} events`, icon: m.icon, stat: `${profile.eventsAttended} events` });
    }
  }

  // Streak milestones
  const streakMilestones = [
    { threshold: 5, type: 'CHECKIN_STREAK_5', title: '5-Game Streak', icon: '🔥' },
    { threshold: 10, type: 'CHECKIN_STREAK_10', title: '10-Game Streak', icon: '⚡' },
    { threshold: 25, type: 'CHECKIN_STREAK_25', title: '25-Game Streak', icon: '💎' },
    { threshold: 50, type: 'CHECKIN_STREAK_50', title: '50-Game Streak', icon: '👑' },
  ];
  for (const m of streakMilestones) {
    if (profile.longestStreak >= m.threshold && !earned.has(m.type)) {
      toAward.push({ type: m.type, title: m.title, description: `Maintained a ${m.threshold}-game check-in streak`, icon: m.icon, stat: `${profile.longestStreak} streak` });
    }
  }

  // Venue collector
  const venueMilestones = [
    { threshold: 5, type: 'VENUE_COLLECTOR_5', title: '5 Venues', icon: '🗺️' },
    { threshold: 10, type: 'VENUE_COLLECTOR_10', title: '10 Venues', icon: '🌎' },
    { threshold: 25, type: 'VENUE_COLLECTOR_25', title: '25 Venues', icon: '✈️' },
  ];
  for (const m of venueMilestones) {
    if (profile.uniqueVenues >= m.threshold && !earned.has(m.type)) {
      toAward.push({ type: m.type, title: m.title, description: `Visited ${m.threshold} unique venues`, icon: m.icon, stat: `${profile.uniqueVenues} venues` });
    }
  }

  // Multi-sport
  if (profile.sportBreakdown) {
    const sportsCount = Object.keys(profile.sportBreakdown).length;
    if (sportsCount >= 3 && !earned.has('MULTI_SPORT')) {
      toAward.push({ type: 'MULTI_SPORT', title: 'Multi-Sport Fan', description: 'Attended events in 3+ sports', icon: '🏅', stat: `${sportsCount} sports` });
    }
  }

  // Verified level milestones
  if (profile.verifiedLevel === 'SUPERFAN' && !earned.has('SUPERFAN_VERIFIED')) {
    toAward.push({ type: 'SUPERFAN_VERIFIED', title: 'Verified Superfan', description: 'Reached Superfan verification level', icon: '⭐', stat: 'Superfan' });
  }
  if (profile.verifiedLevel === 'LEGEND' && !earned.has('LEGEND_VERIFIED')) {
    toAward.push({ type: 'LEGEND_VERIFIED', title: 'Verified Legend', description: 'Reached Legend verification level', icon: '🌟', stat: 'Legend' });
  }

  // Bulk create new milestones
  if (toAward.length > 0) {
    await prisma.fanMilestone.createMany({
      data: toAward.map(m => ({
        userId,
        type: m.type as any,
        title: m.title,
        description: m.description,
        icon: m.icon,
        stat: m.stat,
      })),
    });
  }

  return toAward;
}

export default router;
