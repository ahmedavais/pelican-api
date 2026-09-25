import type { Post } from "./domain";

const INSERT_NEW_POST = `
  INSERT INTO posts (id, url, title, published_at, tags, kind, ingested_at)
  VALUES (?, ?, ?, ?, ?, 'unclassified', ?)
  ON CONFLICT DO NOTHING
`;

export async function storeNewPosts(db: D1Database, posts: Post[], ingestedAt: string): Promise<number> {
  if (posts.length === 0) {
    return 0;
  }
  const insert = db.prepare(INSERT_NEW_POST);
  const results = await db.batch(
    posts.map((post) =>
      insert.bind(post.id, post.url, post.title, post.publishedAt, JSON.stringify(post.tags), ingestedAt),
    ),
  );
  return results.reduce((added, result) => added + result.meta.changes, 0);
}
