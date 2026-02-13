import { NextRequest, NextResponse } from "next/server";
import { WaitlistEntry } from "@/lib/legacy-crm";

export const dynamic = 'force-dynamic';

// In-memory storage for demo (would be database in production)
const waitlist: WaitlistEntry[] = [];

// POST /api/legacy-crm/waitlist - Join the waitlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, company, role, useCase, referralSource } = body;

    // Validation
    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Check for existing entry
    const existing = waitlist.find(
      (entry) => entry.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "This email is already on the waitlist",
          position: waitlist.indexOf(existing) + 1
        },
        { status: 409 }
      );
    }

    // Create new entry
    const entry: WaitlistEntry = {
      id: `wl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase(),
      name,
      company,
      role,
      useCase,
      referralSource,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    waitlist.push(entry);

    // Log for analytics
    console.log("New waitlist entry:", {
      id: entry.id,
      email: entry.email,
      timestamp: entry.createdAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "You've been added to the waitlist!",
        position: waitlist.length,
        estimatedAccess: "Q1 2024",
        entry: {
          id: entry.id,
          email: entry.email,
          name: entry.name,
          createdAt: entry.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join waitlist" },
      { status: 500 }
    );
  }
}

// GET /api/legacy-crm/waitlist - Check waitlist status
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      // Return general stats
      return NextResponse.json({
        success: true,
        data: {
          totalSignups: waitlist.length,
          status: "accepting",
        },
      });
    }

    // Check specific email
    const entry = waitlist.find(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    );

    if (!entry) {
      return NextResponse.json({
        success: true,
        data: {
          onWaitlist: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        onWaitlist: true,
        position: waitlist.indexOf(entry) + 1,
        status: entry.status,
        joinedAt: entry.createdAt,
      },
    });
  } catch (error) {
    console.error("Waitlist check error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check waitlist status" },
      { status: 500 }
    );
  }
}
