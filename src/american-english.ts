import { americanSpellingByBritish } from "./american-spellings";

export type BritishSpelling = { line: number; british: string; american: string };

const WORD = /[A-Z]?[a-z]+/g;

export function britishSpellings(text: string): BritishSpelling[] {
  return text.split("\n").flatMap((lineText, index) => britishSpellingsOnLine(lineText, index + 1));
}

function britishSpellingsOnLine(lineText: string, line: number): BritishSpelling[] {
  return [...lineText.matchAll(WORD)].flatMap(([british]) => {
    const american = americanSpellingByBritish.get(british.toLowerCase());
    return american ? [{ line, british, american }] : [];
  });
}
