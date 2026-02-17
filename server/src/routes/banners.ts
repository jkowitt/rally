import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import { AuthRequest, requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /banners — list all banners (admin), or active banners for a page (public)
router.get('/', async (req, res) => {
  try {
    const { page, active } = req.query;

    const where: Record<string, unknown> = {};

    if (active === 'true') {
      where.isActive = true;
      // Only return banners within their date range
      const now = new Date();
      where.OR = [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ];
    }

    if (page) {
      where.pages = { has: page as string };
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ banners });
  } catch (err) {
    console.error('Banners fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// GET /banners/:id
router.get('/:id', async (req, res) => {
  try {
    const banner = await prisma.banner.findUnique({ where: { id: String(req.params.id) } });
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    return res.json(banner);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch banner' });
  }
});

// POST /banners — create a banner (admin)
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, imageUrl, linkUrl, altText, position, size, customWidth, customHeight, pages, isActive, startDate, endDate } = req.body;

    if (!name || !imageUrl || !linkUrl) {
      return res.status(400).json({ error: 'name, imageUrl, and linkUrl are required' });
    }

    const banner = await prisma.banner.create({
      data: {
        name,
        imageUrl,
        linkUrl,
        altText: altText || null,
        position: position || 'top',
        size: size || 'leaderboard',
        customWidth: customWidth || null,
        customHeight: customHeight || null,
        pages: pages || [],
        isActive: isActive ?? true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: req.userId,
      },
    });

    return res.status(201).json(banner);
  } catch (err) {
    console.error('Banner create error:', err);
    return res.status(500).json({ error: 'Failed to create banner' });
  }
});

// PUT /banners/:id — update a banner (admin)
router.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, imageUrl, linkUrl, altText, position, size, customWidth, customHeight, pages, isActive, startDate, endDate } = req.body;

    const data: Prisma.BannerUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (linkUrl !== undefined) data.linkUrl = linkUrl;
    if (altText !== undefined) data.altText = altText;
    if (position !== undefined) data.position = position;
    if (size !== undefined) data.size = size;
    if (customWidth !== undefined) data.customWidth = customWidth;
    if (customHeight !== undefined) data.customHeight = customHeight;
    if (pages !== undefined) data.pages = { set: pages };
    if (isActive !== undefined) data.isActive = isActive;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

    const banner = await prisma.banner.update({
      where: { id: String(req.params.id) },
      data,
    });

    return res.json(banner);
  } catch (err) {
    console.error('Banner update error:', err);
    return res.status(500).json({ error: 'Failed to update banner' });
  }
});

// PATCH /banners/:id/track — track impression or click
router.patch('/:id/track', async (req, res) => {
  try {
    const { action } = req.body; // 'impression' or 'click'
    if (action !== 'impression' && action !== 'click') {
      return res.status(400).json({ error: 'action must be "impression" or "click"' });
    }

    const banner = await prisma.banner.update({
      where: { id: String(req.params.id) },
      data: action === 'impression'
        ? { impressions: { increment: 1 } }
        : { clicks: { increment: 1 } },
    });

    return res.json({ impressions: banner.impressions, clicks: banner.clicks });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to track banner' });
  }
});

// DELETE /banners/:id — delete a banner (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.banner.delete({ where: { id: String(req.params.id) } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Banner delete error:', err);
    return res.status(500).json({ error: 'Failed to delete banner' });
  }
});

export default router;
