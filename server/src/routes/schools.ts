import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /schools
router.get('/', async (_req, res) => {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({
      schools: schools.map(s => ({
        id: s.id,
        name: s.name,
        mascot: s.mascot,
        conference: s.conference,
        primaryColor: s.primaryColor,
        secondaryColor: s.secondaryColor,
      })),
    });
  } catch (err) {
    console.error('Schools fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

export default router;
