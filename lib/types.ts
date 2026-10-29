export const ACTIVITY_CATEGORIES = [
  "live-music",
  "sports",
  "arts-culture",
  "food-drink",
  "outdoors",
  "learning",
  "games",
  "volunteering",
  "nightlife",
  "wellness",
  "thrifting",
  "community"
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export type Vibe = "relaxed" | "energetic" | "creative" | "competitive" | "social";
export type Setting = "indoor" | "outdoor" | "seated" | "active";
export type PriceBand = "free" | "budget" | "moderate" | "flexible";
export type AvailabilityKey = "weekday-morning" | "weekday-evening" | "weekend-morning" | "weekend-afternoon" | "weekend-evening";

export type WeeklyAvailability = Partial<Record<AvailabilityKey, boolean>>;

export type InterestProfile = {
  categoryWeights: Record<ActivityCategory, number>;
  vibes: Vibe[];
  settings: Setting[];
  preferredGroupSize: { min: number; max: number };
  noiseTolerance: "low" | "medium" | "high";
  priceBand: PriceBand;
  availability: WeeklyAvailability;
  travelRadiusMiles: number;
  explorationWeight: number;
  accessibilityRequirements: string[];
  summary: string;
};

export type OnboardingAnswers = {
  interests: ActivityCategory[];
  freeText: string;
  availability: AvailabilityKey[];
  neighborhood: string;
  travelRadiusMiles: number;
  priceBand: PriceBand;
  groupSize: "duo" | "small" | "medium";
  socialEnergy: "low" | "medium" | "high";
  noiseTolerance: "low" | "medium" | "high";
  setting: "indoor" | "outdoor" | "either";
  accessibilityRequirements: string[];
  explorationWeight: number;
};

export type WeightedCategory = { category: ActivityCategory; weight: number };

export type EventSemanticProfile = {
  categories: WeightedCategory[];
  vibes: Vibe[];
  socialModes: Array<"watching" | "participating" | "learning" | "exploring">;
  energy: "low" | "medium" | "high";
  likelyNoise: "low" | "medium" | "high" | "unknown";
  setting: "indoor" | "outdoor" | "mixed" | "unknown";
  interactionPotential: "low" | "medium" | "high";
  conciseSummary: string;
  suggestedGroupSize: { min: number; max: number };
  confidence: number;
};

export type Activity = {
  id: string;
  sourceType: "official" | "community";
  sourceName: "Ticketmaster" | "Community";
  sourceUrl?: string;
  externalId?: string;
  title: string;
  description: string;
  imageUrl: string;
  venue: string;
  neighborhood: string;
  distanceMiles: number;
  startsAt: string;
  priceBand: PriceBand;
  priceLabel: string;
  state: "published" | "completed" | "cancelled" | "expired";
  semantic: EventSemanticProfile;
  capacity: number;
};

export type Profile = {
  id: string;
  name: string;
  initials: string;
  color: string;
  neighborhood: string;
  bio: string;
  interests: ActivityCategory[];
  availability: AvailabilityKey[];
  groupSize: { min: number; max: number };
};

export type ActivityInterest = {
  activityId: string;
  userId: string;
  interested: boolean;
  discoverable: boolean;
};

export type Group = {
  id: string;
  activityId: string;
  name: string;
  memberIds: string[];
  pendingIds: string[];
  meetingPoint: string;
  brief?: string;
};

export type Message = {
  id: string;
  groupId: string;
  userId: string;
  body: string;
  createdAt: string;
};

export type FeedCandidate = {
  activity: Activity;
  score: number;
  reasons: string[];
  matchLabel: string;
};

export type AppState = {
  activeUserId: string;
  onboardingComplete: boolean;
  answers?: OnboardingAnswers;
  interestProfile?: InterestProfile;
  interests: ActivityInterest[];
  groups: Group[];
  messages: Message[];
  reconnectVotes: Record<string, string[]>;
};
