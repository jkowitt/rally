import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';

const PLATFORMS = ["VALORA", "BUSINESS_NOW", "LEGACY_CRM", "HUB", "VENUEVR", "LOUD_WORKS", "SPORTIFY"];
const DEMO_EMAIL = "demo@loud-legacy.com";
const DEMO_PASSWORD = "demo123";

// GET - Create or verify demo account (SUPER_ADMIN auth required)
export async function GET(request: NextRequest) {
  try {
    // Only SUPER_ADMIN can create demo accounts
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only SUPER_ADMIN can create demo accounts" },
        { status: 403 }
      );
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      include: { platformAccess: true },
    });

    let userCreated = false;

    if (!user) {
      // Create demo account as regular USER — not admin
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

      user = await prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          name: "Demo User",
          password: hashedPassword,
          role: "USER",
          emailVerified: new Date(),
        },
        include: { platformAccess: true },
      });
      userCreated = true;
    }

    // Check and create platform access for all platforms
    const existingPlatforms = user.platformAccess.map((pa: any) => pa.platform);
    const missingPlatforms = PLATFORMS.filter(
      (p) => !existingPlatforms.includes(p as any)
    );

    const platformsGranted: string[] = [];
    for (const platform of missingPlatforms) {
      await prisma.platformAccess.create({
        data: {
          userId: user.id,
          platform: platform as any,
          enabled: true,
        },
      });
      platformsGranted.push(platform);
    }

    // Get final platform access status
    const finalAccess = await prisma.platformAccess.findMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: userCreated
        ? "Demo account created (USER role)"
        : "Demo account ready",
      account: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        role: user.role,
        id: user.id,
      },
      platformAccess: finalAccess.map((pa: any) => ({
        platform: pa.platform,
        enabled: pa.enabled,
      })),
      platformsGranted,
    });
  } catch (error: any) {
    console.error("Error creating demo account:", error);

    if (error.message?.includes("does not exist")) {
      return NextResponse.json(
        {
          success: false,
          error: "Database tables not initialized",
          hint: "Run 'npx prisma db push' to create the database schema",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create demo account",
      },
      { status: 500 }
    );
  }
}
