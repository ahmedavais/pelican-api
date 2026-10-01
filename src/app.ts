import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { errorBody } from "./api-errors";
import { InvalidCursorError } from "./pages";
import { limitRequestsPerIp } from "./rate-limit";
import { registerPelicanRoutes } from "./routes/pelicans";
import { registerPostRoutes } from "./routes/posts";
import { registerSummaryRoutes } from "./routes/summaries";

// Stryker disable next-line BlockStatement: an empty app stops the API test files loading, which Stryker does not count as failing
export function createApp(): OpenAPIHono<{ Bindings: Env }> {
  const app = new OpenAPIHono<{ Bindings: Env }>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(errorBody("invalid_request", result.error.issues.map(describeIssue).join("; ")), 400);
      }
    },
  });

  app.use("*", cors({ origin: "*", allowMethods: ["GET"] }));
  app.use("*", limitRequestsPerIp());

  registerPelicanRoutes(app);
  registerPostRoutes(app);
  registerSummaryRoutes(app);

  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Pelican API",
      version: "1.0.0",
      description:
        "Every pelican riding a bicycle that Simon Willison has posted on simonwillison.net, and which AI model drew it. Metadata only: every record links back to the original post.",
    },
  });
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  app.notFound((c) => c.json(errorBody("not_found", `No endpoint at ${c.req.path}`), 404));
  app.onError((error, c) => {
    if (error instanceof InvalidCursorError) {
      return c.json(errorBody("invalid_cursor", error.message), 400);
    }
    console.error(error);
    return c.json(errorBody("internal_error", "Something went wrong"), 500);
  });

  return app;
}

function describeIssue(issue: { path: PropertyKey[]; message: string }): string {
  // Stryker disable next-line StringLiteral: no query field is nested, so paths have one segment
  return `${issue.path.join(".")}: ${issue.message}`;
}
