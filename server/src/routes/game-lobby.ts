import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /game-lobby/:eventId — Get lobby for an event (who's here, reaction counts)
router.get('/:eventId', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;

    // Find or auto-create lobby
    let lobby: any = await prisma.gameLobby.findUnique({
      where: { eventId },
      include: {
        presences: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                handle: true,
                tier: true,
                favoriteSchool: true,
                fanProfile: {
                  select: { verifiedLevel: true, currentStreak: true, tagline: true },
                },
              },
            },
          },
          orderBy: { checkedInAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!lobby) {
      // Verify event exists
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      lobby = await prisma.gameLobby.create({
        data: { eventId },
        include: {
          presences: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  handle: true,
                  tier: true,
                  favoriteSchool: true,
                  fanProfile: {
                    select: { verifiedLevel: true, currentStreak: true, tagline: true },
                  },
                },
              },
            },
            take: 100,
          },
        },
      });
    }

    // Get recent reactions (last 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentReactions = await prisma.lobbyReaction.groupBy({
      by: ['type'],
      where: { lobbyId: lobby.id, createdAt: { gte: fiveMinAgo } },
      _count: { type: true },
    });

    const reactionCounts: Record<string, number> = {};
    for (const r of recentReactions) {
      reactionCounts[r.type] = r._count.type;
    }

    // Check if current user is in lobby
    let isCheckedIn = false;
    if (req.userId) {
      const presence = await prisma.lobbyPresence.findUnique({
        where: { lobbyId_userId: { lobbyId: lobby.id, userId: req.userId } },
      });
      isCheckedIn = !!presence?.isActive;
    }

    res.json({
      lobbyId: lobby.id,
      eventId,
      isActive: lobby.isActive,
      fanCount: lobby.fanCount,
      fans: lobby.presences.map((p: any) => ({
        ...p.user,
        checkedInAt: p.checkedInAt,
      })),
      recentReactions: reactionCounts,
      isCheckedIn,
    });
  } catch (err) {
    console.error('Game lobby error:', err);
    res.status(500).json({ error: 'Failed to load game lobby' });
  }
});

// POST /game-lobby/:eventId/checkin — Join the lobby
router.post('/:eventId/checkin', requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const userId = req.userId!;

    // Find or create lobby
    let lobby = await prisma.gameLobby.findUnique({ where: { eventId } });
    if (!lobby) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ error: 'Event not found' });
      lobby = await prisma.gameLobby.create({ data: { eventId } });
    }

    // Upsert presence
    await prisma.lobbyPresence.upsert({
      where: { lobbyId_userId: { lobbyId: lobby.id, userId } },
      update: { isActive: true, checkedInAt: new Date() },
      create: { lobbyId: lobby.id, userId },
    });

    // Update fan count
    const activeCount = await prisma.lobbyPresence.count({
      where: { lobbyId: lobby.id, isActive: true },
    });
    await prisma.gameLobby.update({
      where: { id: lobby.id },
      data: { fanCount: activeCount },
    });

    res.json({ success: true, fanCount: activeCount });
  } catch (err) {
    console.error('Lobby checkin error:', err);
    res.status(500).json({ error: 'Failed to check in to lobby' });
  }
});

// POST /game-lobby/:eventId/checkout — Leave the lobby
router.post('/:eventId/checkout', requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const userId = req.userId!;

    const lobby = await prisma.gameLobby.findUnique({ where: { eventId } });
    if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

    await prisma.lobbyPresence.updateMany({
      where: { lobbyId: lobby.id, userId },
      data: { isActive: false },
    });

    const activeCount = await prisma.lobbyPresence.count({
      where: { lobbyId: lobby.id, isActive: true },
    });
    await prisma.gameLobby.update({
      where: { id: lobby.id },
      data: { fanCount: activeCount },
    });

    res.json({ success: true, fanCount: activeCount });
  } catch (err) {
    console.error('Lobby checkout error:', err);
    res.status(500).json({ error: 'Failed to check out of lobby' });
  }
});

// POST /game-lobby/:eventId/react — Send a reaction
router.post('/:eventId/react', requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const { type } = req.body;
    const userId = req.userId!;

    const validTypes = ['FIRE', 'CLAP', 'CRY', 'HORN', 'WAVE', 'HUNDRED'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid reaction type. Must be one of: ${validTypes.join(', ')}` });
    }

    const lobby = await prisma.gameLobby.findUnique({ where: { eventId } });
    if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

    // Rate limit: max 1 reaction per type per 5 seconds
    const fiveSecAgo = new Date(Date.now() - 5000);
    const recent = await prisma.lobbyReaction.findFirst({
      where: { lobbyId: lobby.id, userId, type: type as any, createdAt: { gte: fiveSecAgo } },
    });
    if (recent) {
      return res.status(429).json({ error: 'Slow down! Wait a few seconds between reactions.' });
    }

    await prisma.lobbyReaction.create({
      data: { lobbyId: lobby.id, userId, type: type as any },
    });

    await prisma.gameLobby.update({
      where: { id: lobby.id },
      data: { reactionCount: { increment: 1 } },
    });

    res.json({ success: true, type });
  } catch (err) {
    console.error('Lobby reaction error:', err);
    res.status(500).json({ error: 'Failed to send reaction' });
  }
});

export default router;
