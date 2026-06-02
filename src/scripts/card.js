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
    this.starEl = config.starEl || null;
    this.learnStarEl = config.learnStarEl || null;
    this.noteEl = config.noteEl || null;
    this.noteEmptyEl = config.noteEmptyEl || null;
    this.noteDisplayEl = config.noteDisplayEl || null;
    this.learnNoteEl = config.learnNoteEl || null;
    this.learnNoteEmptyEl = config.learnNoteEmptyEl || null;
    this.learnNoteDisplayEl = config.learnNoteDisplayEl || null;
    this.onNoteClick = config.onNoteClick || null;
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
    this._setupCopyDelegation();
  }

  setMode(isLearning) {
    this._learningMode = isLearning;
    this.cardEl.classList.toggle('learning-mode', isLearning);
  }

  updateStarIcon() {
    if (!this.currentWord) return;
    const isFav = appStore.isFavorite(this.currentWord.id);
    const icon = isFav ? '\u2605' : '\u2606';
    if (this.starEl) {
      this.starEl.innerHTML = icon;
      this.starEl.classList.toggle('is-favorite', isFav);
      this.starEl.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    }
    if (this.learnStarEl) {
      this.learnStarEl.innerHTML = icon;
      this.learnStarEl.classList.toggle('is-favorite', isFav);
      this.learnStarEl.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    }
  }

  toggleFavorite() {
    if (!this.currentWord) return;
    appStore.toggleFavorite(this.currentWord.id);
    this.updateStarIcon();
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
    this.wordEl.dataset.copy = word.english;
    if (this.russianEl) {
      this.russianEl.textContent = word.russian || '';
      this.russianEl.dataset.copy = word.russian || '';
    }
    if (this.russianExampleEl) {
      const russianEx = word.russian_example || [];
      this.russianExampleEl.innerHTML = russianEx.length > 0
        ? russianEx.map((ex, i) => `<span class="card-russian-example-item" data-copy="${ex.replace(/"/g, '&quot;')}">${i + 1}. &ldquo;${ex}&rdquo;</span>`).join('')
        : '';
    }
    if (this.adjEl) {
      this.adjEl.textContent = word.adjective ? `adj: ${word.adjective}` : '';
      this.adjEl.dataset.copy = word.adjective || '';
    }
    if (this.adjWrapperEl) {
      this.adjWrapperEl.style.display = word.adjective ? '' : 'none';
    }
    if (this.advEl) {
      this.advEl.textContent = word.adverb ? `adv: ${word.adverb}` : '';
      this.advEl.dataset.copy = word.adverb || '';
    }
    if (this.advWrapperEl) {
      this.advWrapperEl.style.display = word.adverb ? '' : 'none';
    }
    this.translationEl.textContent = word.armenian;
    this.translationEl.dataset.copy = word.armenian;
    const examples = word.examples && word.examples.length > 0 ? word.examples : (word.example ? [word.example] : []);
    this.exampleEl.innerHTML = examples.map((ex, i) =>
      `<span class="card-example-item" data-copy="${ex.replace(/"/g, '&quot;')}">${i + 1}. &ldquo;${ex}&rdquo;</span>`
    ).join('');

    if (this.synonymsEl) {
      const synText = word.synonyms && word.synonyms.length > 0
        ? word.synonyms.join(', ') : '';
      this.synonymsEl.textContent = synText ? 'Synonyms: ' + synText : '';
      this.synonymsEl.dataset.copy = synText;
    }
    if (this.antonymsEl) {
      const antText = word.antonyms && word.antonyms.length > 0
        ? word.antonyms.join(', ') : '';
      this.antonymsEl.textContent = antText ? 'Antonyms: ' + antText : '';
      this.antonymsEl.dataset.copy = antText;
    }
    if (this.descriptionEl) {
      this.descriptionEl.textContent = word.description || '';
      this.descriptionEl.dataset.copy = word.description || '';
    }

    if (this.learnTranslationEl) {
      this.learnTranslationEl.textContent = word.armenian;
      this.learnTranslationEl.dataset.copy = word.armenian;
    }
    if (this.learnExampleEl) {
      const examples = word.examples && word.examples.length > 0 ? word.examples : (word.example ? [word.example] : []);
      this.learnExampleEl.innerHTML = examples.map((ex, i) =>
        `<span class="card-example-item" data-copy="${ex.replace(/"/g, '&quot;')}">${i + 1}. &ldquo;${ex}&rdquo;</span>`
      ).join('');
    }
    if (this.learnRussianExampleEl) {
      const russianEx = word.russian_example || [];
      this.learnRussianExampleEl.innerHTML = russianEx.length > 0
        ? russianEx.map((ex, i) => `<span class="card-russian-example-item" data-copy="${ex.replace(/"/g, '&quot;')}">${i + 1}. &ldquo;${ex}&rdquo;</span>`).join('')
        : '';
    }
    if (this.learnAdjEl) {
      this.learnAdjEl.textContent = word.adjective ? `adj: ${word.adjective}` : '';
      this.learnAdjEl.dataset.copy = word.adjective || '';
    }
    if (this.learnAdjWrapperEl) {
      this.learnAdjWrapperEl.style.display = word.adjective ? '' : 'none';
    }
    if (this.learnAdvEl) {
      this.learnAdvEl.textContent = word.adverb ? `adv: ${word.adverb}` : '';
      this.learnAdvEl.dataset.copy = word.adverb || '';
    }
    if (this.learnAdvWrapperEl) {
      this.learnAdvWrapperEl.style.display = word.adverb ? '' : 'none';
    }
    if (this.learnSynonymsEl) {
      const synText = word.synonyms && word.synonyms.length > 0
        ? word.synonyms.join(', ') : '';
      this.learnSynonymsEl.textContent = synText ? 'Synonyms: ' + synText : '';
      this.learnSynonymsEl.dataset.copy = synText;
    }
    if (this.learnAntonymsEl) {
      const antText = word.antonyms && word.antonyms.length > 0
        ? word.antonyms.join(', ') : '';
      this.learnAntonymsEl.textContent = antText ? 'Antonyms: ' + antText : '';
      this.learnAntonymsEl.dataset.copy = antText;
    }
    if (this.learnDescriptionEl) {
      this.learnDescriptionEl.textContent = word.description || '';
      this.learnDescriptionEl.dataset.copy = word.description || '';
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

    const noteText = appStore.getNote(word.id);
    const renderNote = (displayEl, emptyEl) => {
      if (!displayEl && !emptyEl) return;
      if (noteText) {
        if (displayEl) {
          displayEl.textContent = noteText;
          displayEl.style.display = '';
        }
        if (emptyEl) emptyEl.style.display = 'none';
      } else {
        if (displayEl) displayEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
      }
    };
    renderNote(this.noteDisplayEl, this.noteEmptyEl);
    renderNote(this.learnNoteDisplayEl, this.learnNoteEmptyEl);

    if (this._noteClickBound) {
      if (this.noteEl) this.noteEl.removeEventListener('click', this._noteClickBound);
      if (this.learnNoteEl) this.learnNoteEl.removeEventListener('click', this._noteClickBound);
    }
    this._noteClickBound = () => { if (this.onNoteClick) this.onNoteClick(this.currentWord); };
    if (this.noteEl) this.noteEl.addEventListener('click', this._noteClickBound);
    if (this.learnNoteEl) this.learnNoteEl.addEventListener('click', this._noteClickBound);

    const letter = word.english.charAt(0).toUpperCase();
    const typeLabel = word.type || '';
    if (this.letterEl) {
      const letterText = this.letterEl.querySelector('.card-badge-letter');
      const typeText = this.letterEl.querySelector('.card-badge-type');
      if (letterText) letterText.textContent = letter;
      if (typeText) typeText.textContent = typeLabel;
    }
    if (this.letterBackEl) {
      const letterText = this.letterBackEl.querySelector('.card-badge-letter');
      const typeText = this.letterBackEl.querySelector('.card-badge-type');
      if (letterText) letterText.textContent = letter;
      if (typeText) typeText.textContent = typeLabel;
    }
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

  _setupCopyDelegation() {
    this.cardEl.addEventListener('click', (e) => {
      const target = e.target.closest('[data-copy]');
      if (!target) return;
      const text = target.dataset.copy || target.textContent.trim();
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        showCopyToast(text);
      }).catch(() => {});
    });
  }
}

function showCopyToast(text) {
  const toast = document.getElementById('copyToast');
  const textEl = document.getElementById('copyToastText');
  if (!toast || !textEl) return;
  const display = text.length > 60 ? text.substring(0, 57) + '...' : text;
  textEl.textContent = `Copied: ${display}`;
  toast.classList.add('visible');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2000);
}
