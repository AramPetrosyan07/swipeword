const ALPHABETS = [
  {
    id: 'hy',
    name: 'Armenian Alphabet',
    lang: 'hy-AM',
    letters: [
      {"char":"ա","uppercase":"Ա","ru":"а","en":"a","image":"assets/alphabet/hy/ա.png","example":"assets/examples/առյուծ.jpg","label":{"hy":"առյուծ","en":"Lion","ru":"Лев"}},
      {"char":"բ","uppercase":"Բ","ru":"б","en":"b","image":"assets/alphabet/hy/բ.png","example":"assets/examples/բանան.jpg","label":{"hy":"բանան","en":"Banana","ru":"Банан"}},
      {"char":"գ","uppercase":"Գ","ru":"г","en":"g","image":"assets/alphabet/hy/գ.png","example":"assets/examples/գնդակ.jpg","label":{"hy":"գնդակ","en":"Ball","ru":"Мяч"}},
      {"char":"դ","uppercase":"Դ","ru":"д","en":"d","image":"assets/alphabet/hy/դ.png","example":"assets/examples/դանակ.jpg","label":{"hy":"դանակ","en":"Knife","ru":"Нож"}},
      {"char":"ե","uppercase":"Ե","ru":"е","en":"e","image":"assets/alphabet/hy/ե.png","example":"assets/examples/եղնիկ.jpg","label":{"hy":"եղնիկ","en":"Deer","ru":"Олень"}},
      {"char":"զ","uppercase":"Զ","ru":"з","en":"z","image":"assets/alphabet/hy/զ.png","example":"assets/examples/զատիկ.jpg","label":{"hy":"զատիկ","en":"Easter","ru":"Пасха"}},
      {"char":"է","uppercase":"Է","ru":"","en":"é","image":"assets/alphabet/hy/է.png","example":"assets/examples/էներգիա.jpg","label":{"hy":"էներգիա","en":"Energy","ru":"Энергия"}},
      {"char":"ը","uppercase":"Ը","ru":"","en":"","image":"assets/alphabet/hy/ը.png","example":"assets/examples/ընձուղտ.avif","label":{"hy":"ընձուղտ","en":"Giraffe","ru":"Жираф"}},
      {"char":"թ","uppercase":"Թ","ru":"","en":"th","image":"assets/alphabet/hy/թ.png","example":"assets/examples/թութակ.jpg","label":{"hy":"թութակ","en":"Parrot","ru":"Попугай"}},
      {"char":"ժ","uppercase":"Ժ","ru":"ж","en":"zh","image":"assets/alphabet/hy/ժ.png","example":"assets/examples/ժամացույց.jpg","label":{"hy":"ժամացույց","en":"Clock","ru":"Часы"}},
      {"char":"ի","uppercase":"Ի","ru":"и","en":"i","image":"assets/alphabet/hy/ի.png","example":"assets/examples/ինտերնետ.jpg","label":{"hy":"ինտերնետ","en":"Internet","ru":"Интернет"}},
      {"char":"լ","uppercase":"Լ","ru":"л","en":"l","image":"assets/alphabet/hy/լ.jpg","example":"assets/examples/լուսին.jpg","label":{"hy":"լուսին","en":"Moon","ru":"Луна"}},
      {"char":"խ","uppercase":"Խ","ru":"х","en":"kh","image":"assets/alphabet/hy/խ.png","example":"assets/examples/խաղող.jpg","label":{"hy":"խաղող","en":"Grape","ru":"Виноград"}},
      {"char":"ծ","uppercase":"Ծ","ru":"ц","en":"ts","image":"assets/alphabet/hy/ծ.png","example":"assets/examples/ծիրան.webp","label":{"hy":"ծիրան","en":"Apricot","ru":"Абрикос"}},
      {"char":"կ","uppercase":"Կ","ru":"к","en":"k","image":"assets/alphabet/hy/կ.jpg","example":"assets/examples/կրակ.jpg","label":{"hy":"կրակ","en":"Fire","ru":"Огонь"}},
      {"char":"հ","uppercase":"Հ","ru":"","en":"h","image":"assets/alphabet/hy/հ.jpg","example":"assets/examples/hեծանիվ.webp","label":{"hy":"hեծանիվ","en":"Bicycle","ru":"Велосипед"}},
      {"char":"ձ","uppercase":"Ձ","ru":"дз","en":"dz","image":"assets/alphabet/hy/ձ.jpg","example":"assets/examples/ձուկ.jpg","label":{"hy":"ձուկ","en":"Fish","ru":"Рыба"}},
      {"char":"ղ","uppercase":"Ղ","ru":"","en":"gh","image":"assets/alphabet/hy/ղ.jpg","example":"assets/examples/ղեկավար.jpg","label":{"hy":"ղեկավար","en":"Manager","ru":"Директор"}},
      {"char":"ճ","uppercase":"Ճ","ru":"","en":"ch","image":"assets/alphabet/hy/ճ.jpg","example":"assets/examples/ճանապարհ.jpg","label":{"hy":"ճանապարհ","en":"Road","ru":"Дорога"}},
      {"char":"մ","uppercase":"Մ","ru":"м","en":"m","image":"assets/alphabet/hy/մ.jpg","example":"assets/examples/մեքենա.jpg","label":{"hy":"մեքենա","en":"Car","ru":"Машина"}},
      {"char":"յ","uppercase":"Յ","ru":"й","en":"y","image":"assets/alphabet/hy/յ.jpg","example":"assets/examples/յասաման.jpg","label":{"hy":"յասաման","en":"Jasmine","ru":"Жасмин"}},
      {"char":"ն","uppercase":"Ն","ru":"н","en":"n","image":"assets/alphabet/hy/ն.jpg","example":"assets/examples/նկար.jpg","label":{"hy":"նկար","en":"Picture","ru":"Картина"}},
      {"char":"շ","uppercase":"Շ","ru":"ш","en":"sh","image":"assets/alphabet/hy/շ.jpg","example":"assets/examples/շուն.webp","label":{"hy":"շուն","en":"Dog","ru":"Собака"}},
      {"char":"ո","uppercase":"Ո","ru":"о","en":"o","image":"assets/alphabet/hy/ո.jpg","example":"assets/examples/ոզնի.jpg","label":{"hy":"ոզնի","en":"Hedgehog","ru":"Ёж"}},
      {"char":"ու","uppercase":"Ու","ru":"у","en":"u","image":"assets/alphabet/hy/ու.jpg","example":"assets/examples/ուղտ.webp","label":{"hy":"ուղտ","en":"Camel","ru":"Верблюд"}},
      {"char":"չ","uppercase":"Չ","ru":"ч","en":"ch","image":"assets/alphabet/hy/չ.jpg","example":"assets/examples/չարություն.jpg","label":{"hy":"չարություն","en":"Mischief","ru":"Зло"}},
      {"char":"պ","uppercase":"Պ","ru":"п","en":"p","image":"assets/alphabet/hy/պ.jpg","example":"assets/examples/պատ.jpg","label":{"hy":"պատ","en":"Wall","ru":"Стена"}},
      {"char":"ջ","uppercase":"Ջ","ru":"дж","en":"j","image":"assets/alphabet/hy/ջ.jpg","example":"assets/examples/ջուր.jpg","label":{"hy":"ջուր","en":"Water","ru":"Вода"}},
      {"char":"ռ","uppercase":"Ռ","ru":"р","en":"r","image":"assets/alphabet/hy/ռ.jpg","example":"assets/examples/ռիսկ.jpg","label":{"hy":"ռիսկ","en":"Risk","ru":"Риск"}},
      {"char":"ս","uppercase":"Ս","ru":"с","en":"s","image":"assets/alphabet/hy/ս.jpg","example":"assets/examples/սունկ.jpg","label":{"hy":"սունկ","en":"Mushroom","ru":"Гриб"}},
      {"char":"վ","uppercase":"Վ","ru":"в","en":"v","image":"assets/alphabet/hy/վ.jpg","example":"assets/examples/վարդ.jpg","label":{"hy":"վարդ","en":"Rose","ru":"Роза"}},
      {"char":"տ","uppercase":"Տ","ru":"т","en":"t","image":"assets/alphabet/hy/տ.jpg","example":"assets/examples/տուն.jpg","label":{"hy":"տուն","en":"House","ru":"Дом"}},
      {"char":"ր","uppercase":"Ր","ru":"","en":"r","image":"assets/alphabet/hy/ր.jpg","example":"assets/examples/րոպե.jpg","label":{"hy":"րոպե","en":"Minute","ru":"Минута"}},
      {"char":"ց","uppercase":"Ց","ru":"ц","en":"ts","image":"assets/alphabet/hy/ց.jpg","example":"assets/examples/ցուրտ.jpg","label":{"hy":"ցուրտ","en":"Cold","ru":"Холод"}},
      {"char":"փ","uppercase":"Փ","ru":"п","en":"p","image":"assets/alphabet/hy/փ.jpg","example":"assets/examples/փիղ.webp","label":{"hy":"փիղ","en":"Elephant","ru":"Слон"}},
      {"char":"ք","uppercase":"Ք","ru":"к","en":"k","image":"assets/alphabet/hy/ք.jpg","example":"assets/examples/քաղաք.jpeg","label":{"hy":"քաղաք","en":"City","ru":"Город"}},
      {"char":"օ","uppercase":"Օ","ru":"о","en":"o","image":"assets/alphabet/hy/օ.jpg","example":"assets/examples/օդանավ.jpg","label":{"hy":"օդանավ","en":"Airplane","ru":"Самолет"}},
      {"char":"ֆ","uppercase":"Ֆ","ru":"ф","en":"f","image":"assets/alphabet/hy/ֆ.jpg","example":"assets/examples/ֆուտբոլ.jpg","label":{"hy":"ֆուտբոլ","en":"Football","ru":"Футбол"}},
      {"char":"և","uppercase":"և","ru":"","en":"","image":"assets/alphabet/hy/և.jpg"}
    ],
  },
];

