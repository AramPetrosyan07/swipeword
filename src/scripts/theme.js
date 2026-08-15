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
        document.body.className = 'theme-dark';
      }
      if (appStore.data.themeColors) {
        this.lightColors = appStore.data.themeColors.light;
        this.darkColors = appStore.data.themeColors.dark;
        this._applyCustomColors();
      }
    }
  }

  toggle() {
    this.darkMode = !this.darkMode;
    document.body.className = this.darkMode ? 'theme-dark' : 'theme-light';
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
    const root = document.documentElement;
    const colors = this.darkMode ? this.darkColors : this.lightColors;
    if (colors) {
      root.style.setProperty('--bg', colors.bg);
      root.style.setProperty('--text', colors.text);
      root.style.setProperty('--pdf-bg', colors.pdfBg);
      root.style.setProperty('--primary', colors.select);
      root.style.setProperty('--pdf-text', colors.pdfText || 'transparent');
      root.style.setProperty('--pdf-select', colors.pdfSelect || 'rgba(108, 99, 255, 0.22)');
    } else {
      root.style.removeProperty('--bg');
      root.style.removeProperty('--text');
      root.style.removeProperty('--pdf-bg');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--pdf-text');
      root.style.removeProperty('--pdf-select');
    }
  }
}

const themeManager = new ThemeManager();
