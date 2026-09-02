__appMixinYoutube = {};
__appMixinYoutube['_initYoutubeResize'] = function() {
  const divider = document.getElementById('ytPaneDivider');
  const player = document.getElementById('readYoutubePlayer');
  const area = document.getElementById('readYoutubeArea');
  const overlay = document.getElementById('ytDragOverlay');
  let dragging = false, startY = 0, startH = 0, areaH = 0, rafId = 0, pendingY = 0;

  divider.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = true;
    startY = e.clientY;
    startH = player.offsetHeight;
    areaH = area.offsetHeight;
    overlay.classList.add('active');
    divider.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    player.style.willChange = 'height';
  });

  divider.addEventListener('dblclick', () => {
    player.style.willChange = 'height';
    player.style.height = '45%';
    requestAnimationFrame(() => { player.style.willChange = ''; });
  });

  divider.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    pendingY = e.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const dy = pendingY - startY;
        const maxH = areaH - 60;
        const minH = 80;
        player.style.height = Math.max(minH, Math.min(maxH, startH + dy)) + 'px';
      });
    }
  });

  divider.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    overlay.classList.remove('active');
    player.style.willChange = '';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
};

__appMixinYoutube['_initYoutubeHResize'] = function() {
  const divider = document.getElementById('ytHDivider');
  const subPanel = document.getElementById('ytSubtitlePanel');
  const overlay = document.getElementById('ytDragOverlayH');
  const split = document.getElementById('ytBottomSplit');
  let dragging = false, startX = 0, startW = 0, splitW = 0, rafId = 0, pendingX = 0;

  divider.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    startX = e.clientX;
    startW = subPanel.offsetWidth;
    splitW = split.offsetWidth - divider.offsetWidth;
    overlay.classList.add('active');
    divider.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  divider.addEventListener('dblclick', () => {
    subPanel.style.flexBasis = '50%';
    subPanel.style.flexGrow = '0';
  });

  divider.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    pendingX = e.clientX;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const dx = pendingX - startX;
        const minW = 200;
        const maxW = splitW - 120;
        subPanel.style.flexBasis = Math.max(minW, Math.min(maxW, startW + dx)) + 'px';
        subPanel.style.flexGrow = '0';
      });
    }
  });

  divider.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    overlay.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
};

