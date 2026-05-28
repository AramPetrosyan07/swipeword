class Store {
  constructor() {
    this.data = null;
  }

  async load() {
    const saved = await window.electronAPI.storeLoad();
    if (saved) {
      this.data = saved;
    } else {
      this.data = this._defaults();
    }
    return this.data;
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
    this.data.words = words.map((w, i) => ({
      id: i,
      english: w.english,
      armenian: w.armenian,
      example: w.example || '',
      status: 'unknown',
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
    if (!word) return;
    word.status = status;
    if (status === 'remembered') this.data.stats.totalRemembered++;
    else if (status === 'forgotten') this.data.stats.totalForgotten++;
    this.data.stats.totalReviewed++;

    const today = this._getToday();
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
    this.data.words.forEach((w) => (w.status = 'unknown'));
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
