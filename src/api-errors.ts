import { z } from "@hono/zod-openapi";

export type ApiErrorCode = "invalid_request" | "invalid_cursor" | "not_found" | "rate_limited" | "internal_error";

export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: "not_found" }),
      message: z.string().openapi({ example: "No pelican with id 'x'" }),
    }),
  })
  .openapi("Error");

export function errorBody(code: ApiErrorCode, message: string): z.infer<typeof ErrorSchema> {
  return { error: { code, message } };
}

export function errorResponse(description: string) {
  return { description, content: { "application/json": { schema: ErrorSchema } } };
}
