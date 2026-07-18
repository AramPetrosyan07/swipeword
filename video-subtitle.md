Build an advanced "Karaoke Subtitle Mode" for the existing YouTube Reader inside the SwipeWord Electron application.

Current functionality:

- Users paste a YouTube URL and watch videos using YouTube's privacy-enhanced youtube-nocookie.com iframe.
- Captions are fetched with the youtube-transcript npm package.
- Every subtitle word is clickable and can be translated (English → Armenian/Russian).
- Users can save words to their personal dictionary.
- The player, subtitles, and dictionary panels are resizable.
- Subtitle synchronization already works using YouTube's postMessage API and a 250ms polling loop.

New functionality to implement:

### Main Goal

Make subtitles behave like Netflix Karaoke subtitles for language learning.

Every word must have one of four states:

1. Already spoken.
2. Currently being spoken.
3. Not yet spoken.
4. Saved in the user's dictionary.

### Colors and States

- Already spoken words:
  - Green background (or green text color).
  - Smooth transition when changing state.

- Current word:
  - Blue background or blue underline.
  - Slight glow effect.
  - Optional scaling animation (1.05x).
  - Must smoothly animate while speaking.

- Upcoming words:
  - White or light gray.

- Saved dictionary words:
  - Yellow underline or yellow indicator dot.
  - Must preserve their dictionary indication regardless of subtitle state.

Examples:

Already spoken:

- I
- have
- always

Current:

- wanted

Upcoming:

- to
- learn
- English

Visual example:

I have always wanted to learn English

Green Green Green Blue White White White

---

### Word-Level Synchronization

The youtube-transcript package only provides:

- text
- offset
- duration

Example:

{
text: "I have always wanted to learn English",
offset: 12500,
duration: 4200
}

There are no individual word timestamps.

Implement word synchronization by splitting subtitle duration between words.

Example:

Text:
"I have always wanted to learn English"

Duration:
4200ms

Words:
7

Every word:
600ms

Better approach:
Distribute duration proportionally according to character count.

Example:

"I" -> shorter duration
"always" -> longer duration
"English" -> longer duration

Formula example:

wordDuration =
(totalCharactersOfWord / totalCharactersOfSentence)

- subtitleDuration

This produces more natural synchronization.

---

### Karaoke Animation

Implement Netflix-like Karaoke subtitles.

Instead of changing the whole sentence immediately:

Before:
Hello everyone.

During speaking:
The green color gradually fills the current word from left to right.

Example:

Hello everyone.

25%
^^^^

50%
^^^^^^^^

75%
^^^^^^^^^^^^

100%
^^^^^^^^^^^^^^^^

The active word should animate smoothly according to:

currentVideoTime

using:

currentWordStart
currentWordEnd

calculate:

progress =
(currentTime - wordStart)
/
(wordEnd - wordStart)

This value should animate:
0%
25%
50%
75%
100%

---

### Subtitle Layout

Show three subtitle sections:

1. Previous sentence.
2. Current sentence.
3. Next sentence.

Example:

---

PREVIOUS

I have already watched this movie.

CURRENT

I really want to improve my English.

NEXT

Because language learning is beautiful.

---

The current sentence should:

- have larger text,
- be centered,
- automatically scroll into view.

---

### Smooth Auto Scroll

Requirements:

- Current subtitle should always stay near the center.
- No jumping.
- Use smooth scrolling.
- Animate scrolling between subtitle changes.

Do not instantly reposition the subtitle container.

---

### Translation

Current functionality must remain unchanged.

Requirements:

- Clicking any word opens translation.
- Selecting multiple words must still work.
- Translation supports:
  - English → Armenian
  - English → Russian

Example:

---

utterly

Part of speech:
Adverb

English:
Completely

Armenian:
լիովին

Russian:
полностью

[Save Word]

---

---

### Dictionary Integration

Saved words should be visually marked.

Example:

He was utterly exhausted.

- utterly
- exhausted

have yellow indicators.

Requirements:

- Yellow underline.
- Yellow dot.
- Tooltip support.
- Works together with Karaoke mode.

Examples:

spoken + dictionary word:

- green + yellow underline

current + dictionary word:

- blue + yellow underline

upcoming + dictionary word:

- white + yellow underline

---

### Animations

Use smooth animations everywhere.

Requirements:

- subtitle transitions,
- word transitions,
- scrolling,
- active word highlighting,
- karaoke progress,
- dictionary highlighting.

Avoid blinking effects.

Recommended transition timing:

- 150ms - 300ms.

---

### Performance

The application is built with:

- Electron,
- HTML,
- CSS,
- JavaScript,
- YouTube IFrame API,
- youtube-transcript.

Requirements:

- No external video player libraries.
- No heavy subtitle libraries.
- No AI services.
- No Whisper API.
- Everything should work offline after subtitles are fetched.
- Maintain excellent performance on long videos.

The synchronization loop already updates every 250ms. Improve it if necessary for smoother animations without causing unnecessary CPU usage.

---

### Architecture

Video
↓
currentTime
↓
subtitle synchronization
↓
find active subtitle
↓
calculate word timings
↓
find:

- spoken words,
- current word,
- upcoming words.
  ↓
  calculate karaoke progress
  ↓
  render subtitles
  ↓
  apply animations
  ↓
  translation system
  ↓
  dictionary highlighting
  ↓
  smooth scrolling
  ↓
  update UI

---

### Final Requirements

Implement a professional language-learning subtitle experience similar to Netflix Karaoke subtitles.

Features:

- Word-by-word synchronization.
- Karaoke animations.
- Previous/current/next subtitles.
- Smooth auto-scrolling.
- Translation support.
- Dictionary integration.
- Responsive animations.
- Character-based word timing calculation.
- Fully compatible with the existing YouTube Reader architecture.
- No external video player libraries.
- Clean, modern, and beautiful UI focused on helping users learn English while watching YouTube videos.
