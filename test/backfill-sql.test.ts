import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { applyCatalog } from "../src/catalog-sync";
import { backfillSql } from "../src/backfill-sql";
import type { Catalog, Post } from "../src/domain";
import { type MirrorRow, postsFromMirrorRows } from "../src/mirror";
import mirrorRows from "./fixtures/mirror-rows.json";

const posts = postsFromMirrorRows(mirrorRows as MirrorRow[]);

const quotedPost: Post = {
  id: "2026-05-28-claude-opus-4-8",
  url: "https://simonwillison.net/2026/May/28/claude-opus-4-8/",
  title: `Claude Opus 4.8: "a modest but tangible improvement" — Simon's take`,
  publishedAt: "2026-05-28T18:00:00.000Z",
  tags: ["anthropic", "o'reilly"],
};

async function execute(sql: string) {
  await env.DB.exec(sql);
}

async function count(table: "posts" | "pelicans") {
  return env.DB.prepare(`SELECT COUNT(*) AS total FROM ${table}`).first("total");
}

describe("backfillSql", () => {
  it("stores every post as given, quotes and apostrophes included", async () => {
    await execute(backfillSql([quotedPost], {}, "2026-09-25T20:00:00.000Z"));

    expect(await env.DB.prepare("SELECT * FROM posts").first()).toEqual({
      id: quotedPost.id,
      url: quotedPost.url,
      title: quotedPost.title,
      published_at: quotedPost.publishedAt,
      tags: JSON.stringify(quotedPost.tags),
      kind: "unclassified",
      ingested_at: "2026-09-25T20:00:00.000Z",
    });
  });

  it("applies the whole catalog at once, leaving the daily run nothing to rewrite", async () => {
    const catalog: Catalog = Object.fromEntries(
      posts.map((post) => [post.url, { kind: "model_pelicans", pelicans: [{ modelName: `Model for ${post.id}`, vendor: null }] }]),
    );

    await execute(backfillSql(posts, catalog, "2026-09-25T20:00:00.000Z"));

    expect(await count("posts")).toBe(144);
    expect(await count("pelicans")).toBe(144);
    expect(await applyCatalog(env.DB, catalog)).toBe(0);
  });

  it("can run again without duplicating anything or changing the first ingest time", async () => {
    await execute(backfillSql(posts, {}, "2026-09-25T20:00:00.000Z"));

    await execute(backfillSql(posts, {}, "2026-09-26T20:00:00.000Z"));

    expect(await count("posts")).toBe(144);
    expect(await env.DB.prepare("SELECT DISTINCT ingested_at FROM posts").all()).toMatchObject({
      results: [{ ingested_at: "2026-09-25T20:00:00.000Z" }],
    });
  });
});
