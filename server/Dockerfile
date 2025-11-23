# Backend Dockerfile for Railway
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files from server directory
COPY server/package*.json ./

# Install dependencies (include tsx for running TypeScript)
RUN npm install

# Copy application code from server directory
COPY server/ .

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
