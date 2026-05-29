class Store {
  constructor() {
    this.data = null;
    this.dictionary = [];
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
      const dict = await window.electronAPI.storeLoadDictionary();
      if (dict && Array.isArray(dict)) {
        this.dictionary = dict;
      }
    } catch (e) {
      console.error('Failed to load dictionary:', e);
    }
    return this.dictionary;
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
      darkMode: false,
      shuffle: false,
      importHistory: [],
      currentFileName: null,
      dailyLog: [],
      collections: [],
      challengeBest: 0,
      storyProgress: [],
      storyWords: [],
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
        english: dictEntry.word,
        armenian: Array.isArray(dictEntry.armenian) ? dictEntry.armenian.join(', ') : (dictEntry.armenian || ''),
        example: dictEntry.examples && dictEntry.examples[0] ? dictEntry.examples[0] : '',
        synonyms: dictEntry.synonyms || [],
        antonyms: dictEntry.antonyms || [],
        description: dictEntry.description || '',
        examples: dictEntry.examples || [],
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
}

const appStore = new Store();
