import { XMLParser } from "fast-xml-parser";
import type { Post } from "./domain";
import { postIdFromUrl } from "./post-id";

type FeedLink = { href: string; rel?: string };
type FeedEntry = {
  title: string;
  link?: FeedLink[];
  published: string;
  category?: { term: string }[];
};

const REPEATABLE_ELEMENTS = new Set(["entry", "link", "category"]);

const atomParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name) => REPEATABLE_ELEMENTS.has(name),
});

export function postsFromFeed(atomXml: string): Post[] {
  const entries: FeedEntry[] = atomParser.parse(atomXml).feed?.entry ?? [];
  return entries.flatMap((entry) => {
    const post = postFromEntry(entry);
    return post ? [post] : [];
  });
}

function postFromEntry(entry: FeedEntry): Post | null {
  const url = alternateLink(entry);
  if (!url) {
    return null;
  }
  try {
    return {
      id: postIdFromUrl(url),
      url,
      title: entry.title,
      publishedAt: new Date(entry.published).toISOString(),
      tags: (entry.category ?? []).map((category) => category.term),
    };
  } catch {
    return null;
  }
}

function alternateLink(entry: FeedEntry): string | undefined {
  const links = entry.link ?? [];
  return (links.find((link) => link.rel === "alternate") ?? links[0])?.href;
}
