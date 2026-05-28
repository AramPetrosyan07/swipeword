class ChallengeMode extends BaseMode {
  constructor() {
    super();
    this.timerInterval = null;
    this.timeLeft = 60;
    this.totalWords = 0;
    this.best = 0;
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btnChallengeBack').addEventListener('click', () => this.back());
    document.getElementById('btnChallengeFlip').addEventListener('click', () => this._flip());
    document.getElementById('btnChallengeForgot').addEventListener('click', () => this._handleSwipe('forgot'));
    document.getElementById('btnChallengeRemember').addEventListener('click', () => this._handleSwipe('remembered'));
    document.getElementById('btnChallengeRetry').addEventListener('click', () => {
      document.getElementById('challengeResult').style.display = 'none';
      this.start(this.filter, this.letter);
    });
    document.getElementById('btnChallengeDone').addEventListener('click', () => this.back());
  }

  start(filter, letter) {
    this.filter = filter || 'all';
    this.letter = letter || '';
    let words = appStore.getWordsForMode(this.filter);
    if (this.letter) {
      words = words.filter(
        (w) => w.english.charAt(0).toUpperCase() === this.letter.toUpperCase()
      );
    }
    if (words.length === 0) {
      alert('No words match this filter.');
      return false;
    }
    this.words = words;
    this.currentIndex = 0;
    this.score = { correct: 0, wrong: 0 };
    this.totalWords = 0;
    this.timeLeft = 60;
    this.isActive = true;
    this.best = appStore.data.challengeBest || 0;
    this._showScreen();
    this.renderQuestion();
    this._startTimer();
    return true;
  }

  _showScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-challenge').classList.add('active');
    document.getElementById('challengeResult').style.display = 'none';
    document.getElementById('challengeBestNew').style.display = 'none';
    this._resetCard();
    this._updateBestDisplay();
  }

  _resetCard() {
    const card = document.getElementById('challengeCard');
    card.classList.remove('flipped');
  }

  _updateBestDisplay() {
    document.getElementById('challengeBestIndicator').textContent = `Best: ${this.best}`;
  }

  renderQuestion() {
    if (this.currentIndex >= this.words.length) {
      this.currentIndex = 0;
    }
    const word = this.words[this.currentIndex];
    document.getElementById('challengeCardWord').textContent = word.english;
    document.getElementById('challengeCardTranslation').textContent = word.armenian;
    document.getElementById('challengeCardExample').textContent = word.example || '';
    document.getElementById('challengeCardLetter').textContent = word.english.charAt(0).toUpperCase();
    document.getElementById('challengeCardLetterBack').textContent = word.english.charAt(0).toUpperCase();
    this._resetCard();
    document.getElementById('challengeScore').textContent = `Words: ${this.totalWords}`;
  }

  _startTimer() {
    clearInterval(this.timerInterval);
    this._updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this._updateTimerDisplay();
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        this.finish();
      }
    }, 1000);
  }

  _updateTimerDisplay() {
    const el = document.getElementById('challengeTimer');
    el.textContent = this.timeLeft;
    el.classList.toggle('urgent', this.timeLeft <= 10);
  }

  _flip() {
    const card = document.getElementById('challengeCard');
    card.classList.toggle('flipped');
  }

  _handleSwipe(status) {
    if (!this.isActive) return;
    if (status === 'remembered') {
      this.score.correct++;
    } else {
      this.score.wrong++;
    }
    this.totalWords++;
    this.currentIndex++;
    this.renderQuestion();
  }

  finish() {
    this.isActive = false;
    const score = this.totalWords;
    if (score > this.best) {
      appStore.data.challengeBest = score;
      appStore.save();
      document.getElementById('challengeBestNew').style.display = 'block';
    }
    document.getElementById('challengeResultScore').textContent = `${score} words/min`;
    document.getElementById('challengeResult').style.display = 'flex';
  }

  back() {
    clearInterval(this.timerInterval);
    super.back();
  }
}

const challengeMode = new ChallengeMode();
