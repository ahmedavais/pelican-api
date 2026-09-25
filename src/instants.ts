import { z } from "@hono/zod-openapi";

export function instantParameter(description: string) {
  return z
    .union([z.iso.date(), z.iso.datetime({ offset: true })])
    .transform((value) => new Date(value).toISOString())
    .optional()
    .openapi({ description, example: "2026-09-01" });
}
