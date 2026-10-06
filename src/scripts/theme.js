class ThemeManager {
  constructor() {
    this.darkMode = false;
    this.lightColors = null;
    this.darkColors = null;
    this.pdfColorsLight = null;
    this.pdfColorsDark = null;
  }

  init() {
    if (appStore.data) {
      if (appStore.data.darkMode !== false) {
        this.darkMode = true;
        this._applyThemeClass();
      }
      if (appStore.data.themeColors) {
        const tc = appStore.data.themeColors;
        if (!appStore.data.pdfColors) {
          const hasPdf = (tc.light && (tc.light.pdfBg || tc.light.pdfText || tc.light.pdfSelect)) ||
            (tc.dark && (tc.dark.pdfBg || tc.dark.pdfText || tc.dark.pdfSelect));
          if (hasPdf) {
            appStore.data.pdfColors = {
              light: { pdfBg: tc.light.pdfBg, pdfText: tc.light.pdfText, pdfSelect: tc.light.pdfSelect },
              dark: { pdfBg: tc.dark.pdfBg, pdfText: tc.dark.pdfText, pdfSelect: tc.dark.pdfSelect },
            };
            ['pdfBg', 'pdfText', 'pdfSelect'].forEach((k) => {
              if (tc.light) delete tc.light[k];
              if (tc.dark) delete tc.dark[k];
            });
            appStore.save();
          }
        }
        this.lightColors = tc.light;
        this.darkColors = tc.dark;
        this._applyCustomColors();
      }
      if (appStore.data.pdfColors) {
        this.pdfColorsLight = appStore.data.pdfColors.light;
        this.pdfColorsDark = appStore.data.pdfColors.dark;
        this._applyPdfColors();
      }
    }
  }

  _applyThemeClass() {
    document.body.classList.toggle('theme-dark', this.darkMode);
    document.body.classList.toggle('theme-light', !this.darkMode);
  }

  toggle() {
    this.darkMode = !this.darkMode;
    this._applyThemeClass();
    appStore.data.darkMode = this.darkMode;
    appStore.save();
    this._applyCustomColors();
    this._applyPdfColors();
  }

  setPdfColors(light, dark) {
    this.pdfColorsLight = light;
    this.pdfColorsDark = dark;
    this._applyPdfColors();
    if (appStore.data) {
      appStore.data.pdfColors = { light, dark };
      appStore.save();
    }
  }

  resetPdfColors() {
    this.pdfColorsLight = null;
    this.pdfColorsDark = null;
    this._applyPdfColors();
    if (appStore.data) {
      delete appStore.data.pdfColors;
      appStore.save();
    }
  }

  setCustomColors(light, dark) {
    this.lightColors = light;
    this.darkColors = dark;
    this._applyCustomColors();
    if (appStore.data) {
      appStore.data.themeColors = { light, dark };
      appStore.save();
    }
  }

  resetCustomColors() {
    this.lightColors = null;
    this.darkColors = null;
    this._applyCustomColors();
    if (appStore.data) {
      delete appStore.data.themeColors;
      appStore.save();
    }
  }

  getPagePalette(page) {
    return (appStore.data && appStore.data.pageColors && appStore.data.pageColors[page]) || null;
  }

  setPagePalette(page, colors) {
    if (!appStore.data) return;
    if (!appStore.data.pageColors) appStore.data.pageColors = {};
    appStore.data.pageColors[page] = colors;
    appStore.save();
    this.applyPagePalette(page);
  }

  resetPagePalette(page) {
    if (appStore.data && appStore.data.pageColors) {
      delete appStore.data.pageColors[page];
      appStore.save();
    }
    this.applyPagePalette(page);
  }

  applyPagePalette(page) {
    const pageEl = document.getElementById('read-page-' + page);
    if (page === 'pdf') {
      this._applyPdfColors();
      return;
    }
    if (!pageEl) return;
    const colors = this.getPagePalette(page);
    if (page === 'youtube') {
      if (colors) {
        if (colors.pageBg) pageEl.style.setProperty('--yt-page-bg', colors.pageBg);
        if (colors.panelBg) pageEl.style.setProperty('--yt-panel-bg', colors.panelBg);
        if (colors.text) pageEl.style.setProperty('--yt-text', colors.text);
        if (colors.subText) pageEl.style.setProperty('--yt-sub-text', colors.subText);
        if (colors.subActive) pageEl.style.setProperty('--yt-sub-active', colors.subActive);
        if (colors.accent) pageEl.style.setProperty('--yt-accent', colors.accent);
        if (colors.select) pageEl.style.setProperty('--yt-select', this._hexToRgba(colors.select, 0.3));
        if (colors.saved) pageEl.style.setProperty('--yt-saved', colors.saved);
      } else {
        ['--yt-page-bg', '--yt-panel-bg', '--yt-text', '--yt-sub-text', '--yt-sub-active', '--yt-accent', '--yt-select', '--yt-saved']
          .forEach((v) => pageEl.style.removeProperty(v));
      }
    }
  }

  applyStoredPagePalettes() {
    if (appStore.data && appStore.data.pageColors) {
      Object.keys(appStore.data.pageColors).forEach((page) => this.applyPagePalette(page));
    }
    this._applyPdfColors();
  }

  _applyCustomColors() {
    const body = document.body;
    const root = document.documentElement;
    const colors = this.darkMode ? this.darkColors : this.lightColors;
    const props = ['--bg', '--text', '--primary', '--surface', '--border', '--text-secondary'];
    if (colors) {
      body.style.setProperty('--bg', colors.bg);
      body.style.setProperty('--text', colors.text);
      body.style.setProperty('--primary', colors.select);
      if (colors.textSecondary) {
        body.style.setProperty('--text-secondary', colors.textSecondary);
      } else {
        body.style.setProperty('--text-secondary', this._mixColor(colors.text, colors.bg, 0.45));
      }
      const surface = this._mixColor(colors.bg, this.darkMode ? '#000000' : '#ffffff', 0.05);
      const border = this._mixColor(colors.bg, this.darkMode ? '#ffffff' : '#000000', 0.15);
      body.style.setProperty('--surface', surface);
      body.style.setProperty('--border', border);
    } else {
      props.forEach((p) => {
        body.style.removeProperty(p);
        root.style.removeProperty(p);
      });
    }
  }

  _applyPdfColors() {
    const body = document.body;
    const colors = this.darkMode ? this.pdfColorsDark : this.pdfColorsLight;
    const props = ['--pdf-bg', '--pdf-text', '--pdf-select'];
    if (colors && (colors.pdfBg || colors.pdfText || colors.pdfSelect)) {
      const pdfBg = colors.pdfBg || (this.darkMode ? '#151a21' : '#fffdf9');
      let pdfText = colors.pdfText;
      const hasPdfText = !!pdfText && pdfText !== 'transparent';
      if (!hasPdfText && this._luminance(pdfBg) < 0.5) {
        pdfText = '#ffffff';
      }
      body.style.setProperty('--pdf-bg', pdfBg);
      body.style.setProperty('--pdf-text', pdfText || 'transparent');
      body.style.setProperty(
        '--pdf-select',
        colors.pdfSelect
          ? this._hexToRgba(colors.pdfSelect, this.darkMode ? 0.42 : 0.22)
          : 'rgba(160, 107, 52, ' + (this.darkMode ? '0.42' : '0.22') + ')'
      );
      body.classList.add('pdf-custom-colors');
      body.classList.toggle('theme-pdf-textlayer', hasPdfText || this._luminance(pdfBg) < 0.5);
    } else {
      props.forEach((p) => body.style.removeProperty(p));
      body.classList.remove('pdf-custom-colors', 'theme-pdf-textlayer');
    }
  }

  _hexToRgba(color, alpha) {
    if (typeof color === 'string' && color.startsWith('rgb')) {
      const nums = color.match(/\d+/g) || [];
      return 'rgba(' + (nums[0] || 108) + ', ' + (nums[1] || 99) + ', ' + (nums[2] || 255) + ', ' + alpha + ')';
    }
    let h = (color || '#a06b34').replace('#', '').slice(0, 6);
    while (h.length < 6) h += '0';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  _luminance(hex) {
    let h = (hex || '#000000').replace('#', '').slice(0, 6);
    while (h.length < 6) h += '0';
    const r = parseInt(h.slice(0, 2), 16) / 255 || 0;
    const g = parseInt(h.slice(2, 4), 16) / 255 || 0;
    const b = parseInt(h.slice(4, 6), 16) / 255 || 0;
    const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  _mixColor(hexA, hexB, ratio) {
    const parse = (hex) => {
      let h = (hex || '#000000').replace('#', '');
      h = h.slice(0, 8);
      while (h.length < 6) h += '0';
      return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
    };
    const a = parse(hexA);
    const b = parse(hexB);
    const out = a.map((v, i) => Math.round(v + (b[i] - v) * ratio));
    return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
}

const themeManager = new ThemeManager();
