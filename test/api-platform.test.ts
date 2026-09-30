import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { get, getJson, send } from "./api-client";

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
    expect(body.openapi).toBe("3.1.0");
    expect(body.info).toEqual({
      title: "Pelican API",
      version: "1.0.0",
      description: expect.stringContaining("every record links back to the original post"),
    });
  });
});

describe("GET /openapi.json snapshot", () => {
  // Any change to the published spec, deliberate or not, shows up here for review.
  it("matches the reviewed spec", async () => {
    const { body } = await getJson("/openapi.json");

    expect(body).toMatchSnapshot();
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

describe("invalid requests", () => {
  it("name each invalid field in one message", async () => {
    const { status, body } = await getJson("/posts?limit=0&kind=pelican");

    expect(status).toBe(400);
    expect(body.error).toEqual({ code: "invalid_request", message: expect.stringMatching(/^limit: .+; kind: .+$/) });
  });
});

describe("unexpected failures", () => {
  it("answer with a 500 in the error shape and log the error", async () => {
    const failure = new Error("D1 is unavailable");
    const brokenDb = { prepare: () => { throw failure; } } as unknown as D1Database;
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await send(new Request("https://pelicans.test/posts"), { ...env, DB: brokenDb });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: "internal_error", message: "Something went wrong" } });
    expect(logged).toHaveBeenCalledWith(failure);
    logged.mockRestore();
  });
});

describe("CORS", () => {
  it("lets any origin read responses", async () => {
    const response = await send(new Request("https://pelicans.test/openapi.json", { headers: { Origin: "https://example.com" } }));

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("allows only GET in preflight", async () => {
    const response = await send(
      new Request("https://pelicans.test/posts", {
        method: "OPTIONS",
        headers: { Origin: "https://example.com", "Access-Control-Request-Method": "GET" },
      }),
    );

    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET");
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
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(await limited.json()).toEqual({
      error: { code: "rate_limited", message: "Too many requests; the limit is 60 per minute" },
    });
  });

  it("counts each IP separately", async () => {
    for (let request = 0; request < 61; request++) {
      await get("/openapi.json", "203.0.113.8");
    }

    expect((await get("/openapi.json", "203.0.113.9")).status).toBe(200);
  });
});
