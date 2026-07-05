import logger from '../logger.js';
import { processPostMortems } from '../lib/postMortem.js';
import { startTwitterOAuthCleanup } from '../lib/twitterOAuthStore.js';
import { startSchedulerJob } from './schedulerJob.js';
import { processEmailQueue, checkInactiveUsers } from '../lib/emailQueueProcessor.js';

export function startBackgroundJobs(): void {
  startTwitterOAuthCleanup();
  setInterval(processPostMortems, 30 * 60 * 1000);
  startSchedulerJob();

  // Email queue — przetwarzaj co 10 minut
  setInterval(processEmailQueue, 10 * 60 * 1000);

  // Re-engagement check — raz dziennie
  setInterval(checkInactiveUsers, 24 * 60 * 60 * 1000);

  logger.info('[Jobs] Background jobs started');
}
