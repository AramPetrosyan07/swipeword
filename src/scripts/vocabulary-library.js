class VocabularyLibrary {
  constructor() {
    this._entries = [];
    this._videoMeta = {};
    this._currentVideoUrl = null;
    this._searchQuery = '';
    this._dictSearchQuery = '';
    this._dictSort = 'newest';
    this._view = 'grid';
    this._bound = false;
  }

  async show() {
    this._currentVideoUrl = null;
    this._searchQuery = '';
    this._dictSearchQuery = '';
    this._view = 'grid';

    document.getElementById('vocabLibSearchInput').value = '';
    document.getElementById('vocabLibSearchWrap').style.display = 'none';

    try {
      this._entries = await window.electronAPI.dictionaryLoad();
      this._videoMeta = await window.electronAPI.vocabLibLoadMeta();
    } catch (e) {
      this._entries = [];
      this._videoMeta = {};
    }

    if (!this._bound) {
      this._bindEvents();
      this._bound = true;
    }

    this._render();
  }

  _bindEvents() {
    document.getElementById('btnVocabLibBack').addEventListener('click', () => {
      this._handleBack();
    });

    document.getElementById('vocabLibSearchInput').addEventListener('input', (e) => {
      this._searchQuery = e.target.value.trim().toLowerCase();
      if (this._view === 'grid') {
        this._renderGrid();
      }
    });

    document.getElementById('vocabLibDictSort').addEventListener('change', (e) => {
      this._dictSort = e.target.value;
      this._renderDictList();
    });

    document.getElementById('vocabLibDictSearch').addEventListener('input', (e) => {
      this._dictSearchQuery = e.target.value.trim().toLowerCase();
      this._renderDictList();
    });

    document.getElementById('btnVocabLibDeleteAll').addEventListener('click', () => {
      this._handleDeleteAll();
    });
  }

  _handleBack() {
    if (this._view === 'dict') {
      this._view = 'grid';
      this._currentVideoUrl = null;
      this._dictSearchQuery = '';
      document.getElementById('vocabLibDictSearch').value = '';
      document.getElementById('vocabLibSearchWrap').style.display = 'none';
      this._render();
    } else {
      if (app._currentAppMode === 'read') {
        document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
        document.getElementById('screen-reader').classList.add('active');
      } else {
        app._showLearnScreen();
      }
    }
  }

  _getVideoEntries() {
    const map = new Map();
    for (const entry of this._entries) {
      if (entry.sourceType !== 'youtube' || !entry.youtubeUrl) continue;
      const url = entry.youtubeUrl;
      if (!map.has(url)) {
        const meta = this._videoMeta[url] || {};
        map.set(url, {
          url,
          title: meta.title || entry.sourceTitle || 'Untitled Video',
          thumbnailUrl: meta.thumbnailUrl || this._extractThumbnail(url),
          wordCount: 0,
          lastWatched: meta.lastWatched || 0,
          createdAt: meta.createdAt || 0,
          lastPosition: meta.lastPosition || 0,
        });
      }
      const video = map.get(url);
      video.wordCount++;
      if (entry.timestamp > video.lastWatched) {
        video.lastWatched = entry.timestamp;
      }
    }

    const videos = Array.from(map.values());
    videos.sort((a, b) => b.lastWatched - a.lastWatched);
    return videos;
  }

  _extractThumbnail(youtubeUrl) {
    const match = youtubeUrl.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return '';
  }

  _getVideoId(youtubeUrl) {
    const match = youtubeUrl.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  _getWordsForVideo(youtubeUrl) {
    let words = this._entries.filter(
      (e) => e.sourceType === 'youtube' && e.youtubeUrl === youtubeUrl
    );

    if (this._dictSearchQuery) {
      words = words.filter(
        (e) =>
          e.word.toLowerCase().includes(this._dictSearchQuery) ||
          (e.translation || '').toLowerCase().includes(this._dictSearchQuery) ||
          (e.context || '').toLowerCase().includes(this._dictSearchQuery) ||
          (e.russian || '').toLowerCase().includes(this._dictSearchQuery)
      );
    }

    switch (this._dictSort) {
      case 'newest':
        words.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        break;
      case 'oldest':
        words.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        break;
      case 'alpha':
        words.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'alpha-desc':
        words.sort((a, b) => b.word.localeCompare(a.word));
        break;
      case 'timestamp':
        words.sort((a, b) => (a.videoTimestamp || 0) - (b.videoTimestamp || 0));
        break;
    }

    return words;
  }

  _render() {
    const grid = document.getElementById('vocabLibGrid');
    const empty = document.getElementById('vocabLibEmpty');
    const dict = document.getElementById('vocabLibDict');
    const content = document.getElementById('vocabLibContent');

    if (this._view === 'dict') {
      content.style.display = 'none';
      dict.style.display = '';
      this._renderDict();
    } else {
      content.style.display = '';
      dict.style.display = 'none';
      this._renderGrid();
    }
  }

  _renderGrid() {
    const grid = document.getElementById('vocabLibGrid');
    const empty = document.getElementById('vocabLibEmpty');
    const videos = this._getVideoEntries();

    let filtered = videos;
    if (this._searchQuery) {
      filtered = videos.filter(
        (v) =>
          v.title.toLowerCase().includes(this._searchQuery) ||
          v.url.toLowerCase().includes(this._searchQuery)
      );
    }

    if (filtered.length === 0) {
      empty.style.display = '';
      grid.innerHTML = '';
      if (this._searchQuery) {
        empty.querySelector('.vocablib-empty-title').textContent = 'No videos found';
        empty.querySelector('.vocablib-empty-text').textContent = 'Try a different search.';
      } else {
        empty.querySelector('.vocablib-empty-title').textContent = 'No vocabulary yet';
        empty.querySelector('.vocablib-empty-text').textContent = 'Watch a YouTube video and save words to build your library.';
      }
      return;
    }

    empty.style.display = 'none';
    grid.innerHTML = filtered
      .map((v) => {
        const timeAgo = this._timeAgo(v.lastWatched);
        const thumbSrc = v.thumbnailUrl
          ? `<img src="${this._esc(v.thumbnailUrl)}" alt="" loading="lazy" class="vocablib-card-thumb-img" onerror="this.style.display='none';this.parentElement.classList.add('vocablib-card-thumb-fallback');">`
          : '';
        const fallbackIcon = '<span class="vocablib-card-thumb-fallback-icon">&#9654;</span>';
        const posBadge = v.lastPosition > 0
          ? `<span class="vocablib-card-position">${this._fmtTime(v.lastPosition)}</span>`
          : '';

        return `
          <div class="vocablib-card" data-url="${this._esc(v.url)}">
            <div class="vocablib-card-thumb">
              ${thumbSrc}
              ${fallbackIcon}
              ${posBadge}
              <div class="vocablib-card-thumb-overlay">
                <button class="vocablib-card-play-btn" data-url="${this._esc(v.url)}" title="Resume watching">&#9654;</button>
              </div>
            </div>
            <div class="vocablib-card-body" data-url="${this._esc(v.url)}">
              <div class="vocablib-card-title">${this._esc(v.title)}</div>
              <div class="vocablib-card-meta">
                <span class="vocablib-card-word-count">${v.wordCount} word${v.wordCount !== 1 ? 's' : ''}</span>
                <span class="vocablib-card-meta-sep">&middot;</span>
                <span class="vocablib-card-time">${timeAgo}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    grid.querySelectorAll('.vocablib-card-play-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._openVideoPlayer(btn.dataset.url);
      });
    });

    grid.querySelectorAll('.vocablib-card-thumb').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.vocablib-card-play-btn')) return;
        this._openVideoPlayer(el.closest('.vocablib-card').dataset.url);
      });
    });

    grid.querySelectorAll('.vocablib-card-body').forEach((el) => {
      el.addEventListener('click', () => {
        this._openDictionary(el.dataset.url);
      });
    });
  }

  _openVideoPlayer(youtubeUrl) {
    const meta = this._videoMeta[youtubeUrl] || {};
    const position = meta.lastPosition || 0;

    app._switchAppMode('read');
    setTimeout(() => {
      const input = document.getElementById('readYoutubeInput');
      input.value = youtubeUrl;
      app._loadYoutubeContent();

      if (position > 0 && app._ytPlayer && typeof app._ytPlayer.seekTo === 'function') {
        const trySeek = () => {
          if (typeof app._ytPlayer.seekTo === 'function') {
            app._ytPlayer.seekTo(position, true);
          } else {
            setTimeout(trySeek, 500);
          }
        };
        setTimeout(trySeek, 1500);
      }
    }, 300);
  }

  _openDictionary(youtubeUrl) {
    this._view = 'dict';
    this._currentVideoUrl = youtubeUrl;
    this._dictSearchQuery = '';
    this._dictSort = 'newest';
    document.getElementById('vocabLibDictSearch').value = '';
    document.getElementById('vocabLibDictSort').value = 'newest';
    document.getElementById('vocabLibSearchWrap').style.display = 'none';
    this._render();
  }

  _renderDict() {
    const video = this._getVideoEntries().find((v) => v.url === this._currentVideoUrl);
    if (!video) {
      this._view = 'grid';
      this._render();
      return;
    }

    const thumbEl = document.getElementById('vocabLibDictThumb');
    const thumbWrap = document.getElementById('vocabLibDictThumbWrap');
    const titleEl = document.getElementById('vocabLibDictTitle');
    const countEl = document.getElementById('vocabLibDictWordCount');
    const lastWatchedEl = document.getElementById('vocabLibDictLastWatched');
    const playBtn = document.getElementById('vocabLibDictPlay');

    if (video.thumbnailUrl) {
      thumbEl.innerHTML = `<img src="${this._esc(video.thumbnailUrl)}" alt="" onerror="this.style.display='none';">`;
    } else {
      thumbEl.innerHTML = '<span class="vocablib-dict-thumb-fallback">&#9654;</span>';
    }

    thumbWrap.onclick = () => this._openVideoPlayer(video.url);
    playBtn.onclick = (e) => {
      e.stopPropagation();
      this._openVideoPlayer(video.url);
    };

    titleEl.textContent = video.title;
    countEl.textContent = `${video.wordCount} word${video.wordCount !== 1 ? 's' : ''}`;
    lastWatchedEl.textContent = video.lastWatched
      ? `Last active ${this._timeAgo(video.lastWatched)}`
      : '';

    this._renderDictList();
  }

  _renderDictList() {
    const listEl = document.getElementById('vocabLibDictList');
    const words = this._getWordsForVideo(this._currentVideoUrl);

    if (words.length === 0) {
      listEl.innerHTML = `
        <div class="vocablib-dict-empty">
          <p>${this._dictSearchQuery ? 'No words match your search.' : 'No saved words from this video.'}</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = words
      .map((w) => {
        const date = new Date(w.timestamp).toLocaleDateString();
        const time = this._fmtTime(w.videoTimestamp || 0);
        const context = w.context
          ? `<div class="vocablib-word-context">&ldquo;${this._highlightWord(this._esc(w.context), this._esc(w.word))}&rdquo;</div>`
          : '';
        const russian = w.russian
          ? `<span class="vocablib-word-russian">${this._esc(w.russian)}</span>`
          : '';

        return `
          <div class="vocablib-word" data-id="${w.id}">
            <div class="vocablib-word-main">
              <div class="vocablib-word-en">${this._esc(w.word)}</div>
              <div class="vocablib-word-translations">
                <span class="vocablib-word-armenian">${this._esc(w.translation || '')}</span>
                ${russian}
              </div>
            </div>
            ${context}
            <div class="vocablib-word-footer">
              <span class="vocablib-word-timestamp" title="Video timestamp">${time}</span>
              <span class="vocablib-word-date">${date}</span>
              <button class="vocablib-word-delete" data-id="${w.id}" title="Delete word">&#128465;</button>
            </div>
          </div>
        `;
      })
      .join('');

    listEl.querySelectorAll('.vocablib-word-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this._deleteWord(btn.dataset.id);
      });
    });
  }

  async _deleteWord(wordId) {
    try {
      const result = await window.electronAPI.vocabLibDeleteWord(wordId);
      if (result && result.success) {
        this._entries = this._entries.filter((e) => e.id !== wordId);
        const remaining = this._entries.filter(
          (e) => e.sourceType === 'youtube' && e.youtubeUrl === this._currentVideoUrl
        );
        if (remaining.length === 0) {
          this._view = 'grid';
          this._currentVideoUrl = null;
          this._render();
        } else {
          this._renderDictList();
        }
      }
    } catch (e) {
      console.error('Failed to delete word:', e);
    }
  }

  async _handleDeleteAll() {
    if (!this._currentVideoUrl) return;
    const count = this._entries.filter(
      (e) => e.sourceType === 'youtube' && e.youtubeUrl === this._currentVideoUrl
    ).length;
    if (!confirm(`Delete ${count} word${count !== 1 ? 's' : ''} from this video? This cannot be undone.`)) {
      return;
    }
    try {
      const result = await window.electronAPI.vocabLibDeleteVideo(this._currentVideoUrl);
      if (result && result.success) {
        this._entries = this._entries.filter(
          (e) => e.youtubeUrl !== this._currentVideoUrl
        );
        delete this._videoMeta[this._currentVideoUrl];
        this._view = 'grid';
        this._currentVideoUrl = null;
        this._render();
      }
    } catch (e) {
      console.error('Failed to delete video vocabulary:', e);
    }
  }

  _fmtTime(seconds) {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  _highlightWord(context, word) {
    if (!context || !word) return context;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    return context.replace(regex, (match) => `<mark class="vocablib-word-highlight">${match}</mark>`);
  }

  _timeAgo(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  _esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
}

const vocabLibrary = new VocabularyLibrary();
