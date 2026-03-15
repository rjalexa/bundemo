# 🥖 Bun Showcase — A Tour of the Bun Runtime & Toolkit

A comprehensive TypeScript project demonstrating **Bun's killer features** — from its blazing-fast HTTP server and built-in SQLite to Workers, the test runner, file I/O, and the bundler.

## What This Project Demonstrates

| Feature | File(s) | Description |
|---|---|---|
| **`Bun.serve()`** | `src/server/index.ts` | High-performance HTTP server with routing, WebSocket support |
| **`Bun.file()` / `Bun.write()`** | `src/utils/files.ts` | Zero-copy file I/O — read, write, hash, stream |
| **`bun:sqlite`** | `src/server/db.ts` | Built-in SQLite with typed queries (no npm packages!) |
| **`Bun.password`** | `src/utils/auth.ts` | Native Argon2id / bcrypt password hashing |
| **`Bun.Worker`** | `src/workers/cpu-worker.ts` | Multi-threaded workers with structured cloning |
| **`bun test`** | `src/tests/*.test.ts` | Built-in Jest-compatible test runner |
| **`Bun.build()`** | `scripts/benchmark.ts` | Bundler API — bundle TypeScript from code |
| **`Bun.env`** | throughout | Typed environment variable access |
| **`Bun.hash()`** | `src/utils/files.ts` | Fast native hashing (Wyhash, CRC32, etc.) |
| **`Bun.sleep()`** | `src/server/index.ts` | Async sleep without setTimeout hacks |
| **`Bun.spawn()`** | `scripts/benchmark.ts` | Child process spawning |
| **WebSockets** | `src/server/index.ts` | Built-in WebSocket server (no ws package needed) |

## Quick Start

```bash
# Install Bun (if you haven't already)
curl -fsSL https://bun.sh/install | bash

# Install dependencies (just types — Bun needs no runtime deps!)
bun install

# Seed the SQLite database
bun run db:seed

# Start the dev server
bun run dev

# Run tests
bun test

# Run benchmarks
bun run bench

# Bundle for production
bun run build
```

## Running Without Installing Bun Globally

If you don't want to install Bun system-wide, here are some alternatives:

### Option 1: npx (zero install)

If you already have Node.js, you can run Bun through npx without any global setup:

```bash
npx bun install
npx bun run db:seed
npx bun run dev
npx bun test
```

### Option 2: Local install (home directory only)

Bun's installer puts everything in `~/.bun` — it doesn't touch `/usr/local` or system paths. You can try it and remove it cleanly afterward:

```bash
curl -fsSL https://bun.sh/install | bash
```

To uninstall later:

```bash
rm -rf ~/.bun
# Then remove the PATH line added to your ~/.zshrc or ~/.bashrc
```

### Option 3: Docker (fully isolated)

Run the entire project inside a container with zero footprint on your machine:

```bash
docker run --rm -it -v $(pwd)/bun-showcase:/app -w /app -p 3000:3000 oven/bun:latest \
  sh -c "bun install && bun run db:seed && bun run dev"
```

The dashboard will be available at `http://localhost:3000`. Nothing remains when you stop the container.

## API Endpoints

Once running on `http://localhost:3000`:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Dashboard HTML page |
| GET | `/api/health` | Health check with uptime & memory |
| GET | `/api/notes` | List all notes from SQLite |
| POST | `/api/notes` | Create a note `{ title, content }` |
| GET | `/api/notes/:id` | Get a single note |
| DELETE | `/api/notes/:id` | Delete a note |
| POST | `/api/auth/hash` | Hash a password `{ password }` |
| POST | `/api/auth/verify` | Verify a password `{ password, hash }` |
| GET | `/api/files/info?path=` | Get file metadata & hash |
| POST | `/api/workers/compute` | Offload CPU work to a Worker |
| GET | `/ws` | WebSocket echo server |

## Dashboard Guide — What Each Panel Does

When you open `http://localhost:3000`, you'll see a dashboard with four interactive panels. Here's what each one demonstrates and what you're looking at.

### 📦 bun:sqlite — Notes CRUD

**What it shows:** Bun ships with a built-in SQLite driver (`bun:sqlite`) — no `better-sqlite3`, no `prisma`, no npm package at all. This panel is a live CRUD interface backed by a real SQLite database on disk.