__appMixinYoutube['_renderYoutubeSavedWords'] = async function() {
  const listEl = document.getElementById('ytWordsList');
  const src = this._readSourceInfo;
  if (!src || src.type !== 'youtube' || !src.youtubeUrl) {
    listEl.innerHTML = '<div class="yt-word-empty">No video loaded</div>';
    return;
  }
  try {
    const allWords = await appStore.loadSavedWords();
    const videoWords = (allWords || []).filter(w => w.youtubeUrl === src.youtubeUrl);
    this._ytSavedWords = new Set(videoWords.map(w => (w.word || '').toLowerCase()));
    this._markYtSavedWords();
    if (videoWords.length === 0) {
      listEl.innerHTML = '<div class="yt-word-empty">No saved words yet.<br>Double-click a word in subtitles to translate and save it.</div>';
      return;
    }
    listEl.innerHTML = videoWords
      .map(w => {
        const trans = w.translation || '';
        const ts = w.videoTimestamp || 0;
        return '<div class="yt-word-item" data-word="' + w.word + '" data-timestamp="' + ts + '">' +
          '<div class="yt-word-en">' + w.word + '</div>' +
          (trans ? '<div class="yt-word-trans">' + trans + '</div>' : '') +
          '</div>';
      })
      .join('');

    if (!this._ytWordsListDelegated) {
      this._ytWordsListDelegated = true;
      listEl.addEventListener('click', (e) => {
        const item = e.target.closest('.yt-word-item');
        if (!item) return;
        const ts = parseFloat(item.dataset.timestamp) || 0;
        if (this._ytPlayer && typeof this._ytPlayer.seekTo === 'function' && ts > 0) {
          this._ytPlayer.seekTo(Math.max(0, ts - 2), true);
          this._ytPlayer.playVideo();
          this._ytFlashTargetLine = -1;
          const lines = document.querySelectorAll('#readYoutubeSubtitles .yt-sub-line');
          let best = -1;
          let bestDiff = Infinity;
          for (let i = 0; i < lines.length; i++) {
            const start = parseFloat(lines[i].dataset.start);
            if (Math.floor(start) === ts) {
              this._ytFlashTargetLine = i;
              break;
            }
            const diff = Math.abs(start - ts);
            if (diff < bestDiff) {
              bestDiff = diff;
              best = i;
            }
          }
          if (this._ytFlashTargetLine === -1) this._ytFlashTargetLine = best;
          const targetLine = this._ytFlashTargetLine >= 0
            ? document.querySelector('#readYoutubeSubtitles .yt-sub-line[data-index="' + this._ytFlashTargetLine + '"]')
            : null;
          if (targetLine) {
            targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    }
  } catch (e) {
    listEl.innerHTML = '<div class="yt-word-empty">Failed to load words</div>';
  }
};

__appMixinYoutube['_updateYoutubeRecommendations'] = async function() {
  const panel = document.getElementById('ytRecommendations');
  const input = document.getElementById('readYoutubeInput');
  if (!panel) return;
  const inputVisible = !!(input && input.offsetParent !== null && getComputedStyle(
    document.getElementById('read-page-youtube').querySelector('.read-page-input')
  ).display !== 'none');
  if (!inputVisible) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = '';
  const grid = document.getElementById('ytRecommendationsGrid');
  try {
    const meta = await window.electronAPI.vocabLibLoadMeta();
    const played = Object.keys(meta || {});
    if (played.length === 0) {
      grid.innerHTML = '<div class="yt-recommendations-empty">Watch a video and save words to get recommendations.</div>';
      return;
    }
    const seen = new Set(played);
    played.sort((a, b) => (meta[b].lastWatched || 0) - (meta[a].lastWatched || 0));
    const source = meta[played[0]];
    const sourceId = (source.youtubeUrl || played[0]).match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (!sourceId) {
      grid.innerHTML = '<div class="yt-recommendations-empty">No recommendations available.</div>';
      return;
    }
    const related = await window.electronAPI.youtubeRelated(sourceId[1]);
    const fresh = related.filter((r) => !seen.has('https://youtube.com/watch?v=' + r.videoId));
    if (fresh.length === 0) {
      grid.innerHTML = '<div class="yt-recommendations-empty">No new recommendations found.</div>';
      return;
    }
    grid.innerHTML = fresh
      .map((r) =>
        '<div class="yt-recommendation-card" data-videoid="' + r.videoId + '" data-title="' + this._escAttr(r.title) + '">' +
          '<div class="yt-recommendation-thumb">' +
            (r.thumbnailUrl
              ? '<img src="' + this._escAttr(r.thumbnailUrl) + '" alt="" loading="lazy" class="yt-recommendation-thumb-img" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'yt-recommendation-thumb-fallback\');">'
              : '') +
            '<span class="yt-recommendation-thumb-fallback" style="display:' + (r.thumbnailUrl ? 'none' : 'flex') + ';">&#9654;</span>' +
          '</div>' +
          '<div class="yt-recommendation-title">' + this._esc(r.title) + '</div>' +
        '</div>'
      )
      .join('');
    grid.querySelectorAll('.yt-recommendation-card').forEach((el) => {
      el.addEventListener('click', () => {
        const vid = el.dataset.videoid;
        if (!vid) return;
        const inputEl = document.getElementById('readYoutubeInput');
        inputEl.value = 'https://youtube.com/watch?v=' + vid;
        this._loadYoutubeContent();
      });
    });
  } catch (e) {
    console.error('Failed to load recommendations:', e);
    grid.innerHTML = '<div class="yt-recommendations-empty">Failed to load recommendations.</div>';
  }
};

__appMixinYoutube['_escAttr'] = function(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

__appMixinYoutube['_esc'] = function(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

__appMixinYoutube['_loadYoutubeContent'] = async function() {
  const url = document.getElementById('readYoutubeInput').value.trim();
  if (!url) return;
  const videoId = this._extractYoutubeId(url);
  if (!videoId) {
    alert('Invalid YouTube URL');
    return;
  }
  let title = url;
  try {
    const resp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.title) title = data.title;
    }
  } catch (e) {
    // fallback to URL as title
  }
  this._showReadContent('youtube', title, null, videoId);
};

__appMixinYoutube['_extractYoutubeId'] = function(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

__appMixinYoutube['_showReadContent'] = function(sourceType, title, text, videoId) {
  const sourceInfo = { type: sourceType, title, id: Date.now().toString(36) };
  if (sourceType === 'youtube' && videoId) {
    sourceInfo.youtubeUrl = 'https://youtube.com/watch?v=' + videoId;
  }
  this._readSourceInfo = sourceInfo;

  if (sourceType === 'youtube' && videoId) {
    document.getElementById('read-page-youtube').querySelector('.read-page-input').style.display = 'none';
    const recPanel = document.getElementById('ytRecommendations');
    if (recPanel) recPanel.style.display = 'none';
    document.getElementById('readCollapsedBarYoutube').style.display = 'none';
    document.getElementById('btnReadNewToolbar').style.display = '';
    document.getElementById('btnReaderLangBarToggle').style.display = '';
    document.getElementById('readYoutubeArea').style.display = 'flex';
    document.getElementById('ytLangBar').classList.remove('yt-lang-collapsed');
    document.getElementById('btnReaderLangBarToggle').innerHTML = '&#9650;';
    document.getElementById('btnReaderLangBarToggle').title = 'Hide settings bar';
    this._applyLangPrefsToUI();
    const ytPlayerEl = document.getElementById('readYoutubePlayer');
    ytPlayerEl.style.height = '45%';
    if (this._ytPlayer) {
      try { this._ytPlayer.destroy(); } catch (e) {}
      this._ytPlayer = null;
    }
    ytPlayerEl.innerHTML = '';
    document.getElementById('readYoutubeSubtitles').innerHTML =
      '<p style="color:var(--text-secondary);">Loading captions...</p>';
    this._renderYoutubeSavedWords();
    this._fetchYoutubeCaptions(videoId);
    window._ensureYouTubeApi().then(() => {
      try {
        this._ytPlayer = new YT.Player('readYoutubePlayer', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: { rel: 0 },
          events: {
            onReady: () => {
              if (this._ytShadowSpeed !== 1 && typeof this._ytPlayer.setPlaybackRate === 'function') {
                try { this._ytPlayer.setPlaybackRate(this._ytShadowSpeed); } catch (e) {}
              }
              if (this._ytCaptions && this._ytCaptions.length > 0) {
                this._startYoutubeSync();
              }
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                this._saveYoutubePosition();
              }
            }
          }
        });
        this._startPositionTracking();
      } catch (e) {
        console.error('YouTube player init error:', e);
      }
    }).catch((e) => console.error('Failed to load YouTube API:', e));
  } else if (sourceType === 'pdf-error') {
    document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
    document.getElementById('pdfLibrary').style.display = 'none';
    document.getElementById('pdfTabsBar').style.display = 'none';
    document.getElementById('readContentAreaPdf').style.display = 'block';
    document.getElementById('pdfSplit').style.display = 'none';
    document.getElementById('pdfViewer').style.display = 'none';
    document.getElementById('readTextViewPdf').style.display = 'block';
    document.getElementById('readTextViewPdf').innerHTML = text;
  }
};

__appMixinYoutube['_fetchYoutubeCaptions'] = async function(videoId) {
  const subEl = document.getElementById('readYoutubeSubtitles');
  try {
    const lines = await window.electronAPI.youtubeCaptions(videoId);
    if (!lines || lines.length === 0) {
      subEl.innerHTML = '<p style="color:var(--text-secondary);">No captions available for this video.</p>';
      return;
    }
    this._ytCaptions = lines;
    this._buildYtSentences();
    this._renderYoutubeSubtitles(lines);
    if (this._ytPlayer && typeof this._ytPlayer.getCurrentTime === 'function') {
      this._startYoutubeSync();
    }
  } catch (e) {
    console.error('Failed to fetch captions:', e);
    subEl.innerHTML = '<p style="color:var(--text-secondary);">Failed to load captions.</p>';
  }
};

__appMixinYoutube['_renderYoutubeSubtitles'] = function(lines) {
  const subEl = document.getElementById('readYoutubeSubtitles');
  const sourceInfo = this._readSourceInfo;
  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  };
  subEl.innerHTML = lines
    .map((line, i) => {
      const wrapped = WordWrapper.wrap(line.text);
      return '<div class="yt-sub-line" data-index="' + i + '" data-start="' + line.start + '"><span class="yt-sub-time">' + fmtTime(line.start) + '</span>' + wrapped + '</div>';
    })
    .join('');
  this.translationPopup.bindToContainer(subEl, sourceInfo);
  subEl.addEventListener('contextmenu', (e) => {
    const lineEl = e.target.closest ? e.target.closest('.yt-sub-line') : null;
    if (!lineEl) return;
    e.preventDefault();
    const ts = parseFloat(lineEl.dataset.start);
    if (this._ytPlayer && typeof this._ytPlayer.seekTo === 'function' && !isNaN(ts)) {
      this._ytPlayer.seekTo(Math.max(0, ts - 0.2), true);
      this._ytPlayer.playVideo();
    }
  });
  this._markYtSavedWords();
};

__appMixinYoutube['_markYtSavedWords'] = function() {
  if (!this._ytSavedWords || this._ytSavedWords.size === 0) return;
  const words = document.querySelectorAll('#readYoutubeSubtitles .yt-sub-line .rw-word');
  words.forEach((el) => {
    const w = (el.dataset.word || '').toLowerCase();
    el.classList.toggle('yt-word-saved', this._ytSavedWords.has(w));
  });
};

__appMixinYoutube['_flashYtSavedWords'] = function(lineIndex) {
  if (!this._ytSavedWords || this._ytSavedWords.size === 0) return;
  const line = document.querySelector('#readYoutubeSubtitles .yt-sub-line[data-index="' + lineIndex + '"]');
  if (!line) return;
  const words = line.querySelectorAll('.rw-word.yt-word-saved');
  words.forEach((el) => {
    el.classList.remove('yt-word-flash');
    void el.offsetWidth;
    el.classList.add('yt-word-flash');
  });
};

__appMixinYoutube['_isYtLineReadable'] = function(line) {
  const container = document.getElementById('readYoutubeSubtitles');
  if (!container || !line) return false;
  const cRect = container.getBoundingClientRect();
  const lRect = line.getBoundingClientRect();
  return lRect.top >= cRect.top && lRect.bottom <= cRect.bottom;
};

__appMixinYoutube['_startYoutubeSync'] = function() {
  if (this._ytCaptionTimer) {
    clearInterval(this._ytCaptionTimer);
    this._ytCaptionTimer = null;
  }
  this._ytCurrentLineIndex = -1;
  const subEl = document.getElementById('readYoutubeSubtitles');
  const subLines = subEl.querySelectorAll('.yt-sub-line');

  this._ytCaptionTimer = setInterval(() => {
    if (!this._ytPlayer || typeof this._ytPlayer.getCurrentTime !== 'function') return;
    const time = this._ytPlayer.getCurrentTime();

    const captions = this._ytCaptions;
    if (!captions || !captions.length) return;

    let idx = -1;
    for (let i = captions.length - 1; i >= 0; i--) {
      if (time >= captions[i].start - 0.15) { idx = i; break; }
    }

    if (idx !== this._ytCurrentLineIndex) {
      this._ytCurrentLineIndex = idx;
      for (let i = 0; i < subLines.length; i++) {
        const distance = Math.abs(i - idx);
        const el = subLines[i];
        const isActive = i === idx;
        const isNear = !isActive && distance <= 2;
        if (el.classList.contains('yt-sub-active') !== isActive) el.classList.toggle('yt-sub-active', isActive);
        if (el.classList.contains('yt-sub-near') !== isNear) el.classList.toggle('yt-sub-near', isNear);
      }
      if (idx >= 0 && subLines[idx]) {
        subLines[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    if (this._ytFlashTargetLine >= 0) {
      const tLine = document.querySelector('#readYoutubeSubtitles .yt-sub-line[data-index="' + this._ytFlashTargetLine + '"]');
      if (tLine && this._isYtLineReadable(tLine)) {
        this._flashYtSavedWords(this._ytFlashTargetLine);
        this._ytFlashTargetLine = -1;
      }
    }

    if (this._ytShadowActive && this._ytShadowSentenceIdx >= 0 && this._ytSentences[this._ytShadowSentenceIdx]) {
      const blockEnd = this._ytShadowBlockEnd();
      const now = Date.now();
      this._setPracticingRange(this._ytShadowSentenceIdx, blockEnd);
      const blockLast = this._ytSentences[blockEnd - 1];
      if (time >= blockLast.endTime && now - (this._ytShadowLastActionTime || 0) > 400) {
        this._ytShadowLastActionTime = now;
        const first = this._ytSentences[this._ytShadowSentenceIdx];
        this._ytPlayer.seekTo(first.startTime, true);
        this._ytPlayer.playVideo();
      }
    }
  }, 250);
};

__appMixinYoutube['_buildYtSentences'] = function() {
  const lines = this._ytCaptions || [];
  const MAX_LINES = 6;
  const MAX_SECONDS = 8;
  this._ytSentences = [];
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (start === -1) start = i;
    const first = lines[start];
    const cur = lines[i];
    const text = (cur.text || '').trim();
    const endsSentence = /[.!?]["'\u2019)\]]*$/.test(text);
    const exceeds = (i - start + 1) >= MAX_LINES || (cur.start + cur.duration - first.start) >= MAX_SECONDS;
    if (endsSentence || exceeds) {
      this._ytSentences.push({
        startIndex: start,
        endIndex: i,
        startTime: first.start,
        endTime: cur.start + cur.duration,
        text: lines.slice(start, i + 1).map(l => l.text).join(' ')
      });
      start = -1;
    }
  }
  if (start !== -1) {
    const first = lines[start];
    const last = lines[lines.length - 1];
    this._ytSentences.push({
      startIndex: start,
      endIndex: lines.length - 1,
      startTime: first.start,
      endTime: last.start + last.duration,
      text: lines.slice(start).map(l => l.text).join(' ')
    });
  }
  return this._ytSentences;
};

__appMixinYoutube['_findYtSentenceAtTime'] = function(time) {
  const sents = this._ytSentences || [];
  for (let i = sents.length - 1; i >= 0; i--) {
    if (time >= sents[i].startTime - 0.15) return i;
  }
  return sents.length ? 0 : -1;
};

__appMixinYoutube['_setPracticingRange'] = function(startSentIdx, endSentIdx) {
  const sents = this._ytSentences || [];
  if (startSentIdx < 0 || endSentIdx <= startSentIdx || endSentIdx > sents.length) return;
  const firstLine = sents[startSentIdx].startIndex;
  const lastLine = sents[endSentIdx - 1].endIndex;
  const subLines = document.querySelectorAll('#readYoutubeSubtitles .yt-sub-line');
  subLines.forEach((el, i) => {
    el.classList.toggle('yt-sub-practicing', i >= firstLine && i <= lastLine);
  });
};

__appMixinYoutube['_ytShadowBlockEnd'] = function() {
  const count = this._ytShadowSentenceCount;
  if (count <= 0) return this._ytSentences.length;
  return Math.min(this._ytSentences.length, this._ytShadowSentenceIdx + count);
};

__appMixinYoutube['_ytShadowStart'] = function() {
  if (!this._ytPlayer || typeof this._ytPlayer.getCurrentTime !== 'function') return;
  if (!this._ytSentences || !this._ytSentences.length) return;
  const idx = this._findYtSentenceAtTime(this._ytPlayer.getCurrentTime());
  if (idx < 0) return;
  this._ytShadowStartSentence(idx);
};

__appMixinYoutube['_ytShadowStartSentence'] = function(sentIdx) {
  if (!this._ytSentences || sentIdx < 0 || sentIdx >= this._ytSentences.length) return;
  if (!this._ytPlayer || typeof this._ytPlayer.seekTo !== 'function') return;
  this._ytShadowActive = true;
  this._ytShadowSentenceIdx = sentIdx;
  this._ytShadowLastActionTime = Date.now();
  this._setPracticingRange(sentIdx, this._ytShadowBlockEnd());
  const sent = this._ytSentences[sentIdx];
  this._ytPlayer.seekTo(sent.startTime, true);
  this._ytPlayer.playVideo();
  this._updateYtShadowUI();
};

__appMixinYoutube['_ytShadowPrev'] = function() {
  if (!this._ytSentences || !this._ytSentences.length) return;
  const prevIdx = this._ytShadowSentenceIdx - 1;
  if (prevIdx < 0) {
    this._ytShadowStartSentence(this._ytSentences.length - 1);
    return;
  }
  this._ytShadowStartSentence(prevIdx);
};

__appMixinYoutube['_ytShadowNext'] = function() {
  if (!this._ytSentences || !this._ytSentences.length) return;
  const nextIdx = this._ytShadowSentenceIdx + 1;
  if (nextIdx >= this._ytSentences.length) {
    this._ytShadowStop();
    return;
  }
  this._ytShadowStartSentence(nextIdx);
};

__appMixinYoutube['_ytShadowStop'] = function() {
  this._ytShadowActive = false;
  this._ytShadowSentenceIdx = -1;
  const subLines = document.querySelectorAll('#readYoutubeSubtitles .yt-sub-line.yt-sub-practicing');
  subLines.forEach((el) => el.classList.remove('yt-sub-practicing'));
  this._updateYtShadowUI();
};

__appMixinYoutube['_updateYtShadowUI'] = function() {
  const on = !!this._ytShadowActive;
  const toggle = document.getElementById('btnYtShadowToggle');
  const prevBtn = document.getElementById('btnYtPrev');
  const nextBtn = document.getElementById('btnYtNext');
  if (toggle) toggle.classList.toggle('active', on);
  if (prevBtn) prevBtn.style.display = on ? '' : 'none';
  if (nextBtn) nextBtn.style.display = on ? '' : 'none';
};

__appMixinYoutube['_stopYoutubeSync'] = function() {
  if (this._ytCaptionTimer) {
    clearInterval(this._ytCaptionTimer);
    this._ytCaptionTimer = null;
  }
  this._ytCaptions = [];
  this._ytSentences = [];
  this._ytSavedWords = new Set();
  this._ytFlashTargetLine = -1;
  this._ytCurrentLineIndex = -1;
  this._ytShadowStop();
  if (this._ytPlayer) {
    this._saveYoutubePosition();
    try {
      if (typeof this._ytPlayer.setPlaybackRate === 'function') {
        this._ytPlayer.setPlaybackRate(1);
      }
    } catch (e) {}
    try { this._ytPlayer.destroy(); } catch (e) {}
    this._ytPlayer = null;
  }
  if (this._ytPositionTimer) {
    clearInterval(this._ytPositionTimer);
    this._ytPositionTimer = null;
  }
};

__appMixinYoutube['_startPositionTracking'] = function() {
  if (this._ytPositionTimer) {
    clearInterval(this._ytPositionTimer);
  }
  this._ytPositionTimer = setInterval(() => {
    this._saveYoutubePosition();
  }, 5000);
};

__appMixinYoutube['_saveYoutubePosition'] = async function() {
  if (!this._ytPlayer || typeof this._ytPlayer.getCurrentTime !== 'function') return;
  if (!this._readSourceInfo || this._readSourceInfo.type !== 'youtube') return;
  const url = this._readSourceInfo.youtubeUrl;
  if (!url) return;
  const position = this._ytPlayer.getCurrentTime();
  try {
    await window.electronAPI.vocabLibUpdatePosition(url, position);
  } catch (e) {
    // silently fail
  }
};

__appMixinYoutube['_updateVoiceUi'] = function() {
  const voice = appStore.data.ttsVoice != null ? appStore.data.ttsVoice : 0;
  const labelEl = document.getElementById('ytVoiceLabel');
  document.querySelectorAll('#ytVoiceMenu .yt-voice-option').forEach((opt) => {
    const v = parseInt(opt.dataset.voice, 10);
    opt.classList.toggle('active', v === voice);
    if (v === voice && labelEl) labelEl.textContent = opt.textContent;
  });
  const readAloudVoice = document.getElementById('readAloudVoice');
  if (readAloudVoice) readAloudVoice.value = String(voice);
};

__appMixinYoutube['_resetReadPage'] = function() {
  this._stopYoutubeSync();
  this._setReaderSettingsMode(false);
  this._setReaderEditMode(false);
  document.getElementById('readerTranslatePopup').style.display = 'none';
  this._readSourceInfo = null;

  document.getElementById('readYoutubeInput').value = '';
  const ytPage = document.getElementById('read-page-youtube');
  ytPage.querySelector('.read-page-input').style.display = '';
  this._updateYoutubeRecommendations();
  document.getElementById('readCollapsedBarYoutube').style.display = 'none';
  document.getElementById('btnReadNewToolbar').style.display = 'none';
  document.getElementById('btnReaderLangBarToggle').style.display = 'none';
  document.getElementById('readYoutubeArea').style.display = 'none';
  document.getElementById('ytLangBar').classList.add('yt-lang-collapsed');
  document.getElementById('btnReaderLangBarToggle').innerHTML = '&#9650;';
  document.getElementById('btnReaderLangBarToggle').title = 'Hide settings bar';
  document.getElementById('readYoutubePlayer').innerHTML = '';
  document.getElementById('readYoutubePlayer').style.height = '45%';
  document.getElementById('readYoutubeSubtitles').innerHTML = '';
  document.getElementById('ytWordsList').innerHTML = '';
  document.getElementById('ytSubtitlePanel').style.flexBasis = '50%';
  document.getElementById('ytSubtitlePanel').style.flexGrow = '0';

  this._readPdfFile = null;
  this._readPdfPath = null;
  readerMode.reset();
  this._readAloudMode = false;
  this._updateReadAloudUI(false);
  const dropzone = document.getElementById('readPdfDropzone');
  dropzone.classList.remove('read-dropzone-loaded');
  dropzone.querySelector('.read-dropzone-text').textContent = 'Drop PDF here or click to browse';
  document.getElementById('readPdfFileInput').value = '';
  document.getElementById('btnReadPdf').disabled = true;
  this._pdfSyncDropzone();
  document.getElementById('pdfTabsBar').style.display = 'none';
  document.getElementById('readContentAreaPdf').style.display = 'none';
  document.getElementById('pdfViewer').style.display = '';
  document.getElementById('readTextViewPdf').innerHTML = '';
  document.getElementById('readTextViewPdf').style.display = 'none';
  document.getElementById('pdfLibrary').style.display = '';
};
