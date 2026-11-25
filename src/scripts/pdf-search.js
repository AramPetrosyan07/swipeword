class PdfSearch {
  constructor() {
    this._bar = null;
    this._input = null;
    this._counter = null;
    this._open = false;
    this._query = '';
    this._normQuery = '';
    this._matches = [];
    this._current = -1;
    this._pageText = new Map();
    this._doc = null;
    this._docKey = null;
    this._indexedUpTo = 0;
    this._indexing = false;
    this._navToken = 0;
    this._debounceTimer = null;
    this._scrollTimer = null;
  }

  _isActive() {
    const screen = document.getElementById('screen-reader');
    if (!screen || !screen.classList.contains('active')) return false;
    if (typeof readerMode === 'undefined' || !readerMode || !readerMode.pdfDoc) return false;
    if (typeof app === 'undefined' || app._readCurrentPage !== 'pdf') return false;
    return true;
  }

  _ensureBar() {
    if (this._bar) return;
    this._bar = document.getElementById('pdfSearchBar');
    if (!this._bar) return;
    this._input = document.getElementById('pdfSearchInput');
    this._counter = document.getElementById('pdfSearchCounter');
    this._resultsEl = document.getElementById('pdfSearchResults');
    this._moreEl = document.getElementById('pdfSearchMore');
    const prev = document.getElementById('pdfSearchPrev');
    const next = document.getElementById('pdfSearchNext');
    const close = document.getElementById('pdfSearchClose');
    if (prev) prev.addEventListener('click', () => this.prev());
    if (next) next.addEventListener('click', () => this.next());
    if (close) close.addEventListener('click', () => this.close());
    if (this._resultsEl) {
      this._resultsEl.addEventListener('click', (e) => {
        const item = e.target && e.target.closest ? e.target.closest('.pdf-search-result') : null;
        if (!item) return;
        const idx = parseInt(item.dataset.idx, 10);
        if (!isNaN(idx)) this._goto(idx);
      });
    }
    if (this._input) {
      this._input.addEventListener('input', () => {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this.runQuery(), 250);
      });
      this._input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) this.prev(); else this.next();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      });
    }
    const container = document.getElementById('pdfViewerScroll');
    if (container) {
      container.addEventListener('scroll', () => {
        if (!this._open || !this._normQuery) return;
        if (this._scrollTimer) clearTimeout(this._scrollTimer);
        this._scrollTimer = setTimeout(() => this._applyToRendered(), 200);
      });
    }
  }

  open() {
    if (!this._isActive()) return;
    this._ensureBar();
    if (!this._bar) return;
    this._bar.style.display = 'flex';
    this._open = true;
    if (this._input) {
      this._input.focus();
      this._input.select();
    }
    if (this._query) this.runQuery();
    else this._updateCounter();
  }

  close() {
    this._open = false;
    if (this._bar) this._bar.style.display = 'none';
    this._matches = [];
    this._current = -1;
    if (this._resultsEl) this._resultsEl.innerHTML = '';
    if (this._moreEl) this._moreEl.style.display = 'none';
    this.clearHits();
    this._updateCounter();
  }

  toggle() {
    if (this._open) this.close();
    else this.open();
  }

  _norm(s) {
    return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  async runQuery() {
    if (!this._input || !this._isActive()) return;
    this._query = this._input.value;
    this._normQuery = this._norm(this._query);
    this._matches = [];
    this._current = -1;
    this.clearHits();
    if (!this._normQuery) {
      if (this._resultsEl) this._resultsEl.innerHTML = '';
      if (this._moreEl) this._moreEl.style.display = 'none';
      this._updateCounter();
      return;
    }
    const ready = await this._ensureIndex();
    if (!ready || !this._open) return;
    this._search();
    this._updateCounter();
    this._renderResults();
    this._applyToRendered();
    if (this._matches.length > 0) {
      // jump to first match at/after the current page, else first match
      let start = this._matches.findIndex(m => m.page >= readerMode.pageNum);
      if (start === -1) start = 0;
      await this._goto(start, false);
    }
  }

  _search() {
    this._matches = [];
    if (!this._normQuery) return;
    const q = this._normQuery;
    for (let p = 1; p <= readerMode.pageCount; p++) {
      const txt = this._pageText.get(p);
      if (txt == null) continue;
      const hay = txt.toLowerCase();
      let idx = 0;
      let occ = 0;
      while ((idx = hay.indexOf(q, idx)) !== -1) {
        this._matches.push({ page: p, occ, charIdx: idx });
        occ++;
        idx += q.length;
      }
    }
  }

  _renderResults() {
    if (!this._resultsEl) return;
    this._resultsEl.innerHTML = '';
    if (!this._normQuery || this._matches.length === 0) {
      if (this._moreEl) this._moreEl.style.display = 'none';
      return;
    }
    const frag = document.createDocumentFragment();
    const pad = 28;
    this._matches.forEach((m, i) => {
      const txt = this._pageText.get(m.page) || '';
      const item = document.createElement('div');
      item.className = 'pdf-search-result' + (i === this._current ? ' active' : '');
      item.dataset.idx = i;

      const pageEl = document.createElement('span');
      pageEl.className = 'pdf-search-result-page';
      pageEl.textContent = 'p.' + m.page;

      const snip = document.createElement('span');
      snip.className = 'pdf-search-result-snippet';
      const s = Math.max(0, m.charIdx - pad);
      const e = Math.min(txt.length, m.charIdx + this._normQuery.length + pad);
      if (s > 0) snip.appendChild(document.createTextNode('…'));
      snip.appendChild(document.createTextNode(txt.slice(s, m.charIdx)));
      const b = document.createElement('b');
      b.textContent = txt.slice(m.charIdx, m.charIdx + this._normQuery.length);
      snip.appendChild(b);
      snip.appendChild(document.createTextNode(txt.slice(m.charIdx + this._normQuery.length, e)));
      if (e < txt.length) snip.appendChild(document.createTextNode('…'));

      item.appendChild(pageEl);
      item.appendChild(snip);
      frag.appendChild(item);
    });
    this._resultsEl.appendChild(frag);
    if (this._moreEl) this._moreEl.style.display = this._matches.length > 5 ? 'block' : 'none';
    this._syncResultsActive();
  }

  _syncResultsActive() {
    if (!this._resultsEl) return;
    const items = this._resultsEl.querySelectorAll('.pdf-search-result');
    items.forEach((el) => el.classList.remove('active'));
    if (this._current < 0 || this._current >= items.length) return;
    const el = items[this._current];
    el.classList.add('active');
    // keep the active item visible inside the small scroll list
    this._resultsEl.scrollTop = el.offsetTop - (this._resultsEl.clientHeight - el.offsetHeight) / 2;
  }

  async _ensureIndex() {
    if (typeof readerMode === 'undefined' || !readerMode.pdfDoc) return false;
    const doc = readerMode.pdfDoc;
    const key = typeof readerMode._getActiveDocKey === 'function' ? readerMode._getActiveDocKey() : null;
    if (this._doc !== doc || this._docKey !== key) {
      this._doc = doc;
      this._docKey = key;
      this._pageText.clear();
      this._indexedUpTo = 0;
    }
    if (this._indexedUpTo >= readerMode.pageCount) return true;
    if (this._indexing) return false;
    this._indexing = true;
    const CHUNK = 10;
    while (this._indexedUpTo < readerMode.pageCount && readerMode.pdfDoc === this._doc) {
      const end = Math.min(this._indexedUpTo + CHUNK, readerMode.pageCount);
      for (let p = this._indexedUpTo + 1; p <= end; p++) {
        try {
          const page = await this._doc.getPage(p);
          const tc = await page.getTextContent();
          this._pageText.set(p, tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' '));
        } catch (e) {
          this._pageText.set(p, '');
        }
      }
      this._indexedUpTo = end;
      if (this._normQuery && this._open) {
        this._search();
        this._updateCounter();
        this._renderResults();
      }
      await new Promise(r => setTimeout(r, 0));
    }
    this._indexing = false;
    return true;
  }

  _updateCounter() {
    if (!this._counter) return;
    if (!this._normQuery) {
      this._counter.textContent = '';
    } else if (this._indexing && this._indexedUpTo < readerMode.pageCount) {
      this._counter.textContent = 'Indexing ' + this._indexedUpTo + '/' + readerMode.pageCount;
    } else if (this._matches.length === 0) {
      this._counter.textContent = 'No matches';
    } else if (this._current === -1) {
      this._counter.textContent = this._matches.length + ' results';
    } else {
      this._counter.textContent = (this._current + 1) + ' / ' + this._matches.length;
    }
  }

  next() {
    if (this._matches.length === 0) return;
    this._goto(this._current + 1);
  }

  prev() {
    if (this._matches.length === 0) return;
    this._goto(this._current - 1);
  }

  async _goto(i, wrap = true) {
    if (this._matches.length === 0) return;
    let n = i;
    if (wrap) n = ((i % this._matches.length) + this._matches.length) % this._matches.length;
    else if (i < 0 || i >= this._matches.length) return;
    this._current = n;
    this._updateCounter();
    this._syncResultsActive();
    this._navToken++;
    const token = this._navToken;
    const m = this._matches[n];
    if (readerMode.pageNum !== m.page) readerMode.gotoPage(m.page);
    let tries = 0;
    while (!readerMode.rendered.has(m.page) && tries < 80) {
      await new Promise(r => setTimeout(r, 50));
      if (token !== this._navToken || !this._open) return;
      tries++;
    }
    if (token !== this._navToken || !this._open) return;
    const els = this._highlightPage(m.page);
    this._applyToRendered(m.page);
    const el = els && els.length ? els[Math.min(m.occ, els.length - 1)] : null;
    if (el) {
      el.classList.add('search-hit-current');
      el.scrollIntoView({ block: 'center' });
    }
  }

  _highlightPage(pageNum) {
    const slot = readerMode.slots[pageNum - 1];
    if (!slot) return [];
    const words = Array.from(slot.querySelectorAll('.rw-word'));
    if (!words.length || !this._normQuery) return [];
    const starts = [];
    let pos = 0;
    const texts = words.map(w => (w.textContent || '').replace(/\s+/g, ' '));
    for (const t of texts) {
      starts.push(pos);
      pos += t.length + 1;
    }
    const hay = texts.join(' ').toLowerCase();
    const q = this._normQuery;
    const occEls = [];
    let idx = 0;
    while ((idx = hay.indexOf(q, idx)) !== -1) {
      const end = idx + q.length;
      let i0 = -1, i1 = -1;
      for (let i = 0; i < words.length; i++) {
        const s = starts[i];
        const e = s + texts[i].length;
        if (s >= end) break;
        if (e > idx) {
          if (i0 === -1) i0 = i;
          i1 = i;
        }
      }
      if (i0 !== -1) {
        occEls.push(words[i0]);
        for (let i = i0; i <= i1; i++) words[i].classList.add('search-hit');
      } else {
        occEls.push(null);
      }
      idx += q.length;
    }
    return occEls;
  }

  _applyToRendered(exceptPage = null) {
    if (!this._normQuery || typeof readerMode === 'undefined') return;
    const pagesWithHits = new Set(this._matches.map(m => m.page));
    for (const p of readerMode.rendered) {
      if (p === exceptPage || !pagesWithHits.has(p)) continue;
      const slot = readerMode.slots[p - 1];
      if (!slot || slot.querySelector('.rw-word.search-hit')) continue;
      this._highlightPage(p);
    }
  }

  clearHits() {
    document.querySelectorAll('.rw-word.search-hit, .rw-word.search-hit-current').forEach(el => {
      el.classList.remove('search-hit', 'search-hit-current');
    });
  }
}

