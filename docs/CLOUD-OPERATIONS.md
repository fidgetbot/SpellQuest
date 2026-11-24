# Cloud Word Quest operations

Implemented 2026-11-24. No public sign-up, passwords, emails or PINs.

## Endpoints

- Game: https://word-quest.up.railway.app/
- Read-only dashboard: https://word-quest.up.railway.app/dashboard
- Import: https://word-quest.up.railway.app/import
- Existing-browser export: https://fidgetbot.github.io/SpellQuest/transfer.html

The dashboard URL is not a bearer credential. Every data request checks the HttpOnly browser session's supervisor grant. The shared browser can be authorized for both play and supervision; it intentionally does not distinguish parent and child using that browser. No dashboard button is shown in gameplay.

## Build and test

Node 24, `npm ci`, `npm test`. The test suite covers local game regressions, the cloud reducer's full campaign, SQL API integration using PGlite, and encrypted snapshot restoration. Browser checks use Playwright; install Chromium with `npx playwright install chromium` when needed.

For isolated local browser tests, run `TEST_SETUP_FILE=/private/path.json node scripts/test-server.cjs` in one terminal, then set the same TEST_SETUP_FILE for `node scripts/test-browser.cjs` and `node scripts/trial-browser.cjs`. The server uses disposable in-memory PostgreSQL and listens only on 127.0.0.1:8770. Both suites use distinct synthetic accounts and consume one-time setup tokens. Restart the fixture server to rerun. For hosted checks, additionally set TEST_URL. Never run smoke tests against a real player's profile.

## Deployment

Railway project `word-quest`: a `web` service, private `Postgres` service and private `quest-backups` bucket. The web service and database are in us-east4-eqdc4a; the bucket uses iad. No public database TCP proxy was created.

Infrastructure authoring is `.railway/railway.ts`; old railway.json was removed. Variables are unmanaged by IaC so applying infrastructure never overwrites secrets. This partial manages only the web service. Database/bucket resources were separately provisioned and are intentionally not deletion candidates.

Run `railway config plan`, review changes, then `railway config apply --yes`. Deploy a reviewed checkout with `railway up --service web --detach`. Check the resulting deployment, `/readyz`, and the actual rendered site. A successful upload is not proof of deployment.

The Dockerfile runs as a non-root user, serves only explicitly allowed runtime files, and installs production dependencies only. PostgreSQL migrations run at startup in a transaction with an advisory lock. Startup/readiness fails on migration errors. Sessions and saves survive restarts. One replica is configured; API operations use database row locks and writer fencing.

## Variables

- DATABASE_URL: reference to Postgres's private database URL.
- APP_ORIGIN: exact canonical HTTPS origin.
- NODE_ENV=production.
- BACKUP_ENDPOINT, BACKUP_BUCKET, BACKUP_REGION, BACKUP_ACCESS_KEY, BACKUP_SECRET_KEY: private S3-compatible bucket configuration.
- BACKUP_KEY: 32 random bytes, base64 encoded, for AES-256-GCM encryption. Preserve an operator recovery copy outside Git and separate from the primary database.

Never print variable lists to chat, put credentials into command arguments, commit setup links, or capture them in screenshots.

## Account maintenance

Run operator commands inside the web service through authenticated Railway SSH so the database remains private:

- `node scripts/account-admin.js create Explorer` prints a non-secret player ID.
- `node scripts/account-admin.js setup PLAYER_ID /tmp/player-setup.txt` writes a private single-use player setup link.
- Append `--supervisor` to authorize the shared/parent browser for both capabilities.
- `node scripts/account-admin.js sessions PLAYER_ID` lists session IDs, labels, privileges, last seen and revocation state.
- `node scripts/account-admin.js revoke SESSION_ID` immediately revokes that browser, without deleting progress.

Retrieve setup files through an authenticated channel into a private local file and deliver only in the parent's private chat. Links expire in 30 minutes; normal sessions expire after 90 idle days and renew during authenticated use. Operator recovery means issuing another setup link, not resetting the campaign. Browser permissions are fixed by the setup token, never chosen by the untrusted client.

There is no reset-progress endpoint or UI. A new campaign after completion currently requires operator maintenance; do not delete or replace a real campaign without an explicit request and a fresh backup. Nicknames are display labels only and can be changed without changing player IDs.

## Sync guarantees and limits

