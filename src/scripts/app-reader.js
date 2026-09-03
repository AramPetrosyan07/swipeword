__appMixinReader = {};
__appMixinReader['_setReadSidebarCompact'] = function(compact) {
  const ids = ['sidePdfLast', 'sidePdfViewer', 'sidePdfRecent', 'sidePdfPinned', 'sideWords'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = compact ? 'none' : '';
  });
};

__appMixinReader['_openReadPage'] = function(mode) {
  this._readCurrentPage = mode;
  this._setReadSidebarCompact(false);
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

  if (mode === 'youtube' && typeof this._updateYoutubeRecommendations === 'function') {
    this._updateYoutubeRecommendations();
  }

  if (mode === 'textpractice' && typeof textPractice !== 'undefined') {
    textPractice.open();
  }
};

__appMixinReader['_setPdfViewMode'] = function(view) {
  this._pdfViewMode = view;
  if (appStore.data) {
    appStore.data.pdfViewMode = view;
    appStore.save();
  }
  this._syncPdfSidebarButtons();
};

__appMixinReader['_showPdfView'] = function(view) {
  if (view === 'recent') this._pdfShowRecents();
  else if (view === 'pinned') this._pdfShowPinned();
  else if (view === 'last') this._pdfOpenLast();
  else this._pdfShowViewer();
};

__appMixinReader['_backToReadHome'] = function() {
  if (this._pdfSaveScrollTimer) clearTimeout(this._pdfSaveScrollTimer);
  this._pdfSaveScroll();
  this._resetReadPage();
  this._setReadSidebarCompact(true);
  this._deactivatePdfRail();
  document.getElementById('readHome').style.display = '';
  document.querySelectorAll('.read-page').forEach((p) => p.classList.remove('active'));
  document.getElementById('btnReaderBack').style.display = 'none';
  document.getElementById('btnReaderMenu').style.display = '';
  this._readCurrentPage = null;
  this._updateTranslationSidebarBtnVisibility();
};

__appMixinReader['_bindPdfLayers'] = function(sourceInfo) {
  const layers = document.querySelectorAll('#pdfPages .pdf-scroll-layer');
  layers.forEach((layer) => {
    this.translationPopup.bindToContainer(layer, sourceInfo);
  });
};

__appMixinReader['_setPdfFile'] = function(file) {
  this._readPdfFile = file;
  this._readPdfPath = null;
  const dropzone = document.getElementById('readPdfDropzone');
  dropzone.classList.add('read-dropzone-loaded');
  dropzone.querySelector('.read-dropzone-text').textContent = file.name;
  document.getElementById('btnReadPdf').disabled = false;
};

__appMixinReader['_setPdfPath'] = function(path, name) {
  this._readPdfFile = null;
  this._readPdfPath = path;
  this._addPdfRecent((name || path).replace(/\.pdf$/i, ''), path);
  const dropzone = document.getElementById('readPdfDropzone');
  dropzone.classList.add('read-dropzone-loaded');
  dropzone.querySelector('.read-dropzone-text').textContent = name || path;
  document.getElementById('btnReadPdf').disabled = false;
};

__appMixinReader['_loadPdfContent'] = async function() {
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
    await window._ensurePdfJs();
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
};

__appMixinReader['_showPdfTab'] = async function(index) {
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
  const detected = await readerMode.detectSourceLang();
  if (detected && detected !== this._pdfSourceLang) {
    this._pdfSourceLang = detected;
    this._applyReaderLangPrefs();
    const readAloudSel = document.getElementById('readAloudLang');
    if (readAloudSel) readAloudSel.value = detected;
  }
  let savedTop = tab.scrollTop;
  if (!savedTop && appStore.data.pdfScrollPositions) {
    savedTop = appStore.data.pdfScrollPositions[tab.path || tab.name] || 0;
  }
  if (scrollContainer && savedTop > 0) {
    scrollContainer.scrollTop = savedTop;
    readerMode.onScroll(true);
  }
  const sourceInfo = { type: 'pdf', title: tab.name, id: Date.now().toString(36) };
  this._readSourceInfo = sourceInfo;
  this._bindPdfLayers(sourceInfo);
  this._updateTranslationSidebarBtnVisibility();
  this._loadPdfSidebarWords();
};

