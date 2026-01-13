# Local Development Guide

This guide explains how to set up and run Cogtics locally for development.

## Prerequisites

- **Node.js** 20.x or later (LTS recommended)
- **pnpm** 8.x or later (`npm install -g pnpm`)
- **Docker** and **Docker Compose**
- **dbmate** for migrations (`brew install dbmate` on macOS or see [dbmate releases](https://github.com/amacneil/dbmate/releases))

## Quick Start

### 1. Clone and Install

```bash
# Install dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp env.example .env
```

The default values in `env.example` work with the Docker Compose setup.

### 3. Start Infrastructure

```bash
# Start Postgres, Redis, MinIO, pgAdmin
pnpm docker:up

# Check services are running
docker ps
```

Services will be available at:
- **Postgres**: localhost:5432
- **Redis**: localhost:6379
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **pgAdmin**: http://localhost:5050 (admin@cogtics.dev/admin)

### 4. Run Migrations

```bash
# Apply database migrations
pnpm db:migrate

# Seed roles, permissions, and test data
pnpm db:seed
```

### 5. Start Development Servers

```bash
# Start API and Worker (with Docker infra)
pnpm dev

# Or start individually:
pnpm dev:api    # API only
pnpm dev:worker # Worker only
```

The API will be available at http://localhost:3000

## Test Credentials

After running `db:seed`, the following test users are available:

| Role    | User ID  | Email             |
|---------|----------|-------------------|
| Admin   | user_01  | admin@test.com    |
| CFO     | user_02  | cfo@test.com      |
| Analyst | user_03  | analyst@test.com  |

Tenant ID: `tenant_01`

## Making API Requests

In dev mode, authentication is header-based. Include these headers:

```bash
curl http://localhost:3000/me \
  -H "x-tenant-id: tenant_01" \
  -H "x-user-id: user_01"
```

## Common Commands

```bash
# Start Docker infrastructure
pnpm docker:up

# Stop Docker infrastructure
pnpm docker:down

# View Docker logs
pnpm docker:logs

# Run migrations
pnpm db:migrate

# Create new migration
cd packages/db && pnpm migrate:new <name>

# Seed database
pnpm db:seed

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

## Project Structure

```
.
├── apps/
│   ├── api/           # Fastify API server
│   └── worker/        # BullMQ job processor
├── packages/
│   ├── db/            # Kysely client + migrations
│   ├── schemas/       # Zod validation schemas
│   └── utils/         # Shared utilities
├── docker/
│   └── docker-compose.yml
├── docs/              # Documentation
└── SaaS/saas-app/     # React frontend
```

## Troubleshooting

### Port already in use

```bash
# Find and kill process on port 3000
npx kill-port 3000
```

### Database connection issues

1. Check Docker is running: `docker ps`
2. Check Postgres logs: `docker logs cogtics-postgres`
3. Verify DATABASE_URL in .env matches docker-compose settings

### Redis connection issues

1. Check Redis is running: `docker logs cogtics-redis`
2. Test connection: `docker exec cogtics-redis redis-cli ping`

### Migration failures

1. Check migration status: `cd packages/db && pnpm migrate:status`
2. Roll back: `cd packages/db && pnpm migrate:down`
3. Check SQL syntax in migration files

## VS Code Setup

Recommended extensions:
- ESLint
- Prettier
- Prisma (for SQL syntax)
- Docker

Recommended settings:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

