import { describe, expect, it } from "vitest";
import { nearDuplicateModelNames } from "../src/catalog-spelling";
import type { Catalog } from "../src/domain";
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
});
