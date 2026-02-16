import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /teammates
router.get('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { propertyId } = req.query;

    // Get teammates (users with TEAMMATE role)
    const where: any = { role: 'TEAMMATE' };
    if (propertyId) where.propertyId = propertyId as string;

    const teammates = await prisma.rallyUser.findMany({ where });

    // Get pending invitations
    const invitations = await prisma.teammateInvitation.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      teammates: teammates.map(t => ({
        id: t.id,
        email: t.email,
        name: t.name,
        handle: t.handle,
        role: t.role.toLowerCase(),
        propertyId: t.propertyId,
        propertyLeague: t.propertyLeague,
        teammatePermissions: t.teammatePermissions,
        invitedBy: t.invitedBy,
        createdAt: t.createdAt.toISOString(),
        lastLogin: t.lastLogin?.toISOString() || null,
      })),
      pendingInvitations: invitations.map(i => ({
        id: i.id,
        email: i.email,
        name: i.name,
        propertyId: i.propertyId,
        propertyLeague: i.propertyLeague,
        permissions: i.permissions,
        invitedBy: i.invitedBy,
        invitedByName: i.invitedByName,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        acceptedAt: i.acceptedAt?.toISOString() || null,
        userId: i.userId,
      })),
      total: teammates.length,
      pending: invitations.length,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch teammates' });
  }
});

// POST /teammates/invite
router.post('/invite', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, name, permissions } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const inviter = await prisma.rallyUser.findUnique({ where: { id: req.userId } });
    if (!inviter) return res.status(404).json({ error: 'Inviter not found' });

    // Check if user already exists
    const existingUser = await prisma.rallyUser.findUnique({ where: { email } });
    if (existingUser && existingUser.role === 'TEAMMATE') {
      return res.status(409).json({ error: 'User is already a teammate' });
    }

    const defaultPermissions = {
      events: true,
      engagements: true,
      rewards: false,
      redemptions: false,
      notifications: false,
      bonusOffers: false,
      content: false,
      analytics: false,
    };

    const invitation = await prisma.teammateInvitation.create({
      data: {
        email,
        name: name || null,
        propertyId: inviter.propertyId,
        propertyLeague: inviter.propertyLeague,
        permissions: permissions || defaultPermissions,
        invitedBy: req.userId!,
        invitedByName: inviter.name,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // If existing user, convert them to teammate
    if (existingUser) {
      await prisma.rallyUser.update({
        where: { id: existingUser.id },
        data: {
          role: 'TEAMMATE',
          teammatePermissions: permissions || defaultPermissions,
          invitedBy: req.userId,
          propertyId: inviter.propertyId,
          propertyLeague: inviter.propertyLeague,
        },
      });

      await prisma.teammateInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt: new Date(), userId: existingUser.id },
      });

      return res.status(201).json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          name: invitation.name,
          status: 'accepted',
          createdAt: invitation.createdAt.toISOString(),
          expiresAt: invitation.expiresAt.toISOString(),
        },
        message: 'Existing user converted to teammate',
        converted: true,
      });
    }

    return res.status(201).json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        propertyId: invitation.propertyId,
        propertyLeague: invitation.propertyLeague,
        permissions: invitation.permissions,
        invitedBy: invitation.invitedBy,
        invitedByName: invitation.invitedByName,
        status: invitation.status,
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
        acceptedAt: null,
        userId: null,
      },
      message: 'Invitation sent',
    });
  } catch (err) {
    console.error('Invite error:', err);
    return res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// PUT /teammates/:teammateId/permissions
router.put('/:teammateId/permissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions) return res.status(400).json({ error: 'Permissions are required' });

    const teammate = await prisma.rallyUser.findUnique({ where: { id: String(req.params.teammateId) } });
    if (!teammate) return res.status(404).json({ error: 'Teammate not found' });

    // Merge with existing permissions
    const existingPerms = (teammate.teammatePermissions as any) || {};
    const merged = { ...existingPerms, ...permissions };

    const updated = await prisma.rallyUser.update({
      where: { id: String(req.params.teammateId) },
      data: { teammatePermissions: merged },
    });

    return res.json({
      teammate: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        teammatePermissions: updated.teammatePermissions,
      },
      message: 'Permissions updated',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// DELETE /teammates/:teammateId
router.delete('/:teammateId', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.rallyUser.update({
      where: { id: String(req.params.teammateId) },
      data: {
        role: 'USER',
        teammatePermissions: Prisma.DbNull,
        invitedBy: null,
        propertyId: null,
        propertyLeague: null,
      },
    });
    return res.json({ message: 'Teammate removed' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove teammate' });
  }
});

// DELETE /teammates/invitations/:invitationId
router.delete('/invitations/:invitationId', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.teammateInvitation.delete({ where: { id: String(req.params.invitationId) } });
    return res.json({ message: 'Invitation cancelled' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

export default router;
