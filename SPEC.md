# Pelican API — Build Spec

A small, read-only hobby API that tracks every "pelican riding a bicycle" that Simon Willison posts on his blog, including which AI model drew it. Built and deployed with Claude Code.

## Goal

Ship a working API that is open but unlisted: anyone with the URL can use it, and it is not announced or shared. Success means it's live on a public URL, has browsable docs, and picks up new posts daily without anyone touching it. Model attribution for new posts comes from a curated catalog (see Decisions).

## Source data

Primary source: the `pelican-riding-a-bicycle` tag on simonwillison.net (`https://simonwillison.net/tags/pelican-riding-a-bicycle/`), currently ~144 posts.

- Backfill: Simon's Datasette mirror of the blog (`datasette.simonwillison.net/simonwillisonblog`), one SQL query for every tagged entry, blogmark, beat, note and quotation. Verified 2026-09-25: 144 posts, and for all 30 posts it shares with the feed, identical URL, title, timestamp and tags.
- Daily refresh: the tag's Atom feed, `/tags/pelican-riding-a-bicycle.atom` (latest 30 entries, verified 2026-09-25).

Do not use the `simonw/pelican-bicycle` GitHub repo. It stopped updating in late 2024 and has no stated license.

### Content and licensing rules

- Store metadata only: title, date, URL, tags, and the curated model names.
- Do not rehost, proxy, or hotlink Simon's images, SVGs, or post text. Every record links back to the original post.
- Fetch at most once per day, with a descriptive `User-Agent` that includes a contact email.

## Data model

A post and a pelican are different things. One post can contain several pelicans (for example, a single post reviewing two new models on the same day). Some tagged posts contain zero model-generated pelicans (for example, a pelican spotted in a film or a keynote).

### posts

- `id` (text): `{yyyy}-{mm}-{dd}-{slug}` from the post URL, e.g. `2026-09-02-llm-gemini`. The bare slug is not unique: `llm-gemini` appears on two dates.
- `url` (text): canonical post URL, unique
- `title` (text)
- `published_at` (datetime, UTC)
- `tags` (text[]): all tags on the post
- `kind` (enum): `model_pelicans`, `sighting`, `other`, `unclassified`
- `ingested_at` (datetime)

### pelicans

- `id` (text): `{post_id}-{model_slug}`, with `-2`, `-3` appended for true duplicates within one post, in order of appearance
- `post_id` (text): FK → posts
- `model_name` (text): canonical name from the catalog, spelled consistently across posts, e.g. "Claude Opus 5.5" or "GPT-6 Sol"
- `model_slug` (text): normalized, e.g. `claude-opus-5-5`
- `vendor` (text, nullable): the company that made the model, from a fixed list, e.g. `anthropic`, `openai`, `google`
- `post_url` (text): copied from the post, for convenience
- `published_at` (datetime): copied from the post

### ingest_runs

- `id`, `started_at`, `finished_at`, `status` (`succeeded` or `failed`), `posts_added`, `entries_skipped`, `error`

## Endpoints

All endpoints are `GET`, return JSON, and need no auth.

- `/pelicans`: paginated list, newest first. Filters: `model`, `vendor`, `since`, `until`, `limit` (default 20, max 100), `cursor`.
- `/pelicans/latest`: the most recent pelican.
- `/pelicans/random`: one random pelican.
- `/pelicans/{id}`: a single pelican.
- `/models`: each model with its pelican count and first and last appearance dates.
- `/vendors`: each vendor with its pelican count.
- `/posts`: paginated posts, with a `kind` filter. Includes sightings and unclassified posts.
- `/stats`: totals, pelicans per month, and last successful ingest time.
- `/openapi.json`: generated OpenAPI spec.
- `/docs`: browsable docs page generated from the spec.

List responses use this shape: `{ "data": [...], "next_cursor": "..." | null }`
Error responses use this shape: `{ "error": { "code": "...", "message": "..." } }`

## Ingestion

```
 backfill (once, local script) ──► Datasette mirror ──┐
                                                      ├──► store post (idempotent on URL)
 daily cron (Worker)           ──► Atom feed        ──┘              │
                                                                     ▼
                                          pelican catalog applied (checked-in file)
                                            entry exists ──► kind + pelicans
                                            no entry     ──► kind = unclassified
```

- Backfill (one-time). `npm run backfill:remote` queries the mirror once, generates SQL that stores every post and applies the full catalog, and runs it with `wrangler d1 execute`. Safe to re-run.
- Daily refresh. A scheduled Worker reads the feed once a day and stores any post URLs not already stored.
- Pelican catalog. `pelican-catalog.ts` is a checked-in file keyed by post URL, giving each post's `kind` and its pelicans (`model_name`, `vendor`). Every run re-applies the whole catalog to stored posts, idempotently. It is the only source of model attribution.
- Uncatalogued posts stay `kind = unclassified` and are visible in `/posts?kind=unclassified` until a catalog entry is added.
- Each run's outcome is recorded in `ingest_runs`, which feeds `last_ingest_at` in `/stats`.

