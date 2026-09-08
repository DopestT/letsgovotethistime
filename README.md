# Let's Go Vote This Time

A nonpartisan voter-access site built around three actions:

1. **Find my voting location** — route voters to current official EAC/state/local election information.
2. **Choose how I will get there** — compare rideshare, transit, driving, walking, taxi, paratransit, or another option.
3. **Make the arrangement myself** — the voter books and pays directly through Uber, Lyft, or the chosen transportation provider.

## Current public MVP

- Election Day countdown to November 3, 2026
- 50 states + District of Columbia official voter-information routing through the U.S. Election Assistance Commission
- Polling-place address route planning for transit, driving, and walking
- Direct self-service links to Uber and Lyft
- Guidance to check provider-controlled voter transportation offers without promising an unverified 2026 promotion
- Local, privacy-preserving voting-plan checklist
- Explicit-consent election reminder signup capped at four messages
- Anonymous `I VOTED` / `NOT YET` check-in with one browser/device identity and network-abuse controls
- Large national voting map with safe aggregate check-ins, Voted/Not Yet filters, and official voting-information actions kept separate from self-reported check-ins
- Native share action

## Check-in privacy boundary

The public check-in is a voluntary, self-reported participation signal, **not official turnout data and not proof that a ballot was cast**. Exact GPS, street addresses, names, emails, party, candidate, ideology, and ballot choice are not collected by the check-in system.

A random browser/device token represents one participant. `NOT YET` may later become `VOTED`; once marked `VOTED`, that browser identity cannot create another participation point. Raw IP addresses are not stored. A one-way network hash is used only for burst/rate-limit abuse detection. Geographic information is stored only at a coarse level and small buckets can be suppressed from public aggregates.

## Transportation boundary

Let's Go Vote This Time is **not** a transportation operator, dispatcher, broker, ride fund, reimbursement program, or rideshare marketplace.

The project does not accept ride requests, assign drivers, pay fares, reimburse fares, guarantee transportation, handle cancellations, or provide transportation customer support. The voter chooses the transportation option and makes the arrangement directly with the provider.

Uber and Lyft have offered voter-transportation features or promotions in prior election cycles. Any 2026 offer must be confirmed from the provider before it is presented as current. Availability, prices, promotions, eligibility, accessibility options, service areas, and provider terms remain controlled by the transportation company.

ROUTELY is a separate project and is not the public voter-ride operator for Let's Go Vote This Time.

## Trusted election data

This site intentionally does not maintain its own polling-place database. Voters are sent to the U.S. Election Assistance Commission and linked state/local election officials for current location, hours, identification rules, and voting options. The national map keeps official voting-location information visually and technically separate from anonymous self-reported check-ins.

## Deploy

This is a zero-build static site. Import the repository into Vercel and deploy from the repository root.
