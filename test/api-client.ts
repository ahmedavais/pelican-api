import { exports } from "cloudflare:workers";

let requestsSent = 0;

export async function get(path: string, fromIp = `198.51.100.${++requestsSent % 250}`): Promise<Response> {
  return exports.default.fetch(new Request(`https://pelicans.test${path}`, { headers: { "CF-Connecting-IP": fromIp } }));
}

export async function getJson(path: string): Promise<{ status: number; body: any }> {
  const response = await get(path);
  return { status: response.status, body: await response.json() };
}
