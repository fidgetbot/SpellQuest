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
3. **Voice Trial:** The written word, hints, and letter pool are removed. The player hears the word and types it completely from memory.

A word is mastered only after a correct Voice Trial. Incorrect answers never advance the word. Hints are available only in the first two trials. Replaying the spoken prompt is allowed and does not reduce mastery.

During Rune Path and Fading Script, each incorrect letter is marked red immediately at its position and the mark clears when that letter is removed or corrected.

After every successful trial, the game displays its complete story blurb and waits indefinitely. Progression occurs only when the player activates the visible Continue Story control; success must never schedule automatic advancement.

Homophones, contractions, and capitalization lessons use an audible context sentence in the Voice Trial. Other entries are spoken twice. Spanish entries use a Spanish speech locale when supported.

## Campaign and victories

- Each mastered word earns one deterministic jewel whose color is derived from the word itself.
- The jewel is shown in the success moment and retained in the Victory Vault.
- Each active word has a generated RPG location derived from the word itself, so locations and jewel identities stay stable across sessions.
- Each story chapter contains up to 10 mastery victories. Its ending remains locked until every chapter word has passed its Voice Trial.
- Completing a chapter preserves cumulative jewels and opens the next chapter from the queue. Completing the entire bank produces the final Crown of Lexicon ending.

## Persistence

Campaign progress, active words, queued words, mastered words, trial tiers, stars, streak, and attempt counts are saved locally in the browser. No account or network service is required.

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
