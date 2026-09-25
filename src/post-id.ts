const MONTH_NUMBERS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

const DATED_POST_PATH = /^\/(\d{4})\/([A-Z][a-z]{2})\/(\d{1,2})\/([a-z0-9-]+)\/?$/;

export function postIdFromUrl(url: string): string {
  const match = new URL(url).pathname.match(DATED_POST_PATH);
  const month = match && MONTH_NUMBERS[match[2]];
  if (!match || !month) {
    throw new Error(`Not a dated post URL: ${url}`);
  }
  const [, year, , day, slug] = match;
  return `${year}-${month}-${day.padStart(2, "0")}-${slug}`;
}
