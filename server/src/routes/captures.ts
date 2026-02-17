import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import type { GameSignificance, MomentCategory } from '@prisma/client';

const router = Router();

// Multipliers
const SIGNIFICANCE_MULTIPLIER: Record<GameSignificance, number> = {
  REGULAR: 1, CONFERENCE: 1.5, RIVALRY: 2, POSTSEASON: 2.5, CHAMPIONSHIP: 3,
};
const MOMENT_MULTIPLIER: Record<MomentCategory, number> = {
  STANDARD: 1, SPONSORED: 2.5, EMOTIONAL: 2, HISTORIC: 4,
};
const RALLIES_PER_GAME = 12;
const BASE_CAPTURE_POINTS = 10;
const RALLY_VOTER_POINTS = 2; // points for casting a rally vote

function rallyBonusPoints(rallyCount: number): number {
  // Diminishing returns: 5 pts per rally up to 10, then 2 pts per rally up to 50, then 1 pt
  if (rallyCount <= 10) return rallyCount * 5;
  if (rallyCount <= 50) return 50 + (rallyCount - 10) * 2;
  return 50 + 80 + (rallyCount - 50);
}

// ─── POST /:eventId/capture — Post a photo capture ──────────────
router.post('/:eventId/capture', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = String(req.params.eventId);
    const { imageUrl, caption, momentType, isInStadium } = req.body;

    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

    // Verify event exists and is LIVE
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'LIVE') return res.status(400).json({ error: 'Captures only allowed during live events' });

    // Verify user is checked into this game's lobby
    const lobby = await prisma.gameLobby.findUnique({ where: { eventId } });
    if (lobby) {
      const presence = await prisma.lobbyPresence.findUnique({
        where: { lobbyId_userId: { lobbyId: lobby.id, userId: req.userId! } },
      });
      if (!presence || !presence.isActive) {
        return res.status(403).json({ error: 'You must be checked into this game to post captures' });
      }
    }

    // Calculate base points with multipliers
    const validMoment: MomentCategory = ['STANDARD', 'SPONSORED', 'EMOTIONAL', 'HISTORIC'].includes(momentType)
      ? momentType : 'STANDARD';
    const gameMult = SIGNIFICANCE_MULTIPLIER[event.significance as GameSignificance];
    const momentMult = MOMENT_MULTIPLIER[validMoment];
    const basePoints = Math.round(BASE_CAPTURE_POINTS * gameMult * momentMult);

    const capture = await prisma.gameCapture.create({
      data: {
        eventId,
        userId: req.userId!,
        imageUrl: String(imageUrl),
        caption: caption ? String(caption) : null,
        momentType: validMoment,
        isInStadium: isInStadium !== false,
        basePoints,
        totalPoints: basePoints,
      },
      include: {
        user: { select: { id: true, name: true, handle: true, tier: true } },
      },
    });

    // Award base points to the poster
    await prisma.pointsEntry.create({
      data: {
        userId: req.userId!,
        eventId,
        activationName: 'Rally Capture',
        points: basePoints,
        schoolId: event.homeSchoolId,
      },
    });
    await prisma.rallyUser.update({
      where: { id: req.userId! },
      data: { points: { increment: basePoints } },
    });

    return res.json({
      capture: {
        id: capture.id,
        imageUrl: capture.imageUrl,
        caption: capture.caption,
        momentType: capture.momentType,
        isInStadium: capture.isInStadium,
        basePoints: capture.basePoints,
        rallyCount: 0,
        totalPoints: capture.totalPoints,
        user: capture.user,
        createdAt: capture.createdAt.toISOString(),
      },
      pointsAwarded: basePoints,
    });
  } catch (err) {
    console.error('Capture error:', err);
    return res.status(500).json({ error: 'Failed to post capture' });
  }
});

