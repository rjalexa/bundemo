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

export class Router {
  private routes: Route[] = [];

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

  private add(method: string, path: string, handler: Handler): this {
    const { pattern, paramNames } = this.compile(path);
    this.routes.push({ method, pattern, paramNames, handler });
    return this;
  }

  get(path: string, handler: Handler): this { return this.add("GET", path, handler); }
  post(path: string, handler: Handler): this { return this.add("POST", path, handler); }
  put(path: string, handler: Handler): this { return this.add("PUT", path, handler); }
  delete(path: string, handler: Handler): this { return this.add("DELETE", path, handler); }

  async handle(req: Request): Promise<Response> {
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

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });

      try {
        return await route.handler(req, params);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal Server Error";
        return Response.json({ error: message }, { status: 500 });
      }
    }

    return Response.json({ error: "Not Found" }, { status: 404 });
  }
}
