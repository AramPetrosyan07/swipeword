class ListeningMode extends BaseMode {
  constructor() {
    super();
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btnListeningBack').addEventListener('click', () => this.back());
    document.getElementById('btnListeningReplay').addEventListener('click', () => this._speak());
    document.getElementById('btnListeningForgot').addEventListener('click', () => this._handleAnswer('forgot'));
    document.getElementById('btnListeningRemember').addEventListener('click', () => this._handleAnswer('remembered'));
    document.getElementById('btnListeningRetry').addEventListener('click', () => {
      document.getElementById('listeningResult').style.display = 'none';
      this.start(this.filter);
    });
    document.getElementById('btnListeningDone').addEventListener('click', () => this.back());
  }

  _showScreen() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-listening').classList.add('active');
    document.getElementById('listeningResult').style.display = 'none';
  }

  renderQuestion() {
    const word = this.words[this.currentIndex];
    document.getElementById('listeningWord').style.display = 'none';
    document.getElementById('listeningTranslation').style.display = 'none';
    document.getElementById('listeningSpeaker').style.display = 'block';
    document.getElementById('btnListeningReplay').style.display = 'block';
    setTimeout(() => this._speak(), 300);
  }

  updateProgress() {
    const total = this.words.length;
    const current = Math.min(this.currentIndex + 1, total);
    document.getElementById('listeningProgress').textContent = `${current} / ${total}`;
  }

  _speak() {
    const word = this.words[this.currentIndex];
    if (word && tts.speak) tts.speak(word.english);
  }

  _handleAnswer(status) {
    if (!this.isActive) return;
    const word = this.words[this.currentIndex];
    document.getElementById('listeningSpeaker').style.display = 'none';
    document.getElementById('btnListeningReplay').style.display = 'none';
    document.getElementById('listeningWord').textContent = word.english;
    document.getElementById('listeningWord').style.display = 'block';
    document.getElementById('listeningTranslation').textContent = word.armenian;
    document.getElementById('listeningTranslation').style.display = 'block';
    if (status === 'remembered') {
      this.score.correct++;
    } else {
      this.score.wrong++;
    }
    setTimeout(() => this.next(), 1500);
  }

  showResults() {
    const total = this.score.correct + this.score.wrong;
    const pct = total > 0 ? Math.round((this.score.correct / total) * 100) : 0;
    document.getElementById('listeningResultScore').textContent = `${this.score.correct} / ${total}`;
    document.getElementById('listeningResultPct').textContent = `${pct}%`;
    document.getElementById('listeningResult').style.display = 'flex';
  }
}

const listeningMode = new ListeningMode();
