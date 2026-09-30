import { createScheduledController } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { PELICAN_FEED_URL } from "../src/pelican-feed";
import savedFeed from "./fixtures/pelican-tag-feed.atom?raw";

async function runDailyRefresh() {
  await worker.scheduled(createScheduledController(), env);
}

describe("the daily scheduled run", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the live feed, stores its posts with the real catalog, and records the run", async () => {
    const fetched = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(savedFeed));
    const before = new Date().toISOString();

    await runDailyRefresh();

    const after = new Date().toISOString();
    const [url, init] = fetched.mock.calls[0];
    expect(url).toBe(PELICAN_FEED_URL);
    expect(new Headers(init?.headers).get("User-Agent")).toContain(env.CONTACT_EMAIL);
    expect(await env.DB.prepare("SELECT COUNT(*) AS total FROM posts").first("total")).toBe(30);
    expect(await env.DB.prepare("SELECT COUNT(*) AS total FROM pelicans").first("total")).toBeGreaterThan(0);
    const run = await env.DB.prepare("SELECT started_at, status, posts_added FROM ingest_runs").first<{
      started_at: string;
      status: string;
      posts_added: number;
    }>();
    expect(run).toMatchObject({ status: "succeeded", posts_added: 30 });
    expect(run!.started_at >= before && run!.started_at <= after).toBe(true);
  });
});