## Stack

- Cloudflare Workers + Hono (TypeScript), free plan
- Cloudflare D1 for storage, with schema managed by migrations
- Cron Trigger for the daily refresh
- `@hono/zod-openapi` so the spec and docs are generated from route definitions
- Rate limiting: 60 requests per minute per IP, via the Workers rate-limit binding (per-location, approximate)
- CORS open (`*`), since the API is open and read-only
- No Claude API, no secrets

## Testing

- Unit tests for URL-to-post-id conversion and model-name normalization.
- Catalog tests against saved sample posts: one with a single pelican, one with multiple pelicans, one sighting with no model, and one uncatalogued post.
- An end-to-end smoke test that runs locally with `wrangler dev` before any deploy.

## Non-goals (v1)

No write endpoints, no user accounts, no API keys, no image hosting, no frontend beyond the docs page and a local `ui/index.html` client (opened from disk, not deployed), no other data sources, and no AI extraction.

## Decisions

- Backfill reads Simon's Datasette mirror instead of the HTML tag pages: one request, exact timestamps matching the feed, and no scraping of several markup layouts. The daily refresh reads the Atom feed, which holds only the latest 30 entries.
- Each daily run stays within the free plan's 50 D1 queries per invocation: multi-row inserts, and at most 36 catalog rewrite statements per run, newest first; the rest is applied on later runs. Large catalog changes can instead be applied by re-running the backfill.
- Post bodies are stripped from the feed before parsing, to stay well inside the free plan's 10 ms CPU limit.
- Model attribution comes from a curated, checked-in catalog instead of the Claude API, to keep the project free. The trade-off: new posts appear automatically but stay `unclassified` until catalogued.
- No retries or attempt counters, since there is no extraction step that can fail.
- Pelican IDs are `{post_id}-{model_slug}`. True duplicates get `-2`, `-3` as a safety net.
- Post IDs include the date, because slugs repeat across dates.
- `model_name` is the catalog's canonical spelling, not the post's wording, because Simon spells the same family differently across posts ("Qwen3.8" vs "Qwen 3.8"). Normalization stays a plain lowercase-and-hyphenate step; a catalog test guards against near-duplicate spellings.
- Rate limiting uses the Workers rate-limit binding; approximate counts are acceptable. Live check on 2026-09-25: `limit()` returned success for 80 of 80 requests from one IP (77 in one location), so the binding did not enforce on this free-plan account. Retest after the first cron run; if still permissive, choose between a Durable Object limiter and documenting the limit as unenforced.
- Deploying is gated on Ahmed's approval. Ahmed owns `wrangler login`. Live at https://pelican-api.dynamicalchange.workers.dev since 2026-09-25, daily cron at 06:17 UTC.
- The API stays open but unlisted rather than behind Cloudflare Access or an API key. On the free plan the worst case of someone finding it is a day of quota errors, never a bill, and the data is public-derived metadata.
- The 7-day check is a `wrangler d1 execute` query on `ingest_runs`, documented in the README. No extra endpoint.

## Catalog rules

- A pelican counts when the post shows it, or when Simon generated it himself and links to it. Pelicans only mentioned, or drawn by someone else and linked, do not count.
- A pelican belongs to the post where it first appeared. An older model's pelican shown again (re-embedded, linked back, in a recap talk or a reused comparison grid) does not count; a pelican freshly generated for the post does, even for a model seen before.
- One pelican per model per post. Effort levels and comparison-grid cells are not separate pelicans or separate model names; genuinely distinct models (GPT-6 Sol vs GPT-6 Luna) are.
- `model_pelicans`: at least one pelican made by an identifiable AI model, in any medium and whoever ran it. `sighting`: a pelican on a bicycle made by people or found in the world. `other`: about the benchmark, with no identifiable model pelican. A `model_pelicans` entry always lists at least one pelican.
- Each distinct dated or versioned release is its own model (Claude 3.5 Sonnet (2024-06-20) vs (2024-10-22), a preview vs its GA release). Only spelling differences are merged, using the vendor's official name as Simon writes it. Suspected aliases stay separate unless the post says they are the same.
- Vendor is the company that released the model, never the host; fine-tunes get their maker's name. One lowercase slug from the `VENDORS` list in `src/domain.ts` (24 as of the backfill), extended only by editing that list. `null` when the maker is not an organisation or is unknown.
- Drafting: four agents draft entries with evidence quotes (kept in `playground/`, never committed), Claude reconciles one canonical spelling per model, Ahmed spot-checks.

## Definition of done

- [x] Deployed to a public URL: https://pelican-api.dynamicalchange.workers.dev
- [x] `/docs` loads and documents every endpoint
- [x] Backfill completed, with every post either catalogued or visibly `unclassified` (catalog covers all 144 posts as of 2026-09-25)
- [ ] Daily refresh has run successfully on its own for 7 days
- Private hobby project; not announced. Tell Simon later only if it becomes public.

## Open decisions (Ahmed's)

- Whether to later add a "pelican of the day" endpoint
