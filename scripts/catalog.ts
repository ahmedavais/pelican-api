import { readFileSync, writeFileSync } from "node:fs";
import { catalogSql } from "../src/backfill-sql";
import { pelicanCatalog } from "../src/pelican-catalog";
import { type PostRow, postFromRow } from "../src/stored-rows";

type WranglerQueryOutput = [{ results: PostRow[] }];

const [storedPostsPath, outputPath] = process.argv.slice(2);
if (!storedPostsPath || !outputPath) {
  throw new Error("Usage: tsx scripts/catalog.ts <stored-posts.json> <output.sql>");
}

const [{ results }] = JSON.parse(readFileSync(storedPostsPath, "utf8")) as WranglerQueryOutput;
writeFileSync(outputPath, catalogSql(results.map(postFromRow), pelicanCatalog));
console.log(`Cataloged ${results.length} stored posts into ${outputPath}`);
