import type { Activity, AppState, Profile } from "@/lib/types";

function futureIso(days: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export const DEMO_PROFILES: Profile[] = [
  {
    id: "demo-you",
    name: "Alex Morgan",
    initials: "AM",
    color: "#0d8b73",
    neighborhood: "North Park",
    bio: "New-ish to San Diego. Always up for live music, galleries, or a good market.",
    interests: ["live-music", "arts-culture", "food-drink", "thrifting", "community"],
    availability: ["weekday-evening", "weekend-afternoon", "weekend-evening"],
    groupSize: { min: 3, max: 6 }
  },
  {
    id: "demo-maya",
    name: "Maya Chen",
    initials: "MC",
    color: "#ef765f",
    neighborhood: "University Heights",
    bio: "Ceramics beginner, concert regular, and defender of low-pressure plans.",
    interests: ["live-music", "arts-culture", "learning", "food-drink"],
    availability: ["weekday-evening", "weekend-afternoon"],
    groupSize: { min: 3, max: 6 }
  },
  {
    id: "demo-diego",
    name: "Diego Ruiz",
    initials: "DR",
    color: "#6657a8",
    neighborhood: "South Park",
    bio: "Weekend hiker, amateur photographer, and occasional trivia ringer.",
    interests: ["outdoors", "games", "arts-culture", "community"],
    availability: ["weekday-evening", "weekend-morning", "weekend-afternoon"],
    groupSize: { min: 2, max: 6 }
  },
  {
    id: "demo-priya",
    name: "Priya Shah",
    initials: "PS",
    color: "#cf8a24",
    neighborhood: "Hillcrest",
    bio: "I will try any class once. Especially if snacks are involved.",
    interests: ["learning", "food-drink", "wellness", "volunteering", "live-music"],
    availability: ["weekday-evening", "weekend-afternoon", "weekend-evening"],
    groupSize: { min: 3, max: 8 }
  }
];

export const DEMO_ACTIVITIES: Activity[] = [
  {
    id: "jazz-waterfront",
    sourceType: "official",
    sourceName: "Ticketmaster",
    externalId: "tm-demo-001",
    sourceUrl: "https://www.ticketmaster.com/",
    title: "Jazz by the Bay",
    description: "An open-air evening of modern jazz with harbor views and plenty of room to settle in with a small group.",
    imageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?auto=format&fit=crop&w=1200&q=85",
    venue: "The Rady Shell at Jacobs Park",
    neighborhood: "Marina",
    distanceMiles: 3.8,
    startsAt: futureIso(3, 19),
    priceBand: "moderate",
    priceLabel: "$28–$46",
    state: "published",
    capacity: 6,
    semantic: {
      categories: [{ category: "live-music", weight: 1 }, { category: "arts-culture", weight: 0.45 }],
      vibes: ["relaxed", "creative", "social"],
      socialModes: ["watching"], energy: "medium", likelyNoise: "medium", setting: "outdoor", interactionPotential: "medium",
      conciseSummary: "A relaxed waterfront concert that gives a new group an easy shared focus.", suggestedGroupSize: { min: 3, max: 6 }, confidence: 0.96
    }
  },
  {
    id: "museum-after-dark",
    sourceType: "official",
    sourceName: "Ticketmaster",
    externalId: "tm-demo-002",
    sourceUrl: "https://www.ticketmaster.com/",
    title: "Museum After Dark",
    description: "Late-night gallery access, pop-up artist talks, and a courtyard DJ set in Balboa Park.",
    imageUrl: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=85",
    venue: "San Diego Museum of Art",
    neighborhood: "Balboa Park",
    distanceMiles: 1.9,
    startsAt: futureIso(5, 18),
    priceBand: "budget",
    priceLabel: "$18",
    state: "published",
    capacity: 6,
    semantic: {
      categories: [{ category: "arts-culture", weight: 1 }, { category: "nightlife", weight: 0.35 }, { category: "learning", weight: 0.3 }],
      vibes: ["creative", "social", "relaxed"], socialModes: ["exploring", "learning"], energy: "medium", likelyNoise: "medium", setting: "indoor", interactionPotential: "high",
      conciseSummary: "A roam-at-your-own-pace art night with natural conversation starters.", suggestedGroupSize: { min: 3, max: 6 }, confidence: 0.93
    }
  },
  {
    id: "north-park-market",
    sourceType: "community",
    sourceName: "Community",
    title: "North Park vintage market loop",
    description: "Meet for coffee, browse the vintage market together, and vote on the best under-$20 find.",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85",
    venue: "North Park Mini Park",
    neighborhood: "North Park",
    distanceMiles: 0.6,
    startsAt: futureIso(4, 11),
    priceBand: "free",
    priceLabel: "Free",
    state: "published",
    capacity: 5,
    semantic: {
      categories: [{ category: "thrifting", weight: 1 }, { category: "community", weight: 0.45 }, { category: "food-drink", weight: 0.25 }],
      vibes: ["relaxed", "creative", "social"], socialModes: ["exploring", "participating"], energy: "low", likelyNoise: "low", setting: "outdoor", interactionPotential: "high",
      conciseSummary: "A casual, inexpensive wander with an easy shared challenge.", suggestedGroupSize: { min: 3, max: 5 }, confidence: 0.91
    }
  },
  {
    id: "sunset-hike",
    sourceType: "community",
    sourceName: "Community",
    title: "Sunset walk at Torrey Pines",
    description: "A moderate out-and-back walk timed for sunset. We will stay together and finish before the lot closes.",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
    venue: "Torrey Pines State Reserve",
    neighborhood: "Torrey Pines",
    distanceMiles: 11.2,
    startsAt: futureIso(6, 16),
    priceBand: "free",
    priceLabel: "Free + parking",
    state: "published",
    capacity: 6,
    semantic: {
      categories: [{ category: "outdoors", weight: 1 }, { category: "wellness", weight: 0.35 }],
      vibes: ["relaxed", "social"], socialModes: ["participating", "exploring"], energy: "medium", likelyNoise: "low", setting: "outdoor", interactionPotential: "high",
      conciseSummary: "A scenic group walk where conversation can develop naturally.", suggestedGroupSize: { min: 3, max: 6 }, confidence: 0.94
    }
  },
  {
    id: "pottery-night",
    sourceType: "community",
    sourceName: "Community",
    title: "Beginner pottery night",
    description: "A no-experience-needed hand-building workshop. Materials and firing are included.",
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=85",
    venue: "Mud Lily Studio",
    neighborhood: "South Park",
    distanceMiles: 2.5,
    startsAt: futureIso(7, 18),
    priceBand: "moderate",
    priceLabel: "$38",
    state: "published",
    capacity: 6,
    semantic: {
      categories: [{ category: "arts-culture", weight: 0.8 }, { category: "learning", weight: 1 }],
      vibes: ["creative", "relaxed", "social"], socialModes: ["participating", "learning"], energy: "low", likelyNoise: "low", setting: "indoor", interactionPotential: "high",
      conciseSummary: "A hands-on class with built-in conversation and no experience pressure.", suggestedGroupSize: { min: 3, max: 6 }, confidence: 0.97
    }
  },
  {
    id: "padres-watch",
    sourceType: "official",
    sourceName: "Ticketmaster",
    externalId: "tm-demo-003",
    sourceUrl: "https://www.ticketmaster.com/",
    title: "Padres Fan Fest",
    description: "Ballpark tours, player appearances, batting practice experiences, and food around Petco Park.",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=85",
    venue: "Petco Park",
    neighborhood: "East Village",
    distanceMiles: 3.4,
    startsAt: futureIso(8, 12),
    priceBand: "budget",
    priceLabel: "$15",
    state: "published",
    capacity: 8,
    semantic: {
      categories: [{ category: "sports", weight: 1 }, { category: "community", weight: 0.3 }],
      vibes: ["energetic", "social"], socialModes: ["watching", "exploring"], energy: "high", likelyNoise: "high", setting: "mixed", interactionPotential: "medium",
      conciseSummary: "A lively ballpark event with plenty to explore as a group.", suggestedGroupSize: { min: 4, max: 8 }, confidence: 0.95
    }
  },
  {
    id: "beach-cleanup",
    sourceType: "community",
    sourceName: "Community",
    title: "Ocean Beach cleanup + tacos",
    description: "Spend ninety minutes cleaning the beach, then walk to a nearby taco shop together. Supplies provided.",
    imageUrl: "https://images.unsplash.com/photo-1520116468816-95b69f847357?auto=format&fit=crop&w=1200&q=85",
    venue: "Ocean Beach Pier",
    neighborhood: "Ocean Beach",
    distanceMiles: 8.1,
    startsAt: futureIso(10, 9),
    priceBand: "free",
    priceLabel: "Free",
    state: "published",
    capacity: 8,
    semantic: {
      categories: [{ category: "volunteering", weight: 1 }, { category: "outdoors", weight: 0.5 }, { category: "food-drink", weight: 0.2 }],
      vibes: ["social", "energetic"], socialModes: ["participating"], energy: "medium", likelyNoise: "low", setting: "outdoor", interactionPotential: "high",
      conciseSummary: "A shared purpose first, with a relaxed meal afterward.", suggestedGroupSize: { min: 4, max: 8 }, confidence: 0.96
    }
  },
  {
    id: "trivia-night",
    sourceType: "community",
    sourceName: "Community",
    title: "Low-stakes neighborhood trivia",
    description: "Join a friendly team for general knowledge trivia. No experts required; the goal is a good table, not first place.",
    imageUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=85",
    venue: "Fairplay",
    neighborhood: "North Park",
    distanceMiles: 0.9,
    startsAt: futureIso(2, 19),
    priceBand: "budget",
    priceLabel: "$5",
    state: "published",
    capacity: 6,
    semantic: {
      categories: [{ category: "games", weight: 1 }, { category: "food-drink", weight: 0.3 }],
      vibes: ["competitive", "social", "relaxed"], socialModes: ["participating"], energy: "medium", likelyNoise: "medium", setting: "indoor", interactionPotential: "high",
      conciseSummary: "A ready-made team activity that keeps conversation moving.", suggestedGroupSize: { min: 4, max: 6 }, confidence: 0.94
    }
  }
];

export const DEFAULT_APP_STATE: AppState = {
  activeUserId: "demo-you",
  onboardingComplete: false,
  interests: [
    { activityId: "jazz-waterfront", userId: "demo-maya", interested: true, discoverable: true },
    { activityId: "jazz-waterfront", userId: "demo-priya", interested: true, discoverable: true },
    { activityId: "museum-after-dark", userId: "demo-maya", interested: true, discoverable: true },
    { activityId: "museum-after-dark", userId: "demo-diego", interested: true, discoverable: true },
    { activityId: "north-park-market", userId: "demo-diego", interested: true, discoverable: true },
    { activityId: "north-park-market", userId: "demo-maya", interested: true, discoverable: false },
    { activityId: "pottery-night", userId: "demo-priya", interested: true, discoverable: true }
  ],
  groups: [],
  messages: [],
  reconnectVotes: {}
};
