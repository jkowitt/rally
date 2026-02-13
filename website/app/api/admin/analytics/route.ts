import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics
 * Get platform analytics and usage statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get key metrics
    const [
      totalUsers,
      newUsersInPeriod,
      totalOrganizations,
      totalValuations,
      valuationsInPeriod,
      totalProperties,
      propertiesInPeriod,
      activeUsers,
      usersByRole,
      organizationsByPlan,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // New users in period
      prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // Total organizations
      prisma.organization.count(),

      // Total valuations
      prisma.valuation.count(),

      // Valuations in period
      prisma.valuation.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // Total properties
      prisma.property.count(),

      // Properties in period
      prisma.property.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // Active users (created or updated valuation in period)
      prisma.user.count({
        where: {
          valuations: {
            some: {
              updatedAt: {
                gte: startDate,
              },
            },
          },
        },
      }),

      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true,
        },
      }),

      // Organizations by plan
      prisma.organization.groupBy({
        by: ['planType'],
        _count: {
          id: true,
        },
      }),
    ]);

    // Get activity trends (last 7 days)
    const activityTrends = await prisma.activityLog.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get most active users
    const mostActiveUsers = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        userId: {
          not: null,
        },
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Fetch user details for most active users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userIds = mostActiveUsers
      .map((u: any) => u.userId)
      .filter((id: any): id is string => id !== null);

    const userDetails = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mostActiveUsersWithDetails = mostActiveUsers.map((activity: any) => ({
      ...activity,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: userDetails.find((u: any) => u.id === activity.userId),
    }));

    // Popular actions
    const popularActions = await prisma.activityLog.groupBy({
      by: ['action'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsersInPeriod,
        totalOrganizations,
        totalValuations,
        valuationsInPeriod,
        totalProperties,
        propertiesInPeriod,
        activeUsers,
      },
      distribution: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        usersByRole: usersByRole.map((r: any) => ({
          role: r.role,
          count: r._count.id,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        organizationsByPlan: organizationsByPlan.map((p: any) => ({
          plan: p.planType,
          count: p._count.id,
        })),
      },
      trends: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activity: activityTrends.map((a: any) => ({
          date: a.createdAt,
          count: a._count.id,
        })),
      },
      topUsers: mostActiveUsersWithDetails,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      popularActions: popularActions.map((a: any) => ({
        action: a.action,
        count: a._count.id,
      })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
