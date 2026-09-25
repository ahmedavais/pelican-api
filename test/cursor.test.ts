import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../src/cursor";

describe("page cursors", () => {
  const position = { publishedAt: "2026-09-22T23:46:41.000Z", id: "2026-09-22-opus-and-sol-and-luna-gpt-6-sol" };

  it("round-trips a position in the newest-first ordering", () => {
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it("is safe to put in a query string", () => {
    expect(encodeCursor(position)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each(["not-a-cursor", "", encodeURIComponent("{}"), btoa(JSON.stringify({ publishedAt: 1, id: "x" }))])(
    "reads %j as no valid position",
    (cursor) => {
      expect(decodeCursor(cursor)).toBeNull();
    },
  );
});
