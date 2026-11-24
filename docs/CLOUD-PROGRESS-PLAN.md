# Word Quest: cloud progress and supervisor dashboard

Status: implementation plan, not implemented or deployed.
Agreed design and read-only Railway preflight: 2026-11-24.

## 1. Scope and product decisions

- One child/player and one parent/supervisor. No public registration, email, passwords, PINs, or self-service recovery.
- Authorize each browser once through a private, single-use, expiring setup link. Persist an opaque session in a secure cookie.
- Browser permissions: player-only or player + supervisor. The shared browser may have both permissions; this intentionally does not distinguish the human currently using that browser.
- The ordinary `/dashboard` URL grants nothing. Every dashboard API request requires supervisor permission. No dashboard button or account-switching controls in the game.
- Dashboard is read-only. Maintenance, browser revocation, recovery and account changes happen through operator commands run by Fidget on explicit request.
- Preserve game mechanics, artwork, story, existing progress and the uncluttered interface.
- Minimal additions to play UI: setup-required state, discreet sync status, and actionable connection/conflict messages.
- No public leaderboards, classroom management, payments, email delivery, Redis, or realtime sockets in v1.

## 2. Architecture and code boundaries

One Railway project with a Node.js web/API service and PostgreSQL, in the same region. Serve the game and dashboard from the same HTTPS origin. Use the Railway-generated domain initially; a custom domain is optional.

Use an explicit Dockerfile with a pinned supported Node LTS major, lockfile-based npm installation, and a small HTTP framework plus PostgreSQL driver and request-schema validation. Add `npm start`, `npm run migrate`, `npm run test:integration` and `npm run test:browser`. Bind to `0.0.0.0:$PORT`; no runtime files on ephemeral disk are authoritative.

Proposed modules:
- `server/app.js`: routing, same-origin checks, static-file allowlist, errors and health endpoints.
- `server/auth.js`: setup redemption, hashed session lookup and server-side grants.
- `server/progress.js`: transactional commands, revisions, writer leases and imports.
- `server/reporting.js`: dashboard aggregates and word detail.
- `shared/progression.js`: pure, versioned game-state transitions shared with browser tests.
- `client/sync.js`: hydration, browser cache, pending commands and sync status.
- `dashboard/`: independent read-only page, styles and scripts.
- `db/migrations/`: ordered, versioned SQL migrations.
- `scripts/account-admin.js`: initialize family/player, issue setup, list/revoke sessions.

Serve only runtime assets, not the repository root wholesale. Exclude `.git`, source PNGs, docs, tests, database scripts and admin utilities from public routes. Keep the existing frontend largely intact rather than introduce a framework rewrite.

## 3. Data model

Use stable generated identifiers; nicknames are labels, never credentials.

- `families`: household identifier.
- `players`: household, nickname, creation timestamp.
- `browser_sessions`: hashed random credential, household/player grant, supervisor flag, expiry, last seen, revocation timestamp and an operator-friendly browser label.
- `setup_tokens`: hashed random token, predetermined grants, expiry and redeemed timestamp.
- `campaigns`: player, roster version/frozen roster, rules version, narrative version, validated JSON state, revision, status and creation/update timestamps.
- `writer_leases`: campaign, session/tab identifier, fencing generation and expiry.
- `commands`: campaign, unique idempotency key, expected revision, canonical payload hash, result revision and response. Reusing an ID with a different payload fails.
- `learning_events`: campaign, visit, word, trial, event kind, result, hint usage, server timestamp and optional client occurrence timestamp. Unique command association prevents duplicate events.
- `save_imports`: source digest, schema version, original validated snapshot, result and timestamp.
- `schema_migrations`: database version tracking.

Keep original imports and bounded recovery snapshots; never place child progress or browser credentials in Git. Campaign resets create a new campaign identity, never repurpose an old ID that stale browsers could overwrite.

## 4. Browser authorization

