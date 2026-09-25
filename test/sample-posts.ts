import type { Catalog, CatalogedModel, Post } from "../src/domain";
import { postIdFromUrl } from "../src/post-id";

export function samplePosts(count: number): Post[] {
  return Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const url = `https://simonwillison.net/2026/Aug/${day}/sample-post/`;
    return {
      id: postIdFromUrl(url),
      url,
      title: `Sample post ${day}`,
      publishedAt: new Date(Date.UTC(2026, 7, day)).toISOString(),
      tags: ["pelican-riding-a-bicycle"],
    };
  });
}

export function sampleModels(count: number): CatalogedModel[] {
  return Array.from({ length: count }, (_, index) => ({ modelName: `Sample Model ${index + 1}`, vendor: null }));
}

export function catalogGiving(posts: Post[], modelsPerPost: number): Catalog {
  return Object.fromEntries(
    posts.map((post) => [post.url, { kind: "model_pelicans", pelicans: sampleModels(modelsPerPost) }]),
  );
}
