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
- Saved games reconcile against the current word bank: removed entries disappear and newly appended entries join the queue without resetting prior mastery.

## Mastery loop

Each word advances through exactly three trials:

1. **Rune Path:** The complete word is visible. The player chooses all letter runes in order.
2. **Fading Script:** The word remains visible in incomplete form, and the player supplies more than half of its letters.
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
- The quest surface is a graphical RPG map with a winding trail, landscape landmarks, one persistent node per active word, tier styling, and a hero marker at the current node.
- While a spelling challenge is active, the target word must never be visible elsewhere on the page—not in a roster, map node, status, instruction, tooltip, or accessibility label. The Rune Path shows only its shuffled pool, Fading Script shows only puzzle-retained letters, and the Voice Trial supplies the target through audio. The word may appear after a correct submission because the attempt has ended.
- Each story chapter contains up to 10 mastery victories. Its ending remains locked until every chapter word has passed its Voice Trial.
- Completing a chapter preserves cumulative jewels and opens the next chapter from the queue. Completing the entire bank produces the final Crown of Lexicon ending.

## Persistence

Campaign progress, active words, queued words, mastered words, trial tiers, stars, streak, hearts, and attempt counts are saved locally in the browser. No account or network service is required.

## Accessibility and device support

- Essential interactions use native buttons or inputs and work by keyboard.
- Enter checks an answer or advances after success.
- The Voice Trial has a visible replay control and a text fallback when speech synthesis is unavailable.
- Layout must remain usable at 360px width without horizontal overflow.
- Color is supplemented by text, trial dots, and labels.

## Out of scope

Handwriting recognition, accounts, timers, punitive scoring, and automatic dictionary definitions.

## Deployment

The static game is published from the root of `main` through GitHub Pages at `https://fidgetbot.github.io/SpellQuest/`.
