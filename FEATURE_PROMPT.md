# SwipeWord — Feature Spec & Implementation Prompt

## Overview

SwipeWord is a language-learning desktop app focused on **Armenian**. The app has a **Read** page with three input modes (Text, PDF, YouTube) and a **Words** page for saved vocabulary. Users double-click any word to get an Armenian translation in a popup, and save words to a personal dictionary organized by source.

---

## Feature 1: Read Page (3 Modes)

### Goal
A single "Read" page in the app with **three input boxes** at the top. Each box represents a different content mode: Text, PDF, or YouTube. The user picks one, provides content, and the reading/viewing area appears below with interactive, translatable words.

### Read Page Layout

```
┌──────────────────────────────────────────────────┐
│  NAV BAR:  [ Read ]  [ Words ]                   │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│  │   1. TEXT    │ │   2. PDF     │ │ 3. YOUTUBE│ │
│  │              │ │              │ │           │ │
│  │  [textarea]  │ │  [dropzone / │ │ [url input│ │
│  │  paste here  │ │   browse]    │ │  + load]  │ │
│  │              │ │              │ │           │ │
│  │  [Read ▶]    │ │  [Load ▶]    │ │ [Watch ▶] │ │
│  └──────────────┘ └──────────────┘ └───────────┘ │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│          READING / VIEWING AREA                  │
│    (text rendered here, or video + subtitles)    │
│                                                  │
└──────────────────────────────────────────────────┘
```

- Only **one box is active at a time**. Clicking a box highlights it and disables the others.
- When content is loaded, the input boxes **collapse** (or move to a small bar) to give full space to the reading area. A "Back" or "New" button returns to the box selection.

### Step-by-step

1. **Box 1 — Text Input**
   - A textarea where the user pastes raw text.
   - A **"Read"** button renders the text in the reading area below.
   - Supports Markdown — rendered as formatted HTML.

2. **Box 2 — PDF Upload**
   - A drag-and-drop zone or "Browse" button that accepts `.pdf` files.
   - A **"Load"** button parses the PDF and renders extracted text in the reading area.
   - Parses client-side using `pdf.js`. Shows page-by-page or scrollable full text.

3. **Box 3 — YouTube Input**
   - A text input for pasting a YouTube URL.
   - A **"Watch"** button embeds the video and fetches subtitles.
   - The reading area shows the video player on top, interactive subtitles below.

4. **Reading View (Text & PDF)**
   - Display text with comfortable line-height, font size controls, and word wrapping.
   - **Every word** wrapped in a clickable `<span>` with a data attribute storing the word.
   - Subtle hover effect on words (light underline or highlight).
   - Markdown support: parse with `marked`/`markdown-it`, then re-wrap words in `<span>`.

5. **Double-Click Translation (All Modes)**
   - On `double-click` of any word `<span>`:
     - Capture the word text.
     - Call a translation API to translate to **Armenian**.
     - Open a **small floating popup** near the clicked word.
   - Popup contents:
     - The original word.
     - The Armenian translation (Armenian script + transliteration).
     - A **"Save to Dictionary"** button.
   - Clicking outside or pressing `Escape` closes the popup.

6. **YouTube View**
   - Video embedded in a responsive container.
   - Subtitles panel below the video, scrollable, synced with playback.
   - Each subtitle word is clickable (same translation popup as text mode).
   - Active subtitle line highlights as video plays.

---

## Feature 2: Personal Dictionary

### Goal
Let users save translated words and review them later.

### Step-by-step

1. **Save Word**
   - When the user clicks "Save to Dictionary" in the translation popup:
     - Store the word, its Armenian translation, the source context (optional sentence), and a timestamp.
   - Persist data in `localStorage` or a simple JSON file (expandable to SQLite later).

2. **Dictionary View**
   - Add a sidebar or separate page/tab showing all saved words.
   - Display: original word | Armenian translation | date saved.
   - Allow **search/filter** through saved words.
   - Allow **delete** individual entries.

3. **Export (Optional)**
   - Button to export dictionary as CSV or JSON.

---

## Feature 3: YouTube Video — Subtitle Details

### Goal
Detailed subtitle behavior for YouTube videos loaded via Read Page Box 3. The video embed and basic layout are defined in Feature 1. This section covers subtitle-specific logic.

### Step-by-step

1. **Subtitle Extraction**
   - Fetch available subtitles/captions for the video.
     - Option A: Use a backend endpoint with `youtube-transcript` or `yt-dlp` to extract `.srt` or `.vtt` captions.
     - Option B: Use a third-party API or library that returns timestamped subtitle text.
   - If auto-generated captions exist, use those as a fallback.

2. **Subtitle Display**
   - Render subtitles **below the video player** in a scrollable panel.
   - Each subtitle line shows at the correct timestamp.
   - Highlight the **active subtitle line** as the video plays (sync with video `currentTime`).
   - Each word in the subtitle line is wrapped in a clickable `<span>` (same system as the text reader).

3. **Double-Click on Subtitle Words**
   - Same behavior as Feature 1: double-click opens the translation popup.
   - Popup appears near the clicked word within the subtitle area.
   - "Save to Dictionary" button works identically.

4. **Playback Controls**
   - Standard YouTube controls (play, pause, seek, volume).
   - Optional: playback speed control (0.5x, 0.75x, 1x, 1.25x, 1.5x).

