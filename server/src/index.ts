import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import authRoutes from './routes/auth';
import schoolsRoutes from './routes/schools';
import contentRoutes from './routes/content';
import eventsRoutes from './routes/events';
import pointsRoutes from './routes/points';
import rewardsRoutes from './routes/rewards';
import notificationsRoutes from './routes/notifications';
import bonusOffersRoutes from './routes/bonus-offers';
import usersRoutes from './routes/users';
import teammatesRoutes from './routes/teammates';
import analyticsRoutes from './routes/analytics';
import demographicsRoutes from './routes/demographics';
import affiliatesRoutes from './routes/affiliates';
import monetizationRoutes from './routes/monetization';
import fanProfileRoutes from './routes/fan-profile';
import gameLobbyRoutes from './routes/game-lobby';
import crewsRoutes from './routes/crews';
import shareCardsRoutes from './routes/share-cards';
import serverHealthRoutes from './routes/server-health';
import { startScheduler } from './services/scheduler';
import { apiLimiter, authLimiter, loginLimiter } from './middleware/rate-limit';
import { requestLogger } from './middleware/request-logger';
import prisma from './lib/prisma';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Core middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Health check (lightweight, no auth)
app.get('/api/health', async (_req, res) => {
  let dbOk = true;
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbOk = false; }
  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbOk ? 'connected' : 'disconnected',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api', rewardsRoutes);      // /api/schools/:schoolId/rewards
app.use('/api/notifications', notificationsRoutes);
app.use('/api', bonusOffersRoutes);   // /api/schools/:schoolId/bonus-offers
app.use('/api/users', usersRoutes);
app.use('/api/teammates', teammatesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/demographics', demographicsRoutes);
app.use('/api/affiliates', affiliatesRoutes);
app.use('/api/monetization', monetizationRoutes);
app.use('/api/fan-profile', fanProfileRoutes);
app.use('/api/game-lobby', gameLobbyRoutes);
app.use('/api/crews', crewsRoutes);
app.use('/api/share-cards', shareCardsRoutes);
app.use('/api/server-health', serverHealthRoutes);

// 404 handler
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[FATAL]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Rally API running on http://localhost:${PORT}`);

  // Start the event-update scheduler (every 3 days + initial sync on boot)
  if (process.env.DISABLE_SCHEDULER !== 'true') {
    startScheduler();
  }
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    prisma.$disconnect().then(() => {
      console.log('Database disconnected. Bye.');
      process.exit(0);
    });
  });
  // Force exit after 10s
  setTimeout(() => { process.exit(1); }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
