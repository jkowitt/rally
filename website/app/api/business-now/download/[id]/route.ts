import { NextRequest, NextResponse } from "next/server";
import { getResourceById } from "@/lib/business-now-resources";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

// GET /api/business-now/download/[id]
// Serves the actual file for download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");

    // Validate token
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Download token required" },
        { status: 401 }
      );
    }

    // Decode and validate token
    try {
      const tokenData = JSON.parse(Buffer.from(token, "base64").toString());

      if (tokenData.resourceId !== id) {
        return NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 401 }
        );
      }

      if (tokenData.exp < Date.now()) {
        return NextResponse.json(
          { success: false, error: "Download link expired. Please request a new download." },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid token format" },
        { status: 401 }
      );
    }

    // Find the resource
    const resource = getResourceById(id);

    if (!resource) {
      return NextResponse.json(
        { success: false, error: "Resource not found" },
        { status: 404 }
      );
    }

    // Read the file
    const publicDir = path.join(process.cwd(), "public");
    const filePath = path.join(publicDir, resource.filePath);

    try {
      const fileContent = await fs.readFile(filePath);

      // Determine content type
      let contentType = "application/octet-stream";
      if (resource.filePath.endsWith(".html")) {
        contentType = "text/html";
      } else if (resource.filePath.endsWith(".csv")) {
        contentType = "text/csv";
      } else if (resource.filePath.endsWith(".pdf")) {
        contentType = "application/pdf";
      } else if (resource.filePath.endsWith(".xlsx")) {
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }

      // Return file with proper headers for download
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${resource.fileName}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (fileError) {
      console.error("File not found:", filePath);
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error serving download:", error);
    return NextResponse.json(
      { success: false, error: "Failed to serve download" },
      { status: 500 }
    );
  }
}
