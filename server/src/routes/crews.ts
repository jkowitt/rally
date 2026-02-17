import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /crews — List public crews (leaderboard order)
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { schoolId, sort } = req.query;

    const where: Record<string, unknown> = { isPublic: true };
    if (schoolId) where.schoolId = schoolId as string;

    const orderBy = sort === 'members'
      ? { memberCount: 'desc' as const }
      : sort === 'checkins'
        ? { totalCheckins: 'desc' as const }
        : { totalPoints: 'desc' as const };

    const crews = await prisma.crew.findMany({
      where,
      orderBy,
      take: 50,
      include: {
        members: {
          take: 5,
          orderBy: { joinedAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, handle: true, tier: true } },
          },
        },
      },
    });

    res.json({
      crews: crews.map(c => ({
        ...c,
        previewMembers: c.members.map(m => ({ ...m.user, role: m.role })),
        members: undefined,
      })),
    });
  } catch (err) {
    console.error('List crews error:', err);
    res.status(500).json({ error: 'Failed to list crews' });
  }
});

// GET /crews/mine — List current user's crews
router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const memberships = await prisma.crewMember.findMany({
      where: { userId },
      include: {
        crew: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({
      crews: memberships.map(m => ({
        ...m.crew,
        myRole: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    console.error('My crews error:', err);
    res.status(500).json({ error: 'Failed to load your crews' });
  }
});

// GET /crews/leaderboard — Top crews by points
router.get('/leaderboard', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { schoolId } = req.query;
    const where: Record<string, unknown> = { isPublic: true };
    if (schoolId) where.schoolId = schoolId as string;

    const crews = await prisma.crew.findMany({
      where,
      orderBy: { totalPoints: 'desc' },
      take: 25,
      select: {
        id: true,
        name: true,
        slug: true,
        avatarEmoji: true,
        color: true,
        memberCount: true,
        totalPoints: true,
        totalCheckins: true,
        totalEvents: true,
        schoolId: true,
      },
    });

    res.json({ leaderboard: crews });
  } catch (err) {
    console.error('Crew leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load crew leaderboard' });
  }
});

// GET /crews/:slug — Get crew detail
router.get('/:slug', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const crew: any = await prisma.crew.findUnique({
      where: { slug: req.params.slug as string },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true, name: true, handle: true, points: true, tier: true,
                fanProfile: { select: { eventsAttended: true, currentStreak: true, verifiedLevel: true } },
              },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    });

    if (!crew) {
      return res.status(404).json({ error: 'Crew not found' });
    }

    // Check membership
    let myRole = null;
    if (req.userId) {
      const membership = crew.members.find((m: any) => m.userId === req.userId);
      myRole = membership?.role || null;
    }

    res.json({
      ...crew,
      members: crew.members.map((m: any) => ({
        id: m.user.id,
        name: m.user.name,
        handle: m.user.handle,
        points: m.user.points,
        tier: m.user.tier,
        profile: m.user.fanProfile,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      myRole,
    });
  } catch (err) {
    console.error('Crew detail error:', err);
    res.status(500).json({ error: 'Failed to load crew' });
  }
});

// POST /crews — Create a crew
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { name, description, schoolId, sport, avatarEmoji, color, isPublic } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Crew name must be at least 2 characters' });
    }

    // Generate slug from name
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.crew.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    // Limit: max 5 crews per user as captain
    const captainCount = await prisma.crewMember.count({
      where: { userId, role: 'CAPTAIN' },
    });
    if (captainCount >= 5) {
      return res.status(400).json({ error: 'You can only captain up to 5 crews' });
    }

    const crew = await prisma.crew.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        schoolId: schoolId || null,
        sport: sport || null,
        avatarEmoji: avatarEmoji || '🏟️',
        color: color || '#FF6B35',
        isPublic: isPublic !== false,
        memberCount: 1,
        members: {
          create: { userId, role: 'CAPTAIN' },
        },
      },
    });

    res.status(201).json(crew);
  } catch (err) {
    console.error('Create crew error:', err);
    res.status(500).json({ error: 'Failed to create crew' });
  }
});

