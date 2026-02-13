import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/valuations/[id]/comps
 * Save comparable sales to a valuation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const valuationId = params.id;
    const userId = (session.user as any).id;

    // Verify the valuation belongs to the user
    const valuation = await prisma.valuation.findFirst({
      where: { id: valuationId, userId },
    });

    if (!valuation) {
      return NextResponse.json({ error: 'Valuation not found' }, { status: 404 });
    }

    const { comps } = await request.json();

    if (!Array.isArray(comps) || comps.length === 0) {
      return NextResponse.json({ error: 'comps array is required' }, { status: 400 });
    }

    // Delete existing comps for this valuation (replace with fresh data)
    await prisma.comparable.deleteMany({ where: { valuationId } });

    // Save new comps (max 6)
    const saved = await Promise.all(
      comps.slice(0, 6).map((comp: any) =>
        prisma.comparable.create({
          data: {
            valuationId,
            address: comp.address || comp.formattedAddress || 'Unknown',
            propertyType: comp.propertyType || null,
            squareFeet: comp.squareFeet ? parseFloat(comp.squareFeet) : null,
            salePrice: parseFloat(comp.lastSalePrice || comp.salePrice) || 0,
            saleDate: (comp.lastSaleDate || comp.saleDate)
              ? new Date(comp.lastSaleDate || comp.saleDate)
              : new Date(),
            pricePerSF: comp.pricePerSqft || comp.pricePerSF
              ? parseFloat(comp.pricePerSqft || comp.pricePerSF)
              : null,
            source: comp.source || 'rentcast',
            sourceUrl: comp.sourceUrl || null,
          },
        })
      )
    );

    return NextResponse.json({ comps: saved }, { status: 201 });
  } catch (error) {
    console.error('Error saving comps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/valuations/[id]/comps
 * List comparable sales for a valuation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const valuationId = params.id;
    const userId = (session.user as any).id;

    const valuation = await prisma.valuation.findFirst({
      where: { id: valuationId, userId },
    });

    if (!valuation) {
      return NextResponse.json({ error: 'Valuation not found' }, { status: 404 });
    }

    const comps = await prisma.comparable.findMany({
      where: { valuationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ comps });
  } catch (error) {
    console.error('Error fetching comps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
