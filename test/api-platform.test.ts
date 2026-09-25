import { describe, expect, it } from "vitest";
import { get, getJson } from "./api-client";

describe("GET /openapi.json", () => {
  it("documents every endpoint", async () => {
    const { status, body } = await getJson("/openapi.json");

    expect(status).toBe(200);
    expect(Object.keys(body.paths).sort()).toEqual([
      "/models",
      "/pelicans",
      "/pelicans/latest",
      "/pelicans/random",
      "/pelicans/{id}",
      "/posts",
      "/stats",
      "/vendors",
    ]);
    expect(body.info.title).toBe("Pelican API");
  });
});

describe("GET /docs", () => {
  it("serves a docs page built from the OpenAPI spec", async () => {
    const response = await get("/docs");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(await response.text()).toContain("/openapi.json");
  });
});

describe("unknown paths", () => {
  it("answer with a 404 in the error shape", async () => {
    const { status, body } = await getJson("/pelicanz");

    expect(status).toBe(404);
    expect(body).toEqual({ error: { code: "not_found", message: "No endpoint at /pelicanz" } });
  });
});

describe("rate limiting", () => {
  it("allows 60 requests a minute from one IP, then answers 429", async () => {
    const statuses: number[] = [];
    for (let request = 0; request < 61; request++) {
      statuses.push((await get("/openapi.json", "203.0.113.7")).status);
    }

    expect(statuses.slice(0, 60).every((status) => status === 200)).toBe(true);
    const limited = await get("/openapi.json", "203.0.113.7");
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: { code: "rate_limited", message: expect.any(String) } });
  });

  it("counts each IP separately", async () => {
    for (let request = 0; request < 61; request++) {
      await get("/openapi.json", "203.0.113.8");
    }

    expect((await get("/openapi.json", "203.0.113.9")).status).toBe(200);
  });
});
