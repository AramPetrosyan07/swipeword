                        # SwipeWord — English → Armenian Learning App

## Project Overview

A Tinder-style desktop app to learn English vocabulary. Import a `.txt` file of English words with Armenian translations + examples. Swipe right if you know the word, swipe left if you don't. Progress is saved locally.

---

## Tech Stack

| Layer       | Choice                                 | Reason                                      |
| ----------- | -------------------------------------- | ------------------------------------------- |
| Framework   | **Electron.js**                        | Cross-platform desktop, pure JS/HTML/CSS    |
| Frontend    | **Vanilla JS + CSS3**                  | No framework overhead for a single-page app |
| Animations  | **CSS3 Transitions**                   | Card swipe, flip, smooth UI                 |
| Persistence | **JSON file** + `electron-store`       | Saves progress (learned/forgotten/stats)    |
| TTS         | **Web Speech API** (`speechSynthesis`) | Free, built into Chromium (Electron)        |
| Build       | **electron-builder**                   | Package into `.exe` / `.dmg` / `.AppImage`  |

---

## Features

### Core (Must Have)

- [ ] File picker to import `*.txt` word files
- [ ] Card UI showing: **English word** (title) + hidden translation
- [ ] Toggle button to reveal Armenian translation
- [ ] Display example sentence
- [ ] Swipe right → mark as **"Remembered"**
- [ ] Swipe left → mark as **"Not remembered"**
- [ ] Left / Right buttons (for non-swipe users)

### Extras

- [ ] Progress tracking per session (e.g., "12/294 learned")
- [ ] Review mode — practice only words you swiped left on
- [ ] Stats dashboard — today's count, total learned, accuracy %
- [ ] Dark / Light theme toggle

### Bonus

- [ ] **Text-to-Speech** — click 🔊 to hear pronunciation
- [ ] **Keyboard shortcuts** — ← swipe left, → swipe right, Space flip card
- [ ] **Card flip animation** — 3D CSS flip when revealing translation
- [ ] **Shuffle mode** — randomise word order
- [ ] **Filter by letter** — jump to words starting with A, B, C...
- [ ] **Streak tracker** — count consecutive days practiced

---

## Data Model

### Word object (parsed from file)

```json
{
  "id": 1,
  "english": "accommodate",
  "armenian": "տեղավորել, հարմարեցնել",
  "example": "The hotel can accommodate 200 guests.",
  "status": "unknown" // "unknown" | "remembered" | "forgotten"
}
```

### Progress file (~ `%APPDATA%/swipeword/progress.json`)

```json
{
  "lastPracticed": "2026-05-28",
  "streak": 3,
  "stats": {
    "totalReviewed": 294,
    "totalRemembered": 187,
    "totalForgotten": 107,
    "sessionsCompleted": 12
  },
  "words": [ { "id": 1, "status": "remembered" }, ... ]
}
```

---

## UI / Screens

### 1. Import Screen (landing)

- "Drop your .txt file here or click to browse"
- After import → auto-navigate to Learn screen

### 2. Learn Screen (main)

```
┌─────────────────────────────┐
│  🔙  📊 12/294  ⚙️ 🔄 🌙  │  ← Top bar
├─────────────────────────────┤
│                             │
│   ┌───────────────────┐     │
│   │                   │     │
│   │   accommodate     │     │  ← Card
│   │                   │     │
│   │  [Show Translation]│     │  ← Flip button
│   │                   │     │
│   │  "The hotel can   │     │  ← Example
│   │   accommodate     │     │
│   │   200 guests."    │     │
│   │                   │     │
│   │  [🔊]            │     │  ← TTS button
│   │                   │     │
│   └───────────────────┘     │
│                             │
│   ❌  ←  Card  →  ✅       │  ← Action buttons
│                             │
└─────────────────────────────┘
```

### 3. Review Screen

- Same card layout but only shows words marked "forgotten"
- After completing review → words go back to "unknown"

### 4. Stats Screen

- Today's progress (pie chart or text)
- Total remembered / forgotten
- Streak calendar (simple)
- Letter distribution (optional)

### 5. Settings Screen (optional sidebar/modal)

- Theme toggle (dark/light)
- Shuffle toggle
- Reset all progress

---

## Implementation Phases

### Phase 1 — Project Setup

```
npx create-electron-app swipeword
```

- Set up Electron project
- Create file structure
- Configure `electron-store` for persistence

### Phase 2 — File Parser

- Read `.txt` file
- Regex to extract: `*word - translation (example)`
- Build words array

### Phase 3 — Card UI & Navigation

- Render single card with English word
- Flip animation to reveal translation
- Example display
- TTS button (browser `speechSynthesis`)
- "Show Translation" toggle

### Phase 4 — Swipe & Buttons

- Mouse drag + CSS transform for swipe
- Snap back if drag &lt; threshold, fly out if &gt; threshold
- Left / Right button fallback
- Keyboard ← → listeners

### Phase 5 — Progress & Persistence

- `electron-store` save/load
- Update word status on swipe
- Track session stats
- Streak calculation

### Phase 6 — Review Mode

- Filter words with status "forgotten"
- Cycle through them again
- Option to reset to "unknown" after review

### Phase 7 — Stats Dashboard

- Display all accumulated stats
- Simple chart or text-based progress

### Phase 8 — Polish

- Dark/light theme
- Shuffle mode
- Filter by letter
- Keyboard shortcuts
- Smooth animations

---

## File Structure

```
swipeword/
├── main.js                  # Electron main process
├── preload.js               # Secure bridge (IPC)
├── package.json
├── src/
│   ├── index.html           # Entry HTML
│   ├── styles/
│   │   ├── main.css         # Global styles
│   │   └── card.css         # Card + swipe animations
│   ├── scripts/
│   │   ├── app.js           # App navigation / state
│   │   ├── parser.js        # .txt file parser
│   │   ├── card.js          # Card rendering & swipe logic
│   │   ├── store.js         # electron-store wrapper
│   │   ├── stats.js         # Stats page logic
│   │   ├── review.js        # Review mode logic
│   │   ├── tts.js           # Text-to-speech
│   │   └── theme.js         # Dark/light toggle
│   └── assets/
│       └── icons/
└── build/                   # electron-builder output
```

---

## Keyboard Shortcuts

| Key               | Action                            |
| ----------------- | --------------------------------- |
| `←` (Arrow Left)  | Swipe left (forgot)               |
| `→` (Arrow Right) | Swipe right (remembered)          |
| `Space`           | Flip card (show/hide translation) |
| `R`               | Open Review mode                  |
| `S`               | Toggle shuffle                    |
| `T`               | Toggle theme                      |

---

## Word File Format (Expected)

Matches your `b2_short_list.txt`:

```
*word - translation (Example sentence here.)
*accommodate - տեղավորել, հարմարեցնել (The hotel can accommodate 200 guests.)
```

Parser will extract:

- `word` → english
- `translation` → armenian
- `(Example...)` → example

Lines starting with `Letter X:` and blank lines are skipped.

---

## Next Steps After Plan Approval

1. Initialize Electron project
2. Implement file parser
3. Build card UI with flip + swipe
4. Wire up persistence
5. Polish with theme / shortcuts / stats

---

_Generated plan — ready for development._
