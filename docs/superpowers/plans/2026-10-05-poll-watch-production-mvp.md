# Poll Watch Production MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Let's Go Vote This Time into the lead public 2026 election web property by shipping a production-ready Poll Watch surface, race/pollster entry points, homepage integration, SEO/distribution hooks, and a stable read-only API contract without inventing live data.

**Architecture:** Keep the existing zero-build static frontend and Node 22 Vercel serverless pattern. Add a public Poll Watch API that reads from a separately configured Election Data Core when available and returns explicit `data_pending`, `live`, `stale`, or `degraded` states. The browser never calls polling vendors directly and never receives provider credentials.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node.js 22 ESM, Vercel serverless functions, Node built-in test runner, existing site CI/link audit.

**Spec:** `docs/superpowers/specs/2026-10-05-election-data-core-poll-watch-design.md`

## Global Constraints

- Do not invent, hard-code, or seed fake polling numbers as live data.
- Anonymous `I VOTED` / `NOT YET` check-ins remain separate from official election information, polling, turnout, and results.
- Provider credentials and licensed raw payloads remain server-side only.
- Public Poll Watch APIs are read-only.
- If no authorized Election Data Core is configured, show `DATA PENDING` rather than failing or fabricating values.
- If data exceeds its freshness threshold, label it `STALE` or `DEGRADED`; never present stale values as live.
- Preserve the existing visual system: near-black ink, warm paper, election red, live green, DM Sans + Space Grotesk.
- Preserve current voter-access, transportation, privacy, reminder, and check-in behavior.
- Mobile/iPad layouts are required.
- No direct AP/DDHQ/state API requests from browser JavaScript.
- Canonical election data must remain on LWV-controlled infrastructure once persistence is connected.

## Review Focus

- Missing backend configuration must produce a useful `data_pending` response and usable page, not a 500.
- Malformed or partial upstream data must not crash the page or render fabricated defaults.
- Stale timestamps must visibly change the status from `live` to `stale`.
- Duplicate poll IDs from the upstream core must not render duplicate poll rows.
- Mobile navigation and dashboard tables/cards must remain usable below 620px.

---

### Task 1: Poll Watch public API contract

**Files:**
- Create: `api/lib/poll-watch-contract.js`
- Create: `api/lib/election-data-client.js`
- Create: `api/poll-watch.js`
- Create: `tests/poll-watch-contract.test.mjs`
- Create: `tests/election-data-client.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `normalizePollWatchPayload(payload, now) -> PollWatchResponse`
- Produces: `computeFreshness(updatedAt, now, staleAfterMs) -> 'live' | 'stale' | 'data_pending'`
- Produces: `fetchPollWatchData({ baseUrl, fetchImpl, timeoutMs }) -> Promise<PollWatchResponse>`
- Public endpoint: `GET /api/poll-watch`

- [ ] **Step 1: Write failing contract tests**

Assert that normalization:
- accepts a valid upstream payload;
- de-duplicates polls by stable poll ID;
- preserves source attribution and `updatedAt`;
- converts missing data to `data_pending` without invented numbers;
- marks old payloads `stale` using a deterministic threshold.

- [ ] **Step 2: Run the Poll Watch contract tests and verify failure**

Run: `node --test tests/poll-watch-contract.test.mjs`

Expected: FAIL because the contract module does not exist.

- [ ] **Step 3: Implement `api/lib/poll-watch-contract.js`**

Define the normalized public shape with these top-level keys:

`status`, `generatedAt`, `updatedAt`, `national`, `races`, `newPolls`, `movements`, `pollsters`, `sourceStatus`.

Use `null` for unavailable metrics; do not substitute zero.

- [ ] **Step 4: Write failing client tests**

Cover:
- no `ELECTION_DATA_CORE_URL` => `data_pending`;
- upstream success => normalized payload;
- upstream timeout/error => `degraded` with no fabricated values;
- invalid JSON => `degraded`.

- [ ] **Step 5: Implement `api/lib/election-data-client.js` and `api/poll-watch.js`**

`api/poll-watch.js` reads `ELECTION_DATA_CORE_URL` only on the server, sets JSON/cache headers appropriate to current status, and returns HTTP 200 for `data_pending`, `live`, and `stale`; provider/system failures may return 200 with `degraded` when a safe empty public response can be produced.

- [ ] **Step 6: Add syntax/test scripts to `package.json`**

Add a `check:poll-watch` script covering the new serverless files while preserving existing scripts.

- [ ] **Step 7: Run tests**

Run: `npm test && npm run check:poll-watch`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add api/lib/poll-watch-contract.js api/lib/election-data-client.js api/poll-watch.js tests/poll-watch-contract.test.mjs tests/election-data-client.test.mjs package.json
git commit -m "feat: add Poll Watch public API contract"
```

