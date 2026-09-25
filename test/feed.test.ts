import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { postsFromFeed } from "../src/feed";

const savedFeed = readFileSync(new URL("./fixtures/pelican-tag-feed.atom", import.meta.url), "utf8");

function feedWithEntries(...entries: string[]): string {
  return `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom">${entries.join("")}</feed>`;
}

describe("postsFromFeed", () => {
  it("reads every entry of the saved tag feed", () => {
    expect(postsFromFeed(savedFeed)).toHaveLength(30);
  });

  it("turns an entry into a post with its id, url, title, UTC date and tags", () => {
    expect(postsFromFeed(savedFeed)[0]).toEqual({
      id: "2026-09-22-opus-and-sol-and-luna",
      url: "https://simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/",
      title: "Claude Opus 5.5, GPT-6 Sol, GPT-6 Luna, and a new price war",
      publishedAt: "2026-09-22T23:46:41.000Z",
      tags: ["ai", "openai", "generative-ai", "llms", "anthropic", "claude", "llm-pricing", "pelican-riding-a-bicycle", "gpt"],
    });
  });

  it("decodes escaped characters in titles", () => {
    const titles = postsFromFeed(savedFeed).map((post) => post.title);

    expect(titles).toContain('Claude Opus 4.8: "a modest but tangible improvement"');
  });

  it("converts dates with a timezone offset to UTC", () => {
    const feed = feedWithEntries(
      `<entry><title>T</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T20:30:00-07:00</published><category term="llm"/></entry>`,
    );

    expect(postsFromFeed(feed)[0].publishedAt).toBe("2026-09-03T03:30:00.000Z");
  });

  it("keeps a lone tag as a one-item list", () => {
    const feed = feedWithEntries(
      `<entry><title>T</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published><category term="llm"/></entry>`,
    );

    expect(postsFromFeed(feed)[0].tags).toEqual(["llm"]);
  });

  it("skips entries that do not link to a dated post", () => {
    const feed = feedWithEntries(
      `<entry><title>Tag page</title><link href="https://simonwillison.net/tags/llm/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published></entry>`,
      `<entry><title>Post</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published></entry>`,
    );

    expect(postsFromFeed(feed).map((post) => post.title)).toEqual(["Post"]);
  });

  it("reads a feed with no entries as no posts", () => {
    expect(postsFromFeed(feedWithEntries())).toEqual([]);
  });
});
