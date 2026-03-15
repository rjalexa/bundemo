import { Files } from "../../utils/files";
import type { Handler } from "../router";

export const fileInfo: Handler = async (req) => {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return Response.json({ error: "Query param 'path' is required" }, { status: 400 });
  const info = await Files.info(path);
  return Response.json(info);
};
