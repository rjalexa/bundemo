import type { Handler } from "../router";

export const compute: Handler = async (req) => {
  const { task, payload } = await req.json();

  if (!task || payload === undefined) {
    return Response.json({ error: "task and payload are required" }, { status: 400 });
  }

  const workerUrl = new URL("../../workers/cpu-worker.ts", import.meta.url).href;

  return new Promise<Response>((resolve) => {
    const worker = new Worker(workerUrl);
    const id = crypto.randomUUID();

    const timeout = setTimeout(() => {
      worker.terminate();
      resolve(Response.json({ error: "Worker timed out after 10s" }, { status: 504 }));
    }, 10_000);

    worker.onmessage = (event) => {
      if (event.data.type === "ready") {
        worker.postMessage({ id, task, payload });
        return;
      }

      if (event.data.id === id) {
        clearTimeout(timeout);
        worker.terminate();
        if (event.data.error) {
          resolve(Response.json({ error: event.data.error }, { status: 400 }));
        } else {
          resolve(Response.json(event.data));
        }
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(Response.json({ error: `Worker error: ${err.message}` }, { status: 500 }));
    };
  });
};
