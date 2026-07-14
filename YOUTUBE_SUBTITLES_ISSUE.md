# YouTube Subtitles Not Loading — Problem Summary

## Goal
Show live-synced subtitles below the YouTube video player in the Read → YouTube page. Subtitles should highlight line-by-line as the video plays, and words should be double-clickable for translation.

## What Works
- YouTube video embeds and plays correctly (Error 153 was fixed via local HTTP server + Referer header injection in main.js)
- The full UI is built: `#readYoutubeSubtitles` div sits below the player
- Sync logic, rendering, word-wrapping, and translation binding are all implemented in app.js
- The IPC bridge in preload.js exposes `youtubeCaptions(videoId)` to the renderer
- The video ID is correctly extracted and passed through the pipeline

## What's Broken
YouTube's timedtext API (`/api/timedtext`) returns HTTP 200 with 0 bytes when fetched from Node.js `fetch` in the Electron main process. The IPC handler finds the caption tracks from the watch page HTML, gets a signed timedtext URL, but the actual timedtext content comes back empty.

## Console Output
```
Found 1 caption tracks: en(asr)
Selected caption track: en asr
Fetching captions from: https://www.youtube.com/api/timedtext?v=c2HYdp3C_zs&...&kind=asr&lang=en
Captions response status: 200 bytes: 0
Captions decoded length: 0
```

## Files Involved

### main.js (lines 353-440) — IPC handler (the broken part)
- `youtube:captions` handler fetches `https://www.youtube.com/watch?v=VIDEO_ID`
- Extracts `captionTracks` array from embedded player JSON in page HTML (this works)
- Picks the English ASR track and gets its `baseUrl` (this works)
- Fetches that `baseUrl` via Node.js `fetch` — **returns 200 but 0 bytes** (this is broken)

### preload.js (line 24) — IPC bridge
- Exposes `youtubeCaptions: (videoId) => ipcRenderer.invoke('youtube:captions', videoId)` to the renderer

### src/scripts/app.js (lines 1200-1270) — Renderer-side subtitle logic
- `_fetchYoutubeCaptions(videoId)` calls the IPC, gets back an empty array, shows "No captions available"
- `_renderYoutubeSubtitles(lines)` would render lines wrapped with WordWrapper into `.yt-sub-line` divs
- `_startYoutubeSync()` polls the iframe via postMessage every 250ms for `getCurrentTime`, highlights the matching line
- `_stopYoutubeSync()` cleans up the timer and message listener

### src/index.html (line 849) — Subtitle container
- `<div class="read-youtube-subtitles" id="readYoutubeSubtitles"></div>` sits below `#readYoutubePlayer`

### src/styles/main.css (lines 2625-2656) — Subtitle styles
- `.read-youtube-subtitles` — scrollable flex area below video
- `.yt-sub-line` — individual subtitle line (dimmed by default)
- `.yt-sub-active` — currently playing line (highlighted, bold, scaled up slightly)
- `.yt-sub-near` — lines near the current one (partially visible)

## Root Cause
YouTube's `/api/timedtext` endpoint detects the request isn't coming from a real browser session. The signed URL extracted from the watch page works fine in a browser (cookies, origin, referrer all present) but returns empty content when hit from Node.js `fetch` in the Electron main process. This is an anti-scraping measure.

## Possible Fixes (any of these would work)
1. **Use YouTube's Innertube `get_transcript` API** — POST to `https://www.youtube.com/youtubei/v1/get_transcript` with protobuf-encoded `params` (containing the video ID) and the correct innertube context object (`clientName: "WEB"`, `clientVersion: "2.2024..."`). This is what YouTube's own player uses internally and is more reliable than the old timedtext endpoint.
2. **Use a third-party library** like `youtube-captions-scraper`, `youtubei.js`, or `ytdl-core` which already handle YouTube's anti-scraping and provide transcript extraction.
3. **Move the caption fetch to the renderer process** — instead of fetching from Node.js main process, use `fetch()` in the renderer (browser context) where cookies and session data may already exist since the page loads from `http://127.0.0.1`. The renderer could call the YouTube API directly and post the result back.
4. **Extract transcript data from the page HTML directly** — YouTube sometimes embeds full transcript/caption data inside `ytInitialPlayerResponse` or `ytInitialData` JSON blobs in the watch page HTML. A more thorough regex or JSON extraction from the already-fetched page HTML might yield the actual caption text without needing a second request.
