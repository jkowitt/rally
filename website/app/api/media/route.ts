import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media
 * Fetch all media assets or filter by folder
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');

    // Mock media assets for now
    const mockAssets = [
      {
        id: '1',
        fileName: 'hero-image.jpg',
        originalName: 'hero-image.jpg',
        mimeType: 'image/jpeg',
        size: 245678,
        url: '/images/hero-placeholder.jpg',
        folder: 'homepage',
        tags: ['hero', 'banner'],
        alt: 'Hero image for homepage',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: '2',
        fileName: 'logo.png',
        originalName: 'valora-logo.png',
        mimeType: 'image/png',
        size: 15234,
        url: '/images/logo-placeholder.png',
        folder: 'branding',
        tags: ['logo', 'brand'],
        alt: 'VALORA logo',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: '3',
        fileName: 'property-sample.jpg',
        originalName: 'property-sample.jpg',
        mimeType: 'image/jpeg',
        size: 456789,
        url: '/images/property-placeholder.jpg',
        folder: 'properties',
        tags: ['property', 'real-estate'],
        alt: 'Sample property image',
        uploadedAt: new Date().toISOString(),
      },
    ];

    const filteredAssets = folder
      ? mockAssets.filter((asset) => asset.folder === folder)
      : mockAssets;

    return NextResponse.json({
      success: true,
      assets: filteredAssets,
    });
  } catch (error) {
    console.error('Error fetching media assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media assets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media
 * Upload new media asset
 */
export async function POST(request: NextRequest) {
  try {
    // In production, this would handle file upload
    // For now, we'll accept JSON with file metadata

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string || 'general';
    const alt = formData.get('alt') as string || '';
    const tags = formData.get('tags') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Mock upload - in production, upload to S3, Cloudinary, etc.
    const mockAsset = {
      id: Date.now().toString(),
      fileName: file.name.replace(/[^a-zA-Z0-9.-]/g, '_'),
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: `/uploads/${file.name}`, // Mock URL
      folder,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      alt,
      uploadedAt: new Date().toISOString(),
    };

    console.log('Media uploaded:', mockAsset);

    return NextResponse.json({
      success: true,
      asset: mockAsset,
      message: 'Media uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media?id=<id>
 * Delete media asset
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Mock delete
    console.log('Media deleted:', id);

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/media
 * Update media metadata
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, alt, tags, folder } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Mock update
    const updatedAsset = {
      id,
      alt,
      tags,
      folder,
      updatedAt: new Date().toISOString(),
    };

    console.log('Media updated:', updatedAsset);

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      message: 'Media updated successfully',
    });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { error: 'Failed to update media' },
      { status: 500 }
    );
  }
}