1. Operator creates the household/player and issues a setup link with exact grants and a 30-minute expiry.
2. Deliver the link privately to the requesting parent, never to the group or repository.
3. Put the token in the URL fragment, not a query/path; read it into memory and clear the fragment before loading other resources. A deliberate Continue action redeems it via POST so link previews do not consume it.
4. Redemption atomically marks the token used and creates a session. Concurrent or repeated redemption cannot create extra grants.
5. Set a Secure, HttpOnly, SameSite=Lax, host-only cookie. Default 90-day idle lifetime, renewable during authenticated use; revocation is immediate server-side. Cleared cookies or expiry require new setup, not loss of saved progress.
6. No session credential in localStorage. Store only credential hashes in PostgreSQL. Do not log cookies, setup payloads or full URLs containing tokens.
7. Validate Origin/CSRF protection on mutations, reject cross-origin API use, apply setup/API rate limits and payload limits. Supervisor responses use private/no-store caching; no third-party analytics on authenticated pages.
8. Grants always come from the database, not a browser-provided player ID or role.

Player-only sessions receive 403 on supervisor APIs; unauthenticated requests receive 401 with no player data. Merely knowing `/dashboard` is insufficient. Grant revocation does not delete progress.

## 5. Progress synchronization and conflict policy

The server is authoritative. Extract the progression reducer before networking so clean wins, practice visits, hearts and story boundaries have one tested implementation.

Persist the current visit as well as campaign totals: visit ID, word, trial, puzzle layout/seed, hint-used flag, failed-visit flag, submitted attempts, current draft where appropriate, pending victory and interlude. Existing saves omit some of these transient flags; do not reproduce that gap in cloud sync.

Commands include start/resume visit, submit answer, request hint, continue story and enter next realm. Blank submissions do not count as learning attempts. Validate spelling and derive rewards on the server rather than accepting arbitrary client totals. Coalesce draft edits separately; they never earn rewards. Audio replays remain free.

Each mutation carries campaign ID, command ID, expected revision and writer generation. Within one PostgreSQL transaction: validate grant and lease, check idempotency, verify revision, apply reducer, append events and commit new revision. Returning the same committed result after a retry cannot duplicate stars, hearts or mastery.

One active writer per campaign, including across tabs. Proposed lease: 90 seconds with a 25-second heartbeat while active. A second browser may inspect its current save and explicitly take over. Takeover increments a fencing generation, so the previous browser's writes are rejected even if it returns later. Expired leases can be reacquired only after reconciling cloud revision.

On launch/focus, fetch cloud state before allowing new progress. Restore the pending story screen exactly; never automatically skip it. Cache the last acknowledged state and pending commands per account/campaign in IndexedDB.

For v1, prioritize reliable resume over unrestricted offline play:
- On connection loss, retain the current draft and any pending command locally; show Waiting to sync and pause progression-changing actions.
- Reconnect retries pending commands with the same IDs. If the acknowledgement was lost, retrieve the committed result.
- On revision/writer conflict, stop writes, retain the unsynced recovery copy and load the newer cloud state after informing the player. Do not silently merge competing play sessions or sum rewards.
- No full offline campaign support/service worker in v1; specify that clearly rather than promise an untested merge system.

A new browser sees only server-acknowledged progress. Never label an unacknowledged action Saved.

## 6. Existing-save migration

GitHub Pages and Railway are different origins: the new app cannot directly read the existing localStorage save.

Use an explicit JSON export/import flow for v1:
1. Add a small standalone transfer page on the existing GitHub Pages origin. It reads `spellQuestMasteryV1`, summarizes progress and downloads a versioned JSON save. It never deletes or edits the original.
2. On the authorized Railway browser, import the file with a preview of mastery/realm/totals before confirmation.
3. Validate size, types, roster consistency, tiers, hearts and version; reuse and tighten existing reconciliation rules. Store an immutable source copy/digest and mark history as imported.
4. Import into an empty cloud campaign only. If a cloud campaign already exists, show both summaries and require operator assistance; no automatic overwrite or speculative merge.
5. Reimport of the same file is idempotent. Multiple old-browser saves remain separate candidates rather than being combined.
6. Start newly dated metrics at import time. Legacy attempt counts include blank checks and lack clean-win/hint history; display them as legacy totals, not comparable accuracy statistics.
7. Do not redirect the old site before transfer works. After cutover, leave the transfer page available and clearly identify the old game as local-only to avoid divergent continued play.

