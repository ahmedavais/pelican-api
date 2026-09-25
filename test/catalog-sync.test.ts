import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { applyCatalog } from "../src/catalog-sync";
import type { Catalog, Post } from "../src/domain";
import { storeNewPosts } from "../src/post-store";
import { countingQueries } from "./query-counter";
import { catalogGiving, samplePosts } from "./sample-posts";

const opusPost: Post = {
  id: "2026-09-22-opus-and-sol-and-luna",
  url: "https://simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/",
  title: "Claude Opus 5.5, GPT-6 Sol, GPT-6 Luna, and a new price war",
  publishedAt: "2026-09-22T23:46:41.000Z",
  tags: ["pelican-riding-a-bicycle"],
};

const filmPost: Post = {
  id: "2026-09-18-the-creative-spirit-of-who-framed-roger-rabbit",
  url: "https://simonwillison.net/2026/Sep/18/the-creative-spirit-of-who-framed-roger-rabbit/",
  title: "The Creative Spirit of Who Framed Roger Rabbit",
  publishedAt: "2026-09-18T14:36:41.000Z",
  tags: ["pelican-riding-a-bicycle"],
};

const fullCatalog: Catalog = {
  [opusPost.url]: {
    kind: "model_pelicans",
    pelicans: [
      { modelName: "Claude Opus 5.5", vendor: "anthropic" },
      { modelName: "GPT-6 Sol", vendor: "openai" },
    ],
  },
  [filmPost.url]: { kind: "sighting" },
};

async function kindOf(post: Post) {
  return env.DB.prepare("SELECT kind FROM posts WHERE id = ?").bind(post.id).first("kind");
}

async function pelicanIdsOf(post: Post) {
  const { results } = await env.DB.prepare("SELECT id FROM pelicans WHERE post_id = ? ORDER BY id").bind(post.id).all();
  return results.map((row) => row.id);
}

beforeEach(async () => {
  await storeNewPosts(env.DB, [opusPost, filmPost], "2026-09-25T06:17:00.000Z");
});

describe("applyCatalog", () => {
  it("gives catalogued posts their kind and pelicans", async () => {
    await applyCatalog(env.DB, fullCatalog);

    expect(await kindOf(opusPost)).toBe("model_pelicans");
    expect(await kindOf(filmPost)).toBe("sighting");
    expect(await pelicanIdsOf(opusPost)).toEqual([
      "2026-09-22-opus-and-sol-and-luna-claude-opus-5-5",
      "2026-09-22-opus-and-sol-and-luna-gpt-6-sol",
    ]);
  });

  it("stores every pelican field", async () => {
    await applyCatalog(env.DB, fullCatalog);

    const pelican = await env.DB.prepare("SELECT * FROM pelicans WHERE id = ?")
      .bind("2026-09-22-opus-and-sol-and-luna-gpt-6-sol")
      .first();

    expect(pelican).toEqual({
      id: "2026-09-22-opus-and-sol-and-luna-gpt-6-sol",
      post_id: opusPost.id,
      model_name: "GPT-6 Sol",
      model_slug: "gpt-6-sol",
      vendor: "openai",
      post_url: opusPost.url,
      published_at: opusPost.publishedAt,
    });
  });

  it("leaves uncatalogued posts unclassified", async () => {
    await applyCatalog(env.DB, {});

    expect(await kindOf(opusPost)).toBe("unclassified");
    expect(await pelicanIdsOf(opusPost)).toEqual([]);
  });

  it("replaces a post's pelicans when its catalog entry changes", async () => {
    await applyCatalog(env.DB, fullCatalog);

    await applyCatalog(env.DB, {
      [opusPost.url]: { kind: "model_pelicans", pelicans: [{ modelName: "GPT-6 Luna", vendor: "openai" }] },
    });

    expect(await pelicanIdsOf(opusPost)).toEqual(["2026-09-22-opus-and-sol-and-luna-gpt-6-luna"]);
  });

  it("returns a post to unclassified when its catalog entry is removed", async () => {
    await applyCatalog(env.DB, fullCatalog);

    await applyCatalog(env.DB, {});

    expect(await kindOf(opusPost)).toBe("unclassified");
    expect(await pelicanIdsOf(opusPost)).toEqual([]);
  });

  it("reports how many posts changed, and none on a repeat with the same catalog", async () => {
    expect(await applyCatalog(env.DB, fullCatalog)).toBe(2);
    expect(await applyCatalog(env.DB, fullCatalog)).toBe(0);
  });

  it("stores all of a post's pelicans, even more than fit in one statement", async () => {
    await applyCatalog(env.DB, catalogGiving([opusPost], 20));

    expect(await pelicanIdsOf(opusPost)).toHaveLength(20);
  });
});

describe("applyCatalog within the free plan's query budget", () => {
  it("rewrites at most 12 posts per run and catches up on later runs", async () => {
    const posts = samplePosts(20);
    await storeNewPosts(env.DB, posts, "2026-09-25T06:17:00.000Z");
    const catalog = catalogGiving(posts, 1);

    expect(await applyCatalog(env.DB, catalog)).toBe(12);
    expect(await applyCatalog(env.DB, catalog)).toBe(8);
    expect(await applyCatalog(env.DB, catalog)).toBe(0);
  });

  it("rewrites newest posts first", async () => {
    const posts = samplePosts(20);
    await storeNewPosts(env.DB, posts, "2026-09-25T06:17:00.000Z");

    await applyCatalog(env.DB, catalogGiving(posts, 1));

    const { results } = await env.DB.prepare("SELECT id FROM posts WHERE kind = 'model_pelicans' ORDER BY id").all();
    expect(results.map((row) => row.id)).toEqual(posts.slice(8).map((post) => post.id));
  });

  it("uses three statements per rewritten post plus two reads", async () => {
    const counted = countingQueries(env.DB);

    await applyCatalog(counted.db, catalogGiving([opusPost, filmPost], 5));

    expect(counted.queriesExecuted()).toBe(2 + 2 * 3);
  });
});
