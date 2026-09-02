class TranslationPopup {
  constructor() {
    this._popup = document.getElementById('readerTranslatePopup');
    this._defaultParent = this._popup.parentNode;
    this._wordEl = document.getElementById('readerTranslateWord');
    this._bodyEl = this._popup.querySelector('.reader-translate-body');
    this._saveBtn = document.getElementById('btnReaderAddWord');
    this._closeBtn = document.getElementById('btnReaderTranslateClose');
    this._currentWord = null;
    this._currentContext = '';
    this._currentSource = null;
    this._currentTimestamp = 0;
    this._pdfAnchorRect = null;
    this._resumeOnHide = false;
    this._cache = new Map();
    this._boundContainers = new WeakSet();
    this._containerSources = new WeakMap();
    this.onSave = null;
    this._languages = { from: 'en' };
    this._targetLangs = ['hy', 'ru'];
    this._wordCount = 3;
    this._voiceId = 0;
    this._langNames = {
      en:'English',es:'Spanish',fr:'French',de:'German',it:'Italian',pt:'Portuguese',
      ru:'Russian',ar:'Arabic',zh:'Chinese',ja:'Japanese',ko:'Korean',hi:'Hindi',
      hy:'Armenian',tr:'Turkish',pl:'Polish',nl:'Dutch',sv:'Swedish',uk:'Ukrainian',
      el:'Greek',cs:'Czech',ro:'Romanian',hu:'Hungarian',fi:'Finnish',da:'Danish',
      no:'Norwegian',he:'Hebrew',th:'Thai',vi:'Vietnamese',id:'Indonesian',
      ka:'Georgian',bn:'Bengali',ur:'Urdu',fa:'Persian',sw:'Swahili',fil:'Filipino',ms:'Malay'
    };
    this._langSpeechMap = {
      en:'en-US',es:'es-ES',fr:'fr-FR',de:'de-DE',it:'it-IT',pt:'pt-PT',
      ru:'ru-RU',ar:'ar-SA',zh:'zh-CN',ja:'ja-JP',ko:'ko-KR',hi:'hi-IN',
      hy:'hy-AM',tr:'tr-TR',pl:'pl-PL',nl:'nl-NL',sv:'sv-SE',uk:'uk-UA',
      el:'el-GR',cs:'cs-CZ',ro:'ro-RO',hu:'hu-HU',fi:'fi-FI',da:'da-DK',
      no:'no-NO',he:'he-IL',th:'th-TH',vi:'vi-VN',id:'id-ID',ka:'ka-GE',
      bn:'bn-BD',ur:'ur-PK',fa:'fa-IR',sw:'sw-KE',fil:'fil-PH',ms:'ms-MY'
    };

    this._closeBtn.addEventListener('click', () => this.hide());
    this._saveBtn.addEventListener('click', () => this._save());
    this._bodyEl.addEventListener('click', (e) => {
      const left = e.target.closest('.rw-word-copy');
      const right = e.target.closest('.rw-word-tts');
      if (left) {
        this._copyWord(left.dataset.text);
        left.closest('.rw-word-chip').classList.add('copied');
        setTimeout(() => {
          const chip = left.closest('.rw-word-chip');
          if (chip) chip.classList.remove('copied');
        }, 600);
      } else if (right) {
        this._speakWord(right.dataset.text, right.dataset.lang);
      }
    });
  }

  setVoice(id) {
    this._voiceId = (id === undefined || id === null) ? 0 : id;
  }

  async _speakWord(text, lang) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    await this._fallbackTTS(text, lang);
  }

  async _fallbackTTS(text, lang) {
    try {
      const result = await window.electronAPI.ttsSpeak(text, lang, this._voiceId);
      if (result && result.success) {
        const audio = new Audio('data:audio/mpeg;base64,' + result.audio);
        await audio.play();
        return;
      }
    } catch (e) {
      console.warn('TTS fallback failed:', e);
    }
    this._showTtsNotice(`TTS unavailable for ${this._langNames[lang] || lang}`, 'error');
  }

  _showTtsNotice(msg, type) {
    const toast = document.getElementById('copyToast');
    const textEl = document.getElementById('copyToastText');
    if (!toast || !textEl) return;
    const color = type === 'error' ? '#f44336' : '#ff9800';
    textEl.innerHTML = `<span style="color:${color};">&#9888;</span> ${msg}`;
    toast.classList.add('visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 5000);
  }

  _copyWord(text) {
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.getElementById('copyToast');
      const textEl = document.getElementById('copyToastText');
      if (!toast || !textEl) return;
      textEl.innerHTML = '<span style="color:#4caf50;font-weight:700;">&#10003;</span> Copied';
      toast.classList.add('visible');
      clearTimeout(toast._hideTimer);
      toast._hideTimer = setTimeout(() => {
        toast.classList.remove('visible');
      }, 1500);
    }).catch(() => {});
  }

  setLanguages(from, langs, wordCount) {
    this._languages = { from };
    this._targetLangs = Array.isArray(langs) ? langs.filter(Boolean) : [langs];
    if (wordCount !== undefined) this._wordCount = wordCount;
    this._cache.clear();
  }

  _renderBody(translations) {
    this._bodyEl.innerHTML = this._targetLangs.map(lang => {
      const label = this._langNames[lang] || lang;
      const val = translations[lang];
      let wordsHtml;
      if (Array.isArray(val)) {
        wordsHtml = val.filter(v => v && v !== '—').map(v => {
          const safe = v.replace(/"/g, '&quot;').replace(/</g, '&lt;');
          return `<span class="rw-word-chip">
            <span class="rw-word-tts" data-text="${safe}" data-lang="${lang}" title="Listen">&#9654;</span>
            <span class="rw-word-copy" data-text="${safe}" title="Click to copy">${v}</span>
          </span>`;
        }).join('');
      } else {
        const safe = (val || '...').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        wordsHtml = `<span class="rw-word-chip">
          <span class="rw-word-tts" data-text="${safe}" data-lang="${lang}" title="Listen">&#9654;</span>
          <span class="rw-word-copy" data-text="${safe}" title="Click to copy">${val || '...'}</span>
        </span>`;
      }
      return `<div class="reader-translate-row" data-lang="${lang}">
        <span class="reader-translate-label">${label}:</span>
        <span class="reader-translate-values">${wordsHtml}</span>
      </div>`;
    }).join('');
    this._fitToViewport();
  }

  bindToContainer(container, sourceInfo) {
    this._containerSources.set(container, sourceInfo);
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
      this.show(text, context, anchorEl, this._containerSources.get(container) || sourceInfo);
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
    this._currentTimestamp = 0;
    this._pdfAnchorRect = null;
    if (this._currentSource.type === 'youtube') {
      const lineEl = targetEl ? targetEl.closest('.yt-sub-line') : null;
      const lineStart = lineEl ? parseFloat(lineEl.dataset.start) : NaN;
      if (!isNaN(lineStart)) {
        this._currentTimestamp = Math.floor(lineStart);
      } else if (typeof app !== 'undefined' && app._ytPlayer && typeof app._ytPlayer.getCurrentTime === 'function') {
        const t = app._ytPlayer.getCurrentTime();
        if (!isNaN(t) && isFinite(t)) this._currentTimestamp = Math.floor(t);
      }
    }
    this._wordEl.textContent = word;
    this._renderBody({});
    this._popup.style.display = 'flex';
    this._popup.style.top = '';
    this._popup.style.left = '';
    this._popup.style.transform = '';
    void this._popup.offsetHeight;

    if (this._currentSource.type === 'youtube') {
      this._showInYoutubePanel();
    } else {
      this._restoreDefaultPlacement();
      this._pdfAnchorRect = targetEl ? targetEl.getBoundingClientRect() : null;
      this._fitToViewport();
    }

    this._popup.dataset.justOpened = '1';
    setTimeout(() => { delete this._popup.dataset.justOpened; }, 0);

    if (this._autoPauseOn()) {
      this._resumeOnHide = true;
      if (app && app._ytPlayer && typeof app._ytPlayer.pauseVideo === 'function') {
        app._ytPlayer.pauseVideo();
      }
    }

    this._fetchTranslation(word);
  }

  _autoPauseOn() {
    if (!this._currentSource || this._currentSource.type !== 'youtube') return false;
    const sub = (appStore && appStore.data && appStore.data.ytSubtitle) || {};
    return !!sub.autoPause;
  }

  _showInYoutubePanel() {
    const panel = document.getElementById('ytWordsPanel');
    if (panel) {
      if (this._popup.parentNode !== panel) {
        panel.appendChild(this._popup);
      }
    }
    this._popup.classList.add('yt-mode');
  }

  _restoreDefaultPlacement() {
    if (this._defaultParent && this._popup.parentNode !== this._defaultParent) {
      this._defaultParent.appendChild(this._popup);
    }
    this._popup.classList.remove('yt-mode');
  }

  _fitToViewport() {
    if (!this._popup || this._popup.style.display === 'none') return;
    if (this._currentSource && this._currentSource.type === 'youtube') return;
    const rect = this._pdfAnchorRect;
    if (!rect) return;
    const popupW = this._popup.offsetWidth;
    const popupH = this._popup.offsetHeight;
    const gap = 8;
    const margin = 10;
    let top = rect.bottom + gap;
    let left = rect.left + rect.width / 2 - popupW / 2;

    if (top + popupH > window.innerHeight - margin) {
      top = rect.top - popupH - gap;
    }
    if (left < margin) left = margin;
    if (left + popupW > window.innerWidth - margin) {
      left = window.innerWidth - popupW - margin;
    }

    this._popup.style.top = top + 'px';
    this._popup.style.left = left + 'px';
  }

  hide() {
    this._popup.style.display = 'none';
    this._currentWord = null;
    this._currentContext = '';
    if (this._resumeOnHide) {
      this._resumeOnHide = false;
      if (app && app._ytPlayer && typeof app._ytPlayer.playVideo === 'function') {
        app._ytPlayer.playVideo();
      }
    }
  }

  async _fetchTranslation(word) {
    const lower = word.toLowerCase();
    if (this._cache.has(lower)) {
      this._renderBody(this._cache.get(lower));
      this._preloadTTS(this._cache.get(lower));
      return;
    }

    try {
      const { from } = this._languages;
      const langs = this._targetLangs;
      const count = this._wordCount;
      const result = await window.electronAPI.translateWord(lower, from, langs, count);
      const data = result || {};
      this._cache.set(lower, data);
      this._renderBody(data);
      this._preloadTTS(data);
    } catch (e) {
      const errData = {};
      this._targetLangs.forEach(lang => { errData[lang] = ['Unavailable']; });
      this._renderBody(errData);
    }
  }

  _preloadTTS(data) {
    if (!data) return;
    for (const lang of this._targetLangs) {
      const values = data[lang];
      if (!values) continue;
      const words = Array.isArray(values) ? values : [values];
      for (const text of words) {
        if (text && text !== '—' && text !== '...' && text !== 'Unavailable') {
          window.electronAPI.ttsSpeak(text, lang, this._voiceId).catch(() => {});
        }
      }
    }
  }

  async _save() {
    if (!this._currentWord) return;
    const word = this._currentWord;
    const lower = word.toLowerCase();
    const cached = this._cache.get(lower) || {};

    let thumbnailUrl = '';
    let videoTimestamp = this._currentTimestamp || 0;
    if (this._currentSource && this._currentSource.type === 'youtube' && this._currentSource.youtubeUrl) {
      const match = this._currentSource.youtubeUrl.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      if (match) {
        thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
      }
    }

    const firstLang = this._targetLangs[0] || '';
    const secondLang = this._targetLangs[1] || '';
    const firstVal = cached[firstLang];
    const secondVal = cached[secondLang];

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      word: lower,
      translation: Array.isArray(firstVal) ? firstVal[0] || '' : firstVal || '',
      russian: Array.isArray(secondVal) ? secondVal[0] || '' : secondVal || '',
      transliteration: '',
      translationLang: firstLang,
      russianLang: secondLang,
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
        appStore.invalidateSavedWordsCache();
        if (this.onSave) this.onSave(entry);
        this.hide();
      } else if (result && result.reason === 'exists') {
        this.hide();
      }
    } catch (e) {
      console.error('Failed to save word:', e);
    }
  }
}
