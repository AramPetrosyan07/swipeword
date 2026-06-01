class StudyModeManager {
  constructor() {
    this.isLearningMode = true;
  }

  init() {
    if (appStore.data && appStore.data.learnMode !== undefined) {
      this.isLearningMode = appStore.data.learnMode;
      document.body.classList.toggle('learning-mode', this.isLearningMode);
    }
  }

  toggle() {
    this.isLearningMode = !this.isLearningMode;
    document.body.classList.toggle('learning-mode', this.isLearningMode);
    appStore.data.learnMode = this.isLearningMode;
    appStore.save();
  }
}

const studyModeManager = new StudyModeManager();
