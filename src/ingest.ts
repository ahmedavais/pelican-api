import { applyCatalog } from "./catalog-sync";
import type { Catalog } from "./domain";
import { readFeed } from "./feed";
import { storeNewPosts } from "./post-store";

export type IngestSources = {
  latestFeed: () => Promise<string>;
  catalog: Catalog;
  now: () => Date;
};

type IngestOutcome =
  | { status: "succeeded"; postsAdded: number; entriesSkipped: number }
  | { status: "failed"; error: string };

export async function runIngest(db: D1Database, sources: IngestSources): Promise<void> {
  const startedAt = sources.now().toISOString();
  const outcome = await ingest(db, sources, startedAt);
  await recordRun(db, startedAt, sources.now().toISOString(), outcome);
}

async function ingest(db: D1Database, sources: IngestSources, ingestedAt: string): Promise<IngestOutcome> {
  try {
    const { posts, skippedEntries } = readFeed(await sources.latestFeed());
    const postsAdded = await storeNewPosts(db, posts, ingestedAt);
    await applyCatalog(db, sources.catalog);
    return { status: "succeeded", postsAdded, entriesSkipped: skippedEntries };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}

async function recordRun(db: D1Database, startedAt: string, finishedAt: string, outcome: IngestOutcome): Promise<void> {
  const { postsAdded, entriesSkipped, error } =
    outcome.status === "succeeded"
      ? { ...outcome, error: null }
      : { postsAdded: 0, entriesSkipped: 0, error: outcome.error };
  await db
    .prepare(
      "INSERT INTO ingest_runs (started_at, finished_at, status, posts_added, entries_skipped, error) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(startedAt, finishedAt, outcome.status, postsAdded, entriesSkipped, error)
    .run();
}
