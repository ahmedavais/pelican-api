import { describe, expect, it } from "vitest";
import { API, jsonFrom } from "./production-api";

describe(`catalog at ${API}`, () => {
  it("has cataloged every post", async () => {
    const { data } = await jsonFrom<{ data: { url: string }[] }>("/posts?kind=unclassified&limit=100");

    expect(data.map((post) => post.url), "add these to src/pelican-catalog.ts").toEqual([]);
  });
});
