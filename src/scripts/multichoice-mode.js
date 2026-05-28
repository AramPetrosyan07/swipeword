class MultichoiceMode extends BaseMode {
  constructor() {
    super();
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btnMultichoiceBack').addEventListener('click', () => this.back());
    document.getElementById('btnMultichoiceRetry').addEventListener('click', () => {
      document.getElementById('multichoiceResult').style.display = 'none';
      this.start(this.filter);
    });
    document.getElementById('btnMultichoiceDone').addEventListener('click', () => this.back());
  }

  _showScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-multichoice').classList.add('active');
    document.getElementById('multichoiceResult').style.display = 'none';
  }

  renderQuestion() {
    const word = this.words[this.currentIndex];
    document.getElementById('multichoiceQuestion').textContent = word.english;
    const options = this._generateOptions(word);
    const container = document.getElementById('multichoiceOptions');
    container.innerHTML = '';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'multichoice-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => this._checkAnswer(btn, opt, word.armenian));
      container.appendChild(btn);
    });
  }

  updateProgress() {
    const total = this.words.length;
    const current = Math.min(this.currentIndex + 1, total);
    document.getElementById('multichoiceProgress').textContent = `${current} / ${total}`;
  }

  _generateOptions(correctWord) {
    const correct = correctWord.armenian;
    const others = this.words
      .filter((w) => w.armenian !== correct)
      .map((w) => w.armenian);
    const shuffled = others.sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, Math.min(3, shuffled.length));
    const options = [correct, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }

  _checkAnswer(btn, selected, correct) {
    if (!this.isActive) return;
    const buttons = document.querySelectorAll('.multichoice-option');
    buttons.forEach((b) => (b.style.pointerEvents = 'none'));
    if (selected === correct) {
      btn.className = 'multichoice-option correct';
      this.score.correct++;
      setTimeout(() => this.next(), 600);
    } else {
      btn.className = 'multichoice-option wrong';
      buttons.forEach((b) => {
        if (b.textContent === correct) b.className = 'multichoice-option correct';
      });
      this.score.wrong++;
      setTimeout(() => this.next(), 1500);
    }
  }

  showResults() {
    const total = this.score.correct + this.score.wrong;
    const pct = total > 0 ? Math.round((this.score.correct / total) * 100) : 0;
    document.getElementById('multichoiceResultScore').textContent = `${this.score.correct} / ${total}`;
    document.getElementById('multichoiceResultPct').textContent = `${pct}%`;
    document.getElementById('multichoiceResult').style.display = 'flex';
  }
}

const multichoiceMode = new MultichoiceMode();