## 7. Dashboard v1

Separate `/dashboard` page; supervisor-granted browser session required. Read-only, responsive phone/desktop layout, refresh on opening and at a modest interval while visible. Show data freshness and synchronization delay.

Overview:
- Player nickname, current realm and story completion.
- Mastered / frozen roster size; active and queued words.
- Last synced activity and recent activity by day/week.
- Clean advancements, practice completions and hint usage since cloud tracking began.

Word table/detail:
- Mastered, active or queued; current trial.
- Nonblank submissions, incorrect submissions, clean visits, corrected practice and hints, broken down by trial.
- Last practiced and recent outcome timeline.
- A transparent needs-practice list based on recent failed/hinted visits, not a diagnostic claim.

Metric definitions:
- First-attempt clean rate = eligible completed visits advancing without an earlier nonblank error or hint / all completed visits in the same period.
- Submission accuracy = correct nonblank submissions / all nonblank submissions; keep separate from clean rate.
- Imported legacy totals shown separately; no invented dates, accuracy or hint counts.
- Use America/Los_Angeles for day grouping, store UTC. For queued/offline records distinguish occurrence time from server receipt time where known.
- Avoid raw typed answers and time-on-task measurement in v1; outcomes are sufficient and idle time is misleading.

## 8. API outline

- `POST /api/setup/redeem`: single-use setup redemption.
- `GET /api/session`: minimal player label and authorized capabilities.
- `POST /api/session/logout`: revoke this session.
- `GET /api/campaign`: current canonical state and revision.
- `POST /api/campaign/lease`: claim/renew/explicitly take over writer.
- `POST /api/campaign/commands`: validated, idempotent gameplay commands.
- `POST /api/campaign/import/preview` and `/confirm`: validated migration.
- `GET /api/dashboard/summary`, `/words`, `/words/:id`, `/activity`: supervisor-only projections, scoped to the assigned player.
- `GET /healthz`: process health; `GET /readyz`: database connectivity and compatible schema, without sensitive details.

No public HTTP admin endpoint for issuing grants, resetting accounts or exporting all users.

## 9. Railway preflight evidence (read-only)

Verified on 2026-11-24 using Railway CLI and live GraphQL schema/query:
- CLI authenticated; account belongs to the intended workspace as ADMIN.
- Workspace plan HOBBY; billing state ACTIVE; usage subscription enabled, not trialing.
- No pending 2FA access restriction reported.
- Four existing projects; API reports project allowance 50, service allowance 50 per project and volume allowance 10 per project. Capacity is adequate for this design; these are limits, not reserved resources.
- No configured workspace usage-limit object was returned. No budget cap or alert was changed.
- No Word Quest project/service/database has been created.
- CLI supports explicit workspace/project/service deployment, PostgreSQL provisioning and direct source upload. GitHub integration is not required for the initial deployment and has not been verified.
- Repository was clean and aligned with origin/main at preflight. Current app remains static: no HTTP server, production start script, DB schema, session system, cloud-save implementation or Railway config exists yet.

Unresolved checks, not claims of readiness:
- Current aggregate spend query stalled and was cancelled; remaining billing headroom/current month spend is not verified. Active subscription is not a cost quote.
- API reports zero allowed volume backups, while generic docs describe scheduled backups. Do not assume built-in backups can be enabled on this workspace.
- Project creation/deploy operations have not been exercised because this is a planning-only request. Admin role supports eligibility but is not a successful deployment test.
- Region availability, actual PostgreSQL allocation, domain/HTTPS issuance, build success and real device cookie behavior require the staging deployment.

Reference docs checked: https://docs.railway.com/pricing/plans and https://docs.railway.com/volumes/backups . Published Hobby base price is $5/month; actual incremental cost depends on app/database memory, CPU, storage and egress. The workspace already has a subscription: do not treat the base fee as a second project fee or promise unused credits. Review measured staging usage before production.

## 10. Deployment, operations and rollback

