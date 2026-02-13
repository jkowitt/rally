import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET: Get current user's subscription status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscriptions: {
          where: { status: { not: "CANCELED" } },
          orderBy: { createdAt: "desc" },
        },
        platformAccess: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const activeSubscription = user.subscriptions[0];
    const platformAccess: Record<string, boolean> = {};
    for (const access of user.platformAccess) {
      platformAccess[access.platform] = access.enabled;
    }

    return NextResponse.json({
      subscription: activeSubscription
        ? {
            id: activeSubscription.id,
            plan: activeSubscription.planType,
            status: activeSubscription.status,
            billingCycle: activeSubscription.billingCycle,
            currentPeriodEnd: activeSubscription.currentPeriodEnd,
            cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
          }
        : null,
      platformAccess,
      isActive: activeSubscription?.status === "ACTIVE" || activeSubscription?.status === "TRIALING",
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