// ─── GET /:eventId/feed — Get the moment feed for a game ────────
router.get('/:eventId/feed', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = String(req.params.eventId);
    const sort = req.query.sort === 'top' ? 'top' : 'latest';

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const orderBy = sort === 'top'
      ? { rallyCount: 'desc' as const }
      : { createdAt: 'desc' as const };

    const captures = await prisma.gameCapture.findMany({
      where: { eventId, isReported: false },
      orderBy,
      take: 100,
      include: {
        user: { select: { id: true, name: true, handle: true, tier: true, favoriteSchool: true } },
        rallies: { where: { userId: req.userId! }, select: { id: true } },
      },
    });

    // Check how many rallies this user has given in this game
    const userRalliesGiven = await prisma.captureRally.count({
      where: {
        userId: req.userId!,
        capture: { eventId },
      },
    });

    const feed = captures.map((c: typeof captures[number]) => ({
      id: c.id,
      imageUrl: c.imageUrl,
      caption: c.caption,
      momentType: c.momentType,
      isInStadium: c.isInStadium,
      rallyCount: c.rallyCount,
      totalPoints: c.totalPoints,
      isMomentOfGame: c.isMomentOfGame,
      hasRallied: c.rallies.length > 0,
      user: c.user,
      createdAt: c.createdAt.toISOString(),
    }));

    const isLocked = event.status === 'COMPLETED';
    const momentOfGame = captures.find((c: typeof captures[number]) => c.isMomentOfGame);

    return res.json({
      eventId,
      eventTitle: event.title,
      isLocked,
      sort,
      totalCaptures: captures.length,
      ralliesRemaining: Math.max(0, RALLIES_PER_GAME - userRalliesGiven),
      ralliesPerGame: RALLIES_PER_GAME,
      momentOfGame: momentOfGame ? {
        id: momentOfGame.id,
        imageUrl: momentOfGame.imageUrl,
        caption: momentOfGame.caption,
        rallyCount: momentOfGame.rallyCount,
        user: momentOfGame.user,
      } : null,
      feed,
    });
  } catch (err) {
    console.error('Feed error:', err);
    return res.status(500).json({ error: 'Failed to load moment feed' });
  }
});

// ─── POST /:captureId/rally — Rally (upvote) a capture ──────────
router.post('/:captureId/rally', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const captureId = String(req.params.captureId);

    const capture = await prisma.gameCapture.findUnique({
      where: { id: captureId },
      include: { event: true },
    });
    if (!capture) return res.status(404).json({ error: 'Capture not found' });
    if (capture.event.status === 'COMPLETED') {
      return res.status(400).json({ error: 'This game\'s feed is locked' });
    }
    if (capture.userId === req.userId) {
      return res.status(400).json({ error: 'You cannot rally your own capture' });
    }

    // Check rally allocation
    const ralliesGiven = await prisma.captureRally.count({
      where: {
        userId: req.userId!,
        capture: { eventId: capture.eventId },
      },
    });
    if (ralliesGiven >= RALLIES_PER_GAME) {
      return res.status(400).json({ error: `You've used all ${RALLIES_PER_GAME} rallies for this game` });
    }

    // Check duplicate
    const existing = await prisma.captureRally.findUnique({
      where: { captureId_userId: { captureId, userId: req.userId! } },
    });
    if (existing) return res.status(400).json({ error: 'You already rallied this capture' });

    // Create the rally
    await prisma.captureRally.create({
      data: { captureId, userId: req.userId! },
    });

    // Update rally count and recalc points
    const newCount = capture.rallyCount + 1;
    const gameMult = SIGNIFICANCE_MULTIPLIER[capture.event.significance as GameSignificance];
    const momentMult = MOMENT_MULTIPLIER[capture.momentType];
    const newTotalPoints = Math.round(
      (BASE_CAPTURE_POINTS + rallyBonusPoints(newCount)) * gameMult * momentMult
    );

    await prisma.gameCapture.update({
      where: { id: captureId },
      data: { rallyCount: newCount, totalPoints: newTotalPoints },
    });

    // Award small points to the voter
    await prisma.pointsEntry.create({
      data: {
        userId: req.userId!,
        eventId: capture.eventId,
        activationName: 'Rally Vote',
        points: RALLY_VOTER_POINTS,
        schoolId: capture.event.homeSchoolId,
      },
    });
    await prisma.rallyUser.update({
      where: { id: req.userId! },
      data: { points: { increment: RALLY_VOTER_POINTS } },
    });

    return res.json({
      success: true,
      newRallyCount: newCount,
      ralliesRemaining: RALLIES_PER_GAME - ralliesGiven - 1,
      voterPointsAwarded: RALLY_VOTER_POINTS,
    });
  } catch (err) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === 'P2002') {
      return res.status(400).json({ error: 'You already rallied this capture' });
    }
    console.error('Rally error:', err);
    return res.status(500).json({ error: 'Failed to rally capture' });
  }
});

