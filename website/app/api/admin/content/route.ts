import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// In-memory storage for content changes (would use database in production)
const contentChanges: Map<string, {
  path: string;
  changes: Array<{
    elementId: string;
    originalContent: string;
    newContent: string;
    selector: string;
  }>;
  status: "draft" | "published";
  lastModified: string;
  version: number;
}> = new Map();

// GET - Retrieve content changes for a page
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (path) {
    const content = contentChanges.get(path);
    return NextResponse.json({
      success: true,
      data: content || null,
    });
  }

  // Return all content changes
  return NextResponse.json({
    success: true,
    data: Array.from(contentChanges.values()),
  });
}

// POST - Save content changes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, changes, status } = body;

    if (!path) {
      return NextResponse.json(
        { success: false, error: "Path is required" },
        { status: 400 }
      );
    }

    const existing = contentChanges.get(path);
    const version = existing ? existing.version + 1 : 1;

    const contentData = {
      path,
      changes: changes || [],
      status: status || "draft",
      lastModified: new Date().toISOString(),
      version,
    };

    contentChanges.set(path, contentData);

    return NextResponse.json({
      success: true,
      data: contentData,
      message: status === "published" ? "Content published successfully" : "Draft saved successfully",
    });
  } catch (error) {
    console.error("Error saving content:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save content" },
      { status: 500 }
    );
  }
}

// DELETE - Discard content changes
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { success: false, error: "Path is required" },
      { status: 400 }
    );
  }

  contentChanges.delete(path);

  return NextResponse.json({
    success: true,
    message: "Content changes discarded",
  });
}
