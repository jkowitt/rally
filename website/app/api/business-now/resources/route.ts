import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { allResources, guides, templates, Resource } from "@/lib/business-now-resources";

export const dynamic = 'force-dynamic';

// GET /api/business-now/resources
// Returns all resources with user's access level
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // "guide" | "template" | null
    const category = searchParams.get("category");

    // Determine user's subscription status
    const isSubscribed = session?.user?.subscriptionStatus === "active";

    // Filter resources based on query params
    let resources: Resource[] = allResources;

    if (type === "guide") {
      resources = guides;
    } else if (type === "template") {
      resources = templates;
    }

    if (category) {
      resources = resources.filter(r => r.category.toLowerCase() === category.toLowerCase());
    }

    // Map resources with access information
    const resourcesWithAccess = resources.map(resource => ({
      ...resource,
      hasAccess: resource.isFree || isSubscribed,
      requiresSubscription: !resource.isFree && !isSubscribed,
    }));

    return NextResponse.json({
      success: true,
      data: {
        resources: resourcesWithAccess,
        meta: {
          total: resourcesWithAccess.length,
          freeCount: resourcesWithAccess.filter(r => r.isFree).length,
          premiumCount: resourcesWithAccess.filter(r => !r.isFree).length,
          isSubscribed,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}
