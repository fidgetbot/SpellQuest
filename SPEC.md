# SpellQuest specification

## Purpose

SpellQuest is a fifth-grade spelling mastery game. Success in increasingly difficult spelling trials advances an RPG campaign and earns graphic victory jewels.

## Word bank and active roster

- `words.js` is the authoritative editable word bank.
- Slash-separated entries become separate words. Duplicate entries are removed case-insensitively while preserving first occurrence order, except for the intentional `Mom`/`mom` capitalization pair.
- Phrases remain single spelling entries.
- `Mom` and `mom` remain separate, case-sensitive capitalization lessons.
- No more than 10 unmastered words may be active at once.
- When an active word is mastered, the next queued word immediately fills the open slot.
- A campaign freezes its word roster when created (or migrated). Later bank additions enter new campaigns rather than changing the length of an existing story. Historical roster entries are retained if removed from the authoring bank; a generic audio-based definition fallback is available when an old definition no longer exists.

## Mastery loop

Each word advances through exactly three trials:

1. **Rune Path:** The complete word is visible. The player chooses all letter runes in order.
2. **Fading Script:** The word remains visible in incomplete form, and the player supplies more than half of its letters using selectable blank buttons and the shared in-game keyboard, never native text inputs.
3. **Voice Trial:** The written word, hints, and letter pool are removed. The player hears the word and enters it completely from memory using a full in-game keyboard.

A word is mastered only after a correct Voice Trial. Incorrect answers never advance the word. Hints are available only in the first two trials. Replaying the spoken prompt is allowed and does not reduce mastery.

Advancement requires a clean visit: the first nonblank submitted answer must be correct and no hint may have been used. After any wrong submission or hint, later correction completes only a practice visit; the word rotates back into later challenges at the same tier. This clean-visit gate also applies to the Voice Trial, so a jewel can never be earned after guessing incorrectly earlier in that visit.

During Rune Path and Fading Script, incorrect letters are marked red only when Check answer (or Enter) submits the answer. Editing or removing a marked letter clears its mark; newly entered letters remain neutral until another submission.

Hearts replace the former Focus counter. New campaigns start with 5 hearts, capped at 10. Completing any challenge (including a corrected practice visit) restores 1 heart exactly once. A submitted nonblank wrong answer costs 1 heart, and using a hint costs 1 heart. Blank checks, definitions, and audio replays are free. Hearts never fall below zero; zero hearts never block answering, but hints require a heart and remain limited to one per visit in the first two trials. The hint button displays its price. Hearts persist across reloads and chapters. Older saves without a heart balance start with 5 hearts while retaining campaign progress. Starting a new campaign resets hearts to 5.

After every successful trial, the game displays its complete story blurb and waits indefinitely. Progression occurs only when the player activates the visible Continue Story control; success must never schedule automatic advancement.

Each Hear word click speaks only the target word once, without introductions, context sentences, or repetition. Spanish entries use a Spanish speech locale when supported. The free visible definition supplies meaning for homophones. Voice Trial answers use a non-editable display and a target-independent on-screen QWERTY keyboard with Shift, accented letters, apostrophe, hyphen, space, backspace, and clear. No native typing field, predictive suggestions, or paste entry is available. Keyboard buttons support Tab and Enter/Space activation.

Child-friendly definitions appear immediately beneath the challenge heading in all three trials, without revealing the target spelling. The complete current bank has local definitions in `definitions.js`; no network lookup is required.

## Campaign and victories

- Each mastered word earns one deterministic jewel whose color is derived from the word itself.
- The jewel is shown in the success moment and retained in the Victory Vault.
- Each active word has a generated RPG location derived from the word itself, so locations and jewel identities stay stable across sessions.
- The quest surface is a geographic RPG map with connected illustrated paths and eight inspectable story-scene landmarks per realm. The current marker follows canonical story progress, independently of the active spelling-word cursor.
- While a spelling challenge is active, the target word must never be visible elsewhere on the page—not in a roster, map node, status, instruction, tooltip, or accessibility label. The Rune Path shows only its shuffled pool, Fading Script shows only puzzle-retained letters, and the Voice Trial supplies the target through audio. The word may appear after a correct submission because the attempt has ended.
- The twelve narrative realms contain 93 clean trial advancements each for the current 372-word roster. The active ten-word roster may span realm boundaries.
- Every 93 advancements, Continue story opens a realm interlude. Continuing preserves the active roster, partial tiers, jewels and hearts. Completing the frozen roster produces the final Crown of Lexicon ending.

