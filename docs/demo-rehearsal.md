# Dyad three-minute demo

This script is deliberately short enough to rehearse without rushing. It uses real accounts and a real activity; demo mode remains the no-account route for onboarding and Discovery.

## Before presenting

- Open one pre-provisioned real account on the presentation device and a second helper account on a phone or private browser.
- On the same upcoming activity, make the helper account **Interested** and visible through **Find company**.
- Leave the invitation unaccepted so the audience can see the live transition.
- Run `npm run check`, `npm run check:live`, and `npm run smoke -- <deployed-url>`.
- Keep the chosen activity, Inbox, and group chat one tap away. Do not rely on typing more than one short message.

## 0:00–0:25 — The problem and promise

Start on the landing page.

> “Friendship apps usually ask you to judge people before you have anything to do together. Dyad starts with a real plan: find something you want to do, then find company for that specific activity.”

Point to the live activity showcase and enter the pre-provisioned account.

## 0:25–0:55 — Real activities, explicit interests

Open Discovery and briefly use one interest filter. Open the prepared activity.

> “These are current official listings, enriched into the same interest vocabulary the user chose during onboarding. We do not show opaque match scores.”

Tap **Interested** and show the confirmation explaining that the user can now receive invitations.

## 0:55–1:30 — Consent before matching

Tap **Find company**.

> “Interested stays private. This second choice is what makes you discoverable, and only for this event.”

Select the helper account and create the group. On the helper device, open Inbox and accept. Return to the presentation device and show the member count and acceptance event update in real time.

## 1:30–2:20 — The visible Meta moment

Tap **Plan meetup** in the group chat.

> “Meta AI turns verified event facts into a practical arrival plan and an easy first question. It never receives the private conversation, and it cannot invent venue facts or send anything on the group’s behalf.”

Point out the meeting suggestion, opener, and check-in reminder. Send one short message and show it arrive on the helper device.

## 2:20–2:50 — The relationship survives the event

Open **My Activities**, then **Chats**.

> “Activities sort by what is upcoming or past, while the chat remains available afterward. The event creates the introduction; Dyad does not throw the relationship away when the calendar changes.”

## 2:50–3:00 — Close

> “Dyad makes the first move smaller: choose a thing, opt into company, and meet around something real.”

## Judge self-test route

- **Continue as demo** exercises onboarding, interest selection, location, Discovery filters, Interested, Saved, and empty states without creating an account. Its data remains in the current browser session.
- A pre-provisioned real test account exercises invitations, Inbox, groups, Realtime chat, and the Meta meetup brief without asking the judge to register.
- If Meta times out, the meetup card uses the grounded deterministic fallback with the same layout. If Ticketmaster is unavailable, the last successfully synced catalog remains available in Supabase.
