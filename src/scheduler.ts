import cron from 'node-cron';
import { runCuration } from './curator/runCuration';
import { getSetting } from './db/repo';

let currentTask: cron.ScheduledTask | null = null;

export function initScheduler() {
  scheduleNextRun();
}

export function scheduleNextRun() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }

  const enabled = getSetting('schedule_enabled') === 'true'; // stored as string "true"/"false"
  if (!enabled) {
    console.log('Scheduler is disabled.');
    return;
  }

  let intervalHours = parseInt(
    getSetting('schedule_interval_hours') || '12',
    10
  );
  if (isNaN(intervalHours) || intervalHours < 1) intervalHours = 12;

  // e.g. "0 */12 * * *" or just using basic interval
  console.log(`Scheduling curation every ${intervalHours} hours.`);

  // construct cron expression
  // If 12 hours, run at 0, 12. If 24 hours, run at 0. If 2 hours, run at 0, 2, 4...
  // Use simple interval: "0 */N * * *"
  const expression = `0 */${intervalHours} * * *`;

  currentTask = cron.schedule(expression, () => {
    console.log('Running scheduled curation...');
    runCuration();
  });
}

export function getNextRunTime(): Date | null {
  const enabled = getSetting('schedule_enabled') === 'true';
  if (!enabled) return null;

  let intervalHours = parseInt(
    getSetting('schedule_interval_hours') || '12',
    10
  );
  if (isNaN(intervalHours) || intervalHours < 1) intervalHours = 12;

  const now = new Date();

  // Potential run hours: 0, 0+N, 0+2N, ... < 24
  const runHours: number[] = [];
  for (let h = 0; h < 24; h += intervalHours) {
    runHours.push(h);
  }

  // Find next hour today
  const nextToday = runHours.find((h) => {
    // If hour is greater than current hour
    // OR hour is equal but minute is currently < 0 (scheduled is 00)
    // Actually cron runs at minute 0. So if now is 12:01, 12:00 is too late.
    // So simple: hour > currentHour
    // BUT if now is 11:59, 12:00 is valid.
    // If now is 12:00:01, 12:00 is passed.
    // So we need a strictly future time.
    const candidate = new Date(now);
    candidate.setHours(h, 0, 0, 0);
    return candidate > now;
  });

  if (nextToday !== undefined) {
    const d = new Date(now);
    d.setHours(nextToday, 0, 0, 0);
    return d;
  }

  // Else, first hour tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(runHours[0], 0, 0, 0);
  return tomorrow;
}
