import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();

function formatOffer(o: any) {
  return {
    id: o.id,
    brand: o.brand,
    title: o.title,
    description: o.description,
    category: o.category,
    affiliateUrl: o.affiliateUrl,
    imageUrl: o.imageUrl,
    pointsCost: o.pointsCost,
    sport: o.sport,
    priority: o.priority,
    isActive: o.isActive,
    clickCount: o.clickCount,
    redeemCount: o.redeemCount,
    createdAt: o.createdAt?.toISOString(),
  };
}

// GET /affiliates — public list of active offers
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Check if affiliates are enabled
    const settings = await prisma.monetizationSettings.findUnique({ where: { id: 'global' } });
    if (settings && !settings.affiliatesEnabled) {
      return res.json({ offers: [], total: 0, enabled: false });
    }

    const { category, sport } = req.query;
    const where: any = { isActive: true };
    if (category) where.category = (category as string).toUpperCase();
    if (sport) where.sport = sport as string;

    const maxPerPage = settings?.affiliateMaxPerPage || 20;

    const offers = await prisma.affiliateOffer.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: maxPerPage,
    });

    return res.json({
      offers: offers.map(formatOffer),
      total: offers.length,
      enabled: true,
    });
  } catch (err) {
    console.error('Affiliates fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch affiliate offers' });
  }
});

// GET /affiliates/all — admin view of all offers (active + inactive)
router.get('/all', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const offers = await prisma.affiliateOffer.findMany({
      orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
    return res.json({ offers: offers.map(formatOffer), total: offers.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch affiliate offers' });
  }
});

// POST /affiliates — create offer (admin+)
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { brand, title, description, category, affiliateUrl, imageUrl, pointsCost, commissionType, commissionValue, sport, priority } = req.body;

    if (!brand || !title || !category || !affiliateUrl) {
      return res.status(400).json({ error: 'brand, title, category, and affiliateUrl are required' });
    }

    const offer = await prisma.affiliateOffer.create({
      data: {
        brand,
        title,
        description: description || null,
        category: category.toUpperCase(),
        affiliateUrl,
        imageUrl: imageUrl || null,
        pointsCost: pointsCost || 0,
        commissionType: commissionType || null,
        commissionValue: commissionValue || null,
        sport: sport || null,
        priority: priority || 0,
      },
    });

    return res.status(201).json(formatOffer(offer));
  } catch (err) {
    console.error('Affiliate create error:', err);
    return res.status(500).json({ error: 'Failed to create affiliate offer' });
  }
});

// PUT /affiliates/:offerId — update offer (admin+)
router.put('/:offerId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { brand, title, description, category, affiliateUrl, imageUrl, pointsCost, commissionType, commissionValue, sport, priority, isActive } = req.body;

    const data: any = {};
    if (brand !== undefined) data.brand = brand;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category.toUpperCase();
    if (affiliateUrl !== undefined) data.affiliateUrl = affiliateUrl;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (pointsCost !== undefined) data.pointsCost = pointsCost;
    if (commissionType !== undefined) data.commissionType = commissionType;
    if (commissionValue !== undefined) data.commissionValue = commissionValue;
    if (sport !== undefined) data.sport = sport;
    if (priority !== undefined) data.priority = priority;
    if (isActive !== undefined) data.isActive = isActive;

    const offer = await prisma.affiliateOffer.update({
      where: { id: String(req.params.offerId) },
      data,
    });

    return res.json(formatOffer(offer));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update affiliate offer' });
  }
});

// DELETE /affiliates/:offerId — delete offer (admin+)
router.delete('/:offerId', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.affiliateOffer.delete({ where: { id: String(req.params.offerId) } });
    return res.json({ message: 'Affiliate offer deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete affiliate offer' });
  }
});

// POST /affiliates/:offerId/click — track click-through
router.post('/:offerId/click', optionalAuth, async (req, res) => {
  try {
    const offer = await prisma.affiliateOffer.update({
      where: { id: String(req.params.offerId) },
      data: { clickCount: { increment: 1 } },
    });

    // Also bump global counter
    await prisma.monetizationSettings.upsert({
      where: { id: 'global' },
      update: { totalAffiliateClicks: { increment: 1 } },
      create: { id: 'global', totalAffiliateClicks: 1 },
    });

    return res.json({ affiliateUrl: offer.affiliateUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to track click' });
  }
});

// POST /affiliates/:offerId/redeem — redeem with points
router.post('/:offerId/redeem', requireAuth, async (req: AuthRequest, res) => {
  try {
    const offer = await prisma.affiliateOffer.findUnique({ where: { id: String(req.params.offerId) } });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (!offer.isActive) return res.status(400).json({ error: 'Offer is no longer active' });

    if (offer.pointsCost > 0) {
      const user = await prisma.rallyUser.findUnique({ where: { id: req.userId } });
      if (!user || user.points < offer.pointsCost) {
        return res.status(400).json({ error: 'Not enough points' });
      }

      await prisma.rallyUser.update({
        where: { id: req.userId },
        data: { points: { decrement: offer.pointsCost } },
      });
    }

    await prisma.affiliateOffer.update({
      where: { id: offer.id },
      data: { redeemCount: { increment: 1 } },
    });

    await prisma.monetizationSettings.upsert({
      where: { id: 'global' },
      update: { totalAffiliateRedemptions: { increment: 1 } },
      create: { id: 'global', totalAffiliateRedemptions: 1 },
    });

    return res.json({ affiliateUrl: offer.affiliateUrl, pointsDeducted: offer.pointsCost });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to redeem offer' });
  }
});

export default router;
