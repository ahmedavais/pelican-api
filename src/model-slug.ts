const RUNS_OF_NON_ALPHANUMERICS = /[^a-z0-9]+/g;
const SEPARATORS_AT_ENDS = /^-+|-+$/g;

export function modelSlug(modelName: string): string {
  const slug = modelName.toLowerCase().replace(RUNS_OF_NON_ALPHANUMERICS, "-").replace(SEPARATORS_AT_ENDS, "");
  if (!slug) {
    throw new Error(`Model name has no letters or digits: ${JSON.stringify(modelName)}`);
  }
  return slug;
}
