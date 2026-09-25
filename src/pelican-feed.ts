export const PELICAN_FEED_URL = "https://simonwillison.net/tags/pelican-riding-a-bicycle.atom";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function fetchPelicanFeed(fetcher: Fetcher, contactEmail: string): Promise<string> {
  const response = await fetcher(PELICAN_FEED_URL, {
    headers: { "User-Agent": `pelican-api/1.0 (daily metadata refresh; contact ${contactEmail})` },
  });
  if (!response.ok) {
    throw new Error(`Feed responded ${response.status}`);
  }
  return response.text();
}
