# Dyad: Revised Activity-First Implementation Plan

## Summary

Dyad’s primary loop will be:

1. A user completes a short interest-based onboarding.
2. Muse Spark converts those answers into a structured interest profile.
3. Dyad periodically imports new San Diego Ticketmaster events.
4. Muse Spark semantically categorizes each new or changed event.
5. A deterministic matcher populates each user’s personalized feed.
6. Users mark events as interesting and optionally become discoverable to others considering the same event.
7. Those users form mutually opted-in groups and attend together.
8. Afterward, mutual reconnect votes help turn one shared event into a lasting connection.

This preserves the vision in :codex-file-citation{path="C:/Users/dyrek/OneDrive/Documents/Hackathons/MetaAIGlobalHackathon/Dyad/Vision/Dyad - Meta AI Hackathon Project.pdf" purpose="source"}: Dyad connects people through something they already want to do, rather than matching strangers first and hoping they find a reason to meet.

Muse Spark 1.3 is the primary model. Muse Image remains an optional secondary feature for community-created activity covers.

## Core Product and AI Behavior

### Interest onboarding

Onboarding takes roughly 60–90 seconds and collects:

- Five or more interest chips: live music, sports, arts, food, outdoors, learning, games, volunteering, nightlife, wellness, thrifting, community events, and similar categories.
- An optional free-text answer: “What kinds of things would actually get you out of the house?”
- Typical availability.
- San Diego neighborhood and maximum travel radius.
- Preferred price range.
- Preferred group size.
- Social energy and noise preferences.
- Indoor/outdoor preference.
- Accessibility requirements.
- An “open to trying something new” setting.

Muse Spark maps this into an `InterestProfile` with weighted categories and semantic facets. It does not create a personality profile or infer protected or sensitive characteristics.

Example:

```ts
type InterestProfile = {
  categoryWeights: Record<ActivityCategory, number>;
  vibes: Array<"relaxed" | "energetic" | "creative" | "competitive" | "social">;
  settings: Array<"indoor" | "outdoor" | "seated" | "active">;
  preferredGroupSize: { min: number; max: number };
  noiseTolerance: "low" | "medium" | "high";
  priceBand: "free" | "budget" | "moderate" | "flexible";
  availability: WeeklyAvailability;
  travelRadiusMiles: number;
  explorationWeight: number;
  accessibilityRequirements: string[];
};
```

The original onboarding answers remain user-editable, and the user can inspect the resulting preferences in plain language.

### Ticketmaster event ingestion

A scheduled Supabase Edge Function runs every six hours:

1. Fetch upcoming events within the San Diego area from the Ticketmaster Discovery API.
2. Upsert events by Ticketmaster source ID.
3. Hash relevant source fields to detect new or changed events.
4. Send only new or changed events to Muse Spark in batches of approximately 20.
5. Store the returned semantic event profiles.
6. Mark cancelled, removed, or expired events appropriately.

Ticketmaster remains authoritative for title, venue, date, price, ticket URL, and official imagery. Muse Spark may classify and summarize those facts but cannot replace them. [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/).

If Ticketmaster or Meta is temporarily unavailable, the previous catalog stays active and the job retries later.

### Semantic event categorization

Muse Spark receives the event’s source description, classifications, venue, and timing, then produces a strict `EventSemanticProfile`:

```ts
type EventSemanticProfile = {
  categories: WeightedCategory[];
  vibes: string[];
  socialModes: Array<"watching" | "participating" | "learning" | "exploring">;
  energy: "low" | "medium" | "high";
  likelyNoise: "low" | "medium" | "high" | "unknown";
  setting: "indoor" | "outdoor" | "mixed" | "unknown";
  interactionPotential: "low" | "medium" | "high";
  conciseSummary: string;
  suggestedGroupSize: { min: number; max: number };
  confidence: number;
};
```

