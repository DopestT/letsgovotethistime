# Let's Go Vote This Time — Link Report Card

**Audit date:** September 8, 2026  
**Repository:** `DopestT/letsgovotethistime`  
**Scope:** internal routes, anchors, assets, public outbound links, action links, and service endpoints across the voter site.

## Overall grade: A

- **Files scanned:** 24
- **Unique references checked:** 139
- **Broken internal links:** 0
- **Broken user-facing outbound links after fixes:** 0
- **Primary PASS results in automated crawl:** 132
- **Restricted by anti-bot/WAF:** 2 Vote.gov URLs
- **Method-specific / review results:** 4
- **Transient CDN fetch error in final runner:** 1 Google Fonts stylesheet; the same stylesheet returned HTTP 200 in the preceding audit and is not treated as a dead navigation link.

## Brand cleanup

The voter project no longer references the separate transportation brand that was previously mentioned in the README and reminder unsubscribe contact.

The automated audit includes a case-insensitive repository guard and fails if that removed brand name reappears in scanned site files.

## Fixes made during this audit

### Uber ride buttons

Replaced the unstable mobile deep link used by:

- `index.html`
- `partner-kit.html`
- `ride-board.html`

with Uber's current official U.S. ride page:

`https://www.uber.com/us/en/ride/`

The page is current and usable in normal browsers. Automated GitHub runners may receive HTTP 406 from Uber's edge/WAF, so it is classified as **REVIEW / browser-verified**, not broken.

### Reminder privacy

Removed the old transportation-project email address from `reminder-privacy.html`. The page now relies on the one-click unsubscribe mechanism instead of pointing voters to an unrelated mailbox.

### README

Removed the separate-project transportation brand reference entirely.

### Audit false positives corrected

The link checker no longer treats these as broken navigation:

- dynamically created `#reminders` anchor
- JavaScript URL templates such as EAC state URLs containing `${...}`
- Google Fonts preconnect origins
- example URL text shown inside form placeholders

## Verified public links

The crawl returned HTTP 200 for major public resources including:

- U.S. Election Assistance Commission voter information
- Election Protection / 866-OUR-VOTE
- Lyft rider site
- Lyft Up programs
- Uber newsroom and 2024 voting program archive
- National Voter Registration Day
- Vote.org registration embed
- Official Voting Information Tool
- USA.gov voter accessibility guidance
- Federal Transit Administration voting-access resource
- 211 local-resource finder
- Google Maps directions
- D3 / TopoJSON / U.S. Atlas dependencies

## Restricted but not broken

`https://vote.gov/` and `https://vote.gov/register` returned HTTP 403 to the automated GitHub runner. They are retained as official government links and classified **RESTRICTED** because the response is consistent with bot/WAF protection rather than a missing page.

## Service endpoints

These are not ordinary browser navigation links and should not be graded using a GET/HEAD-only link checker:

- reminder signup endpoint — HTTP 400 when called without its expected POST payload
- ride-resource submission endpoint — HTTP 405 on unsupported method
- analytics endpoint — HTTP 405 on unsupported method

The voting check-in endpoint responded HTTP 200 during the audit.

## Continuous protection

`.github/workflows/link-audit.yml` now runs the full audit automatically on relevant site changes.

`scripts/link-audit.mjs` checks:

- internal routes
- anchors
- local assets
- public outbound URLs
- redirects / HTTP status
- action links
- service endpoints
- reintroduction of the removed transportation brand

Internal broken links or a forbidden-brand regression fail CI.

## Current disposition

**Navigation:** PASS  
**Internal pages:** PASS  
**Major election-resource links:** PASS / WAF-restricted where noted  
**Uber/Lyft buttons:** current official destinations  
**Removed-brand cleanup:** PASS  
**Automated regression protection:** ACTIVE
