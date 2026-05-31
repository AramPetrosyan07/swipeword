class SelfTest {
  constructor() {
    this.words = [];
    this.currentIndex = 0;
    this.score = { remembered: 0, forgotten: 0 };
    this.isActive = false;
    this.isAnimating = false;

    this.cardEl = document.getElementById('selftestCard');
    this.innerEl = document.getElementById('selftestCardInner');
    this.wordEl = document.getElementById('selftestCardWord');
    this.translationEl = document.getElementById('selftestCardTranslation');
    this.exampleEl = document.getElementById('selftestCardExample');
    this.letterEl = document.getElementById('selftestCardLetter');
    this.letterBackEl = document.getElementById('selftestCardLetterBack');
    this.russianEl = document.getElementById('selftestCardRussian');
    this.russianExampleEl = document.getElementById('selftestCardRussianExample');
    this.progressEl = document.getElementById('selftestProgress');
    this.cardArea = this.cardEl.closest('.card-area');
    this.emptyEl = document.getElementById('selftestEmpty');
    this.resultEl = document.getElementById('selftestResult');
    this.resultScoreEl = document.getElementById('selftestResultScore');
    this.resultPctEl = document.getElementById('selftestResultPct');
    this.resultIconEl = document.getElementById('selftestResultIcon');
  }

  start() {
    const allWords = appStore.getAllWords();
    if (allWords.length === 0) {
      this._showEmpty();
      return;
    }

    this.words = [...allWords];
    this._shuffle(this.words);
    this.currentIndex = 0;
    this.score = { remembered: 0, forgotten: 0 };
    this.isActive = true;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-selftest').classList.add('active');

    this.resultEl.style.display = 'none';
    this.emptyEl.style.display = 'none';
    this.cardArea.style.display = 'flex';

    this.cardEl.style.transform = '';
    this.cardEl.style.opacity = '1';
    this.cardEl.style.transition = '';
    this.innerEl.classList.remove('flipped');

    this._showCard();
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  _showCard() {
    if (this.currentIndex >= this.words.length) {
      this._finish();
      return;
    }

    const word = this.words[this.currentIndex];

    this.letterEl.textContent = word.english.charAt(0).toUpperCase();
    this.letterBackEl.textContent = word.english.charAt(0).toUpperCase();
    this.cardEl.dataset.type = word.type || '';
    this.wordEl.textContent = word.english;
    if (this.russianEl) {
      this.russianEl.textContent = word.russian || '';
    }
    if (this.russianExampleEl) {
      const russianEx = word.russian_example || [];
      this.russianExampleEl.innerHTML = russianEx.length > 0
        ? russianEx.map((ex, i) => `<span class="card-russian-example-item">${i + 1}. &ldquo;${ex}&rdquo;</span>`).join('')
        : '';
    }
    this.translationEl.textContent = word.armenian;
    this.exampleEl.textContent = word.example || '';
    this.innerEl.classList.remove('flipped');
    this.currentWord = word;

    this.progressEl.textContent = `${this.currentIndex + 1} / ${this.words.length}`;
  }

  flip() {
    if (this.isAnimating) return;
    this.innerEl.classList.toggle('flipped');
  }

  handleRemember() {
    if (this.isAnimating || this.currentIndex >= this.words.length) return;
    this.score.remembered++;
    this._animateCard('right');
  }

  handleForgot() {
    if (this.isAnimating || this.currentIndex >= this.words.length) return;
    this.score.forgotten++;
    this._animateCard('left');
  }

  _animateCard(direction) {
    this.isAnimating = true;

    if (this.innerEl.classList.contains('flipped')) {
      this.innerEl.classList.remove('flipped');
    }

    this.cardEl.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
    this.cardEl.style.transform = `translateX(${direction === 'right' ? 300 : -300}px) rotate(${direction === 'right' ? 15 : -15}deg)`;
    this.cardEl.style.opacity = '0';

    setTimeout(() => {
      this.currentIndex++;
      this.cardEl.style.transition = 'none';
      this.cardEl.style.transform = `translateX(${direction === 'right' ? -300 : 300}px) rotate(0deg)`;
      this.cardEl.style.opacity = '0';

      void this.cardEl.offsetHeight;

      requestAnimationFrame(() => {
        this.cardEl.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
        this.cardEl.style.transform = 'translateX(0) rotate(0deg)';
        this.cardEl.style.opacity = '1';
        this.isAnimating = false;
        this._showCard();
      });
    }, 260);
  }

  _finish() {
    this.isActive = false;
    this.cardArea.style.display = 'none';
    this.resultEl.style.display = 'flex';

    const total = this.score.remembered + this.score.forgotten;
    this.resultScoreEl.textContent = `${this.score.remembered} / ${total}`;
    const pct = total > 0 ? Math.round((this.score.remembered / total) * 100) : 0;
    this.resultPctEl.textContent = `${pct}%`;

    if (pct >= 80) {
      this.resultIconEl.textContent = '🎉';
    } else if (pct >= 50) {
      this.resultIconEl.textContent = '👍';
    } else {
      this.resultIconEl.textContent = '📚';
    }
  }

  _showEmpty() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-selftest').classList.add('active');
    this.resultEl.style.display = 'none';
    this.cardArea.style.display = 'none';
    this.emptyEl.style.display = 'flex';
  }

  reset() {
    this.start();
  }
}

const selfTest = new SelfTest();
