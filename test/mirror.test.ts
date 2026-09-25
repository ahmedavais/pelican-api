import { describe, expect, it } from "vitest";
import { readFeed } from "../src/feed";
import { type MirrorRow, postsFromMirrorRows } from "../src/mirror";
import savedFeed from "./fixtures/pelican-tag-feed.atom?raw";
import mirrorRows from "./fixtures/mirror-rows.json";

const rows = mirrorRows as MirrorRow[];

describe("postsFromMirrorRows", () => {
  it("gives exactly the feed's post for every post both sources have", () => {
    const mirrorPostsByUrl = new Map(postsFromMirrorRows(rows).map((post) => [post.url, post]));

    for (const feedPost of readFeed(savedFeed).posts) {
      expect(mirrorPostsByUrl.get(feedPost.url)).toEqual(feedPost);
    }
  });

  it("reads the whole tag history with unique ids", () => {
    const posts = postsFromMirrorRows(rows);

    expect(posts).toHaveLength(144);
    expect(new Set(posts.map((post) => post.id)).size).toBe(144);
  });

  it("dates the url by the UTC day of publication", () => {
    const [post] = postsFromMirrorRows([
      { type: "entry", slug: "5-minute-llms", created: "2026-05-19T01:09:44+00:00", title: "Five minute LLMs", tags: "[]" },
    ]);

    expect(post).toMatchObject({
      id: "2026-05-19-5-minute-llms",
      url: "https://simonwillison.net/2026/May/19/5-minute-llms/",
      publishedAt: "2026-05-19T01:09:44.000Z",
    });
  });

  it("converts a time with an offset to UTC before dating the url", () => {
    const [post] = postsFromMirrorRows([
      { type: "note", slug: "late", created: "2026-05-18T22:30:00-07:00", title: "Late", tags: '["pelican-riding-a-bicycle"]' },
    ]);

    expect(post).toMatchObject({ url: "https://simonwillison.net/2026/May/19/late/", tags: ["pelican-riding-a-bicycle"] });
  });
});
