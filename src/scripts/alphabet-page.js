const ALPHABETS = [
  {
    id: 'hy',
    name: 'Armenian Alphabet',
    lang: 'hy-AM',
    letters: [
      { char: 'ա', image: 'assets/alphabet/hy/ա.png' },
      { char: 'բ', image: 'assets/alphabet/hy/բ.png' },
      { char: 'գ', image: 'assets/alphabet/hy/գ.png' },
      { char: 'դ', image: 'assets/alphabet/hy/դ.png' },
      { char: 'ե', image: 'assets/alphabet/hy/ե.png' },
      { char: 'զ', image: 'assets/alphabet/hy/զ.png' },
      { char: 'է', image: 'assets/alphabet/hy/է.png' },
      { char: 'ը', image: 'assets/alphabet/hy/ը.png' },
      { char: 'թ', image: 'assets/alphabet/hy/թ.png' },
      { char: 'ժ', image: 'assets/alphabet/hy/ժ.png' },
      { char: 'ի', image: 'assets/alphabet/hy/ի.png' },
      { char: 'լ', image: 'assets/alphabet/hy/լ.jpg' },
      { char: 'խ', image: 'assets/alphabet/hy/խ.png' },
      { char: 'ծ', image: 'assets/alphabet/hy/ծ.png' },
      { char: 'կ', image: 'assets/alphabet/hy/կ.jpg' },
      { char: 'հ', image: 'assets/alphabet/hy/հ.jpg' },
      { char: 'ձ', image: 'assets/alphabet/hy/ձ.jpg' },
      { char: 'ղ', image: 'assets/alphabet/hy/ղ.jpg' },
      { char: 'ճ', image: 'assets/alphabet/hy/ճ.jpg' },
      { char: 'մ', image: 'assets/alphabet/hy/մ.jpg' },
      { char: 'յ', image: 'assets/alphabet/hy/յ.jpg' },
      { char: 'ն', image: 'assets/alphabet/hy/ն.jpg' },
      { char: 'շ', image: 'assets/alphabet/hy/շ.jpg' },
      { char: 'ո', image: 'assets/alphabet/hy/ո.jpg' },
      { char: 'ու', image: 'assets/alphabet/hy/ու.jpg' },
      { char: 'չ', image: 'assets/alphabet/hy/չ.jpg' },
      { char: 'պ', image: 'assets/alphabet/hy/պ.jpg' },
      { char: 'ջ', image: 'assets/alphabet/hy/ջ.jpg' },
      { char: 'ռ', image: 'assets/alphabet/hy/ռ.jpg' },
      { char: 'ս', image: 'assets/alphabet/hy/ս.jpg' },
      { char: 'վ', image: 'assets/alphabet/hy/վ.jpg' },
      { char: 'տ', image: 'assets/alphabet/hy/տ.jpg' },
      { char: 'ր', image: 'assets/alphabet/hy/ր.jpg' },
      { char: 'ց', image: 'assets/alphabet/hy/ց.jpg' },
      { char: 'փ', image: 'assets/alphabet/hy/փ.jpg' },
      { char: 'ք', image: 'assets/alphabet/hy/ք.jpg' },
      { char: 'օ', image: 'assets/alphabet/hy/օ.jpg' },
      { char: 'ֆ', image: 'assets/alphabet/hy/ֆ.jpg' },
      { char: 'և', image: 'assets/alphabet/hy/և.jpg' },
    ],
  },
];

class AlphabetPage {
  constructor() {
    this.alphabet = ALPHABETS[0];
    this.current = 0;
    this._scrollTimer = null;
  }

  init() {
    this.trackEl = document.getElementById('alphabetTrack');
    this.dotsEl = document.getElementById('alphabetDots');
    this.counterEl = document.getElementById('alphabetCounter');
    if (!this.trackEl) return;

    document.getElementById('alphabetTitle').textContent = this.alphabet.name;
    this._buildSlides();
    this._buildDots();

    document.getElementById('btnAlphabetPrev').addEventListener('click', () => this.goTo(this.current - 1));
    document.getElementById('btnAlphabetNext').addEventListener('click', () => this.goTo(this.current + 1));
    document.getElementById('btnAlphabetSpeak').addEventListener('click', () => this.pronounce());

    this.trackEl.addEventListener('scroll', () => {
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => this._syncFromScroll(), 80);
    });
    this._update();
  }

  open() {
    this.goTo(this.current);
  }

  pronounce() {
    const letter = this.alphabet.letters[this.current];
    tts.speak(letter.char, this.alphabet.lang);
  }

  goTo(index) {
    index = Math.max(0, Math.min(this.alphabet.letters.length - 1, index));
    this.current = index;
    const slide = this.trackEl.children[index];
    if (slide) {
      this.trackEl.scrollTo({ left: slide.offsetLeft - (this.trackEl.clientWidth - slide.clientWidth) / 2, behavior: 'smooth' });
    }
    this._update();
  }

  _buildSlides() {
    this.alphabet.letters.forEach((letter, i) => {
      const slide = document.createElement('div');
      slide.className = 'alphabet-slide';
      slide.dataset.index = i;

      const imgWrap = document.createElement('div');
      imgWrap.className = 'alphabet-slide-img-wrap';
      const img = document.createElement('img');
      img.src = letter.image;
      img.alt = letter.char;
      img.draggable = false;
      imgWrap.appendChild(img);

      const charEl = document.createElement('span');
      charEl.className = 'alphabet-slide-char';
      charEl.textContent = letter.char;

      slide.appendChild(imgWrap);
      slide.appendChild(charEl);
      slide.addEventListener('click', () => {
        if (i !== this.current) this.goTo(i);
        else this.pronounce();
      });
      this.trackEl.appendChild(slide);
    });
  }

  _buildDots() {
    this.alphabet.letters.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'alphabet-dot';
      dot.title = this.alphabet.letters[i].char;
      dot.addEventListener('click', () => this.goTo(i));
      this.dotsEl.appendChild(dot);
    });
  }

  _syncFromScroll() {
    const center = this.trackEl.scrollLeft + this.trackEl.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(this.trackEl.children).forEach((slide, i) => {
      const c = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(c - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best !== this.current) {
      this.current = best;
      this._update();
    }
  }

  _update() {
    const total = this.alphabet.letters.length;
    this.counterEl.textContent = `${this.current + 1} / ${total}`;
    Array.from(this.trackEl.children).forEach((slide, i) => {
      slide.classList.toggle('active', i === this.current);
    });
    Array.from(this.dotsEl.children).forEach((dot, i) => {
      dot.classList.toggle('active', i === this.current);
    });
    document.getElementById('btnAlphabetPrev').disabled = this.current === 0;
    document.getElementById('btnAlphabetNext').disabled = this.current === total - 1;
  }
}

const alphabetPage = new AlphabetPage();
