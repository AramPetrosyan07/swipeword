const ALPHABETS = [
  {
    id: 'hy',
    name: 'Armenian Alphabet',
    lang: 'hy-AM',
    letters: [
      { char: "ա", image: "assets/alphabet/hy/ա.png", example: "assets/examples/առյուծ.jpg" },
      { char: "բ", image: "assets/alphabet/hy/բ.png", example: "assets/examples/բանան.jpg" },
      { char: "գ", image: "assets/alphabet/hy/գ.png", example: "assets/examples/գնդակ.jpg" },
      { char: "դ", image: "assets/alphabet/hy/դ.png", example: "assets/examples/դանակ.jpg" },
      { char: "ե", image: "assets/alphabet/hy/ե.png", example: "assets/examples/եղնիկ.jpg" },
      { char: "զ", image: "assets/alphabet/hy/զ.png", example: "assets/examples/զատիկ.jpg" },
      { char: "է", image: "assets/alphabet/hy/է.png", example: "assets/examples/էներգիա.jpg" },
      { char: "ը", image: "assets/alphabet/hy/ը.png", example: "assets/examples/ընձուղտ.avif" },
      { char: "թ", image: "assets/alphabet/hy/թ.png", example: "assets/examples/թութակ.jpg" },
      { char: "ժ", image: "assets/alphabet/hy/ժ.png", example: "assets/examples/ժամացույց.jpg" },
      { char: "ի", image: "assets/alphabet/hy/ի.png", example: "assets/examples/ինտերնետ.jpg" },
      { char: "լ", image: "assets/alphabet/hy/լ.jpg", example: "assets/examples/լուսին.jpg" },
      { char: "խ", image: "assets/alphabet/hy/խ.png", example: "assets/examples/խաղող.jpg" },
      { char: "ծ", image: "assets/alphabet/hy/ծ.png", example: "assets/examples/ծիրան.webp" },
      { char: "կ", image: "assets/alphabet/hy/կ.jpg", example: "assets/examples/կրակ.jpg" },
      { char: "հ", image: "assets/alphabet/hy/հ.jpg", example: "assets/examples/hեծանիվ.webp" },
      { char: "ձ", image: "assets/alphabet/hy/ձ.jpg", example: "assets/examples/ձուկ.jpg" },
      { char: "ղ", image: "assets/alphabet/hy/ղ.jpg", example: "assets/examples/ղեկավար.jpg" },
      { char: "ճ", image: "assets/alphabet/hy/ճ.jpg", example: "assets/examples/ճանապարհ.jpg" },
      { char: "մ", image: "assets/alphabet/hy/մ.jpg", example: "assets/examples/մեքենա.jpg" },
      { char: "յ", image: "assets/alphabet/hy/յ.jpg", example: "assets/examples/յասաման.jpg" },
      { char: "ն", image: "assets/alphabet/hy/ն.jpg", example: "assets/examples/նկար.jpg" },
      { char: "շ", image: "assets/alphabet/hy/շ.jpg", example: "assets/examples/շուն.webp" },
      { char: "ո", image: "assets/alphabet/hy/ո.jpg", example: "assets/examples/ոզնի.jpg" },
      { char: "ու", image: "assets/alphabet/hy/ու.jpg", example: "assets/examples/ուղտ.webp" },
      { char: "չ", image: "assets/alphabet/hy/չ.jpg", example: "assets/examples/չարություն.jpg" },
      { char: "պ", image: "assets/alphabet/hy/պ.jpg", example: "assets/examples/պատ.jpg" },
      { char: "ջ", image: "assets/alphabet/hy/ջ.jpg", example: "assets/examples/ջուր.jpg" },
      { char: "ռ", image: "assets/alphabet/hy/ռ.jpg", example: "assets/examples/ռիսկ.jpg" },
      { char: "ս", image: "assets/alphabet/hy/ս.jpg", example: "assets/examples/սունկ.jpg" },
      { char: "վ", image: "assets/alphabet/hy/վ.jpg", example: "assets/examples/վարդ.jpg" },
      { char: "տ", image: "assets/alphabet/hy/տ.jpg", example: "assets/examples/տուն.jpg" },
      { char: "ր", image: "assets/alphabet/hy/ր.jpg", example: "assets/examples/րոպե.jpg" },
      { char: "ց", image: "assets/alphabet/hy/ց.jpg", example: "assets/examples/ցուրտ.jpg" },
      { char: "փ", image: "assets/alphabet/hy/փ.jpg", example: "assets/examples/փիղ.webp" },
      { char: "ք", image: "assets/alphabet/hy/ք.jpg", example: "assets/examples/քաղաք.jpeg" },
      { char: "օ", image: "assets/alphabet/hy/օ.jpg", example: "assets/examples/օդանավ.jpg" },
      { char: "ֆ", image: "assets/alphabet/hy/ֆ.jpg", example: "assets/examples/ֆուտբոլ.jpg" },
      { char: "և", image: "assets/alphabet/hy/և.jpg" },
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

      if (letter.example) {
        const exampleWrap = document.createElement('div');
        exampleWrap.className = 'alphabet-slide-example-wrap';
        const exampleImg = document.createElement('img');
        exampleImg.src = letter.example;
        exampleImg.alt = letter.char;
        exampleImg.draggable = false;
        exampleWrap.appendChild(exampleImg);
        slide.appendChild(exampleWrap);
      }

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
