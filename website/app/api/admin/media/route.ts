import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  alt?: string;
  caption?: string;
  tags: string[];
  uploadedAt: string;
  uploadedBy?: string;
}

// In-memory storage (would use database + file storage in production)
const mediaItems: Map<string, MediaItem> = new Map();

// Initialize with demo items
const demoItems: MediaItem[] = [
  {
    id: "media-1",
    name: "hero-background.jpg",
    type: "image",
    url: "/images/hero-bg.jpg",
    thumbnailUrl: "/images/hero-bg-thumb.jpg",
    size: 245000,
    mimeType: "image/jpeg",
    width: 1920,
    height: 1080,
    tags: ["hero", "background"],
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-2",
    name: "intro-video.mp4",
    type: "video",
    url: "/videos/intro.mp4",
    thumbnailUrl: "/videos/intro-thumb.jpg",
    size: 15000000,
    mimeType: "video/mp4",
    width: 1920,
    height: 1080,
    duration: 120,
    tags: ["intro", "marketing"],
    uploadedAt: new Date().toISOString(),
  },
];

demoItems.forEach((item) => mediaItems.set(item.id, item));

// GET - List media items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const id = searchParams.get("id");

  // Get single item
  if (id) {
    const item = mediaItems.get(id);
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Media not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: item });
  }

  // Filter and return all items
  let items = Array.from(mediaItems.values());

  if (type && type !== "all") {
    items = items.filter((item) => item.type === type);
  }

  if (search) {
    const lowerSearch = search.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lowerSearch))
    );
  }

  // Sort by upload date (newest first)
  items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  return NextResponse.json({
    success: true,
    data: items,
    count: items.length,
  });
}

// POST - Upload new media (metadata only - actual file upload would need multipart handling)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, url, size, mimeType, width, height, duration, tags, alt, caption } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: "Name and URL are required" },
        { status: 400 }
      );
    }

    const newItem: MediaItem = {
      id: `media-${Date.now()}`,
      name,
      type: type || "image",
      url,
      thumbnailUrl: type === "image" ? url : undefined,
      size: size || 0,
      mimeType: mimeType || "application/octet-stream",
      width,
      height,
      duration,
      alt,
      caption,
      tags: tags || [],
      uploadedAt: new Date().toISOString(),
    };

    mediaItems.set(newItem.id, newItem);

    return NextResponse.json({
      success: true,
      data: newItem,
      message: "Media uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload media" },
      { status: 500 }
    );
  }
}

// PUT - Update media metadata
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Media ID is required" },
        { status: 400 }
      );
    }

    const existing = mediaItems.get(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Media not found" },
        { status: 404 }
      );
    }

    const updatedItem = { ...existing, ...updates };
    mediaItems.set(id, updatedItem);

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: "Media updated successfully",
    });
  } catch (error) {
    console.error("Error updating media:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update media" },
      { status: 500 }
    );
  }
}

// DELETE - Delete media item
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Media ID is required" },
      { status: 400 }
    );
  }

  const deleted = mediaItems.delete(id);

  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "Media not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Media deleted successfully",
  });
}
