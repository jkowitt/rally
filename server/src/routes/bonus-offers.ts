import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth } from '../middleware/auth';

const router = Router();

function formatOffer(o: any) {
  return {
    id: o.id,
    name: o.name,
    description: o.description,
    bonusMultiplier: o.bonusMultiplier,
    bonusPoints: o.bonusPoints,
    activationType: o.activationType,
    startsAt: o.startsAt.toISOString(),
    expiresAt: o.expiresAt.toISOString(),
    isActive: o.isActive,
    createdBy: o.createdBy,
    createdAt: o.createdAt.toISOString(),
  };
}

// GET /schools/:schoolId/bonus-offers
router.get('/schools/:schoolId/bonus-offers', requireAuth, async (req, res) => {
  try {
    const offers = await prisma.bonusOffer.findMany({
      where: { schoolId: String(req.params.schoolId) },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ bonusOffers: offers.map(formatOffer) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch bonus offers' });
  }
});

// POST /schools/:schoolId/bonus-offers
router.post('/schools/:schoolId/bonus-offers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, description, bonusMultiplier, bonusPoints, activationType, startsAt, expiresAt } = req.body;
    if (!name || !expiresAt) {
      return res.status(400).json({ error: 'Name and expiresAt are required' });
    }

    const offer = await prisma.bonusOffer.create({
      data: {
        schoolId: String(req.params.schoolId),
        name,
        description: description || null,
        bonusMultiplier: bonusMultiplier || null,
        bonusPoints: bonusPoints || null,
        activationType: activationType || null,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        expiresAt: new Date(expiresAt),
        createdBy: req.userId!,
      },
    });

    return res.status(201).json(formatOffer(offer));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create bonus offer' });
  }
});

// PUT /schools/:schoolId/bonus-offers/:offerId
router.put('/schools/:schoolId/bonus-offers/:offerId', requireAuth, async (req, res) => {
  try {
    const { name, description, bonusMultiplier, bonusPoints, activationType, startsAt, expiresAt, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (bonusMultiplier !== undefined) data.bonusMultiplier = bonusMultiplier;
    if (bonusPoints !== undefined) data.bonusPoints = bonusPoints;
    if (activationType !== undefined) data.activationType = activationType;
    if (startsAt !== undefined) data.startsAt = new Date(startsAt);
    if (expiresAt !== undefined) data.expiresAt = new Date(expiresAt);
    if (isActive !== undefined) data.isActive = isActive;

    const offer = await prisma.bonusOffer.update({
      where: { id: String(req.params.offerId) },
      data,
    });

    return res.json(formatOffer(offer));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update bonus offer' });
  }
});

// DELETE /schools/:schoolId/bonus-offers/:offerId
router.delete('/schools/:schoolId/bonus-offers/:offerId', requireAuth, async (req, res) => {
  try {
    await prisma.bonusOffer.delete({ where: { id: String(req.params.offerId) } });
    return res.json({ message: 'Bonus offer deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete bonus offer' });
  }
});

export default router;
