// Admin Content Management Types and Utilities

export interface ContentBlock {
  id: string;
  type: "text" | "heading" | "image" | "video" | "banner" | "html" | "button" | "section";
  content: string;
  styles?: Record<string, string>;
  attributes?: Record<string, string>;
  children?: ContentBlock[];
}

export interface PageContent {
  id: string;
  path: string;
  title: string;
  description?: string;
  blocks: ContentBlock[];
  lastModified: string;
  publishedAt?: string;
  status: "draft" | "published" | "scheduled";
  version: number;
}

export interface BannerAd {
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
}

export interface MediaItem {
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

export interface SiteSettings {
  siteName: string;
  tagline: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  socialLinks: {
    platform: string;
    url: string;
  }[];
  analytics?: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    defaultImage: string;
  };
}

// In-memory storage for demo (would use database in production)
const pageContents: Map<string, PageContent> = new Map();
const bannerAds: Map<string, BannerAd> = new Map();
const mediaItems: Map<string, MediaItem> = new Map();
let siteSettings: SiteSettings = {
  siteName: "Loud Legacy Ventures",
  tagline: "Building legacies that echo through generations",
  logo: "/logos/loud-legacy.svg",
  favicon: "/favicon.ico",
  primaryColor: "#1B365D",
  secondaryColor: "#0F2440",
  accentColor: "#C9A227",
  fontHeading: "Georgia, serif",
  fontBody: "system-ui, -apple-system, sans-serif",
  socialLinks: [
    { platform: "linkedin", url: "https://linkedin.com/company/loud-legacy" },
    { platform: "twitter", url: "https://twitter.com/loudlegacy" },
  ],
  seo: {
    defaultTitle: "Loud Legacy Ventures",
    defaultDescription: "Building legacies that echo through generations",
    defaultImage: "/og-image.jpg",
  },
};

// Demo banner ads
const demoBanners: BannerAd[] = [
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
    createdAt: new Date().toISOString(),
  },
  {
    id: "banner-2",
    name: "Legacy CRM Early Access",
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
    createdAt: new Date().toISOString(),
  },
];

demoBanners.forEach((b) => bannerAds.set(b.id, b));

// Demo media items
const demoMedia: MediaItem[] = [
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

demoMedia.forEach((m) => mediaItems.set(m.id, m));

// Page Content Functions
export function getPageContent(path: string): PageContent | undefined {
  return pageContents.get(path);
}

export function savePageContent(content: PageContent): PageContent {
  content.lastModified = new Date().toISOString();
  content.version = (content.version || 0) + 1;
  pageContents.set(content.path, content);
  return content;
}

export function publishPageContent(path: string): PageContent | undefined {
  const content = pageContents.get(path);
  if (content) {
    content.status = "published";
    content.publishedAt = new Date().toISOString();
    pageContents.set(path, content);
  }
  return content;
}

export function getAllPages(): PageContent[] {
  return Array.from(pageContents.values());
}

// Banner Ad Functions
export function getBannerAds(): BannerAd[] {
  return Array.from(bannerAds.values());
}

export function getBannerById(id: string): BannerAd | undefined {
  return bannerAds.get(id);
}

export function getBannersForPage(path: string): BannerAd[] {
  return Array.from(bannerAds.values()).filter(
    (b) => b.isActive && b.pages.includes(path)
  );
}

export function saveBannerAd(banner: BannerAd): BannerAd {
  bannerAds.set(banner.id, banner);
  return banner;
}

export function deleteBannerAd(id: string): boolean {
  return bannerAds.delete(id);
}

export function trackBannerImpression(id: string): void {
  const banner = bannerAds.get(id);
  if (banner) {
    banner.impressions++;
    bannerAds.set(id, banner);
  }
}

export function trackBannerClick(id: string): void {
  const banner = bannerAds.get(id);
  if (banner) {
    banner.clicks++;
    bannerAds.set(id, banner);
  }
}

// Media Functions
export function getMediaItems(type?: MediaItem["type"]): MediaItem[] {
  const items = Array.from(mediaItems.values());
  return type ? items.filter((m) => m.type === type) : items;
}

export function getMediaById(id: string): MediaItem | undefined {
  return mediaItems.get(id);
}

export function saveMediaItem(item: MediaItem): MediaItem {
  mediaItems.set(item.id, item);
  return item;
}

export function deleteMediaItem(id: string): boolean {
  return mediaItems.delete(id);
}

export function searchMedia(query: string): MediaItem[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(mediaItems.values()).filter(
    (m) =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.tags.some((t) => t.toLowerCase().includes(lowerQuery))
  );
}

// Site Settings Functions
export function getSiteSettings(): SiteSettings {
  return siteSettings;
}

export function updateSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
  siteSettings = { ...siteSettings, ...settings };
  return siteSettings;
}

// Generate unique ID
export function generateId(prefix: string = "item"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Banner size dimensions
export const BANNER_SIZES = {
  leaderboard: { width: 728, height: 90 },
  rectangle: { width: 300, height: 250 },
  skyscraper: { width: 160, height: 600 },
  banner: { width: 468, height: 60 },
  custom: { width: 0, height: 0 },
};
