class TypingMode extends BaseMode {
  constructor() {
    super();
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btnTypingBack').addEventListener('click', () => this.back());
    document.getElementById('btnTypingSkip').addEventListener('click', () => this._skip());
    document.getElementById('btnTypingSubmit').addEventListener('click', () => this._checkAnswer());
    document.getElementById('typingInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._checkAnswer();
    });
    document.getElementById('btnTypingRetry').addEventListener('click', () => {
      document.getElementById('typingResult').style.display = 'none';
      document.getElementById('typingInput').value = '';
      this.start(this.filter);
    });
    document.getElementById('btnTypingDone').addEventListener('click', () => this.back());
  }

  _showScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-typing').classList.add('active');
    document.getElementById('typingResult').style.display = 'none';
    document.getElementById('typingInput').value = '';
    document.getElementById('typingFeedback').textContent = '';
    document.getElementById('typingInput').className = 'typing-input';
    document.getElementById('typingInput').focus();
  }

  renderQuestion() {
    const word = this.words[this.currentIndex];
    document.getElementById('typingPrompt').textContent = word.armenian;
    document.getElementById('typingInput').value = '';
    document.getElementById('typingInput').className = 'typing-input';
    document.getElementById('typingFeedback').textContent = '';
    document.getElementById('typingInput').focus();
  }

  updateProgress() {
    const total = this.words.length;
    const current = Math.min(this.currentIndex + 1, total);
    document.getElementById('typingProgress').textContent = `${current} / ${total}`;
  }

  _checkAnswer() {
    if (!this.isActive) return;
    const input = document.getElementById('typingInput').value.trim().toLowerCase();
    const word = this.words[this.currentIndex];
    const correct = word.english.toLowerCase();
    const fb = document.getElementById('typingFeedback');
    const inpEl = document.getElementById('typingInput');

    if (input === correct) {
      this.score.correct++;
      inpEl.className = 'typing-input correct';
      fb.className = 'typing-feedback correct';
      fb.textContent = 'Correct! +10 XP';
      setTimeout(() => this.next(), 800);
    } else {
      this.score.wrong++;
      inpEl.className = 'typing-input wrong';
      fb.className = 'typing-feedback wrong';
      fb.textContent = `Wrong! Answer: ${word.english}`;
      setTimeout(() => {
        this.next();
        fb.textContent = '';
      }, 2000);
    }
  }

  _skip() {
    if (!this.isActive) return;
    this.score.wrong++;
    this.next();
  }

  showResults() {
    const total = this.score.correct + this.score.wrong;
    const pct = total > 0 ? Math.round((this.score.correct / total) * 100) : 0;
    document.getElementById('typingResultScore').textContent = `${this.score.correct} / ${total}`;
    document.getElementById('typingResultPct').textContent = `${pct}%`;
    document.getElementById('typingResult').style.display = 'flex';
  }
}

const typingMode = new TypingMode();
