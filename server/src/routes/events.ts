import { Router } from 'express';
import prisma from '../lib/prisma';
import { getTier } from '../lib/tiers';
import { AuthRequest, requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { triggerManualUpdate, getLastRunResult, isUpdateRunning } from '../services/scheduler';

const router = Router();

function formatEvent(event: any) {
  return {
    id: event.id,
    title: event.title,
    sport: event.sport,
    homeSchoolId: event.homeSchoolId,
    homeTeam: event.homeTeam,
    awaySchoolId: event.awaySchoolId,
    awayTeam: event.awayTeam,
    venue: event.venue,
    city: event.city,
    dateTime: event.dateTime.toISOString(),
    status: event.status.toLowerCase(),
    activations: (event.activations || []).map((a: any) => ({
      id: a.id,
      type: a.type,
      name: a.name,
      points: a.points,
      description: a.description,
    })),
    createdBy: event.createdBy,
    createdAt: event.createdAt?.toISOString(),
    updatedAt: event.updatedAt?.toISOString(),
  };
}

// ─────────────────────────────────────────────
// Auto-update admin endpoints (must be before /:eventId to avoid param capture)
// ─────────────────────────────────────────────

// POST /events/sync — trigger an immediate event update (admin+ only)
router.post('/sync', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const lookAheadDays = parseInt(req.query.days as string) || 10;
    const result = await triggerManualUpdate(lookAheadDays);
    return res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes('already in progress')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Manual sync error:', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
});

// GET /events/sync/status — check last sync result (admin+ only)
router.get('/sync/status', requireAuth, requireAdmin, async (_req, res) => {
  return res.json({
    running: isUpdateRunning(),
    lastRun: getLastRunResult(),
  });
});

// GET /events
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { schoolId, status } = req.query;
    const where: any = {};
    if (schoolId) where.homeSchoolId = schoolId as string;
    if (status) where.status = (status as string).toUpperCase();

    const events = await prisma.event.findMany({
      where,
      include: { activations: true },
      orderBy: { dateTime: 'asc' },
    });

    return res.json({
      events: events.map(formatEvent),
      total: events.length,
    });
  } catch (err) {
    console.error('Events fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /events/:eventId
router.get('/:eventId', optionalAuth, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: String(req.params.eventId) },
      include: { activations: true },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    return res.json(formatEvent(event));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /events (admin+ only)
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, sport, homeSchoolId, homeTeam, awaySchoolId, awayTeam, venue, city, dateTime, status, activations } = req.body;

    if (!title || !homeSchoolId || !dateTime) {
      return res.status(400).json({ error: 'Title, homeSchoolId, and dateTime are required' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        sport: sport || null,
        homeSchoolId,
        homeTeam: homeTeam || null,
        awaySchoolId: awaySchoolId || null,
        awayTeam: awayTeam || null,
        venue: venue || null,
        city: city || null,
        dateTime: new Date(dateTime),
        status: status ? status.toUpperCase() : 'UPCOMING',
        createdBy: req.userId,
        activations: activations?.length ? {
          create: activations.map((a: any) => ({
            type: a.type,
            name: a.name,
            points: a.points,
            description: a.description || '',
          })),
        } : undefined,
      },
      include: { activations: true },
    });

    return res.status(201).json(formatEvent(event));
  } catch (err) {
    console.error('Event create error:', err);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /events/:eventId (admin+ only)
router.put('/:eventId', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, sport, homeSchoolId, homeTeam, awaySchoolId, awayTeam, venue, city, dateTime, status, activations } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (sport !== undefined) data.sport = sport;
    if (homeSchoolId !== undefined) data.homeSchoolId = homeSchoolId;
    if (homeTeam !== undefined) data.homeTeam = homeTeam;
    if (awaySchoolId !== undefined) data.awaySchoolId = awaySchoolId;
    if (awayTeam !== undefined) data.awayTeam = awayTeam;
    if (venue !== undefined) data.venue = venue;
    if (city !== undefined) data.city = city;
    if (dateTime !== undefined) data.dateTime = new Date(dateTime);
    if (status !== undefined) data.status = status.toUpperCase();

    // If activations provided, replace them
    if (activations) {
      await prisma.eventActivation.deleteMany({ where: { eventId: String(req.params.eventId) } });
      await prisma.eventActivation.createMany({
        data: activations.map((a: any) => ({
          eventId: String(req.params.eventId),
          type: a.type,
          name: a.name,
          points: a.points,
          description: a.description || '',
        })),
      });
    }

    const event = await prisma.event.update({
      where: { id: String(req.params.eventId) },
      data,
      include: { activations: true },
    });

    return res.json(formatEvent(event));
  } catch (err) {
    console.error('Event update error:', err);
    return res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /events/:eventId (admin+ only)
router.delete('/:eventId', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: String(req.params.eventId) } });
    return res.json({ message: 'Event deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST /events/:eventId/earn
router.post('/:eventId/earn', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { activationId } = req.body;
    if (!activationId) return res.status(400).json({ error: 'activationId is required' });

    const activation = await prisma.eventActivation.findUnique({ where: { id: activationId } });
    if (!activation) return res.status(404).json({ error: 'Activation not found' });

    const event = await prisma.event.findUnique({ where: { id: String(req.params.eventId) } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Check for duplicate earning
    const alreadyEarned = await prisma.pointsEntry.findFirst({
      where: { userId: req.userId!, eventId: event.id, activationId },
    });
    if (alreadyEarned) {
      return res.status(409).json({ error: 'Already earned points for this activation' });
    }

    // Check for active bonus offers
    const now = new Date();
    const bonusOffer = await prisma.bonusOffer.findFirst({
      where: {
        schoolId: event.homeSchoolId,
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gte: now },
        OR: [
          { activationType: null },
          { activationType: '' },
          { activationType: activation.type },
        ],
      },
    });

    let earnedPoints = activation.points;
    if (bonusOffer) {
      if (bonusOffer.bonusMultiplier) {
        earnedPoints = Math.round(earnedPoints * bonusOffer.bonusMultiplier);
      } else if (bonusOffer.bonusPoints) {
        earnedPoints += bonusOffer.bonusPoints;
      }
    }

    const entry = await prisma.pointsEntry.create({
      data: {
        userId: req.userId!,
        eventId: event.id,
        activationId,
        activationName: activation.name,
        points: earnedPoints,
        schoolId: event.homeSchoolId,
      },
    });

    // Update user totals
    const user = await prisma.rallyUser.update({
      where: { id: req.userId },
      data: {
        points: { increment: earnedPoints },
      },
    });

    // Update tier
    const newTier = getTier(user.points);
    if (newTier !== user.tier) {
      await prisma.rallyUser.update({
        where: { id: req.userId },
        data: { tier: newTier },
      });
    }

    return res.json({
      earned: {
        id: entry.id,
        userId: entry.userId,
        eventId: entry.eventId,
        activationId: entry.activationId,
        activationName: entry.activationName,
        points: entry.points,
        schoolId: entry.schoolId,
        timestamp: entry.timestamp.toISOString(),
      },
      totalPoints: user.points,
    });
  } catch (err) {
    console.error('Earn points error:', err);
    return res.status(500).json({ error: 'Failed to earn points' });
  }
});

export default router;
