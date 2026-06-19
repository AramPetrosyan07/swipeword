class WordCollector {
  constructor() {
    this.collection = [];
    this._selectedWord = null;
    this._bindEvents();
  }

  async show() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-collector').classList.add('active');
    document.getElementById('collectorInput').value = '';
    document.getElementById('collectorSuggestions').innerHTML = '';
    document.getElementById('collectorInput').focus();
    this._selectedWord = null;
    this._hideDetail();
    await this._loadCollection();
    this._renderCollection();
  }

  _bindEvents() {
    const input = document.getElementById('collectorInput');
    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const val = input.value.trim();
      if (!val) {
        document.getElementById('collectorSuggestions').innerHTML = '';
        this._hideDetail();
        this._selectedWord = null;
        return;
      }
      debounceTimer = setTimeout(() => this._search(val), 150);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val) this._addWord(val);
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const suggestions = document.getElementById('collectorSuggestions');
        const items = suggestions.querySelectorAll('.collector-suggestion');
        if (items.length === 0) return;
        e.preventDefault();
        let idx = Array.from(items).findIndex(el => el.classList.contains('active'));
        if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
        else idx = Math.max(idx - 1, -1);
        items.forEach(el => el.classList.remove('active'));
        if (idx >= 0) {
          items[idx].classList.add('active');
          items[idx].scrollIntoView({ block: 'nearest' });
        }
      }
    });

    document.getElementById('btnCollectorBack').addEventListener('click', () => {
      app._showLearnScreen();
    });

    document.getElementById('btnCollectorAdd').addEventListener('click', () => {
      const val = input.value.trim();
      if (val) this._addWord(val);
    });

    document.addEventListener('click', (e) => {
      const suggestions = document.getElementById('collectorSuggestions');
      if (!e.target.closest('.collector-search-wrap')) {
        suggestions.innerHTML = '';
      }
    });
  }

  _search(query) {
    const q = query.toLowerCase();
    const dicts = [
      ...(appStore.b2Dictionary || []),
      ...(appStore.c1Dictionary || []),
      ...(appStore.verbDictionary || []),
    ];
    if (dicts.length === 0) return;

    const seen = new Set();
    const matches = [];
    for (const entry of dicts) {
      const id = entry.id;
      if (seen.has(id)) continue;
      seen.add(id);

      const english = (entry.english || '').toLowerCase();
      const armenian = (Array.isArray(entry.armenian) ? entry.armenian.join(' ') : (entry.armenian || '')).toLowerCase();
      const russian = (entry.russian || '').toLowerCase();

      if (english === q) {
        matches.unshift(entry);
        if (matches.length > 10) matches.pop();
      } else if (english.startsWith(q)) {
        matches.push(entry);
        if (matches.length > 10) break;
      } else if (q.length >= 1 && armenian.includes(q)) {
        matches.push(entry);
        if (matches.length > 10) break;
      } else if (q.length >= 1 && russian.includes(q)) {
        matches.push(entry);
        if (matches.length > 10) break;
      }
    }

    this._renderSuggestions(matches, q);
  }

  _dictLabel(entry) {
    if (appStore.b2Dictionary && appStore.b2Dictionary.some(e => e.id === entry.id && e.english === entry.english)) return 'B2';
    if (appStore.c1Dictionary && appStore.c1Dictionary.some(e => e.id === entry.id && e.english === entry.english)) return 'C1';
    if (appStore.verbDictionary && appStore.verbDictionary.some(e => e.id === entry.id && e.english === entry.english)) return 'Verb';
    return '';
  }

  _renderSuggestions(matches, query) {
    const container = document.getElementById('collectorSuggestions');
    container.innerHTML = '';

    if (matches.length === 0) {
      const item = document.createElement('div');
      item.className = 'collector-suggestion collector-suggestion-no-result';
      item.textContent = 'Not found in dictionary — will be added as-is';
      container.appendChild(item);
      return;
    }

    matches.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'collector-suggestion';
      const english = entry.english || '';
      const armenian = Array.isArray(entry.armenian) ? entry.armenian.join(', ') : (entry.armenian || '');
      const russian = entry.russian || '';
      const label = this._dictLabel(entry);
      const armenianHtml = this._highlight(armenian, query);
      const russianHtml = russian ? this._highlight(russian, query) : '';
      item.innerHTML = `
        <div class="collector-suggestion-info">
          <span class="collector-suggestion-word">${this._highlight(english, query)}</span>
          ${label ? `<span class="collector-suggestion-badge">${label}</span>` : ''}
        </div>
        <div class="collector-suggestion-translations">
          <span class="collector-suggestion-translation">${armenianHtml}</span>
          ${russian ? `<span class="collector-suggestion-russian">${russianHtml}</span>` : ''}
        </div>
      `;
      item.addEventListener('click', () => {
        this._selectSuggestion(entry);
      });
      container.appendChild(item);
    });
  }

  _selectSuggestion(entry) {
    const input = document.getElementById('collectorInput');
    input.value = entry.english || '';
    document.getElementById('collectorSuggestions').innerHTML = '';
    this._selectedWord = entry;
    this._showDetail(entry);
  }

  _showDetail(entry) {
    const detail = document.getElementById('collectorWordDetail');
    detail.style.display = 'block';
    document.getElementById('collectorDetailEnglish').textContent = entry.english || '';
    document.getElementById('collectorDetailArmenian').textContent =
      Array.isArray(entry.armenian) ? entry.armenian.join(', ') : (entry.armenian || '');
    document.getElementById('collectorDetailRussian').textContent = entry.russian || '';
    document.getElementById('collectorDetailType').textContent = entry.type || '';
    const ex = entry.english_example && entry.english_example.length > 0
      ? entry.english_example[0] : (entry.example || '');
    document.getElementById('collectorDetailExample').textContent = ex ? `"${ex}"` : '';
  }

  _hideDetail() {
    document.getElementById('collectorWordDetail').style.display = 'none';
  }

  async _addWord(text) {
    const word = text.trim();
    if (!word) return;

    const result = await window.electronAPI.collectionAdd(word);
    if (result.success) {
      document.getElementById('collectorInput').value = '';
      document.getElementById('collectorSuggestions').innerHTML = '';
      this._selectedWord = null;
      this._hideDetail();
      document.getElementById('collectorInput').focus();
      await this._loadCollection();
      this._renderCollection();
      this._showToast(`"${word}" added to collection`);
    } else if (result.reason === 'exists') {
      this._showToast(`"${word}" is already in collection`);
    }
  }

  async _removeWord(word) {
    const result = await window.electronAPI.collectionRemove(word);
    if (result.success) {
      await this._loadCollection();
      this._renderCollection();
      this._showToast(`"${word}" removed`);
    }
  }

  async _loadCollection() {
    this.collection = await window.electronAPI.collectionLoad();
  }

  _renderCollection() {
    const container = document.getElementById('collectorListItems');
    container.innerHTML = '';

    if (this.collection.length === 0) {
      container.innerHTML = '<div class="collector-empty">No words collected yet</div>';
      return;
    }

    this.collection.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'collector-list-item';

      const found = this._findInDictionary(item.word);
      const meta = found ? found.type || '' : '';

      row.innerHTML = `
        <div class="collector-list-info">
          <span class="collector-list-word">${this._escape(item.word)}</span>
          <span class="collector-list-date">${item.addedAt}${meta ? ' · ' + meta : ''}</span>
        </div>
        <button class="collector-list-remove" title="Remove">&times;</button>
      `;
      row.querySelector('.collector-list-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeWord(item.word);
      });
      container.appendChild(row);
    });
  }

  _findInDictionary(word) {
    const dicts = [
      ...(appStore.b2Dictionary || []),
      ...(appStore.c1Dictionary || []),
      ...(appStore.verbDictionary || []),
    ];
    if (dicts.length === 0) return null;
    const q = word.toLowerCase();
    for (const entry of dicts) {
      if ((entry.english || '').toLowerCase() === q) return entry;
    }
    return null;
  }

  _highlight(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return this._escape(text);
    return this._escape(text.substring(0, idx))
      + '<strong>' + this._escape(text.substring(idx, idx + query.length)) + '</strong>'
      + this._escape(text.substring(idx + query.length));
  }

  _escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _showToast(message) {
    const toast = document.getElementById('copyToast');
    const textEl = document.getElementById('copyToastText');
    if (!toast || !textEl) return;
    textEl.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2000);
  }
}

const wordCollector = new WordCollector();
