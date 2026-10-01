export type PagePosition = {
  publishedAt: string;
  id: string;
};

export function encodeCursor(position: PagePosition): string {
  return toBase64Url(JSON.stringify([position.publishedAt, position.id]));
}

export function decodeCursor(cursor: string): PagePosition | null {
  try {
    const decoded = JSON.parse(fromBase64Url(cursor));
    if (Array.isArray(decoded) && decoded.length === 2 && decoded.every((part) => typeof part === "string")) {
      return { publishedAt: decoded[0], id: decoded[1] };
    }
    return null;
  } catch {
    return null;
  }
}

function toBase64Url(text: string): string {
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(base64Url: string): string {
  return atob(base64Url.replaceAll("-", "+").replaceAll("_", "/"));
}
