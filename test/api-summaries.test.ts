import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { CatalogedModel } from "../src/domain";
import { getJson } from "./api-client";
import { postOn, seed } from "./seed";

const claude: CatalogedModel = { modelName: "Claude Opus 5.5", vendor: "anthropic" };
const sol: CatalogedModel = { modelName: "GPT-6 Sol", vendor: "openai" };
const mystery: CatalogedModel = { modelName: "Hy4 Preview", vendor: null };

async function seedPosts() {
  await seed(
    { ...postOn("2026-07-10T12:00:00Z", "sol-preview"), models: [sol] },
    { ...postOn("2026-08-20T12:00:00Z", "hy4"), models: [mystery] },
    { ...postOn("2026-09-22T12:00:00Z", "opus-and-sol"), models: [claude, sol] },
    { ...postOn("2026-09-18T12:00:00Z", "roger-rabbit"), kind: "sighting" },
    { ...postOn("2026-09-19T12:00:00Z", "not-yet-catalogued") },
  );
}

async function recordRun(status: "succeeded" | "failed", finishedAt: string) {
  await env.DB.prepare("INSERT INTO ingest_runs (started_at, finished_at, status) VALUES (?, ?, ?)")
    .bind(finishedAt, finishedAt, status)
    .run();
}

describe("GET /models", () => {
  it("lists each model with its pelican count and first and last appearance, most recent first", async () => {
    await seedPosts();

    const { status, body } = await getJson("/models");

    expect(status).toBe(200);
    expect(body).toEqual({
      data: [
        {
          model_slug: "claude-opus-5-5",
          model_name: "Claude Opus 5.5",
          vendor: "anthropic",
          pelican_count: 1,
          first_seen_at: "2026-09-22T12:00:00.000Z",
          last_seen_at: "2026-09-22T12:00:00.000Z",
        },
        {
          model_slug: "gpt-6-sol",
          model_name: "GPT-6 Sol",
          vendor: "openai",
          pelican_count: 2,
          first_seen_at: "2026-07-10T12:00:00.000Z",
          last_seen_at: "2026-09-22T12:00:00.000Z",
        },
        {
          model_slug: "hy4-preview",
          model_name: "Hy4 Preview",
          vendor: null,
          pelican_count: 1,
          first_seen_at: "2026-08-20T12:00:00.000Z",
          last_seen_at: "2026-08-20T12:00:00.000Z",
        },
      ],
      next_cursor: null,
    });
  });
});

describe("GET /vendors", () => {
  it("lists each vendor with its pelican count, largest first, unknown vendor as null", async () => {
    await seedPosts();

    const { body } = await getJson("/vendors");

    expect(body).toEqual({
      data: [
        { vendor: "openai", pelican_count: 2 },
        { vendor: "anthropic", pelican_count: 1 },
        { vendor: null, pelican_count: 1 },
      ],
      next_cursor: null,
    });
  });
});

describe("GET /stats", () => {
  it("reports totals, pelicans per month, and the last successful ingest", async () => {
    await seedPosts();
    await recordRun("succeeded", "2026-09-24T06:17:02.000Z");
    await recordRun("succeeded", "2026-09-25T06:17:02.000Z");
    await recordRun("failed", "2026-09-26T06:17:02.000Z");

    const { status, body } = await getJson("/stats");

    expect(status).toBe(200);
    expect(body).toEqual({
      pelican_count: 4,
      model_count: 3,
      vendor_count: 2,
      post_count: 5,
      posts_by_kind: { model_pelicans: 3, sighting: 1, other: 0, unclassified: 1 },
      pelicans_per_month: [
        { month: "2026-07", pelican_count: 1 },
        { month: "2026-08", pelican_count: 1 },
        { month: "2026-09", pelican_count: 2 },
      ],
      last_ingest_at: "2026-09-25T06:17:02.000Z",
    });
  });

  it("reports no last ingest before any run has succeeded", async () => {
    const { body } = await getJson("/stats");

    expect(body).toMatchObject({ pelican_count: 0, pelicans_per_month: [], last_ingest_at: null });
  });
});
