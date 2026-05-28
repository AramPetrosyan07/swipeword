# Feature Implementation Plan

## Overview

This document outlines 13 features (9 suggested + 4 requested) to extend SwipeWord's learning capabilities. Each feature includes scope, implementation approach, files affected, and priority.

---

## 1. Previous Card Navigation

**Goal:** Allow the user to go back to the previous card during a study session.

**Behavior:**
- A "Go Back" button appears after swiping (for ~2 seconds) or a dedicated undo button
- Pressing the button restores the last word to the queue and reverses the status change
- Keyboard shortcut: `Z` (undo last action)

**Implementation:**
- Maintain an `undoStack` in `App` — each swipe pushes `{ word, previousStatus }` onto it
- `undo()` pops from stack, reverts `word.status` in `store.js`, decrements `currentIndex`, re-shows the card
- UI: show an undo toast/snackbar briefly after each swipe

**Files affected:** `src/scripts/app.js`, `src/scripts/store.js`, `src/index.html`, `src/styles/main.css`

**Priority:** High

---

## 2. Filter by Letter (Targeted Letter Learning)

**Goal:** Study only words starting with a specific letter (A–Z).

**Behavior:**
- On the Learn screen, show an alphabet bar (A–Z) below the progress text
- Clicking a letter filters `screenOrder` to words starting with that letter
- Active letter is highlighted; clicking again removes the filter
- Filter resets when returning to import screen or starting a new session

**Implementation:**
- Add letter filter bar to `index.html` (hidden by default)
- `_buildQueue(filterLetter)` — pass optional letter, apply `w.english[0].toUpperCase() === filterLetter`
- Toggle visual state in CSS
- Persist filter choice? No — keep it session-only to avoid complexity

**Files affected:** `src/index.html`, `src/scripts/app.js`, `src/styles/main.css`

**Priority:** Medium

---

## 3. Multi-File Import & Management

**Goal:** Import multiple `.txt` word lists and switch between them without losing progress.

**Behavior:**
- Each import creates a separate "deck" stored in `store.js`
- Sidebar history shows all imported files; clicking one loads its words + progress
- Import merges by `fileName` — re-importing the same file updates words but preserves existing statuses by matching `english` field
- Active deck is shown at the top of the sidebar

**Implementation:**
- Restructure `store.data.words` -> `store.data.decks: { [fileName]: { words: [...], stats: {...}, lastPracticed: "..." } }`
- `app.currentDeck` tracks active deck name
- `_importFile()` now calls `store.addDeck(fileName, words)`
- Sidebar history items become clickable to switch decks
- Migrate existing single-deck data on first load (backward compat)

**Files affected:** `src/scripts/store.js` (major), `src/scripts/app.js`, `src/index.html`, `src/styles/main.css`

**Priority:** Medium

---

## 4. Spaced Repetition (SM-2 Algorithm)

**Goal:** Replace binary remember/forget with a proper spaced repetition system for optimal long-term retention.

**Behavior:**
- Each word tracks: `interval` (days), `ease` (2.5 default), `nextReview` (date string)
- "Remembered" -> increase interval (1, 3, 7, 14, 30, 90...) and ease
- "Forgotten" -> reset interval to 0, decrease ease, word reappears next session
- `_buildQueue()` sorts by `nextReview` ascending (due words first)
- Stats show "Due today: X" alongside totals

**Implementation:**
- Add SM-2 fields to `store.js` word schema: `interval: 0, ease: 2.5, nextReview: today`
- Update `markWord()` to calculate new interval/ease
- SM-2 formula:
  - Remembered: `interval = (interval === 0 ? 1 : Math.round(interval * ease))`, `ease += 0.1`
  - Forgotten: `interval = 0`, `ease = Math.max(1.3, ease - 0.2)`
  - `nextReview = today + interval`
- `_buildQueue()`: filter words where `nextReview <= today`
- Add "Due: X" indicator to the progress text

**Files affected:** `src/scripts/store.js`, `src/scripts/app.js`, `src/index.html`

**Priority:** High (single best feature for retention)

---

## 5. Typing Mode (Active Recall)

**Goal:** Show the Armenian translation — user must type the English word. This is far more effective than passive swipe recognition.

**Behavior:**
- Toggle in sidebar: "Typing Mode" ON/OFF
- Card shows Armenian text + example sentence
- Below the card: a text input field + "Check" button
- User types English translation, presses Enter or clicks Check
- Correct -> success animation, word marked remembered
- Incorrect -> show correct answer, word marked forgotten
- Allow 3 attempts before revealing answer

**Implementation:**
- Add `#typing-input` and `#typing-check` elements in `index.html` (hidden by default)
- `TypingMode` class in `typing.js`: manages input, comparison, attempt count
- Comparison: case-insensitive `.trim().toLowerCase()` — check if input matches `word.english`
- Tie into existing `onForgot`/`onRemember` callbacks

**Files affected:** `src/index.html`, `src/scripts/typing.js` (new), `src/scripts/app.js`, `src/styles/main.css`

**Priority:** High

---

## 6. Multiple Choice Quiz

**Goal:** Show the Armenian word with 4 English options; pick the correct one.

**Behavior:**
- Sidebar toggle: "Quiz Mode"
- Card shows Armenian translation
- Below: 4 buttons with English words (1 correct + 3 random distractors from the same deck)
- Correct -> green highlight, advance
- Wrong -> red highlight on wrong answer + green on correct, mark forgotten

**Implementation:**
- `QuizMode` class in `quiz.js`
- Generate distractors: pick 3 random words from `words` where `id !== currentWord.id`
- Shuffle options, render as styled buttons
- Reuse existing card area layout