__appMixinReader['_renderPdfTabs'] = function() {
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
};

__appMixinReader['_closePdfTab'] = async function(index) {
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
};

__appMixinReader['_loadPdfFromPath'] = async function(filePath) {
  this._readPdfPath = filePath;
  await this._loadPdfContent();
};

__appMixinReader['_pdfOpenPath'] = function(path) {
  this._addPdfRecent(path.replace(/.*[/\\]/, '').replace(/\.pdf$/i, ''), path);
  this._resetReadPage();
  this._setPdfViewMode('last');
  this._readPdfPath = path;
  document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
  this._loadPdfContent();
};

__appMixinReader['_addPdfRecent'] = function(name, path) {
  if (!appStore.data.pdfRecents) appStore.data.pdfRecents = [];
  const recents = appStore.data.pdfRecents;
  const idx = recents.findIndex((r) => r.path === path);
  if (idx !== -1) recents.splice(idx, 1);
  recents.unshift({ name, path, date: new Date().toISOString().slice(0, 10) });
  if (recents.length > 20) recents.length = 20;
  appStore.save();
};

__appMixinReader['_pdfSaveScrollDebounced'] = function() {
  if (this._pdfSaveScrollTimer) clearTimeout(this._pdfSaveScrollTimer);
  this._pdfSaveScrollTimer = setTimeout(() => this._pdfSaveScroll(), 300);
};

__appMixinReader['_pdfSaveScroll'] = function() {
  const tab = this._pdfTabs[this._pdfActiveTab];
  const scrollContainer = document.getElementById('pdfViewerScroll');
  if (!tab || !scrollContainer) return;
  const key = tab.path || tab.name;
  if (!key) return;
  const viewerEl = document.getElementById('readContentAreaPdf');
  const isShown = this._readCurrentPage === 'pdf' && viewerEl && viewerEl.style.display !== 'none';
  if (isShown && scrollContainer.scrollHeight > 0) {
    tab.scrollTop = scrollContainer.scrollTop;
  }
  if (tab.scrollTop > 0) {
    if (!appStore.data.pdfScrollPositions) appStore.data.pdfScrollPositions = {};
    appStore.data.pdfScrollPositions[key] = tab.scrollTop;
    appStore.save();
  }
};

__appMixinReader['_updateTranslationSidebarBtnVisibility'] = function() {
  const btn = document.getElementById('btnTranslationSidebar');
  if (btn) btn.style.display = this._readCurrentPage === 'pdf' ? '' : 'none';
  const saveBtn = document.getElementById('btnSavePdfFile');
  if (saveBtn) saveBtn.style.display = (this._readCurrentPage === 'pdf' && this._pdfTabs && this._pdfTabs.length > 0) ? '' : 'none';
};

__appMixinReader['_saveCurrentPdfFile'] = async function() {
  if (this._readCurrentPage !== 'pdf' || !this._pdfTabs || !this._pdfTabs[this._pdfActiveTab]) return;
  const tab = this._pdfTabs[this._pdfActiveTab];
  let rawBuffer = null;

  try {
    if (tab.path) {
      const buf = await window.electronAPI.readFile(tab.path);
      if (buf) rawBuffer = new Uint8Array(buf);
    }
  } catch (e) {
    console.warn('Could not read original path for save:', e);
  }

  if (!rawBuffer && tab.doc && typeof tab.doc.getData === 'function') {
    try {
      rawBuffer = await tab.doc.getData();
    } catch (e) {}
  }

  if (!rawBuffer) {
    this._showSaveToast('Cannot find original PDF data to save', 'error');
    return;
  }

  try {
    const saveBtn = document.getElementById('btnSavePdfFile');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    const modifiedBytes = await readerMode.exportAnnotatedPdf(rawBuffer);
    const defaultName = (tab.name || 'document') + '_annotated.pdf';
    const result = await window.electronAPI.savePdf(modifiedBytes, defaultName);

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '&#128190; Save PDF';
    }

    if (result && result.success) {
      this._showSaveToast('PDF successfully saved with annotations!', 'success');
    } else if (result && !result.canceled) {
      this._showSaveToast(result.error || 'Failed to save PDF', 'error');
    }
  } catch (e) {
    console.error('Error saving PDF:', e);
    const saveBtn = document.getElementById('btnSavePdfFile');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '&#128190; Save PDF';
    }
    this._showSaveToast('Error saving PDF: ' + e.message, 'error');
  }
};

