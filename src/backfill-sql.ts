import { attributePost } from "./attribution";
import type { Catalog, Pelican, Post } from "./domain";
import { newPostRow, POST_COLUMNS } from "./stored-rows";

type SqlValue = string | null;

export function backfillSql(posts: Post[], catalog: Catalog, ingestedAt: string): string {
  const statements = posts.flatMap((post) => [insertPostIfNew(post, ingestedAt), ...attributionStatements(post, catalog)]);
  return `${statements.join("\n")}\n`;
}

function insertPostIfNew(post: Post, ingestedAt: string): string {
  return `INSERT INTO posts (${POST_COLUMNS.join(", ")}) VALUES ${row(newPostRow(post, ingestedAt))} ON CONFLICT DO NOTHING;`;
}

function attributionStatements(post: Post, catalog: Catalog): string[] {
  const { kind, pelicans } = attributePost(post, catalog);
  const statements = [
    `UPDATE posts SET kind = ${literal(kind)} WHERE id = ${literal(post.id)};`,
    `DELETE FROM pelicans WHERE post_id = ${literal(post.id)};`,
  ];
  if (pelicans.length > 0) {
    statements.push(
      `INSERT INTO pelicans (id, post_id, model_name, model_slug, vendor, post_url, published_at) VALUES ${pelicans.map(pelicanRow).join(", ")};`,
    );
  }
  return statements;
}

function pelicanRow(pelican: Pelican): string {
  return row([pelican.id, pelican.postId, pelican.modelName, pelican.modelSlug, pelican.vendor, pelican.postUrl, pelican.publishedAt]);
}

function row(values: SqlValue[]): string {
  return `(${values.map(literal).join(", ")})`;
}

function literal(value: SqlValue): string {
  return value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
}
