# Election Data Core + Poll Watch Design

**Date:** 2026-10-05
**Status:** Approved product direction; architecture specification
**Owning public product:** Let's Go Vote This Time
**Shared owner:** Legacy Works Ventures

## 1. Purpose

Build a shared, auditable U.S. election intelligence system that can ingest polling and election-result data from many independent sources, preserve the original evidence, reconcile disagreements without erasing them, and publish product-specific views across Legacy Works Ventures properties.

The public destination for polling and live election results is **Let's Go Vote This Time**. The underlying canonical data is shared infrastructure, not owned by any one front end.

Success means:

- Poll Watch can track essentially every credible public 2026 poll we can lawfully access.
- Election Night can ingest national commercial feeds plus official state/local results feeds.
- Every displayed number resolves to source provenance and retrieval timestamps.
- Disagreements remain visible and auditable rather than being silently averaged away.
- Polling data, projections, race calls, unofficial results, official results, and certified results are separate data classes.
- Representative X, DataCenter.forum, and Perception consume the same canonical records without maintaining competing copies of truth.
- Provider outages do not destroy the system's historical state or make stale data appear live.

## 2. Product ownership and boundaries

### Let's Go Vote This Time

Public home for:

- Poll Watch
- Polling averages and methodology filters
- Race Watch
- Pollster scorecards
- Poll movement and disagreement views
- Historical polling comparisons
- Election Night live results
- Vote-drop timeline
- House/Senate control views
- Post-election polling-error grading
- Existing voter-access and voting-plan tools

The existing voter-access privacy boundary remains intact. Anonymous `I VOTED` / `NOT YET` check-ins are self-reported participation signals and must never be mixed with official turnout or election-result data.

### Representative X

Consumes shared election data for:

- candidate and officeholder context
- election-conduct records
- accountability timelines
- claims and source-backed fact patterns
- race context around candidates already represented in Representative X

Representative X does not own Poll Watch and does not maintain a second polling database.

### DataCenter.forum

DataCenter.forum remains a data-center-industry public product. Election content must not be inserted into its public industry routes.

The reusable connection is at the **source-observability and provenance layer**:

- connector health patterns
- source fingerprinting
- last-verified timestamps
- immutable source snapshots
- source-change events
- discrepancy/audit concepts

Any election-specific source-health view attached to DataCenter.forum must be private/admin-only or exposed through a shared internal service, never presented as data-center-industry content.

### Perception

Perception operates above canonical evidence and may:

- compare independent sources
- detect stale feeds
- classify ordinary freshness lag versus material discrepancy
- explain what changed
- summarize vote drops
- detect anomalies that need review
- answer evidence-backed questions about polling movement and results

Perception must not invent official vote totals, overwrite raw source records, or make unattributed race calls.

The authoritative election state must remain on Legacy Works Ventures-controlled infrastructure. AI-provider memory, threads, vector stores, or proprietary model storage cannot be the election system of record.

## 3. Architecture

Use a federated multi-source architecture:

`SOURCE -> RAW SNAPSHOT -> HASH -> PARSER -> NORMALIZED RECORD -> RECONCILIATION -> CANONICAL VIEW -> PRODUCT API -> CLIENTS`

Each provider adapter is isolated behind the same interface. Adding or removing a provider must not change downstream schemas.

The canonical system should be a dedicated election data service backed by Postgres. Let's Go Vote This Time remains a lightweight public client and should not become the sole database or ingestion worker.

### Core service responsibilities

1. Source registry
2. Poll ingestion
3. Election-result ingestion
4. Immutable raw payload storage
5. Normalization
6. Entity mapping
7. Reconciliation
8. Connector health
9. Change-event generation
10. Public read API
11. Internal provenance/audit API
12. Realtime publication
13. Historical grading after final results

## 4. Source hierarchy

### Polling sources

Ingest when licensing and access permit:

- Decision Desk HQ polling data/API
- pollster-published toplines and methodology pages
- pollster-published crosstabs/questionnaires
- media sponsor releases
- public historical datasets such as FiveThirtyEight archives where licensing permits reuse
- campaign/internal polls, always labeled as internals
- high-quality public polling aggregators as discovery/corroboration sources, not substitutes for original evidence when the original is available

Poll discovery and poll evidence are separate concepts. A poll may be discovered from an aggregator but should resolve to the pollster/sponsor's original release whenever possible.

### Election-result sources

Priority order:

1. official state election authority
2. official county/local election authority when the state delegates reporting
3. AP Elections API
4. Decision Desk HQ
5. structured election-night systems such as Clarity/ENR where officially used
6. open-source aggregators that explicitly derive from official feeds, as fallback/corroboration

Commercial feeds provide speed and normalization. Official election authorities remain the underlying source of record for official/certified totals.

### Prohibited shortcuts

Do not make scraped television-network or newspaper result pages the canonical source when an official or licensed machine-readable feed is available.

Do not infer missing vote totals, race calls, turnout, or ballot-type splits from commentary.

