# Performance Optimizations TODO

## P0 — Must Fix

### 1. Cache merged words instead of recreating on every call
**File:** `src/scripts/store.js:517-518`

`getAllWords()` calls `_mergeWord()` for every word, creating new objects each time.
It's called from `_showCurrentCard`, `_renderLetterStrip`, `getStats`, `_buildQueue`,
`_updateSidebar`, and more — dozens of times per user action.

**Fix:** Cache the merged array. Invalidate only after `markWord`, `initFromDictionary`,
`switchVocabulary`, or `resetProgress`.

### 2. Optimize `_renderLetterStrip()` — O(26 × N) per card change
**File:** `src/scripts/app.js:794-824`

On every card show, it destroys and recreates 26 DOM elements, and for each letter
filters all words to count due ones. Called from `_showCurrentCard`, `_showLearnScreen`,
`_buildQueue`.

**Fix:** Pre-compute letter counts when the word list changes. Cache the strip DOM and
only toggle CSS classes on filter changes.

## P1 — High Priority

### 3. Virtualize list view
**File:** `src/scripts/app.js:1088-1141`

`_renderListView()` creates a DOM node for every word with innerHTML and event listeners.
A 5000-word list creates 5000+ DOM nodes instantly.

**Fix:** Render only visible rows and recycle DOM nodes on scroll.

### 4. Load dictionaries asynchronously
**File:** `main.js:232-276`

Three large JSON files (b2, c1, verb) are read with `fs.readFileSync` + `JSON.parse`,
blocking the main process during startup.

**Fix:** Use `fs.promises.readFile`, parse lazily, load only the active dictionary first.

### 5. Cap TTS and translation caches
**File:** `main.js:436,561`

`translateCache` and `_ttsCache` are Maps that never evict. Memory grows forever.

**Fix:** Add LRU eviction (cap ~500 entries) or clear on app idle.

## P2 — Medium Priority

### 6. Optimize `getStats()` redundant iterations
**File:** `src/scripts/store.js:491-507`

Calls `getAllWords()` then `.filter()` 3 separate times. Run in a single pass instead,
or maintain counters in `markWord()`.

### 7. Lazy sentence extraction for PDF read-aloud
**File:** `src/scripts/reader.js:568-582`

`_extractAllSentences()` iterates all pages sequentially on read-aloud start.
For 200-page PDFs this is a noticeable delay.

**Fix:** Extract per-page on demand, cache per document.

### 8. Disable `fs.watch` in production
**File:** `main.js:130-146`

Recursive `fs.watch` on `src` runs even in production, causing unnecessary OS watchers.

**Fix:** Gate behind `app.isPackaged` or `NODE_ENV`.

## P3 — Low Priority

### 9. Fix `innerHTML` in history render
**File:** `src/scripts/app.js:718-737`

Uses string interpolation with `innerHTML`. XSS-vulnerable if fileName contains HTML.
Use `textContent` and `createElement` instead.

### 10. Cache dictionary lookup for word collector labels
**File:** `src/scripts/word-collector.js:112-117`

`_dictLabel()` calls `.some()` on all 3 dictionaries per word. Build a
`Map<id, source>` when dictionaries load.

---

## Quick Wins (can do in 5 min)

- [ ] Gate `fs.watch` behind `!app.isPackaged`
- [ ] Add cache invalidation to `getAllWords()`
- [ ] Pre-compute letter counts in `_buildQueue()`
- [ ] Cap `_ttsCache` and `translateCache` size
