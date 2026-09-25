# Pelican API — Build Spec

A small, public, read-only API that tracks every "pelican riding a bicycle" that Simon Willison posts on his blog, including which AI model drew it. Built and deployed with Claude Code.

## Goal

Ship a working public API. Success means it's live on a public URL, has browsable docs, and picks up new posts daily without anyone touching it. Model attribution for new posts comes from a curated catalog (see Decisions).

## Source data

Primary source: the `pelican-riding-a-bicycle` tag on simonwillison.net (`https://simonwillison.net/tags/pelican-riding-a-bicycle/`), currently ~144 posts.

- Backfill: paginated HTML tag pages (the whole history).
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
- `model_name` (text): canonical name from the catalog, spelled consistently across posts, variant included, e.g. "Claude Opus 5.5" or "GPT-5 (high)"
- `model_slug` (text): normalized, e.g. `claude-opus-5-5`
- `vendor` (text, nullable): e.g. `anthropic`, `openai`, `google`
- `post_url` (text): copied from the post, for convenience
- `published_at` (datetime): copied from the post

### ingest_runs

- `id`, `started_at`, `finished_at`, `status`, `posts_added`, `error`

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
 backfill (once, local script) ──► HTML tag pages ──┐
                                                    ├──► store post (idempotent on URL)
 daily cron (Worker)           ──► Atom feed      ──┘         │
                                                               ▼
                                       pelican catalog applied (checked-in file)
                                         entry exists ──► kind + pelicans
                                         no entry     ──► kind = unclassified
```

- Backfill (one-time). Crawl the whole tag history and store every post.
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
- CORS open (`*`), since the API is public and read-only
- No Claude API, no secrets

## Testing

- Unit tests for URL-to-post-id conversion and model-name normalization.
- Catalog tests against saved sample posts: one with a single pelican, one with multiple pelicans, one sighting with no model, and one uncatalogued post.
- An end-to-end smoke test that runs locally with `wrangler dev` before any deploy.

## Non-goals (v1)

No write endpoints, no user accounts, no API keys, no image hosting, no frontend beyond the docs page, no other data sources, and no AI extraction.

## Decisions

- Backfill reads the HTML tag pages; the daily refresh reads the Atom feed. The feed holds only the latest 30 entries.
- Model attribution comes from a curated, checked-in catalog instead of the Claude API, to keep the project free. The trade-off: new posts appear automatically but stay `unclassified` until catalogued.
- No retries or attempt counters, since there is no extraction step that can fail.
- Pelican IDs are `{post_id}-{model_slug}`; variants stay in `model_name`, so "GPT-5 (high)" and "GPT-5 (low)" are separate models. True duplicates get `-2`, `-3`.
- Post IDs include the date, because slugs repeat across dates.
- `model_name` is the catalog's canonical spelling, not the post's wording, because Simon spells the same family differently across posts ("Qwen3.8" vs "Qwen 3.8"). Normalization stays a plain lowercase-and-hyphenate step; a catalog test guards against near-duplicate spellings.
- Rate limiting uses the Workers rate-limit binding; approximate counts are acceptable.
- Deploying is gated on Ahmed's approval. Ahmed owns `wrangler login`.
- The 7-day check is a `wrangler d1 execute` query on `ingest_runs`, documented in the README. No extra endpoint.

## Definition of done

- [ ] Deployed to a public URL
- [ ] `/docs` loads and documents every endpoint
- [ ] Backfill completed, with every post either catalogued or visibly `unclassified`
- [ ] Daily refresh has run successfully on its own for 7 days
- [ ] Told Simon about it

## Open decisions (Ahmed's)

- API name and domain (a `workers.dev` subdomain is fine for v1)
- Whether to later add a "pelican of the day" endpoint
