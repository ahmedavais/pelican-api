import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Catalog } from "../src/domain";
import { runIngest } from "../src/ingest";
import savedFeed from "./fixtures/pelican-tag-feed.atom?raw";

const opusPostUrl = "https://simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/";

const catalog: Catalog = {
  [opusPostUrl]: { kind: "model_pelicans", pelicans: [{ modelName: "Claude Opus 5.5", vendor: "anthropic" }] },
};

function clockTicking(...isoTimes: string[]) {
  const times = isoTimes.map((iso) => new Date(iso));
  return () => times.shift() ?? new Date(isoTimes.at(-1)!);
}

async function recordedRuns() {
  const { results } = await env.DB.prepare("SELECT * FROM ingest_runs ORDER BY id").all();
  return results;
}

async function count(table: "posts" | "pelicans") {
  return env.DB.prepare(`SELECT COUNT(*) AS total FROM ${table}`).first("total");
}

describe("runIngest", () => {
  it("stores the feed's posts, applies the catalog, and records a successful run", async () => {
    await runIngest(env.DB, {
      latestFeed: async () => savedFeed,
      catalog,
      now: clockTicking("2026-09-25T06:17:00.000Z", "2026-09-25T06:17:02.000Z"),
    });

    expect(await count("posts")).toBe(30);
    expect(await count("pelicans")).toBe(1);
    expect(await recordedRuns()).toMatchObject([
      {
        started_at: "2026-09-25T06:17:00.000Z",
        finished_at: "2026-09-25T06:17:02.000Z",
        status: "succeeded",
        posts_added: 30,
        entries_skipped: 0,
        error: null,
      },
    ]);
  });

  it("adds nothing on a repeat run over the same feed", async () => {
    const sources = { latestFeed: async () => savedFeed, catalog, now: () => new Date("2026-09-25T06:17:00.000Z") };
    await runIngest(env.DB, sources);

    await runIngest(env.DB, sources);

    expect(await count("posts")).toBe(30);
    expect(await recordedRuns()).toMatchObject([{ posts_added: 30 }, { posts_added: 0 }]);
  });

  it("applies catalog changes even when the feed has nothing new", async () => {
    const now = () => new Date("2026-09-25T06:17:00.000Z");
    await runIngest(env.DB, { latestFeed: async () => savedFeed, catalog: {}, now });

    await runIngest(env.DB, { latestFeed: async () => savedFeed, catalog, now });

    expect(await count("pelicans")).toBe(1);
  });

  it("records a failed run with the reason when the feed cannot be read", async () => {
    await runIngest(env.DB, {
      latestFeed: async () => {
        throw new Error("Feed responded 503");
      },
      catalog,
      now: clockTicking("2026-09-25T06:17:00.000Z", "2026-09-25T06:17:01.000Z"),
    });

    expect(await count("posts")).toBe(0);
    expect(await recordedRuns()).toMatchObject([
      {
        started_at: "2026-09-25T06:17:00.000Z",
        finished_at: "2026-09-25T06:17:01.000Z",
        status: "failed",
        posts_added: 0,
        entries_skipped: 0,
        error: "Feed responded 503",
      },
    ]);
  });
});
