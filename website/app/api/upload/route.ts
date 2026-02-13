import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Upload files (images, documents)
 *
 * Note: This is a basic file upload implementation.
 * For production, consider using AWS S3, Cloudinary, or similar services.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rawFolder = (formData.get('folder') as string) || 'general';
    const alt = formData.get('alt') as string;
    const caption = formData.get('caption') as string;

    // Sanitize folder to prevent path traversal (allow only alphanumeric, hyphens, underscores)
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (images only for now)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', folder);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename with sanitized extension
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const rawExt = (file.name.split('.').pop() || '').toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = allowedExtensions.includes(rawExt) ? rawExt : 'jpg';
    const fileName = `${timestamp}-${randomStr}.${extension}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate public URL
    const url = `/uploads/${folder}/${fileName}`;

    // If authenticated, save to database
    let mediaAssetId = `demo-${timestamp}`;
    if (session && session.user) {
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          fileName,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          url,
          folder,
          alt,
          caption,
          uploadedBy: (session.user as any).id,
        },
      });
      mediaAssetId = mediaAsset.id;

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'uploaded_file',
          entityType: 'media',
          entityId: mediaAsset.id,
          details: {
            fileName: file.name,
            fileSize: file.size,
            folder,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      file: {
        id: mediaAssetId,
        url,
        fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
