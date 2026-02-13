import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { verifyRecaptchaToken } from '@/lib/recaptcha';

export const dynamic = 'force-dynamic';

// Rate limiting for signup (10 attempts per IP per hour)
const signupRateLimit = new Map<string, { count: number; resetTime: number }>();
const SIGNUP_RATE_LIMIT = 10;
const SIGNUP_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkSignupRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = signupRateLimit.get(ip);
  if (!record || now > record.resetTime) {
    signupRateLimit.set(ip, { count: 1, resetTime: now + SIGNUP_RATE_WINDOW });
    return true;
  }
  if (record.count >= SIGNUP_RATE_LIMIT) return false;
  record.count++;
  return true;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BETA_PLATFORMS = ['VALORA', 'BUSINESS_NOW', 'LEGACY_CRM', 'HUB', 'VENUEVR', 'LOUD_WORKS'] as const;

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkSignupRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: 'Database not configured. Please contact support or try again later.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, password, recaptchaToken } = body;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : body.email;

    // Google Cloud reCAPTCHA Enterprise verification
    const recaptchaResult = await verifyRecaptchaToken(recaptchaToken || '', 'signup');
    if (!recaptchaResult.success) {
      return NextResponse.json(
        { error: 'Security verification failed. Please try again.' },
        { status: 403 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Hash password before the transaction to keep the transaction short
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use a transaction so user + platform access + activity log are atomic.
    // If any step fails the entire signup is rolled back cleanly.
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check if user already exists (inside transaction to prevent race conditions)
      const existingUser = await tx.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error('USER_ALREADY_EXISTS');
      }

      // Create user
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'USER',
          emailVerified: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      // Grant free BETA access to all platforms in parallel
      await Promise.all(
        BETA_PLATFORMS.map((platform) =>
          tx.platformAccess.create({
            data: {
              userId: newUser.id,
              platform,
              enabled: true,
            },
          })
        )
      );

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: newUser.id,
          action: 'beta_user_registered',
          entityType: 'user',
          entityId: newUser.id,
          details: {
            email: newUser.email,
            isBeta: true,
            platformsGranted: BETA_PLATFORMS.length,
          },
        },
      });

      return newUser;
    });

    return NextResponse.json(
      { user, beta: true },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Signup error:', error);

    // Handle our custom "user exists" sentinel from inside the transaction
    if (error instanceof Error && error.message === 'USER_ALREADY_EXISTS') {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    // Handle Prisma-specific errors with proper error codes
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': // Unique constraint violation (race condition on email)
          return NextResponse.json(
            { error: 'An account with this email already exists.' },
            { status: 400 }
          );
        case 'P2021': // Table does not exist
        case 'P2022': // Column does not exist
          console.error('Database schema mismatch — migrations may need to be run:', error.code, error.message);
          return NextResponse.json(
            { error: 'Database setup incomplete. Please contact support.' },
            { status: 503 }
          );
        case 'P2024': // Timed out fetching a connection from the pool
          return NextResponse.json(
            { error: 'The server is experiencing high load. Please try again in a moment.' },
            { status: 503 }
          );
        default:
          console.error('Prisma known error:', error.code, error.message);
          return NextResponse.json(
            { error: 'A database error occurred. Please try again.' },
            { status: 500 }
          );
      }
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error('Prisma initialization error:', error.message);
      return NextResponse.json(
        { error: 'Unable to connect to the database. Please try again later.' },
        { status: 503 }
      );
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('Prisma validation error:', error.message);
      return NextResponse.json(
        { error: 'Invalid data provided. Please check your input and try again.' },
        { status: 400 }
      );
    }

    // Fallback string-based checks for non-Prisma errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('DATABASE_URL')) {
      return NextResponse.json(
        { error: 'Database not configured. Please contact support.' },
        { status: 503 }
      );
    }

    if (errorMessage.includes('Connection') || errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Unable to connect to the database. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
