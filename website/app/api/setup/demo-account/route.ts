import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

const PLATFORMS = ["VALORA", "BUSINESS_NOW", "LEGACY_CRM", "HUB", "VENUEVR", "LOUD_WORKS", "SPORTIFY"];
const DEMO_EMAIL = "demo@loud-legacy.com";
const DEMO_PASSWORD = "demo123";

// GET - Create or verify demo account
export async function GET() {
  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      include: { platformAccess: true },
    });

    let userCreated = false;

    if (!user) {
      // Create demo admin account
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

      user = await prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          name: "Demo Admin",
          password: hashedPassword,
          role: "SUPER_ADMIN",
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
        ? "Demo account created successfully!"
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
      nextSteps: [
        "Login at /auth/signin",
        `Email: ${DEMO_EMAIL}`,
        `Password: ${DEMO_PASSWORD}`,
      ],
    });
  } catch (error: any) {
    console.error("Error creating demo account:", error);

    // Check if it's a database connection error
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
