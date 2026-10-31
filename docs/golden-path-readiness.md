# Dyad golden-path readiness

Status: **Checkpoint 4 is locally hardened: the grounded Meta meetup brief, deterministic fallback, offline mobile golden-path test, live-service checks, production health endpoint, and production build all pass. The Netlify project exists; Git connection, production environment values, first deploy, and deployed-URL smoke testing remain.**

This document is the implementation contract for the hackathon build. It replaces the behavior assumptions in the earlier implementation while preserving the approved mobile UI.

## Product constraints already decided

- Judges should not need to create a real account.
- Real accounts persist; demo changes last for the current browser session only.
- The judge path must work even if an external API is slow or unavailable.
- `Interested` is private until the user explicitly chooses `Find company`.
- Profiles show a name, image, one-line introduction, attendance count, and interests; they do not expose age or gender in the picker.
- Activity discovery does not show match percentages or filtering controls.
- Groups contain the current user plus 1–10 invited people.
- Owner views must not show `Add Connection` or `Message` actions for the owner.

## Recommended runtime architecture

### Two operating modes

Dyad has two deliberately separated modes:

- **Real mode:** email/password users authenticate with Supabase. Profiles, interests, activity states, discoverability, invitations, groups, connections, and messages persist in Postgres. Group messages update through Supabase Realtime.
- **Demo mode:** an isolated session identity and all changes stay in `sessionStorage`. Demo users never write to Supabase, never appear to real users, and cannot message real accounts.

The modes share UI and domain types but use different repositories behind one interface. This prevents demo records from contaminating the real social graph while preserving a reliable judge path.

Shared supporting data:

- Ticketmaster: refresh official activity data server-side. Empty states remain honest when the catalog has no rows.
- Meta Model API: generate one visible, useful result; fall back to a deterministic local result with the same response shape.

### Real social proof for judging

Before the demo, create a small set of genuine accounts for the user and willing helpers. Each person should complete a profile, mark the same controlled activity as discoverable, and join one test group. This lets judges see live people and Realtime chat without requiring strangers or fabricating activity. Demo mode never invents people or conversations.

### Supabase scope

Supabase Auth, Postgres, Realtime, and RLS are part of the real-account golden path. The repository contains an earlier schema, but it must not be deployed unchanged because it includes discarded onboarding fields and assumptions. Create a fresh migration from the final domain model.

Minimum persistent tables: `profiles`, `profile_interests`, `activities`, `activity_states`, `groups`, `group_members`, `group_invites`, `messages`, `connections`, `blocks`, and `reports`. Every exposed table requires RLS. Message reads/inserts are restricted to group members; profile edits and activity-state writes are restricted to the owning user.

## Golden path

1. Landing page → Log in or Create account.
2. Log into a persistent account or choose the clearly labeled session-only demo path.
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
| Create account / Log in | Creates or restores a Supabase session | Onboarding or last valid app page |
| Continue as demo | Creates a local seeded session without Supabase writes | Onboarding interests |
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
| Supabase | Persistent real accounts, user data, and Realtime chat | Identity, discovery, invitations, groups, notifications, and chat are deployed and live-tested |
| Google OAuth | Not required for judge path | Do not configure yet |
| Scheduled sync | Optional pre-demo refresh | Cron secret configured; hosting scheduler undecided |

Secrets remain server-only. `MODEL_API_KEY`, `TICKETMASTER_API_KEY`, `CRON_SECRET`, and any future Supabase secret must never use the `NEXT_PUBLIC_` prefix.

Run `npm run check:setup` to validate the configuration shape without printing secret values.

## Visible Meta AI decision

The group meetup brief is the visible Meta AI moment. It is available inside accepted group chats and uses verified activity facts only.

1. **Implemented: Group meetup brief.** A compact action in the group chat generates a friendly coordination card using the activity’s verified time and location. It does not send private chat messages to the model, change bookings, or send messages. An eight-second timeout falls back to a deterministic card with the same response shape.
2. **Activity conversation starter.** The activity page generates a short, event-specific opener the user can send after forming a group.
3. **Discovery explanation.** Each activity gets a one-sentence “Why this fits your interests” explanation without match scores. This is visible earlier but less socially distinctive.

All options must use grounded activity IDs and verified event facts. Private chat should be sent to Meta only if the group-brief option is chosen and the demo copy makes that clear; otherwise generate from event facts alone.

## Demo access decision

The Google OAuth control has been replaced with a prominent `Continue as demo` button. Email/password forms are reserved for genuine Supabase accounts and must never pretend to authenticate. Demo mode states that its data resets with the session. Do not configure Google OAuth for the hackathon path.

## Implementation checkpoints

1. **Identity and onboarding — complete.** Real email/password accounts use Supabase Auth. Profiles, interests, and private locations persist behind RLS. Demo onboarding uses `sessionStorage` only.
2. **Discovery and activity state — complete.** Feed fixtures are removed. Supabase stores the shared catalog plus real-user Interested, Saved, and Find company state; demo choices remain session-only.
3. **Groups and live chat — complete.** Invitations, accepted membership, messages, membership RLS, chat lists, activity-group links, and Realtime message subscriptions are wired and have been exercised with two real test accounts.
4. **Judge hardening and deploy — local hardening complete.** The visible Meta moment, fallback, offline mobile Playwright path, live-service checks, production health route, clean production build, and rehearsal script are complete. Choose hosting, configure its environment, deploy, and run the smoke suite against the deployed URL.

## Failure strategy

- Ticketmaster failure: retain the last successful catalog; if none exists, show a clear empty state with retry affordance.
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

- Netlify project: `dyad-san-diego` on the `dyrekampen` team. Connect `manwithaneuralnetwork/dyad-meta-ai-hackathon` with `main` as the production branch; `netlify.toml` supplies the Next.js build settings.
- In Netlify, add all values from `.env.example`. Give server secrets (`MODEL_API_KEY`, `TICKETMASTER_API_KEY`, `CRON_SECRET`, `SUPABASE_SECRET_KEY`) Builds and Functions scope. The `NEXT_PUBLIC_` values are intentionally public but still require a redeploy after editing.
- Set `NEXT_PUBLIC_APP_URL=https://dyad-san-diego.netlify.app`, trigger the first production deploy, then run `npm run smoke -- https://dyad-san-diego.netlify.app`.
- Enable Supabase Auth leaked-password protection before opening unrestricted public signup; it is currently the only security-advisor warning.
- Set the production `NEXT_PUBLIC_APP_URL`.
- Add server-only environment variables in the host dashboard.
- Keep the fallback catalog in the deployment bundle.
- Run `npm run check`, `npm run build`, and the network-independent Playwright golden-path test.
- Test the deployed URL in a private/incognito window.

## Work explicitly deferred

- Password reset, Google OAuth, and production-grade account recovery.
- Push/email verification may remain simplified for invited hackathon testers.
- Push notifications.
- Moderation operations beyond the designed block/report UI.
- Background event sync beyond an optional pre-demo refresh.
