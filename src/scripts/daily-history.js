class DailyHistory {
  constructor() {
    this.currentDate = null;
  }

  show() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-daily-history').classList.add('active');

    const input = document.getElementById('dailyDateInput');
    const today = new Date().toISOString().split('T')[0];
    input.value = today;
    input.max = today;
    this.currentDate = today;

    this._loadDate(today);
  }

  _loadDate(dateStr) {
    const data = appStore.getDayHistory(dateStr);
    this._renderList('dailyRememberedList', data.remembered, 'remembered');
    this._renderList('dailyForgottenList', data.forgotten, 'forgotten');
    document.getElementById('dailyRememberedCount').textContent = `${data.remembered.length} remembered`;
    document.getElementById('dailyForgottenCount').textContent = `${data.forgotten.length} forgotten`;
  }

  _renderList(containerId, entries, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (entries.length === 0) {
      container.innerHTML = `<div class="daily-list-empty">No words ${type === 'remembered' ? 'remembered' : 'forgotten'} this day</div>`;
      return;
    }

    entries.forEach(e => {
      const item = document.createElement('div');
      item.className = 'daily-list-item';
      item.innerHTML = `
        <span class="daily-list-item-english">${this._escape(e.english)}</span>
        <span class="daily-list-item-armenian">${this._escape(e.armenian)}</span>
      `;
      container.appendChild(item);
    });
  }

  _escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const dailyHistory = new DailyHistory();
