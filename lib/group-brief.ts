import { z } from "zod";

export const groupBriefSchema = z.object({
  title: z.string().min(8).max(80),
  arrival: z.string().min(12).max(220),
  opener: z.string().min(12).max(220),
  checkIn: z.string().min(12).max(220),
});

export type GroupBrief = z.infer<typeof groupBriefSchema>;

export type GroupBriefActivity = {
  title: string;
  description: string;
  venue: string;
  address: string;
  startsAt: string;
  endsAt: string | null;
  topics: string[];
};

export function buildFallbackGroupBrief(activity: GroupBriefActivity): GroupBrief {
  const meetingPlace = activity.venue || activity.address || "the venue";
  return {
    title: "Make the first hello easy",
    arrival: `Use ${meetingPlace} as the meeting point and confirm the exact spot in chat before everyone heads out.`,
    opener: `Easy opener: “What made you pick ${activity.title}?”`,
    checkIn: "Share arrival times before the activity and make sure everyone knows how to find the group.",
  };
}
