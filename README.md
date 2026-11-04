# Dyad

Dyad is an activity-first social PWA for San Diego. It recommends real events from explicit onboarding preferences, then helps people who chose the same event form a small group and meet in person.

Instead of ranking people through a swipe deck, **Find Company** lets each participant choose every group size they would enjoy. Dyad matches compatible preferences, considers shared interests with Muse, and sends every proposed member an invitation so everyone can decide whether to join.

**Live demo:** [dyad-san-diego.netlify.app](https://dyad-san-diego.netlify.app)

## Current status

The mobile PWA includes two-mode authentication, onboarding, a persistent activity catalog, AI-assisted event enrichment, duplicate rejection, Discovery filters, flexible group-size matchmaking, invitations, friendships, notifications, and Supabase Realtime chat. Real accounts persist normally. Demo accounts use the same full product path, then erase their profile, social data, and memberships when ended or expired.

The implementation contract and setup status live in [docs/golden-path-readiness.md](docs/golden-path-readiness.md).

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Judges can use a temporary demo identity with the full social flow; it expires after two hours and can be erased immediately from the Profile screen.

Useful checks:

```bash
npm run check:setup
npm run check:live
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

## How Meta AI is used

Dyad's AI companion, **Muse**, uses Meta's `muse-spark-1.3` model at several high-leverage points:

1. **Event understanding:** Ticketmaster activities receive clearer titles and relevant interest tags, with cautious taxonomy growth when the core catalog cannot describe an event.
2. **Activity recommendations:** Muse can reason over a user's explicit interests and the grounded event catalog.
3. **Group formation:** after compatible group-size preferences are found, Muse considers shared interests and lightweight profile context to select a welcoming group and explain the fit.
4. **Meetup planning:** Muse turns grounded activity details into a brief arrival plan and conversation starter.
5. **In-chat assistance:** a member can explicitly mention `@muse` to ask a concise question. Only then is a limited window of recent group messages supplied as context, with a one-minute per-user cooldown.

Event identity and exact venue-time duplicate rejection are deterministic. Source dates, venues, prices, images, and URLs remain grounded in Ticketmaster. The model cannot publish activities, enroll users, or bypass invitation acceptance. Deterministic fallbacks keep core flows available if the model is temporarily unavailable.

If Ticketmaster is unavailable, the last successful catalog remains active.

## Architecture

```text
Ticketmaster ──► venue/time deduplication ──► Muse event enrichment
                                                    │
                                                    ├──► clear titles + topics
                                                    └──► dynamic interest tags

Onboarding ──► profile + interests + San Diego ──► Discovery
                                                       │
                                              Find Company
                                                       │
                            size compatibility ─► Muse group selection
                                                       │
                                invitations ─► group ─► Realtime chat
                                                       │
                                      meetup brief + @muse assistance
```

## Demo walkthrough

1. Complete onboarding with five interests.
2. Show that the feed explains recommendations without popularity signals.
3. Open an event, choose multiple acceptable group sizes, and enter Find Company.
4. Accept the resulting invitation and open the matched group.
5. Generate a Muse meetup brief, send a message, and ask `@muse` an event question.
6. Show friendships, notifications, and the continuing post-activity chat.
