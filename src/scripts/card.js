const TYPE_COLORS = {
  noun:       { light: { bg: '#D6E8F7', border: '#B0C4DE' }, dark: { bg: '#1a2a45', border: '#2a4a6e' } },
  verb:       { light: { bg: '#D4EDDA', border: '#A3C9A8' }, dark: { bg: '#1a3a25', border: '#2a5a3a' } },
  adjective:  { light: { bg: '#FFE2CC', border: '#E6B88A' }, dark: { bg: '#3a2a15', border: '#5a4020' } },
  adverb:     { light: { bg: '#F8D7DA', border: '#E6A8AC' }, dark: { bg: '#3a1a1a', border: '#5a2a2a' } },
  preposition:{ light: { bg: '#E8D5F5', border: '#C9A8E0' }, dark: { bg: '#2a1a3a', border: '#4a2a5a' } },
  phrase:     { light: { bg: '#D1ECF1', border: '#A3C9D4' }, dark: { bg: '#1a3a3a', border: '#2a5a5a' } },
  conjunction:{ light: { bg: '#FFF3CD', border: '#E6D68A' }, dark: { bg: '#3a3a1a', border: '#5a5a2a' } },
  determiner: { light: { bg: '#E2E3E5', border: '#C4C6C8' }, dark: { bg: '#2a2a2a', border: '#4a4a4a' } },
  pronoun:    { light: { bg: '#F5D5E0', border: '#DBA8BC' }, dark: { bg: '#3a1a2a', border: '#5a2a40' } },
};

function getTypeColors(type) {
  return TYPE_COLORS[type] || null;
}

class CardManager {
  constructor(config) {
    this.cardEl = config.cardEl;
    this.innerEl = config.innerEl;
    this.wordEl = config.wordEl;
    this.translationEl = config.translationEl;
    this.exampleEl = config.exampleEl;
    this.letterEl = config.letterEl;
    this.letterBackEl = config.letterBackEl;
    this.synonymsEl = config.synonymsEl || null;
    this.antonymsEl = config.antonymsEl || null;
    this.descriptionEl = config.descriptionEl || null;
    this.russianEl = config.russianEl || null;
    this.russianExampleEl = config.russianExampleEl || null;
    this.adjEl = config.adjEl || null;
    this.advEl = config.advEl || null;
    this.adjWrapperEl = config.adjWrapperEl || null;
    this.advWrapperEl = config.advWrapperEl || null;
    this.tagsEl = config.tagsEl || null;
    this.tagsFrontEl = config.tagsFrontEl || null;
    this.learnTranslationEl = config.learnTranslationEl || null;
    this.learnExampleEl = config.learnExampleEl || null;
    this.learnRussianExampleEl = config.learnRussianExampleEl || null;
    this.learnAdjEl = config.learnAdjEl || null;
    this.learnAdvEl = config.learnAdvEl || null;
    this.learnAdjWrapperEl = config.learnAdjWrapperEl || null;
    this.learnAdvWrapperEl = config.learnAdvWrapperEl || null;
    this.learnSynonymsEl = config.learnSynonymsEl || null;
    this.learnAntonymsEl = config.learnAntonymsEl || null;
    this.learnDescriptionEl = config.learnDescriptionEl || null;
    this.learnTagsEl = config.learnTagsEl || null;
    this.onTagClick = config.onTagClick || null;
    this.onForgot = config.onForgot || (() => {});
    this.onRemember = config.onRemember || (() => {});
    this.mode = config.mode || 'learn';
    this._learningMode = false;

    this.currentWord = null;
    this.isFlipped = false;
    this.isAnimating = false;
    this._enterTimer = null;

    this._setupSwipe();
  }

  setMode(isLearning) {
    this._learningMode = isLearning;
    this.cardEl.classList.toggle('learning-mode', isLearning);
  }