// ─── POST /:captureId/report — Report a capture ────────────────
router.post('/:captureId/report', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.gameCapture.update({
      where: { id: String(req.params.captureId) },
      data: { isReported: true },
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to report capture' });
  }
});

// ─── POST /:eventId/crown — Crown Moment of the Game (admin / auto) ──
router.post('/:eventId/crown', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = String(req.params.eventId);

    // Find the top capture by rally count
    const topCapture = await prisma.gameCapture.findFirst({
      where: { eventId, isReported: false },
      orderBy: { rallyCount: 'desc' },
      include: {
        user: { select: { id: true, name: true, handle: true, tier: true } },
      },
    });
    if (!topCapture || topCapture.rallyCount === 0) {
      return res.status(400).json({ error: 'No captures with rallies to crown' });
    }

    // Clear any previous MOTG for this event
    await prisma.gameCapture.updateMany({
      where: { eventId, isMomentOfGame: true },
      data: { isMomentOfGame: false },
    });

    // Crown the winner
    await prisma.gameCapture.update({
      where: { id: topCapture.id },
      data: { isMomentOfGame: true },
    });

    // Bonus points for MOTG winner (100 pts * game significance)
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    const motgBonus = Math.round(100 * SIGNIFICANCE_MULTIPLIER[(event!.significance as GameSignificance)]);
    await prisma.pointsEntry.create({
      data: {
        userId: topCapture.userId,
        eventId,
        activationName: 'Moment of the Game',
        points: motgBonus,
        schoolId: event!.homeSchoolId,
      },
    });
    await prisma.rallyUser.update({
      where: { id: topCapture.userId },
      data: { points: { increment: motgBonus } },
    });

    return res.json({
      momentOfGame: {
        captureId: topCapture.id,
        imageUrl: topCapture.imageUrl,
        caption: topCapture.caption,
        rallyCount: topCapture.rallyCount,
        user: topCapture.user,
        bonusPointsAwarded: motgBonus,
      },
    });
  } catch (err) {
    console.error('Crown error:', err);
    return res.status(500).json({ error: 'Failed to crown moment of the game' });
  }
});

// ─── GET /:eventId/leaderboard — Per-game capture leaderboard ───
router.get('/:eventId/leaderboard', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const captures = await prisma.gameCapture.findMany({
      where: { eventId: String(req.params.eventId), isReported: false },
      orderBy: { rallyCount: 'desc' },
      take: 25,
      include: {
        user: { select: { id: true, name: true, handle: true, tier: true } },
      },
    });

    return res.json({
      leaderboard: captures.map((c: typeof captures[number], i: number) => ({
        rank: i + 1,
        captureId: c.id,
        imageUrl: c.imageUrl,
        caption: c.caption,
        momentType: c.momentType,
        rallyCount: c.rallyCount,
        totalPoints: c.totalPoints,
        isMomentOfGame: c.isMomentOfGame,
        user: c.user,
      })),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ─── GET /leaderboard/season — Season-wide rally leaderboard ────
router.get('/leaderboard/season', optionalAuth, async (_req: AuthRequest, res: Response) => {
  try {
    // Top fans by total rallies received across all games
    const topUsers = await prisma.gameCapture.groupBy({
      by: ['userId'],
      _sum: { rallyCount: true },
      _count: { id: true },
      orderBy: { _sum: { rallyCount: 'desc' } },
      take: 50,
    });

    const userIds = topUsers.map((u: typeof topUsers[number]) => u.userId);
    const users = await prisma.rallyUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, handle: true, tier: true, favoriteSchool: true },
    });
    const userMap = Object.fromEntries(users.map((u: typeof users[number]) => [u.id, u]));

    // MOTG counts
    const motgCounts = await prisma.gameCapture.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, isMomentOfGame: true },
      _count: { id: true },
    });
    const motgMap = Object.fromEntries(motgCounts.map((m: typeof motgCounts[number]) => [m.userId, m._count.id]));

    const leaderboard = topUsers.map((u: typeof topUsers[number], i: number) => ({
      rank: i + 1,
      user: userMap[u.userId] || { id: u.userId, name: 'Unknown', handle: '@unknown', tier: 'Bronze' },
      totalRallies: u._sum.rallyCount || 0,
      captureCount: u._count.id,
      momentOfGameCount: motgMap[u.userId] || 0,
    }));

    return res.json({ leaderboard });
  } catch (err) {
    console.error('Season leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to load season leaderboard' });
  }
});

