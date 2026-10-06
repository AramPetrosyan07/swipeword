class ThemeManager {
  constructor() {
    this.darkMode = false;
    this.lightColors = null;
    this.darkColors = null;
  }

  init() {
    if (appStore.data) {
      if (appStore.data.darkMode) {
        this.darkMode = true;
        this._applyThemeClass();
      }
      if (appStore.data.themeColors) {
        this.lightColors = appStore.data.themeColors.light;
        this.darkColors = appStore.data.themeColors.dark;
        this._applyCustomColors();
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

  _applyCustomColors() {
    const body = document.body;
    const root = document.documentElement;
    const colors = this.darkMode ? this.darkColors : this.lightColors;
    const props = ['--bg', '--text', '--pdf-bg', '--primary', '--pdf-text', '--pdf-select', '--surface', '--text-secondary', '--border'];
    if (colors) {
      body.style.setProperty('--bg', colors.bg);
      body.style.setProperty('--text', colors.text);
      body.style.setProperty('--primary', colors.select);
      body.style.setProperty('--pdf-bg', colors.pdfBg);
      body.style.setProperty('--pdf-text', colors.pdfText || (this.darkMode ? '#ffffff' : 'transparent'));
      body.style.setProperty('--pdf-select', colors.pdfSelect || 'rgba(108, 99, 255, 0.22)');
      const surface = this._mixColor(colors.bg, this.darkMode ? '#000000' : '#ffffff', 0.05);
      const border = this._mixColor(colors.bg, this.darkMode ? '#ffffff' : '#000000', 0.15);
      const textSecondary = this._mixColor(colors.text, colors.bg, 0.45);
      body.style.setProperty('--surface', surface);
      body.style.setProperty('--border', border);
      body.style.setProperty('--text-secondary', textSecondary);
    } else {
      props.forEach((p) => {
        body.style.removeProperty(p);
        root.style.removeProperty(p);
      });
    }
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
