import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { getTier } from '../lib/tiers';
import { AuthRequest, generateToken, requireAuth } from '../middleware/auth';
import { evaluateHandleAttempt, generateSafeHandle } from '../services/handle-moderation';

const router = Router();

function formatUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    role: user.role.toLowerCase(),
    schoolId: user.schoolId,
    propertyId: user.propertyId,
    propertyLeague: user.propertyLeague,
    favoriteSchool: user.favoriteSchool,
    favoriteTeams: user.favoriteTeams || [],
    favoriteSports: user.favoriteSports || [],
    supportingSchools: user.supportingSchools || [],
    emailVerified: user.emailVerified,
    emailUpdates: user.emailUpdates,
    pushNotifications: user.pushNotifications,
    acceptedTerms: user.acceptedTerms,
    userType: user.userType,
    birthYear: user.birthYear,
    residingCity: user.residingCity,
    residingState: user.residingState,
    teammatePermissions: user.teammatePermissions,
    invitedBy: user.invitedBy,
    points: user.points,
    tier: user.tier,
    handleWarnings: user.handleWarnings,
    handleLockedUntil: user.handleLockedUntil?.toISOString() || null,
    handleAutoAssigned: user.handleAutoAssigned,
    createdAt: user.createdAt.toISOString(),
    lastLogin: user.lastLogin?.toISOString() || null,
  };
}

