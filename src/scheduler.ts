import cron from 'node-cron';
import { getSetting } from './db/repo';
import { runCuration } from './curator/runCuration';

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

  let intervalHours = parseInt(getSetting('schedule_interval_hours') || '12', 10);
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