  show(word) {
    this.currentWord = word;
    this.isFlipped = false;
    this.isAnimating = false;
    this.cardEl.className = 'card';
    this.cardEl.dataset.type = word.type || '';
    clearTimeout(this._enterTimer);
    this.cardEl.classList.add('entering');
    this._enterTimer = setTimeout(() => {
      this.cardEl.classList.remove('entering');
    }, 380);
    this.innerEl.style.transform = '';
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
    if (this.adjEl) {
      this.adjEl.textContent = word.adjective ? `adj: ${word.adjective}` : '';
    }
    if (this.adjWrapperEl) {
      this.adjWrapperEl.style.display = word.adjective ? '' : 'none';
    }
    if (this.advEl) {
      this.advEl.textContent = word.adverb ? `adv: ${word.adverb}` : '';
    }
    if (this.advWrapperEl) {
      this.advWrapperEl.style.display = word.adverb ? '' : 'none';
    }
    this.translationEl.textContent = word.armenian;
    const examples = word.examples && word.examples.length > 0 ? word.examples : (word.example ? [word.example] : []);
    this.exampleEl.innerHTML = examples.map((ex, i) =>
      `<span class="card-example-item">${i + 1}. &ldquo;${ex}&rdquo;</span>`
    ).join('');

    if (this.synonymsEl) {
      this.synonymsEl.textContent = word.synonyms && word.synonyms.length > 0
        ? 'Synonyms: ' + word.synonyms.join(', ') : '';
    }
    if (this.antonymsEl) {
      this.antonymsEl.textContent = word.antonyms && word.antonyms.length > 0
        ? 'Antonyms: ' + word.antonyms.join(', ') : '';
    }
    if (this.descriptionEl) {
      this.descriptionEl.textContent = word.description || '';
    }

    if (this.learnTranslationEl) {
      this.learnTranslationEl.textContent = word.armenian;
    }
    if (this.learnExampleEl) {
      const examples = word.examples && word.examples.length > 0 ? word.examples : (word.example ? [word.example] : []);
      this.learnExampleEl.innerHTML = examples.map((ex, i) =>
        `<span class="card-example-item">${i + 1}. &ldquo;${ex}&rdquo;</span>`
      ).join('');
    }
    if (this.learnRussianExampleEl) {
      const russianEx = word.russian_example || [];
      this.learnRussianExampleEl.innerHTML = russianEx.length > 0
        ? russianEx.map((ex, i) => `<span class="card-russian-example-item">${i + 1}. &ldquo;${ex}&rdquo;</span>`).join('')
        : '';
    }
    if (this.learnAdjEl) {
      this.learnAdjEl.textContent = word.adjective ? `adj: ${word.adjective}` : '';
    }
    if (this.learnAdjWrapperEl) {
      this.learnAdjWrapperEl.style.display = word.adjective ? '' : 'none';
    }
    if (this.learnAdvEl) {
      this.learnAdvEl.textContent = word.adverb ? `adv: ${word.adverb}` : '';
    }
    if (this.learnAdvWrapperEl) {
      this.learnAdvWrapperEl.style.display = word.adverb ? '' : 'none';
    }
    if (this.learnSynonymsEl) {
      this.learnSynonymsEl.textContent = word.synonyms && word.synonyms.length > 0
        ? 'Synonyms: ' + word.synonyms.join(', ') : '';
    }
    if (this.learnAntonymsEl) {
      this.learnAntonymsEl.textContent = word.antonyms && word.antonyms.length > 0
        ? 'Antonyms: ' + word.antonyms.join(', ') : '';
    }
    if (this.learnDescriptionEl) {
      this.learnDescriptionEl.textContent = word.description || '';
    }

    const tagNames = appStore.getTagsForWord(word.id);

    const renderTags = (container) => {
      if (!container) return;
      if (tagNames.length === 0) {
        container.innerHTML = '';
        return;
      }
      container.innerHTML = tagNames.map((name) => {
        const tag = appStore.tags[name];
        return `<span class="card-tag-badge" data-tag="${name}">${tag.icon || ''} ${tag.label}</span>`;
      }).join('');
      container.querySelectorAll('.card-tag-badge').forEach((badge) => {
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.onTagClick) this.onTagClick(badge.dataset.tag);
        });
      });
    };

    renderTags(this.tagsFrontEl);
    renderTags(this.tagsEl);
    renderTags(this.learnTagsEl);

    const letter = word.english.charAt(0).toUpperCase();
    this.letterEl.textContent = letter;
    this.letterBackEl.textContent = letter;
  }

  flip() {
    if (this._learningMode) return;
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
    if (this._learningMode) return;
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
    if (this._learningMode) return;
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
      if (this._learningMode) return;
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
