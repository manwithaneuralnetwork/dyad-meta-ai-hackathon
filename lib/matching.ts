import { ACTIVITY_CATEGORIES, type Activity, type ActivityCategory, type FeedCandidate, type InterestProfile, type OnboardingAnswers, type PriceBand, type Vibe } from "@/lib/types";

const priceRank: Record<PriceBand, number> = { free: 0, budget: 1, moderate: 2, flexible: 3 };

export function buildLocalInterestProfile(answers: OnboardingAnswers): InterestProfile {
  const categoryWeights = Object.fromEntries(ACTIVITY_CATEGORIES.map((category) => [category, answers.interests.includes(category) ? 1 : 0.08])) as Record<ActivityCategory, number>;
  const lower = answers.freeText.toLowerCase();
  const keywordMap: Array<[ActivityCategory, string[]]> = [
    ["live-music", ["music", "concert", "jazz", "band"]],
    ["arts-culture", ["art", "museum", "gallery", "theater"]],
    ["outdoors", ["hike", "beach", "outside", "nature"]],
    ["food-drink", ["food", "coffee", "restaurant", "taco"]],
    ["thrifting", ["thrift", "vintage", "market"]],
    ["games", ["game", "trivia", "board"]]
  ];
  for (const [category, words] of keywordMap) {
    if (words.some((word) => lower.includes(word))) categoryWeights[category] = Math.max(categoryWeights[category], 0.85);
  }

  const vibes: Vibe[] = answers.socialEnergy === "low" ? ["relaxed", "creative"] : answers.socialEnergy === "high" ? ["energetic", "social"] : ["social", "creative"];
  const group = answers.groupSize === "duo" ? { min: 2, max: 2 } : answers.groupSize === "small" ? { min: 3, max: 6 } : { min: 5, max: 10 };
  const settings = answers.setting === "either" ? (["indoor", "outdoor"] as const) : ([answers.setting] as const);

  return {
    categoryWeights,
    vibes,
    settings: [...settings],
    preferredGroupSize: group,
    noiseTolerance: answers.noiseTolerance,
    priceBand: answers.priceBand,
    availability: Object.fromEntries(answers.availability.map((key) => [key, true])),
    travelRadiusMiles: answers.travelRadiusMiles,
    explorationWeight: answers.explorationWeight,
    accessibilityRequirements: answers.accessibilityRequirements,
    summary: `You gravitate toward ${answers.interests.slice(0, 3).map(formatCategory).join(", ")}, prefer ${answers.socialEnergy}-energy plans, and are comfortable traveling about ${answers.travelRadiusMiles} miles.`
  };
}

export function rankActivities(profile: InterestProfile, activities: Activity[]): FeedCandidate[] {
  const ranked = activities
    .filter((activity) => activity.state === "published")
    .filter((activity) => activity.distanceMiles <= profile.travelRadiusMiles)
    .filter((activity) => profile.priceBand === "flexible" || priceRank[activity.priceBand] <= priceRank[profile.priceBand])
    .map((activity) => scoreActivity(profile, activity))
    .sort((a, b) => b.score - a.score);

  const diverse: FeedCandidate[] = [];
  const categoryCounts = new Map<ActivityCategory, number>();
  for (const candidate of ranked) {
    const primary = candidate.activity.semantic.categories[0]?.category;
    if (primary && (categoryCounts.get(primary) ?? 0) >= 2 && diverse.length < 6) continue;
    diverse.push(candidate);
    if (primary) categoryCounts.set(primary, (categoryCounts.get(primary) ?? 0) + 1);
  }
  return diverse;
}

export function scoreActivity(profile: InterestProfile, activity: Activity): FeedCandidate {
  const semantic = activity.semantic;
  const categoryScore = semantic.categories.reduce((sum, item) => sum + (profile.categoryWeights[item.category] ?? 0) * item.weight, 0) / Math.max(1, semantic.categories.reduce((sum, item) => sum + item.weight, 0));
  const vibeOverlap = semantic.vibes.filter((vibe) => profile.vibes.includes(vibe)).length / Math.max(1, semantic.vibes.length);
  const interestScore = Math.min(1, categoryScore * 0.75 + vibeOverlap * 0.25);
  const distanceScore = Math.max(0, 1 - activity.distanceMiles / Math.max(1, profile.travelRadiusMiles));
  const priceScore = profile.priceBand === "flexible" ? 1 : Math.max(0, 1 - Math.abs(priceRank[profile.priceBand] - priceRank[activity.priceBand]) / 3);
  const scheduleScore = 0.82;
  const explorationScore = (1 - categoryScore) * profile.explorationWeight;
  const score = Math.round((interestScore * 0.55 + scheduleScore * 0.15 + distanceScore * 0.15 + priceScore * 0.1 + explorationScore * 0.05) * 100);

  const primary = semantic.categories[0]?.category;
  const reasons = [
    primary && (profile.categoryWeights[primary] ?? 0) >= 0.7 ? `Matches your interest in ${formatCategory(primary)}` : null,
    semantic.vibes.find((vibe) => profile.vibes.includes(vibe)) ? `${capitalize(semantic.vibes.find((vibe) => profile.vibes.includes(vibe))!)} atmosphere` : null,
    `${activity.distanceMiles.toFixed(1)} miles away`,
    activity.priceBand === "free" ? "Free to join" : null
  ].filter(Boolean) as string[];

  return { activity, score, reasons: reasons.slice(0, 3), matchLabel: score >= 80 ? "Great fit" : score >= 65 ? "Good fit" : "Worth a look" };
}

export function formatCategory(value: string) {
  return value.split("-").map(capitalize).join(" ");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
