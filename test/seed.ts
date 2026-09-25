import { env } from "cloudflare:workers";
import { applyCatalog } from "../src/catalog-sync";
import type { Catalog, CatalogEntry, CatalogedModel, Post } from "../src/domain";
import { postIdFromUrl } from "../src/post-id";
import { storeNewPosts } from "../src/post-store";

export type SeedPost = {
  url: string;
  publishedAt: string;
  models?: CatalogedModel[];
  kind?: "sighting" | "other" | "unclassified";
};

export async function seed(...seedPosts: SeedPost[]): Promise<void> {
  const posts: Post[] = seedPosts.map(({ url, publishedAt }) => ({
    id: postIdFromUrl(url),
    url,
    title: `Post at ${url}`,
    publishedAt,
    tags: ["pelican-riding-a-bicycle"],
  }));
  const catalog: Catalog = Object.fromEntries(
    seedPosts.flatMap((seedPost): [string, CatalogEntry][] => {
      if (seedPost.models) {
        return [[seedPost.url, { kind: "model_pelicans", pelicans: seedPost.models }]];
      }
      return seedPost.kind && seedPost.kind !== "unclassified" ? [[seedPost.url, { kind: seedPost.kind }]] : [];
    }),
  );
  await storeNewPosts(env.DB, posts, "2026-09-25T06:17:00.000Z");
  while ((await applyCatalog(env.DB, catalog)) > 0) {}
}

export function postOn(isoDate: string, slug: string): Pick<SeedPost, "url" | "publishedAt"> {
  const date = new Date(isoDate);
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return {
    url: `https://simonwillison.net/${date.getUTCFullYear()}/${month}/${date.getUTCDate()}/${slug}/`,
    publishedAt: date.toISOString(),
  };
}
