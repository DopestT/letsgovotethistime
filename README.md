# Let's Go Vote This Time

A nonpartisan voter-access site built around three actions:

1. **Find my voting location** — route voters to current official EAC/state/local election information.
2. **Get me there** — transportation planning plus a ROUTELY Ride Access pilot.
3. **Fund a ride** — build a neutral transportation-access pool available without regard to party, candidate, or vote choice.

## Current public MVP

- Election Day countdown to November 3, 2026
- 50 states + District of Columbia official voter-information routing through the U.S. Election Assistance Commission
- Polling-place address route planning for transit, driving, and walking
- Ride Access pilot intake via `hello@routely.app`
- Donor/partner inquiry flow for the Ride Fund
- Local, privacy-preserving voting-plan checklist
- Native share action

## ROUTELY boundary

ROUTELY is currently a delivery-intelligence product, not a rideshare marketplace. This civic site therefore does **not** repurpose deliveries as riders. The Ride Access pilot is a separate civic workflow that can later connect to ROUTELY's map, ETA, operations, and dispatch capabilities through a dedicated API surface.

## Trusted election data

This site intentionally does not maintain its own polling-place database. Voters are sent to the U.S. Election Assistance Commission and linked state/local election officials for current location, hours, identification rules, and voting options.

## Deploy

This is a zero-build static site. Import the repository into Vercel and deploy from the repository root.
