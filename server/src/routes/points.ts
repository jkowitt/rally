import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth } from '../middleware/auth';

const router = Router();

// GET /points/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.rallyUser.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const history = await prisma.pointsEntry.findMany({
      where: { userId: req.userId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return res.json({
      totalPoints: user.points,
      tier: user.tier,
      history: history.map(h => ({
        id: h.id,
        userId: h.userId,
        eventId: h.eventId,
        activationId: h.activationId,
        activationName: h.activationName,
        points: h.points,
        schoolId: h.schoolId,
        timestamp: h.timestamp.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Points fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch points' });
  }
});

export default router;
