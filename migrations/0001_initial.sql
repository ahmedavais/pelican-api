CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  published_at TEXT NOT NULL,
  tags TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('model_pelicans', 'sighting', 'other', 'unclassified')),
  ingested_at TEXT NOT NULL
);

CREATE INDEX posts_by_newest ON posts (published_at DESC, id DESC);

CREATE TABLE pelicans (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  model_slug TEXT NOT NULL,
  vendor TEXT,
  post_url TEXT NOT NULL,
  published_at TEXT NOT NULL
);

CREATE INDEX pelicans_by_newest ON pelicans (published_at DESC, id DESC);
CREATE INDEX pelicans_by_post ON pelicans (post_id);
CREATE INDEX pelicans_by_model ON pelicans (model_slug);
CREATE INDEX pelicans_by_vendor ON pelicans (vendor);

CREATE TABLE ingest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed')),
  posts_added INTEGER NOT NULL DEFAULT 0,
  entries_skipped INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
