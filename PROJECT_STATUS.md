# Project Status - on&on

## Purpose
on&on is a local, browser-based predictive poetry experience.
Users start with one seed word, choose from next-word suggestions, and save finished poems to a gallery.

## What Is Built (Done)
- Core poem flow: seed word input, 3 next-word suggestions, incremental poem building, start over.
- Save flow: poems are saved to localStorage and can be viewed in the gallery.
- Gallery hydration: saved poems are inserted at the top of the gallery.
- Gallery reading behavior:
  - Active poem tracks the viewport center.
  - Non-active poems are dimmed.
  - Dimming is reversible while scrolling back up/down.
  - Top/bottom spacing allows first/last poems to sit near center.
- Gallery content update: removed the "What others began with" heading.
- About page update: added "By Geordie Stevenson / onandonpoetry.com".
- Prediction engine upgrades (local only):
  - Expanded corpus to ~2000+ tokens.
  - Added conversational context threads.
  - Added grammar banks (prepositions, conjunctions, pronouns, auxiliaries, determiners, particles, adverbs).
  - Added n-gram language model (unigram/bigram/trigram).
  - Added beam-search lookahead for more coherent local predictions.
  - Added topic/domain lexicons with reduced, light-touch influence.
  - Rebalanced scoring to prioritize grammatical flow over noun-heavy randomness.

## In Progress / Needs Tuning
- Prediction quality still needs iterative tuning for:
  - Better balance between grammatical glue words and meaningful content words.
  - Less repetitive high-frequency tokens ("the", "i", "you") in top suggestions.
  - Stronger conversational continuity over longer sequences.
- Domain/topic behavior needs calibration:
  - Context should influence output without taking over.
  - Topic relevance should emerge naturally from ongoing choices.

## What Still Needs Building (Next)

### P0 (High Priority)
- Add a simple debug panel (dev-only) to inspect why each suggestion was chosen (score breakdown).
- Add guardrails to reduce repeated function words across consecutive steps.
- Add lightweight punctuation/capitalization pass for more natural sentence feel.

### P1 (Medium Priority)
- Add optional tone modes (for example: intimate, reflective, hopeful, minimal) that bias corpus slices and scoring.
- Add optional "coherence mode" toggle to increase/decrease creativity vs stability.
- Improve gallery metadata (timestamp/seed word display) for saved poems.

### P2 (Later)
- Add import/export for saved poems (JSON download/upload).
- Add small onboarding text explaining how predictive choices shape the poem.
- Add keyboard shortcuts for choosing suggestions (1/2/3).

## Definition of Done
- Predictions feel coherent for at least 20+ word sequences without obvious random drift.
- Suggestions show grammatical variety (prepositions, conjunctions, auxiliaries, pronouns, adverbs) while preserving meaning.
- Repetition is controlled (no frequent loops of the same 2-3 words).
- Seed/topic influence is noticeable but not overpowering.
- Gallery reading/dimming behavior remains smooth and reversible.

## Quick Manual Test Checklist
- Start from 5 different seed words and verify suggestions are coherent by step 10.
- Use a topic-like seed (for example: "Flight") and confirm mild relevance without overfitting.
- Confirm suggestions include grammar words and not only nouns.
- Build and save a poem, then confirm it appears at top of gallery.
- Scroll gallery down and up; confirm center poem activates and others dim/re-activate.
- Confirm About page shows: "By Geordie Stevenson / onandonpoetry.com".
