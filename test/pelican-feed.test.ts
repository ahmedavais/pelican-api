import { describe, expect, it } from "vitest";
import { fetchPelicanFeed, PELICAN_FEED_URL } from "../src/pelican-feed";

function recordingFetcher(response: Response) {
  const requests: Request[] = [];
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return response;
  };
  return { fetcher, requests };
}

describe("fetchPelicanFeed", () => {
  it("fetches the tag feed with a User-Agent that names the project and a contact", async () => {
    const { fetcher, requests } = recordingFetcher(new Response("<feed/>"));

    const feed = await fetchPelicanFeed(fetcher, "pelicans@example.com");

    expect(feed).toBe("<feed/>");
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(PELICAN_FEED_URL);
    expect(requests[0].headers.get("User-Agent")).toBe(
      "pelican-api/1.0 (daily metadata refresh; contact pelicans@example.com)",
    );
  });

  it("fails with the status when the feed does not answer 200", async () => {
    const { fetcher } = recordingFetcher(new Response("busy", { status: 503 }));

    await expect(fetchPelicanFeed(fetcher, "pelicans@example.com")).rejects.toThrow("Feed responded 503");
  });
});
