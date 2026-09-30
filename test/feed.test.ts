import { describe, expect, it } from "vitest";
import { readFeed, withoutPostBodies } from "../src/feed";
import savedFeed from "./fixtures/pelican-tag-feed.atom?raw";

function feedWithEntries(...entries: string[]): string {
  return `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom">${entries.join("")}</feed>`;
}

describe("readFeed", () => {
  it("reads every entry of the saved tag feed", () => {
    expect(readFeed(savedFeed).posts).toHaveLength(30);
  });

  it("turns an entry into a post with its id, url, title, UTC date and tags", () => {
    expect(readFeed(savedFeed).posts[0]).toEqual({
      id: "2026-09-22-opus-and-sol-and-luna",
      url: "https://simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/",
      title: "Claude Opus 5.5, GPT-6 Sol, GPT-6 Luna, and a new price war",
      publishedAt: "2026-09-22T23:46:41.000Z",
      tags: ["ai", "openai", "generative-ai", "llms", "anthropic", "claude", "llm-pricing", "pelican-riding-a-bicycle", "gpt"],
    });
  });

  it("decodes escaped characters in titles", () => {
    const titles = readFeed(savedFeed).posts.map((post) => post.title);

    expect(titles).toContain('Claude Opus 4.8: "a modest but tangible improvement"');
  });

  it("converts dates with a timezone offset to UTC", () => {
    const feed = feedWithEntries(
      `<entry><title>T</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T20:30:00-07:00</published><category term="llm"/></entry>`,
    );

    expect(readFeed(feed).posts[0].publishedAt).toBe("2026-09-03T03:30:00.000Z");
  });

  it("keeps a lone tag as a one-item list", () => {
    const feed = feedWithEntries(
      `<entry><title>T</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published><category term="llm"/></entry>`,
    );

    expect(readFeed(feed).posts[0].tags).toEqual(["llm"]);
  });

  it("skips entries that do not link to a dated post", () => {
    const feed = feedWithEntries(
      `<entry><title>Tag page</title><link href="https://simonwillison.net/tags/llm/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published></entry>`,
      `<entry><title>Post</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published></entry>`,
    );

    expect(readFeed(feed)).toMatchObject({ posts: [{ title: "Post" }], skippedEntries: 1 });
  });

  it("skips entries with an unreadable date", () => {
    const feed = feedWithEntries(
      `<entry><title>Post</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>not a date</published></entry>`,
    );

    expect(readFeed(feed)).toEqual({ posts: [], skippedEntries: 1 });
  });

  it("reads the same posts whether or not entries carry their post bodies", () => {
    const entryWith = (body: string) =>
      `<entry><title>T &amp; U</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published>${body}<category term="llm"/></entry>`;
    const bodies = [
      `<summary type="html">&lt;p&gt;A &lt;category term="fake"/&gt; pelican&lt;/p&gt;</summary>`,
      `<content type="html"><![CDATA[<p>More <b>pelicans</b></p>]]></content>`,
    ];

    expect(readFeed(feedWithEntries(entryWith(bodies.join(""))))).toEqual(readFeed(feedWithEntries(entryWith(""))));
  });

  it("keeps numeric titles and tags as text", () => {
    const feed = feedWithEntries(
      `<entry><title>1984</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published><category term="2024"/></entry>`,
    );

    expect(readFeed(feed).posts[0]).toMatchObject({ title: "1984", tags: ["2024"] });
  });

  it("gives an entry without categories no tags", () => {
    const feed = feedWithEntries(
      `<entry><title>T</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published></entry>`,
    );

    expect(readFeed(feed).posts[0].tags).toEqual([]);
  });

  it("takes the post url from the alternate link, wherever it sits", () => {
    const feed = feedWithEntries(
      `<entry><title>T</title><link href="https://example.com/comments/1" rel="replies"/><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/" rel="alternate"/><published>2026-09-02T00:00:00+00:00</published></entry>`,
    );

    expect(readFeed(feed).posts[0].url).toBe("https://simonwillison.net/2026/Sep/2/llm-gemini/");
  });

  it("falls back to the first link when none is marked alternate", () => {
    const feed = feedWithEntries(
      `<entry><title>T</title><link href="https://simonwillison.net/2026/Sep/2/llm-gemini/"/><published>2026-09-02T00:00:00+00:00</published></entry>`,
    );

    expect(readFeed(feed).posts[0].url).toBe("https://simonwillison.net/2026/Sep/2/llm-gemini/");
  });

  it("skips entries with no link", () => {
    const feed = feedWithEntries(`<entry><title>T</title><published>2026-09-02T00:00:00+00:00</published></entry>`);

    expect(readFeed(feed)).toEqual({ posts: [], skippedEntries: 1 });
  });

  it("reads a feed with no entries as no posts", () => {
    expect(readFeed(feedWithEntries())).toEqual({ posts: [], skippedEntries: 0 });
  });

  it("reads a document that is not an Atom feed as no posts", () => {
    expect(readFeed("<html><body>Not found</body></html>")).toEqual({ posts: [], skippedEntries: 0 });
  });
});

describe("withoutPostBodies", () => {
  it("drops summaries and contents, with or without attributes and across lines", () => {
    const entry = `<entry><title>T</title><summary type="html">&lt;p&gt;Hi&lt;/p&gt;</summary><content>\n  <p>Two lines</p>\n</content></entry>`;

    expect(withoutPostBodies(entry)).toBe("<entry><title>T</title></entry>");
  });
});