// POST /crews/:slug/join — Join a crew
router.post('/:slug/join', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const crew = await prisma.crew.findUnique({ where: { slug: req.params.slug as string } });
    if (!crew) return res.status(404).json({ error: 'Crew not found' });
    if (!crew.isPublic) return res.status(403).json({ error: 'This crew is private' });
    if (crew.memberCount >= crew.maxMembers) return res.status(400).json({ error: 'Crew is full' });

    // Check if already a member
    const existing = await prisma.crewMember.findUnique({
      where: { crewId_userId: { crewId: crew.id, userId } },
    });
    if (existing) return res.status(400).json({ error: 'Already a member of this crew' });

    // Limit: max 10 crew memberships
    const membershipCount = await prisma.crewMember.count({ where: { userId } });
    if (membershipCount >= 10) {
      return res.status(400).json({ error: 'You can join up to 10 crews' });
    }

    await prisma.crewMember.create({
      data: { crewId: crew.id, userId },
    });

    // Refresh aggregate stats
    await recalcCrewStats(crew.id);

    res.json({ success: true, message: `Joined ${crew.name}` });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Already a member' });
    console.error('Join crew error:', err);
    res.status(500).json({ error: 'Failed to join crew' });
  }
});

// POST /crews/:slug/leave — Leave a crew
router.post('/:slug/leave', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const crew = await prisma.crew.findUnique({ where: { slug: req.params.slug as string } });
    if (!crew) return res.status(404).json({ error: 'Crew not found' });

    const membership = await prisma.crewMember.findUnique({
      where: { crewId_userId: { crewId: crew.id, userId } },
    });
    if (!membership) return res.status(400).json({ error: 'Not a member of this crew' });

    // Captain can't leave unless they're the last member
    if (membership.role === 'CAPTAIN') {
      const memberCount = await prisma.crewMember.count({ where: { crewId: crew.id } });
      if (memberCount > 1) {
        return res.status(400).json({ error: 'Transfer captainship before leaving. Promote another member first.' });
      }
      // Last member leaving — delete the crew
      await prisma.crew.delete({ where: { id: crew.id } });
      return res.json({ success: true, message: 'Crew disbanded' });
    }

    await prisma.crewMember.delete({
      where: { crewId_userId: { crewId: crew.id, userId } },
    });

    await recalcCrewStats(crew.id);

    res.json({ success: true, message: `Left ${crew.name}` });
  } catch (err) {
    console.error('Leave crew error:', err);
    res.status(500).json({ error: 'Failed to leave crew' });
  }
});

// PUT /crews/:slug/members/:memberId/promote — Promote/demote a member
router.put('/:slug/members/:memberId/promote', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { role } = req.body;
    const crew = await prisma.crew.findUnique({ where: { slug: req.params.slug as string } });
    if (!crew) return res.status(404).json({ error: 'Crew not found' });

    // Verify requester is captain
    const myMembership = await prisma.crewMember.findUnique({
      where: { crewId_userId: { crewId: crew.id, userId } },
    });
    if (!myMembership || myMembership.role !== 'CAPTAIN') {
      return res.status(403).json({ error: 'Only the captain can manage roles' });
    }

    const validRoles = ['MEMBER', 'LIEUTENANT', 'CAPTAIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const targetMembership = await prisma.crewMember.findFirst({
      where: { crewId: crew.id, userId: req.params.memberId as string },
    });
    if (!targetMembership) return res.status(404).json({ error: 'Member not found' });

    // If promoting to captain, demote self to lieutenant
    if (role === 'CAPTAIN') {
      await prisma.crewMember.update({
        where: { id: myMembership.id },
        data: { role: 'LIEUTENANT' },
      });
    }

    await prisma.crewMember.update({
      where: { id: targetMembership.id },
      data: { role: role as any },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Promote error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

async function recalcCrewStats(crewId: string) {
  const members = await prisma.crewMember.findMany({
    where: { crewId },
    include: {
      user: {
        select: {
          points: true,
          fanProfile: { select: { totalCheckins: true, eventsAttended: true } },
        },
      },
    },
  });

  let totalPoints = 0;
  let totalCheckins = 0;
  let totalEvents = 0;

  for (const m of members) {
    totalPoints += m.user.points || 0;
    totalCheckins += m.user.fanProfile?.totalCheckins || 0;
    totalEvents += m.user.fanProfile?.eventsAttended || 0;
  }

  await prisma.crew.update({
    where: { id: crewId },
    data: {
      memberCount: members.length,
      totalPoints,
      totalCheckins,
      totalEvents,
    },
  });
}

export default router;
