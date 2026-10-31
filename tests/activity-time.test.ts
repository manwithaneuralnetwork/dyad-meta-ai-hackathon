import { describe, expect, it } from "vitest";
import { activityHasEnded, type ActivityRecord } from "@/lib/activity-data";

function activity(overrides: Partial<ActivityRecord>): ActivityRecord {
  return {
    id: "activity-1",
    source_type: "official",
    source_name: "Test",
    external_id: null,
    source_url: null,
    title: "Test activity",
    description: "",
    image_url: null,
    venue_name: "",
    address: "",
    city: "San Diego, CA",
    starts_at: "2026-10-31T01:30:00.000Z",
    ends_at: null,
    price_label: "",
    topics: [],
    status: "published",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    dedupe_key: "test-activity",
    ...overrides,
  };
}

describe("activityHasEnded", () => {
  it("uses the explicit end time when one exists", () => {
    const item = activity({ ends_at: "2026-10-31T04:00:00.000Z" });
    expect(activityHasEnded(item, Date.parse("2026-10-31T03:00:00.000Z"))).toBe(false);
    expect(activityHasEnded(item, Date.parse("2026-10-31T05:00:00.000Z"))).toBe(true);
  });

  it("falls back to the start time when no end time is provided", () => {
    const item = activity({ starts_at: "2026-10-31T01:30:00.000Z", ends_at: null });
    expect(activityHasEnded(item, Date.parse("2026-10-31T02:00:00.000Z"))).toBe(true);
  });
});