---

## Feature 4: Translation Popup (Shared Component)

### Goal
A reusable popup component used across text reader and subtitle views.

### Specs

- **Trigger:** Double-click on any wrapped word `<span>`.
- **Position:** Appears adjacent to the clicked element (use `getBoundingClientRect()` for positioning, with edge detection so it doesn't overflow the viewport).
- **Contents:**
  ```
  ┌─────────────────────────────┐
  │  📖  word                   │
  │  🇦🇲  Armenian translation   │
  │  🔤  transliteration        │
  │                             │
  │  [ Save to Dictionary ]     │
  └─────────────────────────────┘
  ```
- **Close:** Click outside / press `Escape`.
- **Loading state:** Show a spinner while fetching translation.
- **Error state:** Show "Translation unavailable" if API fails.

---

## Feature 5: Words Page — Saved Vocabulary by Source

### Goal
A dedicated "Words" section accessible from the top navigation bar. It shows all saved vocabulary **grouped by source** (the text, PDF, or YouTube video the words were saved from). Clicking a source title opens its full vocabulary list with translations.

### Step-by-step

1. **Nav Bar Button**
   - Add a **"Words"** button/link in the top navigation bar (alongside any existing nav items).
   - Clicking it navigates to the Words page.

2. **Words Page — Source List**
   - The page displays a list of **sources** the user has saved words from.
   - Each source entry shows:
     - **Title** — the name/label of the source:
       - For pasted text: first ~50 characters of the text, or a user-given title.
       - For PDF: the PDF filename.
       - For YouTube: the video title (fetched from YouTube metadata).
     - **Word count** — how many words saved from that source.
     - **Date** — when the first/last word was saved from it.
   - Sources are sorted by most recent activity (newest on top).
   - Each source entry is **clickable**.

3. **Source Title Auto-Detection**
   - When the user loads content, auto-assign a title:
     - **Pasted text:** Use the first line or first N characters as the title. Optionally prompt the user to name it.
     - **PDF upload:** Use the PDF filename (without extension).
     - **YouTube video:** Fetch the video title from YouTube's oEmbed API (`https://www.youtube.com/oembed?url=VIDEO_URL&format=json`) or from page metadata during embed.

4. **Vocabulary View (Per Source)**
   - When the user clicks a source title in the Words list:
     - Open a detailed view showing all saved words from that source.
     - Each row displays:
       - **Original word**
       - **Armenian translation**
       - **Context** (the sentence or subtitle line where the word was saved, if available)
       - **Date saved**
     - Allow **delete** individual words from the list.
     - Allow **search/filter** within that source's words.
   - A **back button** returns to the main Words list.

5. **Data Structure**
   - Each saved word entry should store:
     ```
     {
       id: unique_id,
       word: "example",
       translation: "օրինակ",
       context: "This is an example sentence.",
       sourceType: "text" | "pdf" | "youtube",
       sourceTitle: "My pasted article",
       sourceId: "unique_source_id",
       youtubeUrl: "https://youtube.com/watch?v=...",  // if sourceType is youtube
       timestamp: 1234567890
     }
     ```
   - Sources are derived dynamically by grouping words by `sourceId`.

6. **Empty States**
   - If no words are saved yet, show a message: "No saved words yet. Double-click any word while reading or watching to save it."
   - If a source has no words left (all deleted), remove it from the list.

7. **Nav Bar Badge (Optional)**
   - Show a small badge on the "Words" nav button with the total number of saved words.

---

## Tech Stack Suggestions

| Layer | Recommendation |
|-------|---------------|
| Framework | React, Svelte, or Vue (your choice) |
| Desktop wrapper | Electron or Tauri |
| PDF parsing | `pdf.js` (pdfjs-dist) |
| Markdown | `marked` or `markdown-it` |
| Translation API | Google Cloud Translate, LibreTranslate, or MyMemory API |
| YouTube embed | YouTube iframe API |
| Subtitle fetching | `youtube-transcript` npm package, `yt-dlp`, or RapidAPI subtitle service |
| Storage | localStorage (MVP) → SQLite (later) |
| Styling | Tailwind CSS or your preference |

---

## Implementation Order

| Phase | Task | Depends on |
|-------|------|------------|
| 1 | Read page layout — 3 boxes (Text, PDF, YouTube) with active state switching | — |
| 1 | Text box → reading view with clickable words | Read page |
| 1 | Double-click translation popup | — |
| 1 | Personal dictionary (save + view) | Popup |
| 2 | PDF box → PDF parsing + text extraction | Read page |
| 2 | Markdown rendering in reading view | Phase 1 |
| 2 | YouTube box → video embed | Read page |
| 2 | Subtitle fetching + interactive display | YouTube embed |
| 3 | Subtitle-video sync highlighting | Subtitles |
| 3 | Words page — source list + vocabulary view | Dictionary |
| 3 | Source title auto-detection (text, PDF filename, YouTube title) | Words page |
| 4 | Polish, collapse/expand input boxes, edge cases, error handling | All |

---

## Key Constraints

- Translation API may have rate limits — debounce or cache repeated lookups.
- PDF extraction quality depends on the PDF (scanned images won't work without OCR).
- YouTube subtitle availability varies per video — handle missing subtitles gracefully.
- All word-click systems should share the same `<span>` wrapper logic and popup component to avoid duplication.
