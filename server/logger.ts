import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level from environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Custom format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Custom format for production (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Choose format based on environment
const logFormat = process.env.NODE_ENV === 'production' ? prodFormat : devFormat;

// Define transports
const transports: winston.transport[] = [
  // Console output
  new winston.transports.Console({
    format: devFormat,
  }),
  
  // Error logs
  new winston.transports.File({
    filename: path.join(__dirname, 'logs', 'error.log'),
    level: 'error',
    format: prodFormat,
  }),
  
  // Combined logs
  new winston.transports.File({
    filename: path.join(__dirname, 'logs', 'combined.log'),
    format: prodFormat,
  }),
  
  // HTTP logs (for request tracking)
  new winston.transports.File({
    filename: path.join(__dirname, 'logs', 'http.log'),
    level: 'http',
    format: prodFormat,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'exceptions.log'),
      format: prodFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'rejections.log'),
      format: prodFormat,
    }),
  ],
});

// Morgan middleware integration for HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logRequest = (req: any, statusCode: number, duration: number) => {
  logger.http('Request completed', {
    method: req.method,
    url: req.url,
    statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userId: req.header('x-user-id') || 'anonymous',
  });
};

export const logAPICall = (provider: string, endpoint: string, duration: number, success: boolean) => {
  logger.info('API call', {
    provider,
    endpoint,
    duration: `${duration}ms`,
    success,
    timestamp: new Date().toISOString(),
  });
};

export const logCost = (userId: string, operation: string, cost: number, provider: string) => {
  logger.info('Cost tracking', {
    userId,
    operation,
    cost: `$${cost.toFixed(4)}`,
    provider,
    timestamp: new Date().toISOString(),
  });
};

export const logValidationError = (endpoint: string, errors: any[], ip: string) => {
  logger.warn('Validation failed', {
    endpoint,
    errors,
    ip,
    timestamp: new Date().toISOString(),
  });
};

export const logRateLimit = (endpoint: string, ip: string, userId?: string) => {
  logger.warn('Rate limit exceeded', {
    endpoint,
    ip,
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
  });
};

export default logger;
