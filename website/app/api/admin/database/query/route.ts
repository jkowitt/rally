import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/database/query
 *
 * Execute a READ-ONLY SQL query against the database.
 * Only SELECT statements are allowed — anything else is rejected.
 * Requires SUPER_ADMIN role.
 *
 * Body: { sql: string }
 */

const BLOCKED_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "REVOKE",
  "COPY",
  "EXECUTE",
  "EXEC",
  "SET ",
  "VACUUM",
  "REINDEX",
  "CLUSTER",
  "COMMENT",
  "LOCK",
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. SUPER_ADMIN role required for raw queries." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const sql = (body.sql || "").trim();

    if (!sql) {
      return NextResponse.json(
        { error: "No SQL query provided" },
        { status: 400 }
      );
    }

    // Only allow SELECT / WITH (CTE) / EXPLAIN
    const normalised = sql.toUpperCase().replace(/\s+/g, " ");
    const startsValid =
      normalised.startsWith("SELECT") ||
      normalised.startsWith("WITH") ||
      normalised.startsWith("EXPLAIN");

    if (!startsValid) {
      return NextResponse.json(
        { error: "Only SELECT queries are allowed." },
        { status: 400 }
      );
    }

    // Double-check for mutation keywords
    for (const kw of BLOCKED_KEYWORDS) {
      if (normalised.includes(kw)) {
        return NextResponse.json(
          { error: `Blocked keyword detected: ${kw.trim()}` },
          { status: 400 }
        );
      }
    }

    // Execute as raw query with Prisma
    const rows: unknown[] = await prisma.$queryRawUnsafe(sql);

    // Serialise BigInts to numbers
    const serialised = JSON.parse(
      JSON.stringify(rows, (_key, value) =>
        typeof value === "bigint" ? Number(value) : value
      )
    );

    return NextResponse.json({
      success: true,
      rowCount: serialised.length,
      rows: serialised.slice(0, 500), // cap at 500 rows
    });
  } catch (error: any) {
    console.error("Query execution error:", error);
    return NextResponse.json(
      {
        error: "Query failed",
        detail: error?.message || "Unknown error",
      },
      { status: 400 }
    );
  }
}
