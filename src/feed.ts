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

const POST_BODIES = /<(summary|content)\b[^>]*>[\s\S]*?<\/\1>/g;

const REPEATABLE_ELEMENTS = new Set(["entry", "link", "category"]);

const atomParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name) => REPEATABLE_ELEMENTS.has(name),
});

export type FeedReading = {
  posts: Post[];
  skippedEntries: number;
};

export function readFeed(atomXml: string): FeedReading {
  const entries: FeedEntry[] = atomParser.parse(withoutPostBodies(atomXml)).feed?.entry ?? [];
  const posts = entries.map(postFromEntry).filter((post): post is Post => post !== null);
  return { posts, skippedEntries: entries.length - posts.length };
}

function withoutPostBodies(atomXml: string): string {
  return atomXml.replace(POST_BODIES, "");
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
