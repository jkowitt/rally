import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();

// ─── GET /analytics — dashboard summary (admin+) ───────────────────
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeToday,
      activeWeek,
      activeMonth,
      eventsTracked,
      verifiedUsers,
      totalPoints,
      totalCrews,
      totalLobbyCheckins,
    ] = await Promise.all([
      prisma.rallyUser.count(),
      prisma.rallyUser.count({ where: { lastLogin: { gte: oneDayAgo } } }),
      prisma.rallyUser.count({ where: { lastLogin: { gte: sevenDaysAgo } } }),
      prisma.rallyUser.count({ where: { lastLogin: { gte: thirtyDaysAgo } } }),
      prisma.event.count(),
      prisma.rallyUser.count({ where: { emailVerified: true } }),
      prisma.pointsEntry.aggregate({ _sum: { points: true } }),
      prisma.crew.count(),
      prisma.lobbyPresence.count(),
    ]);

    // Users by school
    const users = await prisma.rallyUser.findMany({
      where: { schoolId: { not: null } },
      select: { schoolId: true },
    });
    const usersBySchool: Record<string, number> = {};
    for (const u of users) {
      if (u.schoolId) usersBySchool[u.schoolId] = (usersBySchool[u.schoolId] || 0) + 1;
    }

    // Tier breakdown
    const allUsers = await prisma.rallyUser.findMany({ select: { tier: true } });
    const tierBreakdown: Record<string, number> = {};
    for (const u of allUsers) tierBreakdown[u.tier] = (tierBreakdown[u.tier] || 0) + 1;

    // Recent analytics events
    const recentEvents = await prisma.analyticsEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return res.json({
      totalUsers,
      activeToday,
      activeWeek,
      activeMonth,
      eventsTracked,
      verifiedUsers,
      totalPointsEarned: totalPoints._sum.points || 0,
      totalCrews,
      totalLobbyCheckins,
      dau: activeToday,
      wau: activeWeek,
      mau: activeMonth,
      dauWauRatio: activeWeek > 0 ? Math.round((activeToday / activeWeek) * 100) : 0,
      dauMauRatio: activeMonth > 0 ? Math.round((activeToday / activeMonth) * 100) : 0,
      usersBySchool,
      tierBreakdown,
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

// ─── GET /analytics/growth — user signups over time (admin+) ────────
router.get('/growth', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(String(req.query.days)) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await prisma.rallyUser.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Bucket by day
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const u of users) {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (dailyMap[key] !== undefined) dailyMap[key]++;
    }

    const series = Object.entries(dailyMap).map(([date, count]) => ({ date, signups: count }));

    // Cumulative totals
    const totalBefore = await prisma.rallyUser.count({ where: { createdAt: { lt: since } } });
    let running = totalBefore;
    const cumulative = series.map(s => {
      running += s.signups;
      return { date: s.date, total: running };
    });

    return res.json({ period: `${days}d`, series, cumulative });
  } catch (err) {
    console.error('Growth analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch growth data' });
  }
});

// ─── GET /analytics/engagement — event & points engagement (admin+) ─
router.get('/engagement', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(String(req.query.days)) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pointsEntries = await prisma.pointsEntry.findMany({
      where: { timestamp: { gte: since } },
      select: { points: true, activationName: true, timestamp: true, eventId: true },
      orderBy: { timestamp: 'asc' },
    });

    // Points earned per day
    const dailyPoints: Record<string, number> = {};
    const dailyCheckins: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyPoints[key] = 0;
      dailyCheckins[key] = 0;
    }
    for (const pe of pointsEntries) {
      const key = pe.timestamp.toISOString().slice(0, 10);
      if (dailyPoints[key] !== undefined) {
        dailyPoints[key] += pe.points;
        if (pe.activationName.toLowerCase().includes('check')) {
          dailyCheckins[key]++;
        }
      }
    }

    // Activation type breakdown
    const activationTypes: Record<string, { count: number; totalPoints: number }> = {};
    for (const pe of pointsEntries) {
      const name = pe.activationName;
      if (!activationTypes[name]) activationTypes[name] = { count: 0, totalPoints: 0 };
      activationTypes[name].count++;
      activationTypes[name].totalPoints += pe.points;
    }

    // Top events by participation
    const eventCounts: Record<string, number> = {};
    for (const pe of pointsEntries) {
      if (pe.eventId) eventCounts[pe.eventId] = (eventCounts[pe.eventId] || 0) + 1;
    }
    const topEventIds = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const topEvents = topEventIds.length > 0
      ? await prisma.event.findMany({
          where: { id: { in: topEventIds } },
          select: { id: true, title: true, sport: true, dateTime: true },
        })
      : [];

    const topEventsWithCounts = topEvents.map(e => ({
      ...e,
      participations: eventCounts[e.id] || 0,
    })).sort((a, b) => b.participations - a.participations);

    // Sport breakdown
    const sportCounts: Record<string, number> = {};
    for (const e of topEvents) {
      if (e.sport) sportCounts[e.sport] = (sportCounts[e.sport] || 0) + (eventCounts[e.id] || 0);
    }

    return res.json({
      period: `${days}d`,
      dailyPoints: Object.entries(dailyPoints).map(([date, points]) => ({ date, points })),
      dailyCheckins: Object.entries(dailyCheckins).map(([date, checkins]) => ({ date, checkins })),
      activationTypes,
      topEvents: topEventsWithCounts,
      sportBreakdown: sportCounts,
      totals: {
        pointsEarned: pointsEntries.reduce((s, p) => s + p.points, 0),
        interactions: pointsEntries.length,
        uniqueEvents: new Set(pointsEntries.map(p => p.eventId).filter(Boolean)).size,
      },
    });
  } catch (err) {
    console.error('Engagement analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch engagement data' });
  }
});

