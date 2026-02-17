import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ==============================
// AUTH SCHEMAS
// ==============================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  handle: z.string().min(1, 'Handle is required').max(30),
  favoriteSchool: z.string().nullish(),
  supportingSchools: z.array(z.string()).optional(),
  emailUpdates: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  acceptedTerms: z.boolean().optional(),
  userType: z.enum(['student', 'alumni', 'general_fan']).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  residingCity: z.string().max(100).optional(),
  residingState: z.string().max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const checkHandleSchema = z.object({
  handle: z.string().min(1, 'Handle is required'),
  name: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  handle: z.string().min(1).max(30).optional(),
  favoriteSchool: z.string().nullish(),
  supportingSchools: z.array(z.string()).optional(),
  emailUpdates: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  userType: z.enum(['student', 'alumni', 'general_fan']).nullish(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).nullish(),
  residingCity: z.string().max(100).nullish(),
  residingState: z.string().max(50).nullish(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  newPassword: z.string().min(6),
});

// ==============================
// EVENT SCHEMAS
// ==============================

const activationSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  points: z.number().int().min(0),
  description: z.string().default(''),
});

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  sport: z.string().nullish(),
  homeSchoolId: z.string().min(1, 'Home school is required'),
  homeTeam: z.string().nullish(),
  awaySchoolId: z.string().nullish(),
  awayTeam: z.string().nullish(),
  venue: z.string().nullish(),
  city: z.string().nullish(),
  dateTime: z.string().min(1, 'Date/time is required'),
  status: z.string().optional(),
  activations: z.array(activationSchema).optional(),
});

export const earnPointsSchema = z.object({
  activationId: z.string().min(1, 'Activation ID is required'),
});

// ==============================
// CREWS SCHEMAS
// ==============================

export const createCrewSchema = z.object({
  name: z.string().min(2, 'Crew name must be at least 2 characters').max(50),
  description: z.string().max(200).optional(),
  schoolId: z.string().nullish(),
  sport: z.string().nullish(),
  avatarEmoji: z.string().max(4).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isPublic: z.boolean().optional(),
});

export const promoteSchema = z.object({
  role: z.enum(['MEMBER', 'LIEUTENANT', 'CAPTAIN']),
});

// ==============================
// LOBBY SCHEMAS
// ==============================

export const lobbyReactionSchema = z.object({
  type: z.enum(['FIRE', 'CLAP', 'CRY', 'HORN', 'WAVE', 'HUNDRED']),
});

// ==============================
// FAN PROFILE SCHEMAS
// ==============================

export const profileUpdateSchema = z.object({
  tagline: z.string().max(140).optional(),
  isPublic: z.boolean().optional(),
  profileSlug: z.string().regex(/^[a-z0-9_-]{3,30}$/, 'Slug must be 3-30 chars, lowercase alphanumeric, hyphens, or underscores').nullish(),
});

// ==============================
// SHARE CARD SCHEMAS
// ==============================

export const headToHeadSchema = z.object({
  opponentHandle: z.string().min(1, 'Opponent handle is required'),
});

// ==============================
// ADMIN SCHEMAS
// ==============================

export const adminUpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  handle: z.string().min(1).max(30).optional(),
  role: z.string().optional(),
  schoolId: z.string().nullish(),
  propertyId: z.string().nullish(),
  propertyLeague: z.string().nullish(),
  favoriteSchool: z.string().nullish(),
  supportingSchools: z.array(z.string()).optional(),
  emailUpdates: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  userType: z.string().nullish(),
  birthYear: z.number().int().nullish(),
  residingCity: z.string().nullish(),
  residingState: z.string().nullish(),
  teammatePermissions: z.unknown().optional(),
});

// ==============================
// VALIDATION MIDDLEWARE
// ==============================

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => i.message);
      return res.status(400).json({ error: errors[0], validationErrors: errors });
    }
    req.body = result.data;
    next();
  };
}