**Files affected:** `src/index.html`, `src/scripts/quiz.js` (new), `src/scripts/app.js`, `src/styles/main.css`

**Priority:** Medium

---

## 7. Word Progress Levels

**Goal:** A word must be "remembered" multiple times across different sessions to reach mastery.

**Behavior:**
- Each word has a `level: 0–5`
  - 0 = New (unknown)
  - 1–4 = Learning (needs N successful remembers)
  - 5 = Mastered
- One "remembered" swipe increases level by 1
- One "forgotten" swipe decreases level by 1 (min 0)
- Mastered words (level 5) are skipped in normal queue but can be reviewed
- Stats show: New / Learning / Mastered counts

**Implementation:**
- Add `level` field to word schema in `store.js`
- `markWord()` — if remembered, `level = Math.min(5, level + 1)`; if forgotten, `level = Math.max(0, level - 1)`
- `_buildQueue()` excludes level 5 unless "Review Mastered" is toggled
- Stats page shows distribution bar (New / Learning / Mastered)

**Files affected:** `src/scripts/store.js`, `src/scripts/app.js`, `src/scripts/stats.js`, `src/index.html`

**Priority:** Medium

---

## 8. Post-Session Summary

**Goal:** After finishing a deck (all words reviewed), show a recap screen.

**Behavior:**
- Summary appears after the last card is swiped
- Shows: words learned, forgotten, accuracy %, time spent, hardest words (forgotten >= 2 times)
- "Hardest words" section lists up to 5 words with their Armenian translations
- Buttons: "Review Hard Words", "Start Over", "Back to Menu"

**Implementation:**
- Add `#screen-summary` to `index.html` with stats display
- Populate from `appStore.getStats()` + track per-session data in a local object
- Track session start time, increment counters on each swipe
- Reset session data when starting a new round

**Files affected:** `src/index.html`, `src/scripts/summary.js` (new), `src/scripts/app.js`, `src/styles/main.css`

**Priority:** Low

---

## 9. Bookmark / Star Words

**Goal:** Let users mark specific troublesome words for quick access.

**Behavior:**
- Star icon on the card (top-right corner)
- Toggle star on/off — independent of remember/forget status
- Sidebar has a "Starred" filter — shows only bookmarked words
- Starred status persists in store

**Implementation:**
- Add `starred: false` to word schema
- Add star button to card template in `index.html`
- Toggle in `card.js`, save via `store.markStarred(id)`
- Sidebar "Starred" button filters `screenOrder` to `w.starred === true`

**Files affected:** `src/index.html`, `src/scripts/store.js`, `src/scripts/app.js`, `src/scripts/card.js`, `src/styles/main.css`

**Priority:** Low

---

## 10. Cloze (Fill-in-the-Blank from Example)

**Goal:** Show the example sentence with the target word blanked out (`_____`). User must type the missing word.

**Behavior:**
- Card shows the example sentence with `____` replacing the target word
- Input field below for the user to type the missing word
- Check against `word.english` (case-insensitive)
- Correct -> advance, wrong -> reveal answer + mark forgotten
- Only works for words that have an example sentence

**Implementation:**
- Reuse typing input from Typing Mode (or share component)
- `card.js` gets a `showCloze()` method that replaces `word.english` in the example with `____`
- Disable cloze for words without examples
- Toggle via sidebar: "Cloze Mode"

**Files affected:** `src/index.html`, `src/scripts/card.js`, `src/scripts/app.js`, `src/styles/main.css`

**Priority:** Low

---

## 11. Export Word List

**Goal:** Export mastered/starred/all words to a text or CSV file.

**Behavior:**
- Button in Stats screen: "Export Learned Words"
- Opens a save dialog (via Electron IPC)
- Format options: TXT (word - translation) or CSV (english,armenian,status)
- Default: export all "remembered" words

**Implementation:**
- Add IPC handler in `main.js`: `dialog:saveFile`
- New `export.js` script with formatting logic
- Formats the data, triggers file save via `preload.js` bridge
- Add button + event handler in stats screen

**Files affected:** `src/index.html`, `src/scripts/export.js` (new), `src/scripts/stats.js`, `main.js`, `preload.js`

**Priority:** Low

---

## 12. Categorize Words (Topics, Meanings, Synonyms)

**Goal:** Allow users to tag words with categories and filter by them.

**Behavior:**
- Optional metadata in the `.txt` import format: `*word - translation (example) [topic:synonyms]`
- Or: a UI to add tags to individual words
- Sidebar shows category list; clicking one filters words
- Categories: `[topic]`, `[synonym1,synonym2]`, etc.
- Filter bar shows all unique categories as clickable chips

**Implementation:**
- Extend parser to extract `[...]` metadata
- Add `tags: { topic: "", synonyms: [] }` to word schema
- `_buildQueue(category)` filters by tag
- Sidebar shows "Categories" section with tag chips
- UI for adding/editing tags (optional — can rely on file-format first)

**Files affected:** `src/scripts/parser.js`, `src/scripts/store.js`, `src/scripts/app.js`, `src/index.html`, `src/styles/main.css`

**Priority:** Medium

---

## Implementation Order (Recommended)

| Phase | Features | Reason |
|-------|----------|--------|
| **Phase 1** | Previous Card, Spaced Repetition | Core UX + biggest learning impact |
| **Phase 2** | Typing Mode, Word Progress Levels | Active recall + gradual mastery |
| **Phase 3** | Multi-File Import, Categorize, Filter by Letter | Better data organization |
| **Phase 4** | Multiple Choice, Cloze | Alternative study modes |
| **Phase 5** | Bookmark, Post-Session Summary, Export | Polish & productivity |
