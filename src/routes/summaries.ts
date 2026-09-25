import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

const ModelSchema = z
  .object({
    model_slug: z.string().openapi({ example: "claude-opus-5-5" }),
    model_name: z.string().openapi({ example: "Claude Opus 5.5" }),
    vendor: z.string().nullable().openapi({ example: "anthropic" }),
    pelican_count: z.number().int().openapi({ example: 1 }),
    first_seen_at: z.string().openapi({ example: "2026-09-22T23:46:41.000Z" }),
    last_seen_at: z.string().openapi({ example: "2026-09-22T23:46:41.000Z" }),
  })
  .openapi("Model");

const VendorSchema = z
  .object({
    vendor: z.string().nullable().openapi({ example: "anthropic", description: "null for pelicans whose vendor is unknown" }),
    pelican_count: z.number().int().openapi({ example: 12 }),
  })
  .openapi("Vendor");

const StatsSchema = z
  .object({
    pelican_count: z.number().int(),
    model_count: z.number().int(),
    vendor_count: z.number().int(),
    post_count: z.number().int(),
    posts_by_kind: z.object({
      model_pelicans: z.number().int(),
      sighting: z.number().int(),
      other: z.number().int(),
      unclassified: z.number().int(),
    }),
    pelicans_per_month: z.array(
      z.object({ month: z.string().openapi({ example: "2026-09" }), pelican_count: z.number().int() }),
    ),
    last_ingest_at: z.string().nullable().openapi({ description: "When the last successful daily refresh finished" }),
  })
  .openapi("Stats");

function completeList<Item extends z.ZodType>(item: Item, name: string) {
  return z
    .object({ data: z.array(item), next_cursor: z.null().openapi({ description: "Always null; this list fits one page" }) })
    .openapi(name);
}

const listModels = createRoute({
  method: "get",
  path: "/models",
  summary: "Every model with its pelican count and first and last appearance, most recent first",
  responses: {
    200: { description: "All models", content: { "application/json": { schema: completeList(ModelSchema, "ModelList") } } },
  },
});

const listVendors = createRoute({
  method: "get",
  path: "/vendors",
  summary: "Every vendor with its pelican count, largest first",
  responses: {
    200: { description: "All vendors", content: { "application/json": { schema: completeList(VendorSchema, "VendorList") } } },
  },
});

const stats = createRoute({
  method: "get",
  path: "/stats",
  summary: "Totals, pelicans per month, and the last successful ingest",
  responses: { 200: { description: "Statistics", content: { "application/json": { schema: StatsSchema } } } },
});

const MODELS_QUERY = `
  SELECT model_slug, MIN(model_name) AS model_name, MIN(vendor) AS vendor, COUNT(*) AS pelican_count,
         MIN(published_at) AS first_seen_at, MAX(published_at) AS last_seen_at
  FROM pelicans
  GROUP BY model_slug
  ORDER BY last_seen_at DESC, model_slug
`;

const VENDORS_QUERY = `
  SELECT vendor, COUNT(*) AS pelican_count
  FROM pelicans
  GROUP BY vendor
  ORDER BY pelican_count DESC, vendor IS NULL, vendor
`;

export function registerSummaryRoutes(app: OpenAPIHono<{ Bindings: Env }>): void {
  app.openapi(listModels, async (c) => {
    const { results } = await c.env.DB.prepare(MODELS_QUERY).all<z.infer<typeof ModelSchema>>();
    return c.json({ data: results, next_cursor: null }, 200);
  });

  app.openapi(listVendors, async (c) => {
    const { results } = await c.env.DB.prepare(VENDORS_QUERY).all<z.infer<typeof VendorSchema>>();
    return c.json({ data: results, next_cursor: null }, 200);
  });

  app.openapi(stats, async (c) => c.json(await currentStats(c.env.DB), 200));
}

async function currentStats(db: D1Database): Promise<z.infer<typeof StatsSchema>> {
  const [totals, kinds, months, lastRun] = await db.batch([
    db.prepare(
      "SELECT COUNT(*) AS pelican_count, COUNT(DISTINCT model_slug) AS model_count, COUNT(DISTINCT vendor) AS vendor_count FROM pelicans",
    ),
    db.prepare("SELECT kind, COUNT(*) AS post_count FROM posts GROUP BY kind"),
    db.prepare(
      "SELECT substr(published_at, 1, 7) AS month, COUNT(*) AS pelican_count FROM pelicans GROUP BY month ORDER BY month",
    ),
    db.prepare("SELECT MAX(finished_at) AS last_ingest_at FROM ingest_runs WHERE status = 'succeeded'"),
  ]);
  const { pelican_count, model_count, vendor_count } = totals.results[0] as {
    pelican_count: number;
    model_count: number;
    vendor_count: number;
  };
  const postsByKind = { model_pelicans: 0, sighting: 0, other: 0, unclassified: 0 };
  for (const { kind, post_count } of kinds.results as { kind: keyof typeof postsByKind; post_count: number }[]) {
    postsByKind[kind] = post_count;
  }
  return {
    pelican_count,
    model_count,
    vendor_count,
    post_count: Object.values(postsByKind).reduce((sum, count) => sum + count, 0),
    posts_by_kind: postsByKind,
    pelicans_per_month: months.results as { month: string; pelican_count: number }[],
    last_ingest_at: (lastRun.results[0] as { last_ingest_at: string | null }).last_ingest_at,
  };
}