## Persistence

The original GitHub Pages edition saves locally without accounts. The Railway edition stores authoritative campaign and active-visit state in PostgreSQL, with a browser recovery cache and revisioned, idempotent commands. One-time browser setup grants play or play + supervisor access; no emails, passwords or PINs. Offline progress pauses while preserving the current draft. See docs/CLOUD-OPERATIONS.md for sync and migration guarantees.

## Accessibility and device support

- Essential interactions use native buttons or inputs and work by keyboard.
- Enter checks an answer or advances after success.
- The Voice Trial has a visible replay control and a text fallback when speech synthesis is unavailable.
- Layout must remain usable at 360px width without horizontal overflow.
- Color is supplemented by text, trial dots, and labels.

## Out of scope

Handwriting recognition, public registration, classroom management, timers, punitive scoring, and automatic dictionary definitions.

## Deployment

The static game is published from the root of `main` through GitHub Pages at `https://fidgetbot.github.io/SpellQuest/`.

## Storybook visual design
- Generated map, woodland ruins, golden library, and moonlit observatory share a four-tile environment atlas. Source PNG is preserved in assets/source; runtime uses compressed WebP.
- Each realm has a distinct scenic backdrop from the twelve-realm atlas, shared across all three trial types, with a quiet parchment reading area. Realm-boundary victories keep the outgoing background until Continue story. All text, answer controls, counters, and map progress remain live HTML.
- Gold star and ruby heart counters lead the HUD. Mastery and streak remain secondary statistics.
- Phone layout places a compact map above one active trial. Explore map expands the map and victory vault; short phone screens collapse map artwork by default. Desktop uses two columns.
- Voice audio sits above the answer and in-game keyboard. Visible focus styles and at least 44px-high keyboard keys support interaction; reduced-motion settings disable decorative animation.

## Player-led adventure (version 2)
- Twelve distinct realms, 96 authored scenes, 1,116 individually written sentences, stored in story/realms and compiled into story-content.js.
- Read story/BIBLE.md for character continuity, object custody, consequences, and content-review notes.
- Main plot advances only on a clean tier advancement or mastery, not corrected/hinted practice visits. Practice still restores one heart and gives recovery feedback.
- Canonical progression derives from three advances per mastered word plus partial tiers of active words; it does not trust the old raw-completion story counter.
- With the 372-word roster, every advancement unlocks exactly one beat. Frozen rosters of other lengths are proportionally mapped to the same authored campaign, rather than looping its content.
- Every beat has a stable ID, scene, previous-beat prerequisite and explicit milestone effects. Party/equipment/map state derives from unlocked canonical progress.
- The current realm has distinct generated map artwork; earned companions and narrative equipment remain listed. The twelve-realm thumbnail grid is omitted to keep the expanded map compact; unlocked realm histories remain available through the adventure journal.
- Realm names and reward labels that contain the current target are suppressed on the answer surface. The journal is modal, pauses answer interaction, and removes its prose from the DOM on close.
- The full unlocked journal contains scene text and realm summaries; it never reveals future plot.
- Version-1 saves retain mastery, partial tiers, stars and hearts. Canonical placement derives from earned advancements; earlier new-story passages are explicitly marked as a migration recap, not previously played events.
- A persisted pending victory and interlude state preserve the story screen across reloads, without duplicate rewards or skipped realm transitions.
- No automatic advancement: the player controls Continue story and Enter next realm. Only full frozen-roster mastery unlocks the final resolution.

## Briarwood geographic map
- Briarwood uses a dedicated illustrated overhead map with connected painted roads, a stream and a bridge; no generic dotted SVG route is drawn over it.
- Eight live markers correspond to the eight authored scenes: gate, thorn wagon, stump shelter, workshop, mill courtyard, crossroads, village bell, river landing. Their coordinates were placed against the generated artwork, not reused from the roster layout.
- Markers advance with narrative scenes, not with the active-word cursor. They can be tapped for location/status but do not skip story or select words. Previous stops receive a completion mark.
- The map remains square at every viewport size so marker-to-landmark registration is preserved. Realm-boundary victories keep the outgoing map until Continue story.
- All twelve realms now use the geographic map treatment: standalone square artwork, eight registered landmarks, and no generic dotted overlay. `realm-maps.js` owns asset IDs and normalized marker coordinates; authored `sceneIndex` owns progress. Clicking a marker only updates its caption; it never skips story progression or changes the spelling roster. The original atlases remain archived for provenance and realm-specific challenge backgrounds, not active realm maps.

