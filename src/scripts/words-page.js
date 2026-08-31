class WordsPage {
  constructor() {
    this._entries = [];
    this._currentSourceId = null;
    this._searchQuery = '';
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btnWordsBack').addEventListener('click', () => {
      if (this._currentSourceId) {
        this._currentSourceId = null;
        this._render();
      } else {
        app._showReadHome();
      }
    });

    document.getElementById('btnWordsSearch').addEventListener('input', (e) => {
      this._searchQuery = e.target.value.trim().toLowerCase();
      this._render();
    });
  }

  async show() {
    this._currentSourceId = null;
    this._searchQuery = '';
    document.getElementById('btnWordsSearch').value = '';
    try {
      this._entries = await appStore.loadSavedWords();
    } catch (e) {
      this._entries = [];
    }
    this._render();
  }

  _getSources() {
    const map = new Map();
    for (const entry of this._entries) {
      const sid = entry.sourceId || 'unknown';
      if (!map.has(sid)) {
        map.set(sid, {
          id: sid,
          title: entry.sourceTitle || 'Untitled',
          type: entry.sourceType || 'text',
          youtubeUrl: entry.youtubeUrl || '',
          count: 0,
          firstDate: entry.timestamp,
          lastDate: entry.timestamp,
        });
      }
      const src = map.get(sid);
      src.count++;
      if (entry.timestamp < src.firstDate) src.firstDate = entry.timestamp;
      if (entry.timestamp > src.lastDate) src.lastDate = entry.timestamp;
    }
    return Array.from(map.values());
  }

  _getSourceEntries(sourceId) {
    let entries = this._entries.filter((e) => (e.sourceId || 'unknown') === sourceId);
    if (this._searchQuery) {
      entries = entries.filter((e) =>
        e.word.toLowerCase().includes(this._searchQuery) ||
        (e.translation || '').toLowerCase().includes(this._searchQuery)
      );
    }
    return entries;
  }

  _render() {
    const emptyEl = document.getElementById('wordsEmpty');
    const listEl = document.getElementById('wordsSourceList');
    const searchWrap = document.getElementById('wordsSearchWrap');
    const backBtn = document.getElementById('btnWordsBack');

    if (this._currentSourceId) {
      backBtn.innerHTML = '&#8592;';
      searchWrap.style.display = '';
      this._renderSourceView(listEl, emptyEl);
    } else {
      backBtn.innerHTML = '&#8592;';
      searchWrap.style.display = 'none';
      this._renderSourceList(listEl, emptyEl);
    }
  }

  _renderSourceList(listEl, emptyEl) {
    const sources = this._getSources();
    if (sources.length === 0) {
      emptyEl.style.display = '';
      listEl.innerHTML = '';
      return;
    }
    emptyEl.style.display = 'none';
    const typeIcons = { text: '&#9998;', pdf: '&#128196;', youtube: '&#9654;' };
    listEl.innerHTML = sources.map((src) => {
      const date = new Date(src.lastDate).toLocaleDateString();
      const icon = typeIcons[src.type] || '&#128196;';
      return `
        <div class="words-source-item" data-source-id="${src.id}">
          <div class="words-source-icon">${icon}</div>
          <div class="words-source-info">
            <div class="words-source-title">${this._esc(src.title)}</div>
            <div class="words-source-meta">${src.count} word${src.count !== 1 ? 's' : ''} &middot; ${date}</div>
          </div>
          <div class="words-source-arrow">&#8250;</div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.words-source-item').forEach((el) => {
      el.addEventListener('click', () => {
        this._currentSourceId = el.dataset.sourceId;
        document.getElementById('btnWordsSearch').value = '';
        this._searchQuery = '';
        this._render();
      });
    });
  }

  _renderSourceView(listEl, emptyEl) {
    const entries = this._getSourceEntries(this._currentSourceId);
    if (entries.length === 0) {
      emptyEl.querySelector('.words-empty-title').textContent = 'No words found';
      emptyEl.querySelector('.words-empty-text').textContent = this._searchQuery ? 'Try a different search.' : 'All words from this source have been deleted.';
      emptyEl.style.display = '';
      listEl.innerHTML = '';
      return;
    }
    emptyEl.style.display = 'none';
    listEl.innerHTML = entries.map((e) => {
      const date = new Date(e.timestamp).toLocaleDateString();
      const context = e.context ? `<div class="words-entry-context">${this._esc(e.context)}</div>` : '';
      return `
        <div class="words-entry" data-id="${e.id}">
          <div class="words-entry-main">
            <span class="words-entry-word">${this._esc(e.word)}</span>
            <span class="words-entry-arrow">&#8594;</span>
            <span class="words-entry-translation">${this._esc(e.translation)}</span>
          </div>
          ${context}
          <div class="words-entry-footer">
            <span class="words-entry-date">${date}</span>
            <button class="words-entry-delete" data-id="${e.id}" title="Delete">&#128465;</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.words-entry-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await window.electronAPI.dictionaryRemove(id);
        appStore.invalidateSavedWordsCache();
        this._entries = this._entries.filter((en) => en.id !== id);
        this._render();
      });
    });
  }

  _esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
}
