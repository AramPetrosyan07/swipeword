class BaseMode {
  constructor() {
    this.words = [];
    this.currentIndex = 0;
    this.score = { correct: 0, wrong: 0 };
    this.filter = 'all';
    this.letter = '';
    this.isActive = false;
  }

  start(filter, letter) {
    this.filter = filter || 'all';
    this.letter = letter || '';
    this.words = appStore.getWordsForMode(this.filter);
    if (this.letter) {
      this.words = this.words.filter(
        (w) => w.english.charAt(0).toUpperCase() === this.letter.toUpperCase()
      );
    }
    if (this.words.length === 0) {
      alert('No words match this filter.');
      return false;
    }
    this.currentIndex = 0;
    this.score = { correct: 0, wrong: 0 };
    this.isActive = true;
    this._showScreen();
    this.renderQuestion();
    this.updateProgress();
    return true;
  }

  next() {
    this.currentIndex++;
    if (this.currentIndex >= this.words.length) {
      this.finish();
      return;
    }
    this.renderQuestion();
    this.updateProgress();
  }

  finish() {
    this.isActive = false;
    this.showResults();
  }

  updateProgress() {
    const total = this.words.length;
    const current = Math.min(this.currentIndex + 1, total);
  }

  showResults() {
    const total = this.score.correct + this.score.wrong;
    const pct = total > 0 ? Math.round((this.score.correct / total) * 100) : 0;
  }

  back() {
    this.isActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    document.getElementById('modesOverlay').style.display = 'flex';
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-learn').classList.add('active');
  }

  _showScreen() {}
  renderQuestion() {}
}
