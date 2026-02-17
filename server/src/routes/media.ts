import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import { AuthRequest, requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /media — list media items
router.get('/', async (req, res) => {
  try {
    const { type, search } = req.query;

    const where: Record<string, unknown> = {};
    if (type && type !== 'all') where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { tags: { has: search as string } },
        { caption: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.mediaItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return res.json({ media: items });
  } catch (err) {
    console.error('Media fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// GET /media/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.mediaItem.findUnique({ where: { id: String(req.params.id) } });
    if (!item) return res.status(404).json({ error: 'Media item not found' });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch media item' });
  }
});

// POST /media — create a media item (upload metadata)
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, url, thumbnailUrl, size, mimeType, width, height, duration, tags, alt, caption } = req.body;

    if (!name || !type || !url) {
      return res.status(400).json({ error: 'name, type, and url are required' });
    }

    const item = await prisma.mediaItem.create({
      data: {
        name,
        type,
        url,
        thumbnailUrl: thumbnailUrl || null,
        size: size || 0,
        mimeType: mimeType || null,
        width: width || null,
        height: height || null,
        duration: duration || null,
        tags: tags || [],
        alt: alt || null,
        caption: caption || null,
        uploadedBy: req.userId,
      },
    });

    return res.status(201).json(item);
  } catch (err) {
    console.error('Media create error:', err);
    return res.status(500).json({ error: 'Failed to create media item' });
  }
});

// PUT /media/:id — update media metadata
router.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, tags, alt, caption, url, thumbnailUrl } = req.body;

    const data: Prisma.MediaItemUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (tags !== undefined) data.tags = { set: tags };
    if (alt !== undefined) data.alt = alt;
    if (caption !== undefined) data.caption = caption;
    if (url !== undefined) data.url = url;
    if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl;

    const item = await prisma.mediaItem.update({
      where: { id: String(req.params.id) },
      data,
    });

    return res.json(item);
  } catch (err) {
    console.error('Media update error:', err);
    return res.status(500).json({ error: 'Failed to update media item' });
  }
});

// DELETE /media/:id — delete a media item
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.mediaItem.delete({ where: { id: String(req.params.id) } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Media delete error:', err);
    return res.status(500).json({ error: 'Failed to delete media item' });
  }
});

// DELETE /media — bulk delete
router.delete('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await prisma.mediaItem.deleteMany({
      where: { id: { in: ids } },
    });

    return res.json({ deleted: result.count });
  } catch (err) {
    console.error('Media bulk delete error:', err);
    return res.status(500).json({ error: 'Failed to delete media items' });
  }
});

export default router;
