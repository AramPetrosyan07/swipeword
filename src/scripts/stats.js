class StatsManager {
  constructor() {
    this._bindEvents();
  }

  _bindEvents() {
    document.querySelectorAll('.stat-card[data-stat]').forEach((card) => {
      card.addEventListener('click', () => {
        const stat = card.dataset.stat;
        this._showWordList(stat);
      });
    });

    document.getElementById('btnWordListBack').addEventListener('click', () => {
      this._hideWordList();
    });
  }

  show() {
    const stats = appStore.getStats();
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statRemembered').textContent = stats.remembered;
    document.getElementById('statForgotten').textContent = stats.forgotten;
    document.getElementById('statAccuracy').textContent = stats.accuracy + '%';
    document.getElementById('statStreak').textContent = stats.streak;
    document.getElementById('statSessions').textContent = stats.sessions;
    this._hideWordList();
  }

  _showWordList(stat) {
    let words = [];
    let title = '';

    switch (stat) {
      case 'total':
        words = appStore.getAllWords();
        title = `All Words (${words.length})`;
        break;
      case 'remembered':
        words = appStore.getAllWords().filter((w) => w.status === 'remembered');
        title = `Remembered (${words.length})`;
        break;
      case 'forgotten':
        words = appStore.getAllWords().filter((w) => w.status === 'forgotten');
        title = `Forgotten (${words.length})`;
        break;
      default:
        return;
    }

    document.getElementById('statsContainer').style.display = 'none';
    document.querySelector('#screen-stats .stats-actions').style.display = 'none';
    document.getElementById('wordListTitle').textContent = title;

    const container = document.getElementById('wordListItems');
    container.innerHTML = '';

    if (words.length === 0) {
      container.innerHTML = '<div class="word-list-empty">No words found</div>';
    } else {
      words.forEach((w) => {
        const item = document.createElement('div');
        item.className = 'word-list-item';
        item.innerHTML = `
          <div class="word-list-item-english">${w.english}</div>
          <div class="word-list-item-armenian">${w.armenian}</div>
        `;
        container.appendChild(item);
      });
    }

    document.getElementById('wordList').style.display = 'flex';
  }

  _hideWordList() {
    document.getElementById('statsContainer').style.display = 'grid';
    document.querySelector('#screen-stats .stats-actions').style.display = 'block';
    document.getElementById('wordList').style.display = 'none';
  }
}

const statsManager = new StatsManager();
