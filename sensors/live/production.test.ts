import { describe, expect, it } from "vitest";

const API = process.env.API_URL ?? "https://pelican-api.dynamicalchange.workers.dev";
const PATIENCE_MS = 15_000;
const DAILY_REFRESH_WITH_SLACK_MS = 26 * 60 * 60 * 1000;

async function answerFrom(path: string): Promise<Response> {
  return fetch(`${API}${path}`, { signal: AbortSignal.timeout(PATIENCE_MS) });
}

async function jsonFrom<T>(path: string): Promise<T> {
  const response = await answerFrom(path);
  expect(response.status, path).toBe(200);
  return (await response.json()) as T;
}

describe(`production at ${API}`, () => {
  it("serves the scoreboard", async () => {
    const response = await answerFrom("/");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<title>Pelican Scoreboard</title>");
  });

  it("serves the docs and the spec behind them", async () => {
    const docs = await answerFrom("/docs");
    const spec = await jsonFrom<{ paths: object }>("/openapi.json");

    expect(docs.status).toBe(200);
    expect(Object.keys(spec.paths)).toContain("/pelicans");
  });

  it("answers with the latest pelican", async () => {
    const latest = await jsonFrom<{ model_name: string }>("/pelicans/latest");

    expect(latest.model_name).toBeTruthy();
  });

  it("refreshed from the feed within the last day", async () => {
    const { last_ingest_at } = await jsonFrom<{ last_ingest_at: string | null }>("/stats");
    const age = Date.now() - Date.parse(last_ingest_at ?? "");

    expect(age, `last successful refresh: ${last_ingest_at}`).toBeLessThan(DAILY_REFRESH_WITH_SLACK_MS);
  });

  it("has cataloged every post", async () => {
    const { data } = await jsonFrom<{ data: { url: string }[] }>("/posts?kind=unclassified&limit=100");

    expect(data.map((post) => post.url), "add these to src/pelican-catalog.ts").toEqual([]);
  });
});
