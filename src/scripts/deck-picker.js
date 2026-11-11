class DeckPicker {
  constructor() {
    this._categories = null;
    this._draggedId = null;
    this._bindEvents();
  }

  _icon(key) {
    const icons = {
      b2: '\uD83D\uDCD8',
      c1: '\uD83D\uDCD7',
      verb: '\uD83D\uDE4A',
      anatomy: '\uD83E\uDEC0',
      animals: '\uD83D\uDC3E',
      appearance: '\uD83D\uDC64',
      archaeology: '\u26CF\uFE0F',
      architecture: '\uD83C\uDFDB\uFE0F',
      art: '\uD83D\uDDBC\uFE0F',
      basic_verbs: '\uD83C\uDFC3',
      business: '\uD83D\uDCBC',
      career: '\uD83D\uDC54',
      character: '\uD83C\uDFAD',
      clothing: '\uD83D\uDC55',
      colors: '\uD83C\uDF08',
      computer: '\uD83D\uDCBB',
      construction: '\uD83C\uDFD7\uFE0F',
      ecology: '\uD83C\uDF3F',
      economy: '\uD83D\uDCC8',
      family: '\uD83D\uDC6A',
      food: '\uD83C\uDF55',
      furniture: '\uD83D\uDECB\uFE0F',
      geography: '\uD83D\uDDFA\uFE0F',
      health: '\uD83E\uDE7A',
      hobby: '\uD83E\uDDE9',
      home: '\uD83C\uDFE0',
      idioms: '\uD83D\uDCAC',
      irregular_verbs: '\uD83C\uDF00',
      legal_english: '\u2696\uFE0F',
      literature: '\uD83D\uDCDA',
      marketing: '\uD83D\uDCE3',
      mass_media: '\uD83D\uDCFA',
      math: '\u2797',
      military_weapons: '\uD83D\uDEE1\uFE0F',
      money: '\uD83D\uDCB0',
      movie: '\uD83C\uDFAC',
      music: '\uD83C\uDFB5',
      numbers: '\uD83D\uDD22',
      numbers_ordinals: '1\uFE0F\u20E3',
      oxford3000_a1: '\uD83C\uDF31',
      oxford3000_a2: '\uD83C\uDF3F',
      oxford3000_b1: '\uD83D\uDCD9',
      oxford3000_b2: '\uD83D\uDCD8',
      oxford5000_b2: '\uD83D\uDCD5',
      photography: '\uD83D\uDCF7',
      phrasal_verbs: '\uD83D\uDD17',
      politics: '\uD83D\uDDF3\uFE0F',
      psychology: '\uD83E\uDDE0',
      signs_of_zodiac: '\u2728',
      space: '\uD83D\uDE80',
      sport: '\u26BD',
      time: '\u23F0',
      time_days_of_week: '\uD83D\uDCC5',
      time_months: '\uD83D\uDDD3\uFE0F',
      time_seasons: '\uD83C\uDF42',
      top100: '\uD83D\uDD25',
      top1000: '\u26A1',
      top3000: '\uD83C\uDFAF',
      town: '\uD83C\uDFD8\uFE0F',
      transport: '\uD83D\uDE8C',
      travel: '\u2708\uFE0F',
    };
    return icons[key] || '\uD83D\uDCC1';
  }

  _hue(key) {
    const hues = {
      b2: 215, c1: 150, verb: 30,
      anatomy: 350, animals: 95, appearance: 310, archaeology: 35,
      architecture: 220, art: 290, basic_verbs: 15, business: 210,
      career: 195, character: 265, clothing: 330, colors: 55,
      computer: 200, construction: 45, ecology: 125, economy: 160,
      family: 5, food: 25, furniture: 40, geography: 185,
      health: 0, hobby: 280, home: 30, idioms: 340,
      irregular_verbs: 20, legal_english: 230, literature: 245,
      marketing: 50, mass_media: 295, math: 205, military_weapons: 0,
      money: 100, movie: 275, music: 305, numbers: 195,
      numbers_ordinals: 195, oxford3000_a1: 90, oxford3000_a2: 70,
      oxford3000_b1: 170, oxford3000_b2: 215, oxford5000_b2: 35,
      photography: 225, phrasal_verbs: 25, politics: 240,
      psychology: 285, signs_of_zodiac: 48, space: 250, sport: 130,
      time: 170, time_days_of_week: 170, time_months: 170,
      time_seasons: 15, top100: 12, top1000: 335, top3000: 270,
      town: 35, transport: 205, travel: 185,
    };
    if (hues[key] != null) return hues[key];
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
    return h;
  }

  _bindEvents() {
    document.getElementById('btnDecksBack').addEventListener('click', () => {
      if (typeof app !== 'undefined' && app._showReadHome) app._showReadHome();
    });
  }

  async show() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-decks').classList.add('active');
    await this._render();
  }

  async _getCategories() {
    if (this._categories) return this._categories;
    try {
      const res = await window.electronAPI.jsonListCategories();
      this._categories = (res && res.categories) || [];
    } catch (e) {
      this._categories = [];
    }
    return this._categories;
  }

  async _getDecks() {
    const cats = await this._getCategories();
    const decks = [
      { id: 'b2', name: 'B2', count: appStore.b2Dictionary.length },
      { id: 'c1', name: 'C1', count: appStore.c1Dictionary.length },
      { id: 'verb', name: 'Phrasal Verbs', count: appStore.verbDictionary.length },
      ...cats.map((c) => ({
        id: 'json:' + c.id,
        name: c.name_rus || c.id,
        count: c.word_count,
        file: c.file,
      })),
    ];
    const order = appStore.data.deckOrder || [];
    decks.forEach((d) => {
      const i = order.indexOf(d.id);
      d.pos = i === -1 ? order.length + decks.findIndex((x) => x.id === d.id) : i;
      d.favorite = appStore.isDeckFavorite(d.id);
    });
    decks.sort((a, b) => a.pos - b.pos);
    return decks;
  }

  async _render() {
    const container = document.getElementById('decksGridItems');
    const decks = await this._getDecks();
    const favs = decks.filter((d) => d.favorite);
    const rest = decks.filter((d) => !d.favorite);
    let html = '';
    if (favs.length > 0) {
      html += `<div class="deck-group-label fav">\u2605 Favorites</div>`;
      html += favs.map((d) => this._cardHtml(d)).join('');
      if (rest.length > 0) {
        html += `<div class="deck-group-label">All groups</div>`;
      }
    }
    html += rest.map((d) => this._cardHtml(d)).join('');
    container.innerHTML = html;
    this._bindCards(container);
    this._bindDrag(container);
  }

  _cardHtml(d) {
    const key = d.id.startsWith('json:') ? d.id.slice(5) : d.id;
    const count = d.count != null ? `${d.count} words` : '';
    return `
      <div class="deck-card${d.favorite ? ' deck-card-fav' : ''}" draggable="true" data-deck-id="${d.id}" style="--deck-hue:${this._hue(key)}">
        <button class="deck-card-fav-btn${d.favorite ? ' active' : ''}" data-deck-id="${d.id}" title="Toggle favorite">${d.favorite ? '\u2605' : '\u2606'}</button>
        <div class="deck-card-icon">${this._icon(key)}</div>
        <div class="deck-card-name">${this._esc(d.name)}</div>
        ${count ? `<div class="deck-card-count">${count}</div>` : ''}
      </div>
    `;
  }

  _bindCards(container) {
    container.querySelectorAll('.deck-card').forEach((card) => {
      const id = card.dataset.deckId;
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.deck-card-fav-btn')) return;
        if (typeof app !== 'undefined' && app.openDeck) {
          await app.openDeck(id);
        }
      });
    });
    container.querySelectorAll('.deck-card-fav-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await appStore.toggleDeckFavorite(btn.dataset.deckId);
        this._render();
      });
    });
  }

  _bindDrag(container) {
    container.querySelectorAll('.deck-card').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        this._draggedId = card.dataset.deckId;
        card.classList.add('deck-card-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', this._draggedId); } catch (err) {}
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('deck-card-dragging');
        this._draggedId = null;
        container.querySelectorAll('.deck-card-drop-before').forEach((el) =>
          el.classList.remove('deck-card-drop-before')
        );
      });
    });

    if (container._deckDragBound) return;
    container._deckDragBound = true;

    container.addEventListener('dragover', (e) => {
      if (!this._draggedId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const others = Array.from(container.querySelectorAll('.deck-card:not(.deck-card-dragging)'));
      const insertIndex = this._computeInsertIndex(others, e.clientX, e.clientY);
      const target = insertIndex < others.length ? others[insertIndex] : null;
      container.querySelectorAll('.deck-card-drop-before').forEach((el) =>
        el.classList.remove('deck-card-drop-before')
      );
      if (target) target.classList.add('deck-card-drop-before');
    });

    container.addEventListener('drop', async (e) => {
      if (!this._draggedId) return;
      e.preventDefault();
      await this._handleDrop(container, e.clientX, e.clientY);
    });
  }

  _computeInsertIndex(otherCards, x, y) {
    let bestIdx = -1;
    let bestDist = Infinity;
    let bestCx = 0;
    for (let i = 0; i < otherCards.length; i++) {
      const rect = otherCards[i].getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
        bestCx = cx;
      }
    }
    if (bestIdx === -1) return otherCards.length;
    return x < bestCx ? bestIdx : bestIdx + 1;
  }

  async _handleDrop(container, x, y) {
    const cards = Array.from(container.querySelectorAll('.deck-card'));
    const draggedId = this._draggedId;
    if (!cards.some((c) => c.dataset.deckId === draggedId)) return;

    const others = cards.filter((c) => c.dataset.deckId !== draggedId);
    const othersIds = others.map((c) => c.dataset.deckId);
    const firstNonFavIdx = othersIds.findIndex((id) => !appStore.isDeckFavorite(id));
    const favBoundary = firstNonFavIdx === -1 ? othersIds.length : firstNonFavIdx;

    const insertIndex = this._computeInsertIndex(others, x, y);

    const willBeFavorite = insertIndex <= favBoundary;
    if (willBeFavorite !== appStore.isDeckFavorite(draggedId)) {
      await appStore.toggleDeckFavorite(draggedId);
    }

    othersIds.splice(insertIndex, 0, draggedId);
    await appStore.setDeckOrder(othersIds);
    this._draggedId = null;
    this._render();
  }

  _esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
}

const deckPicker = new DeckPicker();
