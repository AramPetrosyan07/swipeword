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
    textPractice.init();

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
      this._showVocabLib();
    });
    document.getElementById('sideVocabLibRead').addEventListener('click', () => {
      this._closeSidebar();
      this._showVocabLib();
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

    const screenObserver = new MutationObserver(() => this._updateSidebarVisibility());
    document.querySelectorAll('.screen').forEach((s) => {
      screenObserver.observe(s, { attributes: true, attributeFilter: ['class'] });
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

  _setReaderSettingsMode(on) {
    this._readerSettingsMode = on;
    document.getElementById('screen-reader').classList.toggle('reader-settings-mode', on);
    if (on) this._applyReaderLangPrefs();
  }

  _setReaderEditMode(on) {
    this._readerEditMode = on;
  }

  _setThemeColorsMode(on) {
    this._themeColorsMode = on;
    document.getElementById('screen-reader').classList.toggle('theme-colors-mode', on);
    if (on) this._loadThemeColors();
  }

  _loadThemeColors() {
    const light = themeManager.lightColors || {};
    const dark = themeManager.darkColors || {};
    document.getElementById('themeLightBg').value = light.bg || '#f5f5f5';
    document.getElementById('themeLightText').value = light.text || '#1a1a2e';
    document.getElementById('themeLightPdfBg').value = light.pdfBg || '#ffffff';
    document.getElementById('themeLightPdfText').value = light.pdfText || '#00000000';
    document.getElementById('themeLightSelect').value = light.select || '#6c63ff';
    document.getElementById('themeLightPdfSelect').value = light.pdfSelect || '#6c63ff38';
    document.getElementById('themeDarkBg').value = dark.bg || '#1a1a2e';
    document.getElementById('themeDarkText').value = dark.text || '#e0e0e0';
    document.getElementById('themeDarkPdfBg').value = dark.pdfBg || '#16213e';
    document.getElementById('themeDarkPdfText').value = dark.pdfText || '#ffffff';
    document.getElementById('themeDarkSelect').value = dark.select || '#6c63ff';
    document.getElementById('themeDarkPdfSelect').value = dark.pdfSelect || '#6c63ff6b';
  }

  _applyThemeColors() {
    const light = {
      bg: document.getElementById('themeLightBg').value,
      text: document.getElementById('themeLightText').value,
      pdfBg: document.getElementById('themeLightPdfBg').value,
      pdfText: document.getElementById('themeLightPdfText').value,
      select: document.getElementById('themeLightSelect').value,
      pdfSelect: document.getElementById('themeLightPdfSelect').value,
    };
    const dark = {
      bg: document.getElementById('themeDarkBg').value,
      text: document.getElementById('themeDarkText').value,
      pdfBg: document.getElementById('themeDarkPdfBg').value,
      pdfText: document.getElementById('themeDarkPdfText').value,
      select: document.getElementById('themeDarkSelect').value,
      pdfSelect: document.getElementById('themeDarkPdfSelect').value,
    };
    themeManager.setCustomColors(light, dark);
  }

  _resetThemeColors() {
    themeManager.resetCustomColors();
    this._loadThemeColors();
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
    this._readerSettingsMode = false;
    this._pdfViewMode = appStore.data.pdfViewMode || 'viewer';
    this._translationSidebarVisible = !!(appStore.data && appStore.data.translationSidebar);

    document.querySelectorAll('.read-home-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (card.dataset.mode === 'words') return;
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

    document.getElementById('btnTranslationSidebar').addEventListener('click', () => {
      this._toggleTranslationSidebar();
    });

    document.getElementById('btnThemeColors').addEventListener('click', () => {
      this._setThemeColorsMode(true);
    });

    document.getElementById('btnThemeColorsClose').addEventListener('click', () => {
      this._setThemeColorsMode(false);
    });

    document.getElementById('btnThemeColorsReset').addEventListener('click', () => {
      this._resetThemeColors();
    });

    document.querySelectorAll('#themeColorsBar input[type="color"]').forEach((input) => {
      input.addEventListener('change', () => this._applyThemeColors());
    });

    this._initSidebarResizer();
    this._applyTranslationSidebar(false);

    const dropzone = document.getElementById('readPdfDropzone');
    const fileInput = document.getElementById('readPdfFileInput');
    dropzone.addEventListener('click', async () => {
      const res = await window.electronAPI.openPDFDialog();
      if (!res) return;
      this._setPdfPath(res.filePath, res.fileName);
    });
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (!file || file.type !== 'application/pdf') return;
      if (file.path) this._setPdfPath(file.path, file.name);
      else this._setPdfFile(file);
    });
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.path) this._setPdfPath(file.path, file.name);
      else this._setPdfFile(file);
    });
    document.getElementById('btnReadPdf').addEventListener('click', () => {
      this._loadPdfContent();
    });
    document.getElementById('btnPdfChooseFolder').addEventListener('click', () => {
      this._pdfChooseFolder();
    });

    document.getElementById('pdfPrevPage').addEventListener('click', () => {
      readerMode.prevPage();
    });
    document.getElementById('pdfNextPage').addEventListener('click', () => {
      readerMode.nextPage();
    });
    document.getElementById('pdfZoomIn5').addEventListener('click', () => {
      readerMode.zoomIn5();
    });
    document.getElementById('pdfZoomOut5').addEventListener('click', () => {
      readerMode.zoomOut5();
    });
    document.getElementById('pdfViewerScroll').addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = 1 - e.deltaY * 0.001;
        readerMode.zoomBy(factor);
      }
    });
    document.getElementById('pdfViewerScroll').addEventListener('scroll', () => {
      readerMode.onScroll();
      this._pdfSaveScrollDebounced();
    });

    document.getElementById('btnReadYoutube').addEventListener('click', () => {
      this._loadYoutubeContent();
    });
    document.getElementById('btnReadNewYoutube').addEventListener('click', () => {
      this._resetReadPage();
    });
    document.getElementById('btnReadNewToolbar').addEventListener('click', () => {
      this._resetReadPage();
    });
    document.getElementById('btnReaderLangBarToggle').addEventListener('click', () => {
      const bar = document.getElementById('ytLangBar');
      const btn = document.getElementById('btnReaderLangBarToggle');
      const collapsed = bar.classList.toggle('yt-lang-collapsed');
      btn.innerHTML = collapsed ? '&#9660;' : '&#9650;';
      btn.title = collapsed ? 'Show settings bar' : 'Hide settings bar';
    });

    document.getElementById('btnReaderLangBtn').addEventListener('click', () => {
      this._setReaderSettingsMode(true);
    });
    document.getElementById('btnReaderLangClose').addEventListener('click', () => {
      this._setReaderSettingsMode(false);
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

    const settingsBtn = document.getElementById('btnYtSettings');
    const settingsDropdown = document.getElementById('ytSettingsDropdown');
    const subFontInput = document.getElementById('ytSubFontSize');
    const subGapInput = document.getElementById('ytSubLineGap');
    const subtitlesEl = document.getElementById('readYoutubeSubtitles');

    const applyYtSubSettings = () => {
      const sub = appStore.data.ytSubtitle || {};
      const fontSize = sub.fontSize || 18;
      const lineGap = sub.lineGap || 8;
      subFontInput.value = fontSize;
      subGapInput.value = lineGap;
      subtitlesEl.style.setProperty('--yt-sub-font-size', fontSize + 'px');
      subtitlesEl.style.setProperty('--yt-sub-gap', lineGap + 'px');
    };

    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsDropdown.style.display = settingsDropdown.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', (e) => {
      if (settingsDropdown.style.display === 'flex' && !settingsDropdown.contains(e.target) && e.target !== settingsBtn) {
        settingsDropdown.style.display = 'none';
      }
    });
    subFontInput.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      if (v >= 10 && v <= 40) {
        appStore.data.ytSubtitle = appStore.data.ytSubtitle || {};
        appStore.data.ytSubtitle.fontSize = v;
        subtitlesEl.style.setProperty('--yt-sub-font-size', v + 'px');
      }
    });
    subFontInput.addEventListener('change', () => appStore.save());
    subGapInput.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      if (v >= 0 && v <= 30) {
        appStore.data.ytSubtitle = appStore.data.ytSubtitle || {};
        appStore.data.ytSubtitle.lineGap = v;
        subtitlesEl.style.setProperty('--yt-sub-gap', v + 'px');
      }
    });
    subGapInput.addEventListener('change', () => appStore.save());
    applyYtSubSettings();

    const voiceBtn = document.getElementById('btnYtVoice');
    const voiceMenu = document.getElementById('ytVoiceMenu');
    voiceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      voiceMenu.style.display = voiceMenu.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', (e) => {
      if (voiceMenu.style.display === 'flex' && !voiceMenu.contains(e.target) && e.target !== voiceBtn) {
        voiceMenu.style.display = 'none';
      }
    });
    voiceMenu.querySelectorAll('.yt-voice-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const voice = parseInt(opt.dataset.voice, 10);
        appStore.data.ttsVoice = voice;
        appStore.save();
        this.translationPopup.setVoice(voice);
        this._updateVoiceUi();
        voiceMenu.style.display = 'none';
      });
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

    document.getElementById('btnReaderBack').style.display = '';
    document.getElementById('btnReaderMenu').style.display = '';
    this._updateTranslationSidebarBtnVisibility();

    if (mode === 'pdf') {
      this._activatePdfRail();
      this._showPdfView(this._pdfViewMode);
    } else {
      this._deactivatePdfRail();
    }
  }

  _setPdfViewMode(view) {
    this._pdfViewMode = view;
    if (appStore.data) {
      appStore.data.pdfViewMode = view;
      appStore.save();
    }
    this._syncPdfSidebarButtons();
  }

  _showPdfView(view) {
    if (view === 'recent') this._pdfShowRecents();
    else if (view === 'pinned') this._pdfShowPinned();
    else if (view === 'last') this._pdfOpenLast();
    else this._pdfShowViewer();
  }

  _backToReadHome() {
    if (this._pdfSaveScrollTimer) clearTimeout(this._pdfSaveScrollTimer);
    this._pdfSaveScroll();
    this._resetReadPage();
    this._deactivatePdfRail();
    document.getElementById('readHome').style.display = '';
    document.querySelectorAll('.read-page').forEach((p) => p.classList.remove('active'));
    document.getElementById('btnReaderBack').style.display = 'none';
    document.getElementById('btnReaderMenu').style.display = '';
    this._readCurrentPage = null;
    this._updateTranslationSidebarBtnVisibility();
  }

  _bindPdfLayers(sourceInfo) {
    const layers = document.querySelectorAll('#pdfPages .pdf-scroll-layer');
    layers.forEach((layer) => {
      this.translationPopup.bindToContainer(layer, sourceInfo);
    });
  }

  _setPdfFile(file) {
    this._readPdfFile = file;
    this._readPdfPath = null;
    const dropzone = document.getElementById('readPdfDropzone');
    dropzone.classList.add('read-dropzone-loaded');
    dropzone.querySelector('.read-dropzone-text').textContent = file.name;
    document.getElementById('btnReadPdf').disabled = false;
  }

  _setPdfPath(path, name) {
    this._readPdfFile = null;
    this._readPdfPath = path;
    this._addPdfRecent((name || path).replace(/\.pdf$/i, ''), path);
    const dropzone = document.getElementById('readPdfDropzone');
    dropzone.classList.add('read-dropzone-loaded');
    dropzone.querySelector('.read-dropzone-text').textContent = name || path;
    document.getElementById('btnReadPdf').disabled = false;
  }

  async _loadPdfContent() {
    if (!this._readPdfFile && !this._readPdfPath) return;

    if (this._readPdfPath) {
      const existing = this._pdfTabs.findIndex((t) => t.path === this._readPdfPath);
      if (existing !== -1) {
        this._readPdfPath = null;
        await this._showPdfTab(existing);
        return;
      }
    }

    let data;
    let title;
    let path = this._readPdfPath;
    if (this._readPdfFile) {
      const arrayBuffer = await this._readPdfFile.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
      title = this._readPdfFile.name.replace(/\.pdf$/i, '');
      this._readPdfFile = null;
    } else if (path) {
      const buf = await window.electronAPI.readFile(path);
      if (!buf) {
        this._showReadContent('pdf-error', 'Error', 'Failed to read PDF file.');
        return;
      }
      data = new Uint8Array(buf);
      title = path.replace(/.*[/\\]/, '').replace(/\.pdf$/i, '');
      this._readPdfPath = null;
    }

    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf/pdf.worker.min.js';
      const doc = await pdfjsLib.getDocument({ data }).promise;
      const savedPos = (appStore.data.pdfScrollPositions || {})[path || title];
      this._pdfTabs.push({ path, name: title, doc, scrollTop: savedPos || 0 });
      this._pdfActiveTab = this._pdfTabs.length - 1;
      this._pdfPersistOpenTabs();
      await this._showPdfTab(this._pdfActiveTab);
    } catch (e) {
      console.error('PDF load error:', e);
      document.getElementById('readContentAreaPdf').style.display = 'none';
      document.getElementById('readTextViewPdf').style.display = 'block';
      document.getElementById('readTextViewPdf').innerHTML = 'Failed to load PDF: ' + e.message;
    }
  }

  async _showPdfTab(index) {
    const tab = this._pdfTabs[index];
    if (!tab) return;
    const scrollContainer = document.getElementById('pdfViewerScroll');
    const prev = this._pdfTabs[this._pdfActiveTab];
    if (prev && prev !== tab && scrollContainer) {
      prev.scrollTop = scrollContainer.scrollTop;
      const prevKey = prev.path || prev.name;
      if (prevKey) {
        if (!appStore.data.pdfScrollPositions) appStore.data.pdfScrollPositions = {};
        appStore.data.pdfScrollPositions[prevKey] = prev.scrollTop;
        appStore.save();
      }
    }
    this._pdfActiveTab = index;
    appStore.data.pdfActiveTab = tab.path || tab.name;
    this._setPdfViewMode('last');
    this._renderPdfTabs();
    document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
    document.getElementById('pdfLibrary').style.display = 'none';
    document.getElementById('pdfTabsBar').style.display = 'flex';
    document.getElementById('readContentAreaPdf').style.display = 'block';
    document.getElementById('pdfSplit').style.display = '';
    document.getElementById('pdfViewer').style.display = 'flex';
    document.getElementById('readTextViewPdf').style.display = 'none';
    document.getElementById('readTextViewPdf').innerHTML = '';
    this._applyReaderLangPrefs();
    await this._pdfRailSettled();
    await readerMode.loadPdfDoc(tab.doc);
    if (scrollContainer && tab.scrollTop > 0) {
      scrollContainer.scrollTop = tab.scrollTop;
      readerMode.onScroll(true);
    }
    const sourceInfo = { type: 'pdf', title: tab.name, id: Date.now().toString(36) };
    this._readSourceInfo = sourceInfo;
    this._bindPdfLayers(sourceInfo);
    this._updateTranslationSidebarBtnVisibility();
    this._loadPdfSidebarWords();
  }

  _renderPdfTabs() {
    const strip = document.getElementById('pdfTabsStrip');
    const bar = document.getElementById('pdfTabsBar');
    if (!strip || !bar) return;
    strip.innerHTML = '';
    this._pdfTabs.forEach((tab, i) => {
      const el = document.createElement('div');
      el.className = 'pdf-tab' + (i === this._pdfActiveTab ? ' active' : '');
      const label = document.createElement('span');
      label.className = 'pdf-tab-name';
      label.textContent = tab.name;
      label.title = tab.name;
      const close = document.createElement('button');
      close.className = 'pdf-tab-close';
      close.textContent = '\u00d7';
      close.title = 'Close tab';
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closePdfTab(i);
      });
      el.appendChild(label);
      el.appendChild(close);
      el.addEventListener('click', () => {
        if (i !== this._pdfActiveTab) this._showPdfTab(i);
      });
      strip.appendChild(el);
    });
    bar.style.display = this._pdfTabs.length ? 'flex' : 'none';
  }

  async _closePdfTab(index) {
    const tab = this._pdfTabs[index];
    if (!tab) return;
    const scrollContainer = document.getElementById('pdfViewerScroll');
    if (index === this._pdfActiveTab && scrollContainer) {
      const key = tab.path || tab.name;
      if (key) {
        if (!appStore.data.pdfScrollPositions) appStore.data.pdfScrollPositions = {};
        appStore.data.pdfScrollPositions[key] = scrollContainer.scrollTop;
        appStore.save();
      }
    }
    if (tab.doc) {
      try { tab.doc.destroy(); } catch (e) {}
    }
    const wasActive = index === this._pdfActiveTab;
    this._pdfTabs.splice(index, 1);
    this._pdfPersistOpenTabs();
    if (this._pdfTabs.length === 0) {
      this._pdfActiveTab = -1;
      appStore.data.pdfActiveTab = null;
      this._readSourceInfo = null;
      this._pdfSidebarWords = [];
      this._translationSidebarRender();
      readerMode.reset();
      const bar = document.getElementById('pdfTabsBar');
      const strip = document.getElementById('pdfTabsStrip');
      if (bar) bar.style.display = 'none';
      if (strip) strip.innerHTML = '';
      document.getElementById('readContentAreaPdf').style.display = 'none';
      document.getElementById('readTextViewPdf').style.display = 'none';
      document.getElementById('readTextViewPdf').innerHTML = '';
      document.getElementById('pdfViewer').style.display = 'flex';
      document.getElementById('pdfLibrary').style.display = '';
      this._pdfShowViewer();
      return;
    }
    if (wasActive) {
      this._pdfActiveTab = -1;
      await this._showPdfTab(Math.min(index, this._pdfTabs.length - 1));
    } else {
      if (index < this._pdfActiveTab) this._pdfActiveTab--;
      this._renderPdfTabs();
    }
  }

  async _loadPdfFromPath(filePath) {
    this._readPdfPath = filePath;
    await this._loadPdfContent();
  }

  _pdfOpenPath(path) {
    this._addPdfRecent(path.replace(/.*[/\\]/, '').replace(/\.pdf$/i, ''), path);
    this._resetReadPage();
    this._setPdfViewMode('last');
    this._readPdfPath = path;
    document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
    this._loadPdfContent();
  }

  _addPdfRecent(name, path) {
    if (!appStore.data.pdfRecents) appStore.data.pdfRecents = [];
    const recents = appStore.data.pdfRecents;
    const idx = recents.findIndex((r) => r.path === path);
    if (idx !== -1) recents.splice(idx, 1);
    recents.unshift({ name, path, date: new Date().toISOString().slice(0, 10) });
    if (recents.length > 20) recents.length = 20;
    appStore.save();
  }

  _pdfSaveScrollDebounced() {
    if (this._pdfSaveScrollTimer) clearTimeout(this._pdfSaveScrollTimer);
    this._pdfSaveScrollTimer = setTimeout(() => this._pdfSaveScroll(), 300);
  }

  _pdfSaveScroll() {
    const tab = this._pdfTabs[this._pdfActiveTab];
    const scrollContainer = document.getElementById('pdfViewerScroll');
    if (!tab || !scrollContainer) return;
    tab.scrollTop = scrollContainer.scrollTop;
    const key = tab.path || tab.name;
    if (!key) return;
    if (!appStore.data.pdfScrollPositions) appStore.data.pdfScrollPositions = {};
    appStore.data.pdfScrollPositions[key] = tab.scrollTop;
    appStore.save();
  }

  _updateTranslationSidebarBtnVisibility() {
    const btn = document.getElementById('btnTranslationSidebar');
    if (btn) btn.style.display = this._readCurrentPage === 'pdf' ? '' : 'none';
  }

  _toggleTranslationSidebar() {
    this._translationSidebarVisible = !this._translationSidebarVisible;
    if (appStore.data) {
      appStore.data.translationSidebar = this._translationSidebarVisible;
      appStore.save();
    }
    this._applyTranslationSidebar(true);
  }

  _applyTranslationSidebar(refit) {
    const sidebar = document.getElementById('translationSidebar');
    const btn = document.getElementById('btnTranslationSidebar');
    if (sidebar) sidebar.style.display = this._translationSidebarVisible ? 'flex' : 'none';
    if (btn) btn.classList.toggle('active', this._translationSidebarVisible);
    if (refit && this._readCurrentPage === 'pdf') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this._readCurrentPage === 'pdf') readerMode.fitToWidth();
        });
      });
    }
  }

  async _loadPdfSidebarWords() {
    const tab = this._pdfTabs[this._pdfActiveTab];
    if (!tab) {
      this._pdfSidebarWords = [];
      this._translationSidebarRender();
      return;
    }
    try {
      const allWords = await window.electronAPI.dictionaryLoad();
      this._pdfSidebarWords = (allWords || [])
        .filter((w) => w.sourceType === 'pdf' && w.sourceTitle === tab.name)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      this._pdfSidebarWords = [];
    }
    this._translationSidebarRender();
  }

  _translationSidebarRender() {
    const listEl = document.getElementById('translationSidebarList');
    const countEl = document.getElementById('translationSidebarCount');
    const seen = new Set();
    const words = [];
    for (const w of this._pdfSidebarWords || []) {
      const key = (w.word || '').toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      words.push(w);
    }
    if (countEl) countEl.textContent = String(words.length);
    if (!listEl) return;
    if (words.length === 0) {
      listEl.innerHTML = '<div class="translation-sidebar-empty">No saved words yet.<br>Select a word on the PDF and save it to see it here.</div>';
      return;
    }
    listEl.innerHTML = words.map((w) => {
      const trans = w.translation || '';
      return '<div class="translation-sidebar-item" data-id="' + this._escapeHtml(w.id) + '">' +
        '<div class="translation-sidebar-word">' + this._escapeHtml(w.word) + '</div>' +
        (trans ? '<div class="translation-sidebar-trans">' + this._escapeHtml(trans) + '</div>' : '') +
        '<button class="translation-sidebar-delete" title="Remove">&#10007;</button>' +
        '</div>';
    }).join('');

    listEl.querySelectorAll('.translation-sidebar-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.translation-sidebar-item');
        if (!item) return;
        const id = item.dataset.id;
        await this._removeSidebarWord(id);
      });
    });
  }

  async _removeSidebarWord(id) {
    try {
      await window.electronAPI.dictionaryRemove(id);
      this._pdfSidebarWords = this._pdfSidebarWords.filter(w => w.id !== id);
      this._translationSidebarRender();
    } catch (e) {
      console.error('Failed to remove word:', e);
    }
  }

  _setSidebarWidth(width) {
    const sidebar = document.getElementById('translationSidebar');
    if (sidebar) sidebar.style.width = width + 'px';
  }

  _initSidebarResizer() {
    const resizer = document.getElementById('translationSidebarResizer');
    if (!resizer) return;
    let startX = 0;
    let startWidth = 260;
    let captured = false;
    resizer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = document.getElementById('translationSidebar').offsetWidth;
      resizer.setPointerCapture(e.pointerId);
      captured = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('pointermove', (e) => {
      if (!captured) return;
      const dx = startX - e.clientX;
      const newWidth = Math.max(180, Math.min(500, startWidth + dx));
      this._setSidebarWidth(newWidth);
    });
    document.addEventListener('pointerup', (e) => {
      if (!captured) return;
      if (e.target !== resizer && !resizer.hasPointerCapture(e.pointerId)) return;
      resizer.releasePointerCapture(e.pointerId);
      captured = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
    resizer.addEventListener('pointercancel', () => {
      if (!captured) return;
      resizer.releasePointerCapture();
      captured = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  _pdfPersistOpenTabs() {
    if (!appStore.data.pdfOpenTabs) appStore.data.pdfOpenTabs = [];
    const open = appStore.data.pdfOpenTabs;
    open.length = 0;
    this._pdfTabs.forEach((t) => {
      if (t.path) open.push({ path: t.path, name: t.name });
    });
    appStore.save();
  }

  _pdfRemoveOpenTab(path) {
    const open = appStore.data.pdfOpenTabs;
    if (!open) return;
    const idx = open.findIndex((e) => e.path === path);
    if (idx !== -1) {
      open.splice(idx, 1);
      appStore.save();
    }
  }

  async _restorePdfTabs() {
    const saved = appStore.data.pdfOpenTabs || [];
    if (!saved.length) return;
    const activeKey = appStore.data.pdfActiveTab;
    for (const entry of saved) {
      if (!entry.path) continue;
      if (this._pdfTabs.some((t) => t.path === entry.path)) continue;
      const buf = await window.electronAPI.readFile(entry.path);
      if (!buf) {
        this._pdfRemoveOpenTab(entry.path);
        continue;
      }
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf/pdf.worker.min.js';
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        const savedPos = (appStore.data.pdfScrollPositions || {})[entry.path];
        this._pdfTabs.push({ path: entry.path, name: entry.name, doc, scrollTop: savedPos || 0 });
      } catch (e) {
        console.error('PDF restore error:', e);
        this._pdfRemoveOpenTab(entry.path);
      }
    }
    if (this._pdfTabs.length > 0) {
      let idx = -1;
      if (activeKey) idx = this._pdfTabs.findIndex((t) => (t.path || t.name) === activeKey);
      if (idx === -1) idx = this._pdfTabs.length - 1;
      this._pdfActiveTab = idx;
      appStore.data.pdfActiveTab = activeKey || this._pdfTabs[idx].path || this._pdfTabs[idx].name;
      this._pdfPersistOpenTabs();
      this._renderPdfTabs();
    }
  }

  async _togglePinFolder(path) {
    if (!appStore.data.pdfPinnedFolders) appStore.data.pdfPinnedFolders = [];
    const pinned = appStore.data.pdfPinnedFolders;
    const idx = pinned.indexOf(path);
    if (idx === -1) pinned.push(path);
    else pinned.splice(idx, 1);
    await appStore.save();
  }

  _pdfShowSidebarView(view) {
    if (!document.body.classList.contains('pdf-rail')) this._closeSidebar();
    this._setPdfViewMode(view);
    if (document.querySelector('.screen.active') !== document.getElementById('screen-reader')) {
      this._showReadHome();
    }
    if (this._readCurrentPage !== 'pdf') {
      this._openReadPage('pdf');
    } else {
      this._showPdfView(view);
    }
  }

  _pdfOpenLast() {
    if (this._pdfTabs.length > 0) {
      this._showPdfTab(Math.max(0, this._pdfActiveTab));
    } else {
      const page = document.getElementById('read-page-pdf');
      page.querySelector('.read-page-input').style.display = '';
      document.getElementById('pdfLibrary').style.display = 'none';
      document.getElementById('pdfTabsBar').style.display = 'none';
      document.getElementById('readContentAreaPdf').style.display = 'none';
      document.getElementById('pdfViewer').style.display = 'flex';
    }
  }

  _syncPdfSidebarButtons() {
    const map = { viewer: 'sidePdfViewer', recent: 'sidePdfRecent', pinned: 'sidePdfPinned', last: 'sidePdfLast' };
    ['sidePdfViewer', 'sidePdfRecent', 'sidePdfPinned', 'sidePdfLast'].forEach((id) => {
      document.getElementById(id).classList.toggle('active', map[this._pdfViewMode] === id);
    });
  }

  _pdfShowViewer() {
    document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
    document.getElementById('pdfTabsBar').style.display = 'none';
    document.getElementById('readContentAreaPdf').style.display = 'none';
    document.getElementById('pdfLibrary').style.display = '';
    document.getElementById('pdfLibraryTitleText').textContent = 'PDF Library';
    document.getElementById('pdfLibraryTitleText').parentElement.querySelector('.pdf-library-icon').innerHTML = '&#128218;';
    document.getElementById('btnPdfChooseFolder').style.display = '';
    this._scanPdfLibrary();
  }

  _pdfShowRecents() {
    this._pdfShowListMode();
    document.getElementById('pdfLibraryTitleText').textContent = 'Recent Documents';
    document.getElementById('pdfLibraryTitleText').parentElement.querySelector('.pdf-library-icon').innerHTML = '&#9201;';
    document.getElementById('btnPdfChooseFolder').style.display = 'none';
    const recents = appStore.data.pdfRecents || [];
    const listEl = document.getElementById('pdfLibraryList');
    const emptyEl = document.getElementById('pdfLibraryEmpty');
    listEl.innerHTML = '';
    if (recents.length === 0) {
      emptyEl.textContent = 'No recent documents yet. Open a PDF from the library.';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';
    recents.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'pdf-library-item';
      const thumbHtml =
        '<span class="pdf-library-item-thumb">' +
          '<span class="pdf-library-item-thumb-ph">PDF</span>' +
          '<img class="pdf-library-item-thumb-img" alt="" />' +
        '</span>';
      row.innerHTML = thumbHtml +
        '<span class="pdf-library-item-name">' + this._escapeHtml(r.name) + '</span>' +
        '<span class="pdf-library-item-size">' + this._escapeHtml(r.date || 'PDF') + '</span>';
      row.addEventListener('click', () => this._pdfOpenPath(r.path));
      listEl.appendChild(row);

      const imgEl = row.querySelector('.pdf-library-item-thumb-img');
      const key = r.path + '|0';
      if (this._pdfThumbCache.has(key)) {
        imgEl.src = this._pdfThumbCache.get(key);
        imgEl.classList.add('loaded');
      } else {
        this._pdfThumbQueue.push({ path: r.path, mtimeMs: 0, imgEl });
        this._pdfPumpThumbs();
      }
    });
  }

  _pdfShowPinned() {
    this._pdfShowListMode();
    document.getElementById('pdfLibraryTitleText').textContent = 'Pinned Folders';
    document.getElementById('pdfLibraryTitleText').parentElement.querySelector('.pdf-library-icon').innerHTML = '&#128204;';
    document.getElementById('btnPdfChooseFolder').style.display = 'none';
    const pinned = appStore.data.pdfPinnedFolders || [];
    const listEl = document.getElementById('pdfLibraryList');
    const emptyEl = document.getElementById('pdfLibraryEmpty');
    listEl.innerHTML = '';
    if (pinned.length === 0) {
      emptyEl.textContent = 'No pinned folders yet. Pin folders from the PDF library with the &#128204; button.';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';
    pinned.forEach((path) => {
      const label = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path;
      const row = document.createElement('div');
      row.className = 'pdf-library-item pdf-library-folder';
      row.innerHTML =
        '<span class="pdf-library-item-icon">&#128193;</span>' +
        '<span class="pdf-library-item-name">' + this._escapeHtml(label) + '</span>' +
        '<button class="pdf-library-item-pin pinned" title="Unpin folder">&#128204;</button>';
      row.addEventListener('click', (e) => {
        if (e.target.closest('.pdf-library-item-pin')) return;
        this._pdfDirStack = [path];
        this._pdfThumbQueue.length = 0;
        this._setPdfViewMode('viewer');
        this._pdfRenderCurrent();
      });
      row.querySelector('.pdf-library-item-pin').addEventListener('click', async (e) => {
        e.stopPropagation();
        await this._togglePinFolder(path);
        this._pdfShowPinned();
      });
      listEl.appendChild(row);
    });
  }

  _pdfShowListMode() {
    this._readSourceInfo = null;
    document.getElementById('pdfLibrary').style.display = '';
    document.getElementById('readContentAreaPdf').style.display = 'none';
    document.getElementById('pdfViewer').style.display = '';
    document.getElementById('readTextViewPdf').style.display = 'none';
    document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
    document.getElementById('pdfBreadcrumb').style.display = 'none';
    document.getElementById('pdfLibraryNoFolder').style.display = 'none';
    document.getElementById('pdfLibraryLoading').style.display = 'none';
  }

  async _scanPdfLibrary() {
    const savedFolder = appStore.data && appStore.data.pdfFolder;
    if (!savedFolder) {
      this._showPdfLibraryPrompt();
      return;
    }
    this._pdfDirStack = [savedFolder];
    await this._pdfRenderCurrent();
  }

  async _pdfChooseFolder() {
    let folder;
    try {
      folder = await window.electronAPI.chooseFolder();
    } catch (e) {
      console.error('Folder picker failed:', e);
      return;
    }
    if (!folder) return;
    if (appStore.data) {
      appStore.data.pdfFolder = folder;
      await appStore.save();
    }
    this._pdfDirStack = [folder];
    await this._pdfRenderCurrent();
  }

  _showPdfLibraryPrompt() {
    const listEl = document.getElementById('pdfLibraryList');
    const emptyEl = document.getElementById('pdfLibraryEmpty');
    const noFolderEl = document.getElementById('pdfLibraryNoFolder');
    const loadingEl = document.getElementById('pdfLibraryLoading');
    const breadcrumbEl = document.getElementById('pdfBreadcrumb');
    listEl.innerHTML = '';
    emptyEl.style.display = 'none';
    noFolderEl.style.display = '';
    loadingEl.style.display = 'none';
    breadcrumbEl.style.display = 'none';
    this._pdfSyncDropzone();
  }

  _pdfSyncDropzone() {
    const input = document.getElementById('read-page-pdf').querySelector('.read-page-input');
    input.style.display = this._pdfDirStack.length ? 'none' : '';
  }

  async _pdfRenderCurrent() {
    const listEl = document.getElementById('pdfLibraryList');
    const emptyEl = document.getElementById('pdfLibraryEmpty');
    const noFolderEl = document.getElementById('pdfLibraryNoFolder');
    const loadingEl = document.getElementById('pdfLibraryLoading');
    const breadcrumbEl = document.getElementById('pdfBreadcrumb');

    listEl.innerHTML = '';
    emptyEl.style.display = 'none';
    noFolderEl.style.display = 'none';
    loadingEl.style.display = '';

    const currentPath = this._pdfDirStack[this._pdfDirStack.length - 1];

    this._pdfRenderBreadcrumb(breadcrumbEl);

    let items;
    try {
      items = await window.electronAPI.readDir(currentPath);
    } catch (e) {
      items = null;
    }
    loadingEl.style.display = 'none';

    if (!items) {
      noFolderEl.textContent = 'Folder not found. Choose another one.';
      noFolderEl.style.display = '';
      return;
    }

    if (items.length === 0) {
      emptyEl.style.display = '';
      this._pdfSyncDropzone();
      return;
    }

    items.forEach((entry) => this._pdfRenderItem(listEl, entry));
    this._pdfSyncDropzone();
  }

  _pdfRenderBreadcrumb(breadcrumbEl) {
    breadcrumbEl.innerHTML = '';
    if (this._pdfDirStack.length === 0) {
      breadcrumbEl.style.display = 'none';
      return;
    }
    breadcrumbEl.style.display = '';
    this._pdfDirStack.forEach((path, idx) => {
      const isLast = idx === this._pdfDirStack.length - 1;
      const label = idx === 0
        ? (path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path)
        : (path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path);
      if (idx > 0) {
        const sep = document.createElement('span');
        sep.className = 'pdf-library-crumb-sep';
        sep.textContent = '\u203A';
        breadcrumbEl.appendChild(sep);
      }
      const crumb = document.createElement('span');
      crumb.className = 'pdf-library-crumb' + (isLast ? ' current' : '');
      crumb.textContent = label;
      crumb.title = path;
      if (!isLast) {
        crumb.addEventListener('click', () => this._pdfGoTo(idx));
      }
      breadcrumbEl.appendChild(crumb);
    });
  }

  _pdfGoTo(index) {
    this._pdfDirStack = this._pdfDirStack.slice(0, index + 1);
    this._pdfThumbQueue.length = 0;
    this._pdfRenderCurrent();
  }

  _pdfRenderItem(listEl, entry) {
    const row = document.createElement('div');
    const size = this._formatBytes(entry.size);

    if (entry.isDirectory) {
      const pinned = (appStore.data.pdfPinnedFolders || []).includes(entry.path);
      row.className = 'pdf-library-item pdf-library-folder';
      row.innerHTML =
        '<span class="pdf-library-item-icon">&#128193;</span>' +
        '<span class="pdf-library-item-name">' + this._escapeHtml(entry.name) + '</span>' +
        '<button class="pdf-library-item-pin' + (pinned ? ' pinned' : '') + '" title="' + (pinned ? 'Unpin folder' : 'Pin folder') + '">&#128204;</button>' +
        '<span class="pdf-library-item-size">Folder</span>';
      row.addEventListener('click', (e) => {
        if (e.target.closest('.pdf-library-item-pin')) return;
        this._pdfDirStack.push(entry.path);
        this._pdfThumbQueue.length = 0;
        this._pdfRenderCurrent();
      });
      row.querySelector('.pdf-library-item-pin').addEventListener('click', async (e) => {
        e.stopPropagation();
        await this._togglePinFolder(entry.path);
        this._pdfRenderCurrent();
      });
      listEl.appendChild(row);
      return;
    }

    const isPdf = entry.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      row.className = 'pdf-library-item pdf-library-disabled';
      row.innerHTML =
        '<span class="pdf-library-item-icon">&#128196;</span>' +
        '<span class="pdf-library-item-name">' + this._escapeHtml(entry.name) + '</span>' +
        '<span class="pdf-library-item-size">' + size + '</span>';
      listEl.appendChild(row);
      return;
    }

    row.className = 'pdf-library-item';
    const thumbHtml =
      '<span class="pdf-library-item-thumb">' +
        '<span class="pdf-library-item-thumb-ph">PDF</span>' +
        '<img class="pdf-library-item-thumb-img" alt="" />' +
      '</span>';
    row.innerHTML = thumbHtml +
      '<span class="pdf-library-item-name">' + this._escapeHtml(entry.name.replace(/\.pdf$/i, '')) + '</span>' +
      '<span class="pdf-library-item-size">' + size + '</span>';
    row.addEventListener('click', () => {
      this._pdfOpenPath(entry.path);
    });
    listEl.appendChild(row);

    const imgEl = row.querySelector('.pdf-library-item-thumb-img');
    const key = entry.path + '|' + entry.mtimeMs;
    if (this._pdfThumbCache.has(key)) {
      imgEl.src = this._pdfThumbCache.get(key);
      imgEl.classList.add('loaded');
    } else if (entry.size > 100 * 1024 * 1024) {
      imgEl.parentElement.querySelector('.pdf-library-item-thumb-ph').textContent = '\u2013';
    } else {
      this._pdfThumbQueue.push({ path: entry.path, mtimeMs: entry.mtimeMs, imgEl });
      this._pdfPumpThumbs();
    }
  }

  _pdfPumpThumbs() {
    while (this._pdfThumbActive < this._pdfThumbMaxConcurrent && this._pdfThumbQueue.length) {
      const job = this._pdfThumbQueue.shift();
      this._pdfThumbActive++;
      this._pdfRenderThumb(job.path, job.mtimeMs, job.imgEl).finally(() => {
        this._pdfThumbActive--;
        this._pdfPumpThumbs();
      });
    }
  }

  async _pdfRenderThumb(path, mtimeMs, imgEl) {
    const key = path + '|' + mtimeMs;
    try {
      const buf = await window.electronAPI.readFile(path);
      if (!buf) return;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf/pdf.worker.min.js';
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const scale = 92 / base.width;
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      this._pdfThumbCache.set(key, dataUrl);
      imgEl.src = dataUrl;
      imgEl.classList.add('loaded');
      doc.destroy();
    } catch (e) {
      console.warn('Thumbnail failed:', path, e);
    }
  }

  _formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    if (bytes > 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
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
            this._ytPlayer.seekTo(Math.max(0, ts - 2), true);
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
      document.getElementById('readCollapsedBarYoutube').style.display = 'none';
      document.getElementById('btnReadNewToolbar').style.display = '';
      document.getElementById('btnReaderLangBarToggle').style.display = '';
      document.getElementById('readYoutubeArea').style.display = 'flex';
      document.getElementById('ytLangBar').classList.remove('yt-lang-collapsed');
      document.getElementById('btnReaderLangBarToggle').innerHTML = '&#9650;';
      document.getElementById('btnReaderLangBarToggle').title = 'Hide settings bar';
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
    } else if (sourceType === 'pdf-error') {
      document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
      document.getElementById('pdfLibrary').style.display = 'none';
      document.getElementById('pdfTabsBar').style.display = 'none';
      document.getElementById('readContentAreaPdf').style.display = 'block';
      document.getElementById('pdfSplit').style.display = 'none';
      document.getElementById('pdfViewer').style.display = 'none';
      document.getElementById('readTextViewPdf').style.display = 'block';
      document.getElementById('readTextViewPdf').innerHTML = text;
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
    subEl.addEventListener('contextmenu', (e) => {
      const lineEl = e.target.closest ? e.target.closest('.yt-sub-line') : null;
      if (!lineEl) return;
      e.preventDefault();
      const ts = parseFloat(lineEl.dataset.start);
      if (this._ytPlayer && typeof this._ytPlayer.seekTo === 'function' && !isNaN(ts)) {
        this._ytPlayer.seekTo(Math.max(0, ts - 0.2), true);
        this._ytPlayer.playVideo();
      }
    });
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

  _updateVoiceUi() {
    const voice = appStore.data.ttsVoice != null ? appStore.data.ttsVoice : 0;
    const labelEl = document.getElementById('ytVoiceLabel');
    document.querySelectorAll('#ytVoiceMenu .yt-voice-option').forEach((opt) => {
      const v = parseInt(opt.dataset.voice, 10);
      opt.classList.toggle('active', v === voice);
      if (v === voice && labelEl) labelEl.textContent = opt.textContent;
    });
  }

  _resetReadPage() {
    this._stopYoutubeSync();
    this._setReaderSettingsMode(false);
    this._setReaderEditMode(false);
    document.getElementById('readerTranslatePopup').style.display = 'none';
    this._readSourceInfo = null;

    document.getElementById('readYoutubeInput').value = '';
    const ytPage = document.getElementById('read-page-youtube');
    ytPage.querySelector('.read-page-input').style.display = '';
    document.getElementById('readCollapsedBarYoutube').style.display = 'none';
    document.getElementById('btnReadNewToolbar').style.display = 'none';
    document.getElementById('btnReaderLangBarToggle').style.display = 'none';
    document.getElementById('readYoutubeArea').style.display = 'none';
    document.getElementById('ytLangBar').classList.add('yt-lang-collapsed');
    document.getElementById('btnReaderLangBarToggle').innerHTML = '&#9650;';
    document.getElementById('btnReaderLangBarToggle').title = 'Hide settings bar';
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
    this._pdfSyncDropzone();
    document.getElementById('pdfTabsBar').style.display = 'none';
    document.getElementById('readContentAreaPdf').style.display = 'none';
    document.getElementById('pdfViewer').style.display = '';
    document.getElementById('readTextViewPdf').innerHTML = '';
    document.getElementById('readTextViewPdf').style.display = 'none';
    document.getElementById('pdfLibrary').style.display = '';
  }
}

const app = new App();

document.addEventListener('DOMContentLoaded', () => app.init());
