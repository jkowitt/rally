import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

// Require DEVELOPER role for settings management
async function requireDeveloper(req: AuthRequest, res: any, next: any) {
  if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
  const user = await prisma.rallyUser.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'DEVELOPER') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  next();
}

function formatSettings(s: any) {
  return {
    // Affiliates
    affiliatesEnabled: s.affiliatesEnabled,
    affiliateMaxPerPage: s.affiliateMaxPerPage,
    // AdMob
    admobEnabled: s.admobEnabled,
    admobBannerId: s.admobBannerId,
    admobInterstitialId: s.admobInterstitialId,
    admobRewardedVideoId: s.admobRewardedVideoId,
    admobBannerEnabled: s.admobBannerEnabled,
    admobInterstitialEnabled: s.admobInterstitialEnabled,
    admobRewardedVideoEnabled: s.admobRewardedVideoEnabled,
    admobRewardedPoints: s.admobRewardedPoints,
    // Revenue stats
    totalAffiliateClicks: s.totalAffiliateClicks,
    totalAffiliateRedemptions: s.totalAffiliateRedemptions,
    totalAdImpressions: s.totalAdImpressions,
    updatedAt: s.updatedAt?.toISOString(),
  };
}

// GET /monetization/settings — get current settings (developer only)
router.get('/settings', requireAuth, requireDeveloper, async (_req, res) => {
  try {
    let settings = await prisma.monetizationSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await prisma.monetizationSettings.create({ data: { id: 'global' } });
    }
    return res.json(formatSettings(settings));
  } catch (err) {
    console.error('Monetization settings fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /monetization/settings — update settings (developer only)
router.put('/settings', requireAuth, requireDeveloper, async (req: AuthRequest, res) => {
  try {
    const {
      affiliatesEnabled,
      affiliateMaxPerPage,
      admobEnabled,
      admobBannerId,
      admobInterstitialId,
      admobRewardedVideoId,
      admobBannerEnabled,
      admobInterstitialEnabled,
      admobRewardedVideoEnabled,
      admobRewardedPoints,
    } = req.body;

    const data: any = {};
    if (affiliatesEnabled !== undefined) data.affiliatesEnabled = affiliatesEnabled;
    if (affiliateMaxPerPage !== undefined) data.affiliateMaxPerPage = affiliateMaxPerPage;
    if (admobEnabled !== undefined) data.admobEnabled = admobEnabled;
    if (admobBannerId !== undefined) data.admobBannerId = admobBannerId;
    if (admobInterstitialId !== undefined) data.admobInterstitialId = admobInterstitialId;
    if (admobRewardedVideoId !== undefined) data.admobRewardedVideoId = admobRewardedVideoId;
    if (admobBannerEnabled !== undefined) data.admobBannerEnabled = admobBannerEnabled;
    if (admobInterstitialEnabled !== undefined) data.admobInterstitialEnabled = admobInterstitialEnabled;
    if (admobRewardedVideoEnabled !== undefined) data.admobRewardedVideoEnabled = admobRewardedVideoEnabled;
    if (admobRewardedPoints !== undefined) data.admobRewardedPoints = admobRewardedPoints;

    const settings = await prisma.monetizationSettings.upsert({
      where: { id: 'global' },
      update: data,
      create: { id: 'global', ...data },
    });

    return res.json(formatSettings(settings));
  } catch (err) {
    console.error('Monetization settings update error:', err);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /monetization/config — public config for the frontend (ad unit IDs + feature flags)
router.get('/config', optionalAuth, async (_req, res) => {
  try {
    const settings = await prisma.monetizationSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      return res.json({
        affiliatesEnabled: true,
        admobEnabled: false,
        admobBannerEnabled: false,
        admobInterstitialEnabled: false,
        admobRewardedVideoEnabled: false,
        admobRewardedPoints: 50,
        admobBannerId: null,
        admobInterstitialId: null,
        admobRewardedVideoId: null,
      });
    }

    return res.json({
      affiliatesEnabled: settings.affiliatesEnabled,
      admobEnabled: settings.admobEnabled,
      admobBannerEnabled: settings.admobEnabled && settings.admobBannerEnabled,
      admobInterstitialEnabled: settings.admobEnabled && settings.admobInterstitialEnabled,
      admobRewardedVideoEnabled: settings.admobEnabled && settings.admobRewardedVideoEnabled,
      admobRewardedPoints: settings.admobRewardedPoints,
      // Only send ad unit IDs if ads are enabled
      admobBannerId: settings.admobEnabled && settings.admobBannerEnabled ? settings.admobBannerId : null,
      admobInterstitialId: settings.admobEnabled && settings.admobInterstitialEnabled ? settings.admobInterstitialId : null,
      admobRewardedVideoId: settings.admobEnabled && settings.admobRewardedVideoEnabled ? settings.admobRewardedVideoId : null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// POST /monetization/ad-impression — track an ad impression
router.post('/ad-impression', optionalAuth, async (_req, res) => {
  try {
    await prisma.monetizationSettings.upsert({
      where: { id: 'global' },
      update: { totalAdImpressions: { increment: 1 } },
      create: { id: 'global', totalAdImpressions: 1 },
    });
    return res.json({ tracked: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to track impression' });
  }
});

// POST /monetization/rewarded-video — award points for watching a rewarded video
router.post('/rewarded-video', requireAuth, async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.monetizationSettings.findUnique({ where: { id: 'global' } });
    if (!settings?.admobEnabled || !settings?.admobRewardedVideoEnabled) {
      return res.status(400).json({ error: 'Rewarded videos are not enabled' });
    }

    const points = settings.admobRewardedPoints || 50;

    // Award points
    const user = await prisma.rallyUser.update({
      where: { id: req.userId },
      data: { points: { increment: points } },
    });

    // Log the points entry
    await prisma.pointsEntry.create({
      data: {
        userId: req.userId!,
        activationName: 'Rewarded Video',
        points,
      },
    });

    // Track impression
    await prisma.monetizationSettings.update({
      where: { id: 'global' },
      data: { totalAdImpressions: { increment: 1 } },
    });

    return res.json({ pointsAwarded: points, totalPoints: user.points });
  } catch (err) {
    console.error('Rewarded video error:', err);
    return res.status(500).json({ error: 'Failed to award points' });
  }
});

export default router;