## Realm map completion
- Realm maps are individually generated, with setting-specific routes: archive walkways, city streets, desert trails, forest bridges, volcanic evacuation roads, sky-island crossings, coastal quays, observatory galleries, coalition roads, library corridors, and citadel rooms.
- Original PNGs and generation specifications are preserved under `assets/source/`; runtime WebPs are served from `assets/`.
- All map artwork retains its square aspect ratio on phones and desktops, including expanded mode. Realm-boundary victories retain the outgoing map until Continue story.
- Map captions and accessibility labels respect the current spelling target concealment rule.

## Button readability
- Journal prose styling excludes buttons, so Adventure journal retains the shared cream-on-teal button palette and bold weight, including in victory feedback.

## Concise challenge interface
- Trial headings and word definitions remain; redundant how-to sentences and keyboard helper captions are omitted across all three trial types.
- Voice answer output retains an accessible “Your answer” label without a visible instruction paragraph. Controls and gameplay are unchanged.

## Cloud edition (2026-11-24)
- Node 24 web/API service and private PostgreSQL on Railway; same-origin secure, HttpOnly browser sessions. Separate read-only /dashboard requires a supervisor grant on every data request. The URL itself grants nothing and is not linked from the game.
- One child account may be used from multiple authorized browsers; one active writer at a time. Takeover fences stale tabs. Wrong attempts, hints, puzzle layout, drafts, pending story and realm interludes survive resume.
- Export from the old origin with transfer.html; preview and import on /import. Existing cloud campaigns are never silently overwritten; original imports and local saves are retained.
- Learning events begin with cloud use; imported legacy attempts remain separate from accuracy and clean-visit rates. Per-word/per-trial detail, daily activity and recent events are available to supervisors.
- Encrypted logical backups use separate private object storage. Automatic in-app daily scheduling, bounded retention and isolated restore verification are implemented.
- No full offline play, email recovery, public signup, dashboard PIN, self-service reset or production migration of the child's actual browser save has been performed.
- Deployment uses Docker and .railway/railway.ts (unmanaged secret variables); GitHub Pages remains available and local-only until family migration is confirmed.

- Primary cloud URL: https://word-quest.up.railway.app . The original generated URL has been decommissioned. Mutations accept only the primary origin; authentication cookies remain host-only.

## Name/password login (2026-11-26)
- `/login` accepts case-insensitive names and passwords (Unicode NFKC then lowercase; surrounding username spaces ignored, password spaces preserved).
- Niko is the player login; Gaea is the parent login linked to the same existing player/campaign. Niko opens the game; Gaea opens the read-only dashboard. Existing parent-plus-play permissions remain.
- Passwords are salted and scrypt-hashed; neither plaintext passwords nor hashes are returned by the API. Failed attempts are throttled by IP and normalized account name with generic errors.
- Signing in replaces/revokes the current browser session. Sign out is available in game and dashboard. Player logins cannot grant themselves supervisor access.
- Existing family browser sessions and setup links are revoked when login accounts are provisioned; one-time setup cannot bypass passwords for an account with logins.
- Login credentials are included in encrypted backup/restore. Existing backups without login accounts still restore.
- Account creation and password maintenance remain operator-managed; no public registration or email recovery.

- Operator password changes accept 8–256 characters, update salted hashes atomically, revoke linked browser sessions and expire setup tokens without changing progress. Passwords are supplied over stdin, not command arguments.

## Illustrated login (2026-11-26)
- The login screen has an original painterly Niko-and-Pip adventure illustration: a curly-brown-haired boy around ten, seen from behind with travel equipment and an embossed gold N on his shield; Pip is the canonical red fox companion.
- Desktop uses an illustrated panel beside a parchment-colored login form; phones stack the cropped illustration above the form. Name/password labels sit above equal-width, aligned fields with accessible focus states and password-manager autocomplete.
- Login CSS is isolated from the dashboard. Login behavior and saved progress are unchanged. The optimized WebP is served as a runtime asset; the PNG source is retained under assets/source and is not publicly served.

- Login copy omits “The adventure continues” and “Niko and Pip are ready. Are you?”; the main heading leads directly into the aligned form.

## Scrollable victory vault
- The vault renders every mastered word’s crystal, rather than only the latest twelve. Its grid is capped at 220px with vertical touch, mouse and keyboard scrolling; focus and an accessible region label are provided. Progress and crystal award rules are unchanged.