const pdfSearch = new PdfSearch();

(function pdfSearchBindings() {
  window.addEventListener('keydown', (e) => {
    const isActive = typeof pdfSearch._isActive === 'function' && pdfSearch._isActive();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      if (!isActive) return;
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if ((tag === 'INPUT' || tag === 'TEXTAREA') && document.activeElement !== pdfSearch._input) return;
      e.preventDefault();
      e.stopPropagation();
      pdfSearch.open();
      return;
    }
    if (e.key === 'F3') {
      if (!isActive) return;
      e.preventDefault();
      if (pdfSearch._open) pdfSearch.next();
      else pdfSearch.open();
      return;
    }
    if (e.key === 'Escape' && pdfSearch._open) {
      e.preventDefault();
      e.stopPropagation();
      pdfSearch.close();
    }
  }, true);

  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('#btnPdfSearch') : null;
    if (btn) {
      e.preventDefault();
      pdfSearch.toggle();
      return;
    }
    if (pdfSearch._open && pdfSearch._bar) {
      if (!pdfSearch._bar.contains(e.target) && !(e.target.closest && e.target.closest('#btnPdfSearch'))) {
        // clicking a word (translation) closes the bar like browser find
        if (e.target.closest && e.target.closest('.rw-word')) pdfSearch.close();
      }
    }
  });
})();
