Prompt: Add Word-Level Karaoke Highlighting to YouTube Reader
Context / existing architecture:
This is the YouTube Reader page inside the SwipeWord Electron app. Current behavior:

User pastes a YouTube link → app extracts video ID (supports watch?v=, youtu.be/, /shorts/, /embed/ formats)
Video embeds via a privacy-enhanced youtube-nocookie.com iframe using the IFrame API
Captions are fetched via the youtube-transcript npm package in the main process, exposed to the renderer over IPC, with in-memory caching
Subtitles render as HTML where every word is wrapped in a clickable <span> for translation (English → Armenian/Russian via MyMemory API), with drag-select support and a save-to-dictionary feature
A 250ms polling loop reads currentTime from the iframe via postMessage/infoDelivery and keeps the active subtitle line highlighted and auto-scrolled
Custom Referer header injection in the main process is required for YouTube iframes to work in Electron
Layout: three resizable split panels (player / subtitles / saved words)

Goal:
Add karaoke-style word-level highlighting: as the video plays, each word in the subtitle should visually mark as "spoken" (e.g., background turns green) in sync with when that word is actually said — not just the whole line.
Requirements:

1. Word-level timing data

youtube-transcript only gives line-level { text, start, duration }. Replace/supplement this in the main process by fetching the raw YouTube timedtext caption track with &fmt=json3 appended to its baseUrl (get baseUrl from ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks, or from whatever internal URL youtube-transcript already resolves).
Parse the json3 response's events[].segs[] into a flat array of words, each with an absolute startMs = event.tStartMs + seg.tOffsetMs, and endMs = next word's startMs (or line end for the last word in a line).
This word-level data is only reliable for auto-generated captions. For manually authored/creator captions (no segs array, or missing tOffsetMs), fall back to evenly interpolating word start times within the line, weighted by word character length.
Apply the existing custom Referer header injection to this new fetch call too, since it's a separate request from the main transcript fetch and may need the same treatment to succeed from Electron's main process.
Cache this word-timing data the same way the existing transcript is cached (per video ID, in-memory).

2. Wire timing into existing word spans

The renderer already wraps every word in a <span> for click-to-translate. Attach data-start-ms (and optionally data-end-ms) to each span from the word-timing array when subtitles are rendered, matching spans to words positionally per line.
Do not create a second polling loop — reuse the existing 250ms currentTime poll that already drives line highlighting/auto-scroll.

3. Efficient highlight update algorithm

On each poll tick, given currentTimeMs, binary-search the flat word-span array (sorted by startMs) to find the last word whose startMs <= currentTimeMs.
Track a lastIndex pointer. Only touch the DOM for spans between the old and new index (add .spoken class going forward, remove it if the user seeks backward). Don't loop over every word every tick.
This should naturally self-correct on manual seeks (jumping forward marks a batch of words spoken at once; jumping backward un-marks them) without needing separate seek-detection logic.

4. Visual styling

Add a .spoken class with a smooth transition (background-color, ~150ms ease) to a green highlight (#b7f0c2 or similar — should be themeable/configurable).
Optionally distinguish the single currently active word (e.g., bold or brighter highlight) from previously-spoken words (flat green), so it reads as true karaoke rather than a static leftover highlight.
If using fallback interpolated timing (no real word-level data), use a visually distinct/less saturated shade so the lower-confidence sync is honest to the user — or just note it's active in a small UI badge.

5. Compatibility with existing interactions

Make sure the .spoken highlight and the existing click-to-translate / drag-select behavior don't visually or functionally conflict on the same span — check z-index, hover states, and pointer-events so translating a word still works cleanly whether or not it's marked spoken.
Auto-scroll and line-level active-line highlighting should keep working unchanged; this feature is additive at the word level only.

6. Edge cases to handle

Videos with no captions at all (existing empty state should still show).
Videos where only manual/creator captions exist (word-level fallback path).
User seeking/scrubbing the video via YouTube's own controls (should resync correctly on next poll tick).
Very long transcripts (binary search should keep this performant; avoid O(n) scans per tick).
Pausing the video (highlighting should just freeze at the current position, no jitter).

Deliverable: Implement this across the main process (caption fetching/caching) and renderer (span tagging, polling loop update, CSS), following the existing code patterns/file structure already used for the line-level highlighting and IPC bridge in this project.
