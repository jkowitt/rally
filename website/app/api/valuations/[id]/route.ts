import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/valuations/[id]
 * Get a specific valuation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const valuation = await prisma.valuation.findUnique({
      where: {
        id: params.id,
      },
      include: {
        property: {
          include: {
            images: true,
          },
        },
        scenarios: true,
        comparables: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!valuation) {
      return NextResponse.json(
        { error: 'Valuation not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    const userId = (session.user as any).id;
    if (valuation.userId !== userId && valuation.visibility === 'PRIVATE') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(valuation);
  } catch (error) {
    console.error('Error fetching valuation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/valuations/[id]
 * Update a valuation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Check ownership
    const existing = await prisma.valuation.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Valuation not found' },
        { status: 404 }
      );
    }

    const userId = (session.user as any).id;
    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Recalculate metrics if income/expense data changed
    let updates: any = { ...body };
    if (body.incomeData || body.expenseData) {
      const incomeData = body.incomeData || existing.incomeData;
      const expenseData = body.expenseData || existing.expenseData;
      const noi = calculateNOI(incomeData, expenseData);
      const currentValue = body.currentValue || existing.currentValue;
      const capRate = currentValue ? (noi / currentValue) * 100 : null;

      updates.noi = noi;
      updates.capRate = capRate;
    }

    const valuation = await prisma.valuation.update({
      where: { id: params.id },
      data: updates,
      include: {
        property: true,
        scenarios: true,
        comparables: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        organizationId: valuation.organizationId,
        action: 'updated_valuation',
        entityType: 'valuation',
        entityId: valuation.id,
        details: {
          valuationName: valuation.name,
        },
      },
    });

    return NextResponse.json(valuation);
  } catch (error) {
    console.error('Error updating valuation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/valuations/[id]
 * Delete a valuation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check ownership
    const existing = await prisma.valuation.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Valuation not found' },
        { status: 404 }
      );
    }

    const userId = (session.user as any).id;
    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await prisma.valuation.delete({
      where: { id: params.id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        organizationId: existing.organizationId,
        action: 'deleted_valuation',
        entityType: 'valuation',
        entityId: params.id,
        details: {
          valuationName: existing.name,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting valuation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