- Cloud saves are authoritative. Browser IndexedDB holds the last acknowledged snapshot, pending action, draft and retained conflicting recovery copies. Browser session credentials are never stored there.
- Each command includes an idempotency ID, revision, campaign ID and writer fencing generation. State/event updates are one transaction.
- Draft keystrokes are coalesced. Wrong attempts, hint-used flags, puzzle layout, pending victory and interlude are persisted.
- A 90-second writer lease is refreshed every 25 seconds while visible. Another tab/browser must explicitly choose Continue here while that lease is active. Reloaded tabs receive a new tab ID and may also require takeover; this is intentional in v1 to avoid duplicated-tab ownership.
- A connection outage preserves the current answer and pauses progress. Retry handles an already-committed action whose response was lost. Conflicts retain a recovery copy instead of silently merging or overwriting newer progress.
- Idempotent response records are retained for seven days. Older retry IDs cannot replay rewards because their revision/generation is stale.
- Full offline play, self-service resets, shared-human identity distinction and classroom management are not implemented.

## Migration

The original GitHub Pages game stays local-only and unchanged in behavior. Use transfer.html on the exact browser containing the old save, download JSON, then import on an authorized cloud browser. Preview shows mastery, realm, stars and hearts. Imports validate the roster and totals, retain the original snapshot, and refuse to replace an existing campaign. Reimporting the same file is safe.

Do not choose Begin the quest on the cloud site before importing if you want the old progress: an existing cloud campaign requires operator assistance to replace. No automatic redirect from GitHub Pages is installed. Actual family migration remains a parent-performed action because the server cannot read another origin's localStorage.

## Backups and restore

Built-in volume snapshot entitlement was uncertain, so the implementation does not depend on it. The app checks on startup and hourly whether a backup is due. Every 24 hours it creates a transactionally consistent logical snapshot, compresses and encrypts it with AES-256-GCM, then uploads it to the separate private bucket. Seven daily and four weekly restore points are retained (overlapping points may be shared). It also prunes old command responses and rate-limit windows.

The encrypted snapshot contains players, setup tokens, sessions, campaigns, retry responses, learning events and original imports. Schema is recreated from version-controlled migrations. The encryption key is essential; do not rotate/delete it without migrating existing backups.

- Force a snapshot in the web container: `node scripts/backup-now.cjs`. Output is an object key, not a signed URL.
- Verify a hosted backup locally: `node scripts/backup-restore.cjs OBJECT_KEY`. This fetches bucket credentials without printing them, downloads/decrypts the object and restores into an isolated PGlite database. It verifies counts in all seven tables; it does not change production.
- Real recovery: freeze writes, back up the current database, migrate an empty replacement database, then call `restoreEmpty` with the decrypted snapshot. It refuses a nonempty destination, restores sequence position, revokes all restored browser sessions and expires restored setup tokens. Reauthorize browsers after recovery.
- An application image rollback must not run destructive down migrations or silently restore an older database.

Successful jobs log `Encrypted backup completed`; failures log `BACKUP_FAILED` without secrets. `backup_runs` records the last successful object/time. This is in-app scheduling: if the app is down or paused, backups resume on startup. No external outage notification has been configured. Check last successful backup during operator maintenance; an independent alerting service can be added later.

## Reporting definitions

The read-only dashboard includes per-word and per-trial submissions, correct submissions, clean wins, practice completions and hints; daily activity and recent outcomes; mastery and story position; filters and word detail.

Clean visit rate uses completed visits only. Answer accuracy uses nonblank submissions only. Imported old attempt totals are labelled legacy and excluded from those rates because older saves count blank checks and contain no dated outcome history. Daily grouping uses Pacific time. No analytics vendor or raw-answer event log is used; short-lived retry snapshots can contain the saved current draft.

## Verification record

- 34 automated checks passed (26 original gameplay checks plus cloud and backup checks).
- Browser tests passed locally and on Railway using isolated synthetic profiles: setup, supervisor isolation, failed/hinted visit persistence, takeover fencing, corrected practice, pending-story resume, import, Fading Script layout persistence, offline Voice Trial draft recovery, lost-response retry and exactly-once mastery.
- Real family device setup/import is intentionally not claimed by automated checks.

## Address update (2026-11-24)
The sole cloud address is https://word-quest.up.railway.app . At Nicolas's request, the original generated Railway domain was deleted and ADDITIONAL_ORIGINS removed. APP_ORIGIN remains the primary URL. Saved progress is unchanged. Cookies are host-only: authorize the new address once if only the old address was previously authorized. Browser setup links are single-use credentials delivered privately; there is no public registration URL.
