class ReviewManager {
  constructor() {
    this.words = [];
    this.currentIndex = 0;
    this.isActive = false;

    this.cardManager = new CardManager({
      cardEl: document.getElementById('reviewCard'),
      innerEl: document.getElementById('reviewCardInner'),
      wordEl: document.getElementById('reviewCardWord'),
      translationEl: document.getElementById('reviewCardTranslation'),
      exampleEl: document.getElementById('reviewCardExample'),
      letterEl: document.getElementById('reviewCardLetter'),
      letterBackEl: document.getElementById('reviewCardLetterBack'),
      russianEl: document.getElementById('reviewCardRussian'),
      russianExampleEl: document.getElementById('reviewCardRussianExample'),
      mode: 'review',
      onForgot: (word) => this._handleForgot(word),
      onRemember: (word) => this._handleRemember(word),
    });
  }

  start() {
    this.words = appStore.getForgottenWords();
    this.currentIndex = 0;

    if (this.words.length === 0) {
      document.getElementById('reviewContainer').style.display = 'none';
      document.getElementById('reviewEmpty').style.display = 'flex';
      return;
    }

    document.getElementById('reviewContainer').style.display = 'flex';
    document.getElementById('reviewEmpty').style.display = 'none';
    this.isActive = true;
    this._showCurrent();
  }

  _showCurrent() {
    if (this.currentIndex >= this.words.length) {
      this.isActive = false;
      document.getElementById('reviewContainer').style.display = 'none';
      document.getElementById('reviewEmpty').style.display = 'flex';
      document.getElementById('reviewEmpty').querySelector('p').textContent = 'Review complete!';
      return;
    }

    this.cardManager.show(this.words[this.currentIndex]);
  }

  _handleForgot(word) {
    appStore.markWord(word.id, 'forgotten');
    this.currentIndex++;
    this._showCurrent();
  }

  _handleRemember(word) {
    appStore.markWord(word.id, 'remembered');
    this.currentIndex++;
    this._showCurrent();
  }
}

const reviewManager = new ReviewManager();
