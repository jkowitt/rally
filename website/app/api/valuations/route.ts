import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/valuations
 * List all valuations for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Demo mode: return empty data if no session
    if (!session || !session.user) {
      const page = parseInt(new URL(request.url).searchParams.get('page') || '1');
      const limit = parseInt(new URL(request.url).searchParams.get('limit') || '20');

      return NextResponse.json({
        valuations: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organizationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {
      userId: (session.user as any).id,
    };

    if (status) {
      where.status = status;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [valuations, total] = await Promise.all([
      prisma.valuation.findMany({
        where,
        include: {
          property: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      prisma.valuation.count({ where }),
    ]);

    return NextResponse.json({
      valuations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching valuations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/valuations
 * Create a new valuation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const {
      propertyId,
      name,
      organizationId,
      purchasePrice,
      currentValue,
      incomeData,
      expenseData,
      financingData,
      notes,
      tags,
    } = body;

    // Validate required fields
    if (!propertyId || !name) {
      return NextResponse.json(
        { error: 'Property ID and name are required' },
        { status: 400 }
      );
    }

    // Calculate financial metrics
    const noi = calculateNOI(incomeData, expenseData);
    const capRate = currentValue ? (noi / currentValue) * 100 : null;

    // Demo mode: return mock valuation without saving
    if (!session || !session.user) {
      const mockValuation = {
        id: `demo-${Date.now()}`,
        propertyId,
        userId: 'demo-user',
        organizationId,
        name,
        purchasePrice,
        currentValue,
        incomeData,
        expenseData,
        financingData,
        noi,
        capRate,
        notes,
        tags: tags || [],
        status: 'DRAFT',
        visibility: 'PRIVATE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        property: null,
      };

      return NextResponse.json(mockValuation, { status: 201 });
    }

    const valuation = await prisma.valuation.create({
      data: {
        propertyId,
        userId: (session.user as any).id,
        organizationId,
        name,
        purchasePrice,
        currentValue,
        incomeData,
        expenseData,
        financingData,
        noi,
        capRate,
        notes,
        tags: tags || [],
        status: 'DRAFT',
        visibility: 'PRIVATE',
      },
      include: {
        property: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        organizationId,
        action: 'created_valuation',
        entityType: 'valuation',
        entityId: valuation.id,
        details: {
          valuationName: name,
          propertyAddress: valuation.property.address,
        },
      },
    });

    return NextResponse.json(valuation, { status: 201 });
  } catch (error) {
    console.error('Error creating valuation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate Net Operating Income
 */
function calculateNOI(incomeData: any, expenseData: any): number {
  if (!incomeData || !expenseData) return 0;

  const totalIncome = Object.values(incomeData as Record<string, number>).reduce(
    (sum, val) => sum + (val || 0),
    0
  );
  const totalExpenses = Object.values(expenseData as Record<string, number>).reduce(
    (sum, val) => sum + (val || 0),
    0
  );

  return totalIncome - totalExpenses;
}
