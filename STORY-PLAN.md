# Word Quest: a continuous twelve-realm adventure

Status: approved direction, implementation planned. This document does not change the live game.

## Scope and pacing

The current bank has 372 words and three advancement tiers per word: 1,116 successful advancements. Plan twelve realms of 93 advancements each (31 word-equivalents), with one individually authored narrative sentence per advancement. These are not twelve versions of the same story.

Each realm contains eight major developments within its 93 sentences: 96 major developments across the campaign, with 1,020 smaller developments between them. The eight developments are pacing targets, not a repeated arrival/ally/boss formula. Mix investigations, escapes, negotiations, rescues, journeys and battles.

Corrected or hinted practice completions still restore a heart and receive encouraging training/recovery text, but do not consume main-plot sentences or award advancement. No main-plot looping or location-substitution templates.

## Realm outline

| Realm | Dramatic change and challenge | Persistent result |
|---|---|---|
| 1. Briarwood | Rescue Pip; discover that shadow guardians are bound protectors, not monsters to destroy. | Pip joins; freed paths and a light-forged shield remain. |
| 2. Drowned Archives | Navigate rising water and recover records the Regent tried to erase. | Learn the Regent was the kingdom's archivist; gain a memory lantern. |
| 3. Clockwork City | Break a siege by repairing the city's defenses rather than defeating every attacker. | Recruit engineer Tavi; reopen transport links. |
| 4. Mirror Desert | Follow contradictory clues; discover that a trusted guide has been feeding routes to the Regent. | Expose the guide and recover a true-route compass; trust must be rebuilt. |
| 5. Rootbound Court | Resolve a dispute between forest clans while the Regent exploits their division. | Form an alliance; former opponents defend the restored roads. |
| 6. Ember Peaks | Evacuate a mountain settlement and free a captive firebird during an eruption. | The firebird joins voluntarily; the refugees build a new home. |
| 7. Skychain Isles | Repair a broken aerial route while a storm separates the companions. | Reunite the party; unlock a skyship built with Tavi's earlier knowledge. |
| 8. The Silent Coast | Rescue a harbor whose people cannot speak; coordinate through signs and signals. | Restore their voices and learn how the Regent's silencing spell spreads. |
| 9. The Inverted Observatory | Interpret memories and star maps that disagree; learn what the Regent fears losing. | Discover the Crown can restore stolen histories without erasing their author. |
| 10. The Ashen March | Lead rescued communities through a counterattack; earlier allies solve different obstacles. | Protect the coalition and open a route to the capital; prior rescues visibly pay off. |
| 11. The Last Library | Protect the original histories while the Regent rewrites the approaching battle. | Assemble the Crown and its restoration spell; Pip takes a decisive role. |
| 12. The Unwritten Citadel | Companions open different routes while you confront the Regent and restore what he stole. | Resolve the conflict, show each realm recovering, and give the companions an epilogue. |

These outlines are proposed story content; approve refinements through ordinary iteration, not a separate permission gate for every sentence.

## Advancement and realm boundaries

- Track a narrative advancement counter separately from stars, raw completions and the legacy storyVictories counter.
- Advance exactly once when a word moves tier or becomes mastered; never on retries, hints, audio or duplicate submission.
- Keep the active roster capped at ten and preserve its replacement behavior.
- A realm covers 93 advancement events, not a fixed group of 31 mastered words: active words may span a realm boundary.
- Replace the existing ten-mastered-word chapter breaks with realm interludes at the 93-event boundaries. Do not interrupt or discard a partially learned word.
- Continue story remains explicit, untimed and available after every success.
- The final event and ending require full mastery, rather than merely exhausting an arbitrary story counter.
- Freeze a campaign's story content version and word roster for narrative pacing, or explicitly migrate if the bank changes; do not silently stretch or replay authored prose.

## Narrative and visual persistence

- Give every beat a stable ID, realm, scene, sentence, prerequisites and explicit effects.
- Track companion introductions, equipment discoveries, revelations and restored locations; later prose must respect their order.
- Store the authored beats in twelve separate content files with a shared story bible.
- The bible records chronology, character knowledge, carried objects, unresolved promises and their eventual payoffs.
- Maps visibly change after restoration; show current realm, objective and progress.
- Each realm receives distinct environmental art, travel landmarks and encounter identity, while keeping the three spelling mechanics recognizable.
- Party/equipment additions are initially narrative rewards, not unplanned changes to spelling difficulty.
- Journal preserves unlocked canonical story entries. Summaries help returning players recall the current objective.
- Do not expose target spellings through narrative or journal text during an active answer.

## Existing-save migration

Do not use old storyVictories as new plot progress: it includes practice and repeated expeditions.
Preserve all mastery, partial tiers, hearts and stars.
Derive remaining advancement opportunities from mastered count and per-word tiers.
Give existing players an explicit bridge recap and place them at a corresponding canonical point; unlock earlier journal chapters as recap material, rather than claiming they played those scenes.
Map their remaining advancements to the remaining story without making them redo mastered words.
Mark the content version and migration completion so it happens once.
Validate migrated saves near the start, mid-campaign, and one victory from the end.

## Remaining device-keyboard fix

Identified in game.js: renderFadingScript renders editable input elements with maxlength=1, focuses the first, and automatically focuses the next after entry. autocomplete=off does not prevent a mobile keyboard. There are no other editable answer fields in the current UI; Voice Trial already uses buttons and a non-editable display.

Implementation:
- Replace Fading Script inputs with selectable letter-slot buttons and the shared in-game keyboard.
- Selected blank has a visible highlight and accessible label; entering a letter advances to the next blank.
- Let players tap earlier blanks to correct them, and use Backspace to erase/move back.
- Preserve fixed letters, capitalization rules, hint placement, answer assembly and neutral-until-check error styling.
- Refactor keyboard construction for reuse rather than maintaining two diverging copies.
- Never depend on inputmode=none alone or focus an editable field.
- Verify real touch browsers when available; desktop viewport emulation alone cannot prove that an OS keyboard stays closed.

## Work sequence and acceptance

1. Fix Fading Script's remaining native inputs independently of the larger narrative rewrite.
2. Finalize the story bible and twelve realm outlines; identify the 96 pivotal developments and their consequences.
3. Write all 1,116 sentences as coherent scenes. Review causality and genuinely new events, not merely exact-string uniqueness.
4. Implement versioned progression, journal and save migration; integrate realm boundaries with the roster.
5. Add realm-specific art and persistent visual changes.
6. Review the complete campaign plus representative migrated saves and practice-heavy play; publish only with complete content coverage.

Checks:
- 1,116 distinct stable beat IDs and complete realm coverage, without modulo narrative loops.
- Content review catches repeated plot structures, unexplained companions, reverted consequences and premature endings.
- Practice does not consume plot; clean advancement consumes exactly one beat.
- Saves resume at the correct narrative point; migration never loses spelling progress.
- All three trials, heart rules, hints, definition placement and word-only audio remain intact.
- Phone layout, slot selection, keyboard corrections, realm interludes and the final ending work in browsers.
