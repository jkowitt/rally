import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// POST - Create admin/developer account
// This endpoint creates a default admin account if none exists
// In production, this should be secured or removed after initial setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, secretKey } = body;

    // Require a secret key for creating admin accounts
    // Set this in your environment variables
    const ADMIN_SECRET = process.env.ADMIN_SETUP_SECRET || "loud-legacy-admin-setup-2024";

    if (secretKey !== ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: "Invalid secret key" },
        { status: 403 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update to admin if not already
      if (existingUser.role !== "SUPER_ADMIN" && existingUser.role !== "ADMIN") {
        const updatedUser = await prisma.user.update({
          where: { email },
          data: { role: "SUPER_ADMIN" },
        });
        return NextResponse.json({
          success: true,
          message: "User upgraded to SUPER_ADMIN",
          data: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
          },
        });
      }
      return NextResponse.json({
        success: true,
        message: "Admin user already exists",
        data: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new admin user
    const newAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || "Admin",
        role: "SUPER_ADMIN",
        emailVerified: new Date(),
      },
    });

    // Grant access to all platforms
    const platforms = ["VALORA", "BUSINESS_NOW", "LEGACY_CRM", "HUB", "VENUEVR"];
    await prisma.platformAccess.createMany({
      data: platforms.map((platform) => ({
        userId: newAdmin.id,
        platform: platform as any,
        enabled: true,
      })),
    });

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully",
      data: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error("Error creating admin account:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create admin account" },
      { status: 500 }
    );
  }
}

// GET - Check if admin account exists
export async function GET() {
  try {
    const adminCount = await prisma.user.count({
      where: {
        role: {
          in: ["ADMIN", "SUPER_ADMIN"],
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        hasAdmin: adminCount > 0,
        adminCount,
      },
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check admin status" },
      { status: 500 }
    );
  }
}
