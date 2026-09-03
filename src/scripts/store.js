class Store {
  constructor() {
    this.data = null;
    this.dictionary = [];
    this.b2Dictionary = [];
    this.c1Dictionary = [];
    this.verbDictionary = [];
    this.tags = {};
  }

  async load() {
    const saved = await window.electronAPI.storeLoad();
    if (saved) {
      this.data = saved;
      this._migrate();
    } else {
      this.data = this._defaults();
    }
    return this.data;
  }

  async loadDictionary() {
    try {
      const [b2, c1, verb] = await Promise.all([
        window.electronAPI.storeLoadDictionary(),
        window.electronAPI.storeLoadC1Dictionary(),
        window.electronAPI.storeLoadVerbDictionary(),
      ]);
      if (b2 && Array.isArray(b2)) this.b2Dictionary = b2;
      if (c1 && Array.isArray(c1)) this.c1Dictionary = c1;
      if (verb && Array.isArray(verb)) this.verbDictionary = verb;
      this.dictionary = this._getDictionaryForVocab(this.data.vocabulary);
    } catch (e) {
      console.error('Failed to load dictionaries:', e);
    }
    return this.dictionary;
  }

  _getDictionaryForVocab(vocab) {
    if (vocab === 'c1') return this.c1Dictionary;
    if (vocab === 'verb') return this.verbDictionary;
    return this.b2Dictionary;
  }

  async loadTags() {
    try {
      const tags = await window.electronAPI.storeLoadTags();
      if (tags && typeof tags === 'object') {
        this.tags = tags;
      }
    } catch (e) {
      console.error('Failed to load tags:', e);
    }
    return this.tags;
  }

  _savedWordsCache = null;

  async loadSavedWords() {
    if (this._savedWordsCache) return this._savedWordsCache;
    try {
      const entries = await window.electronAPI.dictionaryLoad();
      this._savedWordsCache = entries || [];
    } catch (e) {
      this._savedWordsCache = [];
    }
    return this._savedWordsCache;
  }

  invalidateSavedWordsCache() {
    this._savedWordsCache = null;
  }

  _fileNameForVocab(vocab) {
    if (vocab === 'c1') return 'oxford_c1_words';
    if (vocab === 'verb') return 'verb';
    return 'b2-word-list';
  }

  async switchVocabulary(vocab) {
    if (vocab === this.data.vocabulary) return;
    const cur = this.data.vocabulary;
    this.data[`${cur}_words`] = this.data.words;
    this.data[`${cur}_favorites`] = this.data.favorites;
    this.data[`${cur}_greenStars`] = this.data.greenStars;
    this.data[`${cur}_notes`] = this.data.notes;
    this.data[`${cur}_customContent`] = this.data.customContent;
    this.data[`${cur}_stats`] = this.data.stats;
    this.data[`${cur}_currentFileName`] = this.data.currentFileName;
    this.data.vocabulary = vocab;
    this.dictionary = this._getDictionaryForVocab(vocab);
    const savedWords = this.data[`${vocab}_words`];
    if (savedWords && savedWords.length > 0) {
      this.data.words = savedWords;
      this.data.favorites = this.data[`${vocab}_favorites`] || [];
      this.data.greenStars = this.data[`${vocab}_greenStars`] || [];
      this.data.notes = this.data[`${vocab}_notes`] || {};
      this.data.customContent = this.data[`${vocab}_customContent`] || {};
      this.data.stats = this.data[`${vocab}_stats`] || { totalReviewed: 0, totalRemembered: 0, totalForgotten: 0, sessionsCompleted: 0 };
      this.data.currentFileName = this.data[`${vocab}_currentFileName`] || null;
    } else {
      this.data.favorites = [];
      this.data.greenStars = [];
      this.data.notes = {};
      this.data.customContent = {};
      this.initFromDictionary(this.dictionary.length, this._fileNameForVocab(vocab));
    }
    await this.save();
  }

  getCurrentIndex() {
    const idx = this.data[`${this.data.vocabulary}_currentIndex`];
    return idx != null ? idx : 0;
  }

  setCurrentIndex(index) {
    this.data[`${this.data.vocabulary}_currentIndex`] = index;
  }

  _migrate() {
    const today = this._getToday();
    if (this.data.words) {
      this.data.words.forEach((w) => {
        if (w.interval === undefined) w.interval = 0;
        if (w.ease === undefined) w.ease = 2.5;
        if (!w.nextReview) w.nextReview = today;
      });
    }
    if (!this.data.dailyLog) this.data.dailyLog = [];
    if (this.data.learnMode === undefined) this.data.learnMode = true;
    if (this.data.ttsVoice === undefined) this.data.ttsVoice = 0;
    if (!this.data.favorites) this.data.favorites = [];
    if (!this.data.greenStars) this.data.greenStars = [];
    if (!this.data.notes) this.data.notes = {};
    if (this.data.vocabulary === undefined) this.data.vocabulary = 'b2';
    if (this.data.translationSidebar === undefined) this.data.translationSidebar = false;
    if (this.data.pdfFolder === undefined) this.data.pdfFolder = null;
    if (!this.data.pdfRecents) this.data.pdfRecents = [];
    if (!this.data.pdfPinnedFolders) this.data.pdfPinnedFolders = [];
    if (!this.data.pdfOpenTabs) this.data.pdfOpenTabs = [];
    if (!this.data.pdfAnnotations) this.data.pdfAnnotations = {};
    if (this.data.c1_favorites && !this.data._c1Migrated) {
      this.data.c1_favorites = [];
      this.data.c1_notes = {};
      this.data.c1_words = null;
      this.data._c1Migrated = true;
    }
  }

  _defaults() {
    return {
      words: [],
      customContent: {},
      stats: {
        totalReviewed: 0,
        totalRemembered: 0,
        totalForgotten: 0,
        sessionsCompleted: 0,
      },
      streak: 0,
      lastPracticed: null,
      favorites: [],
      greenStars: [],
      darkMode: false,
      learnMode: true,
      ttsVoice: 0,
      shuffle: false,
      importHistory: [],
      currentFileName: null,
      dailyLog: [],
      collections: [],
      challengeBest: 0,
      storyProgress: [],
      storyWords: [],
      notes: {},
      vocabulary: 'b2',
      pdfFolder: null,
      pdfRecents: [],
      pdfPinnedFolders: [],
      pdfScrollPositions: {},
      pdfOpenTabs: [],
      pdfActiveTab: null,
      pdfViewMode: 'viewer',
      translationSidebar: false,
      pdfAnnotations: {},
    };
  }

  addHistory(fileName, wordCount) {
    const today = this._getToday();
    this.data.importHistory = this.data.importHistory || [];
    this.data.importHistory = this.data.importHistory.filter(
      (h) => h.fileName !== fileName
    );
    this.data.importHistory.unshift({ fileName, date: today, wordCount });
    if (this.data.importHistory.length > 20) {
      this.data.importHistory = this.data.importHistory.slice(0, 20);
    }
    this.data.currentFileName = fileName;
    return this.save();
  }

  getHistory() {
    return this.data.importHistory || [];
  }

  _getToday() {
    return new Date().toISOString().split('T')[0];
  }

  getNote(id) {
    return this.data.notes && this.data.notes[id] ? this.data.notes[id] : '';
  }

  setNote(id, text) {
    if (!this.data.notes) this.data.notes = {};
    if (text.trim()) {
      this.data.notes[id] = text.trim();
    } else {
      delete this.data.notes[id];
    }
    return this.save();
  }

  getPdfAnnotations(pdfKey) {
    if (!this.data.pdfAnnotations) this.data.pdfAnnotations = {};
    return this.data.pdfAnnotations[pdfKey] || {};
  }

  setPdfAnnotation(pdfKey, annotId, annotData) {
    if (!this.data.pdfAnnotations) this.data.pdfAnnotations = {};
    if (!this.data.pdfAnnotations[pdfKey]) this.data.pdfAnnotations[pdfKey] = {};
    if (annotData) {
      this.data.pdfAnnotations[pdfKey][annotId] = {
        ...annotData,
        updatedAt: Date.now()
      };
    } else {
      delete this.data.pdfAnnotations[pdfKey][annotId];
    }
    return this.save();
  }

  removePdfAnnotation(pdfKey, annotId) {
    return this.setPdfAnnotation(pdfKey, annotId, null);
  }

  getDailyActivity(days = 30) {
    const today = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayEntry = this.data.dailyLog.find(entry => entry.date === dateStr);
      if (dayEntry) {
        const remembered = dayEntry.entries.filter(e => e.action === 'remembered').length;
        const forgotten = dayEntry.entries.filter(e => e.action === 'forgotten').length;
        result.push({ date: dateStr, remembered, forgotten });
      } else {
        result.push({ date: dateStr, remembered: 0, forgotten: 0 });
      }
    }
    return result;
  }

  getCumulativeStats() {
    const today = new Date();
    const result = [];
    const seen = {};
    let cumRemembered = 0;
    let cumForgotten = 0;

    const allDays = [...this.data.dailyLog].sort((a, b) => a.date.localeCompare(b.date));

    for (const day of allDays) {
      for (const entry of day.entries) {
        if (seen[entry.wordId]) continue;
        seen[entry.wordId] = true;
        if (entry.action === 'remembered') cumRemembered++;
        else cumForgotten++;
      }
      result.push({
        date: day.date,
        cumulativeRemembered: cumRemembered,
        cumulativeForgotten: cumForgotten,
        totalUnique: cumRemembered + cumForgotten,
      });
    }
    return result;
  }

  async save() {
    return await window.electronAPI.storeSave(this.data);
  }

  _mergeWord(progress) {
    const CUSTOM_THRESHOLD = 100000;

    if (progress.id >= CUSTOM_THRESHOLD) {
      const custom = this.data.customContent && this.data.customContent[progress.id];
      if (custom) {
        return {
          id: progress.id,
          english: custom.english || 'Unknown',
          armenian: custom.armenian || '',
          example: custom.example || '',
          synonyms: [],
          antonyms: [],
          description: '',
          examples: [],
          type: custom.type || '',
          russian: custom.russian || '',
          russian_example: custom.russian_example || [],
          adjective: custom.adjective || '',
          adverb: custom.adverb || '',
          status: progress.status,
          interval: progress.interval,
          ease: progress.ease,
          nextReview: progress.nextReview,
        };
      }
    }

    const dictEntry = this.dictionary && this.dictionary[progress.id];

    if (dictEntry) {
      return {
        id: progress.id,
        english: dictEntry.english,
        armenian: Array.isArray(dictEntry.armenian) ? dictEntry.armenian.join(', ') : (dictEntry.armenian || ''),
        example: dictEntry.english_example && dictEntry.english_example[0] ? dictEntry.english_example[0] : '',
        synonyms: dictEntry.synonyms || [],
        antonyms: dictEntry.antonyms || [],
        description: dictEntry.description || '',
        examples: dictEntry.english_example || [],
        type: dictEntry.type || '',
        russian: dictEntry.russian || '',
        russian_example: dictEntry.russian_example || [],
        adjective: dictEntry.adjective || '',
        adverb: dictEntry.adverb || '',
        status: progress.status,
        interval: progress.interval,
        ease: progress.ease,
        nextReview: progress.nextReview,
      };
    }

    if (progress.english !== undefined) {
      return progress;
    }

    return {
      id: progress.id,
      english: `Word #${progress.id}`,
      armenian: '',
      example: '',
      synonyms: [],
      antonyms: [],
      description: '',
      examples: [],
      type: '',
      russian: '',
      russian_example: [],
      adjective: '',
      adverb: '',
      status: progress.status,
      interval: progress.interval,
      ease: progress.ease,
      nextReview: progress.nextReview,
    };
  }

  initFromDictionary(count, fileName) {
    const today = this._getToday();
    this.data.words = Array.from({ length: count }, (_, i) => ({
      id: i,
      status: 'unknown',
      interval: 0,
      ease: 2.5,
      nextReview: today,
    }));
    this.data.customContent = {};
    this.data.stats = {
      totalReviewed: 0,
      totalRemembered: 0,
      totalForgotten: 0,
      sessionsCompleted: 0,
    };
    this.data.lastPracticed = null;
    this.data.currentFileName = fileName || null;
    return this.save();
  }

  initCustomWords(parsedWords, fileName) {
    const today = this._getToday();
    const offset = 100000;
    this.data.words = parsedWords.map((w, i) => ({
      id: offset + i,
      status: 'unknown',
      interval: 0,
      ease: 2.5,
      nextReview: today,
    }));
    this.data.customContent = {};
    parsedWords.forEach((w, i) => {
      this.data.customContent[offset + i] = {
        english: w.english,
        armenian: w.armenian,
        example: w.example || '',
      };
    });
    this.data.stats = {
      totalReviewed: 0,
      totalRemembered: 0,
      totalForgotten: 0,
      sessionsCompleted: 0,
    };
    this.data.lastPracticed = null;
    this.data.currentFileName = fileName || null;
    return this.save();
  }

  markWord(id, status) {
    const word = this.data.words.find((w) => w.id === id);
    if (!word) return null;

    const prevState = {
      status: word.status,
      interval: word.interval,
      ease: word.ease,
      nextReview: word.nextReview,
    };

    word.status = status;
    const today = this._getToday();

    if (status === 'remembered') {
      word.interval = word.interval === 0 ? 1 : Math.round(word.interval * word.ease);
      word.ease += 0.1;
      this.data.stats.totalRemembered++;
    } else if (status === 'forgotten') {
      word.interval = 0;
      word.ease = Math.max(1.3, word.ease - 0.2);
      this.data.stats.totalForgotten++;
    }

    word.nextReview = this._addDays(today, word.interval);
    this.data.stats.totalReviewed++;

    const merged = this._mergeWord(word);
    this._appendToDailyLog(id, merged.english, merged.armenian, status);

    if (this.data.lastPracticed !== today) {
      if (this.data.lastPracticed) {
        const lastDate = new Date(this.data.lastPracticed);
        const diff = Math.round((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
        if (diff === 1) this.data.streak++;
        else if (diff > 1) this.data.streak = 1;
      } else {
        this.data.streak = 1;
      }
      this.data.lastPracticed = today;
    }
    this.save();
    return prevState;
  }

  _appendToDailyLog(wordId, english, armenian, action) {
    const today = this._getToday();
    let dayEntry = this.data.dailyLog.find(d => d.date === today);
    if (!dayEntry) {
      dayEntry = { date: today, entries: [] };
      this.data.dailyLog.push(dayEntry);
    }
    dayEntry.entries.push({ wordId, english, armenian, action });
  }

  getDayHistory(dateStr) {
    const day = this.data.dailyLog.find(d => d.date === dateStr);
    if (!day) return { remembered: [], forgotten: [] };
    return {
      remembered: day.entries.filter(e => e.action === 'remembered'),
      forgotten: day.entries.filter(e => e.action === 'forgotten'),
    };
  }

  revertWord(id, prevState) {
    const word = this.data.words.find((w) => w.id === id);
    if (!word) return;

    if (word.status === 'remembered') this.data.stats.totalRemembered--;
    else if (word.status === 'forgotten') this.data.stats.totalForgotten--;
    this.data.stats.totalReviewed--;

    word.status = prevState.status;
    word.interval = prevState.interval;
    word.ease = prevState.ease;
    word.nextReview = prevState.nextReview;
    this.save();
  }

  getDueCount() {
    const today = this._getToday();
    return this.data.words.filter((w) => w.nextReview <= today).length;
  }

  _addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  getStats() {
    const all = this.getAllWords();
    const total = all.length;
    const remembered = all.filter((w) => w.status === 'remembered').length;
    const forgotten = all.filter((w) => w.status === 'forgotten').length;
    const accuracy = this.data.stats.totalReviewed > 0
      ? Math.round((this.data.stats.totalRemembered / this.data.stats.totalReviewed) * 100)
      : 0;
    return {
      total,
      remembered,
      forgotten,
      accuracy,
      streak: this.data.streak,
      sessions: this.data.stats.sessionsCompleted,
    };
  }

  getForgottenWords() {
    return this.data.words.filter((w) => w.status === 'forgotten').map((w) => this._mergeWord(w));
  }

  getUnknownWords() {
    return this.data.words.filter((w) => w.status === 'unknown').map((w) => this._mergeWord(w));
  }

  getAllWords() {
    return this.data.words.map((w) => this._mergeWord(w));
  }

  getWordById(id) {
    const progress = this.data.words.find((w) => w.id === id);
    if (!progress) return null;
    return this._mergeWord(progress);
  }

  getWordsForMode(filter) {
    const today = this._getToday();
    switch (filter) {
      case 'all':
        return this.getAllWords();
      case 'due':
        return this.data.words.filter((w) => w.nextReview <= today).map((w) => this._mergeWord(w));
      case 'forgotten':
        return this.getForgottenWords();
      case 'remembered':
        return this.data.words.filter((w) => w.status === 'remembered').map((w) => this._mergeWord(w));
      default:
        if (filter && filter.startsWith('collection-')) {
          const colId = filter.replace('collection-', '');
          const col = this.data.collections.find((c) => c.id === colId);
          if (col) {
            return this.data.words
              .filter((w) => col.wordIds.includes(w.id))
              .map((w) => this._mergeWord(w));
          }
        }
        return this.getAllWords();
    }
  }

  resetProgress() {
    const today = this._getToday();
    this.data.words.forEach((w) => {
      w.status = 'unknown';
      w.interval = 0;
      w.ease = 2.5;
      w.nextReview = today;
    });
    this.data.stats = {
      totalReviewed: 0,
      totalRemembered: 0,
      totalForgotten: 0,
      sessionsCompleted: 0,
    };
    this.data.streak = 0;
    this.data.lastPracticed = null;
    return this.save();
  }

  getWordsByTag(tagName) {
    const tag = this.tags[tagName];
    if (!tag) return [];
    return tag.wordIds
      .map((id) => this.getWordById(id))
      .filter((w) => w !== null);
  }

  getAllTagNames() {
    return Object.keys(this.tags);
  }

  getTagsForWord(wordId) {
    const result = [];
    for (const [name, tag] of Object.entries(this.tags)) {
      if (tag.wordIds.includes(wordId)) result.push(name);
    }
    return result;
  }

  isFavorite(id) {
    return this.data.favorites.includes(id);
  }

  async toggleFavorite(id) {
    const idx = this.data.favorites.indexOf(id);
    if (idx === -1) {
      this.data.favorites.push(id);
    } else {
      this.data.favorites.splice(idx, 1);
    }
    await this.save();
    return idx === -1;
  }

  isGreenStar(id) {
    return this.data.greenStars.includes(id);
  }

  async toggleGreenStar(id) {
    const idx = this.data.greenStars.indexOf(id);
    if (idx === -1) {
      this.data.greenStars.push(id);
    } else {
      this.data.greenStars.splice(idx, 1);
    }
    await this.save();
    return idx === -1;
  }

  getFavoriteWords() {
    return this.data.favorites
      .map((id) => this.getWordById(id))
      .filter((w) => w !== null);
  }
}

const appStore = new Store();
