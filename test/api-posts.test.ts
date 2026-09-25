import { describe, expect, it } from "vitest";
import { getJson } from "./api-client";
import { postOn, seed } from "./seed";

async function seedMixedPosts() {
  await seed(
    { ...postOn("2026-09-22T12:00:00Z", "opus"), models: [{ modelName: "Claude Opus 5.5", vendor: "anthropic" }] },
    { ...postOn("2026-09-18T12:00:00Z", "roger-rabbit"), kind: "sighting" },
    { ...postOn("2026-09-10T12:00:00Z", "pelicanmaxxing"), kind: "other" },
    { ...postOn("2026-09-05T12:00:00Z", "not-yet-catalogued") },
  );
}

describe("GET /posts", () => {
  it("lists every post newest first, sightings and unclassified included", async () => {
    await seedMixedPosts();

    const { status, body } = await getJson("/posts");

    expect(status).toBe(200);
    expect(body.data.map((post: { kind: string }) => post.kind)).toEqual([
      "model_pelicans",
      "sighting",
      "other",
      "unclassified",
    ]);
    expect(body.data[1]).toEqual({
      id: "2026-09-18-roger-rabbit",
      url: "https://simonwillison.net/2026/Sep/18/roger-rabbit/",
      title: "Post at https://simonwillison.net/2026/Sep/18/roger-rabbit/",
      published_at: "2026-09-18T12:00:00.000Z",
      tags: ["pelican-riding-a-bicycle"],
      kind: "sighting",
      ingested_at: "2026-09-25T06:17:00.000Z",
    });
  });

  it("filters by kind", async () => {
    await seedMixedPosts();

    const { body } = await getJson("/posts?kind=unclassified");

    expect(body.data.map((post: { id: string }) => post.id)).toEqual(["2026-09-05-not-yet-catalogued"]);
  });

  it("pages with a cursor", async () => {
    await seedMixedPosts();

    const first = await getJson("/posts?limit=3");
    const second = await getJson(`/posts?limit=3&cursor=${first.body.next_cursor}`);

    expect(first.body.data).toHaveLength(3);
    expect(second.body).toMatchObject({ data: [{ id: "2026-09-05-not-yet-catalogued" }], next_cursor: null });
  });

  it("rejects an unknown kind", async () => {
    const { status, body } = await getJson("/posts?kind=pelican");

    expect(status).toBe(400);
    expect(body.error.code).toBe("invalid_request");
  });
});
