import type { Attribution, CatalogedModel, Catalog, Pelican, Post } from "./domain";
import { modelSlug } from "./model-slug";

export function attributePost(post: Post, catalog: Catalog): Attribution {
  const entry = catalog[post.url];
  if (!entry) {
    return { kind: "unclassified", pelicans: [] };
  }
  if (entry.kind !== "model_pelicans") {
    return { kind: entry.kind, pelicans: [] };
  }
  return { kind: "model_pelicans", pelicans: pelicansOf(post, entry.pelicans) };
}

function pelicansOf(post: Post, models: CatalogedModel[]): Pelican[] {
  const appearancesBySlug = new Map<string, number>();
  return models.map(({ modelName, vendor }) => {
    const slug = modelSlug(modelName);
    const appearance = (appearancesBySlug.get(slug) ?? 0) + 1;
    appearancesBySlug.set(slug, appearance);
    return {
      id: pelicanId(post.id, slug, appearance),
      postId: post.id,
      modelName,
      modelSlug: slug,
      vendor,
      postUrl: post.url,
      publishedAt: post.publishedAt,
    };
  });
}

function pelicanId(postId: string, slug: string, appearance: number): string {
  const base = `${postId}-${slug}`;
  return appearance === 1 ? base : `${base}-${appearance}`;
}
