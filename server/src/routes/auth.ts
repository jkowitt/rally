import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest, generateToken, requireAuth } from '../middleware/auth';
import { evaluateHandleAttempt } from '../services/handle-moderation';
import { validate, registerSchema, loginSchema, checkHandleSchema, updateProfileSchema, resetPasswordSchema } from '../lib/validation';
import type { RallyUser } from '@prisma/client';

const router = Router();

function formatUser(user: RallyUser) {
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
// Uses 0 as warning count — actual enforcement happens at register/update
router.post('/check-handle', validate(checkHandleSchema), async (req, res) => {
  try {
    const { handle, name } = req.body;
    const result = evaluateHandleAttempt(handle, name || 'User', 0);
    return res.json(result);
  } catch (err: unknown) {
    console.error('Check handle error:', err);
    return res.status(500).json({ error: 'Handle check failed' });
  }
});

// POST /auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, name, handle, favoriteSchool, supportingSchools, emailUpdates, pushNotifications, acceptedTerms, userType, birthYear, residingCity, residingState } = req.body;

    const modResult = evaluateHandleAttempt(handle, name, 0);

    if (!modResult.allowed && !modResult.forced) {
      return res.status(422).json({
        error: modResult.message,
        handleModeration: modResult,
      });
    }

    let finalHandle = handle;
    let handleWarnings = 0;
    let handleLockedUntil: Date | null = null;
    let handleAutoAssigned = false;

    if (modResult.forced) {
      finalHandle = modResult.forcedHandle!;
      handleWarnings = 3;
      handleLockedUntil = new Date(modResult.lockedUntil!);
      handleAutoAssigned = true;

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
  } catch (err: unknown) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

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
  } catch (err: unknown) {
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
  } catch {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /auth/me
router.put('/me', requireAuth, validate(updateProfileSchema), async (req: AuthRequest, res) => {
  try {
    const { name, handle, favoriteSchool, supportingSchools, emailUpdates, pushNotifications, userType, birthYear, residingCity, residingState } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (favoriteSchool !== undefined) data.favoriteSchool = favoriteSchool;
    if (supportingSchools !== undefined) data.supportingSchools = supportingSchools;
    if (emailUpdates !== undefined) data.emailUpdates = emailUpdates;
    if (pushNotifications !== undefined) data.pushNotifications = pushNotifications;
    if (userType !== undefined) data.userType = userType;
    if (birthYear !== undefined) data.birthYear = birthYear;
    if (residingCity !== undefined) data.residingCity = residingCity;
    if (residingState !== undefined) data.residingState = residingState;

    if (handle !== undefined) {
      const currentUser = await prisma.rallyUser.findUnique({ where: { id: req.userId } });
      if (!currentUser) return res.status(404).json({ error: 'User not found' });

      if (currentUser.handleLockedUntil && new Date() < currentUser.handleLockedUntil) {
        return res.status(403).json({
          error: `Your handle is locked until ${currentUser.handleLockedUntil.toISOString()}. You can change it after the cooldown period.`,
          handleLockedUntil: currentUser.handleLockedUntil.toISOString(),
        });
      }

      // Use SERVER-SIDE warning count
      const modResult = evaluateHandleAttempt(handle, currentUser.name, currentUser.handleWarnings);

      if (!modResult.allowed) {
        if (modResult.forced) {
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

        await prisma.rallyUser.update({
          where: { id: req.userId },
          data: { handleWarnings: modResult.warningNumber },
        });

        return res.status(422).json({
          error: modResult.message,
          handleModeration: modResult,
        });
      }

      data.handle = handle;
      if (currentUser.handleAutoAssigned) {
        data.handleAutoAssigned = false;
      }
    }

    const user = await prisma.rallyUser.update({
      where: { id: req.userId },
      data,
    });

    return res.json(formatUser(user));
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === 'P2002') {
      return res.status(409).json({ error: 'That handle is already taken' });
    }
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { code } = req.body;
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
      return res.json({ message: 'If that email exists, a reset code has been sent' });
    }

    const resetCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    return res.json({ message: 'Reset code sent', resetCode });
  } catch {
    return res.status(500).json({ error: 'Failed to process reset request' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { email, newPassword } = req.body;

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
