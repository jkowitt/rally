import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';

const PLATFORMS = ["VALORA", "BUSINESS_NOW", "LEGACY_CRM", "HUB", "VENUEVR", "LOUD_WORKS"] as const;
const OWNER_EMAIL = "jkowitt@loud-legacy.com";
const OWNER_PASSWORD = "LoudLegacy2026!";
const OWNER_NAME = "Jason Kowitt";

/**
 * GET /api/setup/owner-account
 * Creates or updates the site owner account with SUPER_ADMIN role.
 *
 * Access control:
 *  - Allowed on first run (no SUPER_ADMIN exists yet)
 *  - After that, requires SUPER_ADMIN auth
 */
export async function GET(request: NextRequest) {
  try {
    // Check if any SUPER_ADMIN already exists
    const adminCount = await prisma.user.count({
      where: { role: "SUPER_ADMIN" },
    });

    // If admins exist, require SUPER_ADMIN auth to re-run setup
    if (adminCount > 0) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (!token || token.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { success: false, error: "Setup already complete. SUPER_ADMIN auth required to re-run." },
          { status: 403 }
        );
      }
    }

    let user = await prisma.user.findUnique({
      where: { email: OWNER_EMAIL },
      include: { platformAccess: true },
    });

    let userCreated = false;
    const hashedPassword = await bcrypt.hash(OWNER_PASSWORD, 12);

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: OWNER_EMAIL,
          name: OWNER_NAME,
          password: hashedPassword,
          role: "SUPER_ADMIN",
          emailVerified: new Date(),
        },
        include: { platformAccess: true },
      });
      userCreated = true;
    } else {
      // Ensure role is SUPER_ADMIN and password is current
      user = await prisma.user.update({
        where: { email: OWNER_EMAIL },
        data: {
          role: "SUPER_ADMIN",
          password: hashedPassword,
          name: OWNER_NAME,
        },
        include: { platformAccess: true },
      });
    }

    // Grant access to all platforms
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingPlatforms = user.platformAccess.map((pa: any) => pa.platform);
    for (const platform of PLATFORMS) {
      if (!existingPlatforms.includes(platform)) {
        await prisma.platformAccess.create({
          data: {
            userId: user.id,
            platform,
            enabled: true,
          },
        });
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: userCreated ? "owner_account_created" : "owner_account_verified",
        entityType: "user",
        entityId: user.id,
        details: {
          email: OWNER_EMAIL,
          role: "SUPER_ADMIN",
          platformsGranted: PLATFORMS.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: userCreated
        ? "Owner account created successfully!"
        : "Owner account verified and updated.",
      account: {
        email: OWNER_EMAIL,
        role: "SUPER_ADMIN",
        name: OWNER_NAME,
        id: user.id,
      },
      access: "Unlimited — all platforms, no usage limits, no billing.",
    });
  } catch (error: unknown) {
    console.error("Error setting up owner account:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";

    if (msg.includes("does not exist")) {
      return NextResponse.json(
        { success: false, error: "Database tables not initialized. Run 'npx prisma db push' first." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
