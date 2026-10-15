import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { britishSpellings } from "../src/american-english";

const ALLOWED_BRITISH = [
  "package-lock.json",
  "worker-configuration.d.ts",
  "test/fixtures/",
  "src/american-english.ts",
  "test/american-english.test.ts",
];

function ourTrackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .filter((path) => path !== "" && !ALLOWED_BRITISH.some((allowed) => path.startsWith(allowed)));
}

const problems = ourTrackedFiles().flatMap((path) =>
  britishSpellings(readFileSync(path, "utf8")).map(
    ({ line, british, american }) => `${path}:${line}: write "${american}", not "${british}"`,
  ),
);

if (problems.length > 0) {
  console.error(`Write in American English (AGENTS.md):\n${problems.join("\n")}`);
  process.exit(1);
}
