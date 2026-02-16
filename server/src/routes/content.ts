import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /content
router.get('/', async (_req, res) => {
  try {
    const content = await prisma.contentItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({
      content: content.map(c => ({
        id: c.id,
        type: c.type,
        title: c.title,
        body: c.body,
        imageUrl: c.imageUrl,
        author: c.author,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Content fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch content' });
  }
});

export default router;