---

### Task 2: Flagship `/poll-watch` dashboard

**Files:**
- Create: `poll-watch.html`
- Create: `poll-watch.css`
- Create: `poll-watch.js`
- Create: `tests/poll-watch-page.test.mjs`

**Interfaces:**
- Consumes: `GET /api/poll-watch`
- Produces: public Poll Watch dashboard with explicit data-state rendering.

- [ ] **Step 1: Write a failing static-page test**

Read `poll-watch.html` and assert it contains:
- canonical URL `https://letsgovotethistime.com/poll-watch`;
- `POLL WATCH — 2026`;
- containers for national environment, Senate/House/governor race watch, newest polls, biggest moves, and source status;
- a methodology link;
- `poll-watch.js` and `growth.js`.

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test tests/poll-watch-page.test.mjs`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Build `poll-watch.html`**

Use the existing brand shell and typography. The first viewport must show:
- page title;
- last updated/status;
- national environment cards;
- high-priority race strip;
- clear `DATA PENDING`/`STALE`/`DEGRADED` copy when applicable.

- [ ] **Step 4: Build `poll-watch.css`**

Create an editorial/terminal hybrid using existing CSS variables and responsive rules. Tables must collapse to stacked cards on narrow screens rather than horizontal overflow becoming the only interaction.

- [ ] **Step 5: Build `poll-watch.js`**

Implement:
- fetch `/api/poll-watch`;
- deterministic status banner;
- safe text-only DOM rendering;
- filters for race type and 7/14/30-day view when supplied by the API;
- no insertion of placeholder polling values.

- [ ] **Step 6: Run syntax + page tests**

Run: `node --check poll-watch.js && node --test tests/poll-watch-page.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add poll-watch.html poll-watch.css poll-watch.js tests/poll-watch-page.test.mjs
git commit -m "feat: launch Poll Watch dashboard"
```

---

### Task 3: Homepage becomes the election command-center entry point

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Create: `poll-watch-teaser.js`
- Create: `tests/home-poll-watch.test.mjs`

**Interfaces:**
- Consumes: `GET /api/poll-watch`
- Produces: homepage Poll Watch teaser linking to `/poll-watch` and preserving existing voter-access hero/actions.

- [ ] **Step 1: Write failing homepage tests**

Assert `index.html` contains:
- navigation link to `/poll-watch`;
- a `2026 ELECTION WATCH` section below the primary hero;
- `OPEN POLL WATCH`, `SEE RACES`, and `METHODOLOGY` links;
- `poll-watch-teaser.js`.

- [ ] **Step 2: Add the homepage module without replacing the existing voting-plan hero**

The module displays only values returned by the API. In `data_pending` mode it becomes a substantive launch/connection card rather than showing dashes as if they were data.

- [ ] **Step 3: Implement `poll-watch-teaser.js`**

Render summary fields and status safely. Reuse `/api/poll-watch`; do not create a second data endpoint.

- [ ] **Step 4: Extend `styles.css`**

Add command-center card/table styles using current tokens and preserve all existing site sections.

- [ ] **Step 5: Run tests and syntax checks**

Run: `node --check poll-watch-teaser.js && node --test tests/home-poll-watch.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css poll-watch-teaser.js tests/home-poll-watch.test.mjs
git commit -m "feat: make Poll Watch a homepage growth surface"
```

---

### Task 4: Race, pollster, and methodology entry pages

**Files:**
- Create: `races.html`
- Create: `races.js`
- Create: `pollsters.html`
- Create: `pollsters.js`
- Create: `poll-methodology.html`
- Create: `tests/poll-watch-entry-pages.test.mjs`

**Interfaces:**
- Consumes: the same normalized `/api/poll-watch` response for V1.
- Produces: indexable discovery surfaces that later migrate to dedicated race/pollster detail APIs without changing public URLs.

- [ ] **Step 1: Write failing entry-page tests**

Assert canonical URLs, growth tracking, Poll Watch cross-links, and no hard-coded live polling values.

- [ ] **Step 2: Build `/races`**

Render race categories, movement, status, poll count, and links/query-state suitable for later dedicated race pages.

- [ ] **Step 3: Build `/pollsters`**

Render pollster name, tracked-poll count, historical score fields when available, and transparent `not yet scored` states.

- [ ] **Step 4: Build `/poll-methodology`**

Explain source inclusion, internal-poll labeling, LV/RV filters, stale-data policy, reproducible averages, corrections, and the rule that independent vote totals are never averaged.

- [ ] **Step 5: Run page and syntax tests**

Run: `node --check races.js && node --check pollsters.js && node --test tests/poll-watch-entry-pages.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add races.html races.js pollsters.html pollsters.js poll-methodology.html tests/poll-watch-entry-pages.test.mjs
git commit -m "feat: add race pollster and methodology surfaces"
```

---

### Task 5: SEO, discoverability, and distribution wiring

**Files:**
- Modify: `sitemap.xml`
- Modify: `robots.txt` only if needed to preserve crawlability
- Modify: `llms.txt`
- Modify: `README.md`
- Modify: `.github/workflows/site-ci.yml`
- Modify: `.github/workflows/link-audit.yml` if page discovery is path-listed there
- Create: `tests/poll-watch-seo.test.mjs`

**Interfaces:**
- Produces: crawlable Poll Watch URLs and CI enforcement.

- [ ] **Step 1: Write failing SEO tests**

Assert sitemap contains:
- `/poll-watch`
- `/races`
- `/pollsters`
- `/poll-methodology`

Assert `llms.txt` describes Poll Watch as polling intelligence while preserving voter-access/privacy boundaries.

- [ ] **Step 2: Add canonical, OG, Twitter, WebPage/Breadcrumb structured data to new pages**

Use factual product descriptions; do not put current polling numbers in static metadata.

- [ ] **Step 3: Update `sitemap.xml`, `llms.txt`, and README**

README must describe Let's Go Vote This Time as both a voter-access product and the public home of Poll Watch/live results.

- [ ] **Step 4: Extend Site CI**

Add new HTML/JS files to path triggers and syntax/content checks. Preserve existing check-in/privacy assertions.

- [ ] **Step 5: Run full repository validation**

Run: `npm test`

Run the same syntax and sitemap commands used by `.github/workflows/site-ci.yml` locally/CI.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sitemap.xml robots.txt llms.txt README.md .github/workflows/site-ci.yml .github/workflows/link-audit.yml tests/poll-watch-seo.test.mjs
git commit -m "feat: wire Poll Watch for search and distribution"
```

