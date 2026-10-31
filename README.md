# Dyad

Dyad is an activity-first social PWA for San Diego. It recommends real events from explicit onboarding preferences, then lets people who independently chose the same event opt into finding company.

The app intentionally separates **Interested** (private) from **Find company** (discoverable on that event only). It does not rank events by popularity and does not make personality-based friend matches.

## Current status

The approved mobile UI, two-mode authentication, onboarding, persistent activity catalog, AI-assisted interest tags, duplicate rejection, Discovery filters, per-user activity state, activity groups, invitations, and Realtime chat are implemented. Demo mode remains isolated in the current browser session; real accounts persist their social data in Supabase behind RLS.

The implementation contract and setup status live in [docs/golden-path-readiness.md](docs/golden-path-readiness.md).

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The finished app will support persistent Supabase accounts plus an isolated session-only demo identity for judges.

Useful checks:

```bash
npm run check:setup
npm run typecheck
npm test
npm run build
npm run smoke -- https://your-deployed-url.example
```

## Connect production services

Copy `.env.example` to `.env.local`. The hackathon path requires:

- `MODEL_API_KEY` for `muse-spark-1.3`
- `TICKETMASTER_API_KEY`
- `CRON_SECRET`

The Supabase project URL and publishable key connect persistent real accounts and multi-user data. A server secret is required for the protected Ticketmaster catalog-sync endpoint. Never expose the Supabase secret key or Meta key through `NEXT_PUBLIC_` variables.

### Supabase schema note

The repository migrations define the identity and activity schemas applied to the hosted Dyad project. They intentionally contain no seed people, activities, or conversations.

```bash
npx supabase start
npx supabase db reset
npx supabase functions serve sync-ticketmaster --no-verify-jwt
```

For a hosted project, link the repository, push the migration, deploy the function, and set function secrets:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase secrets set TICKETMASTER_API_KEY=... MODEL_API_KEY=... META_MODEL=muse-spark-1.3 CRON_SECRET=...
npx supabase functions deploy sync-ticketmaster --no-verify-jwt
```

Then adapt and run `supabase/cron.sql.example` in the SQL editor. It stores the project URL and secret in Vault and calls the function every six hours.

## AI boundaries

Muse Spark runs at two high-leverage points rather than on every feed view:

1. Event ingestion: Ticketmaster activities are assigned one to six interest tags in batches, using the shared 30-tag catalog whenever possible.
2. Taxonomy growth: the model may add a short, neutral activity tag only when the core catalog cannot describe the event accurately.

Event identity is deterministic: normalized title, UTC minute, and city form a database-enforced duplicate key. Source dates, venues, prices, and URLs always come from Ticketmaster. The model cannot publish activities, send invitations, or enroll users. Private chat is never sent to the model.

If Meta is unavailable, onboarding and event ingestion use deterministic fallbacks. If Ticketmaster is unavailable, the last successful catalog remains active.

## Architecture

```text
Ticketmaster ──► duplicate key check ──► Muse Spark tag enrichment
                                              │
                                              ├──► activities.topics
                                              └──► dynamic interest_tags

Onboarding ──► profile + interests + location ──► Discovery tag filters
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
