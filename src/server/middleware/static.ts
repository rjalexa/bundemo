export async function serveStatic(req: Request): Promise<Response | undefined> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname === "/" || pathname === "/index.html") {
    const file = Bun.file("public/index.html");
    if (await file.exists()) {
      return new Response(file, { headers: { "Content-Type": "text/html" } });
    }
  }

  if (pathname.startsWith("/public/")) {
    const file = Bun.file(pathname.slice(1));
    if (await file.exists()) return new Response(file);
  }

  return undefined;
}
