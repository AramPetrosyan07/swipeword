class TranslationPopup {
  constructor() {
    this._popup = document.getElementById('readerTranslatePopup');
    this._wordEl = document.getElementById('readerTranslateWord');
    this._armenianEl = document.getElementById('readerTranslateArmenian');
    this._russianEl = document.getElementById('readerTranslateRussian');
    this._saveBtn = document.getElementById('btnReaderAddWord');
    this._closeBtn = document.getElementById('btnReaderTranslateClose');
    this._currentWord = null;
    this._currentContext = '';
    this._currentSource = null;
    this._cache = new Map();
    this._boundContainers = new WeakSet();

    this._closeBtn.addEventListener('click', () => this.hide());
    this._saveBtn.addEventListener('click', () => this._save());
  }

  bindToContainer(container, sourceInfo) {
    if (this._boundContainers.has(container)) return;
    this._boundContainers.add(container);
    container.addEventListener('dblclick', (e) => {
      const span = e.target.closest('.rw-word');
      if (!span) return;
      e.preventDefault();
      e.stopPropagation();
      const word = span.dataset.word || span.textContent;
      const context = WordWrapper.getSentenceForWord(container.textContent, word);
      this.show(word, context, span, sourceInfo);
    });
  }

  show(word, context, targetEl, sourceInfo) {
    this._currentWord = word;
    this._currentContext = context;
    this._currentSource = sourceInfo || {};
    this._wordEl.textContent = word;
    this._armenianEl.textContent = '...';
    this._russianEl.textContent = '...';
    this._popup.style.display = 'flex';

    const rect = targetEl.getBoundingClientRect();
    const popupW = 320;
    const popupH = 200;
    let left = rect.left + rect.width / 2 - popupW / 2;
    let top = rect.bottom + 8;
    if (top + popupH > window.innerHeight) {
      top = rect.top - popupH - 8;
    }
    if (left < 8) left = 8;
    if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
    if (top < 8) top = 8;
    this._popup.style.left = left + 'px';
    this._popup.style.top = top + 'px';
    this._popup.style.position = 'fixed';
    this._popup.style.bottom = 'auto';
    this._popup.style.transform = 'none';

    this._fetchTranslation(word);
  }

  hide() {
    this._popup.style.display = 'none';
    this._currentWord = null;
    this._currentContext = '';
  }

  async _fetchTranslation(word) {
    const lower = word.toLowerCase();
    if (this._cache.has(lower)) {
      const cached = this._cache.get(lower);
      this._armenianEl.textContent = cached.armenian || 'N/A';
      this._russianEl.textContent = cached.russian || 'N/A';
      return;
    }

    try {
      const result = await window.electronAPI.translateWord(lower);
      const data = result || {};
      this._cache.set(lower, data);
      this._armenianEl.textContent = data.armenian || 'N/A';
      this._russianEl.textContent = data.russian || 'N/A';
    } catch (e) {
      this._armenianEl.textContent = 'Unavailable';
      this._russianEl.textContent = 'Unavailable';
    }
  }

  async _save() {
    if (!this._currentWord) return;
    const word = this._currentWord;
    const lower = word.toLowerCase();
    const cached = this._cache.get(lower) || {};
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      word: lower,
      translation: cached.armenian || '',
      transliteration: cached.transliteration || '',
      context: this._currentContext,
      sourceType: this._currentSource.type || 'text',
      sourceTitle: this._currentSource.title || '',
      sourceId: this._currentSource.id || '',
      youtubeUrl: this._currentSource.youtubeUrl || '',
      timestamp: Date.now(),
    };

    try {
      const result = await window.electronAPI.dictionaryAdd(entry);
      if (result && result.success) {
        this._saveBtn.textContent = 'Saved!';
        setTimeout(() => { this._saveBtn.textContent = '+ Save to Dictionary'; }, 1500);
      } else if (result && result.reason === 'exists') {
        this._saveBtn.textContent = 'Already saved';
        setTimeout(() => { this._saveBtn.textContent = '+ Save to Dictionary'; }, 1500);
      }
    } catch (e) {
      console.error('Failed to save word:', e);
    }
  }
}
