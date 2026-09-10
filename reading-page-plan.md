# Reading Page — Follow-Along & Quick-Jump Plan

Two ideas for the PDF book reading page. Low dependency, reuses existing read-aloud,
annotation, and saved-word infrastructure. No IPC / preload changes needed.

---

## Idea 1 — Follow-along auto-centering (read-aloud)

**Goal:** While Read Aloud plays on the PDF page, the spoken sentence is kept
**centered** in the viewport (about 45–50% of the height), not just "within margins",
so the reader always looks at the middle of the screen. Follow pauses if the user
manually scrolls, and a thin side marker shows which line is being read.

**Current state:** `ReaderMode._highlightReadAloudSentence()` (`src/scripts/reader.js`)
already highlights the spoken words and does a partial scroll — only when the active
word leaves a 60px margin from the top/bottom (`reader.js:~910-920`). We upgrade that
to a per-sentence **centering** scroll plus a follow toggle.

**Behavior details:**

- Keep sentence-level granularity: center the scroll position **once per sentence**
  (when the sentence index changes), not per-word, to avoid jitter.
- Target position: `container.scrollTo({ top: activeWordTop - viewportH*0.5 + 30, behavior:'smooth' })`.
- Only auto-scroll if the current sentence is not already centered (threshold ~25% of viewport).
- **Anti-fight guard:** listen to `wheel`/touch scroll on `#pdfViewerScroll` while read-aloud is
  active; if the user scrolls, cancel/disable following for ~5s (a `_followHoldUntil` timestamp),
  then re-enable on the next sentence change.
- **Side marker:** small absolutely-positioned line indicator on the reader rail that tracks
  the current read-aloud sentence's page + vertical offset (reuse the offsets computed in
  `_highlightReadAloudSentence`; update its `top` from `container.scrollTop` on scroll).
- Settings/UI: no new dependency — a tiny inline toggle is enough, or reuse the existing
  read-aloud inline bar in `partials/screen-reader.html` (`#readAloudInline`).

**Where to hook:**
| Piece | Location |
|---|---|
| Centered scroll | Replace margin scroll in `ReaderMode._highlightReadAloudSentence` (`reader.js:~901-920`) |
| Follow hold-off on manual scroll | `#pdfViewerScroll` `wheel` + `scroll` listeners (`app-bindings.js:~196-206`) |
| Read-aloud stop → reset marker | `ReaderMode.readAloudStop()` (`reader.js:~1030`) |
| Marker element | Add inside `.pdf-viewer` block in `partials/screen-reader.html` (~line 253) |
| Marker styles + follow state | `main.css` |

**Acceptance:**

- Start read-aloud mid-book → viewport keeps the spoken sentence near the center.
- Scrolling with the wheel during playback does not fight the reader; follow resumes next sentence.
- Stopping read-aloud hides the marker and returns normal scroll behavior.

---

## Idea 4 — Mini-map quick-jump to saved & highlighted words

**Goal:** A thin vertical mini-map beside the page scroll area. Dots mark pages that
contain **saved words** (dictionary, PDF source) or **annotations** (highlights/underlines/
notes) for the current book. Click a dot → jump to that page; hover shows a page-number
tooltip. A moving marker shows the current page.

**Data sources (both already exist, no new storage):**

- Saved words: `appStore.loadSavedWords()` (`src/scripts/store.js:~59`) → entries with
  `sourceType === 'pdf'` and `sourceTitle` matching the current tab (`tab.path || tab.name`),
  each with a `page` field (set in `translation-popup.js:_save()`).
- Annotations: `appStore.getPdfAnnotations(key)` (`store.js:~225`) → keys of the form
  `"<page>_<widx>"`; parse the leading integer for the page.

**Behavior details:**

- Build a `Map<page, {saved, annotations}>` each time the mini-map renders.
- Rendering: a track whose height matches `#pdfViewerScroll` client height; each dot is
  positioned at `page / pageCount` of the track height. Two dot colors:
  - green — has saved word(s), with a mini count badge,
  - amber — has annotation(s) only.
- Interaction: click → `readerMode.gotoPage(page)` (already exists, `reader.js`);
  hover → tooltip "Page N · M saved · K highlights".
- **Current-page marker:** a small handle that moves down the rail as the user scrolls,
  updated from `readerMode.onScroll` / `_updateOnScroll` (`reader.js`).
- Rebuild hooks:
  - opening a tab: `_showPdfTab` (`src/scripts/app-reader.js`),
  - after annotation change: `translation-popup._applyAnnotation()` / `_clearAnnotation()`
    (already call `readerMode.refreshAllAnnotations()`),
  - after saving a word: `translationPopup.onSave` path.
- Empty state: hide the rail when the book has neither saved words nor annotations.

**Where to hook:**
| Piece | Location |
|---|---|
| Container element | Inside `.pdf-viewer` next to `#pdfViewerScroll` region (`partials/screen-reader.html:~251-268`) |
| Build + render data | new `ReaderMode.renderMiniMap()` / `_updateMiniMap()` (`reader.js`) |
| Page jump | reuse `ReaderMode.gotoPage(num)` / `_scrollToPage(num)` (`reader.js`) |
| Repaint on tab open | `_showPdfTab` (`app-reader.js`) after `loadPdfDoc` |
| Repaint on annotate/save | `translation-popup._applyAnnotation`, `_clearAnnotation`, `_save` (`translation-popup.js`) |
| Current-page handle | `ReaderMode._updateOnScroll` (`reader.js:~600`) |
| Styles | `main.css` |

**Acceptance:**

- Open a book with annotations and saved words → dots appear at the right pages.
- Clicking a dot brings that page into view; the current-page handle tracks scrolling.
- Saving a new word or adding an annotation adds/updates its dot immediately.
- Books with nothing saved/annotated show no rail.

