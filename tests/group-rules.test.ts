import { describe, expect, it } from "vitest";
import { toggleInviteSelection, validInviteSelection } from "@/lib/group-rules";

describe("group invitation rules", () => {
  it("requires one to ten unique invitees", () => {
    expect(validInviteSelection([])).toBe(false);
    expect(validInviteSelection(["a"])).toBe(true);
    expect(validInviteSelection(["a", "a"])).toBe(false);
    expect(validInviteSelection(Array.from({ length: 11 }, (_, index) => String(index)))).toBe(false);
  });

  it("adds, removes, and caps selections at ten", () => {
    expect(toggleInviteSelection(["a"], "a")).toEqual([]);
    expect(toggleInviteSelection(["a"], "b")).toEqual(["a", "b"]);
    const full = Array.from({ length: 10 }, (_, index) => String(index));
    expect(toggleInviteSelection(full, "extra")).toEqual(full);
  });
});
