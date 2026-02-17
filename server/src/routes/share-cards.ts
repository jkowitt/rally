import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, optionalAuth } from '../middleware/auth';
import { validate, headToHeadSchema } from '../lib/validation';

const router = Router();

// GET /share-cards/milestones/mine — Get my milestones
router.get('/milestones/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    const milestones = await prisma.fanMilestone.findMany({
      where: { userId: req.userId! },
      orderBy: { earnedAt: 'desc' },
    });
    res.json({ milestones });
  } catch (err) {
    console.error('Milestones error:', err);
    res.status(500).json({ error: 'Failed to load milestones' });
  }
});

// GET /share-cards/mine — List my share cards
router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const cards = await prisma.shareCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ cards });
  } catch (err) {
    console.error('Share cards error:', err);
    res.status(500).json({ error: 'Failed to load share cards' });
  }
});

// GET /share-cards/:id — Get a specific share card (public view for sharing)
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const card = await prisma.shareCard.findUnique({
      where: { id: req.params.id as string },
      include: {
        user: { select: { name: true, handle: true, tier: true, favoriteSchool: true } },
      },
    });

    if (!card) return res.status(404).json({ error: 'Card not found' });

    // Increment view count
    await prisma.shareCard.update({
      where: { id: card.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json(card);
  } catch (err) {
    console.error('Share card fetch error:', err);
    res.status(500).json({ error: 'Failed to load share card' });
  }
});

// POST /share-cards/fan-resume — Generate a "fan resume" share card
router.post('/fan-resume', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const user = await prisma.rallyUser.findUnique({
      where: { id: userId },
      select: { name: true, handle: true, points: true, tier: true, favoriteSchool: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const profile = await prisma.fanProfile.findUnique({ where: { userId } });
    const milestones = await prisma.fanMilestone.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
      take: 6,
      select: { title: true, icon: true, stat: true },
    });

    const crewMemberships = await prisma.crewMember.findMany({
      where: { userId },
      include: { crew: { select: { name: true, avatarEmoji: true } } },
      take: 3,
    });

    const card = await prisma.shareCard.create({
      data: {
        userId,
        type: 'FAN_RESUME',
        title: `${user.name}'s Fan Resume`,
        data: {
          name: user.name,
          handle: user.handle,
          points: user.points,
          tier: user.tier,
          favoriteSchool: user.favoriteSchool,
          memberSince: user.createdAt,
          verifiedLevel: profile?.verifiedLevel || 'ROOKIE',
          eventsAttended: profile?.eventsAttended || 0,
          totalCheckins: profile?.totalCheckins || 0,
          currentStreak: profile?.currentStreak || 0,
          longestStreak: profile?.longestStreak || 0,
          uniqueVenues: profile?.uniqueVenues || 0,
          predictionAccuracy: profile && profile.totalPredictions > 0
            ? Math.round((profile.correctPredictions / profile.totalPredictions) * 100)
            : null,
          sportBreakdown: profile?.sportBreakdown || {},
          topMilestones: milestones,
          crews: crewMemberships.map(m => ({ name: m.crew.name, emoji: m.crew.avatarEmoji })),
        },
      },
    });

    res.status(201).json(card);
  } catch (err) {
    console.error('Fan resume card error:', err);
    res.status(500).json({ error: 'Failed to generate fan resume' });
  }
});

// POST /share-cards/milestone/:milestoneId — Create a share card for a milestone
router.post('/milestone/:milestoneId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const milestone = await prisma.fanMilestone.findUnique({
      where: { id: req.params.milestoneId as string },
    });

    if (!milestone || milestone.userId !== userId) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const user = await prisma.rallyUser.findUnique({
      where: { id: userId },
      select: { name: true, handle: true, tier: true, favoriteSchool: true },
    });

    const card = await prisma.shareCard.create({
      data: {
        userId,
        type: 'MILESTONE',
        title: milestone.title,
        data: {
          milestoneType: milestone.type,
          title: milestone.title,
          description: milestone.description,
          icon: milestone.icon,
          stat: milestone.stat,
          sport: milestone.sport,
          earnedAt: milestone.earnedAt,
          fanName: user?.name,
          fanHandle: user?.handle,
          fanTier: user?.tier,
        },
      },
    });

    res.status(201).json(card);
  } catch (err) {
    console.error('Milestone card error:', err);
    res.status(500).json({ error: 'Failed to create milestone card' });
  }
});

// POST /share-cards/head-to-head — Generate a head-to-head comparison share card
router.post('/head-to-head', requireAuth, validate(headToHeadSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { opponentHandle } = req.body;

    const [me, opponent] = await Promise.all([
      prisma.rallyUser.findUnique({
        where: { id: userId },
        select: { name: true, handle: true, points: true, tier: true },
      }),
      prisma.rallyUser.findUnique({
        where: { handle: opponentHandle },
        select: { id: true, name: true, handle: true, points: true, tier: true },
      }),
    ]);

    if (!me || !opponent) return res.status(404).json({ error: 'Fan not found' });

    const [myProfile, oppProfile] = await Promise.all([
      prisma.fanProfile.findUnique({ where: { userId } }),
      prisma.fanProfile.findUnique({ where: { userId: opponent.id } }),
    ]);

    const categories = [
      { label: 'Points', a: me.points || 0, b: opponent.points || 0 },
      { label: 'Events', a: myProfile?.eventsAttended || 0, b: oppProfile?.eventsAttended || 0 },
      { label: 'Streak', a: myProfile?.currentStreak || 0, b: oppProfile?.currentStreak || 0 },
      { label: 'Check-ins', a: myProfile?.totalCheckins || 0, b: oppProfile?.totalCheckins || 0 },
      { label: 'Venues', a: myProfile?.uniqueVenues || 0, b: oppProfile?.uniqueVenues || 0 },
    ];

    const winsA = categories.filter(c => c.a > c.b).length;
    const winsB = categories.filter(c => c.b > c.a).length;
    const winner = winsA > winsB ? 'A' : winsB > winsA ? 'B' : 'TIE';

    const card = await prisma.shareCard.create({
      data: {
        userId,
        type: 'HEAD_TO_HEAD',
        title: `${me.name} vs ${opponent.name}`,
        data: {
          fanA: { name: me.name, handle: me.handle, tier: me.tier },
          fanB: { name: opponent.name, handle: opponent.handle, tier: opponent.tier },
          categories,
          winner,
          winsA,
          winsB,
        },
      },
    });

    res.status(201).json(card);
  } catch (err) {
    console.error('Head-to-head card error:', err);
    res.status(500).json({ error: 'Failed to create comparison card' });
  }
});

// POST /share-cards/:id/shared — Track that a card was shared
router.post('/:id/shared', requireAuth, async (req: AuthRequest, res) => {
  try {
    const card = await prisma.shareCard.findUnique({ where: { id: req.params.id as string } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    await prisma.shareCard.update({
      where: { id: card.id },
      data: { shareCount: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Share tracking error:', err);
    res.status(500).json({ error: 'Failed to track share' });
  }
});

export default router;
