import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

function formatReward(r: any) {
  return {
    id: r.id,
    name: r.name,
    pointsCost: r.pointsCost,
    description: r.description,
    createdAt: r.createdAt?.toISOString(),
  };
}

// GET /schools/:schoolId/rewards
router.get('/schools/:schoolId/rewards', requireAuth, async (req, res) => {
  try {
    const rewards = await prisma.reward.findMany({
      where: { schoolId: String(req.params.schoolId) },
      orderBy: { pointsCost: 'asc' },
    });
    return res.json({ rewards: rewards.map(formatReward) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// POST /schools/:schoolId/rewards
router.post('/schools/:schoolId/rewards', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, pointsCost, description } = req.body;
    if (!name || pointsCost === undefined) {
      return res.status(400).json({ error: 'Name and pointsCost are required' });
    }

    const reward = await prisma.reward.create({
      data: {
        schoolId: String(req.params.schoolId),
        name,
        pointsCost,
        description: description || null,
      },
    });

    return res.status(201).json(formatReward(reward));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create reward' });
  }
});

// PUT /schools/:schoolId/rewards/:rewardId
router.put('/schools/:schoolId/rewards/:rewardId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, pointsCost, description } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (pointsCost !== undefined) data.pointsCost = pointsCost;
    if (description !== undefined) data.description = description;

    const reward = await prisma.reward.update({
      where: { id: String(req.params.rewardId) },
      data,
    });

    return res.json(formatReward(reward));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update reward' });
  }
});

// DELETE /schools/:schoolId/rewards/:rewardId
router.delete('/schools/:schoolId/rewards/:rewardId', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.reward.delete({ where: { id: String(req.params.rewardId) } });
    return res.json({ message: 'Reward deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete reward' });
  }
});

export default router;
