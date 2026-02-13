import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Map frontend property type IDs to Prisma enum
function mapPropertyType(type: string): string {
  const map: Record<string, string> = {
    'single-family': 'RESIDENTIAL',
    'multifamily': 'MULTIFAMILY',
    'commercial': 'INDUSTRIAL',
    'industrial': 'INDUSTRIAL',
    'retail': 'INDUSTRIAL',
    'office': 'INDUSTRIAL',
    'mixed-use': 'MIXED_USE',
    'land': 'LAND',
    'hospitality': 'INDUSTRIAL',
    'self-storage': 'INDUSTRIAL',
  };
  return map[type] || 'RESIDENTIAL';
}

/**
 * GET /api/workspaces
 * List all saved workspaces for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const valuations = await prisma.valuation.findMany({
      where: { userId },
      include: {
        property: { include: { images: true } },
        comparables: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform DB records back into workspace format
    const workspaces = valuations.map((v: any) => {
      const financing = (v.financingData as any) || {};
      const income = (v.incomeData as any) || {};
      const expense = (v.expenseData as any) || {};
      return {
        id: v.id,
        name: v.name,
        date: v.updatedAt.toLocaleDateString(),
        address: v.property.address || 'No address',
        propertyType: income.propertyTypeFrontend || v.property.propertyType?.toLowerCase() || '',
        valuation: income.valuationResult || null,
        underwriting: income.underwritingResult || null,
        comps: v.comparables.map((c: any) => ({
          address: c.address,
          salePrice: c.salePrice,
          saleDate: c.saleDate,
          squareFeet: c.squareFeet,
          pricePerSqft: c.pricePerSF,
          propertyType: c.propertyType,
          source: c.source,
        })),
        images: v.property.images.map((img: any) => img.url),
        notes: v.notes || '',
        rentRoll: income.rentRoll || [],
        expenses: expense.expenses || [],
        isPublic: v.visibility === 'PUBLIC',
        askingPrice: financing.askingPrice,
        purchasePrice: financing.purchasePrice?.toString(),
        downPaymentPercent: financing.downPaymentPercent?.toString(),
        interestRate: financing.interestRate?.toString(),
        loanTerm: financing.loanTerm?.toString(),
        grossRent: income.grossRent?.toString(),
        vacancyRate: income.vacancyRate?.toString(),
        operatingExpenseRatio: expense.operatingExpenseRatio?.toString(),
        // Extra fields for restoring the form
        city: income.city || '',
        state: income.state || '',
        zipCode: income.zipCode || '',
        sqft: v.property.squareFeet?.toString() || '',
        lotSize: v.property.lotSize?.toString() || '',
        yearBuilt: v.property.yearBuilt?.toString() || '',
        units: v.property.units?.toString() || '1',
        beds: income.beds || '',
        baths: income.baths || '',
        imageLabels: income.imageLabels || {},
      };
    });

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/workspaces
 * Save (create or update) a workspace
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const body = await request.json();

    const {
      id, // if updating existing
      name,
      address,
      city,
      state,
      zipCode,
      propertyType,
      sqft,
      lotSize,
      yearBuilt,
      units,
      beds,
      baths,
      valuation,
      underwriting,
      images,
      imageLabels,
      notes,
      rentRoll,
      expenses,
      isPublic,
      askingPrice,
      purchasePrice,
      downPaymentPercent,
      interestRate,
      loanTerm,
      grossRent,
      vacancyRate,
      operatingExpenseRatio,
    } = body;

    const parsedAddress = address || 'No address';
    const fullAddress = city ? `${parsedAddress}, ${city}, ${state || ''} ${zipCode || ''}`.trim() : parsedAddress;

    // Build JSON payloads for Valuation fields
    const incomeData = {
      rentRoll: rentRoll || [],
      grossRent: grossRent ? parseFloat(grossRent) : null,
      vacancyRate: vacancyRate ? parseFloat(vacancyRate) : null,
      valuationResult: valuation || null,
      underwritingResult: underwriting || null,
      propertyTypeFrontend: propertyType || '',
      city: city || '',
      state: state || '',
      zipCode: zipCode || '',
      beds: beds || '',
      baths: baths || '',
      imageLabels: imageLabels || {},
    };

    const expenseData = {
      expenses: expenses || [],
      operatingExpenseRatio: operatingExpenseRatio ? parseFloat(operatingExpenseRatio) : null,
    };

    const financingData = {
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      downPaymentPercent: downPaymentPercent ? parseFloat(downPaymentPercent) : null,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      loanTerm: loanTerm ? parseFloat(loanTerm) : null,
      askingPrice: askingPrice ? parseFloat(askingPrice) : null,
    };

    const prismaPropertyType = mapPropertyType(propertyType || '');

    // If id provided, try to update existing
    if (id) {
      const existing = await prisma.valuation.findUnique({
        where: { id },
        include: { property: true },
      });

      if (existing && existing.userId === userId) {
        // Update property
        await prisma.property.update({
          where: { id: existing.propertyId },
          data: {
            address: fullAddress,
            city: city || null,
            state: state || null,
            zip: zipCode || null,
            propertyType: prismaPropertyType as any,
            squareFeet: sqft ? parseFloat(sqft) : null,
            lotSize: lotSize ? parseFloat(lotSize) : null,
            yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
            units: units ? parseInt(units) : null,
          },
        });

        // Update valuation
        const updated = await prisma.valuation.update({
          where: { id },
          data: {
            name: name || existing.name,
            incomeData,
            expenseData,
            financingData,
            notes: notes || null,
            visibility: isPublic ? 'PUBLIC' : 'PRIVATE',
            purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
            estimatedValue: valuation?.estimatedValue || null,
            noi: underwriting?.noi || null,
            capRate: underwriting?.capRate || null,
            cashOnCash: underwriting?.cashOnCash || null,
            dscr: underwriting?.dscr || null,
          },
          include: { property: true },
        });

        // Sync images
        await syncImages(existing.propertyId, images || [], imageLabels || {});

        return NextResponse.json({ workspace: { id: updated.id } });
      }
    }

    // Create new property + valuation
    const property = await prisma.property.create({
      data: {
        address: fullAddress,
        city: city || null,
        state: state || null,
        zip: zipCode || null,
        propertyType: prismaPropertyType as any,
        squareFeet: sqft ? parseFloat(sqft) : null,
        lotSize: lotSize ? parseFloat(lotSize) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        units: units ? parseInt(units) : null,
      },
    });

    const newValuation = await prisma.valuation.create({
      data: {
        propertyId: property.id,
        userId,
        name: name || `${propertyType || 'Property'} - ${parsedAddress}`,
        incomeData,
        expenseData,
        financingData,
        notes: notes || null,
        visibility: isPublic ? 'PUBLIC' : 'PRIVATE',
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        estimatedValue: valuation?.estimatedValue || null,
        noi: underwriting?.noi || null,
        capRate: underwriting?.capRate || null,
        cashOnCash: underwriting?.cashOnCash || null,
        dscr: underwriting?.dscr || null,
        status: 'DRAFT',
      },
    });

    // Save images
    await syncImages(property.id, images || [], imageLabels || {});

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'saved_workspace',
        entityType: 'valuation',
        entityId: newValuation.id,
        details: { name: newValuation.name, address: fullAddress },
      },
    });

    return NextResponse.json({ workspace: { id: newValuation.id } }, { status: 201 });
  } catch (error) {
    console.error('Error saving workspace:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/workspaces
 * Delete a workspace (valuation + property)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const valuation = await prisma.valuation.findUnique({
      where: { id },
    });

    if (!valuation || valuation.userId !== userId) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    const propertyId = valuation.propertyId;

    // Delete valuation (cascades to comparables via onDelete: Cascade)
    await prisma.valuation.delete({ where: { id } });

    // Delete property if no other valuations reference it
    // (PropertyImage cascade-deletes with property)
    const otherValuations = await prisma.valuation.count({ where: { propertyId } });
    if (otherValuations === 0) {
      await prisma.property.delete({ where: { id: propertyId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Sync property images - delete existing and re-create from data URLs
 */
async function syncImages(propertyId: string, images: string[], labels: Record<number, string>) {
  // Delete existing images for this property
  await prisma.propertyImage.deleteMany({ where: { propertyId } });

  // Only store image references (skip huge base64 data URLs for now - store first 200 chars as marker)
  // In production, these should be uploaded to a storage bucket
  if (images.length > 0) {
    await prisma.propertyImage.createMany({
      data: images.map((url, i) => ({
        propertyId,
        url: url.length > 500 ? url.substring(0, 500) : url, // Truncate base64 to avoid DB bloat
        caption: labels[i] || null,
        type: 'EXTERIOR' as any,
      })),
    });
  }
}