// ─── GET /attribution — Sponsor attribution data (admin+) ───────
router.get('/attribution', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(String(req.query.days)) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // All sponsored captures in the period
    const sponsoredCaptures = await prisma.gameCapture.findMany({
      where: {
        momentType: 'SPONSORED',
        createdAt: { gte: since },
        isReported: false,
      },
      include: {
        event: { select: { id: true, title: true, sport: true, homeSchoolId: true, significance: true } },
      },
    });

    const totalCaptures = sponsoredCaptures.length;
    const totalRallies = sponsoredCaptures.reduce((s: number, c: typeof sponsoredCaptures[number]) => s + c.rallyCount, 0);

    // Check-in count across those events for engagement rate
    const eventIds = [...new Set(sponsoredCaptures.map((c: typeof sponsoredCaptures[number]) => c.eventId))];
    const lobbyFanCounts = eventIds.length > 0
      ? await prisma.gameLobby.findMany({
          where: { eventId: { in: eventIds } },
          select: { eventId: true, fanCount: true },
        })
      : [];
    const totalCheckedIn = lobbyFanCounts.reduce((s: number, l: typeof lobbyFanCounts[number]) => s + l.fanCount, 0);
    const engagementRate = totalCheckedIn > 0 ? Math.round((totalRallies / totalCheckedIn) * 100) : 0;

    // Per-event breakdown
    const eventBreakdown: Record<string, { title: string; sport: string; captures: number; rallies: number; fanCount: number }> = {};
    const fanCountMap = Object.fromEntries(lobbyFanCounts.map((l: typeof lobbyFanCounts[number]) => [l.eventId, l.fanCount]));
    for (const c of sponsoredCaptures) {
      if (!eventBreakdown[c.eventId]) {
        eventBreakdown[c.eventId] = {
          title: c.event.title,
          sport: c.event.sport || '',
          captures: 0,
          rallies: 0,
          fanCount: fanCountMap[c.eventId] || 0,
        };
      }
      eventBreakdown[c.eventId].captures++;
      eventBreakdown[c.eventId].rallies += c.rallyCount;
    }

    // All captures (all types) for comparison
    const allCaptures = await prisma.gameCapture.count({ where: { createdAt: { gte: since }, isReported: false } });
    const allRallies = await prisma.gameCapture.aggregate({
      where: { createdAt: { gte: since }, isReported: false },
      _sum: { rallyCount: true },
    });

    // Moment type distribution
    const momentDist = await prisma.gameCapture.groupBy({
      by: ['momentType'],
      where: { createdAt: { gte: since }, isReported: false },
      _count: { id: true },
      _sum: { rallyCount: true },
    });

    return res.json({
      period: `${days}d`,
      sponsored: {
        totalCaptures,
        totalRallies,
        totalCheckedInFans: totalCheckedIn,
        engagementRate,
        avgRalliesPerCapture: totalCaptures > 0 ? Math.round(totalRallies / totalCaptures) : 0,
        eventBreakdown: Object.values(eventBreakdown)
          .sort((a, b) => b.rallies - a.rallies),
      },
      overall: {
        totalCaptures: allCaptures,
        totalRallies: allRallies._sum.rallyCount || 0,
        momentDistribution: momentDist.map((m: typeof momentDist[number]) => ({
          type: m.momentType,
          captures: m._count.id,
          rallies: m._sum.rallyCount || 0,
        })),
      },
    });
  } catch (err) {
    console.error('Attribution error:', err);
    return res.status(500).json({ error: 'Failed to load attribution data' });
  }
});

export default router;