// ─── GET /analytics/retention — daily active user retention (admin+) ─
router.get('/retention', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const days = 30;

    // DAU for the last 30 days
    const dauSeries: Array<{ date: string; activeUsers: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const count = await prisma.rallyUser.count({
        where: { lastLogin: { gte: dayStart, lt: dayEnd } },
      });
      dauSeries.push({ date: dayStart.toISOString().slice(0, 10), activeUsers: count });
    }

    // Cohort: users who signed up this month who are still active (logged in last 7 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newUsers = await prisma.rallyUser.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const retainedUsers = await prisma.rallyUser.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        lastLogin: { gte: sevenDaysAgo },
      },
    });

    // New users who earned at least one point
    const activatedUsers = await prisma.rallyUser.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        points: { gt: 0 },
      },
    });

    return res.json({
      dauSeries,
      cohort: {
        period: '30d',
        newUsers,
        retainedUsers,
        activatedUsers,
        retentionRate: newUsers > 0 ? Math.round((retainedUsers / newUsers) * 100) : 0,
        activationRate: newUsers > 0 ? Math.round((activatedUsers / newUsers) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('Retention analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch retention data' });
  }
});

// ─── GET /analytics/funnel — signup → activation funnel (admin+) ────
router.get('/funnel', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const totalUsers = await prisma.rallyUser.count();

    // Users who earned at least 1 point
    const usersWithPoints = await prisma.rallyUser.count({ where: { points: { gt: 0 } } });

    // Users who reached Silver tier (500+ points)
    const silverPlus = await prisma.rallyUser.count({
      where: { tier: { in: ['Silver', 'Gold', 'Platinum'] } },
    });

    // Users with a fan profile (engaged enough to build identity)
    const profileCount = await prisma.fanProfile.count();

    // Users in at least one crew (distinct user count)
    const crewMemberGroups = await prisma.crewMember.groupBy({
      by: ['userId'],
    });
    const crewMembers = crewMemberGroups.length;

    // Users who have shared a card
    const sharers = await prisma.shareCard.groupBy({
      by: ['userId'],
      where: { shareCount: { gt: 0 } },
    });

    return res.json({
      funnel: [
        { step: 'Signed Up', count: totalUsers, rate: 100 },
        { step: 'Earned Points', count: usersWithPoints, rate: totalUsers > 0 ? Math.round((usersWithPoints / totalUsers) * 100) : 0 },
        { step: 'Fan Profile Created', count: profileCount, rate: totalUsers > 0 ? Math.round((profileCount / totalUsers) * 100) : 0 },
        { step: 'Joined a Crew', count: crewMembers, rate: totalUsers > 0 ? Math.round((crewMembers / totalUsers) * 100) : 0 },
        { step: 'Reached Silver', count: silverPlus, rate: totalUsers > 0 ? Math.round((silverPlus / totalUsers) * 100) : 0 },
        { step: 'Shared a Card', count: sharers.length, rate: totalUsers > 0 ? Math.round((sharers.length / totalUsers) * 100) : 0 },
      ],
    });
  } catch (err) {
    console.error('Funnel analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch funnel data' });
  }
});

