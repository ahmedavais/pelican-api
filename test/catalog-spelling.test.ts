import { describe, expect, it } from "vitest";
import { nearDuplicateModelNames } from "../src/catalog-spelling";
import { type Catalog, VENDORS } from "../src/domain";
import { postIdFromUrl } from "../src/post-id";
import { pelicanCatalog } from "../src/pelican-catalog";

function catalogWithModels(...modelNames: string[]): Catalog {
  return Object.fromEntries(
    modelNames.map((modelName, index) => [
      `https://simonwillison.net/2026/Sep/${index + 1}/post/`,
      { kind: "model_pelicans", pelicans: [{ modelName, vendor: null }] },
    ]),
  );
}

describe("nearDuplicateModelNames", () => {
  it("finds names that differ only by where separators fall", () => {
    expect(nearDuplicateModelNames(catalogWithModels("Qwen3.8 Flash", "Qwen 3.8 Flash"))).toEqual([
      ["Qwen 3.8 Flash", "Qwen3.8 Flash"],
    ]);
  });

  it("finds names that differ only by case", () => {
    expect(nearDuplicateModelNames(catalogWithModels("GLM-5.2", "glm-5.2"))).toEqual([["GLM-5.2", "glm-5.2"]]);
  });

  it("accepts the same name spelled identically in several posts", () => {
    expect(nearDuplicateModelNames(catalogWithModels("GPT-6 Sol", "GPT-6 Sol"))).toEqual([]);
  });

  it("accepts genuinely different models", () => {
    expect(nearDuplicateModelNames(catalogWithModels("GPT-6 Sol", "GPT-6 Luna"))).toEqual([]);
  });
});

describe("the pelican catalog", () => {
  it("spells every model one way only", () => {
    expect(nearDuplicateModelNames(pelicanCatalog)).toEqual([]);
  });

  it("lists at least one pelican for every model_pelicans post", () => {
    const emptyEntries = Object.entries(pelicanCatalog).filter(
      ([, entry]) => entry.kind === "model_pelicans" && entry.pelicans.length === 0,
    );

    expect(emptyEntries.map(([url]) => url)).toEqual([]);
  });

  it("names only known vendors", () => {
    const vendors = Object.values(pelicanCatalog).flatMap((entry) =>
      entry.kind === "model_pelicans" ? entry.pelicans.map((pelican) => pelican.vendor) : [],
    );

    expect(vendors.filter((vendor) => vendor !== null && !VENDORS.includes(vendor))).toEqual([]);
  });

  it("only catalogues dated post urls", () => {
    expect(() => Object.keys(pelicanCatalog).forEach(postIdFromUrl)).not.toThrow();
  });
});