## 5. Canonical data model

### Shared entities

- `elections`
- `jurisdictions`
- `contests`
- `candidates`
- `reporting_units`
- `source_registry`
- `source_entity_mappings`
- `raw_source_snapshots`
- `connector_runs`
- `change_events`
- `source_discrepancies`

### Polling entities

- `pollsters`
- `poll_sponsors`
- `polls`
- `poll_populations`
- `poll_samples`
- `poll_questions`
- `poll_options`
- `poll_results`
- `poll_crosstabs`
- `poll_methodology`
- `poll_source_documents`
- `poll_internal_disclosures`
- `pollster_cycle_scores`
- `polling_averages`
- `average_components`

### Election-result entities

- `result_snapshots`
- `candidate_results`
- `vote_type_results`
- `reporting_progress`
- `vote_drops`
- `race_calls`
- `official_winner_events`
- `certification_events`

All source-derived records must carry provenance sufficient to resolve back to the source registry and the immutable raw snapshot used to produce the normalized record.

## 6. Poll Watch methodology

Poll Watch must never expose a single unexplained average as the only view.

For each race or question, support:

- raw polls
- Poll Watch average
- likely voters only
- registered voters only
- exclude internal polls
- high-quality pollsters only
- mode filters where sample size permits
- 7 / 14 / 30 day windows
- pollster-specific history

Every poll receives a transparent Trust Card containing, when available:

- pollster
- sponsor
- field dates
- publication date
- population (LV/RV/adults/etc.)
- sample size
- mode
- weighting disclosure
- questionnaire availability
- crosstab availability
- sponsor disclosure
- internal-poll status
- original source links
- historical error metrics once enough comparable history exists

Trust Cards describe evidence quality and disclosure. They are not ideological ratings.

### Polling average rules

The averaging methodology must be versioned and documented.

At minimum it should account for:

- recency
- sample size
- population type
- pollster historical performance once enough data exists
- duplicate/overlapping samples
- internal poll status
- repeated releases from the same underlying sample

The database must retain the exact component polls and weights used for every published average version so the number is reproducible later.

## 7. Poll movement and disagreement

### Movement

Store time-series snapshots of each published average. A movement view must distinguish:

- new polls entering
- older polls aging out
- methodology changes
- poll corrections
- electorate/population mix changes

The public explanation should never imply causation unless supported by evidence.

### Disagreement detector

When pollsters materially diverge, calculate dispersion and expose likely methodological differences where documented, such as:

- LV versus RV population
- mode
- field dates
- weighting choices
- demographic composition
- sponsor/internal status

Do not label a poll fraudulent or invalid merely because it is an outlier.

## 8. Election-result reconciliation

Never average vote totals from different result sources.

Each source keeps its own latest value and timestamp.

Example canonical state:

- AP: 812,441 votes, fetched 8 seconds ago
- official state: 812,390 votes, fetched 31 seconds ago
- DDHQ: 812,441 votes, fetched 11 seconds ago

The reconciler classifies the condition as one of:

- `agree`
- `freshness_lag`
- `mapping_mismatch`
- `material_discrepancy`
- `source_stale`
- `source_unavailable`
- `under_review`

The public API may choose an appropriate freshest display value according to deterministic source-priority rules, but the other values remain queryable and auditable.

## 9. Race-call separation

Race calls are not vote totals.

Store provider calls independently:

- AP call
- DDHQ call
- other licensed provider call
- official winner designation
- certified result

Public labels must identify who made a call. No LWV product or Perception output may visually imply an official call unless an authorized election authority supplied that status.

## 10. Source provenance and audit

Every raw source fetch should store:

- provider/source ID
- canonical source URL or endpoint identifier
- retrieved timestamp
- source-published timestamp when available
- HTTP/status metadata where useful
- payload checksum
- payload format
- parser version
- licensing/access classification

Raw source snapshots are append-oriented and must not be silently overwritten.

Corrections create new snapshots and change events.

Connector health records include:

- last attempt
- last success
- last data timestamp
- latency
- consecutive failures
- stale threshold
- last error class

This is the cross-product point where DataCenter.forum's source-observability patterns can be reused.

## 11. APIs

### Public API

Read-only endpoints for Let's Go Vote This Time and other public clients:

- current polling averages
- polls and Trust Cards
- race lists
- poll movement
- pollster scorecards
- current unofficial results
- reporting progress
- vote-drop timeline
- race-call attribution
- certification status

The public API must not expose provider credentials, private licensing payloads, internal notes, or raw personal voter data.

### Internal provenance API

Authenticated endpoints for:

- raw snapshot lookup
- source comparison
- discrepancy review
- connector health
- parser/version history
- source mappings
- correction history

Representative X, DataCenter.forum admin tooling, and Perception may use this internal surface according to least-privilege permissions.

## 12. Realtime behavior

During normal periods, ingest polling on source-appropriate schedules.

During Election Night:

