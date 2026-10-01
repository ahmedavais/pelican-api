import type { Post } from "./domain";

export const POST_COLUMNS = ["id", "url", "title", "published_at", "tags", "kind", "ingested_at"];

export function newPostRow(post: Post, ingestedAt: string): string[] {
  return [post.id, post.url, post.title, post.publishedAt, JSON.stringify(post.tags), "unclassified", ingestedAt];
}