// ─── GET /analytics/monetization — revenue metrics (admin+) ─────────
router.get('/monetization', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const settings = await prisma.monetizationSettings.findUnique({ where: { id: 'global' } });

    // Affiliate offer stats
    const offers = await prisma.affiliateOffer.findMany({
      select: {
        id: true,
        brand: true,
        title: true,
        category: true,
        clickCount: true,
        redeemCount: true,
        pointsCost: true,
        isActive: true,
      },
      orderBy: { clickCount: 'desc' },
    });

    const totalClicks = offers.reduce((s, o) => s + o.clickCount, 0);
    const totalRedemptions = offers.reduce((s, o) => s + o.redeemCount, 0);
    const conversionRate = totalClicks > 0 ? Math.round((totalRedemptions / totalClicks) * 100) : 0;

    // Category breakdown
    const categoryStats: Record<string, { clicks: number; redemptions: number }> = {};
    for (const o of offers) {
      const cat = o.category || 'OTHER';
      if (!categoryStats[cat]) categoryStats[cat] = { clicks: 0, redemptions: 0 };
      categoryStats[cat].clicks += o.clickCount;
      categoryStats[cat].redemptions += o.redeemCount;
    }

    return res.json({
      adMetrics: {
        totalImpressions: settings?.totalAdImpressions || 0,
        admobEnabled: settings?.admobEnabled || false,
        rewardedVideoEnabled: settings?.admobRewardedVideoEnabled || false,
        rewardedPoints: settings?.admobRewardedPoints || 0,
      },
      affiliateMetrics: {
        totalOffers: offers.length,
        activeOffers: offers.filter(o => o.isActive).length,
        totalClicks,
        totalRedemptions,
        conversionRate,
        topOffers: offers.slice(0, 10).map(o => ({
          brand: o.brand,
          title: o.title,
          clicks: o.clickCount,
          redemptions: o.redeemCount,
        })),
        categoryBreakdown: categoryStats,
      },
    });
  } catch (err) {
    console.error('Monetization analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch monetization data' });
  }
});

// ─── GET /analytics/pages — top pages/events tracked (admin+) ───────
router.get('/pages', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(String(req.query.days)) || 7, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await prisma.analyticsEvent.findMany({
      where: { timestamp: { gte: since } },
      select: { event: true, page: true },
    });

    // Top pages
    const pageMap: Record<string, number> = {};
    for (const e of events) {
      if (e.page) pageMap[e.page] = (pageMap[e.page] || 0) + 1;
    }
    const topPages = Object.entries(pageMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([page, views]) => ({ page, views }));

    // Top event types
    const eventMap: Record<string, number> = {};
    for (const e of events) {
      eventMap[e.event] = (eventMap[e.event] || 0) + 1;
    }
    const topEventTypes = Object.entries(eventMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([event, count]) => ({ event, count }));

    return res.json({
      period: `${days}d`,
      totalPageViews: events.length,
      topPages,
      topEventTypes,
    });
  } catch (err) {
    console.error('Pages analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch page analytics' });
  }
});

// ─── GET /analytics/export — CSV export of user data (admin+) ───────
router.get('/export', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const type = String(req.query.type || 'users');

    if (type === 'users') {
      const users = await prisma.rallyUser.findMany({
        select: {
          id: true, name: true, handle: true, email: true, role: true,
          tier: true, points: true, schoolId: true, favoriteSchool: true,
          userType: true, birthYear: true, residingCity: true, residingState: true,
          emailVerified: true, lastLogin: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const header = 'id,name,handle,email,role,tier,points,school,favoriteSchool,userType,birthYear,city,state,emailVerified,lastLogin,createdAt';
      const rows = users.map(u =>
        [u.id, esc(u.name), esc(u.handle), esc(u.email), u.role, u.tier, u.points,
         esc(u.schoolId), esc(u.favoriteSchool), esc(u.userType), u.birthYear || '',
         esc(u.residingCity), esc(u.residingState), u.emailVerified,
         u.lastLogin?.toISOString() || '', u.createdAt.toISOString()].join(',')
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=rally-users.csv');
      return res.send([header, ...rows].join('\n'));
    }

    if (type === 'points') {
      const entries = await prisma.pointsEntry.findMany({
        select: { id: true, userId: true, eventId: true, activationName: true, points: true, schoolId: true, timestamp: true },
        orderBy: { timestamp: 'desc' },
        take: 10000,
      });

      const header = 'id,userId,eventId,activationName,points,schoolId,timestamp';
      const rows = entries.map(e =>
        [e.id, e.userId, e.eventId || '', esc(e.activationName), e.points, e.schoolId || '', e.timestamp.toISOString()].join(',')
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=rally-points.csv');
      return res.send([header, ...rows].join('\n'));
    }

    return res.status(400).json({ error: 'Invalid export type. Use ?type=users or ?type=points' });
  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({ error: 'Failed to export data' });
  }
});

function esc(v: string | null | undefined): string {
  if (!v) return '';
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// ─── POST /analytics/track ──────────────────────────────────────────
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
  } catch {
    return res.status(500).json({ error: 'Failed to track event' });
  }
});

export default router;
