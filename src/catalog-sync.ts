import { attributePost } from "./attribution";
import { inChunksOf, multiRowInsert, rowsPerInsert } from "./d1-limits";
import type { Attribution, Catalog, Pelican, Post, PostKind } from "./domain";

type PostRow = {
  id: string;
  url: string;
  title: string;
  published_at: string;
  tags: string;
  kind: PostKind;
};

type PelicanRow = {
  id: string;
  post_id: string;
  model_name: string;
  model_slug: string;
  vendor: string | null;
  post_url: string;
  published_at: string;
};

const PELICAN_COLUMNS = ["id", "post_id", "model_name", "model_slug", "vendor", "post_url", "published_at"];

const REWRITE_STATEMENTS_PER_RUN = 36;

type StoredPost = {
  post: Post;
  attribution: Attribution;
};

export async function applyCatalog(db: D1Database, catalog: Catalog): Promise<number> {
  const changedPosts = postsWithChangedAttribution(await storedPosts(db), catalog);
  const rewrites = withinRewriteBudget(newestFirst(changedPosts).map((changed) => rewriteAttribution(db, changed)));
  if (rewrites.length > 0) {
    await db.batch(rewrites.flat());
  }
  return rewrites.length;
}

function postsWithChangedAttribution(posts: StoredPost[], catalog: Catalog): StoredPost[] {
  return posts.flatMap(({ post, attribution: stored }) => {
    const catalogued = attributePost(post, catalog);
    return sameAttribution(stored, catalogued) ? [] : [{ post, attribution: catalogued }];
  });
}

function newestFirst(posts: StoredPost[]): StoredPost[] {
  return posts.toSorted((a, b) => b.post.publishedAt.localeCompare(a.post.publishedAt));
}

function withinRewriteBudget(rewrites: D1PreparedStatement[][]): D1PreparedStatement[][] {
  const accepted: D1PreparedStatement[][] = [];
  let statementsUsed = 0;
  for (const statements of rewrites) {
    if (accepted.length > 0 && statementsUsed + statements.length > REWRITE_STATEMENTS_PER_RUN) {
      break;
    }
    accepted.push(statements);
    statementsUsed += statements.length;
  }
  return accepted;
}

async function storedPosts(db: D1Database): Promise<StoredPost[]> {
  const [posts, pelicans] = await db.batch([
    db.prepare("SELECT id, url, title, published_at, tags, kind FROM posts"),
    db.prepare("SELECT * FROM pelicans"),
  ]);
  const pelicansByPost = Map.groupBy((pelicans.results as PelicanRow[]).map(pelicanFromRow), (pelican) => pelican.postId);
  return (posts.results as PostRow[]).map((row) => ({
    post: postFromRow(row),
    attribution: { kind: row.kind, pelicans: pelicansByPost.get(row.id) ?? [] },
  }));
}

function sameAttribution(stored: Attribution, catalogued: Attribution): boolean {
  return stored.kind === catalogued.kind && canonicalPelicans(stored) === canonicalPelicans(catalogued);
}

function canonicalPelicans({ pelicans }: Attribution): string {
  return JSON.stringify(pelicans.toSorted((a, b) => a.id.localeCompare(b.id)));
}

function rewriteAttribution(db: D1Database, { post, attribution }: StoredPost): D1PreparedStatement[] {
  return [
    db.prepare("UPDATE posts SET kind = ? WHERE id = ?").bind(attribution.kind, post.id),
    db.prepare("DELETE FROM pelicans WHERE post_id = ?").bind(post.id),
    ...inChunksOf(rowsPerInsert(PELICAN_COLUMNS.length), attribution.pelicans).map((chunk) =>
      db.prepare(multiRowInsert("pelicans", PELICAN_COLUMNS, chunk.length)).bind(...chunk.flatMap(pelicanRow)),
    ),
  ];
}

function pelicanRow(pelican: Pelican): unknown[] {
  return [pelican.id, pelican.postId, pelican.modelName, pelican.modelSlug, pelican.vendor, pelican.postUrl, pelican.publishedAt];
}

function postFromRow(row: PostRow): Post {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    publishedAt: row.published_at,
    tags: JSON.parse(row.tags),
  };
}

function pelicanFromRow(row: PelicanRow): Pelican {
  return {
    id: row.id,
    postId: row.post_id,
    modelName: row.model_name,
    modelSlug: row.model_slug,
    vendor: row.vendor,
    postUrl: row.post_url,
    publishedAt: row.published_at,
  };
}
