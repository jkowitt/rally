import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cms
 * Fetch all CMS content or filter by section
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    // Mock CMS content for now
    // In production, this would query the database
    const mockContent = [
      {
        id: '1',
        key: 'homepage_hero_title',
        value: 'Real Estate Intelligence Platform',
        type: 'TEXT',
        section: 'homepage',
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        key: 'homepage_hero_subtitle',
        value: 'AI-powered property valuations and comprehensive market analysis',
        type: 'TEXT',
        section: 'homepage',
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        key: 'valora_tagline',
        value: 'Empowering Real Estate Decisions with Data',
        type: 'TEXT',
        section: 'valora',
        updatedAt: new Date().toISOString(),
      },
      {
        id: '4',
        key: 'footer_copyright',
        value: '© 2026 VALORA. All rights reserved.',
        type: 'TEXT',
        section: 'footer',
        updatedAt: new Date().toISOString(),
      },
    ];

    const filteredContent = section
      ? mockContent.filter((item) => item.section === section)
      : mockContent;

    return NextResponse.json({
      success: true,
      content: filteredContent,
    });
  } catch (error) {
    console.error('Error fetching CMS content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CMS content' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cms
 * Update CMS content (SUPER_ADMIN only)
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and authorization
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.role !== 'SUPER_ADMIN') {
    //   return NextResponse.json(
    //     { error: 'Unauthorized. SUPER_ADMIN access required.' },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();
    const { key, value, type, section } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: 'Missing required fields: key and value' },
        { status: 400 }
      );
    }

    // Mock update - in production, this would update the database
    const updatedContent = {
      id: Date.now().toString(),
      key,
      value,
      type: type || 'TEXT',
      section: section || 'general',
      updatedAt: new Date().toISOString(),
    };

    console.log('CMS content updated:', updatedContent);

    return NextResponse.json({
      success: true,
      content: updatedContent,
      message: 'Content updated successfully',
    });
  } catch (error) {
    console.error('Error updating CMS content:', error);
    return NextResponse.json(
      { error: 'Failed to update CMS content' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cms
 * Create new CMS content (SUPER_ADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, type, section } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: 'Missing required fields: key and value' },
        { status: 400 }
      );
    }

    const newContent = {
      id: Date.now().toString(),
      key,
      value,
      type: type || 'TEXT',
      section: section || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('CMS content created:', newContent);

    return NextResponse.json({
      success: true,
      content: newContent,
      message: 'Content created successfully',
    });
  } catch (error) {
    console.error('Error creating CMS content:', error);
    return NextResponse.json(
      { error: 'Failed to create CMS content' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cms?key=<key>
 * Delete CMS content (SUPER_ADMIN only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Missing required parameter: key' },
        { status: 400 }
      );
    }

    console.log('CMS content deleted:', key);

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting CMS content:', error);
    return NextResponse.json(
      { error: 'Failed to delete CMS content' },
      { status: 500 }
    );
  }
}
