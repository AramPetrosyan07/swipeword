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
    this.onSave = null;

    this._closeBtn.addEventListener('click', () => this.hide());
    this._saveBtn.addEventListener('click', () => this._save());
  }

  bindToContainer(container, sourceInfo) {
    if (this._boundContainers.has(container)) return;
    this._boundContainers.add(container);

    let isDragging = false;
    let startWord = null;
    let selectedWords = [];

    const clearHighlights = () => {
      selectedWords.forEach(w => w.classList.remove('selected'));
      selectedWords = [];
    };

    const updateHighlights = (from, to) => {
      clearHighlights();
      if (!from || !to) return;
      const words = Array.from(container.querySelectorAll('.rw-word'));
      const fromIdx = words.indexOf(from);
      const toIdx = words.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return;
      const start = Math.min(fromIdx, toIdx);
      const end = Math.max(fromIdx, toIdx);
      for (let i = start; i <= end; i++) {
        words[i].classList.add('selected');
        selectedWords.push(words[i]);
      }
    };

    const wordFromPoint = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.closest('.rw-word') : null;
    };

    const showTranslation = (words, anchorEl) => {
      const text = words.map(w => w.dataset.word || w.textContent).join(' ');
      const context = WordWrapper.getSentenceForWord(container.textContent, text);
      this.show(text, context, anchorEl, sourceInfo);
    };

    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const word = e.target.closest('.rw-word');
      if (!word) return;
      e.preventDefault();
      isDragging = true;
      startWord = word;
      selectedWords = [word];
      word.classList.add('selected');
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const word = wordFromPoint(e.clientX, e.clientY);
      if (word && word !== startWord) {
        updateHighlights(startWord, word);
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;

      const wordsCopy = [...selectedWords];
      clearHighlights();

      if (wordsCopy.length > 0) {
        showTranslation(wordsCopy, wordsCopy[0]);
      }
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
    this._popup.dataset.justOpened = '1';
    setTimeout(() => { delete this._popup.dataset.justOpened; }, 0);

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

    let thumbnailUrl = '';
    let videoTimestamp = 0;
    if (this._currentSource && this._currentSource.type === 'youtube' && this._currentSource.youtubeUrl) {
      const match = this._currentSource.youtubeUrl.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      if (match) {
        thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
      }
      if (typeof app !== 'undefined' && app._ytPlayer && typeof app._ytPlayer.getCurrentTime === 'function') {
        videoTimestamp = Math.floor(app._ytPlayer.getCurrentTime());
      }
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      word: lower,
      translation: cached.armenian || '',
      russian: cached.russian || '',
      transliteration: cached.transliteration || '',
      context: this._currentContext,
      sourceType: this._currentSource.type || 'text',
      sourceTitle: this._currentSource.title || '',
      sourceId: this._currentSource.id || '',
      youtubeUrl: this._currentSource.youtubeUrl || '',
      thumbnailUrl: thumbnailUrl,
      videoTimestamp: videoTimestamp,
      timestamp: Date.now(),
    };

    try {
      const result = await window.electronAPI.dictionaryAdd(entry);
      if (result && result.success) {
        this._saveBtn.textContent = 'Saved!';
        setTimeout(() => { this._saveBtn.textContent = '+ Save to Dictionary'; }, 1500);
        if (this.onSave) this.onSave(entry);
      } else if (result && result.reason === 'exists') {
        this._saveBtn.textContent = 'Already saved';
        setTimeout(() => { this._saveBtn.textContent = '+ Save to Dictionary'; }, 1500);
      }
    } catch (e) {
      console.error('Failed to save word:', e);
    }
  }
}