**How to use it:** Type a title, optionally add content and comma-separated tags, then click **Add**. Your note is inserted via a prepared statement and appears in the list below. Click **✕** to delete one. All data persists in `showcase.db` — restart the server and it's still there.

**What to notice:** The database was seeded with 8 sample notes (`bun run db:seed`) using a batch transaction. The seed script shows how `db.transaction()` wraps multiple inserts into a single atomic commit, which is dramatically faster than individual inserts.

### 🔐 Bun.password — Hashing

**What it shows:** Bun includes native Argon2id and bcrypt implementations compiled into the runtime. No `argon2` or `bcrypt` npm packages needed — `Bun.password.hash()` and `Bun.password.verify()` just work.

**How to use it:** Type any password and click **Hash**. You'll see three things in the output:
- **Algorithm** — `argon2id` (the current best practice for password storage, memory-hard and resistant to GPU attacks)
- **Hash** — the full PHC-formatted hash string (starts with `$argon2id$`), which includes the salt, memory cost, time cost, and the hash itself — everything needed to verify later
- **Time** — how many milliseconds the hashing took. Argon2id is intentionally slow (~100–300ms) to make brute-force attacks impractical

Try hashing the same password twice — you'll get different hashes each time because each one uses a random salt.

### ⚙️ Bun.Worker — CPU Offloading

**What it shows:** Heavy computation can block the main thread and freeze your server. `Bun.Worker` runs TypeScript files directly in a separate thread — no build step, no transpilation needed. The server sends work to the worker via `postMessage` and gets results back asynchronously.

**How to use it:** Click any of the three buttons. Each dispatches a task to a worker thread and returns a JSON result. Here's what each one computes:

- **Fibonacci(1000)** — Computes the 1000th Fibonacci number using BigInt arithmetic. The result has 209 digits. The JSON shows `n` (input), `value` (the number as a string), and `digits` (how many digits long it is).
- **Primes to 100k** — Runs a Sieve of Eratosthenes to find all prime numbers up to 100,000. The JSON shows `count` (how many primes were found — should be 9,592), `largest` (the biggest prime under 100k), and `first10`/`last10` (the first and last 10 primes).
- **Estimate π (1M)** — Uses a Monte Carlo simulation with 1 million random points to estimate the value of π. Generates random (x, y) coordinates in a unit square and checks what fraction fall inside a quarter-circle. The JSON shows `pi` (the estimate, which should be close to 3.14159) and `iterations`.

All three responses include `timeMs` (how long the worker took) and `thread: "worker"` to confirm the work ran off the main thread.

### 🔌 WebSocket — Built-in

**What it shows:** Bun's HTTP server has native WebSocket support with `server.upgrade()` — no `ws` or `socket.io` packages needed. This panel connects to the WebSocket endpoint and demonstrates real-time bidirectional messaging.

**How to use it:** Type a message and click **Send** (or press Enter). You'll see color-coded entries in the log:
- **Blue** (sys) — System events like connection and welcome messages
- **Orange** (sent) — Messages you sent
- **Green** (recv) — Echoed messages from the server

The server assigns each connection a short ID and echoes messages back. If you open the dashboard in multiple tabs, messages are also broadcast to all other connected clients via Bun's built-in pub/sub (`ws.subscribe` / `ws.publish`). Click **Reconnect** to drop and re-establish the connection.

### Stats Row (top)

The four stats at the top of the page auto-refresh every 5 seconds by polling `GET /api/health`:
- **Runtime** — The Bun version running the server
- **Notes in SQLite** — Live count from the database
- **Heap Used** — Current V8 heap memory usage
- **Uptime** — How long the server has been running

## Project Structure

