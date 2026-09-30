import type { Catalog } from "./domain";
import { modelSlug } from "./model-slug";

export function nearDuplicateModelNames(catalog: Catalog): string[][] {
  const spellingsByCompactSlug = new Map<string, Set<string>>();
  for (const modelName of catalogedModelNames(catalog)) {
    const compactSlug = modelSlug(modelName).replaceAll("-", "");
    const spellings = spellingsByCompactSlug.get(compactSlug) ?? new Set<string>();
    spellings.add(modelName);
    spellingsByCompactSlug.set(compactSlug, spellings);
  }
  return [...spellingsByCompactSlug.values()]
    .filter((spellings) => spellings.size > 1)
    .map((spellings) => [...spellings].sort());
}

function catalogedModelNames(catalog: Catalog): string[] {
  return Object.values(catalog).flatMap((entry) =>
    // Stryker disable next-line ArrayDeclaration: a stand-in name repeats identically, so it is never a near-duplicate
    entry.kind === "model_pelicans" ? entry.pelicans.map((pelican) => pelican.modelName) : [],
  );
}
