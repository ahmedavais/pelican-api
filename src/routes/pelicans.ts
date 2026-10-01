import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import { errorBody, errorResponse } from "../api-errors";
import { instantParameter } from "../instants";
import { NewestFirstQuery } from "../newest-first-query";
import { PageQuerySchema, pageFrom, pagePosition, pageSchema } from "../pages";

export const PelicanSchema = z
  .object({
    id: z.string().openapi({ example: "2026-09-22-opus-and-sol-and-luna-claude-opus-5-5" }),
    post_id: z.string().openapi({ example: "2026-09-22-opus-and-sol-and-luna" }),
    model_name: z.string().openapi({ example: "Claude Opus 5.5" }),
    model_slug: z.string().openapi({ example: "claude-opus-5-5" }),
    vendor: z.string().nullable().openapi({ example: "anthropic" }),
    post_url: z.string().url().openapi({ example: "https://simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/" }),
    published_at: z.string().openapi({ example: "2026-09-22T23:46:41.000Z" }),
  })
  .openapi("Pelican");

type PelicanRow = z.infer<typeof PelicanSchema>;

const PelicanFiltersSchema = PageQuerySchema.extend({
  model: z.string().optional().openapi({ description: "Model slug, as listed by /models", example: "claude-opus-5-5" }),
  vendor: z.string().optional().openapi({ description: "Vendor, as listed by /vendors", example: "anthropic" }),
  since: instantParameter("Only pelicans published at or after this date or time"),
  until: instantParameter("Only pelicans published before this date or time"),
});

// Stryker disable next-line ObjectLiteral: an empty route stops the app loading, which Stryker does not count as failing
const listPelicans = createRoute({
  method: "get",
  path: "/pelicans",
  summary: "List pelicans, newest first",
  request: { query: PelicanFiltersSchema },
  responses: {
    200: {
      description: "A page of pelicans",
      content: { "application/json": { schema: pageSchema(PelicanSchema, "PelicanPage") } },
    },
    400: errorResponse("Invalid filters or cursor"),
  },
});

const NO_PELICANS_YET = "There are no pelicans yet";

const onePelican = {
  description: "A pelican",
  content: { "application/json": { schema: PelicanSchema } },
};

// Stryker disable next-line ObjectLiteral: an empty route stops the app loading, which Stryker does not count as failing
const latestPelican = createRoute({
  method: "get",
  path: "/pelicans/latest",
  summary: "The most recent pelican",
  responses: { 200: onePelican, 404: errorResponse(NO_PELICANS_YET) },
});

// Stryker disable next-line ObjectLiteral: an empty route stops the app loading, which Stryker does not count as failing
const randomPelican = createRoute({
  method: "get",
  path: "/pelicans/random",
  summary: "One pelican, chosen at random",
  responses: { 200: onePelican, 404: errorResponse(NO_PELICANS_YET) },
});

// Stryker disable next-line ObjectLiteral: an empty route stops the app loading, which Stryker does not count as failing
const pelicanById = createRoute({
  method: "get",
  path: "/pelicans/{id}",
  summary: "A single pelican",
  request: {
    params: z.object({ id: z.string().openapi({ example: "2026-09-22-opus-and-sol-and-luna-claude-opus-5-5" }) }),
  },
  responses: { 200: onePelican, 404: errorResponse("No pelican has this id") },
});

export function registerPelicanRoutes(app: OpenAPIHono<{ Bindings: Env }>): void {
  app.openapi(listPelicans, async (c) => {
    const { limit, cursor, model, vendor, since, until } = c.req.valid("query");
    const { results } = await new NewestFirstQuery("pelicans")
      .where("model_slug = ?", model)
      .where("vendor = ?", vendor)
      .where("published_at >= ?", since)
      .where("published_at < ?", until)
      .after(pagePosition(cursor))
      .statement(c.env.DB, limit + 1)
      .all<PelicanRow>();
    return c.json(pageFrom(results, limit), 200);
  });

  app.openapi(latestPelican, async (c) => {
    const pelican = await c.env.DB.prepare("SELECT * FROM pelicans ORDER BY published_at DESC, id DESC LIMIT 1").first<PelicanRow>();
    return pelicanOrNotFound(c, pelican, NO_PELICANS_YET);
  });

  app.openapi(randomPelican, async (c) => {
    const pelican = await c.env.DB.prepare("SELECT * FROM pelicans ORDER BY RANDOM() LIMIT 1").first<PelicanRow>();
    return pelicanOrNotFound(c, pelican, NO_PELICANS_YET);
  });

  app.openapi(pelicanById, async (c) => {
    const { id } = c.req.valid("param");
    const pelican = await c.env.DB.prepare("SELECT * FROM pelicans WHERE id = ?").bind(id).first<PelicanRow>();
    return pelicanOrNotFound(c, pelican, `No pelican with id '${id}'`);
  });
}

function pelicanOrNotFound(c: Context, pelican: PelicanRow | null, notFoundMessage: string) {
  return pelican ? c.json(pelican, 200) : c.json(errorBody("not_found", notFoundMessage), 404);
}
