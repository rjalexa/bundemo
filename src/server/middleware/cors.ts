export function withCors(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}
