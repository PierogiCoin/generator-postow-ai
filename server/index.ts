import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { startBackgroundJobs } from './jobs/index.js';
import logger from './logger.js';
import { apiKey, openai, luma, replicate } from './lib/clients.js';

const env = loadEnv();
const app = createApp();
const port = env.PORT;

// Joby w tle (scheduler, post-mortem) wymagają always-on procesu — nie uruchamiaj na Vercel serverless
if (process.env.VERCEL !== '1') {
  startBackgroundJobs();
} else {
  logger.info('[Jobs] Pominięto joby w tle (środowisko Vercel serverless)');
}

app.listen(port, () => {
  logger.info('🚀 Server started successfully', {
    port,
    mode: 'AI Studio API Key',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    apis: {
      gemini: !!apiKey,
      openai: !!openai,
      luma: !!luma,
      replicate: !!replicate,
    },
  });
  logger.info(`[server] Server running on port ${port}`);
});