class AlphabetPage {
  constructor() {
    this.alphabet = ALPHABETS[0];
    this.current = 0;
    this._scrollTimer = null;
    this._voiceId = 0;
  }

  init() {
    this.trackEl = document.getElementById('alphabetTrack');
    this.dotsEl = document.getElementById('alphabetDots');
    this.counterEl = document.getElementById('alphabetCounter');
    if (!this.trackEl) return;

    this._voiceId = (window.appStore && appStore.data.ttsVoice != null) ? appStore.data.ttsVoice : 0;
    this._updateVoiceUi();

    document.getElementById('alphabetTitle').textContent = this.alphabet.name;
    this._buildSlides();
    this._buildDots();

    document.getElementById('btnAlphabetPrev').addEventListener('click', () => this.goTo(this.current - 1));
    document.getElementById('btnAlphabetNext').addEventListener('click', () => this.goTo(this.current + 1));
    document.getElementById('btnAlphabetSpeak').addEventListener('click', () => this.pronounce());

    const voiceBtn = document.getElementById('btnAlphabetVoice');
    const voiceMenu = document.getElementById('alphabetVoiceMenu');
    voiceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      voiceMenu.style.display = voiceMenu.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', (e) => {
      if (voiceMenu.style.display === 'flex' && !voiceMenu.contains(e.target) && e.target !== voiceBtn) {
        voiceMenu.style.display = 'none';
      }
    });
    voiceMenu.querySelectorAll('.yt-voice-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        this._voiceId = parseInt(opt.dataset.voice, 10);
        if (window.appStore) {
          appStore.data.ttsVoice = this._voiceId;
          appStore.save();
        }
        this._updateVoiceUi();
        voiceMenu.style.display = 'none';
      });
    });

    this.trackEl.addEventListener('scroll', () => {
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => this._syncFromScroll(), 80);
    });
    this._update();
    this._preloadTTS();
  }

  _updateVoiceUi() {
    const label = document.getElementById('alphabetVoiceLabel');
    document.querySelectorAll('#alphabetVoiceMenu .yt-voice-option').forEach((opt) => {
      const v = parseInt(opt.dataset.voice, 10);
      opt.classList.toggle('active', v === this._voiceId);
      if (v === this._voiceId && label) label.textContent = opt.textContent;
    });
  }

  open() {
    this.goTo(this.current);
  }

  pronounce() {
    const letter = this.alphabet.letters[this.current];
    const word = letter.label ? letter.label.hy : letter.char;
    this._speak(word, this.alphabet.lang);
  }

  _speak(word, lang) {
    lang = lang || this.alphabet.lang;
    if (window.electronAPI && window.electronAPI.ttsSpeak) {
      window.electronAPI.ttsSpeak(word, lang, this._voiceId).then((result) => {
        if (result && result.success) {
          const audio = new Audio('data:audio/mpeg;base64,' + result.audio);
          audio.play();
        } else {
          tts.speak(word, lang);
        }
      }).catch(() => {
        tts.speak(word, lang);
      });
    } else {
      tts.speak(word, lang);
    }
  }

  _preloadTTS() {
    if (!window.electronAPI || !window.electronAPI.ttsSpeak) return;
    for (const letter of this.alphabet.letters) {
      if (letter.label) {
        window.electronAPI.ttsSpeak(letter.label.hy, 'hy-AM', this._voiceId).catch(() => {});
        window.electronAPI.ttsSpeak(letter.label.en, 'en-US', this._voiceId).catch(() => {});
        window.electronAPI.ttsSpeak(letter.label.ru, 'ru-RU', this._voiceId).catch(() => {});
      } else {
        window.electronAPI.ttsSpeak(letter.char, this.alphabet.lang, this._voiceId).catch(() => {});
      }
    }
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

        if (letter.label) {
          const labelEl = document.createElement('div');
          labelEl.className = 'alphabet-slide-label';
          const hySpan = document.createElement('span');
          hySpan.className = 'label-hy clickable-label';
          hySpan.textContent = letter.label.hy;
          hySpan.addEventListener('click', (e) => {
            e.stopPropagation();
            this._speak(letter.label.hy, 'hy-AM');
          });
          const enSpan = document.createElement('span');
          enSpan.className = 'label-en clickable-label';
          enSpan.textContent = letter.label.en;
          enSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            this._speak(letter.label.en, 'en-US');
          });
          const ruSpan = document.createElement('span');
          ruSpan.className = 'label-ru clickable-label';
          ruSpan.textContent = letter.label.ru;
          ruSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            this._speak(letter.label.ru, 'ru-RU');
          });
          labelEl.appendChild(hySpan);
          labelEl.appendChild(enSpan);
          labelEl.appendChild(ruSpan);
          slide.appendChild(labelEl);
        }
      }

      const imgWrap = document.createElement('div');
      imgWrap.className = 'alphabet-slide-img-wrap';
      const img = document.createElement('img');
      img.src = letter.image;
      img.alt = letter.char;
      img.draggable = false;
      imgWrap.appendChild(img);

      const charRow = document.createElement('div');
      charRow.className = 'alphabet-slide-char-row';
      if (letter.uppercase) {
        const s = document.createElement('span');
        s.className = 'compare-letter compare-upper';
        s.textContent = letter.uppercase;
        charRow.appendChild(s);
      }
      const charEl = document.createElement('span');
      charEl.className = 'compare-letter compare-hy';
      charEl.textContent = letter.char;
      charRow.appendChild(charEl);
      if (letter.ru) {
        const s = document.createElement('span');
        s.className = 'compare-letter compare-ru';
        s.textContent = letter.ru;
        charRow.appendChild(s);
      }
      if (letter.en) {
        const s = document.createElement('span');
        s.className = 'compare-letter compare-en';
        s.textContent = letter.en;
        charRow.appendChild(s);
      }

      slide.appendChild(imgWrap);
      slide.appendChild(charRow);
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
