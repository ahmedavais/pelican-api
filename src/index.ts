import { createApp } from "./app";
import { runIngest } from "./ingest";
import { pelicanCatalog } from "./pelican-catalog";
import { fetchPelicanFeed } from "./pelican-feed";

const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(_controller, env) {
    await runIngest(env.DB, {
      latestFeed: () => fetchPelicanFeed(fetch, env.CONTACT_EMAIL),
      catalog: pelicanCatalog,
      now: () => new Date(),
    });
  },
} satisfies ExportedHandler<Env>;
