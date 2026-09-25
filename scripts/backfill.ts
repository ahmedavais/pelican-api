import { readFileSync, writeFileSync } from "node:fs";
import { backfillSql } from "../src/backfill-sql";
import { type MirrorRow, postsFromMirrorRows } from "../src/mirror";
import { pelicanCatalog } from "../src/pelican-catalog";

const MIRROR_QUERY_URL = "https://datasette.simonwillison.net/simonwillisonblog/-/query.json";
const USER_AGENT = "pelican-api/1.0 (one-time backfill; contact dynamicalchange@gmail.com)";

async function fetchMirrorRows(): Promise<MirrorRow[]> {
  const query = new URLSearchParams({
    sql: readFileSync(new URL("./pelican-posts.sql", import.meta.url), "utf8"),
    _shape: "array",
  });
  const response = await fetch(`${MIRROR_QUERY_URL}?${query}`, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Mirror responded ${response.status}`);
  }
  return (await response.json()) as MirrorRow[];
}

const outputPath = process.argv[2];
if (!outputPath) {
  throw new Error("Usage: tsx scripts/backfill.ts <output.sql>");
}

const posts = postsFromMirrorRows(await fetchMirrorRows());
writeFileSync(outputPath, backfillSql(posts, pelicanCatalog, new Date().toISOString()));
console.log(`Wrote ${posts.length} posts to ${outputPath}`);
