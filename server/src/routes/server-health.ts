import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const startTime = Date.now();

// GET /server-health — detailed health check (admin+)
router.get('/', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  let dbStatus = 'connected';
  let dbLatencyMs = 0;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = 'disconnected';
  }

  let userCount = 0;
  let eventCount = 0;
  let pointsEntryCount = 0;
  try {
    [userCount, eventCount, pointsEntryCount] = await Promise.all([
      prisma.rallyUser.count(),
      prisma.event.count(),
      prisma.pointsEntry.count(),
    ]);
  } catch { /* ignore */ }

  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds),
    },
    memory: {
      rss: formatBytes(mem.rss),
      heapUsed: formatBytes(mem.heapUsed),
      heapTotal: formatBytes(mem.heapTotal),
      external: formatBytes(mem.external),
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    counts: {
      users: userCount,
      events: eventCount,
      pointsEntries: pointsEntryCount,
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    env: process.env.NODE_ENV || 'development',
  });
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

export default router;
