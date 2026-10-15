export type BritishSpelling = { line: number; british: string; american: string };

const AMERICAN_BY_BRITISH = new Map([
  ["catalogue", "catalog"],
  ["catalogues", "catalogs"],
  ["catalogued", "cataloged"],
  ["cataloguing", "cataloging"],
  ["uncatalogued", "uncataloged"],
  ["behaviour", "behavior"],
  ["behaviours", "behaviors"],
  ["colour", "color"],
  ["colours", "colors"],
  ["coloured", "colored"],
]);

const WORD = /[A-Z]?[a-z]+/g;

export function britishSpellings(text: string): BritishSpelling[] {
  return text.split("\n").flatMap((lineText, index) => britishSpellingsOnLine(lineText, index + 1));
}

function britishSpellingsOnLine(lineText: string, line: number): BritishSpelling[] {
  return [...lineText.matchAll(WORD)].flatMap(([british]) => {
    const american = AMERICAN_BY_BRITISH.get(british.toLowerCase());
    return american ? [{ line, british, american }] : [];
  });
}
