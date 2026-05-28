# Plan: Learning Modes

## Overview

Add a **Modes** button to the top bar (Learn screen header). Clicking it opens a modes panel where the user can choose between different learning modes. Each mode offers a unique way to interact with words.

---

## 1. UI: Modes Button & Panel

### Modes button in the header

Add a new button to `.top-right` in the Learn screen header, between the Shuffle and Theme buttons:

```
[☰]  Due: 12 / 50  [📋 Modes] [🔀] [🌙]
```

On the **Import screen**, also show the Modes button so users can jump straight into any mode without going through the Learn screen first (but only if words are loaded).

### Modes Panel overlay

When clicked, a dark overlay appears with a centered panel. The panel lists all available modes as cards with:
- Icon
- Mode name
- Short description (one line)
- Play button

```
┌─────────────────────────────────────┐
│           🎮 Learning Modes          │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ 🖊️   │ │ ⚡   │ │ 🔊   │       │
│  │ Type │ │Speed │ │Listen│       │
│  │  it  │ │Round │ │  to  │       │
│  │      │ │      │ │  it  │       │
│  └──────┘ └──────┘ └──────┘       │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │  A)  │ │ 🏆   │ │ 📖   │       │
│  │Multi │ │Chal- │ │Story │       │
│  │Choice│ │lenge │ │ Mode │       │
│  └──────┘ └──────┘ └──────┘       │
│                                     │
│  [Collections: All Words ▾]         │
│                                     │
└─────────────────────────────────────┘
```

### Collections dropdown

At the bottom of the panel, a dropdown lets you choose which subset of words to use:
- **All Words** (default)
- **Due Words** (spaced repetition queue)
- **Forgotten Words**
- **Remembered Words**
- Any **custom collection** the user created

---

## 2. Data Model Changes (`store.js`)

### New fields in `_defaults()`

```js
collections: [],        // [{ id, name, wordIds: [0, 5, 12, ...] }]
challengeBest: 0,       // best score in Challenge Mode (words/min)
storyProgress: [],      // [{ storyId, unlocked: true, read: false }]
storyWords: [],         // [{ id, storyId, english, armenian, ... }]
```

### `getWordsForMode(filter)` method

Returns words based on the selected collection filter:
- `'all'` — `getAllWords()`
- `'due'` — words with `nextReview <= today`
- `'forgotten'` — `getForgottenWords()`
- `'remembered'` — words with `status === 'remembered'`
- collection ID — words whose ids are in that collection's `wordIds`

---

## 3. Word Collections (`collections.js`)

### New class `CollectionsManager`

- `createCollection(name, wordIds)` — create a new collection
- `deleteCollection(id)` — remove a collection
- `addToCollection(collectionId, wordIds)` — add words
- `removeFromCollection(collectionId, wordIds)` — remove words
- `getCollection(id)` — get collection by id
- `getAllCollections()` — list all collections
- `getCollectionWords(id)` — get word objects for a collection

### UI integration

- In the Stats screen, each word list item gets a `+` button to add the word to a collection
- A "Manage Collections" button in the Stats screen or Modes panel
- Collection manager screen: list of collections, create/delete, view words

---

## 4. Typing Mode (`typing-mode.js`)

### Flow

1. Show the **Armenian translation** on screen (large text, centered)
2. Text input field below it
3. User types the English word and presses Enter
4. **Auto-check:** compare user input with the actual English word (case-insensitive, trimmed)
   - Correct → green flash, +10 XP, next word
   - Wrong → red flash, show correct answer for 2 seconds, then next word
5. At the end: score (X / Y correct), percentage, retry/done buttons

### UI elements

- `<input type="text">` for typing
- Submit button or Enter key to submit
- Visual feedback: green border/check for correct, red border/X for wrong
- Skip button to skip a word

### Keyboard

- Enter — submit answer
- Escape — skip word / go back

---

## 5. Speed Round (`speed-mode.js`)

### Flow

