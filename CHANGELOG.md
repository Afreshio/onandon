# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

### Changed

### Fixed

## [0.1.0] - 2026-03-08

### Added
- `PROJECT_STATUS.md` to track completed work, open items, priorities, and testing criteria.
- About page attribution line: "By Geordie Stevenson / onandonpoetry.com".
- Local prediction engine improvements:
  - Expanded corpus to 2000+ tokens with conversational context threads.
  - Grammar banks expanded (including prepositions, conjunctions, pronouns, auxiliaries, determiners, particles, adverbs).
  - N-gram language model (unigram/bigram/trigram).
  - Beam-search lookahead for more coherent local next-word predictions.
  - Topic/domain lexicons with light contextual influence.

### Changed
- Gallery reading behavior:
  - Removed gallery heading text.
  - Active poem tracks viewport center.
  - Non-active poems are dimmed and re-activate when scrolled back into focus.
- Prediction scoring rebalanced:
  - More grammatical flow words.
  - Reduced noun-heavy suggestions when context is weak.
  - Reduced hard over-focus on a single seed topic.

### Fixed
- Replaced one-way deactivation behavior with reversible dimming in gallery scroll experience.
