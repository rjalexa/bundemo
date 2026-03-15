import { config } from "../config";
import { Router } from "./router";
import { serveStatic } from "./middleware/static";
import { withCors } from "./middleware/cors";
import { websocketHandlers } from "./websocket/events";
import { logger } from "../utils/logger";
import type { WebSocketData } from "../shared/types";

// ── Handlers ────────────────────────────────────────────────────────
import { listNotes, getNote, createNote, deleteNote } from "./handlers/notes";
import { register, login, logout, me, hashPw, verifyPw, comparePw } from "./handlers/auth";
import { fileInfo } from "./handlers/files";
import { compute } from "./handlers/workers";
import { health, stream } from "./handlers/misc";
import { withAuth } from "./middleware/auth";

// ── Router Setup ────────────────────────────────────────────────────

const router = new Router();

// Public routes
router.get("/api/health", health);
router.post("/api/auth/register", register);
router.post("/api/auth/login", login);
router.post("/api/auth/hash", withAuth(hashPw));
router.post("/api/auth/verify", withAuth(verifyPw));
router.post("/api/auth/compare", withAuth(comparePw));
router.get("/api/files/info", fileInfo);
router.post("/api/workers/compute", compute);
router.get("/api/stream", stream);

// Protected routes (require authentication)
router.post("/api/auth/logout", withAuth(logout));
router.get("/api/auth/me", withAuth(me));
router.get("/api/notes", withAuth(listNotes));
router.get("/api/notes/:id", withAuth(getNote));
router.post("/api/notes", withAuth(createNote));
router.delete("/api/notes/:id", withAuth(deleteNote));

// ── Server ──────────────────────────────────────────────────────────

const server = Bun.serve<WebSocketData>({
  port: config.PORT,

  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade — authentication happens via first message after connect
    if (url.pathname === "/ws") {
      const id = crypto.randomUUID().slice(0, 8);
      const wsData: WebSocketData = { id, connectedAt: Date.now() };
      const upgraded = server.upgrade(req, { data: wsData });
      if (upgraded) return;
      return Response.json({ error: "WebSocket upgrade failed" }, { status: 400 });
    }

    // Static files
    const staticRes = await serveStatic(req);
    if (staticRes) return staticRes;

    // API routing with timing
    const start = Bun.nanoseconds();
    const response = await router.handle(req);
    const durationMs = (Bun.nanoseconds() - start) / 1_000_000;

    const status = response.status;
    const logFn = status >= 400 ? logger.warn : logger.info;
    logFn(`${req.method} ${url.pathname} → ${status} (${durationMs.toFixed(2)}ms)`);

    response.headers.set("Server-Timing", `total;dur=${durationMs.toFixed(2)}`);
    response.headers.set("X-Powered-By", "Bun");

    return withCors(response);
  },

  websocket: websocketHandlers,
});

// ── Startup Banner ──────────────────────────────────────────────────

logger.banner("Bun Showcase Server");
logger.table("Server Configuration", {
  "Runtime":   `Bun v${Bun.version}`,
  "URL":       `http://localhost:${server.port}`,
  "WebSocket": `ws://localhost:${server.port}/ws`,
  "Database":  config.DB_PATH,
  "PID":       process.pid.toString(),
});
logger.success(`Server listening on port ${server.port}`);
