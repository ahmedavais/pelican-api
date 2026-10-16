import type { Pelican, Post } from "./domain";

export type PostRow = {
  id: string;
  url: string;
  title: string;
  published_at: string;
  tags: string;
};

export const POST_COLUMNS = ["id", "url", "title", "published_at", "tags", "kind", "ingested_at"];

export const PELICAN_COLUMNS = ["id", "post_id", "model_name", "model_slug", "vendor", "post_url", "published_at"];

export function newPostValues(post: Post, ingestedAt: string): string[] {
  return [post.id, post.url, post.title, post.publishedAt, JSON.stringify(post.tags), "unclassified", ingestedAt];
}

export function pelicanValues(pelican: Pelican): (string | null)[] {
  return [pelican.id, pelican.postId, pelican.modelName, pelican.modelSlug, pelican.vendor, pelican.postUrl, pelican.publishedAt];
}

export function postFromRow(row: PostRow): Post {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    publishedAt: row.published_at,
    tags: JSON.parse(row.tags),
  };
}
