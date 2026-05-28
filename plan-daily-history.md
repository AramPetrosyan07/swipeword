# Plan: Daily History & Self-Test Feature

## Overview

Add a **Daily History** view and a **Self-Test** mode to let users review their performance on any past day and test themselves on all words.

---

## 1. Data Model Changes (`store.js`)

### Problem
Currently only the **current** status of each word is stored. There is no history of *when* a word was marked remembered/forgotten.

### Solution

Add a `dailyLog` array to the store defaults:

```js
// In _defaults()
dailyLog: [] // [{ date: "2026-05-27", entries: [{ wordId, english, armenian, action: "remembered"|"forgotten" }] }]
```

Update `markWord()` to also *append* an entry to `dailyLog`:

```js
// After updating stats in markWord()
this._appendToDailyLog(id, word.english, word.armenian, status);
```

New helper:

```js
_appendToDailyLog(wordId, english, armenian, action) {
  const today = this._getToday();
  let dayEntry = this.data.dailyLog.find(d => d.date === today);
  if (!dayEntry) {
    dayEntry = { date: today, entries: [] };
    this.data.dailyLog.push(dayEntry);
  }
  dayEntry.entries.push({ wordId, english, armenian, action });
}
```

New query method:

```js
getDayHistory(dateStr) {
  const day = this.data.dailyLog.find(d => d.date === dateStr);
  if (!day) return { remembered: [], forgotten: [] };
  return {
    remembered: day.entries.filter(e => e.action === 'remembered'),
    forgotten: day.entries.filter(e => e.action === 'forgotten'),
  };
}
```

---

## 2. UI: Daily History Screen

### New screen in `index.html`

A new screen with:
- Back button
- Date picker (`<input type="date">`)
- Two lists: **Remembered** (green) and **Forgotten** (red)
- Count badges for each list

### CSS (`styles/main.css`)

Styles for `.history-day-screen`, date picker, two-column or stacked word lists with status colors.

### JS (`scripts/daily-history.js`)

New class `DailyHistory`:
- `showScreen()` — switches to the history screen
- `loadDate(dateStr)` — fetches data from `store.getDayHistory()`, renders both lists
- Renders each word as: English → Armenian, with status icon

### Integration (`app.js`)

- Add "Daily History" button to the sidebar (or Stats screen)
- Wire up navigation

---

## 3. UI: Self-Test Mode

### What it does
Shows **all words** (or all reviewed words) one by one. User must say if they remember or not. Results are **not** saved to the spaced-repetition model — this is a pure self-check.

### New screen in `index.html`

Similar to the Learn screen but:
- Title: "Self-Test"
- Shows all words (or a subset like "all reviewed words")
- Remember/Forgot buttons work the same as Learn mode
- At the end, shows a score: X / Y correct

### JS (`scripts/selftest.js`)

New class `SelfTest`:
- `start()` — builds a queue of all words, shuffles them
- `showCurrentCard()` — displays current word
- `handleRemember()` / `handleForgot()` — just advances, does NOT call `store.markWord()`
- Tracks score internally
- `finish()` — shows result screen

### Integration (`app.js`)
- Add "Self-Test" button to sidebar
- Wire up navigation
- Also add a button on the Daily History screen: "Test yourself on these words" (optional)

---

## 4. Navigation Flow

```
[Sidebar]
├── Import
├── Learn
├── Review
├── Stats
├── Daily History  ← NEW
└── Self-Test      ← NEW
```

---

## 5. Files to Create/Modify

| File | Action |
|------|--------|
| `src/index.html` | Modify — add 2 new screen sections |
| `src/styles/main.css` | Modify — add new styles |
| `src/scripts/store.js` | Modify — add `dailyLog`, `getDayHistory()` |
| `src/scripts/daily-history.js` | **Create** — Daily History class |
| `src/scripts/selftest.js` | **Create** — Self-Test class |
| `src/scripts/app.js` | Modify — add sidebar buttons, navigation, init new classes |

---

## 6. Edge Cases

- **No data for selected date**: Show "No activity on this day"
- **Empty word list**: Disable Self-Test button
- **Switching dates**: Re-render both lists instantly
- **Self-test with 0 words**: Show "No words to test"

---

## 7. Future Ideas (not in scope now)

- Streak calendar heatmap
- Export daily history to CSV
- Filter self-test by remembered/forgotten only
