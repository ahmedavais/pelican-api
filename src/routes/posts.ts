import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { errorResponse } from "../api-errors";
import { NewestFirstQuery } from "../newest-first-query";
import { PageQuerySchema, pageFrom, pagePosition, pageSchema } from "../pages";

const POST_KINDS = ["model_pelicans", "sighting", "other", "unclassified"] as const;

const PostSchema = z
  .object({
    id: z.string().openapi({ example: "2026-09-22-opus-and-sol-and-luna" }),
    url: z.string().url().openapi({ example: "https://simonwillison.net/2026/Sep/22/opus-and-sol-and-luna/" }),
    title: z.string().openapi({ example: "Claude Opus 5.5, GPT-6 Sol, GPT-6 Luna, and a new price war" }),
    published_at: z.string().openapi({ example: "2026-09-22T23:46:41.000Z" }),
    tags: z.array(z.string()).openapi({ example: ["ai", "anthropic", "pelican-riding-a-bicycle"] }),
    kind: z.enum(POST_KINDS).openapi({
      description:
        "model_pelicans: contains model-drawn pelicans. sighting: a pelican seen elsewhere. other: related but no model pelicans. unclassified: not yet catalogued.",
    }),
    ingested_at: z.string().openapi({ example: "2026-09-25T06:17:00.000Z" }),
  })
  .openapi("Post");

type StoredPostRow = Omit<z.infer<typeof PostSchema>, "tags"> & { tags: string };

// Stryker disable next-line ObjectLiteral: an empty route stops the app loading, which Stryker does not count as failing
const listPosts = createRoute({
  method: "get",
  path: "/posts",
  summary: "List tagged posts, newest first",
  request: {
    query: PageQuerySchema.extend({
      kind: z.enum(POST_KINDS).optional().openapi({ description: "Only posts of this kind" }),
    }),
  },
  responses: {
    200: { description: "A page of posts", content: { "application/json": { schema: pageSchema(PostSchema, "PostPage") } } },
    400: errorResponse("Invalid filters or cursor"),
  },
});

export function registerPostRoutes(app: OpenAPIHono<{ Bindings: Env }>): void {
  app.openapi(listPosts, async (c) => {
    const { limit, cursor, kind } = c.req.valid("query");
    const { results } = await new NewestFirstQuery("posts")
      .where("kind = ?", kind)
      .after(pagePosition(cursor))
      .statement(c.env.DB, limit + 1)
      .all<StoredPostRow>();
    const page = pageFrom(results, limit);
    return c.json({ ...page, data: page.data.map(postFromRow) }, 200);
  });
}

function postFromRow(row: StoredPostRow): z.infer<typeof PostSchema> {
  return { ...row, tags: JSON.parse(row.tags) as string[] };
}
