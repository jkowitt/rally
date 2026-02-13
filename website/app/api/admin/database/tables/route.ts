import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/database/tables
 *
 * Returns every user-defined table with live row count and disk size.
 * Requires ADMIN or SUPER_ADMIN role.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    // Query pg_stat_user_tables for real stats
    const tables: Array<{
      table_name: string;
      row_estimate: bigint;
      total_size: string;
    }> = await prisma.$queryRaw`
      SELECT
        c.relname                                     AS table_name,
        c.reltuples::bigint                           AS row_estimate,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname = 'public'
      ORDER BY c.reltuples DESC
    `;

    const result = tables.map((t) => ({
      name: t.table_name,
      rowCount: Number(t.row_estimate),
      size: t.total_size,
    }));

    return NextResponse.json({ success: true, tables: result });
  } catch (error) {
    console.error("Database tables error:", error);
    return NextResponse.json(
      { error: "Failed to fetch table information" },
      { status: 500 }
    );
  }
}
