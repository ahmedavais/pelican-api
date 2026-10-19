# Pelican API

An open, read-only hobby API of every "pelican riding a bicycle" Simon Willison posts, and which AI model drew it.

## Purpose

Anyone can use it, and it's linked from https://ahmedavais.com/p/pelican-api, where the scoreboard is embedded.
The definition of done is met, so most work now is cataloging new posts and keeping it running.
It freezes on 2026-11-30 (see SPEC.md's Decisions): don't plan work that outlives that date.
Feedback doesn't delay or skip any freeze step; only Ahmed decides whether to reopen.

- Metadata only. Never copy Simon's images, SVGs or post text; every record links back to his post.
- Read his feed at most once a day.
- Stay inside Cloudflare's free plan.

SPEC.md holds the design, the decisions with their reasons, and the catalog rules. Read it before changing
behavior, and don't re-decide a catalog rule without asking Ahmed.

## Stack

- Cloudflare Worker with Hono and `@hono/zod-openapi`, so `/openapi.json` and `/docs` come from the route definitions.
- D1 for storage, schema in `migrations/`.
- A daily cron at 06:17 UTC reads the Atom feed and re-applies the catalog.
- Workers static assets serve the scoreboard (`ui/index.html`) at `/`.
- Live at https://pelican-api.dynamicalchange.workers.dev.
- CI: `.github/workflows/ci.yml` runs `npm run verify` on every PR and every push to main. A push to main then applies pending D1 migrations, deploys, and applies the catalog to production, through the `production` environment.
- Duplication: the `duplication` job in `.github/workflows/ci.yml`, shared from
  [karkhana](https://github.com/ahmedavais/karkhana), fails when a change adds code duplicated elsewhere in the repo,
  tests included. `.jscpd.json` lists the lock and generated files it skips.
- Adversarial review: `.github/workflows/adversarial-review.yml` has Claude Code review every PR with the shared
  workflow and brief from [karkhana](https://github.com/ahmedavais/karkhana). Comments only. The reviewer takes
  this repo's checks and conventions from this file, so keep them current here.
- Watch production: `.github/workflows/watch-production.yml`, with steps shared from
  [karkhana](https://github.com/ahmedavais/karkhana), runs the live checks in `sensors/live/` after every deploy, daily
  at 07:23 UTC and on demand. A failed run is the alarm (GitHub emails it), including when a new post needs cataloging.

## Commands

- `npm run verify`: typecheck, American English check, tests. Run before calling any change done.
- `npm test`: vitest in the Workers runtime against a local D1, emptied before each test.
- `npm run typecheck`: the Worker and the scripts.
- `npm run test:mutation`: Stryker, about three minutes. Run after changing logic in `src/`, not on every commit.
- `npm run dev`: local Worker at http://localhost:8787. Needs `npx wrangler d1 migrations apply pelican-api --local`
  and `npm run backfill:local` once.
- `npm run catalog:local` / `npm run catalog:remote`: apply the whole catalog to the stored posts. CI runs the remote one after every deploy.
- `npm run watch-production`: live checks against production (`API_URL` overrides it): the scoreboard, docs and API answer,
  the daily refresh succeeded within 26 hours, and no post is unclassified.
- `npm run ingest:status`: the latest seven daily runs, read with a read-only token from the macOS Keychain.

## Layout

- `src/index.ts`: the Worker's two entry points, requests and the daily cron.
- `src/app.ts` and `src/routes/`: the API. `src/pages.ts`, `src/cursor.ts` and `src/newest-first-query.ts` page through results.
- `src/ingest.ts`, `src/feed.ts`, `src/post-store.ts`, `src/catalog-sync.ts`: the daily refresh, from feed to stored posts to catalog applied.
- `src/pelican-catalog.ts`: the hand-kept catalog, keyed by post URL. The only source of model attribution.
- `src/domain.ts`: post kinds and the `VENDORS` list.
- `scripts/backfill.ts`: one-time load from Simon's Datasette mirror into SQL for `wrangler d1 execute`.
- `scripts/catalog.ts`: turns the stored posts into SQL that applies the catalog, for `wrangler d1 execute`.
- `ui/index.html`: the scoreboard, one static file reading the live API.
- `sensors/live/`: checks against the live API, run by `npm run watch-production`, never by `npm test`.
- `test/`: one test file per module or route group. `test/fixtures/` holds a saved feed and mirror rows; never fetch live data in tests.

## Conventions

- Ask Ahmed before every commit and push. Pushing or merging to main deploys, so it is the deploy approval.
- Never print or commit tokens or the Cloudflare account ID. Both live in the macOS Keychain.
- Keep rate-limit enforcement details out of public text.
- Each run stays under the free plan's 50 D1 queries and 10 ms CPU; see SPEC.md's Decisions before adding queries to the cron.
- Tests are sociable and state-based against a real local D1. No mocks.
- `/openapi.json` is snapshot-tested. Review the diff before accepting it with `npx vitest run -u`.
- After changing the scoreboard, look at it in the browser at desktop and 375px widths.
- Write in American English: catalog, behavior, color. `npm run check:american-english` (part of verify) names the US spelling for each British one it knows.
- `playground/` is for throwaway experiments and is gitignored.
