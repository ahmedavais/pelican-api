import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
// Imported rather than reached through exports.default so the worker loads with
// the tests; code that runs at load time then follows the test run's mutants.
import worker from "../src/index";

let requestsSent = 0;

export async function send(request: Request, bindings: Env = env): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, bindings, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

export async function get(path: string, fromIp = `198.51.100.${++requestsSent % 250}`): Promise<Response> {
  return send(new Request(`https://pelicans.test${path}`, { headers: { "CF-Connecting-IP": fromIp } }));
}

export async function getJson(path: string): Promise<{ status: number; body: any }> {
  const response = await get(path);
  return { status: response.status, body: await response.json() };
}
