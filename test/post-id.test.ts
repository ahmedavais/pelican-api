import { describe, expect, it } from "vitest";
import { postIdFromUrl } from "../src/post-id";

describe("postIdFromUrl", () => {
  it("combines the post date and slug", () => {
    expect(postIdFromUrl("https://simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/")).toBe(
      "2026-09-22-opus-and-sol-and-luna",
    );
  });

  it("zero-pads single-digit days", () => {
    expect(postIdFromUrl("https://simonwillison.net/2026/Sep/2/llm-gemini/")).toBe("2026-09-02-llm-gemini");
  });

  it("gives different ids to the same slug on different dates", () => {
    expect(postIdFromUrl("https://simonwillison.net/2026/Aug/13/llm-gemini/")).not.toBe(
      postIdFromUrl("https://simonwillison.net/2026/Sep/2/llm-gemini/"),
    );
  });

  it("accepts a url without a trailing slash", () => {
    expect(postIdFromUrl("https://simonwillison.net/2026/Sep/2/llm-gemini")).toBe("2026-09-02-llm-gemini");
  });

  it.each([
    "https://simonwillison.net/tags/pelican-riding-a-bicycle/",
    "https://simonwillison.net/blog/2026/Sep/2/llm-gemini/",
    "https://simonwillison.net/2026/Sep/2/llm-gemini/comments/",
    "https://simonwillison.net/2026/Foo/2/llm-gemini/",
  ])("rejects %s as not a dated post", (url) => {
    expect(() => postIdFromUrl(url)).toThrow("Not a dated post URL");
  });
});
