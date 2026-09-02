__appMixinBindings = {};
__appMixinBindings['_bindReadPageEvents'] = function() {
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
  document.getElementById('btnReadAloud').addEventListener('click', () => {
    this._toggleReadAloud();
  });
  document.getElementById('btnReadAloudPlay').addEventListener('click', () => {
    if (!readerMode._readAloudActive) return;
    const playing = readerMode.readAloudTogglePause();
    this._updateReadAloudPlayBtn(playing);
  });
  document.getElementById('btnReadAloudStop').addEventListener('click', () => {
    readerMode.readAloudStop();
    this._updateReadAloudUI(false);
  });
  document.getElementById('readAloudLang').addEventListener('change', () => {
    if (readerMode._readAloudActive) {
      readerMode.readAloudStop();
      this._updateReadAloudUI(false);
    }
  });
  document.getElementById('readAloudSpeed').addEventListener('change', (e) => {
    readerMode.readAloudSetSpeed(parseFloat(e.target.value) || 1);
  });
  document.getElementById('readAloudVoice').addEventListener('change', (e) => {
    const voice = parseInt(e.target.value, 10) || 0;
    appStore.data.ttsVoice = voice;
    appStore.save();
    if (this.translationPopup) this.translationPopup.setVoice(voice);
    this._updateVoiceUi();
    if (readerMode._readAloudActive) {
      readerMode.readAloudSetVoice(voice);
    }
  });
  document.getElementById('pdfPages').addEventListener('contextmenu', (e) => {
    if (!this._readAloudMode) return;
    let word = e.target.closest('.rw-word');
    if (!word) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) word = el.closest('.rw-word');
    }
    if (!word && e.target && e.target.closest('.pdf-scroll-page')) {
      word = this._findNearestPdfWord(e.clientX, e.clientY);
    }
    if (!word) return;
    e.preventDefault();
    e.stopPropagation();
    const slot = word.closest('.pdf-scroll-page');
    const clickedPage = slot ? parseInt(slot.dataset.page, 10) : 0;
    const lang = document.getElementById('readAloudLang').value || 'en';
    const speed = parseFloat(document.getElementById('readAloudSpeed').value) || 1;
    const voiceId = parseInt(document.getElementById('readAloudVoice').value, 10) || 0;
    readerMode.readAloudStart(word.dataset.word || word.textContent, lang, voiceId, speed, clickedPage, word);
    this._updateReadAloudUI(true);
    this._updateReadAloudPlayBtn(true);
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
  const autoPauseInput = document.getElementById('ytAutoPause');

  const applyYtSubSettings = () => {
    const sub = appStore.data.ytSubtitle || {};
    const fontSize = sub.fontSize || 18;
    const lineGap = sub.lineGap || 8;
    subFontInput.value = fontSize;
    subGapInput.value = lineGap;
    autoPauseInput.checked = !!sub.autoPause;
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
  autoPauseInput.addEventListener('change', (e) => {
    appStore.data.ytSubtitle = appStore.data.ytSubtitle || {};
    appStore.data.ytSubtitle.autoPause = !!e.target.checked;
    appStore.save();
  });
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
    const readAloudSel = document.getElementById('readAloudLang');
    if (readAloudSel) readAloudSel.value = this._pdfSourceLang;
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
};
