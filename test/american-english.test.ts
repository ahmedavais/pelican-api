import { describe, expect, it } from "vitest";
import { britishSpellings } from "../src/american-english";

describe("britishSpellings", () => {
  it("finds nothing in American English", () => {
    expect(britishSpellings("cataloged posts change color and behavior")).toEqual([]);
  });

  it("names the American spelling for each British one, with its line", () => {
    expect(britishSpellings("first line\nwaiting to be catalogued\nits colour and behaviour")).toEqual([
      { line: 2, british: "catalogued", american: "cataloged" },
      { line: 3, british: "colour", american: "color" },
      { line: 3, british: "behaviour", american: "behavior" },
    ]);
  });

  it("finds British spellings whatever their case", () => {
    expect(britishSpellings("The Catalogue")).toEqual([{ line: 1, british: "Catalogue", american: "catalog" }]);
  });

  it("finds British spellings inside hyphenated ids", () => {
    expect(britishSpellings('"2026-09-05-not-yet-catalogued"')).toEqual([
      { line: 1, british: "catalogued", american: "cataloged" },
    ]);
  });

  it("finds British spellings with a negating prefix", () => {
    expect(britishSpellings("an uncatalogued post")).toEqual([
      { line: 1, british: "uncatalogued", american: "uncataloged" },
    ]);
  });

  it("finds British spellings inside camelCase names", () => {
    expect(britishSpellings("const cataloguedPosts = barColour")).toEqual([
      { line: 1, british: "catalogued", american: "cataloged" },
      { line: 1, british: "Colour", american: "color" },
    ]);
  });

  it("leaves longer words that only start like a British spelling", () => {
    expect(britishSpellings("colourful catalogueish")).toEqual([]);
  });

  it("leaves ordinary code words alone", () => {
    expect(britishSpellings("this.constructor.toString()")).toEqual([]);
  });
});
