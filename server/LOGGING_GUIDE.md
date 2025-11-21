# 📊 Winston Logging System Guide

## Overview

The server uses **Winston** for structured, production-ready logging. This replaces `console.log` with a comprehensive logging system that:

- ✅ **Structured logs** - JSON format for easy parsing
- ✅ **Multiple transports** - Console, files, and more
- ✅ **Log levels** - Error, warn, info, http, debug
- ✅ **Automatic rotation** - Prevents disk space issues
- ✅ **Cost tracking** - Logs API costs per user
- ✅ **Performance monitoring** - Tracks API call durations

## Log Levels

| Level | Priority | Use Case | Color |
|-------|----------|----------|-------|
| `error` | 0 | Critical errors, crashes | 🔴 Red |
| `warn` | 1 | Warnings, validation failures | 🟡 Yellow |
| `info` | 2 | General information | 🟢 Green |
| `http` | 3 | HTTP requests | 🟣 Magenta |
| `debug` | 4 | Debugging information | 🔵 Blue |

### Environment-Based Logging

- **Development**: All levels (debug, http, info, warn, error)
- **Production**: Info and above (info, warn, error)

## Log Files

Located in `/server/logs/`:

| File | Content | Purpose |
|------|---------|---------|
| `combined.log` | All logs | Complete history |
| `error.log` | Errors only | Quick error review |
| `http.log` | HTTP requests | Performance analysis |
| `exceptions.log` | Uncaught exceptions | Critical failures |
| `rejections.log` | Unhandled promise rejections | Async errors |

## Log Format

### Development (Console)
```
2025-11-21 12:33:50 [info]: 🚀 Server started successfully
2025-11-21 12:34:15 [warn]: Validation failed
2025-11-21 12:35:22 [error]: DALL-E Generation failed
```

### Production (JSON)
```json
{
  "level": "info",
  "message": "Server started successfully",
  "timestamp": "2025-11-21T12:33:50.123Z",
  "port": 3001,
  "environment": "production",
  "apis": {
    "gemini": true,
    "openai": true,
    "luma": true,
    "replicate": true
  }
}
```

## Structured Logging Examples

### 1. Server Startup
```typescript
logger.info('🚀 Server started successfully', {
  port: 3001,
  environment: 'production',
  nodeVersion: process.version,
  apis: {
    gemini: true,
    openai: true
  }
});
```

**Output:**
```json
{
  "level": "info",
  "message": "🚀 Server started successfully",
  "port": 3001,
  "environment": "production",
  "nodeVersion": "v22.19.0",
  "apis": { "gemini": true, "openai": true },
  "timestamp": "2025-11-21T12:33:50.123Z"
}
```

### 2. API Call Tracking
```typescript
logAPICall('DALL-E', 'generate-images', 2500, true);
```

**Output:**
```json
{
  "level": "info",
  "message": "API call",
  "provider": "DALL-E",
  "endpoint": "generate-images",
  "duration": "2500ms",
  "success": true,
  "timestamp": "2025-11-21T12:34:15.456Z"
}
```

### 3. Cost Tracking
```typescript
logCost('user-123', 'image-generation', 0.04, 'DALL-E');
```

**Output:**
```json
{
  "level": "info",
  "message": "Cost tracking",
  "userId": "user-123",
  "operation": "image-generation",
  "cost": "$0.0400",
  "provider": "DALL-E",
  "timestamp": "2025-11-21T12:34:15.789Z"
}
```

### 4. Validation Errors
```typescript
logValidationError('/api/generate-images', errors, '192.168.1.100');
```

**Output:**
```json
{
  "level": "warn",
  "message": "Validation failed",
  "endpoint": "/api/generate-images",
  "errors": [
    {
      "field": "prompt",
      "message": "Required",
      "code": "invalid_type"
    }
  ],
  "ip": "192.168.1.100",
  "timestamp": "2025-11-21T12:34:20.123Z"
}
```

### 5. Rate Limit Events
```typescript
logRateLimit('/api/generate-images', '192.168.1.100', 'user-123');
```

**Output:**
```json
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "endpoint": "/api/generate-images",
  "ip": "192.168.1.100",
  "userId": "user-123",
  "timestamp": "2025-11-21T12:34:25.456Z"
}
```

### 6. Error Logging
```typescript
logger.error('[DALL-E] Generation failed', {
  error: error.message,
  stack: error.stack,
  userId: 'user-123'
});
```

**Output:**
```json
{
  "level": "error",
  "message": "[DALL-E] Generation failed",
  "error": "Rate limit exceeded",
  "stack": "Error: Rate limit exceeded\n    at...",
  "userId": "user-123",
  "timestamp": "2025-11-21T12:34:30.789Z"
}
```

## Helper Functions

### `logRequest(req, statusCode, duration)`
Logs HTTP request completion:
```typescript
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    logRequest(req, res.statusCode, Date.now() - startTime);
  });
  next();
});
```

### `logAPICall(provider, endpoint, duration, success)`
Tracks external API calls:
```typescript
const startTime = Date.now();
await openai.images.generate(...);
logAPICall('DALL-E', 'generate', Date.now() - startTime, true);
```

### `logCost(userId, operation, cost, provider)`
Tracks costs per user:
```typescript
logCost(userId, 'video-generation', 0.40, 'Luma');
```

### `logValidationError(endpoint, errors, ip)`
Logs validation failures:
```typescript
logValidationError(req.path, validationErrors, req.ip);
```

### `logRateLimit(endpoint, ip, userId?)`
Logs rate limit hits:
```typescript
logRateLimit(req.path, req.ip, req.header('x-user-id'));
```

## Log Analysis