---

## Suggested order

1. **Idea 4 (mini-map)** — self-contained UI on the reader, biggest visibility win,
   reuses existing `gotoPage` + annotation/saved-word data.
2. **Idea 1 (follow-along centering)** — touches the read-aloud hot path; do it second
   so the scroll listeners don't collide with the mini-map handle updates.

---

# Prompts

## Prompt 1 — Follow-along auto-centering

```
Task: Improve Read Aloud on the PDF reading page so the spoken sentence stays
centered in the viewport, and stop auto-scrolling when the user scrolls manually.

Context:
- App: Electron + vanilla JS. PDF reader is class ReaderMode in src/scripts/reader.js.
- The current follow scroll lives in ReaderMode._highlightReadAloudSentence()
  (src/scripts/reader.js, roughly lines 883-921). Today it only scrolls when the
  active word leaves a 60px margin from the container's top/bottom:
    if (elTop < container.scrollTop + 60 || elTop > container.scrollTop + viewH - 60) {
      container.scrollTo({ top: elTop - 80, behavior: 'smooth' });
    }
- Read-aloud sentence flow: readAloudStart() -> _readAloudSpeakCurrent() ->
  _highlightReadAloudSentence(idx). readAloudStop() resets state (reader.js ~line 1030).

Requirements:
1. Instead of the 60px margin rule, center the currently spoken sentence in the
   scroll container: scroll so the first active word lands near 45-50% of the
   viewport height. Do this ONCE PER SENTENCE (when this._readAloudIdx changes),
   not per word, to avoid jitter. Smooth scroll (behavior: 'smooth').
2. Only auto-scroll if the sentence is not already near the center (within ~25% of
   the viewport height), so long sentences don't re-trigger.
3. Anti-fight guard: while read-aloud is active, when the user scrolls #pdfViewerScroll
   (wheel or touch), set readerMode._readAloudFollowHold = Date.now() + 5000 and skip
   auto-centering until that time passes. Re-enable following on the next sentence change.
4. Add a slim vertical "current line" marker element in the PDF viewer (adjacent to
   #pdfViewerScroll) that indicates which page the voice is reading. Update its offset
   during read-aloud and hide/remove it in readAloudStop().
5. Keep existing highlighting (.pdf-read-aloud-active) behavior unchanged.

Files you may change: src/scripts/reader.js, src/scripts/app-bindings.js,
src/partials/screen-reader.html, src/styles/main.css.
Do not touch preload.js, store.js, or IPC. Follow existing code style (vanilla JS,
no frameworks, no new dependencies). Do NOT run or test the app.
```

## Prompt 2 — Mini-map quick-jump

```
Task: Add a "mini-map" quick-jump rail to the PDF book reading page. Dots show pages
that contain saved words or PDF annotations; clicking a dot jumps to that page, and a
handle shows the current page. Do NOT run or test the app.

Context:
- Electron + vanilla JS app. PDF reader is class ReaderMode in src/scripts/reader.js.
- Saved words come from appStore.loadSavedWords() (src/scripts/store.js ~line 59).
  An entry matches the current book if entry.sourceType === 'pdf' and
  entry.sourceTitle === (tab.path || tab.name); each entry has a numeric entry.page.
- PDF annotations come from appStore.getPdfAnnotations(key) (store.js ~line 225).
  Annotation keys are strings "<page>_<widx>"; parse the integer before the first '_'.
  The current book's key is (tab.path || tab.name), same as used by
  app._applyTranslationSidebar / translationPopup._getDocKey().
- Page container is #pdfViewerScroll inside .pdf-viewer (in
  src/partials/screen-reader.html, the PDF sub-page ~lines 251-268).
- `ReaderMode.gotoPage(num)` / `_scrollToPage(num)` already exists in reader.js.

Requirements:
1. Add a mini-map container element in the PDF viewer layout (a thin vertical rail,
   e.g. 14-18px wide, next to the scroll area). Hidden until there is at least one
   dot on it.
2. Implement ReaderMode.renderMiniMap() (or a helper) that builds a Map<page,
   {savedCount, annotCount}> for the current book from the two data sources above,
   then draws one dot per distinct page, vertically positioned at
   (page / pageCount) of the rail height (fixed track height = #pdfViewerScroll clientHeight).
   - saved-dot color (green) if savedCount > 0 (show a tiny count badge),
   - else annotation-dot color (amber),
   - dots for both collapse into one green dot showing both counts.
3. Clicking a dot calls readerMode.gotoPage(page). Hover shows a tooltip
   "Page N · M saved · K highlights".
4. A current-page handle within the rail tracks vertical scroll position; update it from
   ReaderMode._updateOnScroll() (reader.js ~line 600) using this.pageNum and pageCount.
5. Refresh wiring:
   - On tab open: call renderMiniMap() at the end of app._showPdfTab()
     (src/scripts/app-reader.js), after readerMode.loadPdfDoc().
   - After annotation changes: call it in translation-popup.js _applyAnnotation() and
     _clearAnnotation() (both already call readerMode.refreshAllAnnotations()).
   - After saving a word: in the onSave path (translationPopup.onSave).
6. Make sure renderMiniMap() clears any previous dots first, so switching books
   never shows stale data.

Files you may change: src/scripts/reader.js, src/scripts/app-reader.js,
src/scripts/translation-popup.js, src/partials/screen-reader.html, src/styles/main.css.
Do NOT touch preload.js, store.js, or IPC. Vanilla JS, no frameworks/dependencies.
```

in topbar in a page where we read a pdf books add setting icon, and it must be a dropdown, and after it make 2 checkboc for this 2 ideas, do turn off or on them, after it make this 2 ideas 'c:/Code/desctop/swipeword/reading-page-plan.md'
