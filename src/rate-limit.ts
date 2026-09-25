import type { MiddlewareHandler } from "hono";
import { errorBody } from "./api-errors";

export function limitRequestsPerIp(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const clientIp = c.req.header("CF-Connecting-IP") ?? "unknown";
    const { success } = await c.env.RATE_LIMITER.limit({ key: clientIp });
    if (!success) {
      return c.json(errorBody("rate_limited", "Too many requests; the limit is 60 per minute"), 429, { "Retry-After": "60" });
    }
    await next();
  };
}
