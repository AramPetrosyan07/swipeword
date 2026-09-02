# Learning Speed Features — Plan

6 ideas to make the watch → save → review loop faster. Low to medium effort, no new dependencies.

---

## Idea 1 — Auto-pause / auto-play on translate (optional)

**Goal:** Clicking a word to translate pauses the video; after the popup is closed or the word is saved, the video resumes.

**Behavior details:**
- Toggle lives in the settings gear dropdown (`#ytSettingsDropdown`, `screen-reader.html:266`).
- Persist via `appStore.data.ytSubtitle.autoPause` + `appStore.save()` (same pattern as fontSize/lineGap at `app-bindings.js:225-242`).
- Only applies in `youtube` mode.

**Where to hook:**
| Event | File / method |
|---|---|
| Popup shown → pause | `translationPopup.show()` (`translation-popup.js:212`) — after YouTube placement, if enabled and `app._ytPlayer` exists → `app._ytPlayer.pauseVideo()` |
| Word saved → hide popup + play | after success in `translationPopup._save()` (`translation-popup.js:375-379`) → call `this.hide()` + if enabled `app._ytPlayer.playVideo()` |
| Popup closed without saving (close btn / click-outside) → play | wherever `hide()` is called from close button / outside click → resume if enabled |
| Word already saved ("Already saved") → play | same path in `_save()` |

**Note:** this also changes current UX — popup now auto-closes on save (matches the user request "when I save word the popup must disappear").

**Files:** `translation-popup.js`, `app-bindings.js`, `screen-reader.html` (checkbox), `main.css` (checkbox style), `app-settings.js`-style persistence via `appStore`.

---

## Idea 2 — Repeat last sentence hotkey (`R`)

**Goal:** One key replays the current subtitle sentence, so you re-listen right after saving.

**Implementation (reuse existing shadowing):**
- `app-youtube.js` already builds sentence groups in `_buildYtSentences()` and tracks the active one during sync (used by `_ytShadowStart`/`_ytShadowNext`/`_ytShadowPrev`, ~lines 576-633).
- Add a global `keydown` listener (in `app-bindings.js` or `app-youtube.js`):
  - Only fires on YouTube page, `this._ytPlayer` exists, and no input/textarea/select is focused.
  - `key === 'r'` → find current sentence start (reuse active-sentence logic) → `seekTo(sentenceStart, true)` + `playVideo()`.
- If shadowing is active, just reuse its current sentence index.

**Files:** `app-youtube.js` (extract a `_ytRepeatCurrentSentence()`), `app-bindings.js` (global keydown).

---

## Idea 3 — Instant-save shortcut (`S`)

**Goal:** Press `S` while the word-selection popup is open → save immediately without clicking the button.

**Implementation:**
- `translation-popup.js` already tracks `_currentWord` and has `_save()`.
- Global `keydown` handler: if popup visible (`_popup.style.display !== 'none'`) and key `'s'` → call `this._save()` (then auto-hide + resume per Idea 1).
- Guard against firing when typing in the search input (check `document.activeElement.tagName`).

**Files:** `translation-popup.js`, `app-bindings.js`.

---

## Idea 4 — Edit mode in vocabulary list (batch-save words from context sentences)

**Goal:** From a saved word's context sentence, select 1..N words → Accept → all selected get saved (with their own translations), and translations refresh.

**Flow:**
1. Add an **Edit** button in the dict toolbar (`index.html`, next to `#btnVocabLibDeleteAll`, ~line 871), and an **Accept** button that appears in edit mode (sticky top, shows count e.g. "Accept (3)").
2. Entering edit mode toggles `this._editMode = true` (new state in `VocabularyLibrary`).
3. In edit mode each `vocablib-word` renders its context sentence as selectable word spans (chips). Clicking a word toggles a `selected` class and updates a running selection set. Context sentences that are identical are shown once (dedup).
4. **Accept** → for each selected word:
   - Skip if already in dictionary (`dictionaryAdd` already returns `reason === 'exists'`).
   - Otherwise fetch translation via `window.electronAPI.translateWord(...)` (target langs from stored prefs) and `dictionaryAdd(entry)` with `sourceType`, `youtubeUrl`, `videoTimestamp` copied from the parent word.
   - Show inline feedback ("Saved N, skipped M already saved").
