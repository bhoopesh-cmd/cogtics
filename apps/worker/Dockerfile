# Multi-stage Dockerfile for Cogtics Worker
# Production-ready build using esbuild bundling via CLI

FROM node:20-alpine AS base

# Install pnpm and esbuild globally
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g esbuild

WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy all packages and worker
COPY packages/ packages/
COPY apps/worker/ apps/worker/

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Bundle worker using esbuild CLI
# This compiles TS to JS and bundles all internal @cogtics/ packages into one file
WORKDIR /app/apps/worker
# Explicitly list external dependencies to exclude from bundle
RUN esbuild src/bootstrap.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --outfile=dist/bootstrap.js \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
  --external:bullmq \
  --external:dotenv \
  --external:ioredis \
  --external:papaparse \
  --external:pdf-parse \
  --external:pino \
  --external:pino-pretty

# Stage 2: Production image
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package management files
# Copy package management files
# Note: We do NOT copy pnpm-workspace.yaml to avoid workspace resolution issues in production
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/apps/worker/package.json ./package.json
# Copy bundled output
COPY --from=base /app/apps/worker/dist ./dist

# Script to remove @cogtics deps from package.json for prod install
# (Same as before)
RUN node -e "const fs=require('fs'); const p='package.json'; const j=JSON.parse(fs.readFileSync(p,'utf8')); \
  j.dependencies = Object.fromEntries(Object.entries(j.dependencies).filter(([k]) => !k.startsWith('@cogtics/'))); \
  fs.writeFileSync(p,JSON.stringify(j,null,2));"

# Install production dependencies only
RUN pnpm install --prod

# Environment
ENV NODE_ENV=production

# Health check (matches before)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Expose health check port
EXPOSE 3001

# Start bundled worker
CMD ["node", "dist/bootstrap.js"]
