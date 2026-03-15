/**
 * 🛣️ Request Router
 * A lightweight, pattern-matching router for Bun.serve()
 *
 * Demonstrates:
 *   - URL pattern matching with path parameters
 *   - Method-based routing
 *   - Middleware-style request handling
 *   - JSON response helpers
 */

// ── Types ──────────────────────────────────────────────────────────

export type Handler = (
  req: Request,
  params: Record<string, string>
) => Response | Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

// ── JSON Response Helpers ──────────────────────────────────────────

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export function jsonError(message: string, status = 400): Response {
  return json({ error: message, status }, status);
}

// ── Router Class ───────────────────────────────────────────────────

export class Router {
  private routes: Route[] = [];

  /**
   * Convert a path pattern like "/api/notes/:id" into a RegExp
   * and extract parameter names.
   */
  private compile(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const regexStr = path.replace(/:(\w+)/g, (_match, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    return {
      pattern: new RegExp(`^${regexStr}$`),
      paramNames,
    };
  }

  /** Register a route */
  private add(method: string, path: string, handler: Handler): this {
    const { pattern, paramNames } = this.compile(path);
    this.routes.push({ method, pattern, paramNames, handler });
    return this;
  }

  get(path: string, handler: Handler): this {
    return this.add("GET", path, handler);
  }

  post(path: string, handler: Handler): this {
    return this.add("POST", path, handler);
  }

  put(path: string, handler: Handler): this {
    return this.add("PUT", path, handler);
  }

  delete(path: string, handler: Handler): this {
    return this.add("DELETE", path, handler);
  }

  /**
   * Match a request to a route and execute the handler.
   */
  async handle(req: Request): Promise<Response> {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(req.url);
    const pathname = url.pathname;

    for (const route of this.routes) {
      if (route.method !== req.method) continue;

      const match = pathname.match(route.pattern);
      if (!match) continue;

      // Extract path parameters
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });

      try {
        return await route.handler(req, params);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal Server Error";
        return jsonError(message, 500);
      }
    }

    return jsonError("Not Found", 404);
  }
}
