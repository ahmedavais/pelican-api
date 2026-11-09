import { expect } from "vitest";

export const API = process.env.API_URL ?? "https://pelican-api.dynamicalchange.workers.dev";
const PATIENCE_MS = 15_000;

export async function answerFrom(path: string): Promise<Response> {
  return fetch(`${API}${path}`, { signal: AbortSignal.timeout(PATIENCE_MS) });
}

export async function jsonFrom<T>(path: string): Promise<T> {
  const response = await answerFrom(path);
  expect(response.status, path).toBe(200);
  return (await response.json()) as T;
}
