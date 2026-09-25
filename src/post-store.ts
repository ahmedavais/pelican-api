import { inChunksOf, multiRowInsert, rowsPerInsert } from "./d1-limits";
import type { Post } from "./domain";

const POST_COLUMNS = ["id", "url", "title", "published_at", "tags", "kind", "ingested_at"];

export async function storeNewPosts(db: D1Database, posts: Post[], ingestedAt: string): Promise<number> {
  if (posts.length === 0) {
    return 0;
  }
  const newPosts = await postsNotYetStored(db, posts);
  if (newPosts.length === 0) {
    return 0;
  }
  const inserts = inChunksOf(rowsPerInsert(POST_COLUMNS.length), newPosts).map((chunk) =>
    db
      .prepare(multiRowInsert("posts", POST_COLUMNS, chunk.length, "ON CONFLICT DO NOTHING"))
      .bind(...chunk.flatMap((post) => postRow(post, ingestedAt))),
  );
  const results = await db.batch(inserts);
  return results.reduce((added, result) => added + result.meta.changes, 0);
}

async function postsNotYetStored(db: D1Database, posts: Post[]): Promise<Post[]> {
  const { results } = await db.prepare("SELECT url FROM posts").all<{ url: string }>();
  const storedUrls = new Set(results.map((row) => row.url));
  const unseenByUrl = new Map(posts.filter((post) => !storedUrls.has(post.url)).map((post) => [post.url, post]));
  return [...unseenByUrl.values()];
}

function postRow(post: Post, ingestedAt: string): unknown[] {
  return [post.id, post.url, post.title, post.publishedAt, JSON.stringify(post.tags), "unclassified", ingestedAt];
}
