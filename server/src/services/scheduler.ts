import cron from 'node-cron';
import { updateAllEvents, UpdateResult } from './event-updater';

let lastRun: UpdateResult | null = null;
let isRunning = false;

// Start the event-update cron job.
// Runs every 3 days at 4:00 AM server time.
// Cron expression: "0 4 every-3rd-day * *"  (minute=0, hour=4, every 3rd day)
export function startScheduler(): void {
  console.log('[Scheduler] Registering event-update cron (every 3 days at 4:00 AM)');

  cron.schedule('0 4 */3 * *', async () => {
    if (isRunning) {
      console.log('[Scheduler] Skipping — previous run still in progress');
      return;
    }
    isRunning = true;
    try {
      lastRun = await updateAllEvents(10);
    } catch (err) {
      console.error('[Scheduler] Cron run failed:', err);
    } finally {
      isRunning = false;
    }
  });

  // Also run once on startup (delayed 10s to let DB connections settle)
  setTimeout(async () => {
    if (isRunning) return;
    isRunning = true;
    console.log('[Scheduler] Running initial event sync...');
    try {
      lastRun = await updateAllEvents(10);
    } catch (err) {
      console.error('[Scheduler] Initial run failed:', err);
    } finally {
      isRunning = false;
    }
  }, 10_000);
}

/**
 * Trigger an immediate event update (for admin API).
 * Returns the result or throws if already running.
 */
export async function triggerManualUpdate(lookAheadDays = 10): Promise<UpdateResult> {
  if (isRunning) {
    throw new Error('An update is already in progress');
  }
  isRunning = true;
  try {
    lastRun = await updateAllEvents(lookAheadDays);
    return lastRun;
  } finally {
    isRunning = false;
  }
}

/** Get the result of the most recent run (null if never run). */
export function getLastRunResult(): UpdateResult | null {
  return lastRun;
}

/** Whether an update is currently in progress. */
export function isUpdateRunning(): boolean {
  return isRunning;
}
