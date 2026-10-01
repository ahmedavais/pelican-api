export const MONTH_ABBREVIATIONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DATED_POST_PATH = /^\/(\d{4})\/([A-Z][a-z]{2})\/(\d{1,2})\/([a-z0-9-]+)\/?$/;

export function postIdFromUrl(url: string): string {
  const match = new URL(url).pathname.match(DATED_POST_PATH);
  const month = match && monthNumber(match[2]);
  if (!match || !month) {
    throw new Error(`Not a dated post URL: ${url}`);
  }
  const [, year, , day, slug] = match;
  return `${year}-${month}-${day.padStart(2, "0")}-${slug}`;
}

function monthNumber(abbreviation: string): string | undefined {
  const monthIndex = MONTH_ABBREVIATIONS.indexOf(abbreviation);
  return monthIndex === -1 ? undefined : String(monthIndex + 1).padStart(2, "0");
}