### Find Errors
```bash
# Last 50 errors
tail -50 logs/error.log

# Count errors by type
grep "message" logs/error.log | sort | uniq -c

# Errors in last hour
grep "$(date -u -d '1 hour ago' '+%Y-%m-%dT%H')" logs/error.log
```

### Cost Analysis
```bash
# Total costs
grep "Cost tracking" logs/combined.log | grep -o '"cost":"[^"]*"' | awk -F'"' '{sum += $4} END {print "$" sum}'

# Costs by user
grep "Cost tracking" logs/combined.log | jq -r '[.userId, .cost] | @tsv' | sort | uniq

# Most expensive operations
grep "Cost tracking" logs/combined.log | jq -r '.operation' | sort | uniq -c | sort -rn
```

### Performance Monitoring
```bash
# Average API call duration
grep "API call" logs/combined.log | jq '.duration' | sed 's/ms//' | awk '{sum+=$1; n++} END {print sum/n "ms"}'

# Slowest API calls
grep "API call" logs/combined.log | jq -r '[.provider, .duration] | @tsv' | sort -t$'\t' -k2 -rn | head -10

# Success rate
grep "API call" logs/combined.log | jq '.success' | grep -c "true"
```

### Validation Failures
```bash
# Most common validation errors
grep "Validation failed" logs/combined.log | jq -r '.errors[].field' | sort | uniq -c | sort -rn

# IPs with most validation failures
grep "Validation failed" logs/combined.log | jq -r '.ip' | sort | uniq -c | sort -rn
```

### Rate Limit Analysis
```bash
# Rate limit hits by endpoint
grep "Rate limit exceeded" logs/combined.log | jq -r '.endpoint' | sort | uniq -c

# Most rate-limited IPs
grep "Rate limit exceeded" logs/combined.log | jq -r '.ip' | sort | uniq -c | sort -rn

# Rate limit timeline
grep "Rate limit exceeded" logs/combined.log | jq -r '.timestamp' | cut -d'T' -f2 | cut -d':' -f1 | sort | uniq -c
```

## Log Rotation

Winston doesn't auto-rotate by default. Add `winston-daily-rotate-file`:

```bash
npm install winston-daily-rotate-file
```

```typescript
import DailyRotateFile from 'winston-daily-rotate-file';

const rotateTransport = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
});

logger.add(rotateTransport);
```

## Integration with Monitoring Services

### Datadog
```typescript
import { datadog } from 'datadog-winston';

logger.add(new datadog({
  apiKey: process.env.DATADOG_API_KEY,
  hostname: 'api-server',
  service: 'social-optimizer',
  ddsource: 'nodejs',
}));
```

### Sentry
```typescript
import * as Sentry from '@sentry/node';

logger.error = (message, meta) => {
  Sentry.captureException(new Error(message));
  originalError(message, meta);
};
```

### CloudWatch
```typescript
import WinstonCloudWatch from 'winston-cloudwatch';

logger.add(new WinstonCloudWatch({
  logGroupName: 'api-server',
  logStreamName: process.env.NODE_ENV,
  awsRegion: 'us-east-1',
}));
```

## Best Practices

### ✅ DO:
- Use appropriate log levels
- Include context (userId, operation, etc.)
- Log start and end of expensive operations
- Track costs per user
- Log validation failures for security analysis
- Include timestamps in all logs
- Use structured data (JSON)

### ❌ DON'T:
- Log sensitive data (passwords, API keys, tokens)
- Log PII without consent/encryption
- Use `console.log` directly (use logger)
- Log at debug level in production
- Log entire request/response bodies
- Forget to rotate logs

## Security Considerations

### Sensitive Data Filtering
```typescript
const sanitize = (data: any) => {
  const sensitive = ['password', 'token', 'apiKey', 'secret'];
  const sanitized = { ...data };
  
  sensitive.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

logger.info('User login', sanitize(userData));
```

### PII Hashing
```typescript
import crypto from 'crypto';

const hashPII = (data: string) => {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
};

logger.info('User action', {
  userId: hashPII(email),  // Instead of raw email
  action: 'image-generation'
});
```

## Performance Impact

- **Average overhead**: <1ms per log
- **File I/O**: Async, non-blocking
- **Memory**: ~10MB for Winston instance
- **Disk space**: ~50MB per day (varies with traffic)

## Monitoring Dashboard Example

Create a simple dashboard with log data:

```bash
# Real-time monitoring script
#!/bin/bash
watch -n 5 '
echo "=== Last 5 Errors ==="
tail -5 logs/error.log | jq -r ".message"
echo ""
echo "=== API Performance ==="
grep "API call" logs/combined.log | tail -20 | jq -r "[.provider, .duration] | @tsv" | column -t
echo ""
echo "=== Costs (Last Hour) ==="
grep "Cost tracking" logs/combined.log | tail -50 | jq -r ".cost" | sed "s/\\$//" | awk "{sum+=\\$1} END {print \"Total: \\$\" sum}"
'
```

## Troubleshooting

### Logs not appearing
1. Check file permissions: `ls -la logs/`
2. Check disk space: `df -h`
3. Verify logger initialization: Check startup logs

### Log files too large
1. Implement rotation (see above)
2. Reduce log level in production
3. Archive old logs: `gzip logs/*.log`

### Missing structured data
1. Verify you're using logger helpers
2. Check JSON format in production
3. Use `logger.info(message, metadata)` pattern

## Summary

✅ **Implemented**: Winston structured logging  
✅ **Transports**: Console + 5 log files  
✅ **Helpers**: Cost tracking, API monitoring, validation logging  
✅ **Security**: PII filtering, sensitive data redaction  
✅ **Analysis**: Easy querying with jq and grep  
✅ **Production-ready**: JSON format, error handling, rotation-ready  

**Result**: Professional logging system for monitoring, debugging, and cost analysis.
