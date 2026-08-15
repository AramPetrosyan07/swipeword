const MARKUP_TOOLS = ['highlight', 'underline', 'strike', 'squiggly'];

class PdfAnnotator {
  constructor() {
    this.activeFileKey = null;
    this.tool = null;
    this.color = '#ffeb3b';
    this.selectedId = null;
    this._draft = null;
    this._previewEl = null;
  }

  setFile(key) {
    this.activeFileKey = key;
    this.tool = null;
    this.selectedId = null;
  }

  _map() {
    if (!appStore.data.pdfAnnotations) appStore.data.pdfAnnotations = {};
    return appStore.data.pdfAnnotations;
  }

  list() {
    if (!this.activeFileKey) return [];
    if (!this._map()[this.activeFileKey]) this._map()[this.activeFileKey] = [];
    return this._map()[this.activeFileKey];
  }

  _save() {
    try { appStore.save(); } catch (e) {}
  }

  scale() {
    return (readerMode && readerMode.scale) || 1;
  }

  _pageSvg(pageNum) {
    return document.querySelector('.pdf-scroll-page[data-page="' + pageNum + '"] .pdf-scroll-annot');
  }

  renderPage(pageNum) {
    const svg = this._pageSvg(pageNum);
    if (!svg) return;
    svg.innerHTML = '';
    const s = this.scale();
    const frag = document.createDocumentFragment();
    this.list().filter((a) => a.page === pageNum).forEach((a) => {
      frag.appendChild(this._buildEl(a, s));
    });
    svg.appendChild(frag);
  }

  renderAll() {
    if (!this.activeFileKey) return;
    const pages = new Set(this.list().map((a) => a.page));
    pages.forEach((p) => this.renderPage(p));
  }

