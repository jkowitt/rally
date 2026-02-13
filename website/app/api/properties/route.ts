import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/properties
 * Search and list properties
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Demo mode: return empty data if no session
    if (!session || !session.user) {
      const page = parseInt(new URL(request.url).searchParams.get('page') || '1');
      const limit = parseInt(new URL(request.url).searchParams.get('limit') || '20');

      return NextResponse.json({
        properties: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const propertyType = searchParams.get('propertyType');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (propertyType) {
      where.propertyType = propertyType;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (state) {
      where.state = state;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          images: {
            take: 1,
            orderBy: {
              uploadedAt: 'desc',
            },
          },
          _count: {
            select: {
              valuations: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties
 * Create a new property
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const {
      address,
      city,
      state,
      zip,
      country,
      propertyType,
      subType,
      squareFeet,
      units,
      yearBuilt,
      lotSize,
      latitude,
      longitude,
    } = body;

    // Validate required fields
    if (!address || !propertyType) {
      return NextResponse.json(
        { error: 'Address and property type are required' },
        { status: 400 }
      );
    }

    // Demo mode: return mock property without saving
    if (!session || !session.user) {
      const mockProperty = {
        id: `demo-${Date.now()}`,
        address,
        city,
        state,
        zip,
        country: country || 'USA',
        propertyType,
        subType,
        squareFeet,
        units,
        yearBuilt,
        lotSize,
        latitude,
        longitude,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        images: [],
        _count: {
          valuations: 0,
        },
      };

      return NextResponse.json(mockProperty, { status: 201 });
    }

    const property = await prisma.property.create({
      data: {
        address,
        city,
        state,
        zip,
        country: country || 'USA',
        propertyType,
        subType,
        squareFeet,
        units,
        yearBuilt,
        lotSize,
        latitude,
        longitude,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'created_property',
        entityType: 'property',
        entityId: property.id,
        details: {
          address: property.address,
          propertyType: property.propertyType,
        },
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
