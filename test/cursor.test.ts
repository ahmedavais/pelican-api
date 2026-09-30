import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../src/cursor";

describe("page cursors", () => {
  const position = { publishedAt: "2026-09-22T23:46:41.000Z", id: "2026-09-22-opus-and-sol-and-luna-gpt-6-sol" };
  // Its base64 holds "+", "/" and "=" padding, none of which may reach a query string.
  const awkwardPosition = { publishedAt: "2026-09-22T23:46:41.000Z", id: "~pelicans?" };

  it.each([position, awkwardPosition])("round-trips %j in the newest-first ordering", (value) => {
    expect(decodeCursor(encodeCursor(value))).toEqual(value);
  });

  it.each([position, awkwardPosition])("encodes %j safely for a query string", (value) => {
    expect(encodeCursor(value)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    "not-a-cursor",
    "",
    encodeURIComponent("{}"),
    btoa(JSON.stringify({ publishedAt: 1, id: "x" })),
    btoa(JSON.stringify(["2026-09-22T23:46:41.000Z"])),
    btoa(JSON.stringify(["2026-09-22T23:46:41.000Z", "x", "y"])),
    btoa(JSON.stringify(["2026-09-22T23:46:41.000Z", 1])),
  ])("reads %j as no valid position", (cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });
});
