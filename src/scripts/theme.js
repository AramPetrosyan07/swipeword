class ThemeManager {
  constructor() {
    this.darkMode = false;
  }

  init() {
    if (appStore.data && appStore.data.darkMode) {
      this.darkMode = true;
      document.body.className = 'theme-dark';
    }
  }

  toggle() {
    this.darkMode = !this.darkMode;
    document.body.className = this.darkMode ? 'theme-dark' : 'theme-light';
    appStore.data.darkMode = this.darkMode;
    appStore.save();
  }
}

const themeManager = new ThemeManager();
