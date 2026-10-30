import type { Activity } from "@/lib/types";

export const CORE_INTEREST_TAGS = [
  "Live music",
  "Coffee",
  "City walks",
  "Museums",
  "Trying new food",
  "Creative workshops",
  "Outdoor movies",
  "Book clubs",
  "Casual sports",
  "Volunteering",
  "Photography",
  "Game nights",
  "Nightlife",
  "Comedy",
  "Theatre",
  "Movies",
  "Art & galleries",
  "Fitness",
  "Outdoors",
  "Hiking",
  "Food & drink",
  "Markets",
  "Learning",
  "Community",
  "Dancing",
  "Wellness",
  "Technology",
  "Family activities",
  "Festivals",
  "Networking",
] as const;

const coreTagByLower = new Map(CORE_INTEREST_TAGS.map((tag) => [tag.toLowerCase(), tag]));

export function sanitizeInterestTag(value: string): string | null {
  const cleaned = value.replace(/\s+/g, " ").trim().replace(/^[#.,;:!\-–—]+|[#.,;:!\-–—]+$/g, "");
  if (!cleaned || cleaned.length > 60) return null;
  const core = coreTagByLower.get(cleaned.toLowerCase());
  if (core) return core;
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

export function normalizeInterestTags(values: readonly string[], fallbackText = ""): string[] {
  const unique = new Map<string, string>();
  for (const value of values) {
    const tag = sanitizeInterestTag(value);
    if (tag) unique.set(tag.toLowerCase(), tag);
  }
  if (!unique.size && fallbackText) {
    for (const tag of heuristicInterestTags(fallbackText)) unique.set(tag.toLowerCase(), tag);
  }
  return [...unique.values()].slice(0, 6);
}

export function heuristicInterestTags(input: Pick<Activity, "title" | "description" | "venue"> | string): string[] {
  const text = typeof input === "string"
    ? input.toLowerCase()
    : `${input.title} ${input.description} ${input.venue}`.toLowerCase();
  const tags: string[] = [];
  const add = (...items: string[]) => items.forEach((item) => { if (!tags.includes(item)) tags.push(item); });

  if (/concert|music|band|orchestra|singer|jazz|rock|hip-hop|rap|dj\b/.test(text)) add("Live music");
  if (/comedy|comedian|stand-up/.test(text)) add("Comedy", "Nightlife");
  if (/theatre|theater|musical|ballet|opera|stage/.test(text)) add("Theatre");
  if (/movie|film|cinema|screening/.test(text)) add(/outdoor|park|rooftop/.test(text) ? "Outdoor movies" : "Movies");
  if (/museum|gallery|exhibition|art\b/.test(text)) add("Art & galleries", "Museums");
  if (/workshop|class|learn|lecture|seminar/.test(text)) add("Learning");
  if (/paint|pottery|ceramic|woodwork|craft|maker/.test(text)) add("Creative workshops");
  if (/baseball|football|soccer|basketball|hockey|tennis|volleyball|sport|game\b/.test(text)) add("Casual sports");
  if (/run|fitness|workout|yoga|pilates|cycling/.test(text)) add("Fitness", "Wellness");
  if (/hike|trail|hiking/.test(text)) add("Hiking", "Outdoors");
  if (/outdoor|park|garden|nature|beach/.test(text)) add("Outdoors");
  if (/food|tasting|dinner|brunch|restaurant|culinary|beer|wine|cocktail/.test(text)) add("Food & drink", "Trying new food");
  if (/coffee|café|cafe/.test(text)) add("Coffee");
  if (/market|bazaar|swap meet/.test(text)) add("Markets");
  if (/dance|dancing|salsa|ballroom/.test(text)) add("Dancing");
  if (/festival|fair|celebration/.test(text)) add("Festivals");
  if (/tech|software|developer|robot|science/.test(text)) add("Technology");
  if (/network|mixer|professional|founder|business/.test(text)) add("Networking");
  if (/volunteer|cleanup|charity|nonprofit/.test(text)) add("Volunteering", "Community");
  if (/family|kids|children|all ages/.test(text)) add("Family activities");
  if (/night|evening|after hours/.test(text)) add("Nightlife");
  if (!tags.length) add("Community");
  return tags.slice(0, 6);
}

function compactKeyPart(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
}

function canonicalVenue(value: string) {
  return value
    .replace(/\s*(?:-|–|—)?\s*(?:san diego|sd)$/i, "")
    .replace(/\s+tavern$/i, "")
    .trim();
}

export function buildActivityDedupeKey(activity: Pick<Activity, "startsAt" | "venue" | "address" | "neighborhood">) {
  const minute = new Date(activity.startsAt).toISOString().slice(0, 16).replace(/\D/g, "");
  return `${minute}|${compactKeyPart(canonicalVenue(activity.venue))}|${compactKeyPart(activity.address ?? "")}|${compactKeyPart(activity.neighborhood)}`;
}

function duplicateQualityScore(activity: Pick<Activity, "title" | "description">) {
  const nonEvent = /(add.?on|not an event ticket|parking|vip.*upgrade)/i.test(activity.title);
  const informativeType = /\b(concert|show|performance|game|festival|tour|workshop|class|party|event)\b/i.test(activity.title);
  return (nonEvent ? -10_000 : 0) + (informativeType ? 100 : 0) + Math.min(activity.title.length, 140) + Math.min(activity.description.length, 500) / 20;
}

export function preferDuplicateCandidate<T extends Pick<Activity, "title" | "description">>(current: T, candidate: T): T {
  return duplicateQualityScore(candidate) > duplicateQualityScore(current) ? candidate : current;
}