```
bun-showcase/
├── src/
│   ├── server/
│   │   ├── index.ts          # Main Bun.serve() entry point
│   │   ├── router.ts         # Request router
│   │   └── db.ts             # bun:sqlite database layer
│   ├── utils/
│   │   ├── auth.ts           # Bun.password hashing
│   │   ├── files.ts          # Bun.file() / Bun.write() utilities
│   │   └── logger.ts         # Colorful console logger
│   ├── workers/
│   │   └── cpu-worker.ts     # Bun.Worker for heavy computation
│   └── tests/
│       ├── db.test.ts         # SQLite tests
│       ├── auth.test.ts       # Password hashing tests
│       ├── files.test.ts      # File I/O tests
│       └── server.test.ts     # Integration tests
├── scripts/
│   ├── seed-db.ts            # Database seeder
│   └── benchmark.ts          # Performance benchmarks
├── public/
│   └── index.html            # Dashboard UI
├── package.json
├── tsconfig.json
└── README.md
```

## Why Bun?

This project uses **zero runtime npm dependencies**. Everything — HTTP server, SQLite, password hashing, file I/O, WebSockets, testing, bundling — is built into Bun. Compare that to a typical Node.js project that would need `express`, `better-sqlite3`, `bcrypt`, `ws`, `jest`, `esbuild`, and more.

## Target Architecture: Bun + Vite + React + Tailwind + Radix UI

This showcase project demonstrates Bun's backend capabilities. For a full-stack application, the recommended architecture uses **Bun as the runtime and package manager**, **Vite as the frontend dev server and bundler**, **React** for the UI, **Tailwind CSS** for styling, and **Radix UI** for accessible, unstyled component primitives.

### Why this combination?

Each tool owns a clear responsibility:

| Layer | Tool | Role |
|---|---|---|
| **Runtime & package manager** | Bun | Runs TypeScript natively, installs packages ~10× faster than npm, provides the production server, SQLite, workers, and all backend APIs |
| **Frontend dev server & bundler** | Vite | Instant browser HMR (edit a React component → see it update without page refresh), ES module serving in dev, optimized Rollup/Rolldown builds for production |
| **UI framework** | React | Component model, state management, ecosystem |
| **Styling** | Tailwind CSS | Utility-first CSS — no context-switching between files, tree-shaken in production |
| **Component primitives** | Radix UI | Unstyled, fully accessible building blocks (dialogs, dropdowns, tooltips, etc.) that you style yourself with Tailwind. Handles all ARIA attributes, keyboard navigation, and focus management |

### How it fits together

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│  React + Tailwind + Radix UI components             │
│  ↕ HMR via Vite dev server (port 5173)              │
├─────────────────────────────────────────────────────┤
│  Vite                                               │
│  Dev: serves ESM, instant hot module replacement    │
│  Build: bundles & tree-shakes for production        │
├─────────────────────────────────────────────────────┤
│  Bun                                                │
│  Runtime: runs Vite in dev, serves API in prod      │
│  Backend: Bun.serve(), bun:sqlite, Bun.password,    │
│           Workers, file I/O — zero npm deps          │
└─────────────────────────────────────────────────────┘
```

In **development**, Vite handles the frontend on port 5173 with full HMR, while Bun runs your API server on port 3000. Vite proxies API requests to Bun. You edit a React component, save, and see the change instantly in the browser — state preserved, no page reload.

In **production**, Vite builds your React app into static assets. Bun serves those static files alongside the API from a single `Bun.serve()` entry point.

### Quick setup

```bash
# Scaffold the frontend with Vite + React + TypeScript
bun create vite my-app --template react-ts
cd my-app
bun install

# Add Tailwind CSS
bun add -d tailwindcss @tailwindcss/vite
# Then add the Tailwind plugin to vite.config.ts and
# import "tailwindcss" in your main CSS file

# Add Radix UI primitives (install only what you need)
bun add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip

# Run the dev server with Bun as the runtime
bunx --bun vite
```

Update your `package.json` scripts so everything goes through Bun:

```json
{
  "scripts": {
    "dev": "bunx --bun vite",
    "build": "bunx --bun vite build",
    "preview": "bunx --bun vite preview"
  }
}
```

### Vite proxy for the Bun API server

In `vite.config.ts`, proxy API calls to your Bun backend during development:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
});
```

Now `fetch("/api/notes")` in your React code hits the Bun server automatically, and Vite handles the frontend with full HMR.

### Coming from Vite-only projects

If you currently use Vite with Node.js, the main changes are:

