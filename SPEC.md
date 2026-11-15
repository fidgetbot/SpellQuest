# Word Quest specification

## Purpose

A fifth-grade spelling game focused on building these words: strength, special, wrong, guess, taken, reveal, scene, scared, meanwhile, cancel, supposed, quiet, and floor.

## Learning loop

- Rotate deterministically through Rune Scramble, Missing Runes, and Spot the Spell.
- Give each word a child-friendly meaning as context.
- Reward a correct answer with story progress and stars.
- Permit unlimited retries without a penalty; reset streak after an incorrect answer.
- Reduce the star reward when a hint is used.
- Save incomplete progress locally in the browser.

## Adventure structure

Each word restores one named location. The quest map and story response must update from the same authoritative word index. Completing all 13 words restores the Lexicon and shows a completion report.

## Accessibility and device support

- All essential interactions use native buttons or inputs and work by keyboard.
- Enter checks an answer or advances after success.
- Layout must remain usable at 360px width without horizontal overflow.
- Color is supplemented by text and symbols.

## Out of scope for this release

Audio, handwriting recognition, accounts, network services, timers, and punitive scoring.
