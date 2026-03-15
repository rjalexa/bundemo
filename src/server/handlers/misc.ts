import type { Handler } from "../router";

const startTime = Date.now();

export const health: Handler = () => {
  const mem = process.memoryUsage();
  return Response.json({
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
};

export const stream: Handler = () => {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const messages = [
        "Starting stream...",
        "Processing step 1...",
        "Processing step 2...",
        "Processing step 3...",
        "Stream complete!",
      ];
      for (const msg of messages) {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
        await Bun.sleep(500);
      }
      controller.close();
    },
  });
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
};
