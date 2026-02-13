import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const onboardingSchema = z.object({
  industry: z.string().optional(),
  companySize: z.string().optional(),
  primaryProduct: z.string().optional(),
  goals: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = onboardingSchema.parse(body);

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (user) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "ONBOARDING_COMPLETED",
          entityType: "User",
          entityId: user.id,
          details: data,
        },
      });

      // Grant default platform access based on selected product
      const platformMap: Record<string, string[]> = {
        valora: ["VALORA", "LEGACY_CRM"],
        sportify: ["HUB", "LEGACY_CRM"],
        "business-now": ["BUSINESS_NOW", "LEGACY_CRM"],
        "legacy-crm": ["LEGACY_CRM"],
        all: ["VALORA", "BUSINESS_NOW", "LEGACY_CRM", "HUB", "VENUEVR"],
      };

      const platforms = platformMap[data.primaryProduct || "legacy-crm"] || ["LEGACY_CRM"];

      for (const platform of platforms) {
        await prisma.platformAccess.upsert({
          where: {
            userId_platform: {
              userId: user.id,
              platform: platform as "VALORA" | "BUSINESS_NOW" | "LEGACY_CRM" | "HUB" | "VENUEVR",
            },
          },
          update: { enabled: true },
          create: {
            userId: user.id,
            platform: platform as "VALORA" | "BUSINESS_NOW" | "LEGACY_CRM" | "HUB" | "VENUEVR",
            enabled: true,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to save onboarding data" },
      { status: 500 }
    );
  }
}
