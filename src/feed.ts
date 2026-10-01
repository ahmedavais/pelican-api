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
  const feed = atomParser.parse(withoutPostBodies(atomXml)).feed;
  // An error page answering 200 must fail the run, not look like a quiet day.
  if (feed === undefined) {
    throw new Error("The response is not an Atom feed");
  }
  const entries: FeedEntry[] = feed.entry ?? [];
  const posts = entries.map(postFromEntry).filter((post): post is Post => post !== null);
  return { posts, skippedEntries: entries.length - posts.length };
}

export function withoutPostBodies(atomXml: string): string {
  // Stryker disable next-line StringLiteral: text left between elements never reaches a post
  return atomXml.replace(POST_BODIES, "");
}

function postFromEntry(entry: FeedEntry): Post | null {
  const url = alternateLink(entry);
  // Stryker disable next-line all: without the guard postIdFromUrl throws and the catch skips the entry anyway
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
  // Stryker disable next-line ArrayDeclaration: any stand-in value still yields no href
  const links = entry.link ?? [];
  return (links.find((link) => link.rel === "alternate") ?? links[0])?.href;
}
