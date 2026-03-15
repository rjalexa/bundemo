/**
 * 🚀 Bun Showcase — Main Server
 *
 * Demonstrates Bun.serve() — a high-performance HTTP + WebSocket server.
 *
 * Key features:
 *   - Built-in routing (no Express needed)
 *   - Native WebSocket support (no ws package)
 *   - Static file serving via Bun.file()
 *   - Request/response streaming
 *   - Bun.nanoseconds() for precise timing
 *   - Bun.sleep() for async delays
 */

import { Router, json, jsonError } from "./router";
import { NotesDB } from "./db";
import { hashPassword, verifyPassword, compareAlgorithms } from "../utils/auth";
import { Files } from "../utils/files";
import { logger } from "../utils/logger";

// ── Configuration ──────────────────────────────────────────────────

const PORT = Number(Bun.env.PORT ?? 3000);
const startTime = Date.now();

// ── Router Setup ───────────────────────────────────────────────────

const router = new Router();

// ▸ Health Check
router.get("/api/health", () => {
  const mem = process.memoryUsage();
  return json({
    status: "ok",
    runtime: "Bun " + Bun.version,
    uptime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    memory: {
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`,
      rss: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
    },
    timestamp: new Date().toISOString(),
  });
});

// ▸ Notes CRUD (SQLite)
router.get("/api/notes", () => {
  const notes = NotesDB.list();
  return json({ notes, total: notes.length });
});

router.get("/api/notes/:id", (_req, params) => {
  const note = NotesDB.get(Number(params.id));
  if (!note) return jsonError("Note not found", 404);
  return json(note);
});

router.post("/api/notes", async (req) => {
  const body = await req.json();
  if (!body.title) return jsonError("Title is required");
  const note = NotesDB.create({
    title: body.title,
    content: body.content ?? "",
    tags: body.tags ?? [],
  });
  return json(note, 201);
});

router.delete("/api/notes/:id", (_req, params) => {
  const id = Number(params.id);
  const note = NotesDB.get(id);
  if (!note) return jsonError("Note not found", 404);
  NotesDB.delete(id);
  return json({ deleted: true, id });
});

// ▸ Password Hashing (Bun.password)
router.post("/api/auth/hash", async (req) => {
  const { password } = await req.json();
  if (!password) return jsonError("Password is required");
  const result = await hashPassword(password);
  return json(result);
});

router.post("/api/auth/verify", async (req) => {
  const { password, hash } = await req.json();
  if (!password || !hash) return jsonError("Password and hash are required");
  const result = await verifyPassword(password, hash);
  return json(result);
});

router.post("/api/auth/compare", async (req) => {
  const { password } = await req.json();
  if (!password) return jsonError("Password is required");
  const result = await compareAlgorithms(password);
  return json(result);
});

// ▸ File Info (Bun.file + Bun.hash)
router.get("/api/files/info", async (req) => {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return jsonError("Query param 'path' is required");
  const info = await Files.info(path);
  return json(info);
});

// ▸ Worker Task Offloading
router.post("/api/workers/compute", async (req) => {
  const { task, payload } = await req.json();

  if (!task || payload === undefined) {
    return jsonError("task and payload are required");
  }

  // Spawn a worker for CPU-intensive work
  const workerUrl = new URL("../workers/cpu-worker.ts", import.meta.url).href;

  return new Promise<Response>((resolve) => {
    const worker = new Worker(workerUrl);
    const id = crypto.randomUUID();

    const timeout = setTimeout(() => {
      worker.terminate();
      resolve(jsonError("Worker timed out after 10s", 504));
    }, 10_000);

    worker.onmessage = (event) => {
      if (event.data.type === "ready") {
        // Worker is ready, send the task
        worker.postMessage({ id, task, payload });
        return;
      }

      if (event.data.id === id) {
        clearTimeout(timeout);
        worker.terminate();

        if (event.data.error) {
          resolve(jsonError(event.data.error));
        } else {
          resolve(json(event.data));
        }
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(jsonError(`Worker error: ${err.message}`, 500));
    };
  });
});

// ▸ Demo: Bun.sleep() streaming response
router.get("/api/stream", async () => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const messages = [
        "🚀 Starting stream...",
        "⏳ Processing step 1...",
        "⏳ Processing step 2...",
        "⏳ Processing step 3...",
        "✅ Stream complete!",
      ];

      for (const msg of messages) {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
        await Bun.sleep(500); // Bun.sleep — cleaner than setTimeout
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

// ── WebSocket Handling ─────────────────────────────────────────────

type WebSocketData = { id: string; connectedAt: number };

// Track connected clients
const wsClients = new Set<string>();

// ── Server ─────────────────────────────────────────────────────────

const server = Bun.serve<WebSocketData>({
  port: PORT,

  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const id = crypto.randomUUID().slice(0, 8);
      const upgraded = server.upgrade(req, {
        data: { id, connectedAt: Date.now() },
      });
      if (upgraded) return; // Bun handles the response
      return jsonError("WebSocket upgrade failed", 400);
    }

    // Serve static files from /public
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = Bun.file("public/index.html");
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    // Serve other static files
    if (url.pathname.startsWith("/public/")) {
      const file = Bun.file(url.pathname.slice(1));
      if (await file.exists()) return new Response(file);
    }

    // Request timing middleware
    const start = Bun.nanoseconds();
    const response = await router.handle(req);
    const durationMs = (Bun.nanoseconds() - start) / 1_000_000;

    // Log the request
    const status = response.status;
    const logFn = status >= 400 ? logger.warn : logger.info;
    logFn(`${req.method} ${url.pathname} → ${status} (${durationMs.toFixed(2)}ms)`);

    // Add server timing header
    response.headers.set("Server-Timing", `total;dur=${durationMs.toFixed(2)}`);
    response.headers.set("X-Powered-By", "Bun");

    return response;
  },

  websocket: {
    open(ws) {
      wsClients.add(ws.data.id);
      logger.info(`WebSocket connected: ${ws.data.id} (${wsClients.size} total)`);
      ws.send(JSON.stringify({
        type: "welcome",
        id: ws.data.id,
        message: `Connected! You are client ${ws.data.id}`,
        clients: wsClients.size,
      }));
      ws.subscribe("broadcast");
    },

    message(ws, message) {
      const text = typeof message === "string" ? message : new TextDecoder().decode(message);
      logger.debug(`WebSocket message from ${ws.data.id}: ${text}`);

      // Echo back with metadata
      ws.send(JSON.stringify({
        type: "echo",
        from: ws.data.id,
        message: text,
        timestamp: Date.now(),
      }));

      // Broadcast to all other clients
      ws.publish("broadcast", JSON.stringify({
        type: "broadcast",
        from: ws.data.id,
        message: text,
        timestamp: Date.now(),
      }));
    },

    close(ws) {
      wsClients.delete(ws.data.id);
      logger.info(`WebSocket disconnected: ${ws.data.id} (${wsClients.size} remaining)`);
    },
  },
});

// ── Startup Banner ─────────────────────────────────────────────────

logger.banner("Bun Showcase Server");
logger.table("Server Configuration", {
  "Runtime":    `Bun v${Bun.version}`,
  "URL":        `http://localhost:${server.port}`,
  "WebSocket":  `ws://localhost:${server.port}/ws`,
  "Database":   Bun.env.DB_PATH ?? "showcase.db",
  "PID":        process.pid.toString(),
});

logger.success(`Server listening on port ${server.port}`);