  _buildEl(a, s) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-aid', a.id);
    g.setAttribute('data-page', a.page);
    if (this.selectedId === a.id) g.setAttribute('class', 'annot-selected');
    const color = a.color || this.color;
    if (MARKUP_TOOLS.includes(a.type) && a.words && a.words.length) {
      a.words.forEach((r) => g.appendChild(this._markupShape(a.type, r, s, color)));
    } else {
      const el = this._shapeFor(a, s);
      if (el) g.appendChild(el);
    }
    if (a.type === 'link' && a.url) {
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = a.url;
      g.appendChild(title);
    }
    return g;
  }

  _markupShape(type, r, s, color) {
    const NS = 'http://www.w3.org/2000/svg';
    const x = Math.round(r.x * s);
    const y = Math.round(r.y * s);
    const w = Math.round((r.x + r.w) * s) - x;
    const h = Math.round((r.y + r.h) * s) - y;
    if (type === 'highlight') {
      const el = document.createElementNS(NS, 'rect');
      el.setAttribute('x', x);
      el.setAttribute('y', y);
      el.setAttribute('width', w);
      el.setAttribute('height', h);
      el.setAttribute('fill', color);
      el.setAttribute('opacity', '0.4');
      el.setAttribute('stroke', color);
      el.setAttribute('stroke-width', '1');
      return el;
    }
    if (type === 'underline') {
      const ly = y + h - 2;
      return this._mkLine(NS, x, ly, x + w, ly, color, 2);
    }
    if (type === 'strike') {
      const ly = y + Math.round(h / 2);
      return this._mkLine(NS, x, ly, x + w, ly, color, 2);
    }
    if (type === 'squiggly') {
      const ly = y + h - 2;
      const p = document.createElementNS(NS, 'path');
      const amp = 1.6 * s;
      const period = 3.2 * s;
      let d = '';
      const n = Math.max(4, Math.round(Math.abs(w) / period));
      for (let i = 0; i <= n; i++) {
        const px = x + (w * i) / n;
        const py = ly + (i % 2 === 0 ? 0 : amp);
        d += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1) + ' ';
      }
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', '2');
      p.setAttribute('stroke-linecap', 'round');
      return p;
    }
    return null;
  }

  _shapeFor(a, s) {
    const NS = 'http://www.w3.org/2000/svg';
    const color = a.color || this.color;
    switch (a.type) {
      case 'highlight':
      case 'underline':
      case 'strike':
      case 'squiggly':
        return this._markupShape(a.type, { x: a.x, y: a.y, w: a.w, h: a.h }, s, color);
      case 'link': {
        const r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', a.x * s);
        r.setAttribute('y', a.y * s);
        r.setAttribute('width', a.w * s);
        r.setAttribute('height', a.h * s);
        r.setAttribute('fill', 'rgba(80,160,255,0.15)');
        r.setAttribute('stroke', '#4aa3ff');
        r.setAttribute('stroke-width', '1.5');
        r.setAttribute('stroke-dasharray', '4 3');
        return r;
      }
      case 'ink': {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', a.points.map((pt, i) => (i === 0 ? 'M' : 'L') + (pt[0] * s).toFixed(1) + ',' + (pt[1] * s).toFixed(1)).join(' '));
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', color);
        p.setAttribute('stroke-width', 3 * s);
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke-linejoin', 'round');
        return p;
      }
      case 'text': {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', a.x * s);
        t.setAttribute('y', a.y * s);
        t.setAttribute('fill', color);
        t.setAttribute('font-size', (14 * s).toFixed(1) + 'px');
        t.setAttribute('font-family', 'Arial, sans-serif');
        t.textContent = a.text || '';
        return t;
      }
      case 'line':
      case 'arrow': {
        const g = document.createElementNS(NS, 'g');
        g.appendChild(this._mkLine(NS, a.x1 * s, a.y1 * s, a.x2 * s, a.y2 * s, color, 2));
        if (a.type === 'arrow') {
          g.appendChild(this._arrowHead(NS, a.x1 * s, a.y1 * s, a.x2 * s, a.y2 * s, color, 2 * s));
        }
        return g;
      }
      default:
        return null;
    }
  }

  _mkLine(NS, x1, y1, x2, y2, color, width) {
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', x1);
    l.setAttribute('y1', y1);
    l.setAttribute('x2', x2);
    l.setAttribute('y2', y2);
    l.setAttribute('stroke', color);
    l.setAttribute('stroke-width', width);
    l.setAttribute('stroke-linecap', 'round');
    return l;
  }

  _arrowHead(NS, x1, y1, x2, y2, color, size) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const baseX = x2 - ux * size;
    const baseY = y2 - uy * size;
    const px = -uy * size * 0.6;
    const py = ux * size * 0.6;
    const poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points',
      x2 + ',' + y2 + ' ' +
      (baseX + px) + ',' + (baseY + py) + ' ' +
      (baseX - px) + ',' + (baseY - py));
    poly.setAttribute('fill', color);
    return poly;
  }

  bind(container) {
    container.addEventListener('mousedown', (e) => this._onDown(e));
    window.addEventListener('mousemove', (e) => this._onMove(e));
    window.addEventListener('mouseup', (e) => this._onUp(e));
  }

  _active() {
    return document.getElementById('screen-reader').classList.contains('reader-edit-mode');
  }

  isWordToolActive() {
    return this._active() && MARKUP_TOOLS.includes(this.tool);
  }

  _markupWordRect(word) {
    const layer = word.closest('.pdf-scroll-layer');
    const lr = layer.getBoundingClientRect();
    const wr = word.getBoundingClientRect();
    const s = this.scale();
    return {
      x: (wr.left - lr.left) / s,
      y: (wr.top - lr.top) / s,
      w: wr.width / s,
      h: wr.height / s,
    };
  }

  _clearWordSel() {
    document.querySelectorAll('.pdf-scroll-layer .rw-word.selected').forEach((w) => w.classList.remove('selected'));
  }

  addFromWords(layer, words) {
    if (!words || !words.length) return;
    const slot = layer.closest('.pdf-scroll-page');
    const page = slot ? parseInt(slot.dataset.page, 10) : 1;
    const rects = words.map((w) => this._markupWordRect(w)).filter((r) => r.w > 0.1 && r.h > 0.1);
    if (!rects.length) return;
    this._add({ type: this.tool, page, words: rects, color: this.color });
  }

  _coords(e) {
    const slot = e.target.closest ? e.target.closest('.pdf-scroll-page') : null;
    if (!slot) return null;
    const rect = slot.getBoundingClientRect();
    const s = this.scale();
    return {
      page: parseInt(slot.dataset.page, 10),
      x: (e.clientX - rect.left) / s,
      y: (e.clientY - rect.top) / s,
    };
  }

  _onDown(e) {
    if (!this._active() || !this.tool) return;
    if (this.isWordToolActive()) return;
    const c = this._coords(e);
    if (!c) return;
    if (this.tool === 'select') {
      const aidEl = e.target.closest ? e.target.closest('g[data-aid]') : null;
      this.selectedId = aidEl ? aidEl.getAttribute('data-aid') : null;
      this.renderAll();
      return;
    }
    if (this.tool === 'text') {
      this._prompt('Text for the box:', '').then((text) => {
        if (text) this._add({ type: 'text', page: c.page, x: c.x, y: c.y, text, color: this.color });
      });
      return;
    }
    this._draft = { type: this.tool, page: c.page, x: c.x, y: c.y, cx: c.x, cy: c.y, points: [[c.x, c.y]], color: this.color };
    this._draftEl = null;
  }

  _onMove(e) {
    if (!this._draft) return;
    const c = this._coords(e);
    if (!c || c.page !== this._draft.page) return;
    this._draft.cx = c.x;
    this._draft.cy = c.y;
    if (this._draft.type === 'ink') this._draft.points.push([c.x, c.y]);
    this._renderDraft();
  }

  _onUp() {
    if (!this._draft) return;
    const d = this._draft;
    this._draft = null;
    this._draftEl = null;
    if (d.type === 'ink') {
      if (d.points.length < 2) return;
      this._add({ type: 'ink', page: d.page, points: d.points, color: d.color });
      return;
    }
    const rect = this._rect(d);
    if (rect.w < 2 && rect.h < 2) return;
    if (d.type === 'link') {
      this._prompt('Link URL:', 'https://').then((url) => {
        if (url) this._add({ type: 'link', page: d.page, ...rect, url, color: this.color });
      });
      return;
    }
    if (d.type === 'line' || d.type === 'arrow') {
      this._add({
        type: d.type, page: d.page,
        x1: d.x, y1: d.y, x2: d.cx, y2: d.cy, color: d.color,
      });
      return;
    }
    this._add({ type: d.type, page: d.page, ...rect, color: d.color });
  }

  _rect(d) {
    return {
      x: Math.min(d.x, d.cx),
      y: Math.min(d.y, d.cy),
      w: Math.abs(d.cx - d.x),
      h: Math.abs(d.cy - d.y),
    };
  }

  _renderDraft() {
    const svg = this._pageSvg(this._draft.page);
    if (!svg) return;
    if (!this._draftEl) {
      this._draftEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this._draftEl.setAttribute('class', 'annot-draft');
      svg.appendChild(this._draftEl);
    }
    this._draftEl.innerHTML = '';
    const s = this.scale();
    const d = this._draft;
    if (d.type === 'ink') {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d.points.map((pt, i) => (i === 0 ? 'M' : 'L') + (pt[0] * s).toFixed(1) + ',' + (pt[1] * s).toFixed(1)).join(' '));
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', d.color);
      p.setAttribute('stroke-width', 3 * s);
      p.setAttribute('stroke-linecap', 'round');
      this._draftEl.appendChild(p);
      return;
    }
    const tmp = { type: d.type, ...this._rect(d), x1: d.x, y1: d.y, x2: d.cx, y2: d.cy, color: d.color };
    const shape = this._shapeFor(tmp, s);
    if (shape) this._draftEl.appendChild(shape);
  }

  _add(a) {
    a.id = 'an' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    this.list().push(a);
    this._save();
    this.renderPage(a.page);
  }

  setTool(tool) {
    this.tool = tool;
    this.selectedId = null;
    this._clearWordSel();
    const screen = document.getElementById('screen-reader');
    if (screen) screen.classList.toggle('reader-edit-wordtool', MARKUP_TOOLS.includes(tool));
    this.renderAll();
    document.querySelectorAll('#readerEditBar .reader-tool-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tool === tool);
    });
  }

  deleteSelected() {
    const id = this.selectedId;
    if (!id) return;
    const list = this.list();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return;
    const page = list[idx].page;
    list.splice(idx, 1);
    this.selectedId = null;
    this._save();
    this.renderPage(page);
  }

  colorChanged() {
    if (this.selectedId) {
      const a = this.list().find((x) => x.id === this.selectedId);
      if (a) {
        a.color = this.color;
        this._save();
        this.renderPage(a.page);
      }
    }
  }

  async saveToPdf() {
    const items = this.list();
    if (!items || items.length === 0) {
      alert('No annotations to save yet.');
      return;
    }
    const tab = app._pdfTabs[app._pdfActiveTab];
    if (!tab) return;
    let bytes;
    try {
      bytes = await tab.doc.getData();
    } catch (e) {
      if (tab.path) {
        bytes = await window.electronAPI.readFile(tab.path);
      }
    }
    if (!bytes) {
      alert('Could not read the PDF data.');
      return;
    }
    try {
      const pdf = await PDFLib.PDFDocument.load(bytes);
      const ctx = pdf.context;
      const N = PDFLib.PDFName;
      const rgb = (hex) => this._rgb(hex).map((v) => Math.round(v * 10000) / 10000);
      for (const a of items) {
        const page = pdf.getPage(a.page - 1);
        if (!page) continue;
        const ph = page.getHeight();
        try {
          const top = (y, h) => ph - (y + (h || 0));
          const base = (y) => ph - y;
          let d = null;
          switch (a.type) {
            case 'highlight':
            case 'underline':
            case 'strike':
            case 'squiggly': {
              const subtype = a.type === 'highlight' ? 'Highlight' : a.type === 'underline' ? 'Underline' : a.type === 'strike' ? 'StrikeOut' : 'Squiggly';
              const rects = (a.words && a.words.length) ? a.words : [{ x: a.x, y: a.y, w: a.w, h: a.h }];
              for (const r of rects) {
                const bottom = top(r.y, r.h);
                page.node.addAnnot(ctx.register(ctx.obj({
                  Type: 'Annot',
                  Subtype: subtype,
                  Rect: [r.x, bottom, r.x + r.w, bottom + r.h],
                  QuadPoints: [r.x, bottom + r.h, r.x + r.w, bottom + r.h, r.x, bottom, r.x + r.w, bottom],
                  C: rgb(a.color),
                  T: 'SwipeWord',
                  M: 'D:' + this._nowStamp(),
                })));
              }
              break;
            }
            case 'link':
              d = {
                Type: 'Annot',
                Subtype: 'Link',
                Rect: [a.x, top(a.y, a.h), a.x + a.w, top(a.y, a.h) + a.h],
                A: { S: 'URI', URI: a.url || '' },
                M: 'D:' + this._nowStamp(),
              };
              break;
            case 'text': {
              let resources = page.node.Resources();
              if (!resources) {
                resources = ctx.obj({});
                page.node.Resources(resources);
              }
              if (!resources.get(N.of('Font'))) {
                const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
                resources.set(N.of('Font'), ctx.obj({ Helv: font.ref }));
              }
              const w = Math.max(50, ((a.text || '').length * 6.5) + 6);
              d = {
                Type: 'Annot',
                Subtype: 'FreeText',
                Rect: [a.x, top(a.y, 16), a.x + w, top(a.y, 16) + 16],
                Contents: a.text || '',
                DA: '/Helv 12 Tf 0.1 0.1 0.1 rg',
                C: rgb(a.color),
                M: 'D:' + this._nowStamp(),
              };
              break;
            }
            case 'ink': {
              const pts = a.points.map((pt) => [pt[0], base(pt[1])]);
              const xs = pts.map((p) => p[0]);
              const ys = pts.map((p) => p[1]);
              d = {
                Type: 'Annot',
                Subtype: 'Ink',
                Rect: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
                InkList: [pts],
                C: rgb(a.color),
                BS: { W: 2 },
              };
              break;
            }
            case 'line':
            case 'arrow':
              d = {
                Type: 'Annot',
                Subtype: 'Line',
                Rect: [Math.min(a.x1, a.x2), Math.min(base(a.y1), base(a.y2)), Math.max(a.x1, a.x2), Math.max(base(a.y1), base(a.y2))],
                L: [a.x1, base(a.y1), a.x2, base(a.y2)],
                C: rgb(a.color),
                BS: { W: 2 },
                LE: ['None', a.type === 'arrow' ? 'ClosedArrow' : 'None'],
              };
              break;
          }
          if (d) page.node.addAnnot(ctx.register(ctx.obj(d)));
        } catch (err) {
          console.warn('Annotation export skipped:', err);
        }
      }
      const out = await pdf.save();
      const name = (tab.path || tab.name || 'annotated') + '-annotated.pdf';
      const res = await window.electronAPI.savePdf(out, name.split(/[\\/]/).pop());
      if (res && res.success) {
        alert('Saved annotated PDF.');
      }
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('Could not save the annotated PDF: ' + e.message);
    }
  }

  _prompt(title, value) {
    return new Promise((resolve) => {
      let el = document.getElementById('pdfAnnotModal');
      if (!el) {
        el = document.createElement('div');
        el.id = 'pdfAnnotModal';
        el.className = 'pdf-annot-modal';
        el.innerHTML =
          '<div class="pdf-annot-modal-box">' +
          '<div class="pdf-annot-modal-title"></div>' +
          '<input type="text" class="pdf-annot-modal-input" />' +
          '<div class="pdf-annot-modal-btns">' +
          '<button class="btn btn-secondary" data-act="cancel">Cancel</button>' +
          '<button class="btn btn-primary" data-act="ok">OK</button>' +
          '</div>' +
          '</div>';
        document.body.appendChild(el);
        el.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-act]');
          if (!btn) return;
          this._resolvePrompt(el, btn.dataset.act === 'ok');
        });
        el.querySelector('.pdf-annot-modal-input').addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this._resolvePrompt(el, true);
          if (e.key === 'Escape') this._resolvePrompt(el, false);
        });
      }
      el.querySelector('.pdf-annot-modal-title').textContent = title;
      const input = el.querySelector('.pdf-annot-modal-input');
      input.value = value || '';
      el._resolve = resolve;
      el.classList.add('show');
      setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    });
  }

  _resolvePrompt(el, ok) {
    if (!el.classList.contains('show')) return;
    el.classList.remove('show');
    if (el._resolve) {
      el._resolve(ok ? el.querySelector('.pdf-annot-modal-input').value.trim() : null);
      el._resolve = null;
    }
  }

  _nowStamp() {
    const n = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return n.getFullYear() + p(n.getMonth() + 1) + p(n.getDate()) + p(n.getHours()) + p(n.getMinutes()) + p(n.getSeconds());
  }

  _pdfRect(a, pageHeight) {
    const y = a.h !== undefined ? a.y + a.h : a.y;
    const h = a.h !== undefined ? a.h : 0;
    return {
      x: a.x,
      y: pageHeight - y,
      width: a.w !== undefined ? a.w : 0,
      height: h,
    };
  }

  _rgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '#000000');
    if (!m) return [0, 0, 0];
    const v = parseInt(m[1], 16);
    return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
  }
}

const pdfAnnot = new PdfAnnotator();