---

### Task 6: Production verification and release gate

**Files:**
- Modify only as required by verified failures from prior tasks.

**Interfaces:**
- Produces: a release candidate whose behavior is valid both with and without the Election Data Core configured.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run all JavaScript syntax checks**

Run the existing site checks plus:

`node --check poll-watch.js poll-watch-teaser.js races.js pollsters.js api/poll-watch.js api/lib/poll-watch-contract.js api/lib/election-data-client.js`

Expected: PASS.

- [ ] **Step 3: Verify no-backend behavior**

With `ELECTION_DATA_CORE_URL` unset, verify `/api/poll-watch` returns a valid `data_pending` object and all four public pages remain usable.

- [ ] **Step 4: Verify mocked-live behavior**

Use test fixtures only—not production hard-coded data—to verify live, stale, duplicate, malformed, and degraded payload rendering.

- [ ] **Step 5: Verify responsive behavior**

Check desktop, iPad-width, and <=620px layouts for dashboard cards, navigation, tables, and status banners.

- [ ] **Step 6: Verify existing voter tools were not regressed**

Re-run the current site CI checks for check-in, voting map, voter-help, ride board, reminder, growth tracking, sitemap, and privacy copy.

- [ ] **Step 7: Record release evidence**

Capture the commit SHA, CI run result, deployed production URL, `/api/poll-watch` status, and live page checks before claiming production complete.

- [ ] **Step 8: Commit any verification-only fixes**

Use focused commits tied to the failing check; do not bundle unrelated redesigns.

---

## Follow-on Plans

This plan deliberately does **not** implement commercial/official ingestion. After this release is verified, create separate plans for:

1. **Polling ingestion:** DDHQ/licensed sources + original pollster evidence + immutable snapshots + reproducible averaging.
2. **Election-night results:** AP + DDHQ + official state/local adapters + reconciliation + vote drops + attributed race calls.
3. **Cross-product distribution:** Representative X IDs/context, Perception verification, DataCenter.forum private connector-health view.
4. **Automated content/growth:** `What Changed?` briefs, social-card generation, newsletters, race-page update feeds, and post-election pollster grading.