5. Exit edit mode → re-render list (new words appear with translations).

**Note on translations "changing":** newly saved subset words get their fresh translations from the Translate API at save time; re-render shows the updated data.

**Files:** `vocabulary-library.js` (edit state, render chips, accept logic), `index.html` (buttons), `main.css` (edit-mode styles, selected chips), `preload.js` (reuse existing `translateWord`, `dictionaryAdd` — no IPC changes needed).

---

## Idea 5 — Word-box click seeks; click exact word copies (original or translation)

**Goal:** Clicking a saved word box jumps to that part of the video; clicking the exact word/translation text copies it. Add copy to the vocabulary list too.

**Video seek (vocab list):**
- Currently no click-to-seek on `vocablib-word` boxes. Add click handler that used `word.videoTimestamp` → call `this._openVideoPlayer(word.youtubeUrl, word.videoTimestamp)`.
- `_openVideoPlayer` (`vocabulary-library.js:383`) already takes `youtubeUrl`; extend it with an optional `position` param to `seekTo(position, true)` (mirrors `app.js`/`vocabulary-library.js` resume logic at ~line 364-372).
- Respect the existing saved position if no `videoTimestamp` (current behavior).

**Copy on click (both vocab list and YouTube reader):**
- Make `.vocablib-word-en` (original) and `.vocablib-word-armenian` / `.vocablib-word-russian` (translations) click-to-copy via `navigator.clipboard.writeText`.
- YouTube reader saved words `#ytWordsList` — same copy behavior for word + translation.
- Small feedback (toast / temporary "Copied!" on the span) so it's visible.
- TTS buttons already stopPropagation → no conflict with copy-on-click.

**Files:** `vocabulary-library.js`, `app-youtube.js` (`_renderYoutubeSavedWords`, `_openVideoPlayer`), `main.css` (cursor:pointer, copied state).

---

## Idea 6 — Quick review (flashcards) on Words page, filtered by video

**Goal:** Top bar of the Words page ("Saved Words") gets a button → list of videos with saved words → clicking opens flashcards of that video's words.

**Important existing limitation:** YouTube entries get a session-based `sourceId` (`Date.now().toString(36)` from `_showReadContent`), so grouping by `sourceId` splits every session into a separate source. For this feature we must group by **`youtubeUrl`** instead.

**Design:**
- Words page top bar (`index.html:880-887`) gets a "Review" button (`#btnWordsReview`).
- Clicking it (with search hidden) renders a video list: entries where `sourceType === 'youtube'`, grouped by `youtubeUrl` (title from first entry / `vocabLibLoadMeta`), word count, thumbnail (reuse `_extractThumbnail`, `vocabulary-library.js:173`).
- Clicking a video → flashcard view:
  - Card shows word → click / key to reveal translation(s) → "hard / easy" or just "Next".
  - Source sentence shown as context (helps memory).
  - Track review count in `localStorage` (e.g. `words-review-count`) — light weight, no IPC changes.
- Back navigation returns to review list → then to words page.

**Files:** `words-page.js`, `index.html`, `main.css`.

---

## Suggested order

1. **Idea 1** (auto-pause) — biggest win per interaction, isolated.
2. **Idea 3** (S hotkey) — depends on Idea 1's save→hide→resume hook.
3. **Idea 2** (R hotkey) — smaller, independent.
4. **Idea 5** (seek + copy) — independent, quick.
5. **Idea 4** (edit/batch-save) — largest JS change.
6. **Idea 6** (flashcard review) — new UI section, can be its own iteration.