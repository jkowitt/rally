import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /analytics (admin+ only)
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const totalUsers = await prisma.rallyUser.count();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeToday = await prisma.rallyUser.count({
      where: { lastLogin: { gte: oneDayAgo } },
    });

    const eventsTracked = await prisma.event.count();

    const verifiedUsers = await prisma.rallyUser.count({
      where: { emailVerified: true },
    });

    // Users by school
    const users = await prisma.rallyUser.findMany({
      where: { schoolId: { not: null } },
      select: { schoolId: true },
    });
    const usersBySchool: Record<string, number> = {};
    for (const u of users) {
      if (u.schoolId) {
        usersBySchool[u.schoolId] = (usersBySchool[u.schoolId] || 0) + 1;
      }
    }

    // Recent analytics events
    const recentEvents = await prisma.analyticsEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return res.json({
      totalUsers,
      activeToday,
      eventsTracked,
      verifiedUsers,
      usersBySchool,
      recentEvents: recentEvents.map(e => ({
        event: e.event,
        page: e.page,
        timestamp: e.timestamp.toISOString(),
        userId: e.userId,
      })),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// POST /analytics/track
router.post('/track', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { event, page, metadata, timestamp } = req.body;
    if (!event) return res.status(400).json({ error: 'Event name is required' });

    await prisma.analyticsEvent.create({
      data: {
        userId: req.userId || null,
        event,
        page: page || null,
        metadata: metadata || null,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to track event' });
  }
});

export default router;
