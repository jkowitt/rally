import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/database/browse?table=User&page=1&pageSize=25&sort=createdAt&dir=desc&search=term
 *
 * Browse rows in a specific table with pagination, sorting, and search.
 * Requires ADMIN or SUPER_ADMIN role.
 */

// Whitelist of tables that can be browsed (maps display name to actual table)
const ALLOWED_TABLES = new Set([
  "User",
  "Account",
  "Session",
  "VerificationToken",
  "Organization",
  "OrganizationMember",
  "Property",
  "PropertyImage",
  "Valuation",
  "ValuationScenario",
  "Comparable",
  "Portfolio",
  "MarketData",
  "CMSContent",
  "MediaAsset",
  "ActivityLog",
  "SystemConfig",
  "PlatformAccess",
  "Subscription",
  "Payment",
  "BusinessProject",
  "BusinessTask",
  "BusinessMilestone",
  "CRMLead",
  "CRMDeal",
  "CRMActivity",
  "CRMNote",
  "WorksOrganization",
  "WorksOrgMember",
  "TalentProfile",
  "WorksSkill",
  "TalentSkill",
  "ProofItem",
  "WorksProject",
  "WorksApplication",
  "WorksEngagement",
  "WorksMilestone",
  "WorksSubmission",
  "WorksOutcomeLog",
  "WorksFeedback",
  "WorksReport",
]);

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10))
    );
    const sort = searchParams.get("sort") || "id";
    const dir = searchParams.get("dir") === "asc" ? "ASC" : "DESC";
    const search = searchParams.get("search") || "";

    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json(
        { error: `Invalid table name: ${table}` },
        { status: 400 }
      );
    }

    // Validate sort column exists by checking information_schema
    const columns: Array<{ column_name: string; data_type: string }> =
      await prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${table}
        ORDER BY ordinal_position
      `;

    if (columns.length === 0) {
      return NextResponse.json(
        { error: `Table "${table}" not found or has no columns` },
        { status: 404 }
      );
    }

    const columnNames = columns.map((c) => c.column_name);

    // Validate sort column
    const safeSort = columnNames.includes(sort) ? sort : "id";

    // Build query
    const offset = (page - 1) * pageSize;
    const quotedTable = `"${table}"`;
    const quotedSort = `"${safeSort}"`;

    let rows: unknown[];
    let totalCount: Array<{ count: bigint }>;

    if (search) {
      // Search across text/varchar columns
      const textCols = columns
        .filter((c) =>
          ["text", "character varying", "varchar"].includes(
            c.data_type.toLowerCase()
          )
        )
        .map((c) => c.column_name);

      if (textCols.length > 0) {
        const searchCondition = textCols
          .map((col) => `"${col}"::text ILIKE $1`)
          .join(" OR ");

        const searchParam = `%${search}%`;

        rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM ${quotedTable} WHERE ${searchCondition} ORDER BY ${quotedSort} ${dir} LIMIT ${pageSize} OFFSET ${offset}`,
          searchParam
        );
        totalCount = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::bigint AS count FROM ${quotedTable} WHERE ${searchCondition}`,
          searchParam
        );
      } else {
        rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM ${quotedTable} ORDER BY ${quotedSort} ${dir} LIMIT ${pageSize} OFFSET ${offset}`
        );
        totalCount = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::bigint AS count FROM ${quotedTable}`
        );
      }
    } else {
      rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM ${quotedTable} ORDER BY ${quotedSort} ${dir} LIMIT ${pageSize} OFFSET ${offset}`
      );
      totalCount = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::bigint AS count FROM ${quotedTable}`
      );
    }

    // Serialise BigInts
    const serialised = JSON.parse(
      JSON.stringify(rows, (_key, value) =>
        typeof value === "bigint" ? Number(value) : value
      )
    );

    const total = Number(totalCount[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      table,
      columns: columns.map((c) => ({
        name: c.column_name,
        type: c.data_type,
      })),
      rows: serialised,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Database browse error:", error);
    return NextResponse.json(
      { error: "Failed to browse table", detail: error?.message },
      { status: 500 }
    );
  }
}
