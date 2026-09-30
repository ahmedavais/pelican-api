import { describe, expect, it } from "vitest";
import type { CatalogedModel } from "../src/domain";
import { get, getJson } from "./api-client";
import { postOn, seed } from "./seed";

const claude: CatalogedModel = { modelName: "Claude Opus 5.5", vendor: "anthropic" };
const sol: CatalogedModel = { modelName: "GPT-6 Sol", vendor: "openai" };
const gemini: CatalogedModel = { modelName: "Gemini 3.5 Flash", vendor: "google" };

async function seedThreePosts() {
  await seed(
    { ...postOn("2026-07-10T12:00:00Z", "gemini-flash"), models: [gemini] },
    { ...postOn("2026-08-20T12:00:00Z", "sol"), models: [sol] },
    { ...postOn("2026-09-22T12:00:00Z", "opus-and-sol"), models: [claude, sol] },
    { ...postOn("2026-09-18T12:00:00Z", "roger-rabbit"), kind: "sighting" },
  );
}

function ids(body: { data: { id: string }[] }) {
  return body.data.map((pelican) => pelican.id);
}

describe("GET /pelicans", () => {
  it("lists pelicans newest first with every field", async () => {
    await seedThreePosts();

    const { status, body } = await getJson("/pelicans");

    expect(status).toBe(200);
    expect(body.next_cursor).toBeNull();
    expect(ids(body)).toEqual([
      "2026-09-22-opus-and-sol-gpt-6-sol",
      "2026-09-22-opus-and-sol-claude-opus-5-5",
      "2026-08-20-sol-gpt-6-sol",
      "2026-07-10-gemini-flash-gemini-3-5-flash",
    ]);
    expect(body.data[1]).toEqual({
      id: "2026-09-22-opus-and-sol-claude-opus-5-5",
      post_id: "2026-09-22-opus-and-sol",
      model_name: "Claude Opus 5.5",
      model_slug: "claude-opus-5-5",
      vendor: "anthropic",
      post_url: "https://simonwillison.net/2026/Sep/22/opus-and-sol/",
      published_at: "2026-09-22T12:00:00.000Z",
    });
  });

  it("walks every pelican exactly once across pages", async () => {
    await seed(
      ...Array.from({ length: 25 }, (_, index) => ({
        ...postOn(`2026-08-${String(index + 1).padStart(2, "0")}T12:00:00Z`, "daily"),
        models: [sol],
      })),
    );

    const seen: string[] = [];
    let path = "/pelicans?limit=10";
    for (let page = 0; page < 5; page++) {
      const { body } = await getJson(path);
      seen.push(...ids(body));
      if (!body.next_cursor) break;
      path = `/pelicans?limit=10&cursor=${body.next_cursor}`;
    }

    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
  });

  it("returns 20 pelicans by default", async () => {
    await seed(
      ...Array.from({ length: 21 }, (_, index) => ({
        ...postOn(`2026-08-${String(index + 1).padStart(2, "0")}T12:00:00Z`, "daily"),
        models: [sol],
      })),
    );

    const { body } = await getJson("/pelicans");

    expect(body.data).toHaveLength(20);
    expect(body.next_cursor).toEqual(expect.any(String));
  });

  it.each([
    ["/pelicans?model=gpt-6-sol", ["2026-09-22-opus-and-sol-gpt-6-sol", "2026-08-20-sol-gpt-6-sol"]],
    ["/pelicans?vendor=google", ["2026-07-10-gemini-flash-gemini-3-5-flash"]],
    ["/pelicans?since=2026-08-20", ["2026-09-22-opus-and-sol-gpt-6-sol", "2026-09-22-opus-and-sol-claude-opus-5-5", "2026-08-20-sol-gpt-6-sol"]],
    ["/pelicans?until=2026-08-20", ["2026-07-10-gemini-flash-gemini-3-5-flash"]],
    ["/pelicans?model=gpt-6-sol&since=2026-09-01T00:00:00Z", ["2026-09-22-opus-and-sol-gpt-6-sol"]],
    ["/pelicans?since=2026-08-20T06:00:00-07:00", ["2026-09-22-opus-and-sol-gpt-6-sol", "2026-09-22-opus-and-sol-claude-opus-5-5"]],
  ])("filters %s", async (path, expectedIds) => {
    await seedThreePosts();

    const { body } = await getJson(path);

    expect(ids(body)).toEqual(expectedIds);
  });

  it.each([
    ["/pelicans?limit=0", "invalid_request"],
    ["/pelicans?limit=101", "invalid_request"],
    ["/pelicans?limit=ten", "invalid_request"],
    ["/pelicans?since=yesterday", "invalid_request"],
    ["/pelicans?cursor=nonsense", "invalid_cursor"],
  ])("rejects %s with a 400 error", async (path, code) => {
    const { status, body } = await getJson(path);

    expect(status).toBe(400);
    expect(body).toEqual({ error: { code, message: expect.any(String) } });
  });

  it("explains a rejected cursor", async () => {
    const { body } = await getJson("/pelicans?cursor=nonsense");

    expect(body.error.message).toBe("The cursor is not one this API issued");
  });

  it("allows any origin", async () => {
    const response = await get("/pelicans");

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
