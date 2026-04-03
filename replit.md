# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Livia Game (mobile)
- **Type**: Expo mobile app
- **Path**: `artifacts/mobile/`
- **Preview**: `/`
- A side-scrolling platformer game "Livia e il Regno Incantato" (Livia and the Enchanted Kingdom)
- Character Livia runs, jumps, collects donuts, stomps broccoli enemies
- Built with React Native WebView embedding the HTML5 Canvas game
- Game HTML embedded as TypeScript module in `assets/game-html.ts`
- Web fallback via iframe for browser preview

### API Server
- **Type**: Express API
- **Path**: `artifacts/api-server/`
- **Preview**: `/api`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
