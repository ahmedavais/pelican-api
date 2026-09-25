import { z } from "@hono/zod-openapi";
import { decodeCursor, encodeCursor, type PagePosition } from "./cursor";

export const PageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ description: "Page size, 1 to 100", example: 20 }),
  cursor: z.string().optional().openapi({ description: "The next_cursor from the previous page" }),
});

export function pageSchema<Item extends z.ZodType>(item: Item, name: string) {
  return z
    .object({
      data: z.array(item),
      next_cursor: z.string().nullable().openapi({ description: "Pass as cursor to get the next page; null on the last page" }),
    })
    .openapi(name);
}

export type Page<Row> = {
  data: Row[];
  next_cursor: string | null;
};

type NewestFirstRow = { id: string; published_at: string };

export class InvalidCursorError extends Error {}

export function pagePosition(cursor: string | undefined): PagePosition | null {
  if (cursor === undefined) {
    return null;
  }
  const position = decodeCursor(cursor);
  if (!position) {
    throw new InvalidCursorError("The cursor is not one this API issued");
  }
  return position;
}

export function pageFrom<Row extends NewestFirstRow>(rowsWithOneExtra: Row[], limit: number): Page<Row> {
  const data = rowsWithOneExtra.slice(0, limit);
  const last = data.at(-1);
  const hasMore = rowsWithOneExtra.length > limit && last !== undefined;
  return {
    data,
    next_cursor: hasMore ? encodeCursor({ publishedAt: last.published_at, id: last.id }) : null,
  };
}
