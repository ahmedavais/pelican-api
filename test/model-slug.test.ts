import { describe, expect, it } from "vitest";
import { modelSlug } from "../src/model-slug";

describe("modelSlug", () => {
  it.each([
    ["Claude Opus 5.5", "claude-opus-5-5"],
    ["GPT-5 (high)", "gpt-5-high"],
    ["Qwen3.8-Flash-Next", "qwen3-8-flash-next"],
    ["DeepSeek V4 Pro 0813", "deepseek-v4-pro-0813"],
    ["deepseek-ai/DeepSeek-V4-Flash-0731", "deepseek-ai-deepseek-v4-flash-0731"],
  ])("normalizes %j to %j", (modelName, expected) => {
    expect(modelSlug(modelName)).toBe(expected);
  });

  it("collapses runs of separators and trims them from the ends", () => {
    expect(modelSlug("  Gemini 3.5  --  Flash!  ")).toBe("gemini-3-5-flash");
  });

  it("gives the same slug to names that differ only in case and spacing", () => {
    expect(modelSlug("GLM-5.2")).toBe(modelSlug("glm 5.2"));
  });

  it("rejects a name with no letters or digits", () => {
    expect(() => modelSlug(" () ")).toThrow("Model name has no letters or digits");
  });
});
