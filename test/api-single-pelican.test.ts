import { describe, expect, it } from "vitest";
import { getJson } from "./api-client";
import { postOn, seed } from "./seed";

const claude = { modelName: "Claude Opus 5.5", vendor: "anthropic" };
const sol = { modelName: "GPT-6 Sol", vendor: "openai" };

async function seedTwoPosts() {
  await seed(
    { ...postOn("2026-08-20T12:00:00Z", "sol"), models: [sol] },
    { ...postOn("2026-09-22T12:00:00Z", "opus"), models: [claude] },
  );
}

describe("GET /pelicans/latest", () => {
  it("returns the most recent pelican", async () => {
    await seedTwoPosts();

    const { status, body } = await getJson("/pelicans/latest");

    expect(status).toBe(200);
    expect(body).toMatchObject({ id: "2026-09-22-opus-claude-opus-5-5", model_name: "Claude Opus 5.5" });
  });

  it("is a 404 when there are no pelicans yet", async () => {
    const { status, body } = await getJson("/pelicans/latest");

    expect(status).toBe(404);
    expect(body.error.code).toBe("not_found");
  });
});

describe("GET /pelicans/random", () => {
  it("returns one of the stored pelicans", async () => {
    await seedTwoPosts();

    const { status, body } = await getJson("/pelicans/random");

    expect(status).toBe(200);
    expect(["2026-09-22-opus-claude-opus-5-5", "2026-08-20-sol-gpt-6-sol"]).toContain(body.id);
  });

  it("is a 404 when there are no pelicans yet", async () => {
    const { status } = await getJson("/pelicans/random");

    expect(status).toBe(404);
  });
});

describe("GET /pelicans/{id}", () => {
  it("returns that pelican", async () => {
    await seedTwoPosts();

    const { status, body } = await getJson("/pelicans/2026-08-20-sol-gpt-6-sol");

    expect(status).toBe(200);
    expect(body).toMatchObject({ id: "2026-08-20-sol-gpt-6-sol", vendor: "openai" });
  });

  it("is a 404 naming the id when there is no such pelican", async () => {
    const { status, body } = await getJson("/pelicans/no-such-pelican");

    expect(status).toBe(404);
    expect(body).toEqual({ error: { code: "not_found", message: "No pelican with id 'no-such-pelican'" } });
  });
});