// POST /auth/check-handle — Pre-check a handle before registration
router.post('/check-handle', async (req, res) => {
  try {
    const { handle, name, currentWarnings } = req.body;
    if (!handle) return res.status(400).json({ error: 'Handle is required' });

    const result = evaluateHandleAttempt(handle, name || 'User', currentWarnings || 0);
    return res.json(result);
  } catch (err: any) {
    console.error('Check handle error:', err);
    return res.status(500).json({ error: 'Handle check failed' });
  }
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, handle, favoriteSchool, supportingSchools, emailUpdates, pushNotifications, acceptedTerms, userType, birthYear, residingCity, residingState } = req.body;

    if (!email || !password || !name || !handle) {
      return res.status(400).json({ error: 'Email, password, name, and handle are required' });
    }

    // Check handle for inappropriate content
    const modResult = evaluateHandleAttempt(handle, name, 0);

    if (!modResult.allowed && !modResult.forced) {
      // Return the warning — the client tracks the warning count client-side during registration
      return res.status(422).json({
        error: modResult.message,
        handleModeration: modResult,
      });
    }

    // Determine the final handle: either their choice (clean) or the forced safe handle
    let finalHandle = handle;
    let handleWarnings = 0;
    let handleLockedUntil: Date | null = null;
    let handleAutoAssigned = false;

    if (modResult.forced) {
      // Force-assign safe handle
      finalHandle = modResult.forcedHandle!;
      handleWarnings = 3;
      handleLockedUntil = new Date(modResult.lockedUntil!);
      handleAutoAssigned = true;

      // Ensure the auto-generated handle doesn't collide — append random digits if it does
      let collision = await prisma.rallyUser.findUnique({ where: { handle: finalHandle } });
      while (collision) {
        finalHandle = finalHandle.replace(/\d+$/, '') + String(Math.floor(100 + Math.random() * 900));
        collision = await prisma.rallyUser.findUnique({ where: { handle: finalHandle } });
      }
    }

    const existing = await prisma.rallyUser.findFirst({
      where: { OR: [{ email }, { handle: finalHandle }] },
    });
    if (existing) {
      return res.status(409).json({ error: existing.email === email ? 'Email already registered' : 'Handle already taken' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.rallyUser.create({
      data: {
        email,
        password: hashed,
        name,
        handle: finalHandle,
        favoriteSchool: favoriteSchool || null,
        supportingSchools: supportingSchools || [],
        emailUpdates: emailUpdates ?? true,
        pushNotifications: pushNotifications ?? true,
        acceptedTerms: acceptedTerms ?? false,
        userType: userType || null,
        birthYear: birthYear || null,
        residingCity: residingCity || null,
        residingState: residingState || null,
        handleWarnings,
        handleLockedUntil,
        handleAutoAssigned,
        lastLogin: new Date(),
      },
    });

    const token = generateToken(user.id);
    return res.status(201).json({
      token,
      user: formatUser(user),
      ...(handleAutoAssigned ? { handleModeration: modResult } : {}),
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.rallyUser.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await prisma.rallyUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken(user.id);
    return res.json({ token, user: formatUser(user) });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.rallyUser.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: formatUser(user) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /auth/me
router.put('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, handle, favoriteSchool, supportingSchools, emailUpdates, pushNotifications, userType, birthYear, residingCity, residingState } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (favoriteSchool !== undefined) data.favoriteSchool = favoriteSchool;
    if (supportingSchools !== undefined) data.supportingSchools = supportingSchools;
    if (emailUpdates !== undefined) data.emailUpdates = emailUpdates;
    if (pushNotifications !== undefined) data.pushNotifications = pushNotifications;
    if (userType !== undefined) data.userType = userType;
    if (birthYear !== undefined) data.birthYear = birthYear;
    if (residingCity !== undefined) data.residingCity = residingCity;
    if (residingState !== undefined) data.residingState = residingState;

    // Handle change requires moderation check
    if (handle !== undefined) {
      const currentUser = await prisma.rallyUser.findUnique({ where: { id: req.userId } });
      if (!currentUser) return res.status(404).json({ error: 'User not found' });

      // Check if handle is locked (72-hour cooldown after forced rename)
      if (currentUser.handleLockedUntil && new Date() < currentUser.handleLockedUntil) {
        return res.status(403).json({
          error: `Your handle is locked until ${currentUser.handleLockedUntil.toISOString()}. You can change it after the cooldown period.`,
          handleLockedUntil: currentUser.handleLockedUntil.toISOString(),
        });
      }

      // Check the new handle for inappropriate content
      const modResult = evaluateHandleAttempt(handle, currentUser.name, currentUser.handleWarnings);

      if (!modResult.allowed) {
        if (modResult.forced) {
          // 3rd strike: force-assign and lock
          let safeHandle = modResult.forcedHandle!;
          let collision = await prisma.rallyUser.findUnique({ where: { handle: safeHandle } });
          while (collision) {
            safeHandle = safeHandle.replace(/\d+$/, '') + String(Math.floor(100 + Math.random() * 900));
            collision = await prisma.rallyUser.findUnique({ where: { handle: safeHandle } });
          }

          const user = await prisma.rallyUser.update({
            where: { id: req.userId },
            data: {
              ...data,
              handle: safeHandle,
              handleWarnings: 3,
              handleLockedUntil: new Date(modResult.lockedUntil!),
              handleAutoAssigned: true,
            },
          });

          return res.status(422).json({
            user: formatUser(user),
            handleModeration: { ...modResult, forcedHandle: safeHandle },
          });
        }

        // Warning (1 or 2): increment warning count, reject the handle change
        await prisma.rallyUser.update({
          where: { id: req.userId },
          data: { handleWarnings: modResult.warningNumber },
        });

        return res.status(422).json({
          error: modResult.message,
          handleModeration: modResult,
        });
      }

      // Handle is clean — apply it
      data.handle = handle;
      // If they previously had an auto-assigned handle, clear the flag
      if (currentUser.handleAutoAssigned) {
        data.handleAutoAssigned = false;
      }
    }

    const user = await prisma.rallyUser.update({
      where: { id: req.userId },
      data,
    });

    return res.json(formatUser(user));
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That handle is already taken' });
    }
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { code } = req.body;
    // In production, verify against stored code. For now, accept any 6-digit code.
    if (!code || code.length < 4) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    return res.json({ message: 'Email verified successfully' });
  } catch {
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /auth/resend-verification
router.post('/resend-verification', async (_req, res) => {
  try {
    const resetCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    return res.json({ message: 'Verification email sent', resetCode });
  } catch {
    return res.status(500).json({ error: 'Failed to resend verification' });
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.rallyUser.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If that email exists, a reset code has been sent' });
    }

    const resetCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    return res.json({ message: 'Reset code sent', resetCode });
  } catch {
    return res.status(500).json({ error: 'Failed to process reset request' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    const user = await prisma.rallyUser.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.rallyUser.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return res.json({ message: 'Password reset successfully' });
  } catch {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
