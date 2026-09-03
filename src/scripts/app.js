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
    this._readAloudMode = false;

    this._pdfDirStack = [];
    this._pdfThumbCache = new Map();
    this._pdfThumbQueue = [];
    this._pdfThumbActive = 0;
    this._pdfThumbMaxConcurrent = 3;

    this._pdfTabs = [];
    this._pdfActiveTab = -1;
    this._pdfSidebarWords = [];
    this._translationSidebarVisible = false;

    this.translationPopup = new TranslationPopup();
    this.translationPopup.onSave = () => {
      if (this._readSourceInfo && this._readSourceInfo.type === 'youtube') {
        this._renderYoutubeSavedWords();
      }
      if (this._readCurrentPage === 'pdf') {
        this._loadPdfSidebarWords();
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

    this.translationPopup.setVoice(appStore.data.ttsVoice != null ? appStore.data.ttsVoice : 0);
    this._updateVoiceUi();

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
    } else {
      this._showReadHome();
    }

    modesManager.init();
    alphabetPage.init();
    textPractice.open();

    this._updateSidebar();
    this._renderLetterStrip();

    await this._restorePdfTabs();
  }

  _bindEvents() {
    document.getElementById('btnMenu').addEventListener('click', () => this._toggleSidebar());
    document.getElementById('btnSidebarClose').addEventListener('click', () => this._toggleSidebar());
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
      this._showVocabLib('youtube');
    });
    document.getElementById('sideVocabLibRead').addEventListener('click', () => {
      this._closeSidebar();
      this._showVocabLib('youtube');
    });
    document.getElementById('sideVocabBooks').addEventListener('click', () => {
      this._closeSidebar();
      this._showVocabLib('pdf');
    });
    document.getElementById('sideVocabBooksRead').addEventListener('click', () => {
      this._closeSidebar();
      this._showVocabLib('pdf');
    });
    document.getElementById('sidePdfViewer').addEventListener('click', () => this._pdfShowSidebarView('viewer'));
    document.getElementById('sidePdfRecent').addEventListener('click', () => this._pdfShowSidebarView('recent'));
    document.getElementById('sidePdfPinned').addEventListener('click', () => this._pdfShowSidebarView('pinned'));
    document.getElementById('sidePdfLast').addEventListener('click', () => this._pdfShowSidebarView('last'));

    document.getElementById('readCardWords').addEventListener('click', () => {
      if (this.words.length > 0) this._showLearnScreen();
      else this._showImportScreen();
    });

    document.getElementById('btnLearnBack').addEventListener('click', () => {
      this._showReadHome();
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
    document.getElementById('btnImportBack').addEventListener('click', () => this._importBack());
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
    document.querySelectorAll('#btnVocabSwitch .vocab-switch-label').forEach((label) => {
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        const vocab = label.classList.contains('b2') ? 'b2' : label.classList.contains('c1') ? 'c1' : 'verb';
        this._switchVocabulary(vocab);
      });
    });

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

    const screenObserver = new MutationObserver(() => this._updateSidebarVisibility());
    document.querySelectorAll('.screen').forEach((s) => {
      screenObserver.observe(s, { attributes: true, attributeFilter: ['class'] });
    });

    this._bindReadPageEvents();
    this._populateReaderLangSelects();
    this._populateReadAloudLang();

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
        if (readerMode._readAloudActive) {
          readerMode.readAloudPause();
          this._updateReadAloudPlayBtn(false);
          return;
        }
        if (this._readerEditMode) {
          this._setReaderEditMode(false);
          return;
        }
        if (this._readerSettingsMode) {
          this._setReaderSettingsMode(false);
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
        const sidebarEl = document.getElementById('sidebar');
        if (document.body.classList.contains('pdf-rail')) {
          if (!sidebarEl.classList.contains('collapsed')) {
            this._toggleSidebar();
            return;
          }
        } else if (sidebarEl.classList.contains('open')) {
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
        if (activeScreen.id === 'screen-reader') {
          if (this._readCurrentPage) {
            this._backToReadHome();
          } else {
            if (this.words.length > 0) this._showLearnScreen();
            else this._showImportScreen();
          }
          return;
        }
        if (activeScreen.id === 'screen-import') {
          if (document.getElementById('btnImportBack').style.visibility !== 'hidden') {
            this._importBack();
          }
          return;
        }
        if (activeScreen.id === 'screen-words') {
          this._showReadHome();
          return;
        }
        if (activeScreen.id === 'screen-vocablib') {
          if (vocabLibrary._view === 'dict') {
            vocabLibrary._handleBack();
          } else {
            this._showReadHome();
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
      } else if (activeScreen.id === 'screen-reader') {
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

  _showReadHome() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-reader').classList.add('active');
    document.querySelector('.learn-content').style.display = 'none';
    document.getElementById('cardArea').style.display = 'none';
    document.getElementById('listView').style.display = 'none';
    this._backToReadHome();
    this._updateSidebarContent('read');
  }

  _updateSidebarContent(which) {
    document.getElementById('sidebarLearnContent').style.display = which === 'learn' ? '' : 'none';
    document.getElementById('sidebarReadContent').style.display = which === 'read' ? '' : 'none';
  }

  _updateSidebarVisibility() {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;
    const id = activeScreen.id;
    const sidebarAllowed = (id === 'screen-learn' || id === 'screen-reader');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (document.body.classList.contains('pdf-rail') && id !== 'screen-reader') {
      if (this._pdfSaveScrollTimer) clearTimeout(this._pdfSaveScrollTimer);
      this._pdfSaveScroll();
      this._deactivatePdfRail();
    }
    if (!sidebarAllowed) {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      sidebar.style.display = 'none';
      overlay.style.display = 'none';
    } else {
      sidebar.style.display = '';
      overlay.style.display = '';
    }
  }

  _showWordsPage() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-words').classList.add('active');
    this.wordsPage.show();
  }

  _showVocabLib(mode) {
    vocabLibrary.setMode(mode || 'youtube');
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-vocablib').classList.add('active');
    vocabLibrary.show();
  }

  async _switchVocabulary(target) {
    const cur = appStore.data.vocabulary;
    if (target === cur) return;
    appStore.setCurrentIndex(this.currentIndex);
    await appStore.switchVocabulary(target);
    this.words = appStore.getAllWords();
    this.currentIndex = appStore.getCurrentIndex();
    this.currentFileName = appStore.data.currentFileName;
    this.undoStack = [];
    this.sessionHistory = [];
    this.filterLetter = null;
    this._buildQueue();
    this._showCurrentCard();
    this._updateSidebar();
    this._renderLetterStrip();
    document.getElementById('btnVocabSwitch').setAttribute('data-vocab', target);
  }

  _toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (document.body.classList.contains('pdf-rail')) {
      const collapsed = sidebar.classList.toggle('collapsed');
      document.body.classList.toggle('pdf-rail-collapsed', collapsed);
      if (!collapsed) this._updateSidebar();
      return;
    }
    const isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
    if (!isOpen) this._updateSidebar();
  }

  _closeSidebar() {
    if (document.body.classList.contains('pdf-rail')) {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        document.body.classList.add('pdf-rail-collapsed');
      }
      return;
    }
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }

  _activatePdfRail() {
    this._pdfRailActivatedAt = performance.now();
    document.body.classList.add('pdf-rail', 'pdf-rail-collapsed');
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    sidebar.classList.add('collapsed');
    document.getElementById('sidebarOverlay').classList.remove('open');
    const btn = document.getElementById('btnSidebarClose');
    if (btn) btn.style.display = 'none';
    this._updateSidebar();
  }

  _pdfRailSettled() {
    if (!document.body.classList.contains('pdf-rail')) return Promise.resolve();
    const elapsed = performance.now() - (this._pdfRailActivatedAt || 0);
    const wait = Math.max(0, 360 - elapsed);
    if (wait <= 0) return Promise.resolve();
    return new Promise((r) => setTimeout(r, wait));
  }

  _deactivatePdfRail() {
    document.body.classList.remove('pdf-rail', 'pdf-rail-collapsed');
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('collapsed', 'open');
    document.getElementById('sidebarOverlay').classList.remove('open');
    const btn = document.getElementById('btnSidebarClose');
    if (btn) {
      btn.style.display = '';
      btn.innerHTML = '&times;';
      btn.title = 'Close sidebar';
    }
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
    this._showReadHome();
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
    const active = document.querySelector('.screen.active');
    this._importReturnScreen = active && active.id !== 'screen-import' ? active.id : null;
    document.getElementById('btnImportBack').style.visibility = this._importReturnScreen ? 'visible' : 'hidden';
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-import').classList.add('active');
    this.filterLetter = null;
  }

  _importBack() {
    const prev = this._importReturnScreen;
    this._importReturnScreen = null;
    switch (prev) {
      case 'screen-words':
        this._showWordsPage();
        break;
      case 'screen-vocablib':
        this._showVocabLib();
        break;
      case 'screen-stats':
        this._showStats();
        break;
      case 'screen-daily-history':
        this._showDailyHistory();
        break;
      default:
        if (this.words.length > 0) this._showLearnScreen();
        else this._showReadHome();
        break;
    }
  }

  _showLearnScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-learn').classList.add('active');
    this._updateSidebarContent('learn');

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
}

Object.assign(App.prototype, __appMixinReader);
Object.assign(App.prototype, __appMixinYoutube);
Object.assign(App.prototype, __appMixinSettings);
Object.assign(App.prototype, __appMixinBindings);

const app = new App();

document.addEventListener('DOMContentLoaded', () => app.init());
