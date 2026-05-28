class Store {
  constructor() {
    this.data = null;
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

  initWords(words, fileName) {
    const today = this._getToday();
    this.data.words = words.map((w, i) => ({
      id: i,
      english: w.english,
      armenian: w.armenian,
      example: w.example || '',
      status: 'unknown',
      interval: 0,
      ease: 2.5,
      nextReview: today,
    }));
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

    this._appendToDailyLog(id, word.english, word.armenian, status);

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
    const total = this.data.words.length;
    const remembered = this.data.words.filter((w) => w.status === 'remembered').length;
    const forgotten = this.data.words.filter((w) => w.status === 'forgotten').length;
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
    return this.data.words.filter((w) => w.status === 'forgotten');
  }

  getUnknownWords() {
    return this.data.words.filter((w) => w.status === 'unknown');
  }

  getAllWords() {
    return this.data.words;
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
