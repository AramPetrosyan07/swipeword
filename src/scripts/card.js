class CardManager {
  constructor(config) {
    this.cardEl = config.cardEl;
    this.innerEl = config.innerEl;
    this.wordEl = config.wordEl;
    this.translationEl = config.translationEl;
    this.exampleEl = config.exampleEl;
    this.letterEl = config.letterEl;
    this.letterBackEl = config.letterBackEl;
    this.onForgot = config.onForgot || (() => {});
    this.onRemember = config.onRemember || (() => {});
    this.mode = config.mode || 'learn';

    this.currentWord = null;
    this.isFlipped = false;
    this.isAnimating = false;

    this._setupSwipe();
  }

  show(word) {
    this.currentWord = word;
    this.isFlipped = false;
    this.isAnimating = false;
    this.cardEl.className = 'card';
    this.innerEl.style.transform = '';
    this.wordEl.textContent = word.english;
    this.translationEl.textContent = word.armenian;
    this.exampleEl.textContent = word.example || '';
    const letter = word.english.charAt(0).toUpperCase();
    this.letterEl.textContent = letter;
    this.letterBackEl.textContent = letter;
  }

  flip() {
    if (this.isAnimating) return;
    this.isFlipped = !this.isFlipped;
    this.cardEl.classList.toggle('flipped', this.isFlipped);
  }

  resetFlip() {
    this.isFlipped = false;
    this.cardEl.classList.remove('flipped');
    this.innerEl.style.transform = '';
  }

  animateForgot() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.cardEl.classList.add('fly-left');
    setTimeout(() => {
      this.cardEl.classList.remove('fly-left');
      this.resetFlip();
      this.isAnimating = false;
      this.onForgot(this.currentWord);
    }, 400);
  }

  animateRemember() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.cardEl.classList.add('fly-right');
    setTimeout(() => {
      this.cardEl.classList.remove('fly-right');
      this.resetFlip();
      this.isAnimating = false;
      this.onRemember(this.currentWord);
    }, 400);
  }

  _setupSwipe() {
    let startX = null;
    let isDragging = false;
    let currentX = 0;

    const onStart = (e) => {
      if (this.isAnimating) return;
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      isDragging = false;
      currentX = 0;
    };

    const onMove = (e) => {
      if (startX === null) return;
      if (this.isAnimating) return;

      const point = e.touches ? e.touches[0] : e;
      const dx = point.clientX - startX;

      if (!isDragging && Math.abs(dx) > 5) {
        isDragging = true;
      }

      if (!isDragging) return;

      currentX = dx;
      const rotate = Math.min(Math.max(dx / 8, -25), 25);

      this.cardEl.style.transition = 'none';
      this.cardEl.style.transform = `translateX(${dx}px) rotate(${rotate}deg)`;

      this.cardEl.className = dx > 0 ? 'card swiping-right' : 'card swiping-left';
    };

    const onEnd = () => {
      if (startX === null) return;

      const wasDragging = isDragging;
      startX = null;
      isDragging = false;

      if (!wasDragging || this.isAnimating) return;

      const threshold = 100;
      this.cardEl.style.transition = 'transform 0.3s ease';

      if (currentX > threshold) {
        this.cardEl.style.transform = `translateX(${window.innerWidth}px) rotate(25deg)`;
        this.isAnimating = true;
        setTimeout(() => {
          this.cardEl.style.transform = '';
          this.cardEl.className = 'card';
          this.resetFlip();
          this.isAnimating = false;
          this.onRemember(this.currentWord);
        }, 300);
      } else if (currentX < -threshold) {
        this.cardEl.style.transform = `translateX(${-window.innerWidth}px) rotate(-25deg)`;
        this.isAnimating = true;
        setTimeout(() => {
          this.cardEl.style.transform = '';
          this.cardEl.className = 'card';
          this.resetFlip();
          this.isAnimating = false;
          this.onForgot(this.currentWord);
        }, 300);
      } else {
        this.cardEl.style.transform = '';
        this.cardEl.className = 'card';
      }
    };

    this.cardEl.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    this.cardEl.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
  }
}
