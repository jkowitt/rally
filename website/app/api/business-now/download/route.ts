import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getResourceById } from "@/lib/business-now-resources";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

// POST /api/business-now/download
// Handles resource downloads with access control
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resourceId } = body;

    if (!resourceId) {
      return NextResponse.json(
        { success: false, error: "Resource ID is required" },
        { status: 400 }
      );
    }

    // Find the resource
    const resource = getResourceById(resourceId);

    if (!resource) {
      return NextResponse.json(
        { success: false, error: "Resource not found" },
        { status: 404 }
      );
    }

    // Check access
    const session = await getServerSession(authOptions);
    const isSubscribed = session?.user?.subscriptionStatus === "active";

    if (!resource.isFree && !isSubscribed) {
      return NextResponse.json(
        {
          success: false,
          error: "Subscription required",
          requiresSubscription: true,
          resource: {
            id: resource.id,
            title: resource.title,
            isFree: resource.isFree,
          },
        },
        { status: 403 }
      );
    }

    // Log download for analytics (would normally save to database)
    const downloadLog = {
      resourceId: resource.id,
      userId: session?.user?.id || "anonymous",
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent"),
    };
    console.log("Download logged:", downloadLog);

    // Return the download URL with a signed token (simplified version)
    // In production, you'd generate a signed URL or stream the file
    const downloadToken = Buffer.from(
      JSON.stringify({
        resourceId: resource.id,
        exp: Date.now() + 5 * 60 * 1000, // 5 minute expiry
      })
    ).toString("base64");

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: `/api/business-now/download/${resource.id}?token=${downloadToken}`,
        resource: {
          id: resource.id,
          title: resource.title,
          fileName: resource.fileName,
          format: resource.format,
        },
      },
    });
  } catch (error) {
    console.error("Error processing download:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process download" },
      { status: 500 }
    );
  }
}
