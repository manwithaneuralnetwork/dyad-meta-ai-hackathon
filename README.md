# Dyad

Dyad is an activity-first social PWA for San Diego. It recommends real events from explicit onboarding preferences, then lets people who independently chose the same event opt into finding company.

The app intentionally separates **Interested** (private) from **Find company** (discoverable on that event only). It does not rank events by popularity and does not make personality-based friend matches.

## Current status

The approved mobile UI is implemented as a navigable prototype. Golden-path state and service wiring have not begun yet. Earlier API routes, Supabase files, and matching utilities remain in the repository as reference code, but their product assumptions are not authoritative for the redesigned experience.

The implementation contract and setup status live in [docs/golden-path-readiness.md](docs/golden-path-readiness.md).

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The finished judge path will use a session-only demo identity and will not require a real account.

Useful checks:

```bash
npm run check:setup
npm run typecheck
npm test
npm run build
```

## Connect production services

Copy `.env.example` to `.env.local`. The hackathon path requires:

- `MODEL_API_KEY` for `muse-spark-1.3`
- `TICKETMASTER_API_KEY`
- `CRON_SECRET`

Supabase values are optional and should be configured only when durable accounts or multi-user data are intentionally added. Never expose the Supabase secret key or Meta key through `NEXT_PUBLIC_` variables.

### Deferred Supabase reference

The repository contains an earlier migration in `supabase/migrations/` and a local seed in `supabase/seed.sql`. They should be revised against the approved session-state model before deployment.

```bash
npx supabase start
npx supabase db reset
npx supabase functions serve sync-ticketmaster --no-verify-jwt
```

For a hosted project, link the repository, push the migration, deploy the function, and set function secrets:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase secrets set TICKETMASTER_API_KEY=... MODEL_API_KEY=... META_MODEL=muse-spark-1.3
npx supabase functions deploy sync-ticketmaster --no-verify-jwt
```

Then adapt and run `supabase/cron.sql.example` in the SQL editor. It stores the project URL and secret in Vault and calls the function every six hours.

## AI boundaries

Muse Spark runs at two high-leverage points rather than on every feed view:

1. Onboarding: explicit answers become a shared `InterestProfile` taxonomy.
2. Event ingestion: new or changed Ticketmaster events become `EventSemanticProfile` records in batches of 20.

Feed ranking is deterministic and inspectable. Source dates, venues, prices, and URLs always come from Ticketmaster. The model cannot publish activities, send invitations, or enroll users. Private chat is never sent to the model.

If Meta is unavailable, onboarding and event ingestion use deterministic fallbacks. If Ticketmaster is unavailable, the last successful catalog remains active.

## Architecture

```text
Ticketmaster ──► scheduled Edge Function ──► activities
                         │
                         └──► Muse Spark batch enrichment ──► event_semantic_profiles

Onboarding ──► Muse Spark / deterministic fallback ──► interest_profiles
                                                             │
activities + semantic profiles + interest profile ──► deterministic feed
                                                             │
                                           Interested / Find company
                                                             │
                                      groups ─► chat ─► reconnect votes
```

## Demo walkthrough

1. Complete onboarding with five interests.
2. Show that the feed explains recommendations without popularity signals.
3. Open an event and compare Interested with Find company.
4. Invite an opted-in participant and simulate acceptance.
5. Open the group, generate a Muse brief, and send a message.
6. Vote to reconnect and show the mutual result.
