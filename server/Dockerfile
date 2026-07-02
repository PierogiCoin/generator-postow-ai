FROM node:22-alpine

# Mirror repo layout: server/, config/, types.ts (required by lib/pricingConfig.ts)
WORKDIR /workspace

COPY server/package.json server/package-lock.json* ./server/
WORKDIR /workspace/server
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

WORKDIR /workspace
COPY config ./config
COPY types.ts ./types.ts
COPY server ./server

WORKDIR /workspace/server

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "index.ts"]
