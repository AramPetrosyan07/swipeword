class App {
  constructor() {
    this.words = [];
    this.currentIndex = 0;
    this.screenOrder = [];
    this.shuffleEnabled = false;
    this.currentFileName = null;

    this.learnCard = new CardManager({
      cardEl: document.getElementById('card'),
      innerEl: document.getElementById('cardInner'),
      wordEl: document.getElementById('cardWord'),
      translationEl: document.getElementById('cardTranslation'),
      exampleEl: document.getElementById('cardExample'),
      letterEl: document.getElementById('cardLetter'),
      letterBackEl: document.getElementById('cardLetterBack'),
      mode: 'learn',
      onForgot: (word) => this._handleForgot(word),
      onRemember: (word) => this._handleRemember(word),
    });
  }

  async init() {
    await appStore.load();
    themeManager.init();

    this._bindEvents();

    const savedWords = appStore.getAllWords();
    if (savedWords.length > 0) {
      this.words = savedWords;
      this.currentFileName = appStore.data.currentFileName || null;
      this._startLearning();
    }

    this._updateSidebar();
  }

  _bindEvents() {
    // Sidebar
    document.getElementById('btnMenu').addEventListener('click', () => this._toggleSidebar());
    document.getElementById('btnSidebarClose').addEventListener('click', () => this._closeSidebar());
    document.getElementById('sidebarOverlay').addEventListener('click', () => this._closeSidebar());

    document.getElementById('sideImport').addEventListener('click', () => {
      this._closeSidebar();
      this._showImportScreen();
    });
    document.getElementById('sideLearn').addEventListener('click', () => {
      this._closeSidebar();
      if (this.words.length > 0) this._showLearnScreen();
    });
    document.getElementById('sideReview').addEventListener('click', () => {
      this._closeSidebar();
      this._showReview();
    });
    document.getElementById('sideStats').addEventListener('click', () => {
      this._closeSidebar();
      this._showStats();
    });

    document.getElementById('sideShuffle').addEventListener('click', () => {
      this.shuffleEnabled = !this.shuffleEnabled;
      if (this.words.length > 0) this._buildQueue();
      this._updateSidebar();
    });

    document.getElementById('sideTheme').addEventListener('click', () => {
      themeManager.toggle();
      this._updateSidebar();
    });

    // Import
    document.getElementById('btnImport').addEventListener('click', () => this._importFile());
    document.getElementById('importBox').addEventListener('click', () => this._importFile());

    // Learn screen
    document.getElementById('btnForgot').addEventListener('click', () => this.learnCard.animateForgot());
    document.getElementById('btnRemember').addEventListener('click', () => this.learnCard.animateRemember());
    document.getElementById('btnFlip').addEventListener('click', () => this.learnCard.flip());
    document.getElementById('btnTTS').addEventListener('click', () => {
      if (this.learnCard.currentWord) {
        tts.speak(this.learnCard.currentWord.english);
      }
    });
    document.getElementById('btnResetSession').addEventListener('click', () => this._resetSession());

    // Review screen
    document.getElementById('btnReviewForgot').addEventListener('click', () => reviewManager.cardManager.animateForgot());
    document.getElementById('btnReviewRemember').addEventListener('click', () => reviewManager.cardManager.animateRemember());
    document.getElementById('btnReviewFlip').addEventListener('click', () => reviewManager.cardManager.flip());
    document.getElementById('btnReviewTTS').addEventListener('click', () => {
      if (reviewManager.cardManager.currentWord) {
        tts.speak(reviewManager.cardManager.currentWord.english);
      }
    });
    document.getElementById('btnReviewBack').addEventListener('click', () => this._showLearnScreen());
    document.getElementById('btnBackToLearn').addEventListener('click', () => this._showLearnScreen());

    // Stats screen
    document.getElementById('btnStatsBack').addEventListener('click', () => this._showLearnScreen());
    document.getElementById('btnResetProgress').addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        appStore.resetProgress().then(() => {
          this.words.forEach((w) => (w.status = 'unknown'));
          this.currentIndex = 0;
          this._showLearnScreen();
        });
      }
    });

    // Top bar buttons (learn screen)
    document.getElementById('btnShuffle').addEventListener('click', () => {
      this.shuffleEnabled = !this.shuffleEnabled;
      if (this.words.length > 0) this._buildQueue();
      this._updateSidebar();
    });
    document.getElementById('btnTheme').addEventListener('click', () => {
      themeManager.toggle();
      this._updateSidebar();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      const activeScreen = document.querySelector('.screen.active');
      if (!activeScreen) return;

      if (e.key === 'Escape') {
        if (document.getElementById('sidebar').classList.contains('open')) {
          this._closeSidebar();
          return;
        }
      }

      if (activeScreen.id === 'screen-learn' && !this.learnCard.isAnimating) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            this.learnCard.animateForgot();
            break;
          case 'ArrowRight':
            e.preventDefault();
            this.learnCard.animateRemember();
            break;
          case ' ':
            e.preventDefault();
            this.learnCard.flip();
            break;
        }
      } else if (activeScreen.id === 'screen-review' && reviewManager.isActive && !reviewManager.cardManager.isAnimating) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            reviewManager.cardManager.animateForgot();
            break;
          case 'ArrowRight':
            e.preventDefault();
            reviewManager.cardManager.animateRemember();
            break;
          case ' ':
            e.preventDefault();
            reviewManager.cardManager.flip();
            break;
        }
      }
    });
  }

  _toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    if (!isOpen) this._updateSidebar();
  }

  _closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }

  _updateSidebar() {
    // Shuffle indicator
    const shuffleInd = document.getElementById('sideShuffleIndicator');
    shuffleInd.textContent = this.shuffleEnabled ? 'ON' : 'OFF';
    shuffleInd.classList.toggle('active', this.shuffleEnabled);

    // Theme indicator
    const themeInd = document.getElementById('sideThemeIndicator');
    themeInd.textContent = themeManager.darkMode ? 'DARK' : 'LIGHT';
    themeInd.classList.toggle('active', themeManager.darkMode);

    // File info
    document.getElementById('sideFileName').textContent = this.currentFileName || 'No file loaded';
    const stats = appStore.getStats();
    document.getElementById('sideFileStats').textContent =
      `${stats.total} words · ${stats.remembered} remembered · ${stats.forgotten} forgotten`;

    // History
    this._renderHistory();
  }

  _renderHistory() {
    const container = document.getElementById('sidebarHistory');
    const history = appStore.getHistory();

    if (!history || history.length === 0) {
      container.innerHTML = '<div class="sidebar-history-empty">No files imported yet</div>';
      return;
    }

    container.innerHTML = '';
    history.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'sidebar-history-item';
      el.innerHTML = `
        <div class="sidebar-history-name">${item.fileName}</div>
        <div class="sidebar-history-meta">${item.wordCount} words · ${item.date}</div>
      `;
      container.appendChild(el);
    });
  }

  async _importFile() {
    const result = await window.electronAPI.openFileDialog();
    if (!result) return;

    const words = wordParser.parse(result.content);

    if (words.length === 0) {
      alert('No words found in the file. Make sure the format is:\n*word - translation (example)');
      return;
    }

    this.currentFileName = result.fileName;
    await appStore.initWords(words, result.fileName);
    await appStore.addHistory(result.fileName, words.length);
    this.words = appStore.getAllWords();
    this._startLearning();
    this._updateSidebar();
  }

  _startLearning() {
    this._buildQueue();
    this._showLearnScreen();
  }

  _buildQueue() {
    const unknown = this.words.filter((w) => w.status === 'unknown');
    const forgotten = this.words.filter((w) => w.status === 'forgotten');

    this.screenOrder = [...unknown, ...forgotten];

    if (this.shuffleEnabled) {
      for (let i = this.screenOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.screenOrder[i], this.screenOrder[j]] = [this.screenOrder[j], this.screenOrder[i]];
      }
    }

    this.currentIndex = 0;
  }

  _showImportScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-import').classList.add('active');
  }

  _showLearnScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-learn').classList.add('active');

    this._buildQueue();
    this._showCurrentCard();
  }

  _showCurrentCard() {
    const unknownCount = this.words.filter((w) => w.status === 'unknown').length;

    if (this.currentIndex >= this.screenOrder.length && unknownCount === 0) {
      document.getElementById('cardArea').style.display = 'none';
      document.getElementById('emptyState').style.display = 'flex';
      return;
    }

    if (this.currentIndex >= this.screenOrder.length) {
      this._buildQueue();
    }

    document.getElementById('cardArea').style.display = 'flex';
    document.getElementById('emptyState').style.display = 'none';

    this.learnCard.show(this.screenOrder[this.currentIndex]);

    const reviewed = appStore.data.stats.totalReviewed || 0;
    const total = this.words.length;
    document.getElementById('progressText').textContent = `${reviewed} / ${total}`;
  }

  _handleForgot(word) {
    appStore.markWord(word.id, 'forgotten');
    this.currentIndex++;
    this._showCurrentCard();
  }

  _handleRemember(word) {
    appStore.markWord(word.id, 'remembered');
    this.currentIndex++;
    this._showCurrentCard();
  }

  _resetSession() {
    this.words.forEach((w) => (w.status = 'unknown'));
    appStore.data.stats.totalReviewed = 0;
    appStore.data.stats.totalRemembered = 0;
    appStore.data.stats.totalForgotten = 0;
    appStore.save();
    this._buildQueue();
    this._showCurrentCard();
  }

  _showReview() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-review').classList.add('active');
    reviewManager.start();
  }

  _showStats() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-stats').classList.add('active');
    statsManager.show();
  }
}

const app = new App();

document.addEventListener('DOMContentLoaded', () => app.init());
