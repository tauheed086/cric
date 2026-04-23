# Local Cricket Tournament Platform

Monorepo implementation of a single-tournament local cricket scoring and management platform.

## Stack

- Frontend: React + TypeScript + Vite (`apps/web`)
- Backend: NestJS + Prisma + PostgreSQL (`apps/api`)
- Shared contracts: `packages/types`
- Real-time updates: Server-Sent Events (`/events/tournament`, `/events/matches/:matchId`)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:
- Copy `apps/api/.env.example` to `apps/api/.env`
- Copy `apps/web/.env.example` to `apps/web/.env`

3. Run database migration and Prisma client generation:

```bash
npm run -w @cric/api prisma:migrate
npm run -w @cric/api prisma:generate
```

4. Seed sample data:

```bash
npm run -w @cric/api prisma:seed
```

5. Run backend and frontend in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

## Useful Commands

```bash
npm run build
npm test
```

## Auth

Admin routes use request headers:
- `x-admin-token` (default: `local-admin-token`)
- `x-admin-name` (audit identity)

The web admin UI sends these headers automatically from `apps/web/.env`.
