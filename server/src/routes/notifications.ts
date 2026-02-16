import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth } from '../middleware/auth';

const router = Router();

function formatNotification(n: any) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    schoolId: n.schoolId,
    targetAudience: n.targetAudience,
    status: n.status.toLowerCase(),
    scheduledFor: n.scheduledFor?.toISOString() || null,
    sentAt: n.sentAt?.toISOString() || null,
    createdBy: n.createdBy,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

// GET /notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const { schoolId } = req.query;
    const where: any = {};
    if (schoolId) where.schoolId = schoolId as string;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ notifications: notifications.map(formatNotification) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /notifications
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, body, schoolId, targetAudience, scheduledFor } = req.body;
    if (!title || !body || !schoolId) {
      return res.status(400).json({ error: 'Title, body, and schoolId are required' });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        body,
        schoolId,
        targetAudience: targetAudience || 'all',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
        createdBy: req.userId!,
      },
    });

    return res.status(201).json(formatNotification(notification));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create notification' });
  }
});

// PUT /notifications/:notifId
router.put('/:notifId', requireAuth, async (req, res) => {
  try {
    const { title, body, schoolId, targetAudience, scheduledFor } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (body !== undefined) data.body = body;
    if (schoolId !== undefined) data.schoolId = schoolId;
    if (targetAudience !== undefined) data.targetAudience = targetAudience;
    if (scheduledFor !== undefined) data.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;

    const notification = await prisma.notification.update({
      where: { id: String(req.params.notifId) },
      data,
    });

    return res.json(formatNotification(notification));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

// DELETE /notifications/:notifId
router.delete('/:notifId', requireAuth, async (req, res) => {
  try {
    await prisma.notification.delete({ where: { id: String(req.params.notifId) } });
    return res.json({ message: 'Notification deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /notifications/:notifId/send
router.post('/:notifId/send', requireAuth, async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: String(req.params.notifId) },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return res.json(formatNotification(notification));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send notification' });
  }
});

export default router;
