# Dyad golden-path readiness

Status: **pre-implementation decisions locked; golden-path work has not started.**

This document is the implementation contract for the hackathon build. It replaces the behavior assumptions in the earlier implementation while preserving the approved mobile UI.

## Product constraints already decided

- Judges should not need to create a real account.
- User changes last for the current browser session only.
- The judge path must work even if an external API is slow or unavailable.
- `Interested` is private until the user explicitly chooses `Find company`.
- Profiles show a name, image, one-line introduction, attendance count, and interests; they do not expose age or gender in the picker.
- Activity discovery does not show match percentages or filtering controls.
- Groups contain the current user plus 1–10 invited people.
- Owner views must not show `Add Connection` or `Message` actions for the owner.

## Recommended runtime architecture

### Judge-facing path

Use a single seeded demo identity and session-scoped state. Do not make Supabase or OAuth a dependency of the three-minute demo.

- `sessionStorage`: onboarding, profile edits, notification preferences, interested/saved activities, created groups, selected invitees, and sent demo messages.
- Seeded local data: profiles, attendance counts, activity images, group history, and initial chat messages.
- Ticketmaster: refresh or augment official activity data server-side; fall back to the checked-in activity catalog.
- Meta Model API: generate one visible, useful result; fall back to a deterministic local result with the same response shape.

This is deliberately not a fake multi-user system. It is an interactive single-session prototype whose complete judge path remains functional.

### Deferred production architecture

Supabase Auth, Postgres, Realtime, and RLS are post-demo infrastructure. The repository contains an earlier schema, but it should not be connected unchanged: it includes discarded onboarding fields and assumptions. When durable accounts become a requirement, create a fresh migration from the final session-state model rather than treating the existing migration as authoritative.

## Golden path

1. Landing page → Log in or Create account.
2. Enter through a clearly labeled demo path; no real credential is required.
3. Pick at least five interests.
4. Share location, enter an address, or use the seeded San Diego demo location.
5. Browse Discovery and open an activity.
6. Mark it Interested.
7. Open Find company, select 1–10 people, and create a group.
8. Arrive in the group chat with invite-acceptance events before each invited person’s first message.
9. Send a message and use the visible Meta-powered action.
10. Confirm the group appears in My Activities and Chats.

## Required state transitions

| Action | Session result | Destination/feedback |
| --- | --- | --- |
| Continue as demo | Creates the seeded current-user session | Onboarding interests |
| Select interest | Adds/removes a tag | Counter enforces five minimum |
| Save location | Stores GPS coordinates or typed address | Discovery |
| Interested | Toggles private activity interest | Button state changes immediately |
| Save | Toggles saved activity | Reflected in My Activities |
| Find company | Makes the current user discoverable for that activity | Opens people sheet |
| Create Group | Stores group, invitees, and activity link | Group chat |
| Send message | Appends current-user message | Chat stays scrolled to newest message |
| Add Connection | Stores a pending/connected presentation state | Button confirmation |
| Leave group | Removes group from current groups | Chats or My Activities |

Every transition needs a loading state, success feedback, and a recoverable error state. Disabled controls must explain their requirement through visible text or accessible labels.

## Service and secret status

| Integration | Golden-path role | Current status |
| --- | --- | --- |
| Meta Model API | Visible AI output | Key configured and live request verified |
| Ticketmaster Discovery API | Official San Diego event source | Key configured and live request verified |
| Supabase | Connected for later durable auth/data | Project URL and publishable key configured; no schema deployed |
| Google OAuth | Not required for judge path | Do not configure yet |
| Scheduled sync | Optional pre-demo refresh | Cron secret configured; hosting scheduler undecided |

Secrets remain server-only. `MODEL_API_KEY`, `TICKETMASTER_API_KEY`, `CRON_SECRET`, and any future Supabase secret must never use the `NEXT_PUBLIC_` prefix.

Run `npm run check:setup` to validate the configuration shape without printing secret values.

## Visible Meta AI decision

The current redesigned UI no longer exposes the earlier AI planner. A group meetup brief remains the recommended visible AI moment, but it is explicitly deferred from the initial golden-path implementation. Do not add it until the user asks for it.

1. **Deferred recommendation: Group meetup brief.** A compact action in the group chat generates a friendly coordination card using the activity’s verified time/location and roster. It must not send private chat messages to the model, change bookings, or send messages.
2. **Activity conversation starter.** The activity page generates a short, event-specific opener the user can send after forming a group.
3. **Discovery explanation.** Each activity gets a one-sentence “Why this fits your interests” explanation without match scores. This is visible earlier but less socially distinctive.

All options must use grounded activity IDs and verified event facts. Private chat should be sent to Meta only if the group-brief option is chosen and the demo copy makes that clear; otherwise generate from event facts alone.

## Demo access decision

Replace the current Google OAuth control with a prominent `Continue as demo` button during golden-path implementation. The email/password fields may accept any non-empty values for the current session, but the UI must state that nothing is stored. Do not configure Google OAuth for the hackathon path.

## Failure strategy

- Ticketmaster failure: use checked-in official-looking seed activities and show no error in the primary demo path.
- Meta failure or timeout: return a deterministic brief/explanation with the same UI and mark it as a fallback only in developer diagnostics.
- Geolocation denial: keep the typed-address option visible and offer the seeded San Diego demo location.
- Refresh/reopen: session state survives reloads in the same tab session but disappears when the session ends.
- Empty/corrupt session data: reset only the affected store and return to the nearest valid screen.

## Testing gate before demo

- Unit tests for state reducers and the five-interest/group-size limits.
- Contract tests for Ticketmaster normalization and Meta response validation/fallback.
- One Playwright test covering the complete golden path without network access.
- One integration smoke test for each live API key before the presentation.
- Mobile viewport check at 430 × 764 and one common iPhone viewport.
- Production build and deployed-URL smoke test.
- A rehearsed three-minute script with no dependency on typing long text.

## Deployment checklist

- Choose hosting before wiring callbacks or cron; Vercel is the lowest-friction default for this Next.js app.
- Set the production `NEXT_PUBLIC_APP_URL`.
- Add server-only environment variables in the host dashboard.
- Keep the fallback catalog in the deployment bundle.
- Run `npm run check`, `npm run build`, and the network-independent Playwright golden-path test.
- Test the deployed URL in a private/incognito window.

## Work explicitly deferred

- Real account creation, password reset, email verification, and Google OAuth.
- Cross-device persistence and real multi-user messaging.
- Supabase schema deployment, Realtime, and production RLS validation.
- Push notifications.
- Moderation operations beyond the designed block/report UI.
- Background event sync beyond an optional pre-demo refresh.