Strict structured output guarantees the expected schema. The server validates enums, lengths, and source IDs before saving. [Meta structured output](https://dev.meta.ai/docs/structured-output).

This structured semantic layer is preferred over embeddings for the hackathon version because it is explainable, easy to debug, and can be matched directly in Postgres. Embeddings can be added later without changing the product experience.

### Personalized feed

The model does not run on every page load. Feed ranking is calculated from the stored user and event profiles:

- 55% interest, category, and vibe overlap
- 15% schedule fit
- 15% distance
- 10% price compatibility
- 5% exploration and novelty

Hard filters remove events that conflict with explicit accessibility, distance, date, or budget constraints.

The feed applies diversity rules so that one category cannot dominate the first page. It does not use popularity, virality, follower counts, or engagement-maximizing signals.

Each recommendation includes a short explanation generated from approved factors:

> “Recommended because you selected live jazz, smaller groups, and relaxed evening events within five miles.”

### Event-centered social connection

There are two separate event actions:

- **Interested:** saves the event privately and improves future recommendations.
- **Find company:** makes the user discoverable to other users who also selected “Find company” for that event.

A user is never exposed to strangers merely because the algorithm predicted interest.

Within an event, candidate participants are ranked using:

- Shared explicit interest in that exact event.
- Schedule compatibility.
- Travel radius.
- Preferred group size.
- Prior blocks or reports.
- Existing mutual connections when relevant.

Users can invite someone or request to join a group. Every membership remains mutually opted in.

Official events can contain multiple Dyad groups of two to six people. Community-created activities normally begin with a host-led group.

### Supporting AI experiences

- **Plan something:** a secondary guided action for users who cannot find an appropriate feed item. Muse Spark translates a request into filters, searches live and community activities, and returns grounded choices.
- **Community activity creation:** Muse Spark converts free text into a structured, editable activity draft.
- **Group brief:** optional activity-specific icebreakers, meeting checklist, and known accessibility reminders.
- **Reconnect:** after mutual “meet again” votes, Muse Spark suggests another event that fits the group’s aggregate preferences.
- **Muse Image:** generates labeled illustrative covers for community activities only.

## Technical Stack and Interfaces

### Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS and shadcn/ui
- Mobile-first installable PWA
- Supabase Postgres, Auth, Storage, Realtime, Edge Functions, and PostGIS
- Muse Spark 1.3 and Muse Image 1.0 through Meta Model API
- Ticketmaster Discovery API
- Vercel hosting
- Vitest, React Testing Library, and Playwright

PostGIS handles distance and radius queries using a coarse neighborhood point; exact home addresses are not collected. [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis).

### Main data model

- `profiles`
- `interest_profiles`
- `activities`
- `event_semantic_profiles`
- `activity_interest`
- `groups`
- `group_members`
- `invitations`
- `messages`
- `reconnect_votes`
- `connections`
- `blocks`
- `reports`
- `ai_runs`
- `event_sync_runs`

Relevant activity states:

```text
imported → enriched → published → completed/cancelled/expired
```

Relevant participant states:

```text
interested → discoverable → requested/invited → going → attended/declined
```

### Main interfaces

- `POST /api/onboarding/profile`  
  Converts onboarding answers into a validated `InterestProfile`.

- `GET /api/feed`  
  Returns ranked, diverse event recommendations without making a live model call.

- `POST /api/activities/:id/interest`  
  Records private interest and optionally enables “Find company.”

- `GET /api/activities/:id/people`  
  Returns eligible, mutually discoverable participants.

- `POST /api/ai/plan`  
  Handles the secondary “Plan something” experience.

- `POST /api/ai/activity-draft`  
  Creates an editable community activity draft.

- `POST /api/groups/:id/brief`  
  Generates the optional coordination brief.

- `POST /api/groups/:id/reconnect`  
  Records private reconnect votes and suggests a next activity after mutual consent.

- `sync-ticketmaster` scheduled Edge Function  
  Imports, reconciles, and semantically enriches events every six hours.

All Meta API calls occur server-side using Standard mode. Raw private chat history is not sent to the model.

## Eight-Day Delivery Plan

### October 28

- Scaffold the PWA and design system.
- Create Supabase schema and row-level security.
- Build onboarding screens and seed demo users.

### October 29

- Implement Ticketmaster import and six-hour scheduled synchronization.
- Build event normalization, deduplication, cancellation, and expiry handling.
- Seed reliable community activities.

### October 30

- Integrate Muse Spark structured categorization.
- Implement `InterestProfile` and `EventSemanticProfile`.
- Add batch processing and AI-run instrumentation.

### October 31

- Implement feed scoring, diversity rules, filters, and explanations.
- Build event cards and activity detail pages.
- Verify that different onboarding profiles produce visibly different feeds.

### November 1

- Implement Interested, Find company, invitations, join requests, and groups.
- Add participant discoverability and deterministic candidate ranking.
- Add blocking and reporting.

### November 2

- Build realtime group chat and meeting plan cards.
- Add AI group briefs, reconnect voting, and next-event suggestions.
- Add Muse Image covers for community activities.

### November 3

- Run AI evaluations, RLS tests, and two-user Playwright flows.
- Polish mobile interaction, loading, fallback, and failure states.
- Add a judge-facing AI trace showing event ingestion, semantic tags, matching factors, latency, and cost.

### November 4

- Deploy and seed the final San Diego demo.
- Rehearse and record the walkthrough.
- Prepare the architecture diagram, fallback video, model disclosure, and submission materials.

## Tests, Demo, and Assumptions

### Critical tests

- Two users with different onboarding answers receive materially different feeds.
- A shared event appears highly for users with compatible interests.
- Re-running the sync does not re-enrich unchanged events.
- AI categorization never changes authoritative event facts.
- Interested users remain private unless they enable Find company.
- Only mutually discoverable users can view or invite each other.
- Blocked users never appear in candidate results.
- Mutual reconnection occurs only after both users consent.
- Ticketmaster or Meta failure leaves the previous catalog usable.
- Feed ordering contains no popularity or virality signal.

### Demo sequence

1. Complete onboarding as one user.
2. Show Muse Spark converting answers into a readable interest profile.
3. Open a personalized feed containing a live San Diego event.
4. Show the event’s AI-generated semantic categorization and recommendation reason.
5. Mark Find company and reveal another opted-in user interested in the same event.
6. Invite that user and form a small group.
7. Show the coordination card and simulate attendance.
8. Complete mutual reconnect voting and receive a second-event suggestion.

### Credit allocation

- $95 — Muse Spark event enrichment, onboarding synthesis, planning, coordination, and evaluation
- $10 — Muse Image covers
- $5 — optional web-search grounding
- $40 — retries, prompt tuning, judge traffic, and reserve

Current Standard-mode pricing is $1.25 per million input tokens and $4.25 per million output tokens; Muse Image is $0.01 per image. [Meta pricing](https://dev.meta.ai/docs/pricing-rate-limits).

### Assumptions

- San Diego, English, and adults 18+ only.
- Public venues only.
- Ticket purchasing remains external.
- Exact home addresses are never collected.
- Accessibility information must be source- or host-confirmed.
- No automatic group enrollment, direct messages, payments, minors, or multi-city support in the hackathon version.