- **Replace `npm`/`yarn`/`pnpm` with `bun`** — same commands, much faster installs
- **Replace `npx` with `bunx`** — runs binaries without global install
- **Your backend is now Bun, not Express** — `Bun.serve()` replaces Express, with built-in WebSocket support, SQLite, password hashing, and more (see this showcase project)
- **Keep Vite for the frontend** — Bun doesn't replace Vite's browser HMR or plugin ecosystem, it runs underneath it as a faster runtime
- **Testing** — use `bun test` for backend/unit tests (Jest-compatible, zero config), keep Vitest for frontend component tests if you prefer

## Production Deployment Alternatives

Three deployment patterns depending on your stack and infrastructure needs.

### Option A: Two containers — nginx + Bun API (full JS/TS stack)

The classic split: nginx serves static assets and terminates SSL, Bun runs the API. Each layer scales independently.

```
┌──────────────────────┐       ┌──────────────────────┐
│  Container 1: nginx  │──────▶│  Container 2: Bun    │
│  Vite build output   │ /api  │  Bun.serve()         │
│  reverse proxy       │ /ws   │  API routes          │
│  SSL termination     │       │  bun:sqlite, workers  │
│  gzip / caching      │       │  zero npm runtime deps│
└──────────────────────┘       └──────────────────────┘
```

```dockerfile
# ── nginx container (build stage uses Bun for speed) ──
FROM oven/bun:latest AS frontend-build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bunx --bun vite build

FROM nginx:alpine
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ── Bun API container ──
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src/ src/
CMD ["bun", "run", "src/server/index.ts"]
```

**When to use:** You need nginx's battle-tested caching, compression, and rate limiting. You want to scale static serving and API processing independently. Your infrastructure already runs nginx.

### Option B: Single container — Bun serves everything

Bun handles both static files and the API from one process on one port. Simplest possible deployment.

```
┌─────────────────────────────┐
│  Single Container: Bun      │
│  Bun.serve()                │
│  ├── /api/* → API routes    │
│  ├── /ws   → WebSocket      │
│  └── /*    → static assets  │
│  (Vite build output in /public) │
└─────────────────────────────┘
```

```dockerfile
FROM oven/bun:latest AS frontend-build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bunx --bun vite build

FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src/ src/
COPY --from=frontend-build /app/dist public/
CMD ["bun", "run", "src/server/index.ts"]
```

**When to use:** You deploy behind a load balancer that already handles SSL (AWS ALB, Cloudflare, Traefik, Caddy). Your app is small-to-medium scale. You want one image, one process, one port, minimal infrastructure.

### Option C: nginx + FastAPI — Bun at build time only

If your backend is Python (FastAPI, Django, Flask), Bun has no role in production. It only speeds up the CI/CD frontend build. Your containers are nginx + Python — Bun appears in the build stage and is discarded.

```
┌──────────────────────┐       ┌──────────────────────┐
│  Container 1: nginx  │──────▶│  Container 2: Python │
│  Vite build output   │ /api  │  FastAPI + uvicorn   │
│  reverse proxy       │       │  SQLAlchemy / etc    │
│  SSL termination     │       │  your existing stack │
└──────────────────────┘       └──────────────────────┘

   Bun is only used here ↓ (build stage, thrown away)
```

```dockerfile
# ── nginx container ──
FROM oven/bun:latest AS frontend-build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bunx --bun vite build

FROM nginx:alpine
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ── FastAPI container (no Bun involved) ──
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**When to use:** Your team works in Python, your backend is already FastAPI/Django, and you have no reason to rewrite it. Bun replaces `npm`/`npx` in your build pipeline for faster installs and builds — nothing else changes.

### Choosing between them

| | Option A (nginx + Bun) | Option B (Bun only) | Option C (nginx + FastAPI) |
|---|---|---|---|
| **Backend language** | TypeScript | TypeScript | Python |
| **Containers** | 2 | 1 | 2 |
| **Bun in production** | ✅ API server | ✅ everything | ❌ build only |
| **SSL termination** | nginx | external LB | nginx |
| **Complexity** | Medium | Low | Medium |
| **Independent scaling** | ✅ | ❌ | ✅ |
| **Best for** | Production TS apps at scale | Small-medium TS apps, side projects | Teams with existing Python backend |

---

Built with 🥖 Bun + TypeScript