1. Normal flashcard (English word front, tap to reveal translation)
2. **Auto-advance timer:** 5 seconds per word (shown as a countdown ring)
3. User must click Remember or Forgot **before the timer runs out**
4. If timer expires → auto-marked as Forgot
5. XP doubled for this mode (since it's harder)
6. At the end: score (remembered / total), "Best reaction time" stat

### UI elements

- Countdown ring/circle around the card (CSS animated)
- Timer ticks down from 5 → 0
- Card auto-flips at 3 seconds remaining to give user time to read the translation
- Slight screen flash when time runs out

### Timer visual

```
  ╭─────────────╮
  │    ⏱ 3s     │  ← countdown ring
  │             │
  │   English   │
  │    word     │
  │             │
  ╰─────────────╯
    [✗] [✓]
```

---

## 6. Listening Mode (`listening-mode.js`)

### Flow

1. No text shown initially — just a speaker icon and "Listen" button
2. TTS plays the English word aloud (auto-plays on next word)
3. User must guess by clicking **Remember** (I know this word) or **Forgot** (I don't)
4. After clicking, the word and translation are revealed for 2 seconds as feedback
5. The user's decision is based purely on audio recognition

### UI elements

- Large speaker icon in the center
- "Tap to replay" button below
- Word/translation hidden until user decides
- Brief reveal after decision for learning feedback

### Audio

- Auto-play TTS when each new word appears
- Replay button if user missed it

---

## 7. Multiple Choice Mode (`multichoice-mode.js`)

### Flow

1. Show the **English word** at the top
2. Below it: **4 Armenian translations** as buttons
3. One is correct, three are random distractors from the same word pool
4. User taps the correct translation
5. Correct → green highlight, next word
6. Wrong → red highlight on selection, green highlight on correct answer, 1.5s pause, then next
7. Runs through 20 cards (or all words, configurable)
8. At the end: score, percentage, retry

### Distractor logic

Pick 3 random **different** words from the same word pool. Ensure no duplicate translations among the options.

### UI elements

- 4 large tappable buttons stacked vertically
- Each button shows the Armenian text
- Correct/incorrect highlight animation
- Progress bar at the top (1/20, 2/20, etc.)

---

## 8. Challenge Mode (`challenge-mode.js`)

### Flow

1. **Timed session:** study as many words as possible in **60 seconds**
2. Same swipe mechanic as Learn screen (Remember/Forgot)
3. Live timer countdown: 60 → 0
4. Live score counter: "Words: 12"
5. When time runs out, session ends
6. Score = total words reviewed
7. Personal best is saved and shown

### UI elements

- Prominent timer display (large, center-top)
- Score counter (words reviewed)
- Best score indicator
- Card swipe works same as Learn screen

### Scoring

- `wordsPerMinute = totalWords / 1` (since it's exactly 1 minute)
- Save `challengeBest` in store
- Show "NEW BEST!" animation when beaten

---

## 9. Story Mode (`story-mode.js`)

### Flow

1. Stories are **unlocked** based on total mastered words (Remembered words count)
   - Story 1: unlock at 20 mastered words (A2 level)
   - Story 2: unlock at 50 mastered words (A2 level)
   - Story 3: unlock at 100 mastered words (B1 level)
   - Story 4: unlock at 150 mastered words (B1 level)
   - Story 5: unlock at 250 mastered words (B2 level)
2. Story screen: shows the English story text with learned words **highlighted**
3. Tap any highlighted word → popup shows its Armenian translation
4. "Mark as Read" button at the bottom
5. Stories are stored as plain text with embedded word IDs for highlighting

### Data format

```js
stories: [
  {
    id: 1,
    title: "A Day at the Market",
    level: "A2",
    unlockAt: 20,  // words mastered
    paragraphs: [
      "Yesterday I went to the <w id=5>market</w> to buy some fresh fruits...",
      "I wanted to find a good <w id=12>bargain</w> on vegetables.",
    ]
  }
]
```

### UI elements

- Story list screen (locked/unlocked indicators)
- Story reader: clean reading layout, highlighted vocab words
- Tap-to-translate popup
- Progress: "X / Y words from this story mastered"

---

## 10. Mode Base Class

All modes share common logic. Create a base structure:

```
BaseMode {
  words: [],
  currentIndex: 0,
  score: { correct: 0, wrong: 0 },
  start(filter),           // initialize with word list from collection filter
  next(),                  // advance to next word
  finish(),                // show results
  renderScore(),           // update score display
  back(),                  // return to Learn screen
}
```

Each mode extends this with its own `renderQuestion()`, `handleAnswer()`, and UI.

---

## 11. HTML Changes (`index.html`)

### Add to Learn screen top bar

Between `btnShuffle` and `btnTheme`:

```html
<button class="icon-btn" id="btnModes" title="Learning Modes">🎮</button>
```

### Modes panel overlay

New HTML section inside `#app` (but outside screen containers):

```html
<div id="modesOverlay" class="modes-overlay" style="display:none;">
  <div class="modes-panel">
    <div class="modes-panel-header">
      <span class="modes-panel-title">🎮 Learning Modes</span>
      <button class="icon-btn" id="btnModesClose">&times;</button>
    </div>
    <div class="modes-grid" id="modesGrid">
      <!-- Each mode card rendered by JS -->
    </div>
    <div class="modes-footer">
      <label>Collection:</label>
      <select id="modesCollectionSelect">
        <option value="all">All Words</option>
        <option value="due">Due Words</option>
        <option value="forgotten">Forgotten Words</option>
        <option value="remembered">Remembered Words</option>
      </select>
    </div>
  </div>
</div>
```

### New mode screens

Each mode gets its own `.screen` div:

- `screen-typing`
- `screen-speed`
- `screen-listening`
- `screen-multichoice`
- `screen-challenge`
- `screen-story`

Each has its own unique layout as described above.

---

## 12. CSS (`main.css`)

New styles needed:

- `.modes-overlay` — full-screen dark overlay, centered panel
- `.modes-panel` — white/dark card, max-width 500px, rounded corners
- `.modes-grid` — 3-column grid of mode cards
- `.mode-card` — clickable card with icon, name, description
- `.mode-card:hover` — lift effect, border color change
- `.typing-input` — large centered text input
- `.typing-feedback-correct` — green border/background flash
- `.typing-feedback-wrong` — red border/background flash
- `.speed-timer` — countdown ring (SVG circle with stroke-dashoffset animation)
- `.multichoice-option` — large button for each option
- `.multichoice-option.correct` — green highlight
- `.multichoice-option.wrong` — red highlight
- `.challenge-timer` — large centered timer
- `.story-reader` — clean reading layout
- `.story-word-highlight` — highlighted clickable word
- `.story-popup` — translation popup

---

## 13. Navigation Flow

```
Learn screen header → [🎮 Modes] → overlay with mode grid
                                        │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │  Typing Mode  │   │  Speed Round  │   │ Listening Mode│
            │  (type word)  │   │  (5s timer)   │   │  (audio only) │
            └──────────────┘   └──────────────┘   └──────────────┘
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │ Multi Choice  │   │  Challenge    │   │  Story Mode  │
            │  (4 options)  │   │  (60s sprint) │   │  (read story) │
            └──────────────┘   └──────────────┘   └──────────────┘
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         ▼
                                  Results screen
                                  (score, retry, back)
```

---

## 14. Files to Create/Modify

| File | Action |
|------|--------|
| `src/index.html` | Modify — add Modes button, modes overlay, 6 new mode screens |
| `src/styles/main.css` | Modify — add modes panel, all mode-specific styles |
| `src/scripts/collections.js` | **Create** — CollectionsManager class |
| `src/scripts/base-mode.js` | **Create** — BaseMode class |
| `src/scripts/typing-mode.js` | **Create** — Typing Mode |
| `src/scripts/speed-mode.js` | **Create** — Speed Round |
| `src/scripts/listening-mode.js` | **Create** — Listening Mode |
| `src/scripts/multichoice-mode.js` | **Create** — Multiple Choice |
| `src/scripts/challenge-mode.js` | **Create** — Challenge Mode |
| `src/scripts/story-mode.js` | **Create** — Story Mode |
| `src/scripts/modes.js` | **Create** — Modes panel controller |
| `src/scripts/store.js` | Modify — add collections, challengeBest, story data |
| `src/scripts/app.js` | Modify — add Modes button handler, navigation |

---

## 15. Edge Cases

- **No words loaded** — Modes button shows "Import words first" tooltip, or opens Import screen
- **Only 1 word** — Multiple Choice cannot generate 3 unique distractors. Fall back to 2 options
- **Challenge Mode with < 5 words** — still works, just fewer words
- **Speed Round with card flipped** — timer keeps running. If user doesn't flip, auto-flip at 3s
- **Listening Mode with TTS unavailable** — show warning, fall back to showing the word
- **Story Mode locked** — show lock icon with "Master X more words to unlock" message
- **Filter returns empty list** — show "No words match this filter" message
- **Collection deleted** — default filter back to "All Words"

---

## 16. Implementation Order (Recommended)

1. **Modes button + panel UI** (visual shell, navigation only)
2. **Typing Mode** (simplest to implement, quick win)
3. **Multiple Choice** (moderate complexity)
4. **Speed Round** (adds timer mechanics)
5. **Listening Mode** (audio-focused)
6. **Challenge Mode** (timer + scoring)
7. **Word Collections** (data + UI)
8. **Story Mode** (most complex, content-dependent)
