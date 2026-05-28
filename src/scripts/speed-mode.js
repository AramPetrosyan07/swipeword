class SpeedMode extends BaseMode {
  constructor() {
    super();
    this.timerInterval = null;
    this.timeLeft = 5;
    this.cardFlipped = false;
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btnSpeedBack').addEventListener('click', () => this.back());
    document.getElementById('btnSpeedFlip').addEventListener('click', () => this._flip());
    document.getElementById('btnSpeedForgot').addEventListener('click', () => this._handleAnswer('forgot'));
    document.getElementById('btnSpeedRemember').addEventListener('click', () => this._handleAnswer('remembered'));
    document.getElementById('btnSpeedRetry').addEventListener('click', () => {
      document.getElementById('speedResult').style.display = 'none';
      this.start(this.filter);
    });
    document.getElementById('btnSpeedDone').addEventListener('click', () => this.back());
  }

  start(filter) {
    if (!super.start(filter)) return;
    this.timeLeft = 5;
    this.cardFlipped = false;
  }

  _showScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-speed').classList.add('active');
    document.getElementById('speedResult').style.display = 'none';
    this._resetCard();
  }

  _resetCard() {
    const card = document.getElementById('speedCard');
    card.classList.remove('flipped');
    this.cardFlipped = false;
  }

  renderQuestion() {
    const word = this.words[this.currentIndex];
    document.getElementById('speedCardWord').textContent = word.english;
    document.getElementById('speedCardTranslation').textContent = word.armenian;
    document.getElementById('speedCardExample').textContent = word.example || '';
    document.getElementById('speedCardLetter').textContent = word.english.charAt(0).toUpperCase();
    document.getElementById('speedCardLetterBack').textContent = word.english.charAt(0).toUpperCase();
    this._resetCard();
    this.timeLeft = 5;
    this._startTimer();
  }

  updateProgress() {
    const total = this.words.length;
    const current = Math.min(this.currentIndex + 1, total);
    document.getElementById('speedProgress').textContent = `${current} / ${total}`;
  }

  _startTimer() {
    clearInterval(this.timerInterval);
    this._updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this._updateTimerDisplay();
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        if (!this.cardFlipped) this._flip();
        setTimeout(() => this._handleAnswer('forgot'), 800);
      }
    }, 1000);
  }

  _updateTimerDisplay() {
    const text = document.getElementById('speedTimerText');
    const fill = document.getElementById('speedTimerFill');
    text.textContent = Math.max(0, this.timeLeft);
    const circumference = 2 * Math.PI * 45;
    const offset = circumference * (1 - this.timeLeft / 5);
    fill.style.strokeDashoffset = offset;
    if (this.timeLeft <= 2) {
      fill.style.stroke = '#f44336';
    } else {
      fill.style.stroke = '';
    }
  }

  _flip() {
    const card = document.getElementById('speedCard');
    card.classList.toggle('flipped');
    this.cardFlipped = !this.cardFlipped;
  }

  _handleAnswer(status) {
    if (!this.isActive) return;
    clearInterval(this.timerInterval);
    if (status === 'remembered') {
      this.score.correct++;
    } else {
      this.score.wrong++;
    }
    setTimeout(() => this.next(), 300);
  }

  showResults() {
    const total = this.score.correct + this.score.wrong;
    const pct = total > 0 ? Math.round((this.score.correct / total) * 100) : 0;
    document.getElementById('speedResultScore').textContent = `${this.score.correct} / ${total}`;
    document.getElementById('speedResultPct').textContent = `${pct}%`;
    document.getElementById('speedResult').style.display = 'flex';
  }
}

const speedMode = new SpeedMode();
