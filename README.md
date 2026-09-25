# Pelican API

An open but unlisted, read-only hobby API of every "pelican riding a bicycle" Simon Willison posts on [simonwillison.net](https://simonwillison.net/tags/pelican-riding-a-bicycle/), and which AI model drew it. Metadata only: every record links back to Simon's original post.

Live at https://pelican-api.dynamicalchange.workers.dev. Browse the endpoints at [/docs](https://pelican-api.dynamicalchange.workers.dev/docs). The full design and its decisions are in [SPEC.md](SPEC.md).

```
 daily cron ──► Atom feed ──► new posts stored (unclassified)
                                   │
 pelican-catalog.ts ──────────────►├──► kind + pelicans (curated, checked in)
                                   ▼
                    D1 ──► Hono routes ──► JSON + /openapi.json + /docs
```

## Develop

```bash
npm install
npm test
npm run typecheck
```

Run it locally with the daily refresh triggerable by hand:

```bash
npx wrangler d1 migrations apply pelican-api --local
npm run backfill:local
npm run dev
```

Then `curl "http://localhost:8787/__scheduled?cron=17+6+*+*+*"` runs the daily refresh once. It fetches Simon's live feed, so keep that to about once a day.

## See it in action

Open [ui/index.html](ui/index.html) straight from disk in a browser. It reads the live API: latest and random pelicans, vendors, pelicans per month, the model leaderboard and a filterable explorer. It is not deployed anywhere.

## Curate a new post

New posts arrive as `unclassified`. List them at `/posts?kind=unclassified`, then add an entry to [src/pelican-catalog.ts](src/pelican-catalog.ts) keyed by the post URL, following the catalog rules in [SPEC.md](SPEC.md). `npm test` checks spelling consistency, vendors and entry shape. The next daily run applies the change after deploy.

## Deploy

One-time setup, on your own Cloudflare account:

```bash
npx wrangler login
npx wrangler d1 create pelican-api
```

Put the returned `database_id` into [wrangler.jsonc](wrangler.jsonc), then:

```bash
npx wrangler d1 migrations apply pelican-api --remote
npm run backfill:remote
npx wrangler deploy
```

## Check the daily refresh

The definition of done asks for seven unattended days. This lists the latest runs:

```bash
npx wrangler d1 execute pelican-api --remote --command "SELECT started_at, status, posts_added, entries_skipped, error FROM ingest_runs ORDER BY started_at DESC LIMIT 7"
```

## Free plan limits it stays inside

- At most 50 D1 queries per invocation: multi-row inserts, and catalog rewrites capped at 36 statements per run, newest first. A large catalog change can also be applied at once with `npm run backfill:remote`.
- 10 ms CPU per invocation: post bodies are stripped from the feed before parsing.
- 60 requests per minute per IP via the Workers rate-limit binding (approximate, counted per Cloudflare location).
