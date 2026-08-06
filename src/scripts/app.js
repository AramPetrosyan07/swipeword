class App {
  constructor() {
    this.words = [];
    this.currentIndex = 0;
    this.screenOrder = [];
    this.shuffleEnabled = false;
    this.sortEnabled = false;
    this.favFilterEnabled = false;
    this.currentFileName = null;

    this.undoStack = [];
    this.undoTimer = null;
    this.filterLetter = null;
    this.listViewActive = false;
    this.cameFromList = false;
    this._listCardOverlayActive = false;
    this._listCardIndex = 0;
    this.sessionHistory = [];
    this._currentAppMode = 'learn';

    this._ytCaptions = [];
    this._ytCaptionTimer = null;
    this._ytCurrentLineIndex = -1;
    this._ytPlayer = null;
    this._ytPositionTimer = null;
    this._ytShadowActive = false;
    this._ytShadowSentenceIdx = -1;
    this._ytShadowSentenceCount = 1;
    this._ytSentences = [];
    this._ytSavedWords = new Set();
    this._ytFlashTargetLine = -1;
    this._ytShadowSpeed = 1;
    this._ytShadowLastActionTime = 0;
    this._ytSourceLang = 'en';
    this._ytTargetLang1 = 'hy';
    this._ytTargetLang2 = 'ru';
    this._ytTargetLang3 = 'es';
    this._ytLangCount = 2;
    this._ytWordCount = 3;
    this._loadLangPrefs();

    this._pdfSourceLang = 'en';
    this._pdfTargetLang = 'hy';
    this._pdfWordCount = 3;
    this._loadReaderLangPrefs();

    this.translationPopup = new TranslationPopup();
    this.translationPopup.onSave = () => {
      if (this._readSourceInfo && this._readSourceInfo.type === 'youtube') {
        this._renderYoutubeSavedWords();
      }
    };
    this.wordsPage = new WordsPage();

    this.learnCard = new CardManager({
      cardEl: document.getElementById('card'),
      innerEl: document.getElementById('cardInner'),
      wordEl: document.getElementById('cardWord'),
      translationEl: document.getElementById('cardTranslation'),
      exampleEl: document.getElementById('cardExample'),
      letterEl: document.getElementById('cardLetter'),
      letterBackEl: document.getElementById('cardLetterBack'),
      synonymsEl: document.getElementById('cardSynonyms'),
      antonymsEl: document.getElementById('cardAntonyms'),
      descriptionEl: document.getElementById('cardDescription'),
      russianEl: document.getElementById('cardRussian'),
      russianExampleEl: document.getElementById('cardRussianExample'),
      adjEl: document.getElementById('cardAdj'),
      advEl: document.getElementById('cardAdv'),
      adjWrapperEl: document.getElementById('cardAdjWrapper'),
      advWrapperEl: document.getElementById('cardAdvWrapper'),
      tagsEl: document.getElementById('cardTags'),
      tagsFrontEl: document.getElementById('cardTagsFront'),
      learnTranslationEl: document.getElementById('cardLearnTranslation'),
      learnExampleEl: document.getElementById('cardLearnExample'),
      learnRussianExampleEl: document.getElementById('cardLearnRussianExample'),
      learnAdjEl: document.getElementById('cardLearnAdj'),
      learnAdvEl: document.getElementById('cardLearnAdv'),
      learnAdjWrapperEl: document.getElementById('cardLearnAdjWrapper'),
      learnAdvWrapperEl: document.getElementById('cardLearnAdvWrapper'),
      learnSynonymsEl: document.getElementById('cardLearnSynonyms'),
      learnAntonymsEl: document.getElementById('cardLearnAntonyms'),
      learnDescriptionEl: document.getElementById('cardLearnDescription'),
      starEl: document.getElementById('btnStar'),
      learnStarEl: document.getElementById('btnLearnStar'),
      noteEl: document.getElementById('cardNote'),
      noteDisplayEl: document.getElementById('cardNoteDisplay'),
      noteEmptyEl: document.getElementById('cardNoteEmpty'),
      learnNoteEl: document.getElementById('cardLearnNote'),
      learnNoteDisplayEl: document.getElementById('cardLearnNoteDisplay'),
      learnNoteEmptyEl: document.getElementById('cardLearnNoteEmpty'),
      mode: 'learn',
      onForgot: (word) => this._handleForgot(word),
      onRemember: (word) => this._handleRemember(word),
      onTagClick: (tagName) => {
        if (this.learnCard.isFlipped) this.learnCard.flip();
        tagsPage.showTag(tagName);
      },
      onNoteClick: (word) => this._openNoteEditor(word),
    });
  }

  async init() {
    await appStore.load();
    await appStore.loadDictionary();
    await appStore.loadTags();

    if (appStore.data.vocabulary === 'b2' && appStore.data.favorites.length === 0) {
      try {
        const ids = await window.electronAPI.loadFavoritesFile();
        if (ids && ids.length > 0) {
          appStore.data.favorites = ids;
          await appStore.save();
        }
      } catch (e) {
        console.error('Failed to load favorites file:', e);
      }
    }

    themeManager.init();
    studyModeManager.init();

    this._bindEvents();

    const savedWords = appStore.getAllWords();
    if (savedWords.length > 0) {
      this.words = savedWords;
      this.currentFileName = appStore.data.currentFileName || null;
      this._startLearning();
    } else if (appStore.dictionary.length > 0) {
      const vocab = appStore.data.vocabulary || 'b2';
      const fileName = vocab === 'c1' ? 'oxford_c1_words' : vocab === 'verb' ? 'verb' : 'b2-word-list';
      await appStore.initFromDictionary(appStore.dictionary.length, fileName);
      await appStore.addHistory(fileName, appStore.dictionary.length);
      this.words = appStore.getAllWords();
      this.currentFileName = fileName;
      this._startLearning();
    }

    modesManager.init();

    this._updateSidebar();
    this._renderLetterStrip();
  }

  _bindEvents() {
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
    document.getElementById('sideTags').addEventListener('click', () => {
      this._closeSidebar();
      tagsPage.show();
    });
    document.getElementById('sideDailyHistory').addEventListener('click', () => {
      this._closeSidebar();
      this._showDailyHistory();
    });
    document.getElementById('sideSelfTest').addEventListener('click', () => {
      this._closeSidebar();
      selfTest.start();
    });
    document.getElementById('sideWords').addEventListener('click', () => {
      this._closeSidebar();
      this._showWordsPage();
    });
    document.getElementById('sideReader').addEventListener('click', () => {
      this._closeSidebar();
      if (this._currentAppMode !== 'read') this._switchAppMode('read');
    });
    document.getElementById('sideCollector').addEventListener('click', () => {
      this._closeSidebar();
      wordCollector.show();
    });
    document.getElementById('sideLearnWords').addEventListener('click', () => {
      this._closeSidebar();
      this._showWordsPage();
    });
    document.getElementById('sideVocabLib').addEventListener('click', () => {
      this._closeSidebar();
      this._showVocabLib();
    });
    document.getElementById('sideVocabLibRead').addEventListener('click', () => {
      this._closeSidebar();
      this._showVocabLib();
    });

    document.querySelectorAll('.topbar-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode !== this._currentAppMode) {
          this._switchAppMode(mode);
        }
      });
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

    document.getElementById('btnImport').addEventListener('click', () => this._importFile());
    document.getElementById('importBox').addEventListener('click', () => this._importFile());
    document.getElementById('btnImportModes').addEventListener('click', () => {
      if (this.words.length > 0) modesManager.open();
    });

    document.getElementById('btnForgot').addEventListener('click', () => this.learnCard.animateForgot());
    document.getElementById('btnRemember').addEventListener('click', () => this.learnCard.animateRemember());
    document.getElementById('btnFlip').addEventListener('click', () => this.learnCard.flip());
    document.getElementById('btnTTS').addEventListener('click', () => {
      if (this.learnCard.currentWord) {
        tts.speak(this.learnCard.currentWord.english);
      }
    });
    document.getElementById('btnUndo').addEventListener('click', () => this._undo());
    document.getElementById('btnHistory').addEventListener('click', () => this._toggleHistory());
    document.getElementById('btnHistoryClose').addEventListener('click', () => this._toggleHistory());
    document.getElementById('btnResetSession').addEventListener('click', () => this._resetSession());

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

    document.getElementById('btnDailyHistoryBack').addEventListener('click', () => this._showLearnScreen());
    document.getElementById('dailyDateInput').addEventListener('change', (e) => {
      if (e.target.value) dailyHistory._loadDate(e.target.value);
    });

    document.getElementById('btnSelfTestBack').addEventListener('click', () => this._showLearnScreen());
    document.getElementById('btnSelfTestBackEmpty').addEventListener('click', () => this._showLearnScreen());
    document.getElementById('btnSelfTestFlip').addEventListener('click', () => selfTest.flip());
    document.getElementById('btnSelfTestRemember').addEventListener('click', () => selfTest.handleRemember());
    document.getElementById('btnSelfTestForgot').addEventListener('click', () => selfTest.handleForgot());
    document.getElementById('btnSelfTestTTS').addEventListener('click', () => {
      if (selfTest.currentWord) tts.speak(selfTest.currentWord.english);
    });
    document.getElementById('btnSelfTestRetry').addEventListener('click', () => selfTest.reset());
    document.getElementById('btnSelfTestDone').addEventListener('click', () => this._showLearnScreen());

    document.getElementById('btnStatsBack').addEventListener('click', () => this._showLearnScreen());
    document.getElementById('btnResetProgress').addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        appStore.resetProgress().then(() => {
          this.words = appStore.getAllWords();
          this.undoStack = [];
          this._hideUndoToast();
          this.currentIndex = 0;
          this._showLearnScreen();
        });
      }
    });

    document.getElementById('btnShuffle').addEventListener('click', () => {
      this.shuffleEnabled = !this.shuffleEnabled;
      if (this.words.length > 0) this._buildQueue();
      this._updateSidebar();
      if (this.listViewActive) this._renderListView();
    });
    document.getElementById('btnSort').addEventListener('click', () => {
      this.sortEnabled = !this.sortEnabled;
      const btn = document.getElementById('btnSort');
      btn.classList.toggle('active', this.sortEnabled);
      if (this.words.length > 0) this._buildQueue();
      if (this.listViewActive) {
        this._renderListView();
      } else {
        this._showCurrentCard();
      }
    });
    document.getElementById('btnModes').addEventListener('click', () => {
      modesManager.open();
    });
    document.getElementById('btnLearnMode').addEventListener('click', () => {
      studyModeManager.toggle();
      this._showCurrentCard();
    });
    document.getElementById('btnVocabSwitch').addEventListener('click', () => this._switchVocabulary());

    document.getElementById('btnFavFilter').addEventListener('click', () => {
      this.favFilterEnabled = !this.favFilterEnabled;
      const btn = document.getElementById('btnFavFilter');
      btn.classList.toggle('active', this.favFilterEnabled);
      btn.innerHTML = this.favFilterEnabled ? '\u2605' : '\u2606';
      this._buildQueue();
      if (this.listViewActive) {
        this._renderListView();
      } else {
        this._showCurrentCard();
      }
    });
    document.getElementById('btnListView').addEventListener('click', () => {
      this._toggleListView();
    });
    document.getElementById('btnStar').addEventListener('click', async () => {
      await this.learnCard.toggleFavorite();
    });
    document.getElementById('btnStar').addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      await this.learnCard.toggleGreenStar();
    });
    document.getElementById('btnLearnStar').addEventListener('click', async () => {
      await this.learnCard.toggleFavorite();
    });
    document.getElementById('btnLearnStar').addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      await this.learnCard.toggleGreenStar();
    });
    document.getElementById('btnLearnPrev').addEventListener('click', () => {
      this._handleLearnPrev();
    });
    document.getElementById('btnLearnNext').addEventListener('click', () => {
      this._handleLearnNext();
    });
    document.getElementById('btnLearnTTS').addEventListener('click', () => {
      if (this.learnCard.currentWord) {
        tts.speak(this.learnCard.currentWord.english);
      }
    });
    document.getElementById('btnTheme').addEventListener('click', () => {
      themeManager.toggle();
      this._updateSidebar();
    });

    document.getElementById('btnCardOverlayClose').addEventListener('click', () => this._closeCardOnList());
    document.querySelector('.learn-content').addEventListener('click', (e) => {
      if (e.target === document.querySelector('.learn-content') && this._listCardOverlayActive) {
        this._closeCardOnList();
      }
    });

    document.getElementById('btnNoteEditorSave').addEventListener('click', () => this._saveNote());
    document.getElementById('btnNoteEditorCancel').addEventListener('click', () => this._closeNoteEditor());
    document.getElementById('btnNoteEditorClose').addEventListener('click', () => this._closeNoteEditor());
    document.getElementById('noteEditorPopup').addEventListener('click', (e) => {
      if (e.target === document.getElementById('noteEditorPopup')) this._closeNoteEditor();
    });

    document.getElementById('btnReaderMenu').addEventListener('click', () => {
      this._toggleSidebar();
    });

    this._bindReadPageEvents();
    this._populateReaderLangSelects();

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const activeScreen = document.querySelector('.screen.active');
      if (!activeScreen) return;

      if (e.key === 'Escape') {
        const translatePopup = document.getElementById('readerTranslatePopup');
        if (translatePopup.style.display !== 'none') {
          translatePopup.style.display = 'none';
          return;
        }
        const notePopup = document.getElementById('noteEditorPopup');
        if (notePopup.style.display === 'flex') {
          this._closeNoteEditor();
          return;
        }
        if (this._listCardOverlayActive) {
          this._closeCardOnList();
          return;
        }
        if (document.getElementById('sidebar').classList.contains('open')) {
          this._closeSidebar();
          return;
        }
        if (this.listViewActive) {
          this._toggleListView();
          return;
        }
        if (this.cameFromList) {
          this._toggleListView();
          return;
        }
        if (activeScreen.id === 'screen-reader' && this._currentAppMode === 'read') {
          if (this._readCurrentPage) {
            this._backToReadHome();
          } else {
            this._switchAppMode('learn');
          }
          return;
        }
        if (activeScreen.id === 'screen-words') {
          if (this._currentAppMode === 'read') {
            document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
            document.getElementById('screen-reader').classList.add('active');
          } else {
            this._showLearnScreen();
          }
          return;
        }
        if (activeScreen.id === 'screen-vocablib') {
          if (vocabLibrary._view === 'dict') {
            vocabLibrary._handleBack();
          } else if (this._currentAppMode === 'read') {
            document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
            document.getElementById('screen-reader').classList.add('active');
          } else {
            this._showLearnScreen();
          }
          return;
        }
      }

      if (activeScreen.id === 'screen-learn' && !this.learnCard.isAnimating) {
        if (this.listViewActive && !this._listCardOverlayActive) return;
        if (studyModeManager.isLearningMode || this._listCardOverlayActive) {
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              this._handleLearnPrev();
              break;
            case 'ArrowRight':
              e.preventDefault();
              this._handleLearnNext();
              break;
          }
        } else {
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
            case 'z':
            case 'Z':
              e.preventDefault();
              this._undo();
              break;
          }
        }
      } else if (activeScreen.id === 'screen-reader' && this._currentAppMode === 'read') {
        if (typeof readerMode !== 'undefined') {
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              readerMode.prevPage();
              break;
            case 'ArrowRight':
              e.preventDefault();
              readerMode.nextPage();
              break;
          }
        }
      } else if (activeScreen.id === 'screen-selftest' && selfTest.isActive && !selfTest.isAnimating) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            selfTest.handleForgot();
            break;
          case 'ArrowRight':
            e.preventDefault();
            selfTest.handleRemember();
            break;
          case ' ':
            e.preventDefault();
            selfTest.flip();
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

  _switchAppMode(mode) {
    this._currentAppMode = mode;
    document.querySelectorAll('.topbar-mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (mode === 'read') {
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
      document.getElementById('screen-reader').classList.add('active');
      document.querySelector('.learn-content').style.display = 'none';
      document.getElementById('cardArea').style.display = 'none';
      document.getElementById('listView').style.display = 'none';
      document.getElementById('sidebarLearnContent').style.display = 'none';
      document.getElementById('sidebarReadContent').style.display = '';
      this._backToReadHome();
    } else {
      document.getElementById('screen-reader').classList.remove('active');
      document.getElementById('sidebarLearnContent').style.display = '';
      document.getElementById('sidebarReadContent').style.display = 'none';
      if (this.words.length > 0) {
        this._showLearnScreen();
      } else {
        this._showImportScreen();
      }
    }
  }

  _showWordsPage() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-words').classList.add('active');
    this.wordsPage.show();
  }

  _showVocabLib() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-vocablib').classList.add('active');
    vocabLibrary.show();
  }

  async _switchVocabulary() {
    appStore.setCurrentIndex(this.currentIndex);
    const order = ['b2', 'c1', 'verb'];
    const cur = appStore.data.vocabulary;
    const idx = order.indexOf(cur);
    const newVocab = order[(idx + 1) % order.length];
    await appStore.switchVocabulary(newVocab);
    this.words = appStore.getAllWords();
    this.currentIndex = appStore.getCurrentIndex();
    this.currentFileName = appStore.data.currentFileName;
    this.undoStack = [];
    this.sessionHistory = [];
    this.filterLetter = null;
    this._startLearning();
    this._updateSidebar();
    this._renderLetterStrip();
    document.getElementById('btnVocabSwitch').setAttribute('data-vocab', newVocab);
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
    const shuffleInd = document.getElementById('sideShuffleIndicator');
    shuffleInd.textContent = this.shuffleEnabled ? 'ON' : 'OFF';
    shuffleInd.classList.toggle('active', this.shuffleEnabled);

    const themeInd = document.getElementById('sideThemeIndicator');
    themeInd.textContent = themeManager.darkMode ? 'DARK' : 'LIGHT';
    themeInd.classList.toggle('active', themeManager.darkMode);

    document.getElementById('sideFileName').textContent = this.currentFileName || 'No file loaded';
    const stats = appStore.getStats();
    document.getElementById('sideFileStats').textContent =
      `${stats.total} words · ${stats.remembered} remembered · ${stats.forgotten} forgotten`;

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
    await appStore.initCustomWords(words, result.fileName);
    await appStore.addHistory(result.fileName, words.length);
    this.words = appStore.getAllWords();
    this.filterLetter = null;
    this.sessionHistory = [];
    this._startLearning();
    this._updateSidebar();
    this._renderLetterStrip();
  }

  _startLearning() {
    this._buildQueue();
    this._showLearnScreen();
  }

  _buildQueue() {
    const today = new Date().toISOString().split('T')[0];
    this.screenOrder = this.words.filter((w) => w.nextReview <= today);

    if (this.filterLetter) {
      this.screenOrder = this.screenOrder.filter(
        (w) => w.english.charAt(0).toUpperCase() === this.filterLetter
      );
    }

    if (this.favFilterEnabled) {
      this.screenOrder = this.screenOrder.filter((w) => appStore.isFavorite(w.id) || appStore.isGreenStar(w.id));
    }

    if (this.sortEnabled) {
      this.screenOrder.sort((a, b) => a.english.localeCompare(b.english));
    }

    if (this.shuffleEnabled) {
      for (let i = this.screenOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.screenOrder[i], this.screenOrder[j]] = [this.screenOrder[j], this.screenOrder[i]];
      }
    }

    this.currentIndex = 0;
  }

  _renderLetterStrip() {
    const strip = document.getElementById('letterStrip');
    if (!strip) return;
    strip.innerHTML = '';

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const letter of letters) {
      const btn = document.createElement('button');
      btn.className = 'letter-strip-item';
      btn.textContent = letter;
      btn.dataset.letter = letter;

      const count = this.words.filter(
        (w) => w.english.charAt(0).toUpperCase() === letter && w.nextReview <= new Date().toISOString().split('T')[0]
      ).length;
      if (count > 0) btn.classList.add('has-words');
      if (this.filterLetter === letter) btn.classList.add('active');

      btn.addEventListener('click', () => {
        if (this.filterLetter === letter) {
          this.filterLetter = null;
        } else {
          this.filterLetter = letter;
        }
        this._startLearning();
        this._renderLetterStrip();
      });

      strip.appendChild(btn);
    }
  }

  _showImportScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-import').classList.add('active');
    this.filterLetter = null;
  }

  _showLearnScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-learn').classList.add('active');

    document.getElementById('btnVocabSwitch').setAttribute('data-vocab', appStore.data.vocabulary || 'b2');

    const favBtn = document.getElementById('btnFavFilter');
    favBtn.classList.toggle('active', this.favFilterEnabled);
    favBtn.innerHTML = this.favFilterEnabled ? '\u2605' : '\u2606';

    this.listViewActive = false;
    this.cameFromList = false;
    document.getElementById('listView').style.display = 'none';
    document.querySelector('.learn-content').style.display = 'flex';
    document.getElementById('btnListView').innerHTML = '\u2630';
    document.getElementById('btnListView').title = 'List view';

    this._buildQueue();
    this._showCurrentCard();
    this._renderLetterStrip();
  }

  _showCurrentCard() {
    if (this.currentIndex >= this.screenOrder.length) {
      document.getElementById('cardArea').style.display = 'none';
      document.getElementById('emptyState').style.display = 'flex';
      document.getElementById('progressText').textContent = `0 / 0`;
      return;
    }

    document.getElementById('cardArea').style.display = 'flex';
    document.getElementById('emptyState').style.display = 'none';

    this.learnCard.show(this.screenOrder[this.currentIndex]);
    this.learnCard.setMode(studyModeManager.isLearningMode);
    this.learnCard.updateStarIcon();

    const pos = this.currentIndex + 1;
    let total;
    if (this.favFilterEnabled) {
      total = this.screenOrder.length;
    } else if (this.filterLetter) {
      total = this.words.filter(
        (w) => w.english.charAt(0).toUpperCase() === this.filterLetter
      ).length;
    } else {
      total = this.screenOrder.length;
    }
    let filterLabel = '';
    if (this.filterLetter) filterLabel += ` [${this.filterLetter}]`;
    if (this.favFilterEnabled) filterLabel += ' \u2605';
    document.getElementById('progressText').textContent = `${pos} / ${total}${filterLabel}`;
    this._renderLetterStrip();
  }

  _handleForgot(word) {
    const prevState = appStore.markWord(word.id, 'forgotten');
    if (prevState) {
      this.undoStack.push({ wordId: word.id, prevState });
      this.sessionHistory.push({ english: word.english, armenian: word.armenian, action: 'forgot' });
    }
    if (this._listCardOverlayActive) {
      this._closeCardOnList();
      this._showUndoToast();
      return;
    }
    this.currentIndex++;
    this._showCurrentCard();
    this._showUndoToast();
  }

  _handleRemember(word) {
    const prevState = appStore.markWord(word.id, 'remembered');
    if (prevState) {
      this.undoStack.push({ wordId: word.id, prevState });
      this.sessionHistory.push({ english: word.english, armenian: word.armenian, action: 'remembered' });
    }
    if (this._listCardOverlayActive) {
      this._closeCardOnList();
      this._showUndoToast();
      return;
    }
    this.currentIndex++;
    this._showCurrentCard();
    this._showUndoToast();
  }

  _handleLearnPrev() {
    if (this._listCardOverlayActive) {
      if (this._listCardIndex <= 0) return;
      this._showCardOnList(this._listCardIndex - 1);
      return;
    }
    if (this.currentIndex <= 0) return;
    this.currentIndex--;
    this._showCurrentCard();
  }

  _handleLearnNext() {
    if (this._listCardOverlayActive) {
      if (this._listCardIndex >= this.screenOrder.length - 1) return;
      this._showCardOnList(this._listCardIndex + 1);
      return;
    }
    if (this.currentIndex >= this.screenOrder.length - 1) return;
    this.currentIndex++;
    this._showCurrentCard();
  }

  _undo() {
    if (this.undoStack.length === 0) return;
    if (this.learnCard.isAnimating) return;
    const last = this.undoStack.pop();
    appStore.revertWord(last.wordId, last.prevState);
    this.currentIndex = Math.max(0, this.currentIndex - 1);
    this.sessionHistory.pop();
    this._showCurrentCard();
    this._hideUndoToast();
  }

  _showUndoToast() {
    const toast = document.getElementById('undoToast');
    if (!toast) return;
    toast.classList.add('visible');
    clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this._hideUndoToast(), 3000);
  }

  _hideUndoToast() {
    const toast = document.getElementById('undoToast');
    if (!toast) return;
    toast.classList.remove('visible');
    clearTimeout(this.undoTimer);
  }

  _resetSession() {
    this.undoStack = [];
    this.filterLetter = null;
    this.sessionHistory = [];
    this._hideUndoToast();
    appStore.resetProgress().then(() => {
      this.words = appStore.getAllWords();
      this._buildQueue();
      this._showCurrentCard();
      this._renderLetterStrip();
    });
  }

  _toggleHistory() {
    const panel = document.getElementById('historyPanel');
    const isOpen = panel.style.display === 'flex';
    panel.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) this._renderHistoryPanel();
  }

  _renderHistoryPanel() {
    const container = document.getElementById('historyPanelItems');
    container.innerHTML = '';

    if (this.sessionHistory.length === 0) {
      container.innerHTML = '<div class="history-panel-empty">No words reviewed yet this session</div>';
      return;
    }

    for (let i = this.sessionHistory.length - 1; i >= 0; i--) {
      const entry = this.sessionHistory[i];
      const item = document.createElement('div');
      item.className = `history-panel-item history-${entry.action}`;
      item.innerHTML = `
        <div class="history-panel-word">${entry.english}</div>
        <div class="history-panel-translation">${entry.armenian}</div>
        <div class="history-panel-action">${entry.action === 'remembered' ? '&#10003;' : '&#10007;'}</div>
      `;
      container.appendChild(item);
    }
  }

  _showDailyHistory() {
    dailyHistory.show();
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

  _toggleListView() {
    if (this._listCardOverlayActive) {
      this._closeCardOnList();
      return;
    }
    if (this.cameFromList) {
      this.cameFromList = false;
      this.listViewActive = true;
      this._renderListView();
      document.getElementById('cardArea').style.display = 'none';
      document.getElementById('emptyState').style.display = 'none';
      document.querySelector('.learn-content').style.display = 'none';
      document.getElementById('listView').style.display = 'flex';
      document.getElementById('btnListView').innerHTML = '\u2715';
      document.getElementById('btnListView').title = 'Card view';
      return;
    }

    this.listViewActive = !this.listViewActive;
    if (this.listViewActive) {
      this._renderListView();
      document.getElementById('cardArea').style.display = 'none';
      document.getElementById('emptyState').style.display = 'none';
      document.querySelector('.learn-content').style.display = 'none';
      document.getElementById('listView').style.display = 'flex';
      document.getElementById('btnListView').innerHTML = '\u2715';
      document.getElementById('btnListView').title = 'Card view';
    } else {
      document.getElementById('listView').style.display = 'none';
      document.querySelector('.learn-content').style.display = 'flex';
      document.getElementById('btnListView').innerHTML = '\u2630';
      document.getElementById('btnListView').title = 'List view';
      this._showCurrentCard();
    }
  }

  _renderListView() {
    const container = document.getElementById('listView');
    container.innerHTML = '';

    if (this.screenOrder.length === 0) {
      container.innerHTML = '<div class="list-empty">No words to display</div>';
      return;
    }

    const header = document.createElement('div');
    header.className = 'list-header';
    header.innerHTML = '<span>' + this.screenOrder.length + ' words</span>';
    container.appendChild(header);

    this.screenOrder.forEach((word, index) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      const isFav = appStore.isFavorite(word.id);
      const isGreen = appStore.isGreenStar(word.id);
      const isActive = isFav || isGreen;
      const starChar = isActive ? '\u2605' : '\u2606';
      row.innerHTML =
        '<span class="list-col-star list-star-btn">' + starChar + '</span>' +
        '<span class="list-col-english">' + word.english + '</span>' +
        '<span class="list-col-armenian">' + (word.armenian || '') + '</span>' +
        '<span class="list-col-russian">' + (word.russian || word.translation || '') + '</span>';
      const starSpan = row.querySelector('.list-star-btn');
      starSpan.classList.toggle('is-favorite', isFav);
      starSpan.classList.toggle('is-green-star', isGreen);
      starSpan.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = word.id;
        if (appStore.isGreenStar(id)) await appStore.toggleGreenStar(id);
        const nowFav = await appStore.toggleFavorite(id);
        const nowGreen = appStore.isGreenStar(id);
        starSpan.textContent = (nowFav || nowGreen) ? '\u2605' : '\u2606';
        starSpan.classList.toggle('is-favorite', nowFav);
        starSpan.classList.toggle('is-green-star', nowGreen);
      });
      starSpan.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = word.id;
        if (appStore.isFavorite(id)) await appStore.toggleFavorite(id);
        const nowGreen = await appStore.toggleGreenStar(id);
        const nowFav = appStore.isFavorite(id);
        starSpan.textContent = (nowFav || nowGreen) ? '\u2605' : '\u2606';
        starSpan.classList.toggle('is-favorite', nowFav);
        starSpan.classList.toggle('is-green-star', nowGreen);
      });
      row.addEventListener('click', () => this._handleListRowClick(index));
      container.appendChild(row);
    });
  }

  _handleListRowClick(index) {
    const word = this.screenOrder[index];
    if (!word) return;
    this._showCardOnList(index);
  }

  _showCardOnList(index) {
    const word = this.screenOrder[index];
    if (!word) return;
    this._listCardOverlayActive = true;
    this._listCardIndex = index;
    const learnContent = document.querySelector('.learn-content');
    learnContent.classList.add('list-card-overlay');
    learnContent.style.display = 'flex';
    document.getElementById('cardArea').style.display = 'flex';
    document.getElementById('letterStrip').style.display = 'none';
    this.learnCard.show(word);
    this.learnCard.setMode(true);
    this.learnCard.updateStarIcon();
    this.learnCard.resetFlip();
  }

  _closeCardOnList() {
    if (!this._listCardOverlayActive) return;
    this._listCardOverlayActive = false;
    const learnContent = document.querySelector('.learn-content');
    learnContent.classList.remove('list-card-overlay');
    learnContent.style.display = 'none';
    document.getElementById('cardArea').style.display = 'none';
    document.getElementById('letterStrip').style.display = '';
  }

  _openNoteEditor(word) {
    if (!word) return;
    this._noteEditingWordId = word.id;
    document.getElementById('noteEditorWord').textContent = word.english;
    document.getElementById('noteEditorTextarea').value = appStore.getNote(word.id);
    document.getElementById('noteEditorPopup').style.display = 'flex';
    document.getElementById('noteEditorTextarea').focus();
  }

  _saveNote() {
    const id = this._noteEditingWordId;
    if (id === undefined) return;
    const text = document.getElementById('noteEditorTextarea').value;
    appStore.setNote(id, text).then(() => {
      this._closeNoteEditor();
      const word = appStore.getWordById(id);
      if (word) {
        if (this.learnCard.currentWord && this.learnCard.currentWord.id === id) {
          this.learnCard.currentWord = word;
          this.learnCard.show(word);
        }
      }
    });
  }

  _closeNoteEditor() {
    document.getElementById('noteEditorPopup').style.display = 'none';
    this._noteEditingWordId = undefined;
  }

  _loadLangPrefs() {
    try {
      const saved = localStorage.getItem('yt-lang-prefs');
      if (saved) {
        const p = JSON.parse(saved);
        this._ytSourceLang = p.from || 'en';
        this._ytTargetLang1 = p.to1 || 'hy';
        this._ytTargetLang2 = p.to2 || 'ru';
        this._ytTargetLang3 = p.to3 || 'es';
        this._ytLangCount = p.count || 2;
        this._ytWordCount = p.words || 3;
      }
    } catch (e) {}
  }

  _saveLangPrefs() {
    try {
      localStorage.setItem('yt-lang-prefs', JSON.stringify({
        from: this._ytSourceLang,
        to1: this._ytTargetLang1,
        to2: this._ytTargetLang2,
        to3: this._ytTargetLang3,
        count: this._ytLangCount,
        words: this._ytWordCount
      }));
    } catch (e) {}
  }

  _applyLangPrefsToUI() {
    const sel1 = document.getElementById('ytLangTarget1');
    const sel2 = document.getElementById('ytLangTarget2');
    const sel3 = document.getElementById('ytLangTarget3');
    const countSel = document.getElementById('ytLangCount');
    const wordSel = document.getElementById('ytWordCount');
    if (sel1) sel1.value = this._ytTargetLang1;
    if (sel2) sel2.value = this._ytTargetLang2;
    if (sel3) sel3.value = this._ytTargetLang3;
    if (countSel) countSel.value = this._ytLangCount;
    if (wordSel) wordSel.value = this._ytWordCount;
    this._updateLangSelectVisibility();
    this.translationPopup.setLanguages(this._ytSourceLang, this._getActiveLangs(), this._ytWordCount);
  }

  _getActiveLangs() {
    const langs = [this._ytTargetLang1];
    if (this._ytLangCount >= 2 && this._ytTargetLang2) langs.push(this._ytTargetLang2);
    if (this._ytLangCount >= 3 && this._ytTargetLang3) langs.push(this._ytTargetLang3);
    return langs;
  }

  _updateLangSelectVisibility() {
    const count = this._ytLangCount;
    const sel2 = document.getElementById('ytLangTarget2');
    const sel3 = document.getElementById('ytLangTarget3');

    if (count >= 2 && sel2) {
      sel2.style.display = '';
      if (!sel2.value) { sel2.value = 'ru'; this._ytTargetLang2 = 'ru'; }
    } else if (sel2) { sel2.style.display = 'none'; }

    if (count >= 3 && sel3) {
      sel3.style.display = '';
      if (!sel3.value) { sel3.value = 'es'; this._ytTargetLang3 = 'es'; }
    } else if (sel3) { sel3.style.display = 'none'; }

    document.querySelectorAll('.yt-lang-extra').forEach(el => {
      if (el.tagName === 'LABEL') {
        const nextSelect = el.nextElementSibling;
        if (nextSelect && nextSelect.classList.contains('yt-lang-select')) {
          el.style.display = nextSelect.style.display;
        }
      }
    });
    this._saveLangPrefs();
  }

  _langNameList() {
    return [
      ['en','English'],['es','Spanish'],['fr','French'],['de','German'],
      ['it','Italian'],['pt','Portuguese'],['ru','Russian'],['ar','Arabic'],
      ['zh','Chinese'],['ja','Japanese'],['ko','Korean'],['hi','Hindi'],
      ['hy','Armenian'],['tr','Turkish'],['pl','Polish'],['nl','Dutch'],
      ['sv','Swedish'],['uk','Ukrainian'],['el','Greek'],['cs','Czech'],
      ['ro','Romanian'],['hu','Hungarian'],['fi','Finnish'],['da','Danish'],
      ['no','Norwegian'],['he','Hebrew'],['th','Thai'],['vi','Vietnamese'],
      ['id','Indonesian'],['ka','Georgian'],['bn','Bengali'],['ur','Urdu'],
      ['fa','Persian'],['sw','Swahili'],['fil','Filipino'],['ms','Malay']
    ];
  }

  _populateReaderLangSelects() {
    const langs = this._langNameList();
    const sourceSel = document.getElementById('readerSourceLang');
    const targetSel = document.getElementById('readerTargetLang');
    if (!sourceSel || !targetSel) return;
    sourceSel.innerHTML = langs.map(([v, label]) =>
      `<option value="${v}">${label}</option>`
    ).join('');
    targetSel.innerHTML = langs.map(([v, label]) =>
      `<option value="${v}">${label}</option>`
    ).join('');
    this._applyReaderLangPrefs();
  }

  _loadReaderLangPrefs() {
    try {
      const saved = localStorage.getItem('reader-lang-prefs');
      if (saved) {
        const p = JSON.parse(saved);
        this._pdfSourceLang = p.from || 'en';
        this._pdfTargetLang = p.to || 'hy';
        this._pdfWordCount = p.words || 3;
      }
    } catch (e) {}
  }

  _saveReaderLangPrefs() {
    try {
      localStorage.setItem('reader-lang-prefs', JSON.stringify({
        from: this._pdfSourceLang,
        to: this._pdfTargetLang,
        words: this._pdfWordCount
      }));
    } catch (e) {}
  }

  _applyReaderLangPrefs() {
    const sourceSel = document.getElementById('readerSourceLang');
    const targetSel = document.getElementById('readerTargetLang');
    const wordSel = document.getElementById('readerWordCount');
    if (sourceSel) sourceSel.value = this._pdfSourceLang;
    if (targetSel) targetSel.value = this._pdfTargetLang;
    if (wordSel) wordSel.value = this._pdfWordCount;
    this.translationPopup.setLanguages(this._pdfSourceLang, [this._pdfTargetLang], this._pdfWordCount);
  }

  _bindReadPageEvents() {
    this._readCurrentPage = null;
    this._readPdfFile = null;
    this._readPdfPath = null;

    document.querySelectorAll('.read-home-card').forEach((card) => {
      card.addEventListener('click', () => {
        this._openReadPage(card.dataset.mode);
      });
    });

    document.getElementById('btnReaderBack').addEventListener('click', () => {
      this._backToReadHome();
    });

    document.getElementById('btnReaderTheme').addEventListener('click', () => {
      themeManager.toggle();
      this._updateSidebar();
    });

    document.getElementById('btnReadText').addEventListener('click', () => {
      this._loadTextContent();
    });
    document.getElementById('btnReadNewText').addEventListener('click', () => {
      this._resetReadPage();
    });

    const dropzone = document.getElementById('readPdfDropzone');
    const fileInput = document.getElementById('readPdfFileInput');
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') this._setPdfFile(file);
    });
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this._setPdfFile(file);
    });
    document.getElementById('btnReadPdf').addEventListener('click', () => {
      this._loadPdfContent();
    });
    document.getElementById('btnReadNewPdf').addEventListener('click', () => {
      this._resetReadPage();
    });

    document.getElementById('pdfPrevPage').addEventListener('click', () => {
      readerMode.prevPage();
    });
    document.getElementById('pdfNextPage').addEventListener('click', () => {
      readerMode.nextPage();
    });
    document.getElementById('pdfViewerScroll').addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = 1 - e.deltaY * 0.001;
        readerMode.zoomBy(factor);
      }
    });

    document.getElementById('btnReadYoutube').addEventListener('click', () => {
      this._loadYoutubeContent();
    });
    document.getElementById('btnReadNewYoutube').addEventListener('click', () => {
      this._resetReadPage();
    });

    document.getElementById('btnYtPrev').addEventListener('click', () => {
      this._ytShadowPrev();
    });
    document.getElementById('btnYtNext').addEventListener('click', () => {
      this._ytShadowNext();
    });

    const shadowBtn = document.getElementById('btnYtShadowSettings');
    const shadowDropdown = document.getElementById('ytShadowDropdown');
    shadowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = shadowDropdown.style.display === 'flex';
      shadowDropdown.style.display = isOpen ? 'none' : 'flex';
    });
    document.addEventListener('click', (e) => {
      if (shadowDropdown.style.display === 'flex' && !shadowDropdown.contains(e.target) && e.target !== shadowBtn) {
        shadowDropdown.style.display = 'none';
      }
    });
    document.getElementById('btnYtShadowToggle').addEventListener('click', () => {
      if (this._ytShadowActive) {
        this._ytShadowStop();
      } else {
        this._ytShadowStart();
      }
    });
    document.getElementById('ytShadowRepeatCount').addEventListener('change', (e) => {
      this._ytShadowSentenceCount = parseInt(e.target.value, 10) || 0;
    });
    document.getElementById('ytShadowSpeed').addEventListener('change', (e) => {
      this._ytShadowSpeed = parseFloat(e.target.value) || 1;
      if (this._ytPlayer && typeof this._ytPlayer.setPlaybackRate === 'function') {
        this._ytPlayer.setPlaybackRate(this._ytShadowSpeed);
      }
    });

    document.getElementById('ytLangCount').addEventListener('change', (e) => {
      this._ytLangCount = parseInt(e.target.value) || 2;
      this._saveLangPrefs();
      this._updateLangSelectVisibility();
      this.translationPopup.setLanguages(this._ytSourceLang, this._getActiveLangs(), this._ytWordCount);
      this.translationPopup._cache.clear();
    });
    document.getElementById('ytWordCount').addEventListener('change', (e) => {
      this._ytWordCount = parseInt(e.target.value) || 3;
      this._saveLangPrefs();
      this.translationPopup.setLanguages(this._ytSourceLang, this._getActiveLangs(), this._ytWordCount);
      this.translationPopup._cache.clear();
    });
    document.getElementById('ytLangTarget1').addEventListener('change', (e) => {
      this._ytTargetLang1 = e.target.value;
      this._saveLangPrefs();
      this.translationPopup.setLanguages(this._ytSourceLang, this._getActiveLangs(), this._ytWordCount);
      this.translationPopup._cache.clear();
    });
    document.getElementById('ytLangTarget2').addEventListener('change', (e) => {
      this._ytTargetLang2 = e.target.value;
      this._saveLangPrefs();
      this.translationPopup.setLanguages(this._ytSourceLang, this._getActiveLangs(), this._ytWordCount);
      this.translationPopup._cache.clear();
    });
    document.getElementById('ytLangTarget3').addEventListener('change', (e) => {
      this._ytTargetLang3 = e.target.value;
      this._saveLangPrefs();
      this.translationPopup.setLanguages(this._ytSourceLang, this._getActiveLangs(), this._ytWordCount);
      this.translationPopup._cache.clear();
    });

    const langSelChange = (e) => {
      this._pdfSourceLang = document.getElementById('readerSourceLang').value;
      this._pdfTargetLang = document.getElementById('readerTargetLang').value;
      this._pdfWordCount = parseInt(document.getElementById('readerWordCount').value) || 3;
      this._saveReaderLangPrefs();
      this.translationPopup.setLanguages(this._pdfSourceLang, [this._pdfTargetLang], this._pdfWordCount);
      this.translationPopup._cache.clear();
    };
    document.getElementById('readerSourceLang').addEventListener('change', langSelChange);
    document.getElementById('readerTargetLang').addEventListener('change', langSelChange);
    document.getElementById('readerWordCount').addEventListener('change', langSelChange);

    this._initYoutubeResize();
    this._initYoutubeHResize();

    document.getElementById('btnReaderTranslateClose').addEventListener('click', () => {
      document.getElementById('readerTranslatePopup').style.display = 'none';
    });

    document.addEventListener('click', (e) => {
      const popup = document.getElementById('readerTranslatePopup');
      if (popup.style.display !== 'none' && !popup.contains(e.target) && !e.target.closest('.rw-word') && !popup.dataset.justOpened) {
        popup.style.display = 'none';
      }
    });
  }

  _openReadPage(mode) {
    this._readCurrentPage = mode;
    document.getElementById('readHome').style.display = 'none';
    document.querySelectorAll('.read-page').forEach((p) => p.classList.remove('active'));
    const pageEl = document.getElementById('read-page-' + mode);
    if (pageEl) pageEl.classList.add('active');

    const titles = { text: 'Text Reader', pdf: 'PDF Reader', youtube: 'YouTube Reader' };
    document.getElementById('readerTitle').textContent = titles[mode] || 'Read';
    document.getElementById('btnReaderBack').style.display = '';
    document.getElementById('btnReaderMenu').style.display = 'none';

    if (mode === 'pdf') {
      this._scanPdfLibrary();
    }
  }

  _backToReadHome() {
    this._resetReadPage();
    document.getElementById('readHome').style.display = '';
    document.querySelectorAll('.read-page').forEach((p) => p.classList.remove('active'));
    document.getElementById('readerTitle').textContent = 'Read';
    document.getElementById('btnReaderBack').style.display = 'none';
    document.getElementById('btnReaderMenu').style.display = '';
    this._readCurrentPage = null;
  }

  _loadTextContent() {
    const text = document.getElementById('readTextInput').value.trim();
    if (!text) return;
    this._showReadContent('text', 'Text', text);
  }

  _setPdfFile(file) {
    this._readPdfFile = file;
    const dropzone = document.getElementById('readPdfDropzone');
    dropzone.classList.add('read-dropzone-loaded');
    dropzone.querySelector('.read-dropzone-text').textContent = file.name;
    document.getElementById('btnReadPdf').disabled = false;
  }

  async _loadPdfContent() {
    if (!this._readPdfFile && !this._readPdfPath) return;

    let data;
    let title;
    if (this._readPdfFile) {
      const arrayBuffer = await this._readPdfFile.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
      title = this._readPdfFile.name.replace(/\.pdf$/i, '');
      this._readPdfFile = null;
    } else if (this._readPdfPath) {
      const buf = await window.electronAPI.readFile(this._readPdfPath);
      if (!buf) {
        this._showReadContent('pdf-error', 'Error', 'Failed to read PDF file.');
        return;
      }
      data = new Uint8Array(buf);
      title = this._readPdfPath.replace(/.*[/\\]/, '').replace(/\.pdf$/i, '');
      this._readPdfPath = null;
    }

    try {
      document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
      document.getElementById('pdfLibrary').style.display = 'none';
      document.getElementById('readCollapsedBarPdf').style.display = 'flex';
      document.getElementById('readCollapsedLabelPdf').textContent = title;
      document.getElementById('readContentAreaPdf').style.display = 'block';
      document.getElementById('pdfViewer').style.display = 'flex';
      document.getElementById('readTextViewPdf').style.display = 'none';
      document.getElementById('readTextViewPdf').innerHTML = '';
      document.getElementById('readerLangBar').style.display = 'flex';

      this._applyReaderLangPrefs();
      await readerMode.loadPdf(data);
      const sourceInfo = { type: 'pdf', title, id: Date.now().toString(36) };
      this._readSourceInfo = sourceInfo;
      this.translationPopup.bindToContainer(document.getElementById('pdfTextLayer'), sourceInfo);
    } catch (e) {
      console.error('PDF load error:', e);
      document.getElementById('readContentAreaPdf').style.display = 'none';
      document.getElementById('readTextViewPdf').style.display = 'block';
      document.getElementById('readTextViewPdf').innerHTML = 'Failed to load PDF: ' + e.message;
    }
  }

  async _loadPdfFromPath(filePath) {
    this._readPdfPath = filePath;
    await this._loadPdfContent();
  }

  async _scanPdfLibrary() {
    const listEl = document.getElementById('pdfLibraryList');
    const emptyEl = document.getElementById('pdfLibraryEmpty');
    const noFolderEl = document.getElementById('pdfLibraryNoFolder');
    const loadingEl = document.getElementById('pdfLibraryLoading');
    listEl.innerHTML = '';
    emptyEl.style.display = 'none';
    noFolderEl.style.display = 'none';
    loadingEl.style.display = '';

    let folderPath;
    try {
      folderPath = await window.electronAPI.getHomeDir();
    } catch (e) {
      folderPath = '';
    }
    if (!folderPath) {
      loadingEl.style.display = 'none';
      noFolderEl.style.display = '';
      return;
    }
    folderPath = folderPath + '\\swipeword';

    let items;
    try {
      items = await window.electronAPI.readDir(folderPath);
    } catch (e) {
      loadingEl.style.display = 'none';
      noFolderEl.style.display = '';
      return;
    }
    loadingEl.style.display = 'none';

    if (!items || items.length === 0) {
      emptyEl.style.display = '';
      return;
    }

    const pdfs = items.filter((item) => !item.isDirectory && item.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      emptyEl.style.display = '';
      return;
    }

    pdfs.forEach((pdf) => {
      const item = document.createElement('div');
      item.className = 'pdf-library-item';
      const size = pdf.size > 1024 * 1024
        ? (pdf.size / 1024 / 1024).toFixed(1) + ' MB'
        : (pdf.size / 1024).toFixed(0) + ' KB';
      item.innerHTML =
        '<span class="pdf-library-item-icon">&#128196;</span>' +
        '<span class="pdf-library-item-name">' + this._escapeHtml(pdf.name.replace(/\.pdf$/i, '')) + '</span>' +
        '<span class="pdf-library-item-size">' + size + '</span>';
      item.addEventListener('click', () => {
        const path = pdf.path;
        this._resetReadPage();
        this._readPdfPath = path;
        document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
        this._loadPdfContent();
      });
      listEl.appendChild(item);
    });
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _initYoutubeResize() {
    const divider = document.getElementById('ytPaneDivider');
    const player = document.getElementById('readYoutubePlayer');
    const area = document.getElementById('readYoutubeArea');
    const overlay = document.getElementById('ytDragOverlay');
    let dragging = false, startY = 0, startH = 0, areaH = 0, rafId = 0, pendingY = 0;

    divider.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      startY = e.clientY;
      startH = player.offsetHeight;
      areaH = area.offsetHeight;
      overlay.classList.add('active');
      divider.setPointerCapture(e.pointerId);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      player.style.willChange = 'height';
    });

    divider.addEventListener('dblclick', () => {
      player.style.willChange = 'height';
      player.style.height = '45%';
      requestAnimationFrame(() => { player.style.willChange = ''; });
    });

    divider.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      pendingY = e.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const dy = pendingY - startY;
          const maxH = areaH - 60;
          const minH = 80;
          player.style.height = Math.max(minH, Math.min(maxH, startH + dy)) + 'px';
        });
      }
    });

    divider.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      overlay.classList.remove('active');
      player.style.willChange = '';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  _initYoutubeHResize() {
    const divider = document.getElementById('ytHDivider');
    const subPanel = document.getElementById('ytSubtitlePanel');
    const overlay = document.getElementById('ytDragOverlayH');
    const split = document.getElementById('ytBottomSplit');
    let dragging = false, startX = 0, startW = 0, splitW = 0, rafId = 0, pendingX = 0;

    divider.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      startX = e.clientX;
      startW = subPanel.offsetWidth;
      splitW = split.offsetWidth - divider.offsetWidth;
      overlay.classList.add('active');
      divider.setPointerCapture(e.pointerId);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    divider.addEventListener('dblclick', () => {
      subPanel.style.flexBasis = '50%';
      subPanel.style.flexGrow = '0';
    });

    divider.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      pendingX = e.clientX;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const dx = pendingX - startX;
          const minW = 200;
          const maxW = splitW - 120;
          subPanel.style.flexBasis = Math.max(minW, Math.min(maxW, startW + dx)) + 'px';
          subPanel.style.flexGrow = '0';
        });
      }
    });

    divider.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      overlay.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  async _renderYoutubeSavedWords() {
    const listEl = document.getElementById('ytWordsList');
    const src = this._readSourceInfo;
    if (!src || src.type !== 'youtube' || !src.youtubeUrl) {
      listEl.innerHTML = '<div class="yt-word-empty">No video loaded</div>';
      return;
    }
    try {
      const allWords = await window.electronAPI.dictionaryLoad();
      const videoWords = (allWords || []).filter(w => w.youtubeUrl === src.youtubeUrl);
      this._ytSavedWords = new Set(videoWords.map(w => (w.word || '').toLowerCase()));
      this._markYtSavedWords();
      if (videoWords.length === 0) {
        listEl.innerHTML = '<div class="yt-word-empty">No saved words yet.<br>Double-click a word in subtitles to translate and save it.</div>';
        return;
      }
      listEl.innerHTML = videoWords
        .map(w => {
          const trans = w.translation || '';
          const ts = w.videoTimestamp || 0;
          return '<div class="yt-word-item" data-word="' + w.word + '" data-timestamp="' + ts + '">' +
            '<div class="yt-word-en">' + w.word + '</div>' +
            (trans ? '<div class="yt-word-trans">' + trans + '</div>' : '') +
            '</div>';
        })
        .join('');

      listEl.querySelectorAll('.yt-word-item').forEach(item => {
        item.addEventListener('click', () => {
          const ts = parseFloat(item.dataset.timestamp) || 0;
          if (this._ytPlayer && typeof this._ytPlayer.seekTo === 'function' && ts > 0) {
            this._ytPlayer.seekTo(Math.max(0, ts - 4), true);
            this._ytPlayer.playVideo();
            this._ytFlashTargetLine = -1;
            const lines = document.querySelectorAll('#readYoutubeSubtitles .yt-sub-line');
            let best = -1;
            let bestDiff = Infinity;
            for (let i = 0; i < lines.length; i++) {
              const start = parseFloat(lines[i].dataset.start);
              if (Math.floor(start) === ts) {
                this._ytFlashTargetLine = i;
                break;
              }
              const diff = Math.abs(start - ts);
              if (diff < bestDiff) {
                bestDiff = diff;
                best = i;
              }
            }
            if (this._ytFlashTargetLine === -1) this._ytFlashTargetLine = best;
            const targetLine = this._ytFlashTargetLine >= 0
              ? document.querySelector('#readYoutubeSubtitles .yt-sub-line[data-index="' + this._ytFlashTargetLine + '"]')
              : null;
            if (targetLine) {
              targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        });
      });
    } catch (e) {
      listEl.innerHTML = '<div class="yt-word-empty">Failed to load words</div>';
    }
  }

  async _loadYoutubeContent() {
    const url = document.getElementById('readYoutubeInput').value.trim();
    if (!url) return;
    const videoId = this._extractYoutubeId(url);
    if (!videoId) {
      alert('Invalid YouTube URL');
      return;
    }
    let title = url;
    try {
      const resp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.title) title = data.title;
      }
    } catch (e) {
      // fallback to URL as title
    }
    this._showReadContent('youtube', title, null, videoId);
  }

  _extractYoutubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  }

  _showReadContent(sourceType, title, text, videoId) {
    const sourceInfo = { type: sourceType, title, id: Date.now().toString(36) };
    if (sourceType === 'youtube' && videoId) {
      sourceInfo.youtubeUrl = 'https://youtube.com/watch?v=' + videoId;
    }
    this._readSourceInfo = sourceInfo;

    if (sourceType === 'youtube' && videoId) {
      document.getElementById('read-page-youtube').querySelector('.read-page-input').style.display = 'none';
      document.getElementById('readCollapsedBarYoutube').style.display = 'flex';
      document.getElementById('readCollapsedLabelYoutube').textContent = title;
      document.getElementById('readYoutubeArea').style.display = 'flex';
      document.getElementById('ytLangBar').style.display = 'flex';
      this._applyLangPrefsToUI();
      const ytPlayerEl = document.getElementById('readYoutubePlayer');
      ytPlayerEl.style.height = '45%';
      if (this._ytPlayer) {
        try { this._ytPlayer.destroy(); } catch (e) {}
        this._ytPlayer = null;
      }
      ytPlayerEl.innerHTML = '';
      document.getElementById('readYoutubeSubtitles').innerHTML =
        '<p style="color:var(--text-secondary);">Loading captions...</p>';
      this._renderYoutubeSavedWords();
      this._fetchYoutubeCaptions(videoId);
      this._ytPlayer = new YT.Player('readYoutubePlayer', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { rel: 0 },
        events: {
          onReady: () => {
            if (this._ytShadowSpeed !== 1 && typeof this._ytPlayer.setPlaybackRate === 'function') {
              try { this._ytPlayer.setPlaybackRate(this._ytShadowSpeed); } catch (e) {}
            }
            if (this._ytCaptions && this._ytCaptions.length > 0) {
              this._startYoutubeSync();
            }
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
              this._saveYoutubePosition();
            }
          }
        }
      });
      this._startPositionTracking();
    } else if (sourceType === 'pdf') {
      document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
      document.getElementById('pdfLibrary').style.display = 'none';
      document.getElementById('readCollapsedBarPdf').style.display = 'flex';
      document.getElementById('readCollapsedLabelPdf').textContent = title;
      document.getElementById('readContentAreaPdf').style.display = 'block';
      document.getElementById('readTextViewPdf').innerHTML = '';
      document.getElementById('readerLangBar').style.display = 'flex';
      this._applyReaderLangPrefs();
      readerMode.loadPdf(text).then(() => {
        this.translationPopup.bindToContainer(document.getElementById('pdfTextLayer'), sourceInfo);
      });
    } else if (sourceType === 'pdf-error') {
      document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
      document.getElementById('pdfLibrary').style.display = 'none';
      document.getElementById('readCollapsedBarPdf').style.display = 'flex';
      document.getElementById('readCollapsedLabelPdf').textContent = title;
      document.getElementById('readContentAreaPdf').style.display = 'block';
      document.getElementById('pdfViewer').style.display = 'none';
      document.getElementById('readTextViewPdf').style.display = 'block';
      document.getElementById('readTextViewPdf').innerHTML = text;
    } else {
      document.getElementById('read-page-text').querySelector('.read-page-input').style.display = 'none';
      document.getElementById('readCollapsedBarText').style.display = 'flex';
      document.getElementById('readCollapsedLabelText').textContent = title;
      document.getElementById('readContentAreaText').style.display = 'block';
      const view = document.getElementById('readTextView');
      view.innerHTML = WordWrapper.wrap(text);
      this.translationPopup.bindToContainer(view, sourceInfo);
    }
  }

  async _fetchYoutubeCaptions(videoId) {
    const subEl = document.getElementById('readYoutubeSubtitles');
    try {
      const lines = await window.electronAPI.youtubeCaptions(videoId);
      if (!lines || lines.length === 0) {
        subEl.innerHTML = '<p style="color:var(--text-secondary);">No captions available for this video.</p>';
        return;
      }
      this._ytCaptions = lines;
      this._buildYtSentences();
      this._renderYoutubeSubtitles(lines);
      if (this._ytPlayer && typeof this._ytPlayer.getCurrentTime === 'function') {
        this._startYoutubeSync();
      }
    } catch (e) {
      console.error('Failed to fetch captions:', e);
      subEl.innerHTML = '<p style="color:var(--text-secondary);">Failed to load captions.</p>';
    }
  }

  _renderYoutubeSubtitles(lines) {
    const subEl = document.getElementById('readYoutubeSubtitles');
    const sourceInfo = this._readSourceInfo;
    const fmtTime = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return m + ':' + String(sec).padStart(2, '0');
    };
    subEl.innerHTML = lines
      .map((line, i) => {
        const wrapped = WordWrapper.wrap(line.text);
        return '<div class="yt-sub-line" data-index="' + i + '" data-start="' + line.start + '"><span class="yt-sub-time">' + fmtTime(line.start) + '</span>' + wrapped + '</div>';
      })
      .join('');
    this.translationPopup.bindToContainer(subEl, sourceInfo);
    this._markYtSavedWords();
  }

  _markYtSavedWords() {
    if (!this._ytSavedWords || this._ytSavedWords.size === 0) return;
    const words = document.querySelectorAll('#readYoutubeSubtitles .yt-sub-line .rw-word');
    words.forEach((el) => {
      const w = (el.dataset.word || '').toLowerCase();
      el.classList.toggle('yt-word-saved', this._ytSavedWords.has(w));
    });
  }

  _flashYtSavedWords(lineIndex) {
    if (!this._ytSavedWords || this._ytSavedWords.size === 0) return;
    const line = document.querySelector('#readYoutubeSubtitles .yt-sub-line[data-index="' + lineIndex + '"]');
    if (!line) return;
    const words = line.querySelectorAll('.rw-word.yt-word-saved');
    words.forEach((el) => {
      el.classList.remove('yt-word-flash');
      void el.offsetWidth;
      el.classList.add('yt-word-flash');
    });
  }

  _isYtLineReadable(line) {
    const container = document.getElementById('readYoutubeSubtitles');
    if (!container || !line) return false;
    const cRect = container.getBoundingClientRect();
    const lRect = line.getBoundingClientRect();
    return lRect.top >= cRect.top && lRect.bottom <= cRect.bottom;
  }

  _startYoutubeSync() {
    if (this._ytCaptionTimer) {
      clearInterval(this._ytCaptionTimer);
      this._ytCaptionTimer = null;
    }
    this._ytCurrentLineIndex = -1;
    const subEl = document.getElementById('readYoutubeSubtitles');
    const subLines = subEl.querySelectorAll('.yt-sub-line');

    this._ytCaptionTimer = setInterval(() => {
      if (!this._ytPlayer || typeof this._ytPlayer.getCurrentTime !== 'function') return;
      const time = this._ytPlayer.getCurrentTime();

      const captions = this._ytCaptions;
      if (!captions || !captions.length) return;

      let idx = -1;
      for (let i = captions.length - 1; i >= 0; i--) {
        if (time >= captions[i].start - 0.15) { idx = i; break; }
      }

      if (idx !== this._ytCurrentLineIndex) {
        this._ytCurrentLineIndex = idx;
        for (let i = 0; i < subLines.length; i++) {
          const distance = Math.abs(i - idx);
          const el = subLines[i];
          const isActive = i === idx;
          const isNear = !isActive && distance <= 2;
          if (el.classList.contains('yt-sub-active') !== isActive) el.classList.toggle('yt-sub-active', isActive);
          if (el.classList.contains('yt-sub-near') !== isNear) el.classList.toggle('yt-sub-near', isNear);
        }
        if (idx >= 0 && subLines[idx]) {
          subLines[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      if (this._ytFlashTargetLine >= 0) {
        const tLine = document.querySelector('#readYoutubeSubtitles .yt-sub-line[data-index="' + this._ytFlashTargetLine + '"]');
        if (tLine && this._isYtLineReadable(tLine)) {
          this._flashYtSavedWords(this._ytFlashTargetLine);
          this._ytFlashTargetLine = -1;
        }
      }

      if (this._ytShadowActive && this._ytShadowSentenceIdx >= 0 && this._ytSentences[this._ytShadowSentenceIdx]) {
        const blockEnd = this._ytShadowBlockEnd();
        const now = Date.now();
        this._setPracticingRange(this._ytShadowSentenceIdx, blockEnd);
        const blockLast = this._ytSentences[blockEnd - 1];
        if (time >= blockLast.endTime && now - (this._ytShadowLastActionTime || 0) > 400) {
          this._ytShadowLastActionTime = now;
          const first = this._ytSentences[this._ytShadowSentenceIdx];
          this._ytPlayer.seekTo(first.startTime, true);
          this._ytPlayer.playVideo();
        }
      }
    }, 250);
  }

  _buildYtSentences() {
    const lines = this._ytCaptions || [];
    const MAX_LINES = 6;
    const MAX_SECONDS = 8;
    this._ytSentences = [];
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (start === -1) start = i;
      const first = lines[start];
      const cur = lines[i];
      const text = (cur.text || '').trim();
      const endsSentence = /[.!?]["'\u2019)\]]*$/.test(text);
      const exceeds = (i - start + 1) >= MAX_LINES || (cur.start + cur.duration - first.start) >= MAX_SECONDS;
      if (endsSentence || exceeds) {
        this._ytSentences.push({
          startIndex: start,
          endIndex: i,
          startTime: first.start,
          endTime: cur.start + cur.duration,
          text: lines.slice(start, i + 1).map(l => l.text).join(' ')
        });
        start = -1;
      }
    }
    if (start !== -1) {
      const first = lines[start];
      const last = lines[lines.length - 1];
      this._ytSentences.push({
        startIndex: start,
        endIndex: lines.length - 1,
        startTime: first.start,
        endTime: last.start + last.duration,
        text: lines.slice(start).map(l => l.text).join(' ')
      });
    }
    return this._ytSentences;
  }

  _findYtSentenceAtTime(time) {
    const sents = this._ytSentences || [];
    for (let i = sents.length - 1; i >= 0; i--) {
      if (time >= sents[i].startTime - 0.15) return i;
    }
    return sents.length ? 0 : -1;
  }

  _setPracticingRange(startSentIdx, endSentIdx) {
    const sents = this._ytSentences || [];
    if (startSentIdx < 0 || endSentIdx <= startSentIdx || endSentIdx > sents.length) return;
    const firstLine = sents[startSentIdx].startIndex;
    const lastLine = sents[endSentIdx - 1].endIndex;
    const subLines = document.querySelectorAll('#readYoutubeSubtitles .yt-sub-line');
    subLines.forEach((el, i) => {
      el.classList.toggle('yt-sub-practicing', i >= firstLine && i <= lastLine);
    });
  }

  _ytShadowBlockEnd() {
    const count = this._ytShadowSentenceCount;
    if (count <= 0) return this._ytSentences.length;
    return Math.min(this._ytSentences.length, this._ytShadowSentenceIdx + count);
  }

  _ytShadowStart() {
    if (!this._ytPlayer || typeof this._ytPlayer.getCurrentTime !== 'function') return;
    if (!this._ytSentences || !this._ytSentences.length) return;
    const idx = this._findYtSentenceAtTime(this._ytPlayer.getCurrentTime());
    if (idx < 0) return;
    this._ytShadowStartSentence(idx);
  }

  _ytShadowStartSentence(sentIdx) {
    if (!this._ytSentences || sentIdx < 0 || sentIdx >= this._ytSentences.length) return;
    if (!this._ytPlayer || typeof this._ytPlayer.seekTo !== 'function') return;
    this._ytShadowActive = true;
    this._ytShadowSentenceIdx = sentIdx;
    this._ytShadowLastActionTime = Date.now();
    this._setPracticingRange(sentIdx, this._ytShadowBlockEnd());
    const sent = this._ytSentences[sentIdx];
    this._ytPlayer.seekTo(sent.startTime, true);
    this._ytPlayer.playVideo();
    this._updateYtShadowUI();
  }

  _ytShadowPrev() {
    if (!this._ytSentences || !this._ytSentences.length) return;
    const prevIdx = this._ytShadowSentenceIdx - 1;
    if (prevIdx < 0) {
      this._ytShadowStartSentence(this._ytSentences.length - 1);
      return;
    }
    this._ytShadowStartSentence(prevIdx);
  }

  _ytShadowNext() {
    if (!this._ytSentences || !this._ytSentences.length) return;
    const nextIdx = this._ytShadowSentenceIdx + 1;
    if (nextIdx >= this._ytSentences.length) {
      this._ytShadowStop();
      return;
    }
    this._ytShadowStartSentence(nextIdx);
  }

  _ytShadowStop() {
    this._ytShadowActive = false;
    this._ytShadowSentenceIdx = -1;
    const subLines = document.querySelectorAll('#readYoutubeSubtitles .yt-sub-line.yt-sub-practicing');
    subLines.forEach((el) => el.classList.remove('yt-sub-practicing'));
    this._updateYtShadowUI();
  }

  _updateYtShadowUI() {
    const on = !!this._ytShadowActive;
    const toggle = document.getElementById('btnYtShadowToggle');
    const prevBtn = document.getElementById('btnYtPrev');
    const nextBtn = document.getElementById('btnYtNext');
    if (toggle) toggle.classList.toggle('active', on);
    if (prevBtn) prevBtn.style.display = on ? '' : 'none';
    if (nextBtn) nextBtn.style.display = on ? '' : 'none';
  }

  _stopYoutubeSync() {
    if (this._ytCaptionTimer) {
      clearInterval(this._ytCaptionTimer);
      this._ytCaptionTimer = null;
    }
    this._ytCaptions = [];
    this._ytSentences = [];
    this._ytSavedWords = new Set();
    this._ytFlashTargetLine = -1;
    this._ytCurrentLineIndex = -1;
    this._ytShadowStop();
    if (this._ytPlayer) {
      this._saveYoutubePosition();
      try {
        if (typeof this._ytPlayer.setPlaybackRate === 'function') {
          this._ytPlayer.setPlaybackRate(1);
        }
      } catch (e) {}
      try { this._ytPlayer.destroy(); } catch (e) {}
      this._ytPlayer = null;
    }
    if (this._ytPositionTimer) {
      clearInterval(this._ytPositionTimer);
      this._ytPositionTimer = null;
    }
  }

  _startPositionTracking() {
    if (this._ytPositionTimer) {
      clearInterval(this._ytPositionTimer);
    }
    this._ytPositionTimer = setInterval(() => {
      this._saveYoutubePosition();
    }, 5000);
  }

  async _saveYoutubePosition() {
    if (!this._ytPlayer || typeof this._ytPlayer.getCurrentTime !== 'function') return;
    if (!this._readSourceInfo || this._readSourceInfo.type !== 'youtube') return;
    const url = this._readSourceInfo.youtubeUrl;
    if (!url) return;
    const position = this._ytPlayer.getCurrentTime();
    try {
      await window.electronAPI.vocabLibUpdatePosition(url, position);
    } catch (e) {
      // silently fail
    }
  }

  _resetReadPage() {
    this._stopYoutubeSync();
    document.getElementById('readerTranslatePopup').style.display = 'none';
    this._readSourceInfo = null;

    document.getElementById('readTextInput').value = '';
    const textPage = document.getElementById('read-page-text');
    textPage.querySelector('.read-page-input').style.display = '';
    document.getElementById('readCollapsedBarText').style.display = 'none';
    document.getElementById('readContentAreaText').style.display = 'none';
    document.getElementById('readTextView').innerHTML = '';

    document.getElementById('readYoutubeInput').value = '';
    const ytPage = document.getElementById('read-page-youtube');
    ytPage.querySelector('.read-page-input').style.display = '';
    document.getElementById('readCollapsedBarYoutube').style.display = 'none';
    document.getElementById('readYoutubeArea').style.display = 'none';
    document.getElementById('ytLangBar').style.display = 'none';
    document.getElementById('readYoutubePlayer').innerHTML = '';
    document.getElementById('readYoutubePlayer').style.height = '45%';
    document.getElementById('readYoutubeSubtitles').innerHTML = '';
    document.getElementById('ytWordsList').innerHTML = '';
    document.getElementById('ytSubtitlePanel').style.flexBasis = '50%';
    document.getElementById('ytSubtitlePanel').style.flexGrow = '0';

    this._readPdfFile = null;
    this._readPdfPath = null;
    readerMode.reset();
    const dropzone = document.getElementById('readPdfDropzone');
    dropzone.classList.remove('read-dropzone-loaded');
    dropzone.querySelector('.read-dropzone-text').textContent = 'Drop PDF here or click to browse';
    document.getElementById('readPdfFileInput').value = '';
    document.getElementById('btnReadPdf').disabled = true;
    const pdfPage = document.getElementById('read-page-pdf');
    pdfPage.querySelector('.read-page-input').style.display = '';
    document.getElementById('readCollapsedBarPdf').style.display = 'none';
    document.getElementById('readContentAreaPdf').style.display = 'none';
    document.getElementById('pdfViewer').style.display = '';
    document.getElementById('readerLangBar').style.display = 'none';
    document.getElementById('pdfText').innerHTML = '';
    const tl = document.getElementById('pdfTextLayer');
    if (tl) { tl.innerHTML = ''; tl.style.display = ''; }
    document.getElementById('pdfText').style.display = 'none';
    document.getElementById('readTextViewPdf').innerHTML = '';
    document.getElementById('readTextViewPdf').style.display = 'none';
    document.getElementById('pdfLibrary').style.display = '';
  }
}

const app = new App();

document.addEventListener('DOMContentLoaded', () => app.init());
