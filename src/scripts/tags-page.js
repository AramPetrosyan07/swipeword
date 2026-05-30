class TagsPage {
  constructor() {
    this.currentTag = null;
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btnTagsBack').addEventListener('click', () => this.back());
    document.getElementById('btnTagPractice').addEventListener('click', () => this._startPractice());
  }

  back() {
    if (this.currentTag) {
      this._showGrid();
    } else {
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
      document.getElementById('screen-learn').classList.add('active');
      if (typeof app !== 'undefined' && app._showCurrentCard) app._showCurrentCard();
    }
  }

  show() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-tags').classList.add('active');
    this._showGrid();
  }

  showTag(tagName) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-tags').classList.add('active');
    this._showTagWords(tagName);
  }

  _showGrid() {
    this.currentTag = null;
    document.getElementById('tagGrid').style.display = 'flex';
    document.getElementById('tagWordList').style.display = 'none';

    const container = document.getElementById('tagGridItems');
    container.innerHTML = '';

    const tagNames = appStore.getAllTagNames().sort();
    tagNames.forEach((name) => {
      const tag = appStore.tags[name];
      const words = appStore.getWordsByTag(name);
      const remembered = words.filter((w) => w.status === 'remembered').length;

      const card = document.createElement('div');
      card.className = 'tag-grid-card';
      card.innerHTML = `
        <div class="tag-grid-icon">${tag.icon || '📌'}</div>
        <div class="tag-grid-name">${tag.label}</div>
        <div class="tag-grid-count">${words.length} words</div>
        <div class="tag-grid-progress">${remembered}/${words.length} mastered</div>
      `;
      card.addEventListener('click', () => this._showTagWords(name));
      container.appendChild(card);
    });
  }

  _showTagWords(tagName) {
    this.currentTag = tagName;
    const tag = appStore.tags[tagName];
    document.getElementById('tagGrid').style.display = 'none';
    document.getElementById('tagWordList').style.display = 'flex';
    document.getElementById('tagWordListTitle').textContent = `${tag.icon || ''} ${tag.label}`;

    const words = appStore.getWordsByTag(tagName);
    const container = document.getElementById('tagWordListItems');
    container.innerHTML = '';

    if (words.length === 0) {
      container.innerHTML = '<div class="tag-word-list-empty">No words in this tag</div>';
      return;
    }

    const remembered = words.filter((w) => w.status === 'remembered').length;
    document.getElementById('tagWordListProgress').textContent = `${remembered}/${words.length} mastered`;

    words.forEach((word) => {
      const item = document.createElement('div');
      item.className = 'tag-word-item';
      const statusClass = word.status === 'remembered' ? 'tag-word-status-remembered'
        : word.status === 'forgotten' ? 'tag-word-status-forgotten'
        : 'tag-word-status-unknown';
      item.innerHTML = `
        <div class="tag-word-info">
          <div class="tag-word-english">${word.english}</div>
          <div class="tag-word-armenian">${word.armenian}</div>
        </div>
        <div class="tag-word-status ${statusClass}">${word.status === 'remembered' ? '✓' : word.status === 'forgotten' ? '✗' : '–'}</div>
      `;
      container.appendChild(item);
    });
  }

  _startPractice() {
    if (!this.currentTag) return;
    const words = appStore.getWordsByTag(this.currentTag);
    if (words.length === 0) return;

    const screenOrder = words.filter((w) => w.nextReview <= new Date().toISOString().split('T')[0]);
    app.words = words;
    app.filterLetter = null;
    app.sessionHistory = [];
    app._buildQueue();
    app._showLearnScreen();
  }
}

const tagsPage = new TagsPage();
