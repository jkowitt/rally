import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

interface BannerAd {
  id: string;
  name: string;
  placement: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  pages: string[];
  position: "top" | "sidebar" | "inline" | "footer" | "popup";
  size: "leaderboard" | "rectangle" | "skyscraper" | "banner" | "custom";
  customWidth?: number;
  customHeight?: number;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage (would use database in production)
const bannerAds: Map<string, BannerAd> = new Map();

// Initialize with demo banners
const demoBanners: Omit<BannerAd, "createdAt" | "updatedAt">[] = [
  {
    id: "banner-1",
    name: "Business Now Promo",
    placement: "homepage-top",
    imageUrl: "/banners/business-now-promo.jpg",
    linkUrl: "/business-now",
    altText: "Grow your business with Business Now",
    isActive: true,
    impressions: 12540,
    clicks: 342,
    pages: ["/", "/about"],
    position: "top",
    size: "leaderboard",
  },
  {
    id: "banner-2",
    name: "Legacy CRM Sidebar",
    placement: "sidebar",
    imageUrl: "/banners/legacy-crm-sidebar.jpg",
    linkUrl: "/legacy-crm",
    altText: "Join Legacy CRM waitlist",
    isActive: true,
    impressions: 8920,
    clicks: 215,
    pages: ["/business-now", "/business-now/resources"],
    position: "sidebar",
    size: "rectangle",
  },
];

const now = new Date().toISOString();
demoBanners.forEach((banner) => {
  bannerAds.set(banner.id, { ...banner, createdAt: now, updatedAt: now });
});

// GET - List banners or get banners for a specific page
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const id = searchParams.get("id");
  const activeOnly = searchParams.get("active") === "true";

  // Get single banner
  if (id) {
    const banner = bannerAds.get(id);
    if (!banner) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: banner });
  }

  let banners = Array.from(bannerAds.values());

  // Filter by active status
  if (activeOnly) {
    banners = banners.filter((b) => b.isActive);
  }

  // Filter by page
  if (page) {
    banners = banners.filter((b) => b.pages.includes(page));
  }

  // Check date ranges
  const today = new Date().toISOString().split("T")[0];
  banners = banners.filter((b) => {
    if (b.startDate && b.startDate > today) return false;
    if (b.endDate && b.endDate < today) return false;
    return true;
  });

  return NextResponse.json({
    success: true,
    data: banners,
    count: banners.length,
  });
}

// POST - Create new banner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, imageUrl, linkUrl, altText, position, size, pages, isActive, startDate, endDate, customWidth, customHeight } = body;

    if (!name || !imageUrl || !linkUrl) {
      return NextResponse.json(
        { success: false, error: "Name, image URL, and link URL are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newBanner: BannerAd = {
      id: `banner-${Date.now()}`,
      name,
      placement: position || "top",
      imageUrl,
      linkUrl,
      altText: altText || "",
      position: position || "top",
      size: size || "leaderboard",
      pages: pages || [],
      isActive: isActive ?? true,
      impressions: 0,
      clicks: 0,
      startDate,
      endDate,
      customWidth,
      customHeight,
      createdAt: now,
      updatedAt: now,
    };

    bannerAds.set(newBanner.id, newBanner);

    return NextResponse.json({
      success: true,
      data: newBanner,
      message: "Banner created successfully",
    });
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create banner" },
      { status: 500 }
    );
  }
}

// PUT - Update banner
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Banner ID is required" },
        { status: 400 }
      );
    }

    const existing = bannerAds.get(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    const updatedBanner = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    bannerAds.set(id, updatedBanner);

    return NextResponse.json({
      success: true,
      data: updatedBanner,
      message: "Banner updated successfully",
    });
  } catch (error) {
    console.error("Error updating banner:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update banner" },
      { status: 500 }
    );
  }
}

// DELETE - Delete banner
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Banner ID is required" },
      { status: 400 }
    );
  }

  const deleted = bannerAds.delete(id);

  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "Banner not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Banner deleted successfully",
  });
}

// PATCH - Track banner impression or click
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: "Banner ID and action are required" },
        { status: 400 }
      );
    }

    const banner = bannerAds.get(id);
    if (!banner) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    if (action === "impression") {
      banner.impressions++;
    } else if (action === "click") {
      banner.clicks++;
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'impression' or 'click'" },
        { status: 400 }
      );
    }

    bannerAds.set(id, banner);

    return NextResponse.json({
      success: true,
      data: { impressions: banner.impressions, clicks: banner.clicks },
    });
  } catch (error) {
    console.error("Error tracking banner:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track banner" },
      { status: 500 }
    );
  }
}
