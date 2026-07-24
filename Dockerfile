FROM node:22-alpine

# Backend Express — Railway (ten plik = jedyny Dockerfile produkcyjny)
# Frontend: Vercel (vite → dist + api/* proxy przez BACKEND_URL)
WORKDIR /workspace

COPY server/package.json server/package-lock.json* ./server/
WORKDIR /workspace/server
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

WORKDIR /workspace
COPY config ./config
COPY types.ts ./types.ts
COPY prompts ./prompts
COPY utils ./utils
COPY server ./server

WORKDIR /workspace/server

# Fail build early if vendored shared modules are missing
RUN test -f ./prompts/plAntiSlop.ts \
  && test -f ./utils/textSimilarity.ts \
  && grep -q 'export function buildAntiSlopBlock' ./prompts/plAntiSlop.ts \
  && grep -q 'export function tokenizeSimilarity' ./utils/textSimilarity.ts \
  && npx tsx -e "import { buildAntiSlopBlock } from './prompts/plAntiSlop.ts'; import { tokenizeSimilarity } from './utils/textSimilarity.ts'; if (typeof buildAntiSlopBlock !== 'function' || typeof tokenizeSimilarity !== 'function') { console.error('bad exports'); process.exit(1); } console.log('server shared modules ok')"

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "index.ts"]
