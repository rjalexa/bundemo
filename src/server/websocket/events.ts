import type { ServerWebSocket } from "bun";
import { logger } from "../../utils/logger";
import type { WebSocketData } from "../../shared/types";

const wsClients = new Set<string>();

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

  message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    logger.debug(`WebSocket message from ${ws.data.id}: ${text}`);

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
