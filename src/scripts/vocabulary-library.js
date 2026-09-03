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
    this._filters = {
      armenian: true,
      russian: true,
      context: true,
      timestamp: true,
      date: true,
      ...this._loadFilters(),
    };
    this._langFilter = null;
    this._editMode = false;
    this._editSelection = new Set();
    this._editWordMap = new Map();
    this._mode = 'youtube';
    this._allLangs = new Set();
    this._langNames = {
      en:'English',es:'Spanish',fr:'French',de:'German',it:'Italian',pt:'Portuguese',
      ru:'Russian',ar:'Arabic',zh:'Chinese',ja:'Japanese',ko:'Korean',hi:'Hindi',
      hy:'Armenian',tr:'Turkish',pl:'Polish',nl:'Dutch',sv:'Swedish',uk:'Ukrainian',
      el:'Greek',cs:'Czech',ro:'Romanian',hu:'Hungarian',fi:'Finnish',da:'Danish',
      no:'Norwegian',he:'Hebrew',th:'Thai',vi:'Vietnamese',id:'Indonesian',
      ka:'Georgian',bn:'Bengali',ur:'Urdu',fa:'Persian',sw:'Swahili',fil:'Filipino',ms:'Malay'
    };
  }

  setMode(mode) {
    this._mode = mode === 'pdf' ? 'pdf' : 'youtube';
  }

  _isYt() {
    return this._mode === 'youtube';
  }

  _containerFilterType() {
    return this._isYt() ? 'youtube' : 'pdf';
  }

  _containerKey(e) {
    return this._isYt() ? e.youtubeUrl : (e.sourceTitle || '');
  }

  _matchesContainer(e, key) {
    if (this._isYt()) {
      return e.sourceType === 'youtube' && e.youtubeUrl === key;
    }
    return e.sourceType === 'pdf' && (e.sourceTitle || '') === key;
  }

  async show() {
    this._currentVideoUrl = null;
    this._searchQuery = '';
    this._dictSearchQuery = '';
    this._view = 'grid';
    this._langFilter = null;
    this._setEditMode(false);

    document.getElementById('vocabLibTitle').textContent = this._mode === 'pdf' ? 'Vocabulary Books' : 'Vocabulary Videos';
    document.getElementById('vocabLibFilterDropdown').style.display = 'none';

    try {
      this._entries = await appStore.loadSavedWords();
      this._videoMeta = this._mode === 'pdf' ? {} : (await window.electronAPI.vocabLibLoadMeta());
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

    document.getElementById('btnVocabLibEdit').addEventListener('click', () => {
      this._toggleEditMode();
    });

    document.getElementById('btnVocabLibAccept').addEventListener('click', () => {
      this._acceptSelection();
    });

    document.getElementById('btnVocabLibAcceptCancel').addEventListener('click', () => {
      this._setEditMode(false);
    });

    const filterBtn = document.getElementById('btnVocabLibFilter');
    const filterDropdown = document.getElementById('vocabLibFilterDropdown');
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = filterDropdown.style.display === 'flex';
      filterDropdown.style.display = isOpen ? 'none' : 'flex';
    });

    document.addEventListener('click', (e) => {
      if (filterDropdown.style.display === 'flex' && !filterDropdown.contains(e.target) && e.target !== filterBtn) {
        filterDropdown.style.display = 'none';
      }
    });

    const filterIds = { armenian: 'vocabFilterArmenian', russian: 'vocabFilterRussian', context: 'vocabFilterContext', timestamp: 'vocabFilterTimestamp', date: 'vocabFilterDate' };
    for (const [key, id] of Object.entries(filterIds)) {
      document.getElementById(id).addEventListener('change', (e) => {
        this._filters[key] = e.target.checked;
        this._saveFilters();
        this._renderDictList();
      });
    }
  }

  _loadFilters() {
    try {
      const saved = localStorage.getItem('vocablib-filters');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  _saveFilters() {
    try {
      localStorage.setItem('vocablib-filters', JSON.stringify(this._filters));
    } catch (e) {
      // ignore storage errors
    }
  }

  _updateFilterLabels() {
    if (!this._currentVideoUrl) return;
    const words = this._entries.filter((e) => this._matchesContainer(e, this._currentVideoUrl));
    const langs = new Set();
    for (const w of words) {
      if (w.translationLang) langs.add(w.translationLang);
      if (w.russianLang) langs.add(w.russianLang);
    }
    const langArr = Array.from(langs);
    const label1 = langArr[0] ? (this._langNames[langArr[0]] || langArr[0]) : 'Armenian';
    const label2 = langArr[1] ? (this._langNames[langArr[1]] || langArr[1]) : 'Russian';
    const lbl1 = document.getElementById('vocabFilterArmenian').closest('label').querySelector('span:last-child');
    const lbl2 = document.getElementById('vocabFilterRussian').closest('label').querySelector('span:last-child');
    if (lbl1) lbl1.textContent = label1 + ' translation';
    if (lbl2) lbl2.textContent = label2 + ' translation';
  }

  _handleBack() {
    if (this._view === 'dict') {
      this._setEditMode(false);
      this._view = 'grid';
      this._currentVideoUrl = null;
      this._dictSearchQuery = '';
      this._langFilter = null;
      document.getElementById('vocabLibDictSearch').value = '';
      this._render();
    } else {
      app._showReadHome();
    }
  }

  _getVideoEntries() {
    const map = new Map();
    this._allLangs = new Set();
    for (const entry of this._entries) {
      if (!this._matchesContainer(entry, entry[this._isYt() ? 'youtubeUrl' : 'sourceTitle'])) continue;
      const key = this._containerKey(entry);
      if (!key) continue;
      if (!map.has(key)) {
        if (this._isYt()) {
          const meta = this._videoMeta[key] || {};
          map.set(key, {
            key,
            url: key,
            title: meta.title || entry.sourceTitle || 'Untitled Video',
            thumbnailUrl: meta.thumbnailUrl || this._extractThumbnail(key),
            wordCount: 0,
            lastWatched: meta.lastWatched || 0,
            createdAt: meta.createdAt || 0,
            lastPosition: meta.lastPosition || 0,
            langs: new Set(),
          });
        } else {
          map.set(key, {
            key,
            url: key,
            title: entry.sourceTitle || 'Untitled Book',
            thumbnailUrl: '',
            wordCount: 0,
            lastWatched: 0,
            createdAt: 0,
            lastPosition: 0,
            langs: new Set(),
          });
        }
      }
      const video = map.get(key);
      video.wordCount++;
      if (entry.timestamp > video.lastWatched) {
        video.lastWatched = entry.timestamp;
      }
      const t1 = entry.translationLang || (entry.translation ? 'hy' : null);
      const t2 = entry.russianLang || (entry.russian ? 'ru' : null);
      if (t1) {
        video.langs.add(t1);
        this._allLangs.add(t1);
      }
      if (t2) {
        video.langs.add(t2);
        this._allLangs.add(t2);
      }
    }

    let videos = Array.from(map.values());
    if (this._langFilter) {
      videos = videos.filter(v => v.langs.has(this._langFilter));
    }
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
    let words = this._entries.filter((e) => this._matchesContainer(e, youtubeUrl));

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
    const filterDropdown = document.getElementById('vocabLibFilterDropdown');

    if (this._view === 'dict') {
      content.style.display = 'none';
      dict.style.display = '';
      filterDropdown.style.display = 'none';
      this._renderDict();
    } else {
      content.style.display = '';
      dict.style.display = 'none';
      filterDropdown.style.display = 'none';
      this._renderGrid();
    }
  }

  _renderGrid() {
    const grid = document.getElementById('vocabLibGrid');
    const empty = document.getElementById('vocabLibEmpty');
    const videos = this._getVideoEntries();
    this._renderLangFilter();

    if (videos.length === 0) {
      empty.style.display = '';
      grid.innerHTML = '';
      if (this._langFilter) {
        empty.querySelector('.vocablib-empty-title').textContent = this._isYt() ? 'No videos match filter' : 'No books match filter';
        empty.querySelector('.vocablib-empty-text').textContent = 'Try selecting a different language or clear the filter.';
      } else {
        empty.querySelector('.vocablib-empty-title').textContent = 'No vocabulary yet';
        empty.querySelector('.vocablib-empty-text').textContent = this._isYt()
          ? 'Watch a YouTube video and save words to build your library.'
          : 'Open a PDF and save words to build your book library.';
      }
      return;
    }

    empty.style.display = 'none';
    grid.innerHTML = videos
      .map((v) => {
        const timeAgo = this._timeAgo(v.lastWatched);
        const thumbSrc = v.thumbnailUrl
          ? `<img src="${this._esc(v.thumbnailUrl)}" alt="" loading="lazy" class="vocablib-card-thumb-img" onerror="this.style.display='none';this.parentElement.classList.add('vocablib-card-thumb-fallback');">`
          : '';
        const fallbackIcon = `<span class="vocablib-card-thumb-fallback-icon">${this._isYt() ? '&#9654;' : '&#128218;'}</span>`;
        const posBadge = v.lastPosition > 0
          ? `<span class="vocablib-card-position">${this._fmtTime(v.lastPosition)}</span>`
          : '';
        const langs = Array.from(v.langs);
        const langHtml = langs.length > 0
          ? `<div class="vocablib-card-langs">
              <span class="vocablib-card-lang-en">EN</span>
              ${langs.map(l => {
                const name = this._langNames[l] || l.toUpperCase();
                const code = l;
                const cls = langs.indexOf(l) === 0 ? 'vocablib-card-lang-t1' : 'vocablib-card-lang-t2';
                return `<span class="${cls}">${name}</span>`;
              }).join('')}
            </div>`
          : '';

        return `
          <div class="vocablib-card" data-url="${this._esc(v.url)}">
            <div class="vocablib-card-thumb${this._isYt() ? '' : ' vocablib-card-thumb-book'}">
              ${thumbSrc}
              ${fallbackIcon}
              ${this._isYt() && posBadge}
              ${this._isYt() ? `<div class="vocablib-card-thumb-overlay">
                <button class="vocablib-card-play-btn" data-url="${this._esc(v.url)}" title="Resume watching">&#9654;</button>
              </div>` : ''}
            </div>
            <div class="vocablib-card-body" data-url="${this._esc(v.url)}">
              <div class="vocablib-card-title">${this._esc(v.title)}</div>
              ${langHtml}
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
        const url = el.closest('.vocablib-card').dataset.url;
        if (this._isYt()) this._openVideoPlayer(url);
        else this._openDictionary(url);
      });
    });

    grid.querySelectorAll('.vocablib-card-body').forEach((el) => {
      el.addEventListener('click', () => {
        this._openDictionary(el.dataset.url);
      });
    });
  }

  _renderLangFilter() {
    const container = document.getElementById('vocabLibLangFilter');
    const chipsEl = document.getElementById('vocabLibLangChips');
    const langs = Array.from(this._allLangs).sort();

    if (langs.length <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    chipsEl.innerHTML = '';

    const allChip = document.createElement('button');
    allChip.className = 'vocablib-lang-chip' + (this._langFilter === null ? ' active' : '');
    allChip.textContent = 'All';
    allChip.addEventListener('click', () => {
      this._langFilter = null;
      this._render();
    });
    chipsEl.appendChild(allChip);

    for (const lang of langs) {
      const chip = document.createElement('button');
      chip.className = 'vocablib-lang-chip' + (this._langFilter === lang ? ' active' : '');
      chip.textContent = this._langNames[lang] || lang;
      chip.addEventListener('click', () => {
        this._langFilter = this._langFilter === lang ? null : lang;
        this._render();
      });
      chipsEl.appendChild(chip);
    }
  }

  _openBook(title) {
    if (!title) return;
    let path = '';
    const recents = (appStore.data && appStore.data.pdfRecents) || [];
    const match = recents.find((r) => r.name === title);
    if (match) path = match.path;

    app._showReadHome();
    app._openReadPage('pdf');
    if (path && app._pdfOpenPath) {
      setTimeout(() => app._pdfOpenPath(path), 300);
    } else {
      app._pdfShowViewer('viewer');
    }
  }

  _openVideoPlayer(youtubeUrl) {
    const meta = this._videoMeta[youtubeUrl] || {};
    const position = meta.lastPosition || 0;

    app._showReadHome();
    app._openReadPage('youtube');
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
    this._setEditMode(false);
    this._view = 'dict';
    this._currentVideoUrl = youtubeUrl;
    this._dictSearchQuery = '';
    this._dictSort = 'newest';
    document.getElementById('vocabLibDictSearch').value = '';
    document.getElementById('vocabLibDictSort').value = 'newest';
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
      thumbEl.innerHTML = `<span class="vocablib-dict-thumb-fallback">${this._isYt() ? '&#9654;' : '&#128218;'}</span>`;
    }

    const openContainer = () => {
      if (this._isYt()) this._openVideoPlayer(video.url);
      else this._openBook(video.url);
    };

    thumbWrap.onclick = openContainer;
    playBtn.onclick = (e) => {
      e.stopPropagation();
      openContainer();
    };

    titleEl.textContent = video.title;
    countEl.textContent = `${video.wordCount} word${video.wordCount !== 1 ? 's' : ''}`;
    lastWatchedEl.textContent = video.lastWatched
      ? `Last active ${this._timeAgo(video.lastWatched)}`
      : '';

    this._syncFilterCheckboxes();
    this._updateFilterLabels();
    this._renderDictList();
  }

  _syncFilterCheckboxes() {
    const filterIds = { armenian: 'vocabFilterArmenian', russian: 'vocabFilterRussian', context: 'vocabFilterContext', timestamp: 'vocabFilterTimestamp', date: 'vocabFilterDate' };
    for (const [key, id] of Object.entries(filterIds)) {
      const el = document.getElementById(id);
      if (el) el.checked = !!this._filters[key];
    }
  }

  _renderDictList() {
    const listEl = document.getElementById('vocabLibDictList');
    const words = this._getWordsForVideo(this._currentVideoUrl);

    this._rebuildEditWordMap();

    if (words.length === 0) {
      listEl.innerHTML = `
        <div class="vocablib-dict-empty">
          <p>${this._dictSearchQuery ? 'No words match your search.' : 'No saved words from this video.'}</p>
        </div>
      `;
      return;
    }

    const f = this._filters;

    listEl.innerHTML = words
      .map((w) => {
        if (this._editMode) {
          return this._renderEditWord(w);
        }

        const date = f.date ? `<span class="vocablib-word-date">${new Date(w.timestamp).toLocaleDateString()}</span>` : '';
        const time = f.timestamp && w.videoTimestamp ? `<span class="vocablib-word-timestamp" title="Video timestamp">${this._fmtTime(w.videoTimestamp)}</span>` : '';
        const context = f.context && w.context
          ? `<div class="vocablib-word-context">&ldquo;${this._highlightWord(this._esc(w.context), this._esc(w.word))}&rdquo;</div>`
          : '';

        const engTtsBtn = `<button class="vocablib-tts-btn" data-tts-text="${this._esc(w.word)}" data-tts-lang="en" title="Listen">&#9654;</button>`;

        let armenian = '';
        if (f.armenian && w.translation) {
          const safeText = this._esc(w.translation);
          const ttsBtn = `<button class="vocablib-tts-btn" data-tts-text="${safeText}" data-tts-lang="${this._esc(w.translationLang || 'hy')}" title="Listen">&#9654;</button>`;
          armenian = `<span class="vocablib-word-armenian">${ttsBtn} ${safeText}</span>`;
        }

        let russian = '';
        if (f.russian && w.russian) {
          const safeText = this._esc(w.russian);
          const ttsBtn = `<button class="vocablib-tts-btn" data-tts-text="${safeText}" data-tts-lang="${this._esc(w.russianLang || 'ru')}" title="Listen">&#9654;</button>`;
          russian = `<span class="vocablib-word-russian">${ttsBtn} ${safeText}</span>`;
        }

        const hasTranslations = armenian || russian;
        const isCompact = !context && !time && !date;

        const deleteBtn = `<button class="vocablib-word-delete" data-id="${w.id}" title="Delete word" aria-label="Delete word">&times;</button>`;

        return `
          <div class="vocablib-word${isCompact ? ' vocablib-word-compact' : ''}" data-id="${w.id}">
            ${deleteBtn}
            <div class="vocablib-word-main">
              <div class="vocablib-word-en">${engTtsBtn} ${this._esc(w.word)}</div>
              ${hasTranslations ? `<div class="vocablib-word-translations">${armenian}${russian}</div>` : ''}
            </div>
            ${context}
            ${(time || date) ? `
            <div class="vocablib-word-footer">
              ${time}
              ${date}
            </div>
            ` : ''}
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

    listEl.querySelectorAll('.vocablib-tts-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.dataset.ttsText;
        const lang = btn.dataset.ttsLang;
        if (text) this._speak(text, lang);
      });
    });

    listEl.querySelectorAll('.vocablib-edit-chip[data-word]').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleChipSelection(chip.dataset.word, chip);
      });
    });

    listEl.querySelectorAll('.vocablib-edit-parent[data-parent]').forEach((btn) => {
      const key = btn.dataset.parent.toLowerCase();
      const selected = this._editSelection.has(key);
      btn.classList.toggle('selected', selected);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleChipSelection(btn.dataset.parent, btn);
      });
    });

    this._preloadTTS(words);
  }

  _renderEditWord(w) {
    const hasContext = !!(w.context && w.context.trim());
    const contextHtml = hasContext
      ? `<div class="vocablib-word-context vocablib-edit-context">${this._renderChips(w.context)}</div>`
      : '<div class="vocablib-edit-no-context">No context sentence for this word.</div>';

    return `
      <div class="vocablib-word vocablib-word-edit" data-id="${w.id}">
        <div class="vocablib-word-main">
          <button class="vocablib-edit-parent" data-parent="${this._esc(w.word)}" title="Click to select this word">
            ${this._esc(w.word)}
          </button>
        </div>
        ${contextHtml}
      </div>
    `;
  }

  _renderChips(context) {
    const chips = this._tokenizeContext(context);
    return chips.map((token) => {
      const key = token.toLowerCase();
      if (!this._editWordMap.has(key) || this._isParentWord(key)) {
        return `<span class="vocablib-edit-nonword">${this._esc(token)}</span>`;
      }
      const selected = this._editSelection.has(key);
      return `<button class="vocablib-edit-chip${selected ? ' selected' : ''}" data-word="${this._esc(token)}" title="Click to select">${this._esc(token)}</button>`;
    }).join(' ');
  }

  _tokenizeContext(context) {
    return String(context).split(/(\s+)/).filter((t) => t.trim().length > 0);
  }

  _rebuildEditWordMap() {
    this._editWordMap.clear();
    const seen = new Set();
    const words = this._entries.filter((e) => this._matchesContainer(e, this._currentVideoUrl));
    for (const w of words) {
      const key = w.word.toLowerCase();
      if (!this._editWordMap.has(key)) {
        this._editWordMap.set(key, w);
      }
      if (w.context && !seen.has(w.context)) {
        seen.add(w.context);
      }
    }
  }

  _isParentWord(key) {
    return false;
  }

  _toggleChipSelection(word, chipEl) {
    const key = word.toLowerCase();
    if (this._editSelection.has(key)) {
      this._editSelection.delete(key);
      chipEl.classList.remove('selected');
    } else {
      this._editSelection.add(key);
      chipEl.classList.add('selected');
    }
    this._updateAcceptCount();
  }

  _updateAcceptCount() {
    const countEl = document.getElementById('vocabLibAcceptCount');
    if (countEl) countEl.textContent = this._editSelection.size ? `(${this._editSelection.size})` : '';
  }

  _setEditMode(on) {
    this._editMode = on;
    if (!on) {
      this._editSelection.clear();
    }
    const acceptBar = document.getElementById('vocabLibAcceptBar');
    const editBtn = document.getElementById('btnVocabLibEdit');
    const feedback = document.getElementById('vocabLibAcceptFeedback');
    if (acceptBar) acceptBar.style.display = on ? 'flex' : 'none';
    if (editBtn) editBtn.classList.toggle('active', on);
    if (feedback) feedback.textContent = '';
    this._updateAcceptCount();
    if (this._view === 'dict' && this._currentVideoUrl) {
      this._renderDictList();
    }
  }

  _toggleEditMode() {
    this._setEditMode(!this._editMode);
  }

  async _acceptSelection() {
    const keys = Array.from(this._editSelection);
    if (keys.length === 0) return;

    const feedback = document.getElementById('vocabLibAcceptFeedback');
    const acceptBar = document.getElementById('vocabLibAcceptBar');

    let saved = 0;
    let skipped = 0;

    const firstLang = (app._getActiveLangs && app._getActiveLangs()[0]) || this._primaryTargetLang() || 'hy';

    for (const key of keys) {
      const parent = this._entries.find(
        (e) => this._matchesContainer(e, this._currentVideoUrl) && e.word.toLowerCase() === key
      );

      let parentWord = parent;
      if (!parentWord) {
        for (const [k, w] of this._editWordMap) {
          if (k === key) { parentWord = w; break; }
        }
      }

      const sourceUrl = parentWord ? this._containerKey(parentWord) : this._currentVideoUrl;
      const videoTimestamp = parentWord ? (parentWord.videoTimestamp || 0) : 0;

      try {
        const langs = (app._getActiveLangs ? app._getActiveLangs() : [firstLang]);
        const result = await window.electronAPI.translateWord(key, 'en', langs, 2);
        const data = result || {};
        const t1 = langs[0] || '';
        const t2 = langs[1] || '';
        const firstVal = data[t1];
        const secondVal = data[t2];

        const isPdf = !this._isYt();
        const entry = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          word: key,
          translation: Array.isArray(firstVal) ? firstVal[0] || '' : firstVal || '',
          russian: Array.isArray(secondVal) ? secondVal[0] || '' : secondVal || '',
          transliteration: '',
          translationLang: t1,
          russianLang: t2,
          context: parentWord ? parentWord.context : '',
          sourceType: isPdf ? 'pdf' : 'youtube',
          sourceTitle: parentWord ? parentWord.sourceTitle || '' : '',
          sourceId: parentWord ? parentWord.sourceId || '' : '',
          youtubeUrl: isPdf ? '' : sourceUrl,
          thumbnailUrl: parentWord ? parentWord.thumbnailUrl || '' : '',
          videoTimestamp: videoTimestamp,
          timestamp: Date.now(),
        };

        const addResult = await window.electronAPI.dictionaryAdd(entry);
        if (addResult && addResult.success) {
          saved++;
        } else if (addResult && addResult.reason === 'exists') {
          skipped++;
        } else {
          skipped++;
        }
      } catch (e) {
        skipped++;
        console.error('Failed to save word in edit mode:', e);
      }
    }

    appStore.invalidateSavedWordsCache();
    this._entries = await appStore.loadSavedWords();

    if (feedback) {
      feedback.textContent = `Saved ${saved}, skipped ${skipped} already saved.`;
      setTimeout(() => { if (feedback) feedback.textContent = ''; }, 4000);
    }

    this._setEditMode(false);
  }

  _primaryTargetLang() {
    try {
      const saved = localStorage.getItem('yt-lang-prefs');
      if (saved) {
        const p = JSON.parse(saved);
        return p.to1 || 'hy';
      }
    } catch (e) {}
    return 'hy';
  }

  _speak(text, lang) {
    if (lang === 'en') {
      if (typeof tts !== 'undefined' && tts.speak) {
        tts.speak(text);
      }
    } else {
      window.electronAPI.ttsSpeak(text, lang)
        .then(result => {
          if (result && result.success) {
            const audio = new Audio('data:audio/mpeg;base64,' + result.audio);
            audio.play().catch(() => {});
          }
        })
        .catch(() => {});
    }
  }

  _preloadTTS(words) {
    if (!words) return;
    for (const w of words) {
      if (w.translation) {
        const lang = w.translationLang || 'hy';
        window.electronAPI.ttsSpeak(w.translation, lang).catch(() => {});
      }
      if (w.russian) {
        const lang = w.russianLang || 'ru';
        window.electronAPI.ttsSpeak(w.russian, lang).catch(() => {});
      }
    }
  }

  async _deleteWord(wordId) {
    try {
      const result = await window.electronAPI.vocabLibDeleteWord(wordId);
      if (result && result.success) {
        appStore.invalidateSavedWordsCache();
        this._entries = this._entries.filter((e) => e.id !== wordId);
        const remaining = this._entries.filter((e) => this._matchesContainer(e, this._currentVideoUrl));
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
    const target = this._entries.filter((e) => this._matchesContainer(e, this._currentVideoUrl));
    const count = target.length;
    if (!confirm(`Delete ${count} word${count !== 1 ? 's' : ''} from this ${this._isYt() ? 'video' : 'book'}? This cannot be undone.`)) {
      return;
    }
    try {
      if (this._isYt()) {
        const result = await window.electronAPI.vocabLibDeleteVideo(this._currentVideoUrl);
        if (result && result.success) {
          appStore.invalidateSavedWordsCache();
          this._entries = this._entries.filter((e) => !this._matchesContainer(e, this._currentVideoUrl));
          delete this._videoMeta[this._currentVideoUrl];
        }
      } else {
        for (const w of target) {
          await window.electronAPI.vocabLibDeleteWord(w.id);
        }
        appStore.invalidateSavedWordsCache();
        this._entries = this._entries.filter((e) => !this._matchesContainer(e, this._currentVideoUrl));
      }
      this._view = 'grid';
      this._currentVideoUrl = null;
      this._render();
    } catch (e) {
      console.error('Failed to delete vocabulary:', e);
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
