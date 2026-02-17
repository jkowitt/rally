import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth, requireAdmin, requireDeveloper } from '../middleware/auth';

const router = Router();

function formatUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    handle: u.handle,
    role: u.role.toLowerCase(),
    schoolId: u.schoolId,
    propertyId: u.propertyId,
    propertyLeague: u.propertyLeague,
    favoriteSchool: u.favoriteSchool,
    favoriteTeams: u.favoriteTeams || [],
    favoriteSports: u.favoriteSports || [],
    supportingSchools: u.supportingSchools || [],
    emailVerified: u.emailVerified,
    emailUpdates: u.emailUpdates,
    pushNotifications: u.pushNotifications,
    acceptedTerms: u.acceptedTerms,
    userType: u.userType,
    birthYear: u.birthYear,
    residingCity: u.residingCity,
    residingState: u.residingState,
    teammatePermissions: u.teammatePermissions,
    invitedBy: u.invitedBy,
    points: u.points,
    tier: u.tier,
    createdAt: u.createdAt?.toISOString(),
    lastLogin: u.lastLogin?.toISOString() || null,
  };
}

// GET /users/flagged-handles — List users with handle warnings or forced renames (admin)
router.get('/flagged-handles', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const flaggedUsers = await prisma.rallyUser.findMany({
      where: {
        OR: [
          { handleWarnings: { gt: 0 } },
          { handleAutoAssigned: true },
        ],
      },
      select: {
        id: true,
        name: true,
        handle: true,
        email: true,
        handleWarnings: true,
        handleLockedUntil: true,
        handleAutoAssigned: true,
        createdAt: true,
      },
      orderBy: { handleWarnings: 'desc' },
    });
    return res.json({ flaggedUsers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch flagged handles' });
  }
});

// GET /users (admin+ only)
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.rallyUser.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users.map(formatUser));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /users/:id (admin+ only)
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await prisma.rallyUser.findUnique({ where: { id: String(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(formatUser(user));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /users/:id (admin+ can edit, but ONLY developer can change roles)
router.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, handle, role, schoolId, propertyId, propertyLeague, favoriteSchool, supportingSchools, emailUpdates, pushNotifications, userType, birthYear, residingCity, residingState, teammatePermissions } = req.body;

    // Role changes require DEVELOPER permission
    if (role !== undefined) {
      if (req.userRole !== 'developer') {
        return res.status(403).json({ error: 'Only the developer can change user roles' });
      }
      // Cannot create another developer
      const targetRole = role.toUpperCase();
      if (targetRole === 'DEVELOPER') {
        return res.status(403).json({ error: 'Cannot assign developer role' });
      }
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (handle !== undefined) data.handle = handle;
    if (role !== undefined) data.role = role.toUpperCase();
    if (schoolId !== undefined) data.schoolId = schoolId;
    if (propertyId !== undefined) data.propertyId = propertyId;
    if (propertyLeague !== undefined) data.propertyLeague = propertyLeague;
    if (favoriteSchool !== undefined) data.favoriteSchool = favoriteSchool;
    if (supportingSchools !== undefined) data.supportingSchools = supportingSchools;
    if (emailUpdates !== undefined) data.emailUpdates = emailUpdates;
    if (pushNotifications !== undefined) data.pushNotifications = pushNotifications;
    if (userType !== undefined) data.userType = userType;
    if (birthYear !== undefined) data.birthYear = birthYear;
    if (residingCity !== undefined) data.residingCity = residingCity;
    if (residingState !== undefined) data.residingState = residingState;
    if (teammatePermissions !== undefined) data.teammatePermissions = teammatePermissions;

    const user = await prisma.rallyUser.update({
      where: { id: String(req.params.id) },
      data,
    });

    return res.json(formatUser(user));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /users/:id/reset-handle — Admin resets a user's handle warnings and lock (admin)
router.put('/:id/reset-handle', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.params.id);
    const { handle } = req.body;

    const updateData: any = {
      handleWarnings: 0,
      handleLockedUntil: null,
      handleAutoAssigned: false,
    };

    // Admin can optionally set a new clean handle
    if (handle) {
      updateData.handle = handle;
    }

    const user = await prisma.rallyUser.update({
      where: { id: userId },
      data: updateData,
    });

    return res.json(formatUser(user));
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'That handle is already taken' });
    return res.status(500).json({ error: 'Failed to reset handle' });
  }
});

export default router;
