import type { ServerWebSocket } from "bun";
import { logger } from "../../utils/logger";
import { verifyToken } from "../../utils/token";
import { SessionsRepo } from "../db/sessions.repo";
import { UsersRepo } from "../db/users.repo";
import { config } from "../../config";
import type { WebSocketData } from "../../shared/types";

const wsClients = new Set<string>();

async function authenticateFromMessage(
  ws: ServerWebSocket<WebSocketData>,
  text: string
): Promise<boolean> {
  let parsed: { type?: string; token?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    return false;
  }

  if (parsed.type !== "auth" || !parsed.token) return false;

  const payload = await verifyToken(parsed.token, config.SESSION_SECRET);
  if (!payload) {
    ws.send(JSON.stringify({ type: "auth", success: false, error: "Invalid token" }));
    return true;
  }

  const session = SessionsRepo.findByToken(payload);
  if (!session || new Date(session.expires_at) < new Date()) {
    ws.send(JSON.stringify({ type: "auth", success: false, error: "Session expired" }));
    return true;
  }

  const user = UsersRepo.findById(session.user_id);
  if (!user) {
    ws.send(JSON.stringify({ type: "auth", success: false, error: "User not found" }));
    return true;
  }

  ws.data.userId = user.id;
  ws.data.email = user.email;
  ws.send(JSON.stringify({ type: "auth", success: true, email: user.email }));
  return true;
}

export const websocketHandlers = {
  open(ws: ServerWebSocket<WebSocketData>) {
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

  async message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    logger.debug(`WebSocket message from ${ws.data.id}: ${text}`);

    // Handle auth message: { type: "auth", token: "..." }
    const wasAuth = await authenticateFromMessage(ws, text);
    if (wasAuth) return;

    ws.send(JSON.stringify({
      type: "echo",
      from: ws.data.id,
      message: text,
      timestamp: Date.now(),
    }));

    ws.publish("broadcast", JSON.stringify({
      type: "broadcast",
      from: ws.data.id,
      message: text,
      timestamp: Date.now(),
    }));
  },

  close(ws: ServerWebSocket<WebSocketData>) {
    wsClients.delete(ws.data.id);
    logger.info(`WebSocket disconnected: ${ws.data.id} (${wsClients.size} remaining)`);
  },
};
