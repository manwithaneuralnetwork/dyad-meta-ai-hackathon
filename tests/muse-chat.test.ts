import { describe, expect, it } from "vitest";
import { containsMuseMention } from "@/lib/muse-chat";

describe("containsMuseMention", () => {
  it("recognizes a standalone Muse mention", () => {
    expect(containsMuseMention("@muse where should we meet?")).toBe(true);
    expect(containsMuseMention("Could you help, @Muse?")).toBe(true);
  });

  it("does not trigger on similar words", () => {
    expect(containsMuseMention("I love museums")).toBe(false);
    expect(containsMuseMention("email@muse.example")).toBe(false);
  });
});
