import { Router } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, requireAuth } from '../middleware/auth';

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

// GET /users
router.get('/', requireAuth, async (_req, res) => {
  try {
    const users = await prisma.rallyUser.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users.map(formatUser));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /users/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await prisma.rallyUser.findUnique({ where: { id: String(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(formatUser(user));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /users/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, handle, role, schoolId, propertyId, propertyLeague, favoriteSchool, supportingSchools, emailUpdates, pushNotifications, userType, birthYear, residingCity, residingState, teammatePermissions } = req.body;

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

export default router;
