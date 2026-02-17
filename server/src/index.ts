import express from 'express';
import cors from 'cors';
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
import { startScheduler } from './services/scheduler';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.listen(PORT, () => {
  console.log(`Rally API running on http://localhost:${PORT}`);

  // Start the event-update scheduler (every 3 days + initial sync on boot)
  if (process.env.DISABLE_SCHEDULER !== 'true') {
    startScheduler();
  }
});

export default app;