1. Implement and verify locally on a feature branch; leave GitHub Pages gameplay intact.
2. Create a dedicated Railway project, app service and PostgreSQL. Use synthetic data in staging, never a production copy with live session credentials.
3. Reference the private database URL in app environment variables; configure canonical APP_ORIGIN and production runtime settings. No credentials in code, screenshots, command arguments or logs. Keep database traffic private.
4. Add Dockerfile, `.dockerignore` and Railway config with explicit start/health commands. Pin dependency/runtime versions. Configure bounded DB connection pool and request/body timeouts.
5. Apply transactional migrations as a predeploy/release step with a migration lock. Readiness fails on incompatible schema. Deploy one app replica initially; sessions/leases remain in PostgreSQL, never process memory.
6. Set up HTTPS generated domain and verify secure cookies on actual intended browsers (including the shared device). Disable sleep if it makes first-save behavior unreliable; measure before deciding.
7. Establish automated daily logical `pg_dump` backups to private storage separate from the primary database volume, encrypted at rest; retain seven daily and four weekly backups. Verify storage access/cost before provisioning. Built-in snapshots are supplementary only if entitlement is confirmed. Keep pre-migration backups.
8. Restore a backup into an isolated database and verify campaign state, event counts and operator ability to revoke sessions. Target at most 24 hours data loss for total database loss and restoration within one working day; validate rather than promise the target before rehearsal.
9. Log sanitized command IDs/status, errors and revision conflicts; no tokens or raw child answers. Document backup failure detection, auth failure, save failure and readiness monitoring. Agree a budget alert before launch; do not apply a workspace-wide hard shutdown cap to unrelated projects without approval.
10. Run staging acceptance suite, then deploy production, create real profiles and deliver one-time setup links privately. Parent performs export/import on the old-save browser; Fidget cannot read that browser's localStorage remotely.
11. Validate cross-browser continuity with the parent before changing the old site entry point. Keep the migration path accessible.
12. Roll back application image independently of data. Use additive/backward-compatible migrations; no automatic destructive down-migration. If restoring data is required, freeze writes, back up current data and review lost-progress window. Never send users back to old local-only play as if it were cloud-synced.

## 11. Work packages and acceptance gates

### A. Shared progression and persistence contract
- Extract pure transition functions; version state and serialize active visit.
- Preserve current mastery, heart, capitalization, frozen roster and story-boundary behavior.
- Gate: existing gameplay regression suite plus focused visit reload/clean-win tests pass.

### B. Backend and browser authorization
- Implement SQL migrations, setup tokens, sessions, grants, admin CLI, health/readiness.
- Gate: single-use/expired token tests, revocation, unauthenticated rejection, player/supervisor separation and cross-household denial. Correct secure cookie/CSRF behavior.

### C. Cloud save integration
- Implement commands, revisions, lease fencing, draft persistence and local retry queue.
- Gate: two independent browser contexts resume the same state; duplicate request/timeout cannot duplicate rewards; takeover fences old tabs; lost connection preserves unsynced work and cannot overwrite a newer save. Wrong/hinted visit survives browser switch. Pending victory/interlude resumes without skip.

### D. Migration and reporting
- Export old save, validate/preview/import; implement event projections and dashboard.
- Gate: import preserves original save and progression, repeat import safe, conflicting saves never overwrite silently; dashboard matches seeded event fixtures and marks legacy metrics honestly. Direct API requests cannot bypass browser permissions.

### E. Staging and release
- Build/deploy, configure backup job and monitoring, test restore, measure resource usage.
- Gate: restart/redeploy keeps progress; backup restore passes; 360/390px and desktop UI checks; real browser device setup and shared-browser supervisor behavior verified. Run all gameplay regressions since this upgrade changes persistence and action flow.
- Production gate: successful real save transfer and a second-browser resume confirmed by the parent, with last-known-good deployment and documented rollback available.

## 12. Remaining user input (does not block initial implementation)

- Preferred child nickname; use a synthetic placeholder during development.
- Which browsers receive supervisor permission when issuing setup links.
- Parent completes the old-browser save export/import and real-device validation.
- Hosting budget preference before launch. No PIN, email or password decision remains open.

This document authorizes no deployment by itself. It records the requested plan and the evidence from read-only readiness checks.
