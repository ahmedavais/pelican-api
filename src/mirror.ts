import type { Post } from "./domain";
import { MONTH_ABBREVIATIONS, postIdFromUrl } from "./post-id";

export type MirrorRow = {
  type: "entry" | "blogmark" | "beat" | "note" | "quotation";
  slug: string;
  created: string;
  title: string;
  tags: string;
};

export function postsFromMirrorRows(rows: MirrorRow[]): Post[] {
  return rows.map((row) => {
    const published = new Date(row.created);
    const url = postUrl(published, row.slug);
    return {
      id: postIdFromUrl(url),
      url,
      title: row.title,
      publishedAt: published.toISOString(),
      tags: JSON.parse(row.tags),
    };
  });
}

function postUrl(published: Date, slug: string): string {
  const month = MONTH_ABBREVIATIONS[published.getUTCMonth()];
  return `https://simonwillison.net/${published.getUTCFullYear()}/${month}/${published.getUTCDate()}/${slug}/`;
}
