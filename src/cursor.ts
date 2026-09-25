export type PagePosition = {
  publishedAt: string;
  id: string;
};

export function encodeCursor(position: PagePosition): string {
  return btoa(JSON.stringify([position.publishedAt, position.id]))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function decodeCursor(cursor: string): PagePosition | null {
  try {
    const decoded = JSON.parse(atob(cursor.replaceAll("-", "+").replaceAll("_", "/")));
    if (Array.isArray(decoded) && decoded.length === 2 && decoded.every((part) => typeof part === "string")) {
      return { publishedAt: decoded[0], id: decoded[1] };
    }
    return null;
  } catch {
    return null;
  }
}
