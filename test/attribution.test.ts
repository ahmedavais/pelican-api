import { describe, expect, it } from "vitest";
import { attributePost } from "../src/attribution";
import type { Catalog, Post } from "../src/domain";

function postAt(url: string, id: string): Post {
  return {
    id,
    url,
    title: "A post",
    publishedAt: "2026-09-22T15:00:00Z",
    tags: ["pelican-riding-a-bicycle"],
  };
}

const opusPost = postAt("https://simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/", "2026-09-22-opus-and-sol-and-luna");
const filmPost = postAt(
  "https://simonwillison.net/2026/Sep/18/the-creative-spirit-of-who-framed-roger-rabbit/",
  "2026-09-18-the-creative-spirit-of-who-framed-roger-rabbit",
);

describe("attributePost", () => {
  it("gives a single-pelican post one pelican carrying the post's url and date", () => {
    const catalog: Catalog = {
      [opusPost.url]: { kind: "model_pelicans", pelicans: [{ modelName: "Claude Opus 5.5", vendor: "anthropic" }] },
    };

    expect(attributePost(opusPost, catalog)).toEqual({
      kind: "model_pelicans",
      pelicans: [
        {
          id: "2026-09-22-opus-and-sol-and-luna-claude-opus-5-5",
          postId: opusPost.id,
          modelName: "Claude Opus 5.5",
          modelSlug: "claude-opus-5-5",
          vendor: "anthropic",
          postUrl: opusPost.url,
          publishedAt: opusPost.publishedAt,
        },
      ],
    });
  });

  it("keeps every pelican of a multi-model post, in catalog order", () => {
    const catalog: Catalog = {
      [opusPost.url]: {
        kind: "model_pelicans",
        pelicans: [
          { modelName: "Claude Opus 5.5", vendor: "anthropic" },
          { modelName: "GPT-6 Sol", vendor: "openai" },
          { modelName: "GPT-6 Luna", vendor: "openai" },
        ],
      },
    };

    const { pelicans } = attributePost(opusPost, catalog);

    expect(pelicans.map((pelican) => pelican.modelSlug)).toEqual(["claude-opus-5-5", "gpt-6-sol", "gpt-6-luna"]);
  });

  it("numbers true duplicates within a post in order of appearance", () => {
    const catalog: Catalog = {
      [opusPost.url]: {
        kind: "model_pelicans",
        pelicans: [
          { modelName: "GPT-6 Sol", vendor: "openai" },
          { modelName: "GPT-6 Sol", vendor: "openai" },
          { modelName: "GPT-6 Sol", vendor: "openai" },
        ],
      },
    };

    const { pelicans } = attributePost(opusPost, catalog);

    expect(pelicans.map((pelican) => pelican.id)).toEqual([
      "2026-09-22-opus-and-sol-and-luna-gpt-6-sol",
      "2026-09-22-opus-and-sol-and-luna-gpt-6-sol-2",
      "2026-09-22-opus-and-sol-and-luna-gpt-6-sol-3",
    ]);
  });

  it("gives a sighting no pelicans", () => {
    const catalog: Catalog = { [filmPost.url]: { kind: "sighting" } };

    expect(attributePost(filmPost, catalog)).toEqual({ kind: "sighting", pelicans: [] });
  });

  it("leaves an uncatalogued post unclassified with no pelicans", () => {
    expect(attributePost(opusPost, {})).toEqual({ kind: "unclassified", pelicans: [] });
  });
});
