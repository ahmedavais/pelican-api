import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Post } from "../src/domain";
import { storeNewPosts } from "../src/post-store";
import { countingQueries } from "./query-counter";
import { samplePosts } from "./sample-posts";

const opusPost: Post = {
  id: "2026-09-22-opus-and-sol-and-luna",
  url: "https://simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/",
  title: "Claude Opus 5.5, GPT-6 Sol, GPT-6 Luna, and a new price war",
  publishedAt: "2026-09-22T23:46:41.000Z",
  tags: ["anthropic", "pelican-riding-a-bicycle"],
};

const filmPost: Post = {
  id: "2026-09-18-the-creative-spirit-of-who-framed-roger-rabbit",
  url: "https://simonwillison.net/2026/Sep/18/the-creative-spirit-of-who-framed-roger-rabbit/",
  title: "The Creative Spirit of Who Framed Roger Rabbit",
  publishedAt: "2026-09-18T14:36:41.000Z",
  tags: ["film", "pelican-riding-a-bicycle"],
};

async function storedPosts() {
  const { results } = await env.DB.prepare("SELECT * FROM posts ORDER BY id").all();
  return results;
}

describe("storeNewPosts", () => {
  it("stores new posts as unclassified and reports how many were added", async () => {
    const added = await storeNewPosts(env.DB, [opusPost, filmPost], "2026-09-25T06:17:00.000Z");

    expect(added).toBe(2);
    expect(await storedPosts()).toContainEqual({
      id: opusPost.id,
      url: opusPost.url,
      title: opusPost.title,
      published_at: opusPost.publishedAt,
      tags: JSON.stringify(opusPost.tags),
      kind: "unclassified",
      ingested_at: "2026-09-25T06:17:00.000Z",
    });
  });

  it("ignores posts whose url is already stored, keeping the first ingest time", async () => {
    await storeNewPosts(env.DB, [opusPost], "2026-09-25T06:17:00.000Z");

    const added = await storeNewPosts(env.DB, [opusPost, filmPost], "2026-09-26T06:17:00.000Z");

    expect(added).toBe(1);
    expect(await storedPosts()).toMatchObject([
      { id: filmPost.id, ingested_at: "2026-09-26T06:17:00.000Z" },
      { id: opusPost.id, ingested_at: "2026-09-25T06:17:00.000Z" },
    ]);
  });

  it("adds nothing when given no posts", async () => {
    expect(await storeNewPosts(env.DB, [], "2026-09-25T06:17:00.000Z")).toBe(0);
  });

  it("only looks up stored urls when every post is already stored", async () => {
    const posts = samplePosts(30);
    await storeNewPosts(env.DB, posts, "2026-09-25T06:17:00.000Z");
    const counted = countingQueries(env.DB);

    await storeNewPosts(counted.db, posts, "2026-09-26T06:17:00.000Z");

    expect(counted.queriesExecuted()).toBe(1);
  });

  it("inserts many new posts in a few multi-row statements", async () => {
    const counted = countingQueries(env.DB);

    const added = await storeNewPosts(counted.db, samplePosts(30), "2026-09-25T06:17:00.000Z");

    expect(added).toBe(30);
    expect(counted.queriesExecuted()).toBe(1 + 3);
  });
});
