// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  // API tests reach src/ through the worker entry (exports.default), not imports,
  // so the import graph cannot tell which test files cover a mutant.
  vitest: { configFile: "vitest.config.ts", related: false },
  // The catalog is curated data, not logic; mutating it only produces noise.
  mutate: ["src/**/*.ts", "!src/pelican-catalog.ts"],
  ignorePatterns: [".wrangler", ".vitest", "reports", "ui", "playground"],
  coverageAnalysis: "perTest",
  reporters: ["html", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  tempDirName: ".stryker-tmp",
  // Stryker rewrites tsconfig paths in its sandbox through the TypeScript JS
  // API, which TypeScript 7 no longer ships. Our tsconfig has no extends or
  // references to rewrite, so point at a missing file to skip that step.
  tsconfigFile: "no-tsconfig-rewrite.json",
  thresholds: { high: 80, low: 60, break: null },
};
