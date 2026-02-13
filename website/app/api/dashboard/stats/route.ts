import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/stats
 * Returns real dashboard statistics for the authenticated user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        properties: 0,
        valuations: 0,
        recentActivity: [],
      });
    }

    const userId = (session.user as any).id;

    const [propertyCount, valuationCount, recentActivity] = await Promise.all([
      // Count properties that have valuations for this user
      prisma.property.count({
        where: {
          valuations: { some: { userId } },
        },
      }),

      // Count valuations
      prisma.valuation.count({
        where: { userId },
      }),

      // Fetch recent activity log entries
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          action: true,
          entityType: true,
          details: true,
          createdAt: true,
        },
      }),
    ]);

    // Format activity for display
    const formattedActivity = recentActivity.map((entry) => {
      const details = (entry.details || {}) as Record<string, any>;
      const actionLabels: Record<string, string> = {
        created_valuation: 'New valuation created',
        updated_valuation: 'Valuation updated',
        created_property: 'Property added',
        property_record_lookup: 'Property record lookup',
        beta_user_registered: 'Account created',
        beta_user_registered_oauth: 'Account created via Google',
      };

      const actionLabel = actionLabels[entry.action] || entry.action;
      const item = details.propertyAddress || details.valuationName || details.address || '';

      // Relative time
      const now = Date.now();
      const created = new Date(entry.createdAt).getTime();
      const diffMs = now - created;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let time = 'Just now';
      if (diffDays > 1) time = `${diffDays} days ago`;
      else if (diffDays === 1) time = 'Yesterday';
      else if (diffHours >= 1) time = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      else if (diffMins >= 1) time = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

      return {
        id: entry.id,
        platform: 'Legacy RE',
        action: actionLabel,
        item,
        time,
        type: entry.entityType === 'valuation' ? 'valuation' : 'deal',
      };
    });

    return NextResponse.json({
      properties: propertyCount,
      valuations: valuationCount,
      recentActivity: formattedActivity,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({
      properties: 0,
      valuations: 0,
      recentActivity: [],
    });
  }
}
