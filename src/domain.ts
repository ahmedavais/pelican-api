export type PostKind = "model_pelicans" | "sighting" | "other" | "unclassified";

export type Post = {
  id: string;
  url: string;
  title: string;
  publishedAt: string;
  tags: string[];
};

export type Pelican = {
  id: string;
  postId: string;
  modelName: string;
  modelSlug: string;
  vendor: string | null;
  postUrl: string;
  publishedAt: string;
};

export type CatalogedModel = {
  modelName: string;
  vendor: string | null;
};

export type CatalogEntry =
  | { kind: "model_pelicans"; pelicans: CatalogedModel[] }
  | { kind: "sighting" | "other" };

export type Catalog = Record<string, CatalogEntry>;

export type Attribution = {
  kind: PostKind;
  pelicans: Pelican[];
};
