# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev              # Start dev server (port 3000, or PORT env)
bun test                 # Run all tests
bun test src/tests/db.test.ts  # Run a single test file
bun run build            # Bundle for production -> dist/
bun run db:seed          # Seed SQLite with sample notes
bun run bench            # Run performance benchmarks
```

## Architecture

Bun-native HTTP + WebSocket server with **zero runtime npm dependencies**. Everything (HTTP, SQLite, password hashing, file I/O, WebSockets, testing, bundling) uses Bun built-in APIs — no Node.js required.

**Entry point:** `src/server/index.ts` — creates `Bun.serve()`, registers routes on a `Router`, handles WebSocket upgrades, static file serving, request timing, and CORS.

**Router:** `src/server/router.ts` — regex-based router with path params (`:id` style). Exports `Router` class and `Handler` type. Routes registered via `router.get()`, `.post()`, `.put()`, `.delete()`.

**Handlers:** `src/server/handlers/` — each file exports plain functions matching the `Handler` type `(req, params) => Response`. Files: `notes.ts`, `auth.ts`, `files.ts`, `workers.ts`, `misc.ts` (health + stream).

**Database:** `src/server/db/connection.ts` (lazy singleton, WAL mode, schema init) + `src/server/db/notes.repo.ts` (CRUD via cached prepared statements, FTS5 search, batch transactions). Tests use `:memory:` via `DB_PATH` env var.

**WebSocket:** `src/server/websocket/events.ts` — typed handlers using `ServerWebSocket<WebSocketData>`. Pub/sub broadcasting via `ws.subscribe("broadcast")`.

**Middleware:** `src/server/middleware/static.ts` (serves `public/`) + `cors.ts` (adds CORS header to API responses).

**Shared types:** `src/shared/types.ts` — all types (Note, API responses, WebSocket messages, worker types).

**Dashboard:** `public/index.html` — vanilla HTML/CSS/JS dashboard with interactive panels for SQLite CRUD, password hashing, worker offloading, and WebSocket messaging.

## Key Patterns

- Config: `src/config.ts` — `PORT` (default 3000), `DB_PATH` (default `showcase.db`), `IS_DEV`
- All API routes under `/api/` prefix, WebSocket at `/ws`
- Handlers return `Response.json()` directly — no custom response helpers
- Timing uses `Bun.nanoseconds()` throughout
- Verbose logging with `LOG_LEVEL=debug`
