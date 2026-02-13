import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/evaluations
 * Returns all evaluation activity logs for the owner/admin panel.
 * Shows which functions each user used, results, and timestamps.
 *
 * Query params:
 *   - page (default 1)
 *   - limit (default 50, max 200)
 *   - userId (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN (site owner) or ADMIN can access
    const user = await prisma.user.findUnique({
      where: { id: (session.user as { id: string }).id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const userIdFilter = searchParams.get("userId");

    const where: { action: string; userId?: string } = {
      action: "evaluation_completed",
    };
    if (userIdFilter) {
      where.userId = userIdFilter;
    }

    const [evaluations, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Parse the details JSON for each evaluation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = evaluations.map((e: any) => {
      const details = (e.details || {}) as Record<string, unknown>;
      return {
        id: e.id,
        userId: e.userId,
        userName: e.user?.name || "Unknown",
        userEmail: e.user?.email || "",
        userRole: e.user?.role || "",
        address: details.address || "",
        city: details.city || "",
        state: details.state || "",
        zipCode: details.zipCode || "",
        propertyType: details.propertyType || "",
        functionsUsed: details.functionsUsed || {},
        results: details.results || {},
        timestamp: details.timestamp || e.createdAt,
        createdAt: e.createdAt,
      };
    });

    return NextResponse.json({
      evaluations: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching evaluation logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation logs" },
      { status: 500 }
    );
  }
}