__appMixinReader['_showSaveToast'] = function(msg, type) {
  const toast = document.getElementById('copyToast');
  const textEl = document.getElementById('copyToastText');
  if (!toast || !textEl) return;
  const icon = type === 'success' ? '&#10003;' : '&#9888;';
  const color = type === 'success' ? '#4caf50' : '#f44336';
  textEl.innerHTML = `<span style="color:${color};font-weight:700;">${icon}</span> ${msg}`;
  toast.classList.add('visible');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
};

__appMixinReader['_toggleTranslationSidebar'] = function() {
  this._translationSidebarVisible = !this._translationSidebarVisible;
  if (appStore.data) {
    appStore.data.translationSidebar = this._translationSidebarVisible;
    appStore.save();
  }
  this._applyTranslationSidebar(true);
};

__appMixinReader['_applyTranslationSidebar'] = function(refit) {
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
};

__appMixinReader['_loadPdfSidebarWords'] = async function() {
  const tab = this._pdfTabs[this._pdfActiveTab];
  if (!tab) {
    this._pdfSidebarWords = [];
    this._translationSidebarRender();
    return;
  }
  try {
    const allWords = await appStore.loadSavedWords();
    this._pdfSidebarWords = (allWords || [])
      .filter((w) => w.sourceType === 'pdf' && w.sourceTitle === tab.name)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    this._pdfSidebarWords = [];
  }
  this._translationSidebarRender();
};

__appMixinReader['_translationSidebarRender'] = function() {
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

  if (!this._translationSidebarDelegated) {
    this._translationSidebarDelegated = true;
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('.translation-sidebar-delete');
      if (!btn) return;
      e.stopPropagation();
      const item = btn.closest('.translation-sidebar-item');
      if (!item) return;
      await this._removeSidebarWord(item.dataset.id);
    });
  }
};

__appMixinReader['_removeSidebarWord'] = async function(id) {
  try {
    await window.electronAPI.dictionaryRemove(id);
    appStore.invalidateSavedWordsCache();
    this._pdfSidebarWords = this._pdfSidebarWords.filter(w => w.id !== id);
    this._translationSidebarRender();
  } catch (e) {
    console.error('Failed to remove word:', e);
  }
};

__appMixinReader['_setSidebarWidth'] = function(width) {
  const sidebar = document.getElementById('translationSidebar');
  if (sidebar) sidebar.style.width = width + 'px';
};

__appMixinReader['_initSidebarResizer'] = function() {
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
};

__appMixinReader['_pdfPersistOpenTabs'] = function() {
  if (!appStore.data.pdfOpenTabs) appStore.data.pdfOpenTabs = [];
  const open = appStore.data.pdfOpenTabs;
  open.length = 0;
  this._pdfTabs.forEach((t) => {
    if (t.path) open.push({ path: t.path, name: t.name });
  });
  appStore.save();
};

__appMixinReader['_pdfRemoveOpenTab'] = function(path) {
  const open = appStore.data.pdfOpenTabs;
  if (!open) return;
  const idx = open.findIndex((e) => e.path === path);
  if (idx !== -1) {
    open.splice(idx, 1);
    appStore.save();
  }
};

__appMixinReader['_restorePdfTabs'] = async function() {
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
      await window._ensurePdfJs();
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
};

__appMixinReader['_togglePinFolder'] = async function(path) {
  if (!appStore.data.pdfPinnedFolders) appStore.data.pdfPinnedFolders = [];
  const pinned = appStore.data.pdfPinnedFolders;
  const idx = pinned.indexOf(path);
  if (idx === -1) pinned.push(path);
  else pinned.splice(idx, 1);
  await appStore.save();
};

__appMixinReader['_pdfShowSidebarView'] = function(view) {
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
};

__appMixinReader['_pdfOpenLast'] = function() {
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
};

