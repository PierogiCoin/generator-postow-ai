import logger from '../logger.js';
import { processPostMortems } from '../lib/postMortem.js';
import { startTwitterOAuthCleanup } from '../lib/twitterOAuthStore.js';
import { startSchedulerJob } from './schedulerJob.js';

export function startBackgroundJobs(): void {
  startTwitterOAuthCleanup();
  setInterval(processPostMortems, 30 * 60 * 1000);
  startSchedulerJob();
  logger.info('[Jobs] Background jobs started');
}
