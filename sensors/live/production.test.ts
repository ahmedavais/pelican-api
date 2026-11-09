import { describe, expect, it } from "vitest";
import { API, answerFrom, jsonFrom } from "./production-api";

const DAILY_REFRESH_WITH_SLACK_MS = 26 * 60 * 60 * 1000;

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
});
