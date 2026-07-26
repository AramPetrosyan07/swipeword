# Plan: Add Translation Language Selector to YouTube Video Page

## Goal
Add a language selector on the YouTube video watching page so the user can choose which languages to translate subtitles into. Currently, translation is hardcoded to Armenian + Russian.

## User's Requirements
- **Language 1 (Source):** Auto-detected from video subtitle (e.g. English). Displayed but not changeable.
- **Language 2 (Required):** User must choose a target translation language.
- **Language 3 (Optional):** User can optionally choose a second target translation language.

## Files to Modify

### 1. `main.js` — Dynamic translation API
- Modify `translate:word` IPC handler to accept `{ word, from, to }` instead of hardcoded `en|hy` and `en|ru`
- Support translating to 1 or 2 target languages dynamically
- Return format: `{ translation1: { lang, text }, translation2: { lang, text } }` (translation2 is optional)

### 2. `preload.js` — Update API bridge
- Update `translateWord` to pass language parameters: `translateWord(word, fromLang, toLang1, toLang2)`

### 3. `src/index.html` — Language selector UI
- Add a language bar (`yt-lang-bar`) inside `read-page-youtube`, visible when video is loaded
- Contains: source language display, two `<select>` dropdowns for target languages
- Positioned between the collapsed bar and the youtube area

### 4. `src/styles/main.css` — Styles for language selector
- Style the language bar to match existing theme (surface background, border, flex layout)
- Style the `<select>` elements to match existing form controls

### 5. `src/scripts/app.js` — Language state & integration
- Add state: `_ytSourceLang`, `_ytTargetLang1`, `_ytTargetLang2`
- On video load, auto-detect source language from youtube-transcript `lang` property (default: `en`)
- Populate and show the language selector bar
- Save/load target language preferences from localStorage (persist across sessions)
- Pass selected languages to translation popup
- Reset language state on `_resetReadPage()`

### 6. `src/scripts/translation-popup.js` — Dynamic translation rows
- Instead of hardcoded Armenian/Russian rows, dynamically generate rows based on selected target languages
- Update `_fetchTranslation()` to call the new API with language parameters
- Add `setLanguages(from, to1, to2)` method to update display labels
- Update `_save()` to store translations with language codes

## Language List
A comprehensive list of languages supported by MyMemory API:
English, Spanish, French, German, Italian, Portuguese, Russian, Arabic, Chinese, Japanese, Korean, Hindi, Armenian, Turkish, Polish, Dutch, Swedish, Ukrainian, Greek, Czech, Romanian, Hungarian, Finnish, Danish, Norwegian, Hebrew, Thai, Vietnamese, Indonesian, Georgian, Bengali, Urdu, Persian, Swahili, Filipino, Malay

## Implementation Order
1. `main.js` — Modify translation handler
2. `preload.js` — Update API bridge
3. `src/index.html` — Add language selector HTML
4. `src/styles/main.css` — Add styles
5. `src/scripts/translation-popup.js` — Make dynamic
6. `src/scripts/app.js` — Wire everything together

## What NOT to touch
- Vocabulary library page
- Word save format (backward compatible)
- Any pages other than the YouTube video page
- Existing subtitle sync logic
- Existing resize/drag functionality
