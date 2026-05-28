const MODES_CONFIG = [
  { id: 'typing', icon: '&#128221;', name: 'Type It', desc: 'Type the English word from its translation' },
  { id: 'speed', icon: '&#9889;', name: 'Speed Round', desc: 'Quick flashcards with a 5s countdown' },
  { id: 'listening', icon: '&#128266;', name: 'Listen', desc: 'Recognize the word by sound alone' },
  { id: 'multichoice', icon: '&#128214;', name: 'Multi Choice', desc: 'Pick the correct translation from 4 options' },
  { id: 'challenge', icon: '&#127942;', name: 'Challenge', desc: 'Review as many words as you can in 60s' },
  { id: 'story', icon: '&#128214;', name: 'Story Mode', desc: 'Read stories with your learned words' },
];

class ModesManager {
  constructor() {
    this.currentMode = null;
  }

  init() {
    this._bindEvents();
    this._renderGrid();
    this._renderLetterFilter();
  }

  _bindEvents() {
    document.getElementById('btnModes').addEventListener('click', () => this.open());
    document.getElementById('btnModesClose').addEventListener('click', () => this.close());
    document.getElementById('modesOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modesOverlay')) this.close();
    });
    document.getElementById('modesCollectionSelect').addEventListener('change', () => {});
  }

  _renderLetterFilter() {
    document.querySelector('.modes-letter-btn[data-letter=""]').addEventListener('click', (e) => {
      this._selectLetter(e.currentTarget);
    });
    const container = document.getElementById('modesLetterList');
    container.innerHTML = '';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const letter of letters) {
      const btn = document.createElement('button');
      btn.className = 'modes-letter-btn';
      btn.textContent = letter;
      btn.dataset.letter = letter;
      btn.addEventListener('click', () => this._selectLetter(btn));
      container.appendChild(btn);
    }
  }

  _selectLetter(btn) {
    document.querySelectorAll('.modes-letter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  }

  _renderGrid() {
    const grid = document.getElementById('modesGrid');
    grid.innerHTML = '';
    MODES_CONFIG.forEach((mode) => {
      const card = document.createElement('div');
      card.className = 'mode-card';
      card.dataset.mode = mode.id;
      card.innerHTML = `
        <div class="mode-card-icon">${mode.icon}</div>
        <div class="mode-card-name">${mode.name}</div>
        <div class="mode-card-desc">${mode.desc}</div>
        <button class="btn btn-primary mode-card-btn" data-mode="${mode.id}">Play</button>
      `;
      card.querySelector('.mode-card-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._launchMode(mode.id);
      });
      card.addEventListener('click', () => this._launchMode(mode.id));
      grid.appendChild(card);
    });
  }

  _launchMode(modeId) {
    const filter = document.getElementById('modesCollectionSelect').value;
    const activeLetter = document.querySelector('.modes-letter-btn.active');
    const letter = activeLetter ? activeLetter.dataset.letter : '';
    const words = appStore.getAllWords();
    if (words.length === 0) {
      alert('Please import words first!');
      return;
    }
    this.close();
    switch (modeId) {
      case 'typing': typingMode.start(filter, letter); break;
      case 'speed': speedMode.start(filter, letter); break;
      case 'listening': listeningMode.start(filter, letter); break;
      case 'multichoice': multichoiceMode.start(filter, letter); break;
      case 'challenge': challengeMode.start(filter, letter); break;
      case 'story': storyMode.start(filter, letter); break;
    }
  }

  open() {
    const words = appStore.getAllWords();
    if (words.length === 0) {
      alert('Please import words first!');
      return;
    }
    document.getElementById('modesOverlay').style.display = 'flex';
  }

  close() {
    document.getElementById('modesOverlay').style.display = 'none';
  }
}

const modesManager = new ModesManager();
