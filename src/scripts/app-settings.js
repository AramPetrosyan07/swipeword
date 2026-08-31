__appMixinSettings = {};
__appMixinSettings['_loadLangPrefs'] = function() {
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
};

__appMixinSettings['_saveLangPrefs'] = function() {
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
};

__appMixinSettings['_applyLangPrefsToUI'] = function() {
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
};

__appMixinSettings['_getActiveLangs'] = function() {
  const langs = [this._ytTargetLang1];
  if (this._ytLangCount >= 2 && this._ytTargetLang2) langs.push(this._ytTargetLang2);
  if (this._ytLangCount >= 3 && this._ytTargetLang3) langs.push(this._ytTargetLang3);
  return langs;
};

__appMixinSettings['_updateLangSelectVisibility'] = function() {
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
};

__appMixinSettings['_langNameList'] = function() {
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
};

__appMixinSettings['_populateReaderLangSelects'] = function() {
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
};

__appMixinSettings['_populateReadAloudLang'] = function() {
  const langs = this._langNameList();
  const sel = document.getElementById('readAloudLang');
  if (!sel) return;
  sel.innerHTML = langs.map(([v, label]) =>
    `<option value="${v}">${label}</option>`
  ).join('');
  sel.value = this._pdfSourceLang || 'en';
  const voiceSel = document.getElementById('readAloudVoice');
  if (voiceSel) {
    voiceSel.value = String(appStore.data.ttsVoice != null ? appStore.data.ttsVoice : 0);
  }
};

__appMixinSettings['_toggleReadAloud'] = function() {
  this._readAloudMode = !this._readAloudMode;
  this._updateReadAloudUI(this._readAloudMode);
  if (!this._readAloudMode) {
    readerMode.readAloudStop();
  }
};

__appMixinSettings['_updateReadAloudUI'] = function(active) {
  const btn = document.getElementById('btnReadAloud');
  const inline = document.getElementById('readAloudInline');
  const pdfPages = document.getElementById('pdfPages');
  if (btn) btn.classList.toggle('active', active);
  if (inline) inline.style.display = active ? 'flex' : 'none';
  if (pdfPages) pdfPages.classList.toggle('read-aloud-mode', !!active);
  if (!active) {
    this._readAloudMode = false;
    this._updateReadAloudPlayBtn(false);
  }
};

__appMixinSettings['_updateReadAloudPlayBtn'] = function(playing) {
  const playBtn = document.getElementById('btnReadAloudPlay');
  if (playBtn) playBtn.innerHTML = playing ? '&#9646;&#9646;' : '&#9654;';
};

__appMixinSettings['_findNearestPdfWord'] = function(clientX, clientY, limit) {
  const words = document.querySelectorAll('.pdf-scroll-layer .rw-word');
  let best = null;
  let bestD = Infinity;
  let checked = 0;
  for (const w of words) {
    if (checked >= (limit || Infinity)) break;
    checked++;
    const r = w.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const dx = clientX < r.left ? r.left - clientX : (clientX > r.right ? clientX - r.right : 0);
    const dy = clientY < r.top ? r.top - clientY : (clientY > r.bottom ? clientY - r.bottom : 0);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
};

__appMixinSettings['_loadReaderLangPrefs'] = function() {
  try {
    const saved = localStorage.getItem('reader-lang-prefs');
    if (saved) {
      const p = JSON.parse(saved);
      this._pdfSourceLang = p.from || 'en';
      this._pdfTargetLang = p.to || 'hy';
      this._pdfWordCount = p.words || 3;
    }
  } catch (e) {}
};

__appMixinSettings['_saveReaderLangPrefs'] = function() {
  try {
    localStorage.setItem('reader-lang-prefs', JSON.stringify({
      from: this._pdfSourceLang,
      to: this._pdfTargetLang,
      words: this._pdfWordCount
    }));
  } catch (e) {}
};

__appMixinSettings['_setReaderSettingsMode'] = function(on) {
  this._readerSettingsMode = on;
  document.getElementById('screen-reader').classList.toggle('reader-settings-mode', on);
  if (on) this._applyReaderLangPrefs();
};

__appMixinSettings['_setReaderEditMode'] = function(on) {
  this._readerEditMode = on;
};

__appMixinSettings['_setThemeColorsMode'] = function(on) {
  this._themeColorsMode = on;
  document.getElementById('screen-reader').classList.toggle('theme-colors-mode', on);
  if (on) this._loadThemeColors();
};

__appMixinSettings['_loadThemeColors'] = function() {
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
};

__appMixinSettings['_applyThemeColors'] = function() {
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
};

__appMixinSettings['_resetThemeColors'] = function() {
  themeManager.resetCustomColors();
  this._loadThemeColors();
};

__appMixinSettings['_applyReaderLangPrefs'] = function() {
  const sourceSel = document.getElementById('readerSourceLang');
  const targetSel = document.getElementById('readerTargetLang');
  const wordSel = document.getElementById('readerWordCount');
  if (sourceSel) sourceSel.value = this._pdfSourceLang;
  if (targetSel) targetSel.value = this._pdfTargetLang;
  if (wordSel) wordSel.value = this._pdfWordCount;
  this.translationPopup.setLanguages(this._pdfSourceLang, [this._pdfTargetLang], this._pdfWordCount);
};