- use provider-supported incremental-update mechanisms where available
- increase polling frequency without violating provider limits
- push normalized changes to clients via realtime/WebSocket/SSE infrastructure
- record every changed result snapshot
- degrade gracefully when one source fails

The client must show a visible stale/degraded state if the canonical feed exceeds its freshness threshold.

Do not display stale values as if they are live.

## 13. Let's Go Vote This Time public experience

Add first-class navigation for:

- Poll Watch
- Race Watch
- Pollsters
- Historical
- Live Results (activated for election events)

Poll Watch landing page should prioritize:

- generic ballot
- presidential approval where relevant
- Senate races
- House control/races
- governor races
- biggest 7-day movements
- newest polls
- high-dispersion races
- methodology controls

Election Night should prioritize:

- House control
- Senate control
- major statewide races
- reporting progress
- latest vote drops
- source agreement/discrepancy state
- attributed race calls

Voting-location and transportation tools remain clearly separated from polling/result intelligence so users do not confuse official voting guidance with analytical content.

## 14. Cross-product contracts

### Representative X contract

Representative X receives stable election, contest, candidate, poll, result, and provenance identifiers. It may deep-link to Poll Watch but must not fork the underlying records.

### DataCenter.forum contract

DataCenter.forum may reuse generic source-health and provenance components. Election-specific records must remain in the election namespace/service and must not become public data-center-industry content.

### Perception contract

Perception receives read-only normalized evidence plus provenance metadata and discrepancy state. Any analytical output is stored separately from source facts and labeled as inference/model output.

## 15. Security and privacy

- Provider API keys remain server-side only.
- RLS/authorization protects raw licensed payloads and internal source notes.
- Public poll/result data is read-only from clients.
- No voter registration records, exact voter locations, ballot choices, or individual vote histories are collected by Poll Watch.
- Existing Let's Go Vote This Time check-in privacy constraints remain unchanged.
- Logs must not leak credentials or private provider payloads.
- Backups and restore procedures must keep the canonical election database under LWV control.

## 16. Failure handling

Required behavior:

- One provider down: continue with remaining sources and mark degradation.
- Official feed stale: do not overwrite fresher commercial totals; show freshness state and retain official value.
- Commercial feed disagrees with official feed: preserve both, apply deterministic display policy, flag discrepancy.
- Mapping collision: quarantine affected race/reporting unit from automated reconciliation.
- Parser failure after upstream schema change: retain raw payload, mark connector degraded, do not publish malformed normalization.
- Duplicate poll: detect same underlying sample/release and avoid double-weighting.
- Corrected poll: retain original and correction lineage.
- Race-call reversal: preserve call history; never delete prior event.

## 17. Testing and verification

Before production activation:

- fixture tests for every provider parser
- duplicate-poll tests
- corrected-poll lineage tests
- cross-provider candidate/race mapping tests
- vote-total non-averaging tests
- freshness-lag versus discrepancy tests
- race-call attribution tests
- stale-feed UI/API tests
- access-control tests for licensed/raw payloads
- replay tests using historical election-night data
- load test for national Election Night update volume
- restore drill for canonical database

Use provider test-election/sandbox data where available before November 3, 2026.

## 18. Rollout sequence

### Phase A — canonical core

- shared schema
- source registry
- immutable raw snapshots
- connector health
- normalized election/race/candidate identity
- public/internal read APIs

### Phase B — Poll Watch

- polling adapters
- Trust Cards
- averages with reproducible components
- movement
- pollster profiles
- historical grading framework
- Let's Go Vote This Time Poll Watch UI

### Phase C — live results

- AP adapter
- DDHQ adapter
- official state/local adapters
- structured ENR/CDF adapters where available
- reconciliation
- vote drops
- realtime client updates
- attributed race calls

### Phase D — cross-product distribution

- Representative X consumer
- DataCenter.forum private source-health integration
- Perception read-only verification integration

### Phase E — post-election grading

- official/certified final result ingestion
- pollster error scoring
- race-level polling error
- 2026 methodology archive
- preserved historical dataset for 2028

## 19. Non-goals

For V1 do not:

- predict individual voter behavior
- infer unreported votes
- create proprietary race calls presented as official
- mix self-reported `I VOTED` check-ins with official turnout
- scrape protected/licensed result pages in violation of provider terms
- duplicate the canonical database inside each LWV property
- expose DataCenter.forum's industry audience to unrelated election content

## 20. Locked decisions

1. Let's Go Vote This Time is the public home of Poll Watch and Live Results.
2. Legacy Works Ventures owns the shared Election Data Core.
3. Representative X consumes the shared data for candidate/accountability context.
4. DataCenter.forum contributes/reuses source-observability patterns but remains publicly focused on the data-center industry.
5. Perception verifies and explains; it does not own canonical election state.
6. Raw source evidence is append-oriented and auditable.
7. Vote totals from independent providers are never averaged.
8. Race calls, unofficial totals, official totals, and certification are separate statuses.
9. Poll averages must be reproducible from stored component polls and weights.
10. The system must remain useful when any single commercial provider fails.