__appMixinReader['_syncPdfSidebarButtons'] = function() {
  const map = { viewer: 'sidePdfViewer', recent: 'sidePdfRecent', pinned: 'sidePdfPinned', last: 'sidePdfLast' };
  ['sidePdfViewer', 'sidePdfRecent', 'sidePdfPinned', 'sidePdfLast'].forEach((id) => {
    document.getElementById(id).classList.toggle('active', map[this._pdfViewMode] === id);
  });
};

__appMixinReader['_pdfShowViewer'] = function() {
  document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
  document.getElementById('pdfTabsBar').style.display = 'none';
  document.getElementById('readContentAreaPdf').style.display = 'none';
  document.getElementById('pdfLibrary').style.display = '';
  document.getElementById('pdfLibraryTitleText').textContent = 'PDF Library';
  document.getElementById('pdfLibraryTitleText').parentElement.querySelector('.pdf-library-icon').innerHTML = '&#128218;';
  document.getElementById('btnPdfChooseFolder').style.display = '';
  this._scanPdfLibrary();
};

__appMixinReader['_pdfShowRecents'] = function() {
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
};

__appMixinReader['_pdfShowPinned'] = function() {
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
};

__appMixinReader['_pdfShowListMode'] = function() {
  this._readSourceInfo = null;
  document.getElementById('pdfLibrary').style.display = '';
  document.getElementById('readContentAreaPdf').style.display = 'none';
  document.getElementById('pdfViewer').style.display = '';
  document.getElementById('readTextViewPdf').style.display = 'none';
  document.getElementById('read-page-pdf').querySelector('.read-page-input').style.display = 'none';
  document.getElementById('pdfBreadcrumb').style.display = 'none';
  document.getElementById('pdfLibraryNoFolder').style.display = 'none';
  document.getElementById('pdfLibraryLoading').style.display = 'none';
};

__appMixinReader['_scanPdfLibrary'] = async function() {
  const savedFolder = appStore.data && appStore.data.pdfFolder;
  if (!savedFolder) {
    this._showPdfLibraryPrompt();
    return;
  }
  this._pdfDirStack = [savedFolder];
  await this._pdfRenderCurrent();
};

__appMixinReader['_pdfChooseFolder'] = async function() {
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
};

__appMixinReader['_showPdfLibraryPrompt'] = function() {
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
};

__appMixinReader['_pdfSyncDropzone'] = function() {
  const input = document.getElementById('read-page-pdf').querySelector('.read-page-input');
  input.style.display = this._pdfDirStack.length ? 'none' : '';
};

__appMixinReader['_pdfRenderCurrent'] = async function() {
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
};

__appMixinReader['_pdfRenderBreadcrumb'] = function(breadcrumbEl) {
  breadcrumbEl.innerHTML = '';
  if (this._pdfDirStack.length === 0) {
    breadcrumbEl.style.display = 'none';
    return;
  }
  breadcrumbEl.style.display = '';
  this._pdfDirStack.forEach((path, idx) => {
    const isLast = idx === this._pdfDirStack.length - 1;
    const label = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path;
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
};

__appMixinReader['_pdfGoTo'] = function(index) {
  this._pdfDirStack = this._pdfDirStack.slice(0, index + 1);
  this._pdfThumbQueue.length = 0;
  this._pdfRenderCurrent();
};

__appMixinReader['_pdfRenderItem'] = function(listEl, entry) {
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
};

__appMixinReader['_pdfPumpThumbs'] = function() {
  while (this._pdfThumbActive < this._pdfThumbMaxConcurrent && this._pdfThumbQueue.length) {
    const job = this._pdfThumbQueue.shift();
    this._pdfThumbActive++;
    this._pdfRenderThumb(job.path, job.mtimeMs, job.imgEl).finally(() => {
      this._pdfThumbActive--;
      this._pdfPumpThumbs();
    });
  }
};

__appMixinReader['_pdfRenderThumb'] = async function(path, mtimeMs, imgEl) {
  const key = path + '|' + mtimeMs;
  try {
    const buf = await window.electronAPI.readFile(path);
    if (!buf) return;
    await window._ensurePdfJs();
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
};

__appMixinReader['_formatBytes'] = function(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  if (bytes > 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
};

__appMixinReader['_escapeHtml'] = function(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};
